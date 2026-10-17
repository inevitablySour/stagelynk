import { ArrowUpRight, Music2 } from "lucide-react";
import { ProfileArtwork } from "@/components/artists/profile-artwork";
import { SpotifyPlayer } from "@/components/artists/spotify-player";
import { spotifyEmbedUrl } from "@/lib/spotify-embed";
import type { Album } from "@/types";

export function PortfolioRelease({ album }: { album: Album }) {
  if (spotifyEmbedUrl(album.externalUrl)) {
    return (
      <article aria-label={album.title} className="min-w-0 space-y-3">
        <SpotifyPlayer url={album.externalUrl} title={album.title} />
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted">
          <p className="flex flex-wrap items-center gap-2">
            <span>{album.releaseYear}</span>
            <span aria-hidden="true">·</span>
            <span>{album.title.includes("demo reference") ? "Demo reference · Original artist recording" : "Spotify release"}</span>
          </p>
          <a href={album.externalUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${album.title} on Spotify`} className="inline-flex items-center gap-1 font-medium text-brand hover:underline">
            Open in Spotify <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </article>
    );
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-line">
      <div className="flex items-center gap-4 bg-page/30 p-4">
        <ProfileArtwork src={album.coverArt} alt={`${album.title} artwork`} sizes="64px" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Music2 className="h-6 w-6" />
        </ProfileArtwork>
        <div className="min-w-0">
          <h3 className="break-words font-semibold text-ink">{album.title}</h3>
          <p className="mt-1 text-xs text-muted">{album.releaseYear} · {album.tracks.length} tracks</p>
          {album.externalUrl && <a href={album.externalUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">Open release <ArrowUpRight className="h-3 w-3" /></a>}
        </div>
      </div>
      <ol className="divide-y divide-line/60">
        {[...album.tracks].sort((a, b) => a.trackNumber - b.trackNumber).map((track) => (
          <li key={track.id} className="flex items-center gap-3 px-4 py-3 text-sm">
            <span className="w-5 shrink-0 text-xs tabular-nums text-muted">{String(track.trackNumber).padStart(2, "0")}</span>
            <span className="min-w-0 flex-1 break-words font-medium text-ink">{track.title}</span>
            <span className="shrink-0 text-xs tabular-nums text-muted">{track.duration > 0 ? `${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, "0")}` : "—"}</span>
          </li>
        ))}
      </ol>
    </article>
  );
}
