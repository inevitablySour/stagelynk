"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, X, MapPin, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StarRating } from "@/components/common/star-rating";
import { CREATIVE_CATEGORIES } from "@/config";
import { getInitials } from "@/lib/utils";
import type { MusicianProfile } from "@/types";

export function VenueTalentSearch({ talent }: { talent: MusicianProfile[] }) {
  const [query, setQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const toggleCategory = (name: string) => {
    setSelectedCategories((prev) => (prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]));
  };

  const filtered = talent.filter((t) => {
    const matchesQuery =
      !query || t.stageName.toLowerCase().includes(query.toLowerCase()) || t.location.toLowerCase().includes(query.toLowerCase());
    const matchesCat = selectedCategories.length === 0 || selectedCategories.includes(t.primaryCategory ?? "");
    return matchesQuery && matchesCat;
  });

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <Input placeholder="Search by name or location..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" />
        </div>
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Filters
          {selectedCategories.length > 0 && <Badge className="ml-2" variant="default">{selectedCategories.length}</Badge>}
        </Button>
      </div>

      {showFilters && (
        <div className="mb-6 rounded-xl border border-stone-200 bg-sand-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-stone-700">Creative Categories</span>
            {selectedCategories.length > 0 && (
              <button className="text-xs text-olive-600 hover:underline" onClick={() => setSelectedCategories([])}>
                Clear all
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {CREATIVE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  selectedCategories.includes(cat.id)
                    ? "border-olive-500 bg-olive-100 text-olive-700"
                    : "border-stone-200 text-stone-600 hover:border-stone-300"
                }`}
              >
                {cat.name}
                {selectedCategories.includes(cat.id) && <X className="ml-1 inline h-3 w-3" />}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mb-4 text-sm text-stone-500">Showing {filtered.length} creative{filtered.length !== 1 ? "s" : ""}</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((t) => (
          <Link key={t.id} href={`/artists/${t.id}`}>
            <Card className="group hover:shadow-lg hover:-translate-y-1 transition-all h-full">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-12 w-12 rounded-full bg-olive-100 flex items-center justify-center text-olive-700 font-bold text-sm">
                    {getInitials(t.stageName)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-stone-900 group-hover:text-olive-600 truncate">{t.stageName}</h3>
                    <p className="text-xs text-stone-500">
                      {CREATIVE_CATEGORIES.find((c) => c.id === t.primaryCategory)?.name ?? "Creative"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-stone-500 mb-2">
                  {t.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{t.location}</span>}
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{t.experienceYears}yr</span>
                </div>
                <StarRating rating={t.rating} size="sm" showValue reviewCount={t.reviewCount} />
                <div className="mt-2 flex flex-wrap gap-1">
                  {t.genres.map((g) => <Badge key={g.id} variant="secondary" className="text-[10px]">{g.name}</Badge>)}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-16 text-stone-400">
          <Search className="mx-auto h-10 w-10 mb-3" />
          <p>No talent found. Try adjusting your search or filters.</p>
        </div>
      )}
    </>
  );
}
