import './globals.css';

export const metadata = {
  title: 'Spotify Song Quiz — Guess the Track',
  description: 'A music quiz game powered by Spotify. Listen to song previews and guess the track! Host your own quiz from your playlists and share it with friends.',
  keywords: ['spotify', 'quiz', 'music', 'game', 'guess the song'],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
