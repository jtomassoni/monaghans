import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from './prisma';
import { logLoginActivity } from './api-helpers';

// Validate admin credentials are set
function getAdminCredentials() {
  const adminUsername = process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  // In production, require these to be set
  if (process.env.NODE_ENV === 'production') {
    if (!adminUsername || !adminPassword) {
      throw new Error(
        'ADMIN_USERNAME (or ADMIN_EMAIL) and ADMIN_PASSWORD must be set in production. ' +
        'Please configure these environment variables.'
      );
    }
    if (adminPassword === 'changeme' || adminPassword.length < 8) {
      console.warn(
        '⚠️  WARNING: Admin password is weak or still using default. ' +
        'Please set a strong ADMIN_PASSWORD in production.'
      );
    }
  }

  // Fallback for development only
  return {
    username: adminUsername || 'admin',
    password: adminPassword || 'changeme',
  };
}

// Simple credentials auth for superadmin
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const { username: adminUsername, password: adminPassword } = getAdminCredentials();

        if (credentials.username === adminUsername && credentials.password === adminPassword) {
          // Check if superadmin user exists, create if not
          const superadminEmail = adminUsername.includes('@') ? adminUsername : `${adminUsername}@monaghans.local`;
          let user = await prisma.user.findUnique({
            where: { email: superadminEmail },
          });

          if (!user) {
            user = await prisma.user.create({
              data: {
                email: superadminEmail,
                name: 'Super Admin',
                role: 'superadmin',
                isActive: true,
              },
            });
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name || 'Admin',
            role: user.role,
          };
        }

        return null;
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  pages: {
    signIn: '/admin/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours in seconds
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // For Google OAuth, check if user exists or create them
      if (account?.provider === 'google' && user.email) {
        const superadminEmail = process.env.SUPERADMIN_EMAIL?.toLowerCase().trim();
        const isSuperadmin = superadminEmail && user.email.toLowerCase() === superadminEmail;

        let dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (!dbUser) {
          // Create new user with role based on email match
          dbUser = await prisma.user.create({
            data: {
              email: user.email,
              name: user.name || null,
              image: user.image || null,
              role: isSuperadmin ? 'superadmin' : 'admin',
              isActive: true,
            },
          });
        } else {
          // Update existing user to superadmin if email matches (in case env var was added later)
          if (isSuperadmin && dbUser.role !== 'superadmin') {
            dbUser = await prisma.user.update({
              where: { id: dbUser.id },
              data: { role: 'superadmin' },
            });
          }
        }

        // Only allow active users to sign in
        if (dbUser.isActive) {
          // Log login activity
          await logLoginActivity(dbUser.id, dbUser.email, dbUser.name);
        }
        return dbUser.isActive;
      }

      // For credentials, allow sign in (already checked in authorize)
      // Login activity will be logged in the jwt callback for credentials
      return true;
    },
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.role = user.role || 'admin';
        token.email = user.email;
        // Set token issued at time for session expiration checking
        token.iat = Math.floor(Date.now() / 1000);
        
        // Log login activity for credentials auth (Google OAuth is logged in signIn callback)
        if (account?.provider === 'credentials' && user.id) {
          await logLoginActivity(user.id, user.email || '', user.name || null);
        }
      } else {
        // On token refresh, preserve iat if it exists, otherwise set it (for backward compatibility)
        if (!token.iat) {
          token.iat = Math.floor(Date.now() / 1000);
        }
      }

      // Check if token has expired (8 hours = 28800 seconds)
      const maxAge = 8 * 60 * 60; // 8 hours in seconds
      const now = Math.floor(Date.now() / 1000);
      const tokenAge = token.iat ? now - (token.iat as number) : 0;
      
      if (tokenAge > maxAge) {
        // Token has expired - invalidate it
        token.id = '';
        return token;
      }

      // Refresh user data from DB on every request (for both credentials and Google OAuth)
      // This ensures the session stays in sync with the database
      if (token.email) {
        try {
          let dbUser = await prisma.user.findUnique({
            where: { email: token.email as string },
          });

          // If user doesn't exist but we have a valid token, recreate them
          // This handles cases where the database was reset or user was deleted
          if (!dbUser) {
            // Determine role based on email matching patterns
            const superadminEmail = process.env.SUPERADMIN_EMAIL?.toLowerCase().trim();
            const isSuperadmin = superadminEmail && token.email.toLowerCase() === superadminEmail;
            
            // Check if email matches admin username pattern (credentials auth)
            const adminUsername = process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL;
            const isCredentialsAdmin = adminUsername && (
              token.email.toLowerCase() === adminUsername.toLowerCase() ||
              token.email.toLowerCase() === `${adminUsername.toLowerCase()}@monaghans.local`
            );
            
            let role = token.role as string || 'admin';
            if (isSuperadmin) {
              role = 'superadmin';
            } else if (isCredentialsAdmin) {
              role = 'superadmin'; // Credentials auth users are superadmins
            }

            try {
              dbUser = await prisma.user.create({
                data: {
                  email: token.email as string,
                  name: token.name || 'Admin User',
                  role: role,
                  isActive: true,
                },
              });
            } catch (error) {
              // If creation fails, try to fetch again (might have been created concurrently)
              dbUser = await prisma.user.findUnique({
                where: { email: token.email as string },
              });
            }
          }

          if (dbUser) {
            // Verify user is still active
            if (!dbUser.isActive) {
              // User is inactive - invalidate the token by not setting ID
              // This will cause getCurrentUser to return null
              token.id = '';
              return token;
            }
            
            token.id = dbUser.id;
            token.role = dbUser.role;
            token.name = dbUser.name;
            token.image = dbUser.image;
          }
        } catch (error) {
          // If database query fails, log error but don't break the auth flow
          // Return the token as-is (it might still be valid)
          console.error('Error refreshing user data in JWT callback:', error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

