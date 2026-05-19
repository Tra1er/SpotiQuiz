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
    
    // Scrape the embed widget
    const embedRes = await fetch(`https://open.spotify.com/embed/track/${testTrack.id}`);
    const embedHtml = await embedRes.text();
    
    // Look for anything resembling a preview url in the HTML
    const previewMatch = embedHtml.match(/"preview_url":"(https:\/\/[^"]+)"/);
    const audioUrlMatch = embedHtml.match(/"audioPreview":\{"url":"(https:\/\/[^"]+)"/);
    
    return Response.json({ 
      embedStatus: embedRes.status,
      playlistTrackObject: testTrack,
      foundPreview1: previewMatch ? previewMatch[1] : null,
      foundPreview2: audioUrlMatch ? audioUrlMatch[1] : null,
      htmlSnippet: embedHtml.substring(0, 500)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
