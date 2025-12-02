import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './prisma';
import { logLoginActivity } from './api-helpers';

interface UserCredential {
  username: string;
  password: string;
}

/**
 * Parse user credentials from environment variable
 * Supports JSON object format:
 * - Single user: ADMIN_USER='{"username":"admin","password":"pass123"}'
 * - Multiple users: ADMIN_USERS='[{"username":"admin1","password":"pass1"},{"username":"admin2","password":"pass2"}]'
 * Returns array of {username, password} objects
 */
function parseUserCredentials(envVar: string | undefined): UserCredential[] {
  if (!envVar) return [];
  
  try {
    const parsed = JSON.parse(envVar);
    
    // If it's an array, return it directly
    if (Array.isArray(parsed)) {
      return parsed.filter((cred): cred is UserCredential => 
        cred && typeof cred === 'object' && 
        typeof cred.username === 'string' && 
        typeof cred.password === 'string'
      );
    }
    
    // If it's a single object, wrap it in an array
    if (parsed && typeof parsed === 'object' && 
        typeof parsed.username === 'string' && 
        typeof parsed.password === 'string') {
      return [parsed];
    }
    
    return [];
  } catch (error) {
    // Invalid JSON, return empty array
    console.error('Error parsing user credentials from env var:', error);
    return [];
  }
}

/**
 * Get all user credentials for admin and owner roles from environment variables
 */
function getAllRoleCredentials(): {
  admin: UserCredential[];
  owner: UserCredential[];
} {
  // Parse from env vars - support both singular (ADMIN_USER) and plural (ADMIN_USERS)
  const adminUser = parseUserCredentials(process.env.ADMIN_USER);
  const adminUsers = parseUserCredentials(process.env.ADMIN_USERS);
  const ownerUser = parseUserCredentials(process.env.OWNER_USER);
  const ownerUsers = parseUserCredentials(process.env.OWNER_USERS);
  
  const result = {
    admin: [...adminUser, ...adminUsers],
    owner: [...ownerUser, ...ownerUsers],
  };

  // Debug logging (only in development)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Auth Debug] ADMIN_USER env var:', process.env.ADMIN_USER ? 'SET' : 'NOT SET');
    console.log('[Auth Debug] ADMIN_USERS env var:', process.env.ADMIN_USERS ? 'SET' : 'NOT SET');
    console.log('[Auth Debug] Parsed admin credentials:', result.admin);
    console.log('[Auth Debug] Parsed owner credentials:', result.owner);
  }

  // Validate in production
  if (process.env.NODE_ENV === 'production') {
    const hasAnyCredentials = result.admin.length > 0 || result.owner.length > 0;

    if (!hasAnyCredentials) {
      throw new Error(
        'At least one user credential must be set in production. ' +
        'Use format: ADMIN_USER=\'{"username":"admin","password":"pass123"}\' ' +
        'or ADMIN_USERS=\'[{"username":"admin1","password":"pass1"}]\''
      );
    }
  }

  return result;
}

/**
 * Check credentials against admin and owner roles
 * Returns the role name if credentials match, null otherwise
 */
function checkCredentialsAgainstRoles(
  username: string,
  password: string
): { role: 'admin' | 'owner'; matchedUsername: string } | null {
  const allCredentials = getAllRoleCredentials();

  // Debug logging (only in development)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Auth Debug] Checking credentials for username:', username);
    console.log('[Auth Debug] Available admin users:', allCredentials.admin.map(c => c.username));
    console.log('[Auth Debug] Available owner users:', allCredentials.owner.map(c => c.username));
  }

  // Check admin first (higher privilege), then owner
  for (const cred of allCredentials.admin) {
    const usernameMatch = cred.username.trim() === username.trim();
    const passwordMatch = cred.password === password;
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Auth Debug] Comparing admin:', {
        storedUsername: cred.username,
        inputUsername: username,
        usernameMatch,
        passwordMatch,
      });
    }
    if (usernameMatch && passwordMatch) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Auth Debug] ✓ Matched admin credentials');
      }
      return { role: 'admin', matchedUsername: cred.username };
    }
  }

  for (const cred of allCredentials.owner) {
    const usernameMatch = cred.username.trim() === username.trim();
    const passwordMatch = cred.password === password;
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Auth Debug] Comparing owner:', {
        storedUsername: cred.username,
        inputUsername: username,
        usernameMatch,
        passwordMatch,
      });
    }
    if (usernameMatch && passwordMatch) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Auth Debug] ✓ Matched owner credentials');
      }
      return { role: 'owner', matchedUsername: cred.username };
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[Auth Debug] ✗ No matching credentials found');
  }
  return null;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          // Debug logging (only in development)
          if (process.env.NODE_ENV !== 'production') {
            console.log('[Auth Debug] authorize() called with username:', credentials?.username);
            console.log('[Auth Debug] ADMIN_USER env var exists:', !!process.env.ADMIN_USER);
            console.log('[Auth Debug] ADMIN_USER value:', process.env.ADMIN_USER);
          }

          if (!credentials?.username || !credentials?.password) {
            if (process.env.NODE_ENV !== 'production') {
              console.log('[Auth Debug] Missing username or password');
            }
            return null;
          }

          // Check credentials against admin and owner roles
          const match = checkCredentialsAgainstRoles(credentials.username, credentials.password);
          
          if (!match) {
            if (process.env.NODE_ENV !== 'production') {
              console.log('[Auth Debug] No match found for credentials');
            }
            return null;
          }

          // Use username directly as identifier
          const userIdentifier = match.matchedUsername;

        // Check if user exists, create if not
        let user = await prisma.user.findUnique({
          where: { email: userIdentifier },
        });

        if (!user) {
          // Determine display name based on role
          const displayName = match.role === 'admin' ? 'Admin' : 'Owner';

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
            name: user.name || (match.role === 'admin' ? 'Admin' : 'Owner'),
            role: user.role,
          };
        } catch (error) {
          console.error('[Auth Debug] Error in authorize():', error);
          return null;
        }
      },
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
    async signIn({ user, account }) {
      // For credentials, allow sign in (already checked in authorize)
      // Login activity will be logged in the jwt callback
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
        
        // Log login activity for credentials auth
        if (account?.provider === 'credentials' && user.id) {
          await logLoginActivity(user.id, user.email || '', user.name || null);
        }
      } else {
        // On token refresh, preserve iat if it exists, otherwise set it
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

      // Refresh user data from DB on every request
      // This ensures the session stays in sync with the database
      if (token.email) {
        try {
          let dbUser = await prisma.user.findUnique({
            where: { email: token.email as string },
          });

          // If user doesn't exist but we have a valid token, recreate them
          // This handles cases where the database was reset or user was deleted
          if (!dbUser) {
            // Check if email/username matches any role-level credentials
            const allCredentials = getAllRoleCredentials();
            let matchedRole: 'admin' | 'owner' | null = null;
            
            // Check admin first, then owner
            for (const cred of allCredentials.admin) {
              if (token.email.toLowerCase() === cred.username.toLowerCase()) {
                matchedRole = 'admin';
                break;
              }
            }
            
            if (!matchedRole) {
              for (const cred of allCredentials.owner) {
                if (token.email.toLowerCase() === cred.username.toLowerCase()) {
                  matchedRole = 'owner';
                  break;
                }
              }
            }
            
            const role = matchedRole || (token.role as 'admin' | 'owner') || 'admin';

            try {
              dbUser = await prisma.user.create({
                data: {
                  email: token.email as string,
                  name: token.name || (role === 'admin' ? 'Admin' : 'Owner'),
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
              token.id = '';
              return token;
            }
            
            // Only allow admin and owner roles
            if (dbUser.role !== 'admin' && dbUser.role !== 'owner') {
              // Invalid role - invalidate token
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
