import { spotifyEmbedUrl } from "@/lib/spotify-embed";

export function SpotifyPlayer({ url, title, compact = false }: { url?: string; title: string; compact?: boolean }) {
  const embedUrl = spotifyEmbedUrl(url);
  if (!embedUrl) return null;
  return (
    <div className="overflow-hidden rounded-2xl bg-[#1f1f1f] shadow-[0_12px_30px_-20px_rgba(0,0,0,0.5)]">
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
    </div>
  );
}
