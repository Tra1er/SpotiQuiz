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

export async function POST(request) {
  try {
    const body = await request.json();
    const { playlistId, numRounds = 10, previewDuration = 15 } = body;

    if (!playlistId) {
      return Response.json({ error: 'playlistId is required' }, { status: 400 });
    }

    // Try user token first, fall back to client credentials
    let accessToken;
    const session = await getServerSession(authOptions);

    if (session?.accessToken) {
      accessToken = session.accessToken;
    } else {
      accessToken = await getClientCredentialsToken();
    }

    // Fetch playlist info and tracks (handles pagination for any size)
    const [playlistInfo, allTracks] = await Promise.all([
      getPlaylistInfo(accessToken, playlistId),
      getPlaylistTracks(accessToken, playlistId),
    ]);

    // Filter tracks that have a preview URL
    const tracksWithPreview = allTracks.filter((t) => t.previewUrl);

    if (tracksWithPreview.length < 4) {
      return Response.json(
        {
          error: `Not enough tracks with previews. Found ${tracksWithPreview.length} tracks with audio previews, but need at least 4.`,
        },
        { status: 400 }
      );
    }

    // Determine actual number of rounds (can't exceed available tracks)
    const actualRounds = Math.min(numRounds, tracksWithPreview.length);

    // Shuffle and pick tracks for rounds
    const selectedTracks = shuffle(tracksWithPreview).slice(0, actualRounds);

    // Build rounds with multiple-choice options
    const rounds = selectedTracks.map((track) => {
      // Get 3 decoy options from other tracks in the playlist
      const otherTracks = allTracks.filter((t) => t.id !== track.id);
      const decoys = shuffle(otherTracks)
        .slice(0, 3)
        .map((t) => `${t.name} — ${t.artist}`);

      const correctAnswer = `${track.name} — ${track.artist}`;

      // Shuffle options so correct answer isn't always in the same position
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

    // Save quiz
    const quizId = randomUUID().slice(0, 8);
    saveQuiz(quizId, {
      playlistName: playlistInfo.name,
      playlistImage: playlistInfo.image,
      previewDuration,
      rounds,
    });

    return Response.json({
      quizId,
      totalRounds: actualRounds,
      playlistName: playlistInfo.name,
      tracksWithPreviews: tracksWithPreview.length,
      totalTracks: allTracks.length,
    });
  } catch (error) {
    console.error('Error creating quiz:', error);
    return Response.json({ error: 'Failed to create quiz' }, { status: 500 });
  }
}
