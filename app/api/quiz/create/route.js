import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getPlaylistTracks, getPlaylistInfo, getClientCredentialsToken } from '@/lib/spotify';
import { saveQuiz } from '@/lib/quizStore';
import { randomUUID } from 'crypto';

/**
 * Shuffle array using Fisher-Yates algorithm.
 */
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Fetch 30-second audio preview from iTunes API.
 * This is a workaround since Spotify deprecated preview_url for 3rd party apps.
 */
async function getItunesPreview(trackName, artistName) {
  try {
    // Clean up track name (remove " - Remastered", "(feat. x)", etc) for better iTunes search
    const cleanName = trackName.split(' - ')[0].split('(')[0].trim();
    const cleanArtist = artistName.split(',')[0].trim();
    
    const query = encodeURIComponent(`${cleanName} ${cleanArtist}`);
    const res = await fetch(`https://itunes.apple.com/search?term=${query}&entity=song&limit=3`);
    
    if (!res.ok) return null;
    
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      // Find the first result that has a previewUrl
      const match = data.results.find(r => r.previewUrl);
      return match ? match.previewUrl : null;
    }
  } catch (e) {
    console.error('iTunes fetch error:', e);
    return null;
  }
  return null;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { playlistId, numRounds = 10, previewDuration = 15 } = body;

    if (!playlistId) {
      return Response.json({ error: 'playlistId is required' }, { status: 400 });
    }

    let accessToken;
    const session = await getServerSession(authOptions);

    if (session?.accessToken) {
      accessToken = session.accessToken;
    } else {
      accessToken = await getClientCredentialsToken();
    }

    // Fetch playlist info and tracks
    const [playlistInfo, allTracks] = await Promise.all([
      getPlaylistInfo(accessToken, playlistId),
      getPlaylistTracks(accessToken, playlistId),
    ]);

    // Spotify's preview_url is now mostly null. We must find N tracks with previews (Spotify or iTunes)
    const shuffledPool = shuffle(allTracks.filter(t => t && t.name));
    const selectedTracks = [];
    let tracksChecked = 0;

    // Process in batches so we don't hit iTunes rate limits too hard, but still fast enough
    for (const track of shuffledPool) {
      if (selectedTracks.length >= numRounds) break;
      if (tracksChecked > 100) break; // Don't loop forever if playlist is obscure
      
      tracksChecked++;
      
      let previewUrl = track.previewUrl;
      
      if (!previewUrl) {
         previewUrl = await getItunesPreview(track.name, track.artist);
      }

      if (previewUrl) {
        track.previewUrl = previewUrl; // Attach working preview
        selectedTracks.push(track);
      }
    }

    if (selectedTracks.length < 4) {
      return Response.json(
        {
          error: `Could not find enough audio previews. Found ${selectedTracks.length}, but need at least 4. Try a playlist with more mainstream songs.`,
        },
        { status: 400 }
      );
    }

    // Build rounds with multiple-choice options
    const rounds = selectedTracks.map((track) => {
      // Get 3 decoy options from other tracks in the playlist
      const otherTracks = allTracks.filter((t) => t.id !== track.id);
      const decoys = shuffle(otherTracks)
        .slice(0, 3)
        .map((t) => `${t.name} — ${t.artist}`);

      const correctAnswer = `${track.name} — ${track.artist}`;
      const options = shuffle([correctAnswer, ...decoys]);

      return {
        previewUrl: track.previewUrl,
        correctAnswer,
        trackName: track.name,
        artist: track.artist,
        album: track.album,
        albumImage: track.albumImage,
        options,
      };
    });

    const quiz = {
      playlistName: playlistInfo.name,
      playlistImage: playlistInfo.image,
      previewDuration,
      totalRounds: selectedTracks.length,
      tracksWithPreviews: selectedTracks.length,
      totalTracks: allTracks.length,
      rounds,
    };

    return Response.json(quiz);
  } catch (error) {
    console.error('Error creating quiz:', error);
    return Response.json({ error: 'Failed to create quiz' }, { status: 500 });
  }
}
