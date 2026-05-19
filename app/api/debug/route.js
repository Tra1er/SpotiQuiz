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
    
    // Fetch the single track explicitly to check for preview_url
    const trackRes = await fetch(`https://api.spotify.com/v1/tracks/${testTrack.id}`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    
    const trackData = await trackRes.json();

    return Response.json({ 
      playlistTrackObject: testTrack,
      directTrackObjectPreview: trackData.preview_url,
      directTrackObject: trackData
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
