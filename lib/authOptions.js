/**
 * Shared NextAuth configuration.
 * Exported so API routes can use getServerSession(authOptions).
 */

export const authOptions = {
  providers: [
    {
      id: 'spotify',
      name: 'Spotify',
      type: 'oauth',
      authorization: {
        url: 'https://accounts.spotify.com/authorize',
        params: {
          scope: 'playlist-read-private playlist-read-collaborative',
        },
      },
      token: 'https://accounts.spotify.com/api/token',
      userinfo: 'https://api.spotify.com/v1/me',
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      profile(profile) {
        return {
          id: profile.id,
          name: profile.display_name,
          email: profile.email,
          image: profile.images?.[0]?.url,
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }

      if (Date.now() < (token.expiresAt ?? 0) * 1000) {
        return token;
      }

      // Refresh expired token
      try {
        const basicAuth = Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64');

        const response = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            Authorization: `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: token.refreshToken,
          }),
        });

        const data = await response.json();
        if (!response.ok) throw data;

        return {
          ...token,
          accessToken: data.access_token,
          expiresAt: Math.floor(Date.now() / 1000 + data.expires_in),
          refreshToken: data.refresh_token ?? token.refreshToken,
        };
      } catch (error) {
        console.error('Error refreshing access token', error);
        return { ...token, error: 'RefreshAccessTokenError' };
      }
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
  pages: {
    signIn: '/admin',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
