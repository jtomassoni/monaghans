import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from './prisma';
import { logLoginActivity } from './api-helpers';

interface UserCredential {
  username: string;
  password: string;
}

/**
 * Parse user credentials from environment variable
 * Format: "username1:password1,username2:password2"
 * Returns array of {username, password} objects
 */
function parseUserCredentials(envVar: string | undefined): UserCredential[] {
  if (!envVar) return [];
  
  return envVar
    .split(',')
    .map(pair => {
      const [username, password] = pair.split(':').map(s => s.trim());
      if (username && password) {
        return { username, password };
      }
      return null;
    })
    .filter((cred): cred is UserCredential => cred !== null);
}

/**
 * Get all user credentials for each role level from environment variables
 * Supports both new format (arrays) and legacy format (single user)
 */
function getAllRoleCredentials(): {
  superadmin: UserCredential[];
  admin: UserCredential[];
  owner: UserCredential[];
  manager: UserCredential[];
  cook: UserCredential[];
  bartender: UserCredential[];
  barback: UserCredential[];
} {
  // Parse arrays from env vars
  const superadminUsers = parseUserCredentials(process.env.SUPERADMIN_USERS);
  const adminUsers = parseUserCredentials(process.env.ADMIN_USERS);
  const ownerUsers = parseUserCredentials(process.env.OWNER_USERS);
  const managerUsers = parseUserCredentials(process.env.MANAGER_USERS);
  const cookUsers = parseUserCredentials(process.env.COOK_USERS);
  const bartenderUsers = parseUserCredentials(process.env.BARTENDER_USERS);
  const barbackUsers = parseUserCredentials(process.env.BARBACK_USERS);

  // Support legacy ADMIN_USERNAME/ADMIN_PASSWORD for backward compatibility
  const adminUsername = process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  const result = {
    superadmin: [...superadminUsers],
    admin: [...adminUsers],
    owner: [...ownerUsers],
    manager: [...managerUsers],
    cook: [...cookUsers],
    bartender: [...bartenderUsers],
    barback: [...barbackUsers],
  };

  // Add legacy admin credentials to superadmin if no new format is set
  if (adminUsername && adminPassword && superadminUsers.length === 0 && adminUsers.length === 0) {
    result.superadmin.push({ username: adminUsername, password: adminPassword });
  }

  // Validate in production
  if (process.env.NODE_ENV === 'production') {
    const hasAnyCredentials = 
      result.superadmin.length > 0 ||
      result.admin.length > 0 ||
      result.owner.length > 0 ||
      result.manager.length > 0 ||
      result.cook.length > 0 ||
      result.bartender.length > 0 ||
      result.barback.length > 0;

    if (!hasAnyCredentials) {
      throw new Error(
        'At least one role-level user credential must be set in production. ' +
        'Use format: ROLE_USERS="username1:password1,username2:password2" ' +
        'or legacy ADMIN_USERNAME/ADMIN_PASSWORD for backward compatibility.'
      );
    }
  }

  return result;
}

/**
 * Check credentials against a role's user list and return the matched role
 * Returns the role name if credentials match, null otherwise
 */
function checkCredentialsAgainstRoles(
  username: string,
  password: string
): { role: string; matchedUsername: string } | null {
  const allCredentials = getAllRoleCredentials();

  // Check in order of hierarchy (highest first)
  const roleOrder: Array<keyof typeof allCredentials> = [
    'superadmin',
    'admin',
    'owner',
    'manager',
    'cook',
    'bartender',
    'barback',
  ];

  for (const role of roleOrder) {
    const users = allCredentials[role];
    for (const cred of users) {
      if (cred.username === username && cred.password === password) {
        return { role, matchedUsername: cred.username };
      }
    }
  }

  return null;
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

        // Check credentials against all role levels
        const match = checkCredentialsAgainstRoles(credentials.username, credentials.password);
        
        if (!match) {
          return null;
        }

        // Use username directly (no domain appended if it doesn't contain @)
        const matchedUsername = match.matchedUsername;
        const userIdentifier = matchedUsername; // Use as-is, whether it's an email or just a username

        // Check if user exists, create if not
        let user = await prisma.user.findUnique({
          where: { email: userIdentifier },
        });

        if (!user) {
          // Determine display name based on role
          const displayName = match.role === 'superadmin' 
            ? 'Super Admin'
            : match.role === 'admin'
            ? 'Admin'
            : match.role.charAt(0).toUpperCase() + match.role.slice(1);

          user = await prisma.user.create({
            data: {
              email: userIdentifier,
              name: displayName,
              role: match.role,
              isActive: true,
            },
          });
        } else {
          // Update role if it changed (in case env vars were updated)
          if (user.role !== match.role) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: { role: match.role },
            });
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name || match.role.charAt(0).toUpperCase() + match.role.slice(1),
          role: user.role,
        };
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
            
            // Check if email/username matches any role-level credentials
            const allCredentials = getAllRoleCredentials();
            let matchedRole: string | null = null;
            
            // Check all role levels to find a match
            const roleOrder: Array<keyof typeof allCredentials> = [
              'superadmin',
              'admin',
              'owner',
              'manager',
              'cook',
              'bartender',
              'barback',
            ];
            
            for (const role of roleOrder) {
              const users = allCredentials[role];
              for (const cred of users) {
                // Match username directly (no domain transformation)
                if (token.email.toLowerCase() === cred.username.toLowerCase()) {
                  matchedRole = role;
                  break;
                }
              }
              if (matchedRole) break;
            }
            
            let role = token.role as string || 'admin';
            if (isSuperadmin) {
              role = 'superadmin';
            } else if (matchedRole) {
              role = matchedRole;
            } else {
              // Legacy: Check if email matches admin username pattern
              const adminUsername = process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL;
              const isCredentialsAdmin = adminUsername && (
                token.email.toLowerCase() === adminUsername.toLowerCase()
              );
              if (isCredentialsAdmin) {
                role = 'superadmin'; // Legacy credentials auth users are superadmins
              }
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

