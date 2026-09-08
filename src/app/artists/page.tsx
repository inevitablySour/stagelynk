"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ArtistCard } from "@/components/artists/artist-card";
import { GENRES } from "@/config";
import type { MusicianProfile } from "@/types";

// ── Mock data ────────────────────────────────────────────────
const MOCK_ARTISTS: MusicianProfile[] = [
  {
    id: "1", userId: "u1", stageName: "Nova Eclipse", bio: "Electronic music producer blending ambient textures with driving beats.", genres: [{ id: "7", name: "Electronic", slug: "electronic" }, { id: "14", name: "Indie", slug: "indie" }], experienceYears: 8, location: "London, UK", profileImage: undefined, bannerImage: undefined, socialLinks: {}, availability: [], rating: 4.8, reviewCount: 42, discography: [], createdAt: "2024-01-01",
  },
  {
    id: "2", userId: "u2", stageName: "The Velvet Tongues", bio: "High-energy funk and soul band.", genres: [{ id: "16", name: "Funk", slug: "funk" }, { id: "15", name: "Soul", slug: "soul" }, { id: "6", name: "R&B", slug: "rnb" }], experienceYears: 12, location: "Atlanta, GA", profileImage: undefined, bannerImage: undefined, socialLinks: {}, availability: [], rating: 4.9, reviewCount: 87, discography: [], createdAt: "2023-06-15",
  },
  {
    id: "3", userId: "u3", stageName: "Maya Chen", bio: "Jazz vocalist and pianist.", genres: [{ id: "3", name: "Jazz", slug: "jazz" }, { id: "4", name: "Blues", slug: "blues" }], experienceYears: 15, location: "New York, NY", profileImage: undefined, bannerImage: undefined, socialLinks: {}, availability: [], rating: 5.0, reviewCount: 124, discography: [], createdAt: "2022-11-20",
  },
  {
    id: "4", userId: "u4", stageName: "Riot Signal", bio: "Punk rock trio from Manchester.", genres: [{ id: "19", name: "Punk", slug: "punk" }, { id: "1", name: "Rock", slug: "rock" }], experienceYears: 5, location: "Manchester, UK", profileImage: undefined, bannerImage: undefined, socialLinks: {}, availability: [], rating: 4.5, reviewCount: 28, discography: [], createdAt: "2024-03-10",
  },
  {
    id: "5", userId: "u5", stageName: "Ayo Bello", bio: "Afrobeats artist bringing Lagos vibes worldwide.", genres: [{ id: "17", name: "Afrobeats", slug: "afrobeats" }, { id: "2", name: "Pop", slug: "pop" }], experienceYears: 6, location: "Lagos, Nigeria", profileImage: undefined, bannerImage: undefined, socialLinks: {}, availability: [], rating: 4.7, reviewCount: 53, discography: [], createdAt: "2023-09-05",
  },
  {
    id: "6", userId: "u6", stageName: "Sierra Winds", bio: "Acoustic folk duo weaving stories through harmony.", genres: [{ id: "12", name: "Folk", slug: "folk" }, { id: "20", name: "Acoustic", slug: "acoustic" }], experienceYears: 10, location: "Nashville, TN", profileImage: undefined, bannerImage: undefined, socialLinks: {}, availability: [], rating: 4.6, reviewCount: 35, discography: [], createdAt: "2023-04-01",
  },
];

export default function ArtistsPage() {
  const [query, setQuery] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const toggleGenre = (slug: string) => {
    setSelectedGenres((prev) =>
      prev.includes(slug) ? prev.filter((g) => g !== slug) : [...prev, slug]
    );
  };

  const filtered = MOCK_ARTISTS.filter((a) => {
    const matchesQuery =
      !query ||
      a.stageName.toLowerCase().includes(query.toLowerCase()) ||
      a.location.toLowerCase().includes(query.toLowerCase());
    const matchesGenre =
      selectedGenres.length === 0 ||
      a.genres.some((g) => selectedGenres.includes(g.slug));
    return matchesQuery && matchesGenre;
  });

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-stone-900">Discover Talent</h1>
            <p className="mt-2 text-stone-500">Browse creative professionals available for booking — musicians, voice actors, animators, actors, and more.</p>
          </div>

          {/* Search & Filter bar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <Input
                placeholder="Search by name or location..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filters
              {selectedGenres.length > 0 && (
                <Badge className="ml-2" variant="default">{selectedGenres.length}</Badge>
              )}
            </Button>
          </div>

          {/* Genre filter chips */}
          {showFilters && (
            <div className="mb-8 rounded-xl border border-stone-200 bg-sand-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-stone-700">Genres</span>
                {selectedGenres.length > 0 && (
                  <button
                    className="text-xs text-olive-600 hover:underline"
                    onClick={() => setSelectedGenres([])}
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {GENRES.map((genre) => (
                  <button
                    key={genre.slug}
                    onClick={() => toggleGenre(genre.slug)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      selectedGenres.includes(genre.slug)
                        ? "border-olive-500 bg-olive-100 text-olive-700"
                        : "border-stone-200 text-stone-600 hover:border-stone-300"
                    }`}
                  >
                    {genre.name}
                    {selectedGenres.includes(genre.slug) && <X className="ml-1 inline h-3 w-3" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results count */}
          <p className="mb-6 text-sm text-stone-500">
            Showing {filtered.length} creative{filtered.length !== 1 ? "s" : ""}
          </p>

          {/* Artist grid */}
          {filtered.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((artist) => (
                <ArtistCard key={artist.id} artist={artist} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search className="h-12 w-12 text-stone-300" />
              <h3 className="mt-4 text-lg font-semibold text-stone-700">No talent found</h3>
              <p className="mt-1 text-sm text-stone-500">Try adjusting your search or filters.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
