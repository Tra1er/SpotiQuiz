import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getClientCredentialsToken } from '@/lib/spotify';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const res1 = await fetch('https://api.spotify.com/v1/me/playlists?limit=1', {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    const data1 = await res1.json();
    const playlistId = data1.items?.[0]?.id;

    if (!playlistId) {
      return Response.json({ error: 'No playlists found' });
    }

    // Try with User Token
    const resUser = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=1`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    
    // Try with Client Credentials Token
    let clientStatus = 0;
    let clientError = null;
    try {
      const clientToken = await getClientCredentialsToken();
      const resClient = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=1`, {
        headers: { Authorization: `Bearer ${clientToken}` },
      });
      clientStatus = resClient.status;
      if (!resClient.ok) clientError = await resClient.text();
    } catch (e) {
      clientError = e.message;
    }

    // Try fetching the full playlist instead of just /tracks
    const resFull = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}?limit=1`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });

    return Response.json({ 
      playlistId,
      userTokenStatus: resUser.status,
      userTokenError: resUser.ok ? null : await resUser.text(),
      clientTokenStatus: clientStatus,
      clientTokenError: clientError,
      fullPlaylistStatus: resFull.status,
      fullPlaylistError: resFull.ok ? null : await resFull.text()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
