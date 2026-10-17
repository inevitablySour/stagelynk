import { getLogger } from "@/lib/logger";

const log = getLogger("spotify");

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.accessToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Spotify integration is not configured");
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const body = await res.text();
    log.error({ status: res.status, body }, "Failed to obtain Spotify access token");
    throw new Error("Unable to authenticate with Spotify");
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    accessToken: json.access_token,
    expiresAt: Date.now() + (json.expires_in - 60) * 1000,
  };

  return cachedToken.accessToken;
}

async function spotifyFetch<T>(path: string): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.text();
    log.error({ status: res.status, body, path }, "Spotify API request failed");
    if (res.status === 404) throw new Error("Spotify artist not found");
    throw new Error("Spotify API request failed");
  }

  return res.json() as Promise<T>;
}

interface SpotifyImage {
  url: string;
}

interface SpotifyAlbum {
  id: string;
  name: string;
  release_date: string;
  images: SpotifyImage[];
  external_urls: { spotify: string };
  album_group?: string;
}

interface SpotifyTrack {
  id: string;
  name: string;
  duration_ms: number;
  track_number: number;
  preview_url: string | null;
}

export interface SpotifyAlbumWithTracks {
  externalId: string;
  title: string;
  releaseYear: number;
  coverArt: string | undefined;
  externalUrl: string;
  tracks: {
    title: string;
    duration: number;
    trackNumber: number;
    previewUrl: string | undefined;
  }[];
}

const ALBUMS_PAGE_SIZE = 10;

async function fetchAllArtistAlbums(spotifyArtistId: string): Promise<SpotifyAlbum[]> {
  const albums: SpotifyAlbum[] = [];
  let offset = 0;

  while (true) {
    const page = await spotifyFetch<{ items: SpotifyAlbum[]; next: string | null }>(
      `/artists/${encodeURIComponent(spotifyArtistId)}/albums?include_groups=album,single&limit=${ALBUMS_PAGE_SIZE}&offset=${offset}&market=US`
    );
    albums.push(...page.items);
    if (!page.next || page.items.length === 0) break;
    offset += ALBUMS_PAGE_SIZE;
  }

  return albums;
}

const MAX_ALBUMS_PER_IMPORT = 30;

export async function fetchArtistDiscography(spotifyArtistId: string): Promise<SpotifyAlbumWithTracks[]> {
  const spotifyAlbums = (await fetchAllArtistAlbums(spotifyArtistId)).slice(0, MAX_ALBUMS_PER_IMPORT);

  const albums: SpotifyAlbumWithTracks[] = [];

  for (const album of spotifyAlbums) {
    const tracksResponse = await spotifyFetch<{ items: SpotifyTrack[] }>(`/albums/${album.id}/tracks?limit=50`);

    albums.push({
      externalId: album.id,
      title: album.name,
      releaseYear: Number(album.release_date.slice(0, 4)) || new Date().getFullYear(),
      coverArt: album.images[0]?.url,
      externalUrl: album.external_urls.spotify,
      tracks: tracksResponse.items.map((track) => ({
        title: track.name,
        duration: Math.round(track.duration_ms / 1000),
        trackNumber: track.track_number,
        previewUrl: track.preview_url ?? undefined,
      })),
    });
  }

  return albums;
}
