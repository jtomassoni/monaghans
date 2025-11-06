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

  if (error) {
    return new Response(`
      <html>
        <body>
          <script>
            window.opener.postMessage({ type: 'FACEBOOK_ERROR', error: '${error}' }, '*');
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
      throw new Error('Failed to get access token');
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

    // Get user's pages
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${longLivedData.access_token}`,
      { method: 'GET' }
    );

    const pagesData = await pagesResponse.json();

    if (!pagesData.data || pagesData.data.length === 0) {
      throw new Error('No Facebook pages found. Make sure you have admin access to at least one page.');
    }

    // Use the first page (you could enhance this to let user select)
    const page = pagesData.data[0];
    const pageAccessToken = page.access_token;
    const pageId = page.id;
    const pageName = page.name;

    // Get long-lived page access token
    const pageTokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}?` +
      `fields=access_token` +
      `&access_token=${pageAccessToken}`,
      { method: 'GET' }
    );

    const pageTokenData = await pageTokenResponse.json();
    const finalPageToken = pageTokenData.access_token || pageAccessToken;

    // Calculate expiration (long-lived tokens typically last 60 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 60);

    // Store connection in database
    await prisma.setting.upsert({
      where: { key: 'facebook_connection' },
      update: {
        value: JSON.stringify({
          connected: true,
          pageId,
          pageName,
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

