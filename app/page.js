'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const [quizCode, setQuizCode] = useState('');
  const router = useRouter();

  function handleJoin(e) {
    e.preventDefault();
    if (quizCode.trim()) {
      router.push(`/play?quiz=${quizCode.trim()}`);
    }
  }

  return (
    <div className="landing">
      {/* Background orbs */}
      <div className="landing-bg-orb" />
      <div className="landing-bg-orb" />
      <div className="landing-bg-orb" />

      <div className="landing-content">
        {/* Equalizer */}
        <div className="equalizer">
          <div className="bar" />
          <div className="bar" />
          <div className="bar" />
          <div className="bar" />
          <div className="bar" />
        </div>

        <h1 className="landing-title">
          Guess the <span className="accent">Song</span>
        </h1>
        <p className="landing-subtitle">
          Listen to Spotify track previews, guess the song from 4 options, and
          prove your music knowledge. Host a quiz from your own playlists!
        </p>

        <div className="landing-actions">
          <button
            className="btn btn-primary btn-lg"
            onClick={() => router.push('/admin')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            Host a Quiz
          </button>
        </div>

        <div className="join-section glass-card" style={{ padding: '32px' }}>
          <h3>Join a Quiz</h3>
          <form onSubmit={handleJoin}>
            <div className="join-input-group">
              <input
                id="quiz-code-input"
                type="text"
                placeholder="Enter quiz code..."
                value={quizCode}
                onChange={(e) => setQuizCode(e.target.value)}
                maxLength={8}
              />
              <button
                id="join-quiz-btn"
                type="submit"
                className="btn btn-primary"
                disabled={!quizCode.trim()}
              >
                Play
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
