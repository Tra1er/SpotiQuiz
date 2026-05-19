import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getUserPlaylists } from '@/lib/spotify';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const playlists = await getUserPlaylists(session.accessToken);
    return Response.json({ playlists });
  } catch (error) {
    console.error('Error fetching playlists:', error);
    return Response.json({ error: 'Failed to fetch playlists' }, { status: 500 });
  }
}
