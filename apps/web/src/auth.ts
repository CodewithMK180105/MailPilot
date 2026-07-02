import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/login`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: credentials.email,
                password: credentials.password,
              }),
            },
          );

          if (!res.ok) return null;

          const data = (await res.json()) as {
            data: {
              user: { id: string; email: string; name: string; role: string; avatarUrl: string };
              token: string;
            };
          };

          if (!data.data?.token) return null;

          return {
            id: data.data.user.id,
            email: data.data.user.email,
            name: data.data.user.name,
            role: data.data.user.role,
            image: data.data.user.avatarUrl,
            accessToken: data.data.token,
          };
        } catch {
          return null;
        }
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
  ],

  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token['accessToken'] = (user as Record<string, unknown>)['accessToken'] as string;
        token['role'] = (user as Record<string, unknown>)['role'] as string;
        token['id'] = user.id;
      }

      // Handle Google OAuth — exchange Google token for our JWT
      if (account?.provider === 'google' && account.id_token) {
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/google`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken: account.id_token }),
            },
          );
          if (res.ok) {
            const data = (await res.json()) as {
              data: { user: { id: string; role: string }; token: string };
            };
            token['accessToken'] = data.data.token;
            token['role'] = data.data.user.role;
            token['id'] = data.data.user.id;
          }
        } catch {
          // Google OAuth backend exchange failed
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          id: token['id'] as string,
          role: token['role'] as string,
        };
        (session as Record<string, unknown>)['accessToken'] = token['accessToken'];
      }
      return session;
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
});
