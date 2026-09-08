"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, X, MapPin, Clock } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StarRating } from "@/components/common/star-rating";
import { DASHBOARD_NAV_VENUE, CREATIVE_CATEGORIES } from "@/config";
import { getInitials } from "@/lib/utils";
import Link from "next/link";

const MOCK_TALENT = [
  { id: "1", stageName: "Nova Eclipse", category: "Musician / Band", location: "London, UK", experienceYears: 8, rating: 4.8, reviewCount: 42, genres: ["Electronic", "Indie"] },
  { id: "2", stageName: "The Velvet Tongues", category: "Musician / Band", location: "Atlanta, GA", experienceYears: 12, rating: 4.9, reviewCount: 87, genres: ["Funk", "Soul"] },
  { id: "3", stageName: "Alex Morgan", category: "Voice Actor", location: "Los Angeles, CA", experienceYears: 6, rating: 4.7, reviewCount: 31, genres: ["Commercial", "Animation"] },
  { id: "4", stageName: "Studio Ghibli Fan VA", category: "Voice Actor", location: "Remote", experienceYears: 3, rating: 4.5, reviewCount: 12, genres: ["Anime", "Narration"] },
  { id: "5", stageName: "Maya Chen", category: "Musician / Band", location: "New York, NY", experienceYears: 15, rating: 5.0, reviewCount: 124, genres: ["Jazz", "Blues"] },
  { id: "6", stageName: "Riot Signal", category: "Musician / Band", location: "Manchester, UK", experienceYears: 5, rating: 4.5, reviewCount: 28, genres: ["Punk", "Rock"] },
  { id: "7", stageName: "Lena Park", category: "Animator", location: "Seoul / Remote", experienceYears: 7, rating: 4.9, reviewCount: 19, genres: ["2D Animation", "Motion Graphics"] },
  { id: "8", stageName: "James Okafor", category: "Actor / Performer", location: "London, UK", experienceYears: 10, rating: 4.6, reviewCount: 35, genres: ["Theatre", "Film"] },
];

export default function VenueSearchPage() {
  const [query, setQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const toggleCategory = (name: string) => {
    setSelectedCategories((prev) => prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]);
  };

  const filtered = MOCK_TALENT.filter((t) => {
    const matchesQuery = !query || t.stageName.toLowerCase().includes(query.toLowerCase()) || t.location.toLowerCase().includes(query.toLowerCase());
    const matchesCat = selectedCategories.length === 0 || selectedCategories.includes(t.category);
    return matchesQuery && matchesCat;
  });

  return (
    <div className="flex min-h-screen bg-sand-100">
      <Sidebar role="venue" navItems={DASHBOARD_NAV_VENUE} />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6"><h1 className="text-2xl font-bold text-stone-900">Find Talent</h1><p className="text-stone-500 mt-1">Search for creative professionals to book for your next project.</p></div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-6">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" /><Input placeholder="Search by name or location..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" /></div>
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal className="mr-2 h-4 w-4" />Filters{selectedCategories.length > 0 && <Badge className="ml-2" variant="default">{selectedCategories.length}</Badge>}</Button>
          </div>

          {showFilters && (
            <div className="mb-6 rounded-xl border border-stone-200 bg-sand-100 p-4">
              <div className="flex items-center justify-between mb-3"><span className="text-sm font-medium text-stone-700">Creative Categories</span>{selectedCategories.length > 0 && <button className="text-xs text-olive-600 hover:underline" onClick={() => setSelectedCategories([])}>Clear all</button>}</div>
              <div className="flex flex-wrap gap-2">
                {CREATIVE_CATEGORIES.map((cat) => (
                  <button key={cat.id} onClick={() => toggleCategory(cat.name)} className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${selectedCategories.includes(cat.name) ? "border-olive-500 bg-olive-100 text-olive-700" : "border-stone-200 text-stone-600 hover:border-stone-300"}`}>
                    {cat.name}{selectedCategories.includes(cat.name) && <X className="ml-1 inline h-3 w-3" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="mb-4 text-sm text-stone-500">Showing {filtered.length} creative{filtered.length !== 1 ? "s" : ""}</p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((talent) => (
              <Link key={talent.id} href={`/artists/${talent.id}`}>
                <Card className="group hover:shadow-lg hover:-translate-y-1 transition-all h-full">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-12 w-12 rounded-full bg-olive-100 flex items-center justify-center text-olive-700 font-bold text-sm">{getInitials(talent.stageName)}</div>
                      <div className="min-w-0"><h3 className="font-semibold text-stone-900 group-hover:text-olive-600 truncate">{talent.stageName}</h3><p className="text-xs text-stone-500">{talent.category}</p></div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-stone-500 mb-2">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{talent.location}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{talent.experienceYears}yr</span>
                    </div>
                    <StarRating rating={talent.rating} size="sm" showValue reviewCount={talent.reviewCount} />
                    <div className="mt-2 flex flex-wrap gap-1">{talent.genres.map((g) => <Badge key={g} variant="secondary" className="text-[10px]">{g}</Badge>)}</div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          {filtered.length === 0 && <div className="text-center py-16 text-stone-400"><Search className="mx-auto h-10 w-10 mb-3" /><p>No talent found. Try adjusting your search or filters.</p></div>}
        </div>
      </main>
    </div>
  );
}
