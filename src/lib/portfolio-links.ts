/** Client-safe: portfolio link fields, grouped by the kind of work an artist does. */

export type PortfolioKind = "music" | "film";

export const LINK_FIELDS = {
  spotify: { label: "Spotify", placeholder: "Spotify artist URL" },
  bandcamp: { label: "Bandcamp", placeholder: "https://yourname.bandcamp.com" },
  soundcloud: { label: "SoundCloud", placeholder: "SoundCloud profile URL" },
  appleMusic: { label: "Apple Music", placeholder: "Apple Music artist URL" },
  youtube: { label: "YouTube", placeholder: "YouTube channel or video URL" },
  productionAssets: { label: "Assets & stems folder", placeholder: "Dropbox or Google Drive link" },
  instagram: { label: "Instagram", placeholder: "@yourname" },
  website: { label: "Website / portfolio", placeholder: "https://your-site.com" },
  linktree: { label: "Linktree", placeholder: "https://linktr.ee/yourname" },
  vimeo: { label: "Vimeo", placeholder: "Vimeo reel or profile URL" },
  frameio: { label: "Frame.io", placeholder: "Frame.io review link" },
  reviewFiles: { label: "Review files folder", placeholder: "Dropbox or Google Drive link" },
  letterboxd: { label: "Letterboxd", placeholder: "Letterboxd profile URL" },
  imdb: { label: "IMDb", placeholder: "IMDb profile URL" },
  twitter: { label: "X / Twitter", placeholder: "@yourname" },
  facebook: { label: "Facebook", placeholder: "Facebook page URL" },
  tiktok: { label: "TikTok", placeholder: "@yourname" },
} as const;

export type LinkKey = keyof typeof LINK_FIELDS;
export const LINK_KEYS = Object.keys(LINK_FIELDS) as LinkKey[];

export interface LinkSection { title: string; hint: string; keys: LinkKey[] }

export const PORTFOLIO_SECTIONS: Record<PortfolioKind, LinkSection[]> = {
  music: [
    { title: "Featured stream / audio", hint: "Spotify, Bandcamp, SoundCloud, Apple Music, YouTube (live sessions)", keys: ["spotify", "bandcamp", "soundcloud", "appleMusic", "youtube"] },
    { title: "Production assets & stems", hint: "Dropbox or Google Drive link (.wav, .mp3, multitracks)", keys: ["productionAssets"] },
    { title: "Social & web", hint: "Instagram, personal site or Linktree", keys: ["instagram", "website", "linktree"] },
  ],
  film: [
    { title: "Featured reel / work", hint: "Vimeo, YouTube", keys: ["vimeo", "youtube"] },
    { title: "Review & production files", hint: "Frame.io, or a Dropbox / Google Drive link (.mp4, dailies, screeners)", keys: ["frameio", "reviewFiles"] },
    { title: "Credits & social", hint: "Letterboxd, IMDb, Instagram, personal site / portfolio", keys: ["letterboxd", "imdb", "instagram", "website"] },
  ],
};

const FILM_GROUPS = new Set(["film-audiovisual-crew", "visual-artists-creative-design"]);
const MUSIC_GROUP = "music-audio-production";

/** Which link sets an artist sees, from the category groups they've picked (music when they haven't picked any). */
export function portfolioKindsFor(groupSlugs: string[]): PortfolioKind[] {
  const kinds: PortfolioKind[] = [];
  if (groupSlugs.includes(MUSIC_GROUP) || !groupSlugs.some((slug) => FILM_GROUPS.has(slug))) kinds.push("music");
  if (groupSlugs.some((slug) => FILM_GROUPS.has(slug))) kinds.push("film");
  return kinds;
}

/** Sections for the given kinds, with repeated fields (e.g. Instagram) shown once. */
export function sectionsFor(kinds: PortfolioKind[]): LinkSection[] {
  const seen = new Set<LinkKey>();
  return kinds.flatMap((kind) => PORTFOLIO_SECTIONS[kind]).map((section) => ({
    ...section,
    keys: section.keys.filter((key) => (seen.has(key) ? false : (seen.add(key), true))),
  })).filter((section) => section.keys.length > 0);
}

const HANDLE_URLS: Partial<Record<LinkKey, string>> = { instagram: "https://instagram.com/", twitter: "https://x.com/", tiktok: "https://www.tiktok.com/@" };

/** Turns what an artist typed into a safe https link, or "" when there's nothing usable. */
export function normalizeLink(key: string, raw: string | undefined | null): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  const handleBase = HANDLE_URLS[key as LinkKey];
  if (handleBase && /^@?[\w.]+$/.test(value)) return `${handleBase}${value.replace(/^@/, "")}`;
  const withProtocol = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withProtocol);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}
