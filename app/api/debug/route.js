import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const res = await fetch('https://api.spotify.com/v1/me/playlists?limit=2', {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });

    const data = await res.json();
    return Response.json({ 
      status: res.status,
      data: data
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
