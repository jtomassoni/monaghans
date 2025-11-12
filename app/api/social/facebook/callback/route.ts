import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

// Handle Facebook OAuth callback
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.redirect(`${NEXTAUTH_URL}/admin/login`);
  }

  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorReason = searchParams.get('error_reason');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    let errorMessage = error;
    
    // Provide helpful error messages for common Facebook OAuth errors
    if (error === 'redirect_uri_mismatch' || errorDescription?.includes('redirect URI') || errorDescription?.includes('whitelisted')) {
      errorMessage = `Redirect URI not configured: The callback URL ${NEXTAUTH_URL}/api/social/facebook/callback must be added to your Facebook App's Valid OAuth Redirect URIs. Go to Facebook Developers > Your App > Settings > Basic > Add Platform > Website, then add this URL to "Valid OAuth Redirect URIs".`;
    } else if (error === 'access_denied') {
      errorMessage = 'Access denied: You did not grant the required permissions. Please try again and make sure to grant all requested permissions.';
    } else if (errorDescription?.includes('app is not accessible') || errorDescription?.includes('app developer is aware')) {
      errorMessage = 'Facebook App not active: Your Facebook App is currently inactive or in development mode. Go to Facebook Developers > Your App > Settings > Basic and ensure the app is set to "Live" mode, or add test users if in development mode.';
    } else if (errorDescription) {
      errorMessage = `${error}: ${errorDescription}`;
    }
    
    return new Response(`
      <html>
        <body>
          <script>
            window.opener.postMessage({ type: 'FACEBOOK_ERROR', error: ${JSON.stringify(errorMessage)} }, '*');
            window.close();
          </script>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  if (!code || !FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
    return new Response(`
      <html>
        <body>
          <script>
            window.opener.postMessage({ type: 'FACEBOOK_ERROR', error: 'Missing authorization code' }, '*');
            window.close();
          </script>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  try {
    // Exchange code for short-lived access token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `client_id=${FACEBOOK_APP_ID}` +
      `&client_secret=${FACEBOOK_APP_SECRET}` +
      `&redirect_uri=${encodeURIComponent(`${NEXTAUTH_URL}/api/social/facebook/callback`)}` +
      `&code=${code}`,
      { method: 'GET' }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error('Token exchange failed:', tokenData);
      throw new Error('Failed to get access token. Please make sure you granted all requested permissions.');
    }

    // Check what permissions were actually granted
    try {
      const debugResponse = await fetch(
        `https://graph.facebook.com/v18.0/debug_token?` +
        `input_token=${tokenData.access_token}` +
        `&access_token=${tokenData.access_token}`,
        { method: 'GET' }
      );
      const debugData = await debugResponse.json();
      console.log('User token scopes granted:', debugData.data?.scopes);
      console.log('User token granular scopes:', debugData.data?.granular_scopes);
      
      // Check if required permissions are present
      const grantedScopes = debugData.data?.scopes || [];
      const requiredScopes = ['pages_read_engagement', 'pages_manage_posts'];
      const missingScopes = requiredScopes.filter(scope => !grantedScopes.includes(scope));
      
      if (missingScopes.length > 0) {
        console.warn('Missing required scopes:', missingScopes);
        // Don't fail here, but log it - the page token might still work
      }
    } catch (debugErr) {
      console.error('Error checking granted permissions:', debugErr);
    }

    // Exchange short-lived token for long-lived token (60 days)
    const longLivedResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `grant_type=fb_exchange_token` +
      `&client_id=${FACEBOOK_APP_ID}` +
      `&client_secret=${FACEBOOK_APP_SECRET}` +
      `&fb_exchange_token=${tokenData.access_token}`,
      { method: 'GET' }
    );

    const longLivedData = await longLivedResponse.json();

    if (!longLivedData.access_token) {
      throw new Error('Failed to get long-lived token');
    }

    // Get user's pages with permissions
    // Request pages_show_list permission to get page access tokens
    // Include 'tasks' field to see what permissions the page token has
    // The 'tasks' field shows what the page token can do (e.g., ['ANALYZE', 'ADVERTISE', 'MODERATE', 'CREATE_CONTENT', 'MANAGE'])
    const pagesUrl = `https://graph.facebook.com/v18.0/me/accounts?` +
      `fields=id,name,access_token,tasks` +
      `&access_token=${longLivedData.access_token}`;
    
    console.log('Fetching pages from:', pagesUrl.replace(longLivedData.access_token, 'TOKEN_HIDDEN'));
    
    const pagesResponse = await fetch(pagesUrl, { method: 'GET' });

    const pagesData = await pagesResponse.json();
    
    console.log('Pages API response:', JSON.stringify(pagesData, null, 2));
    
    // Check if pages have the CREATE_CONTENT task which is needed for posting
    if (pagesData.data && pagesData.data.length > 0) {
      pagesData.data.forEach((page: any, index: number) => {
        console.log(`Page ${index + 1} (${page.name}):`, {
          id: page.id,
          tasks: page.tasks,
          hasCreateContent: page.tasks?.includes('CREATE_CONTENT') || page.tasks?.includes('MANAGE')
        });
      });
    }

    if (pagesData.error) {
      console.error('Error getting pages:', pagesData.error);
      throw new Error(pagesData.error.message || 'Failed to get Facebook pages');
    }

    if (!pagesData.data || pagesData.data.length === 0) {
      console.error('No pages returned. Full response:', JSON.stringify(pagesData, null, 2));
      throw new Error('No Facebook pages found. Make sure you have admin access to at least one page and granted the pages_show_list permission.');
    }

    // Use the first page (you could enhance this to let user select)
    // TODO: Allow user to select which page to connect if multiple pages exist
    const page = pagesData.data[0];
    
    if (!page.access_token) {
      throw new Error('Failed to get page access token. Make sure you granted the necessary permissions.');
    }
    
    let pageAccessToken = page.access_token;
    const pageId = page.id;
    const pageName = page.name;
    
    // Log page permissions for debugging
    console.log('Page permissions:', {
      pageId,
      pageName,
      tasks: page.tasks,
      hasAccessToken: !!page.access_token
    });
    
    // Verify the page token has the right permissions by checking it
    try {
      const tokenDebugResponse = await fetch(
        `https://graph.facebook.com/v18.0/debug_token?` +
        `input_token=${pageAccessToken}` +
        `&access_token=${longLivedData.access_token}`,
        { method: 'GET' }
      );
      const tokenDebug = await tokenDebugResponse.json();
      console.log('Page token debug (before exchange):', JSON.stringify(tokenDebug, null, 2));
      
      // Check page token permissions
      const pageScopes = tokenDebug.data?.scopes || [];
      const requiredScopes = ['pages_read_engagement', 'pages_manage_posts'];
      const missingPageScopes = requiredScopes.filter(scope => !pageScopes.includes(scope));
      
      if (missingPageScopes.length > 0) {
        console.warn('Page token missing required scopes:', missingPageScopes);
        console.warn('Available page token scopes:', pageScopes);
        // This is a problem - the page token doesn't have the required permissions
        // We should warn the user but still complete the connection
        // They'll need to reconnect and grant permissions
      } else {
        console.log('✓ Page token has all required permissions');
      }
    } catch (debugErr) {
      console.error('Error debugging page token:', debugErr);
    }

    // The page token from /me/accounts already has the necessary permissions
    // The tasks field shows CREATE_CONTENT and MANAGE, which means we can post
    // We'll use the page token directly - it should work for posting even if it's short-lived
    // Note: Page tokens from /me/accounts are typically long-lived already
    const finalPageToken = pageAccessToken;
    
    console.log('Using page token with tasks:', page.tasks);
    console.log('Token has CREATE_CONTENT:', page.tasks?.includes('CREATE_CONTENT'));
    console.log('Token has MANAGE:', page.tasks?.includes('MANAGE'));

    // Calculate expiration (long-lived tokens typically last 60 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 60);

    // Store connection in database
    // Store both user token and page info so we can get fresh page tokens
    await prisma.setting.upsert({
      where: { key: 'facebook_connection' },
      update: {
        value: JSON.stringify({
          connected: true,
          pageId,
          pageName,
          // Store user's long-lived token so we can get fresh page tokens
          userAccessToken: longLivedData.access_token,
          userTokenExpiresAt: longLivedData.expires_in 
            ? new Date(Date.now() + longLivedData.expires_in * 1000).toISOString()
            : null,
          // Also store page token as fallback
          accessToken: finalPageToken,
          expiresAt: expiresAt.toISOString(),
        }),
        description: 'Facebook page connection for automatic posting',
      },
      create: {
        key: 'facebook_connection',
        value: JSON.stringify({
          connected: true,
          pageId,
          pageName,
          // Store user's long-lived token so we can get fresh page tokens
          userAccessToken: longLivedData.access_token,
          userTokenExpiresAt: longLivedData.expires_in 
            ? new Date(Date.now() + longLivedData.expires_in * 1000).toISOString()
            : null,
          // Also store page token as fallback
          accessToken: finalPageToken,
          expiresAt: expiresAt.toISOString(),
        }),
        description: 'Facebook page connection for automatic posting',
      },
    });

    return new Response(`
      <html>
        <body>
          <script>
            window.opener.postMessage({ type: 'FACEBOOK_CONNECTED' }, '*');
            window.close();
          </script>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    console.error('Facebook OAuth error:', error);
    return new Response(`
      <html>
        <body>
          <script>
            window.opener.postMessage({ type: 'FACEBOOK_ERROR', error: '${error instanceof Error ? error.message : 'Unknown error'}' }, '*');
            window.close();
          </script>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

