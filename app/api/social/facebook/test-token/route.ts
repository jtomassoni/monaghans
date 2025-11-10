import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { token, pageId } = body;

    if (!token || !pageId) {
      return NextResponse.json(
        { error: 'Token and pageId are required' },
        { status: 400 }
      );
    }

    const results: any = {
      tokenInfo: null,
      pageTokenInfo: null,
      pagesReadEngagement: null,
      pagesManagePosts: null,
    };

    // 1. Debug the token to see what permissions it has
    let tokenType = 'UNKNOWN';
    let pageToken = token; // Default to using the provided token
    
    try {
      const debugResponse = await fetch(
        `https://graph.facebook.com/v18.0/debug_token?` +
        `input_token=${token}` +
        `&access_token=${token}`,
        { method: 'GET' }
      );
      const debugData = await debugResponse.json();
      results.tokenInfo = debugData.data;
      tokenType = debugData.data?.type || 'UNKNOWN';
      console.log('Token info:', JSON.stringify(debugData.data, null, 2));
      
      // If it's a USER token, get the page token
      if (tokenType === 'USER') {
        console.log('User token detected, getting page token...');
        try {
          const pagesResponse = await fetch(
            `https://graph.facebook.com/v18.0/me/accounts?` +
            `fields=id,access_token` +
            `&access_token=${token}`,
            { method: 'GET' }
          );
          const pagesData = await pagesResponse.json();
          
          if (pagesData.data && pagesData.data.length > 0) {
            const page = pagesData.data.find((p: any) => p.id === pageId);
            if (page && page.access_token) {
              pageToken = page.access_token;
              console.log('Got page token, debugging it...');
              
              // Debug the page token
              const pageTokenDebugResponse = await fetch(
                `https://graph.facebook.com/v18.0/debug_token?` +
                `input_token=${pageToken}` +
                `&access_token=${token}`,
                { method: 'GET' }
              );
              const pageTokenDebugData = await pageTokenDebugResponse.json();
              results.pageTokenInfo = pageTokenDebugData.data;
              console.log('Page token info:', JSON.stringify(pageTokenDebugData.data, null, 2));
            } else {
              results.pageTokenInfo = { error: 'Page not found in user accounts' };
            }
          } else {
            results.pageTokenInfo = { error: 'No pages found for user' };
          }
        } catch (pageTokenErr) {
          results.pageTokenInfo = { error: pageTokenErr instanceof Error ? pageTokenErr.message : 'Failed to get page token' };
        }
      }
    } catch (err) {
      results.tokenInfo = { error: err instanceof Error ? err.message : 'Unknown error' };
    }

    // 2. Test pages_read_engagement: Read page posts (use page token)
    try {
      const readResponse = await fetch(
        `https://graph.facebook.com/v18.0/${pageId}/posts?` +
        `fields=id,message,created_time&limit=1` +
        `&access_token=${pageToken}`,
        { method: 'GET' }
      );
      const readData = await readResponse.json();
      if (readResponse.ok) {
        results.pagesReadEngagement = {
          success: true,
          message: 'pages_read_engagement test passed',
          data: readData,
        };
        console.log('✓ pages_read_engagement test successful');
      } else {
        results.pagesReadEngagement = {
          success: false,
          error: readData.error,
        };
        console.log('✗ pages_read_engagement test failed:', readData.error);
      }
    } catch (err) {
      results.pagesReadEngagement = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }

    // 3. Test pages_manage_posts: Create a test post (then delete it) (use page token)
    try {
      const createResponse = await fetch(
        `https://graph.facebook.com/v18.0/${pageId}/feed`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            message: 'Test post for API testing - will be deleted immediately',
            access_token: pageToken,
          }),
        }
      );
      const createData = await createResponse.json();
      
      if (createResponse.ok && createData.id) {
        results.pagesManagePosts = {
          success: true,
          message: 'pages_manage_posts test passed',
          postId: createData.id,
        };
        console.log('✓ pages_manage_posts test successful, post ID:', createData.id);
        
        // Delete the test post immediately
        try {
          const deleteResponse = await fetch(
            `https://graph.facebook.com/v18.0/${createData.id}?access_token=${pageToken}`,
            { method: 'DELETE' }
          );
          const deleteData = await deleteResponse.json();
          if (deleteResponse.ok) {
            results.pagesManagePosts.deleted = true;
            console.log('✓ Test post deleted');
          } else {
            results.pagesManagePosts.deleteError = deleteData.error;
            console.log('Could not delete test post:', deleteData.error);
          }
        } catch (deleteErr) {
          results.pagesManagePosts.deleteError = deleteErr instanceof Error ? deleteErr.message : 'Unknown error';
        }
      } else {
        results.pagesManagePosts = {
          success: false,
          error: createData.error,
        };
        console.log('✗ pages_manage_posts test failed:', createData.error);
      }
    } catch (err) {
      results.pagesManagePosts = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        tokenType: tokenType,
        userTokenHasPermissions: results.tokenInfo?.scopes?.includes('pages_read_engagement') || 
                                 results.tokenInfo?.scopes?.includes('pages_manage_posts'),
        pageTokenHasPermissions: results.pageTokenInfo?.scopes?.includes('pages_read_engagement') || 
                                 results.pageTokenInfo?.scopes?.includes('pages_manage_posts'),
        pagesReadEngagementWorks: results.pagesReadEngagement?.success === true,
        pagesManagePostsWorks: results.pagesManagePosts?.success === true,
      },
    });
  } catch (error) {
    console.error('Token test error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

