import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getPlaylistTracks } from '@/lib/spotify';

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

    const allTracks = await getPlaylistTracks(session.accessToken, playlistId);
    if (!allTracks || allTracks.length === 0) {
      return Response.json({ error: 'allTracks is empty' });
    }

    const testTrack = allTracks[0];
    
    // Fetch an anonymous token from the web player
    const tokenRes = await fetch('https://open.spotify.com/get_access_token?reason=transport&productType=web_player', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const tokenData = await tokenRes.json();
    const webToken = tokenData.accessToken;

    // Fetch the single track explicitly using the web player token
    const trackRes = await fetch(`https://api.spotify.com/v1/tracks/${testTrack.id}`, {
      headers: { Authorization: `Bearer ${webToken}` },
    });
    
    const trackData = await trackRes.json();

    return Response.json({ 
      webTokenStatus: tokenRes.status,
      playlistTrackObject: testTrack,
      directTrackObjectPreview: trackData.preview_url,
      directTrackObject: trackData
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
