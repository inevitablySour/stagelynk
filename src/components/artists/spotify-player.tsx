import { spotifyEmbedUrl } from "@/lib/spotify-embed";

export function SpotifyPlayer({ url, title, compact = false }: { url?: string; title: string; compact?: boolean }) {
  const embedUrl = spotifyEmbedUrl(url);
  if (!embedUrl) return null;
  return (
    <div className="overflow-hidden rounded-2xl border border-line/60 bg-surface">
      <iframe
        title={`Spotify player: ${title}`}
        src={embedUrl}
        width="100%"
        height={compact ? 152 : 352}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        className="block w-full border-0"
      />
      <p className="px-3 py-2 text-[10px] leading-5 text-muted">
        Spotify playback · Availability and sign-in are managed by Spotify.
      </p>
    </div>
  );
}
