import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getPlaylistTracks, getPlaylistInfo } from '@/lib/spotify';

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
      // Dump the raw playlist to see why tracks are missing
      const rawRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      return Response.json({ error: 'allTracks is empty', rawPlaylist: await rawRes.json() });
    }

    const testTrack = allTracks[0];
    const cleanName = testTrack.name.split(' - ')[0].split('(')[0].trim();
    const cleanArtist = testTrack.artist.split(',')[0].trim();
    const query = encodeURIComponent(`${cleanName} ${cleanArtist}`);
    const itunesUrl = `https://itunes.apple.com/search?term=${query}&entity=song&limit=3`;
    
    let itunesData = null;
    try {
      const iRes = await fetch(itunesUrl);
      itunesData = await iRes.json();
    } catch (e) {
      itunesData = e.message;
    }

    return Response.json({ 
      playlistId,
      tracksFound: allTracks.length,
      testTrack,
      itunesUrl,
      itunesData
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
