import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

// Step 1: Generate Facebook OAuth URL
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
    return NextResponse.json(
      { error: 'Facebook App ID and Secret not configured. Please set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in your .env file.' },
      { status: 500 }
    );
  }

  // Generate OAuth URL
  const redirectUri = `${NEXTAUTH_URL}/api/social/facebook/callback`;
  // Request permissions needed for posting to pages
  // pages_show_list: List user's pages and get page access tokens
  // pages_read_engagement and pages_manage_posts: Required for posting to pages
  // These can be requested as user scopes and will be included in the page token
  const scope = 'pages_show_list,pages_read_engagement,pages_manage_posts';
  const state = Buffer.from(JSON.stringify({ userId: session.user?.id })).toString('base64');

  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
    `client_id=${FACEBOOK_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${scope}` +
    `&state=${state}` +
    `&response_type=code`;

  return NextResponse.json({ success: true, authUrl });
}

