import Link from "next/link";
import { MapPin, ArrowUpRight, AudioLines } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/common/star-rating";
import { getInitials } from "@/lib/utils";
import type { MusicianProfile } from "@/types";
import { ProfileArtwork } from "@/components/artists/profile-artwork";
import { CREATIVE_CATEGORIES } from "@/config";
import { formatMoney } from "@/lib/marketplace-fees";
import { SpotifyPlayer } from "@/components/artists/spotify-player";
import { spotifyEmbedUrl } from "@/lib/spotify-embed";

interface ArtistCardProps {
  artist: MusicianProfile;
  blindScout?: boolean;
}

export function ArtistCard({ artist, blindScout = false }: ArtistCardProps) {
  const category = CREATIVE_CATEGORIES.find((item) => item.slug === artist.primaryCategory)?.name ?? "Creative";
  const spotifyAlbum = artist.discography.find((album) => album.source === "spotify" && spotifyEmbedUrl(album.externalUrl));
  return (
    <article className="group min-w-0 h-full rounded-2xl">
      <Card className="relative flex h-full flex-col overflow-hidden rounded-2xl transition-all group-hover:-translate-y-1 group-hover:border-brand/40 group-hover:shadow-[0_20px_55px_-30px_rgba(47,59,29,0.35)]">
        {/* Banner / Image */}
        <div className="relative">
          <ProfileArtwork src={artist.bannerImage} alt="" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="h-40 bg-gradient-to-br from-olive-800 via-brand to-copper-500">
            <div className="absolute -right-8 -top-16 h-56 w-56 rounded-full border-[28px] border-surface/10" />
            <AudioLines className="absolute bottom-5 right-5 h-16 w-16 text-surface/15" />
          </ProfileArtwork>
          <span className="absolute left-4 top-4 rounded-full border border-white/25 bg-olive-900/80 px-3 py-1 text-[11px] font-medium text-white">{category}</span>
          {/* Profile avatar overlay */}
          <div className="absolute -bottom-8 left-5">
            <ProfileArtwork src={artist.profileImage} alt="" sizes="72px" className="flex h-18 w-18 items-center justify-center rounded-2xl border-4 border-surface bg-brand-soft text-xl font-bold text-brand shadow-sm">
              {getInitials(artist.stageName)}
            </ProfileArtwork>
          </div>
        </div>

        <CardContent className="flex flex-1 flex-col px-5 pt-12 pb-5">
          <h3 className="break-words text-xl font-semibold tracking-tight text-ink transition-colors group-hover:text-brand">
            {artist.stageName}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            {artist.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {artist.location}
              </span>
            )}
            {artist.experienceYears > 0 && <span>{artist.experienceYears} years of experience</span>}
          </div>
          <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted">{artist.bio || "A new creative connection waiting to happen. Get to know their work."}</p>
          {artist.performanceFee != null && <p className="mt-3 text-xs font-semibold text-brand">From {formatMoney(artist.performanceFee)} / performance</p>}
          {blindScout && <div className="relative z-10 mt-4">{spotifyAlbum ? <SpotifyPlayer url={spotifyAlbum.externalUrl} title={spotifyAlbum.title} compact /> : <p className="rounded-xl bg-page/40 p-3 text-xs leading-5 text-muted">No Spotify release linked yet. Explore their profile and creative influences.</p>}</div>}

          {/* Genre tags */}
          <div className="mt-4 mb-5 flex flex-wrap gap-1.5">
            {artist.genres.slice(0, 3).map((genre) => (
              <Badge key={genre.id} variant="secondary" className="text-[10px]">
                {genre.name}
              </Badge>
            ))}
            {artist.genres.length > 3 && (
              <Badge variant="outline" className="text-[10px]">
                +{artist.genres.length - 3}
              </Badge>
            )}
          </div>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            {blindScout ? <span className="text-xs text-muted">Sound first. No social scores.</span> : artist.reviewCount > 0 ? <div><StarRating rating={artist.rating} size="sm" /><p className="mt-1 text-[11px] text-muted">{artist.weightedRating}/10 weighted · {artist.reviewCount} reviews</p></div> : <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-medium text-brand">New to the community</span>}
            <Link href={`/artists/${artist.id}`} aria-label={`View ${artist.stageName}'s profile`} className="inline-flex items-center gap-1 text-xs font-semibold text-brand after:absolute after:inset-0">View profile <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Link>
          </div>
        </CardContent>
      </Card>
    </article>
  );
}
