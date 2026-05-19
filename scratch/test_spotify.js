const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1]] = match[2];
  }
});

async function testSpotify() {
  const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
  const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

  const basicAuth = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const tokenData = await res.json();
  const accessToken = tokenData.access_token;
  console.log('Got token:', !!accessToken);

  // Use a known public playlist ID, e.g., Spotify's Top 50 Global
  const playlistId = '37i9dQZEVXbMDoHDwVN2tF';

  const plRes = await fetch(
    `${SPOTIFY_API_BASE}/playlists/${playlistId}?fields=tracks(total)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  
  console.log('Status:', plRes.status);
  const plData = await plRes.json();
  console.log('Data:', JSON.stringify(plData, null, 2));
}

testSpotify().catch(console.error);
