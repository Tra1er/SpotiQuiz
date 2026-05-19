'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

/* ─── Confetti Effect ─── */
function Confetti() {
  const colors = ['#1DB954', '#1ed760', '#8b5cf6', '#ec4899', '#3b82f6', '#f59e0b', '#22c55e'];
  const pieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
  }));

  return (
    <div className="confetti-container">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            borderRadius: '2px',
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Main Quiz Component ─── */
function QuizPlayer() {
  const router = useRouter();

  const [quiz, setQuiz] = useState(null);
  const [phase, setPhase] = useState('loading'); // loading, lobby, playing, result, finished
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [roundResult, setRoundResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [error, setError] = useState(null);

  const audioRef = useRef(null);
  const timerRef = useRef(null);

  // Load quiz from sessionStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('spotiQuizData');
      if (!stored) throw new Error('No quiz found in session');
      const data = JSON.parse(stored);
      setQuiz(data);
      setPhase('lobby');
    } catch (err) {
      setError(err.message);
      setPhase('error');
    }
  }, []);

  // Start the quiz
  function startQuiz() {
    setCurrentRound(0);
    setScore(0);
    startRound(0);
  }

  // Start a round
  function startRound(roundIndex) {
    setSelectedAnswer(null);
    setRoundResult(null);
    setCurrentRound(roundIndex);
    setTimeLeft(quiz.previewDuration);
    setPhase('playing');

    // Play audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    const audio = new Audio(quiz.rounds[roundIndex].previewUrl);
    audioRef.current = audio;

    // Start playback
    audio.play().catch(() => {});

    // Stop audio after preview duration
    setTimeout(() => {
      if (audioRef.current === audio) {
        audio.pause();
      }
    }, quiz.previewDuration * 1000);

    // Start countdown
    clearInterval(timerRef.current);
    let remaining = quiz.previewDuration;
    timerRef.current = setInterval(() => {
      remaining -= 1;
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        // Auto-submit if no answer given (time ran out)
        handleTimeUp(roundIndex);
      }
    }, 1000);
  }

  // Handle time running out
  function handleTimeUp(roundIndex) {
    if (selectedAnswer !== null) return; // Already answered
    submitAnswer(roundIndex, '__TIMED_OUT__');
  }

  // Submit answer
  const submitAnswer = useCallback((roundIndex, answer) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(answer);
    clearInterval(timerRef.current);

    // Stop audio
    if (audioRef.current) {
      audioRef.current.pause();
    }

    try {
      const round = quiz.rounds[roundIndex];
      const isCorrect = round.correctAnswer === answer;
      const data = {
        isCorrect,
        track: {
          name: round.trackName,
          artist: round.artist,
          albumImage: round.albumImage
        }
      };

      if (data.isCorrect) {
        setScore((s) => s + 1);
      }

      setRoundResult(data);
      setPhase('result');
    } catch {
      // Fallback — still show result phase
      setPhase('result');
    }
  }, [quiz, selectedAnswer]);

  // Next round or finish
  function nextRound() {
    const next = currentRound + 1;
    if (next >= quiz.totalRounds) {
      setPhase('finished');
    } else {
      startRound(next);
    }
  }

  // Cleanup
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  // Get grade
  function getGrade(score, total) {
    const pct = score / total;
    if (pct >= 0.95) return 'S';
    if (pct >= 0.8) return 'A';
    if (pct >= 0.6) return 'B';
    if (pct >= 0.4) return 'C';
    return 'D';
  }

  // Timer circumference for SVG ring
  const circumference = 2 * Math.PI * 88;
  const timerProgress = quiz ? (timeLeft / quiz.previewDuration) * circumference : 0;

  /* ─── RENDER ─── */

  if (phase === 'loading') {
    return (
      <div className="play-container">
        <div className="loading-container">
          <div className="spinner" />
          <p style={{ color: 'var(--text-muted)' }}>Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="play-container">
        <div className="error-card glass-card" style={{ margin: 'auto' }}>
          <h2>Oops!</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => router.push('/')}>
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'lobby') {
    return (
      <div className="play-container">
        <div className="lobby">
          {quiz.playlistImage && (
            <img className="lobby-image" src={quiz.playlistImage} alt={quiz.playlistName} />
          )}
          <h1>{quiz.playlistName}</h1>
          <p className="lobby-info">
            {quiz.totalRounds} rounds · {quiz.previewDuration}s previews
          </p>
          <button id="start-quiz-btn" className="btn btn-primary btn-lg" onClick={startQuiz}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Start Quiz
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'playing') {
    const round = quiz.rounds[currentRound];
    return (
      <div className="play-container">
        <div className="round-container">
          <div className="round-header">
            <span className="round-counter">
              Round {currentRound + 1} / {quiz.totalRounds}
            </span>
            <span className="round-score">Score: {score}</span>
          </div>

          <div className="progress-bar-container">
            <div
              className="progress-bar"
              style={{ width: `${((currentRound) / quiz.totalRounds) * 100}%` }}
            />
          </div>

          <div className="audio-section">
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="vinyl-disc spinning" />
              <svg className="timer-ring" viewBox="0 0 192 192">
                <circle className="timer-bg" cx="96" cy="96" r="88" />
                <circle
                  className="timer-progress"
                  cx="96"
                  cy="96"
                  r="88"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - timerProgress}
                />
              </svg>
            </div>
            <span className={`timer-text ${timeLeft <= 5 ? 'urgent' : ''}`}>
              {timeLeft}s
            </span>
          </div>

          <div className="options-grid">
            {round.options.map((option, i) => (
              <button
                key={i}
                className="option-btn"
                onClick={() => submitAnswer(currentRound, option)}
                disabled={selectedAnswer !== null}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'result') {
    return (
      <div className="play-container">
        <div className="round-container">
          <div className="round-header">
            <span className="round-counter">
              Round {currentRound + 1} / {quiz.totalRounds}
            </span>
            <span className="round-score">Score: {score}</span>
          </div>

          <div className="progress-bar-container">
            <div
              className="progress-bar"
              style={{ width: `${((currentRound + 1) / quiz.totalRounds) * 100}%` }}
            />
          </div>

          <div className="round-result">
            <div className="result-icon">
              {roundResult?.isCorrect ? '🎉' : '😢'}
            </div>
            <h2 style={{ marginBottom: 8 }}>
              {roundResult?.isCorrect ? 'Correct!' : selectedAnswer === '__TIMED_OUT__' ? 'Time\'s Up!' : 'Wrong!'}
            </h2>

            {roundResult?.track && (
              <div className="result-track-info">
                {roundResult.track.albumImage && (
                  <img src={roundResult.track.albumImage} alt="" />
                )}
                <div>
                  <div className="result-track-name">{roundResult.track.name}</div>
                  <div className="result-track-artist">{roundResult.track.artist}</div>
                </div>
              </div>
            )}

            <button className="btn btn-primary" style={{ marginTop: 24 }} onClick={nextRound}>
              {currentRound + 1 >= quiz.totalRounds ? 'See Results' : 'Next Round'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'finished') {
    const grade = getGrade(score, quiz.totalRounds);
    const pct = Math.round((score / quiz.totalRounds) * 100);

    return (
      <div className="play-container">
        {pct >= 80 && <Confetti />}
        <div className="final-score">
          <div className={`score-grade grade-${grade.toLowerCase()}`}>{grade}</div>
          <div className="score-fraction">{score} / {quiz.totalRounds}</div>
          <div className="score-percentage">{pct}% correct</div>
          <div className="final-actions">
            <button className="btn btn-primary btn-lg" onClick={startQuiz}>
              Play Again
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => router.push('/')}>
              Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function PlayPage() {
  return (
    <Suspense fallback={
      <div className="play-container">
        <div className="loading-container">
          <div className="spinner" />
        </div>
      </div>
    }>
      <QuizPlayer />
    </Suspense>
  );
}
