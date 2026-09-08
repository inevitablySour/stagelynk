import Link from "next/link";
import { MapPin, Clock, Calendar, ExternalLink, Play, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/common/star-rating";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { getInitials } from "@/lib/utils";
import type { Album, Review } from "@/types";

// Mock data for this profile
const artist = {
  id: "1", stageName: "Nova Eclipse", bio: "Electronic music producer blending ambient textures with driving beats. With 8 years of experience performing at festivals, clubs, and private events across Europe, Nova Eclipse delivers immersive audio-visual experiences that captivate audiences.\n\nSpecializing in live electronic sets with hardware synthesizers and custom visuals, every performance is unique.", genres: [{ id: "7", name: "Electronic", slug: "electronic" }, { id: "14", name: "Indie", slug: "indie" }, { id: "2", name: "Pop", slug: "pop" }], experienceYears: 8, location: "London, UK", rating: 4.8, reviewCount: 42,
  socialLinks: { spotify: "https://spotify.com", instagram: "https://instagram.com", website: "https://example.com" },
};

const mockAlbums: Album[] = [
  {
    id: "a1", title: "Midnight Frequencies", coverArt: undefined, releaseYear: 2024, source: "spotify", externalUrl: "https://open.spotify.com",
    tracks: [
      { id: "t1", title: "Neon Drift", duration: 245, trackNumber: 1, previewUrl: "#", genre: "Electronic" },
      { id: "t2", title: "Lost Signal", duration: 312, trackNumber: 2, previewUrl: "#", genre: "Electronic" },
      { id: "t3", title: "Binary Sunset", duration: 198, trackNumber: 3, previewUrl: "#", genre: "Ambient" },
    ],
  },
  {
    id: "a2", title: "Dawn Patterns", coverArt: undefined, releaseYear: 2023, source: "manual",
    tracks: [
      { id: "t4", title: "First Light", duration: 267, trackNumber: 1, genre: "Indie Electronic" },
      { id: "t5", title: "Paper Waves", duration: 224, trackNumber: 2, genre: "Indie Electronic" },
    ],
  },
];

const mockReviews: Review[] = [
  { id: "r1", bookingId: "b1", reviewerId: "v1", musicianId: "1", rating: 5, comment: "Incredible set — the crowd was electric from start to finish. Nova read the room perfectly and kept the energy building all night. Will definitely book again!", createdAt: "2024-11-15", reviewer: { name: "Sarah Mitchell", venueName: "The Warehouse Club" } },
  { id: "r2", bookingId: "b2", reviewerId: "v2", musicianId: "1", rating: 4, comment: "Great performance with professional setup. Sound quality was excellent. Slight delay on arrival but made up for it with an extended set.", createdAt: "2024-10-02", reviewer: { name: "James Cooper", venueName: "Rooftop Bar London" } },
];

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ArtistProfilePage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        {/* Banner */}
        <div className="h-48 sm:h-64 bg-gradient-to-br from-olive-600 via-copper-600 to-copper-500" />

        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Profile header */}
          <div className="relative -mt-16 mb-8 flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="h-28 w-28 rounded-full border-4 border-sand-50 bg-olive-100 flex items-center justify-center text-olive-700 font-bold text-3xl shadow-lg">
              {getInitials(artist.stageName)}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-stone-900">{artist.stageName}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-stone-500">
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{artist.location}</span>
                <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{artist.experienceYears} years experience</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {artist.genres.map((g) => (
                  <Badge key={g.id} variant="secondary">{g.name}</Badge>
                ))}
              </div>
              <div className="mt-2">
                <StarRating rating={artist.rating} showValue reviewCount={artist.reviewCount} />
              </div>
            </div>
            <Button size="lg" asChild>
              <Link href="#book">
                <Calendar className="mr-2 h-4 w-4" />
                Book this creative
              </Link>
            </Button>
          </div>

          <div className="grid gap-8 lg:grid-cols-3 pb-16">
            {/* Left column (2/3) */}
            <div className="lg:col-span-2 space-y-8">
              {/* Bio */}
              <Card>
                <CardHeader><CardTitle>About</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-stone-600 whitespace-pre-line">{artist.bio}</p>
                </CardContent>
              </Card>

              {/* Discography */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Music2 className="h-5 w-5" />
                    Discography
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {mockAlbums.map((album) => (
                    <div key={album.id}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-olive-400 to-copper-400 flex items-center justify-center text-white shrink-0">
                          <Music2 className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-stone-900">{album.title}</h4>
                          <div className="flex items-center gap-2 text-xs text-stone-500">
                            <span>{album.releaseYear}</span>
                            <span>·</span>
                            <span>{album.tracks.length} tracks</span>
                            <Badge variant={album.source === "spotify" ? "default" : album.source === "apple_music" ? "secondary" : "outline"} className="text-[10px]">
                              {album.source === "spotify" ? "Spotify" : album.source === "apple_music" ? "Apple Music" : "Uploaded"}
                            </Badge>
                          </div>
                        </div>
                        {album.externalUrl && (
                          <a href={album.externalUrl} target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-olive-600">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                      <div className="rounded-lg border border-stone-100 divide-y divide-stone-100">
                        {album.tracks.map((track) => (
                          <div key={track.id} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-sand-100">
                            <span className="w-6 text-center text-xs text-stone-400">{track.trackNumber}</span>
                            {track.previewUrl ? (
                              <button className="text-olive-600 hover:text-olive-800"><Play className="h-3.5 w-3.5" /></button>
                            ) : (
                              <span className="w-3.5" />
                            )}
                            <span className="flex-1 text-stone-700">{track.title}</span>
                            {track.genre && <span className="text-xs text-stone-400 hidden sm:block">{track.genre}</span>}
                            <span className="text-xs text-stone-400">{formatDuration(track.duration)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Reviews */}
              <Card>
                <CardHeader><CardTitle>Reviews ({mockReviews.length})</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  {mockReviews.map((review) => (
                    <div key={review.id} className="border-b border-stone-100 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-medium text-sm text-stone-900">{review.reviewer?.name}</span>
                          {review.reviewer?.venueName && (
                            <span className="text-xs text-stone-400 ml-2">— {review.reviewer.venueName}</span>
                          )}
                        </div>
                        <StarRating rating={review.rating} size="sm" />
                      </div>
                      <p className="text-sm text-stone-600">{review.comment}</p>
                      <span className="mt-1 block text-xs text-stone-400">{new Date(review.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Right sidebar (1/3) */}
            <div className="space-y-6">
              {/* Booking CTA */}
              <Card id="book" className="border-olive-200">
                <CardHeader>
                  <CardTitle>Book {artist.stageName}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-stone-500">Send a booking request with your project details. They&apos;ll respond within 48 hours.</p>
                  <Button className="w-full" asChild>
                    <Link href="/register">Request Booking</Link>
                  </Button>
                  <p className="text-xs text-center text-stone-400">Sign in or create an account to book · 5% platform fee applies</p>
                </CardContent>
              </Card>

              {/* Quick info */}
              <Card>
                <CardHeader><CardTitle>Quick Info</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Rating</span>
                    <span className="font-medium">{artist.rating} / 5</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Projects completed</span>
                    <span className="font-medium">{artist.reviewCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Experience</span>
                    <span className="font-medium">{artist.experienceYears} years</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Location</span>
                    <span className="font-medium">{artist.location}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Social links */}
              <Card>
                <CardHeader><CardTitle>Links</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(artist.socialLinks).map(([key, url]) => (
                    url && (
                      <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-olive-600 hover:underline capitalize">
                        <ExternalLink className="h-3.5 w-3.5" />
                        {key}
                      </a>
                    )
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
