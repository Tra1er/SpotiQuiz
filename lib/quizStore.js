/**
 * In-memory quiz session store.
 * Stores active quiz sessions with auto-cleanup after 24 hours.
 */

const quizzes = new Map();

const QUIZ_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Store a quiz session.
 */
export function saveQuiz(quizId, quizData) {
  quizzes.set(quizId, {
    ...quizData,
    createdAt: Date.now(),
  });

  // Schedule cleanup
  setTimeout(() => {
    quizzes.delete(quizId);
  }, QUIZ_TTL_MS);
}

/**
 * Get a quiz session by ID.
 */
export function getQuiz(quizId) {
  const quiz = quizzes.get(quizId);
  if (!quiz) return null;

  // Check TTL
  if (Date.now() - quiz.createdAt > QUIZ_TTL_MS) {
    quizzes.delete(quizId);
    return null;
  }

  return quiz;
}

/**
 * Get player-safe quiz data (without answers).
 */
export function getQuizForPlayer(quizId) {
  const quiz = getQuiz(quizId);
  if (!quiz) return null;

  return {
    quizId,
    playlistName: quiz.playlistName,
    playlistImage: quiz.playlistImage,
    totalRounds: quiz.rounds.length,
    previewDuration: quiz.previewDuration,
    rounds: quiz.rounds.map((round, index) => ({
      roundNumber: index + 1,
      previewUrl: round.previewUrl,
      options: round.options,
      // Do NOT include correctAnswer here
    })),
  };
}

/**
 * Check if an answer is correct for a specific round.
 */
export function checkAnswer(quizId, roundIndex, answer) {
  const quiz = getQuiz(quizId);
  if (!quiz) return null;
  if (roundIndex < 0 || roundIndex >= quiz.rounds.length) return null;

  const round = quiz.rounds[roundIndex];
  const isCorrect = answer === round.correctAnswer;

  return {
    isCorrect,
    correctAnswer: round.correctAnswer,
    track: {
      name: round.trackName,
      artist: round.artist,
      album: round.album,
      albumImage: round.albumImage,
    },
  };
}
