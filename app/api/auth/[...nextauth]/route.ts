import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest } from 'next/server';

// Detect the base URL from request headers for local network access
function getBaseUrl(req: NextRequest): string {
  const host = req.headers.get('host') || 'localhost:3000';
  const protocol = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  return `${protocol}://${host}`;
}

const handler = async (
  req: NextRequest,
  context: { params: Promise<{ nextauth?: string[] }> }
) => {
  try {
    const baseUrl = getBaseUrl(req);
    const params = await context.params;
    
    // Create auth options with dynamic URL
    const originalRedirect = authOptions.callbacks?.redirect;
    const dynamicAuthOptions = {
      ...authOptions,
      // Set the base URL for NextAuth
      basePath: '/api/auth',
      // Override the callbacks to use the detected baseUrl
      callbacks: {
        ...authOptions.callbacks,
        async redirect(params: { url: string; baseUrl: string }) {
          // Use the detected baseUrl instead of env variable
          const { url, baseUrl: _ } = params;
          if (url.startsWith('/')) {
            return `${baseUrl}${url}`;
          }
          // If URL is on the same origin, allow it
          try {
            const urlObj = new URL(url);
            if (urlObj.origin === baseUrl) {
              return url;
            }
          } catch {
            // Invalid URL, fall back to baseUrl
          }
          // Fall back to original redirect if it exists, otherwise return baseUrl
          if (originalRedirect && typeof originalRedirect === 'function') {
            return originalRedirect({ ...params, baseUrl });
          }
          return baseUrl;
        },
      },
    };

    // Create NextAuth handler
    const nextAuthHandler = NextAuth(dynamicAuthOptions);
    
    // Handle the request - NextAuth v4 expects the handler to be called directly
    if (req.method === 'GET') {
      return nextAuthHandler.handlers.GET(req, context);
    } else if (req.method === 'POST') {
      return nextAuthHandler.handlers.POST(req, context);
    }
    
    return new Response('Method not allowed', { status: 405 });
  } catch (error) {
    console.error('NextAuth handler error:', error);
    return new Response(
      JSON.stringify({ error: 'Authentication error', message: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export { handler as GET, handler as POST };
