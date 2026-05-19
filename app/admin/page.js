'use client';

import { useEffect, useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

function ConfigModal({ playlist, onClose, onCreated }) {
  const [numRounds, setNumRounds] = useState(10);
  const [previewDuration, setPreviewDuration] = useState(15);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const roundOptions = [5, 10, 15, 20, 30];
  const durationOptions = [
    { value: 5, label: '5s' },
    { value: 10, label: '10s' },
    { value: 15, label: '15s' },
    { value: 20, label: '20s' },
    { value: 30, label: '30s (full)' },
  ];

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/quiz/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playlistId: playlist.id,
          numRounds,
          previewDuration,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create quiz');
      onCreated(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal glass-card">
        <h2>Configure Quiz</h2>
        <p className="modal-subtitle">
          {playlist.name} · {playlist.trackCount} tracks
        </p>

        <div className="config-group">
          <label>Number of Rounds</label>
          <div className="config-options">
            {roundOptions.map((n) => (
              <button
                key={n}
                className={`config-option ${numRounds === n ? 'active' : ''}`}
                onClick={() => setNumRounds(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="config-group">
          <label>Preview Duration</label>
          <div className="config-options">
            {durationOptions.map((d) => (
              <button
                key={d.value}
                className={`config-option ${previewDuration === d.value ? 'active' : ''}`}
                onClick={() => setPreviewDuration(d.value)}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p style={{ color: 'var(--error)', fontSize: '0.9rem', marginTop: 12 }}>{error}</p>
        )}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
            {creating ? 'Creating...' : 'Create Quiz'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ShareView({ quizData }) {
  const [copied, setCopied] = useState(false);
  const quizUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/play?quiz=${quizData.quizId}`
    : '';

  function handleCopy() {
    navigator.clipboard.writeText(quizUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="share-card glass-card">
      <h2>Quiz Ready! 🎉</h2>
      <p className="share-subtitle">Share this link with anyone to let them play</p>

      <div className="share-link-box">
        <input type="text" readOnly value={quizUrl} onClick={(e) => e.target.select()} />
        <button className="btn btn-primary" onClick={handleCopy}>
          {copied ? '✓' : 'Copy'}
        </button>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
        Quiz code: <strong style={{ color: 'var(--spotify-green)' }}>{quizData.quizId}</strong>
      </p>

      <div className="share-stats">
        <div className="share-stat">
          <div className="value">{quizData.totalRounds}</div>
          <div className="label">Rounds</div>
        </div>
        <div className="share-stat">
          <div className="value">{quizData.tracksWithPreviews}</div>
          <div className="label">Previews</div>
        </div>
        <div className="share-stat">
          <div className="value">{quizData.totalTracks}</div>
          <div className="label">Total Tracks</div>
        </div>
      </div>

      <div style={{ marginTop: 32, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => window.open(`/play?quiz=${quizData.quizId}`, '_blank')}>
          Play Now
        </button>
        <button className="btn btn-secondary" onClick={() => window.location.reload()}>
          Create Another
        </button>
      </div>
    </div>
  );
}

function AdminContent() {
  const { data: session, status } = useSession();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [createdQuiz, setCreatedQuiz] = useState(null);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (session?.accessToken) {
      fetchPlaylists();
    }
  }, [session]);

  async function fetchPlaylists() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/playlists');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch playlists');
      setPlaylists(data.playlists);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (status === 'loading') {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="login-card glass-card">
        <h2>Host a Quiz</h2>
        <p>
          Sign in with your Spotify account to browse your playlists and create a
          quiz that anyone can play.
        </p>
        <button
          id="spotify-login-btn"
          className="btn btn-primary btn-lg"
          onClick={() => signIn('spotify')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
          Sign in with Spotify
        </button>
        <button
          className="btn btn-secondary"
          style={{ marginTop: 16 }}
          onClick={() => router.push('/')}
        >
          ← Back
        </button>
      </div>
    );
  }

  if (createdQuiz) {
    return <ShareView quizData={createdQuiz} />;
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Your Playlists</h1>
        <div className="admin-header-actions">
          <div className="admin-user">
            {session.user?.image && (
              <img src={session.user.image} alt="" />
            )}
            <span style={{ fontSize: '0.85rem' }}>{session.user?.name}</span>
          </div>
          <button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </div>

      {error && (
        <div className="error-card glass-card" style={{ margin: '0 0 24px' }}>
          <p style={{ color: 'var(--error)' }}>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="loading-container" style={{ minHeight: '40vh' }}>
          <div className="spinner" />
          <p style={{ color: 'var(--text-muted)' }}>Loading playlists...</p>
        </div>
      ) : (
        <div className="playlist-grid">
          {playlists.map((pl) => (
            <div
              key={pl.id}
              className="playlist-card"
              onClick={() => setSelectedPlaylist(pl)}
            >
              {pl.image ? (
                <img className="playlist-card-image" src={pl.image} alt={pl.name} />
              ) : (
                <div className="playlist-card-image-placeholder">🎵</div>
              )}
              <h3>{pl.name}</h3>
              <p>{pl.trackCount} tracks · {pl.owner}</p>
            </div>
          ))}
        </div>
      )}

      {selectedPlaylist && (
        <ConfigModal
          playlist={selectedPlaylist}
          onClose={() => setSelectedPlaylist(null)}
          onCreated={(data) => {
            setSelectedPlaylist(null);
            setCreatedQuiz(data);
          }}
        />
      )}
    </div>
  );
}

// Wrap with SessionProvider
import { SessionProvider } from 'next-auth/react';

export default function AdminPage() {
  return (
    <SessionProvider>
      <AdminContent />
    </SessionProvider>
  );
}
