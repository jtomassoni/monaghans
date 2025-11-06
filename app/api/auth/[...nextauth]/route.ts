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
  const baseUrl = getBaseUrl(req);
  
  // Create auth options with dynamic URL
  const dynamicAuthOptions = {
    ...authOptions,
    // Override the callbacks to use the detected baseUrl
    callbacks: {
      ...authOptions.callbacks,
      async redirect({ url, baseUrl: _ }: { url: string; baseUrl: string }) {
        // Use the detected baseUrl instead of env variable
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
        return baseUrl;
      },
    },
  };

  // Use NextAuth's built-in handler for App Router
  // NextAuth v4 exports handlers directly
  return NextAuth(dynamicAuthOptions)(req, context);
};

export { handler as GET, handler as POST };
