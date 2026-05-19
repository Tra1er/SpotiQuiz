/**
 * Spotify Web API helper functions.
 * Handles token management and all API calls with full pagination support.
 */

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

/**
 * Get a Client Credentials token (no user login needed).
 * Used as fallback for fetching track data.
 */
export async function getClientCredentialsToken() {
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

  const data = await res.json();
  return data.access_token;
}

/**
 * Fetch all pages of a paginated Spotify endpoint.
 * Handles playlists with 100+ tracks automatically.
 */
async function fetchAllPages(url, accessToken, maxItems = 500) {
  const items = [];
  let nextUrl = url;

  while (nextUrl && items.length < maxItems) {
    const res = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'unknown');
      console.error(`Spotify API error ${res.status}:`, errorText);
      throw new Error(`Spotify API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    items.push(...(data.items || []));
    nextUrl = data.next;
  }

  return items;
}

/**
 * Get the current user's playlists (requires user OAuth token).
 */
export async function getUserPlaylists(accessToken) {
  const items = await fetchAllPages(
    `${SPOTIFY_API_BASE}/me/playlists?limit=50`,
    accessToken,
    200
  );

  return items.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    image: p.images?.[0]?.url || null,
    trackCount: p.tracks?.total ?? 0,
    owner: p.owner?.display_name || 'Unknown',
  }));
}

/**
 * Get all tracks from a playlist, handling pagination for any size.
 * No fields filter — fetch the full response to avoid data loss.
 */
export async function getPlaylistTracks(accessToken, playlistId) {
  const items = await fetchAllPages(
    `${SPOTIFY_API_BASE}/playlists/${playlistId}/items?limit=100`,
    accessToken,
    2000
  );

  return items
    .filter((item) => item?.track && item.track.id)
    .map((item) => ({
      id: item.track.id,
      name: item.track.name,
      artist: item.track.artists?.map((a) => a.name).join(', ') || 'Unknown',
      album: item.track.album?.name || 'Unknown',
      albumImage: item.track.album?.images?.[0]?.url || null,
      previewUrl: item.track.preview_url,
      durationMs: item.track.duration_ms,
    }));
}

/**
 * Get playlist metadata.
 */
export async function getPlaylistInfo(accessToken, playlistId) {
  const res = await fetch(
    `${SPOTIFY_API_BASE}/playlists/${playlistId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    const errorText = await res.text().catch(() => 'unknown');
    console.error(`Playlist info error ${res.status}:`, errorText);
    throw new Error(`Spotify API error: ${res.status}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    image: data.images?.[0]?.url || null,
    trackCount: data.tracks?.total ?? 0,
  };
}
