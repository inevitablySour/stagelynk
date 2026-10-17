import type { MusicianProfile } from "@/types";

/**
 * Deterministic per-day rotation seed so the same "random" order holds for
 * all viewers across a single day, then reshuffles the next day — an open
 * rotation model so emerging artists with no reviews aren't permanently
 * stuck at the bottom of every single search a venue runs.
 */
export function dailyRotationSeed(id: string): number {
  const dayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  let hash = 0;
  const input = `${dayKey}:${id}`;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Blind Scout ranking: deliberately ignores rating/reviewCount (the "mere
 * social metrics" the spec warns bias against new/emerging artists) and
 * instead favors genre-fit against the active search filters, portfolio
 * presence (raw samples — having actual discography uploaded), and a daily
 * rotation so no single artist is permanently stuck at the bottom.
 */
export function rankBlindScout(artists: MusicianProfile[], activeGenreSlugs: string[]): MusicianProfile[] {
  return [...artists]
    .map((artist) => {
      const genreMatchCount = activeGenreSlugs.length
        ? artist.genres.filter((g) => activeGenreSlugs.includes(g.slug)).length
        : 0;
      const hasPortfolio = artist.discography.some((album) => album.tracks.some((track) => Boolean(track.previewUrl))) ? 1 : 0;
      const rotation = dailyRotationSeed(artist.id) % 1000;

      return { artist, genreMatchCount, hasPortfolio, rotation };
    })
    .sort((a, b) => {
      if (a.genreMatchCount !== b.genreMatchCount) return b.genreMatchCount - a.genreMatchCount;
      if (a.hasPortfolio !== b.hasPortfolio) return b.hasPortfolio - a.hasPortfolio;
      return a.rotation - b.rotation;
    })
    .map((entry) => entry.artist);
}
