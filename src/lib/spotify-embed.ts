export function spotifyEmbedUrl(value?: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "open.spotify.com" || url.username || url.password || url.port) return null;
    const match = url.pathname.match(/^\/(?:intl-[a-z-]+\/)?(album|track)\/([A-Za-z0-9]{22})\/?$/);
    return match ? `https://open.spotify.com/embed/${match[1]}/${match[2]}?theme=0` : null;
  } catch {
    return null;
  }
}
