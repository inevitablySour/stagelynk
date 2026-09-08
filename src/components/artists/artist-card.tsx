/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { MapPin, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/common/star-rating";
import { getInitials } from "@/lib/utils";
import type { MusicianProfile } from "@/types";

interface ArtistCardProps {
  artist: MusicianProfile;
}

export function ArtistCard({ artist }: ArtistCardProps) {
  return (
    <Link href={`/artists/${artist.id}`}>
      <Card className="group overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
        {/* Banner / Image */}
        <div className="relative h-40 bg-gradient-to-br from-olive-500 to-copper-500">
          {artist.bannerImage && (
            <img
              src={artist.bannerImage}
              alt={artist.stageName}
              className="h-full w-full object-cover"
            />
          )}
          {/* Profile avatar overlay */}
          <div className="absolute -bottom-8 left-4">
            <div className="h-16 w-16 rounded-full border-4 border-sand-50 bg-olive-100 flex items-center justify-center text-olive-700 font-bold text-lg shadow-md overflow-hidden">
              {artist.profileImage ? (
                <img src={artist.profileImage} alt={artist.stageName} className="h-full w-full object-cover" />
              ) : (
                getInitials(artist.stageName)
              )}
            </div>
          </div>
        </div>

        <CardContent className="pt-10 pb-4">
          <h3 className="font-semibold text-stone-900 group-hover:text-olive-600 transition-colors">
            {artist.stageName}
          </h3>

          <div className="mt-1.5 flex items-center gap-3 text-xs text-stone-500">
            {artist.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {artist.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {artist.experienceYears}yr exp
            </span>
          </div>

          <div className="mt-2">
            <StarRating rating={artist.rating} size="sm" showValue reviewCount={artist.reviewCount} />
          </div>

          {/* Genre tags */}
          <div className="mt-3 flex flex-wrap gap-1.5">
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
        </CardContent>
      </Card>
    </Link>
  );
}
