"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal, X, Shuffle, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArtistCard } from "@/components/artists/artist-card";
import { GENRES, CREATIVE_CATEGORIES } from "@/config";
import type { MusicianProfile } from "@/types";

interface ArtistDirectoryProps {
  artists: MusicianProfile[];
}

export function ArtistDirectory({ artists: initialArtists }: ArtistDirectoryProps) {
  const [query, setQuery] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [minRating, setMinRating] = useState("");
  const [experienceMin, setExperienceMin] = useState("");
  const [hasCredentials, setHasCredentials] = useState(false);
  const [availableOn, setAvailableOn] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [blindScout, setBlindScout] = useState(false);
  const [artists, setArtists] = useState(initialArtists);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [instrument, setInstrument] = useState("");
  const [subgenre, setSubgenre] = useState("");
  const [maxFee, setMaxFee] = useState("");
  const [sortBy, setSortBy] = useState("rating");
  const [credentialType, setCredentialType] = useState("");

  const activeFilterCount =
    selectedGenres.length +
    selectedCategories.length +
    (location ? 1 : 0) +
    (minRating ? 1 : 0) +
    (experienceMin ? 1 : 0) +
    (hasCredentials ? 1 : 0) +
    (availableOn ? 1 : 0) + (instrument ? 1 : 0) + (subgenre ? 1 : 0) + (maxFee ? 1 : 0) + (credentialType ? 1 : 0);

  const toggleGenre = (slug: string) => {
    setSelectedGenres((prev) => (prev.includes(slug) ? prev.filter((g) => g !== slug) : [...prev, slug]));
  };

  const toggleCategory = (slug: string) => {
    setSelectedCategories((prev) => (prev.includes(slug) ? prev.filter((c) => c !== slug) : [...prev, slug]));
  };

  function clearAll() {
    setSelectedGenres([]);
    setSelectedCategories([]);
    setLocation("");
    setMinRating("");
    setExperienceMin("");
    setHasCredentials(false);
    setAvailableOn("");
    setInstrument("");
    setSubgenre("");
    setMaxFee("");
    setCredentialType("");
  }

  const searchKey = useMemo(
    () =>
      JSON.stringify({
        query,
        selectedGenres,
        selectedCategories,
        location,
        minRating,
        experienceMin,
        hasCredentials,
        availableOn,
        blindScout,
        instrument, subgenre, maxFee, sortBy, credentialType,
      }),
    [query, selectedGenres, selectedCategories, location, minRating, experienceMin, hasCredentials, availableOn, blindScout, instrument, subgenre, maxFee, sortBy, credentialType]
  );

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    selectedGenres.forEach((g) => params.append("genre", g));
    selectedCategories.forEach((c) => params.append("category", c));
    if (location) params.set("location", location);
    if (!blindScout && minRating) params.set("minRating", minRating);
    if (experienceMin) params.set("experienceMin", experienceMin);
    if (hasCredentials) params.set("hasCredentials", "true");
    if (availableOn) params.set("availableOn", availableOn);
    if (instrument) params.set("instrument", instrument);
    if (subgenre) params.set("subgenre", subgenre);
    if (maxFee) params.set("maxFee", maxFee);
    if (credentialType) params.set("credentialType", credentialType);
    params.set("sortBy", blindScout ? "blind_scout" : sortBy);

    Promise.resolve().then(() => {
      setIsLoading(true);
      setSearchError(false);
      return fetch(`/api/musicians?${params.toString()}`, { signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error("Search failed");
          return res.json();
        })
        .then((json) => {
          if (!json.success) throw new Error("Search failed");
          setArtists(json.data);
        })
        .catch(() => {
          if (!controller.signal.aborted) setSearchError(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsLoading(false);
        });
    });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey]);

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <Input
            placeholder="Search by name, instrument, or location..."
            aria-label="Search creatives by name, instrument, or location"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 border-transparent bg-page/40 pl-10 shadow-none"
          />
        </div>
        <Button variant="outline" className="h-12 px-5" aria-expanded={showFilters} aria-controls="artist-filters" onClick={() => setShowFilters(!showFilters)}>
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Filters
          {activeFilterCount > 0 && <Badge className="ml-2" variant="default">{activeFilterCount}</Badge>}
        </Button>
      </div>

      <div className="mb-6 flex flex-col items-start gap-3 rounded-2xl border border-brand/20 bg-brand-soft/50 p-4 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => setBlindScout((v) => !v)}
          aria-pressed={blindScout}
          className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${
            blindScout ? "border-olive-500 bg-olive-600 text-white" : "border-stone-200 bg-surface text-stone-600 hover:border-stone-300"
          }`}
        >
          <Shuffle className="h-3.5 w-3.5" />
          Blind Scout mode
        </button>
        <div className="flex items-start gap-2 text-xs leading-5 text-muted">
          <Info className="h-3.5 w-3.5 shrink-0" />
          Lead with the work, not the numbers. Blind Scout ranks by genre fit and portfolio, with a daily rotation instead of review-based sorting.
        </div>
      </div>

      {showFilters && (
        <div id="artist-filters" className="mb-8 space-y-5 rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-stone-700">Filters</span>
            {activeFilterCount > 0 && (
              <button className="text-xs text-olive-600 hover:underline" onClick={clearAll}>
                Clear all
              </button>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-stone-500">Genre</p>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((genre) => (
                <button
                  key={genre.slug}
                  aria-pressed={selectedGenres.includes(genre.slug)}
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

          <div>
            <p className="mb-2 text-xs font-medium text-stone-500">Category / Role</p>
            <div className="flex flex-wrap gap-2">
              {CREATIVE_CATEGORIES.map((category) => (
                <button
                  key={category.slug}
                  aria-pressed={selectedCategories.includes(category.slug)}
                  onClick={() => toggleCategory(category.slug)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    selectedCategories.includes(category.slug)
                      ? "border-olive-500 bg-olive-100 text-olive-700"
                      : "border-stone-200 text-stone-600 hover:border-stone-300"
                  }`}
                >
                  {category.name}
                  {selectedCategories.includes(category.slug) && <X className="ml-1 inline h-3 w-3" />}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="artist-location" className="mb-2 block text-xs font-medium text-muted">Location</label>
              <Input id="artist-location" placeholder="City or region" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div>
              <label htmlFor="artist-rating" className="mb-2 block text-xs font-medium text-muted">Min weighted rating (out of 10)</label>
              <Input
                id="artist-rating"
                type="number"
                min={0}
                max={10}
                step={0.5}
                placeholder={blindScout ? "Disabled in Blind Scout mode" : "e.g. 7"}
                value={minRating}
                onChange={(e) => setMinRating(e.target.value)}
                disabled={blindScout}
              />
            </div>
            <div>
              <label htmlFor="artist-experience" className="mb-2 block text-xs font-medium text-muted">Min years of experience</label>
              <Input
                id="artist-experience"
                type="number"
                min={0}
                placeholder="e.g. 3"
                value={experienceMin}
                onChange={(e) => setExperienceMin(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="artist-availability" className="mb-2 block text-xs font-medium text-muted">Available on</label>
              <Input id="artist-availability" type="date" value={availableOn} onChange={(e) => setAvailableOn(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div><label htmlFor="artist-instrument" className="mb-2 block text-xs font-medium text-muted">Instrument</label><Input id="artist-instrument" value={instrument} onChange={(event) => setInstrument(event.target.value)} placeholder="e.g. guitar" /></div>
            <div><label htmlFor="artist-subgenre" className="mb-2 block text-xs font-medium text-muted">Subgenre</label><Input id="artist-subgenre" value={subgenre} onChange={(event) => setSubgenre(event.target.value)} placeholder="e.g. dream pop" /></div>
            <div><label htmlFor="artist-max-fee" className="mb-2 block text-xs font-medium text-muted">Max performance fee (EUR)</label><Input id="artist-max-fee" type="number" min={0} value={maxFee} onChange={(event) => setMaxFee(event.target.value)} placeholder="e.g. 500" /></div>
          </div>
          <label className="flex items-center gap-2 text-sm text-stone-600">
            <input
              type="checkbox"
              checked={hasCredentials}
              onChange={(e) => setHasCredentials(e.target.checked)}
              className="rounded border-stone-300"
            />
            Has listed credentials (degree, certificate, or license)
          </label>
          <div><label htmlFor="artist-credential-type" className="mb-2 block text-xs font-medium text-muted">Specific credential</label><select id="artist-credential-type" value={credentialType} onChange={(event) => setCredentialType(event.target.value)} className="h-10 rounded-lg border border-line bg-surface px-3 text-sm"><option value="">Any credential type</option><option value="degree">Degree</option><option value="certificate">Certificate</option><option value="license">License</option><option value="award">Award</option></select></div>
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" role="status">
          {isLoading ? "Finding your creative fit…" : `${artists.length} creative ${artists.length === 1 ? "connection" : "connections"} to explore`}
        </p>
        {(activeFilterCount > 0 || query) && <button type="button" onClick={() => { clearAll(); setQuery(""); }} className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"><X className="h-3.5 w-3.5" />Clear search & filters</button>}
        {!blindScout && <label className="flex items-center gap-2 text-xs text-muted">Sort by<select aria-label="Sort creatives" value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="rounded-lg border border-line bg-surface px-3 py-2"><option value="rating">Weighted rating</option><option value="experience">Experience</option><option value="newest">Newest</option><option value="name">Name</option></select></label>}
      </div>
      {searchError && <p role="alert" className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">Search couldn&apos;t refresh. The results below may be out of date. Try changing a filter or refreshing the page.</p>}

      {artists.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {artists.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} blindScout={blindScout} />
          ))}
        </div>
      ) : (
        <div className="empty-state py-16">
          <Search className="mx-auto h-10 w-10 text-brand/60" />
          <h3 className="mt-4 text-lg font-semibold text-ink">Your next connection is still out there</h3>
          <p className="mt-2 text-sm text-muted">Try a broader genre, a nearby location, or fewer filters.</p>
          <Button variant="outline" className="mt-5" onClick={() => { clearAll(); setQuery(""); }}>Reset search</Button>
        </div>
      )}
    </>
  );
}
