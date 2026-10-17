import type { Prisma } from "@prisma/client";
import type { Album, MusicianProfile, SocialLinks, Track } from "@/types";
import { computeWeightedRating } from "@/lib/rating";

type MusicianWithRelations = Prisma.MusicianProfileGetPayload<{
  include: {
    genres: { include: { genre: true } };
    albums: { include: { tracks: true } };
    credentials?: true;
    availabilitySlots?: true;
  };
}>;

export function serializeMusicianProfile(profile: MusicianWithRelations): MusicianProfile {
  return {
    id: profile.id,
    userId: profile.userId,
    stageName: profile.stageName,
    bio: profile.bio,
    genres: profile.genres.map((mg) => mg.genre),
    experienceYears: profile.experienceYears,
    location: profile.location,
    profileImage: profile.profileImage ?? undefined,
    bannerImage: profile.bannerImage ?? undefined,
    socialLinks: (profile.socialLinks as SocialLinks) ?? {},
    availability: (profile.availabilitySlots ?? []).map((slot) => ({
      id: slot.id,
      startDate: slot.startDate.toISOString(),
      endDate: slot.endDate.toISOString(),
    })),
    instruments: profile.instruments,
    subgenres: profile.subgenres,
    influences: profile.influences,
    favorites: profile.favorites,
    performanceFee: profile.performanceFee,
    hourlyFee: profile.hourlyFee,
    dayFee: profile.dayFee,
    credentials: (profile.credentials ?? []).map((c) => ({
      id: c.id,
      type: c.type,
      title: c.title,
      issuer: c.issuer,
      year: c.year ?? undefined,
    })),
    rating: profile.rating,
    weightedRating: computeWeightedRating(profile.rating, profile.reviewCount),
    reviewCount: profile.reviewCount,
    discography: profile.albums.map(serializeAlbum),
    primaryCategory: profile.primaryCategory,
    createdAt: profile.createdAt.toISOString(),
  };
}

function serializeAlbum(album: Prisma.AlbumGetPayload<{ include: { tracks: true } }>): Album {
  return {
    id: album.id,
    title: album.title,
    coverArt: album.coverArt ?? undefined,
    releaseYear: album.releaseYear,
    source: album.source,
    externalUrl: album.externalUrl ?? undefined,
    tracks: album.tracks.map(serializeTrack),
  };
}

function serializeTrack(track: Prisma.TrackGetPayload<object>): Track {
  return {
    id: track.id,
    title: track.title,
    duration: track.duration,
    trackNumber: track.trackNumber,
    previewUrl: track.previewUrl ?? undefined,
    genre: track.genre ?? undefined,
  };
}
