import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Try fetching the first user playlist's tracks
    const res1 = await fetch('https://api.spotify.com/v1/me/playlists?limit=1', {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    const data1 = await res1.json();
    const playlistId = data1.items?.[0]?.id;

    if (!playlistId) {
      return Response.json({ error: 'No playlists found' });
    }

    const res2 = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=5`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    
    const data2 = await res2.json();

    // Map to just what we care about to keep payload small
    const mapped = data2.items?.map(i => ({
      name: i.track?.name,
      id: i.track?.id,
      preview: i.track?.preview_url,
      hasTrack: !!i.track
    }));

    return Response.json({ 
      status: res2.status,
      playlistId,
      rawItem: data2.items?.[0],
      mapped
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
