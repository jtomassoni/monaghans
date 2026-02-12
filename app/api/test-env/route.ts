import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ADMIN_USER: process.env.ADMIN_USER || 'NOT SET',
    ADMIN_USER_TYPE: typeof process.env.ADMIN_USER,
    ADMIN_USERS: process.env.ADMIN_USERS || 'NOT SET',
    OWNER_USER: process.env.OWNER_USER || 'NOT SET',
    OWNER_USERS: process.env.OWNER_USERS || 'NOT SET',
    NODE_ENV: process.env.NODE_ENV,
    // Try to parse ADMIN_USER
    parsed: (() => {
      try {
        if (process.env.ADMIN_USER) {
          return JSON.parse(process.env.ADMIN_USER);
        }
        return null;
      } catch (e) {
        return { error: (e as Error).message };
      }
    })(),
  });
}

