// Client-safe: imported by the picker UI as well as the sync code.
export const EQUIPMENT_GROUPS = [
  { key: "instruments", label: "Instruments", kind: "hardware" },
  { key: "backline", label: "Amps & backline", kind: "hardware" },
  { key: "live-sound", label: "Audio & live sound", kind: "hardware" },
  { key: "dj", label: "DJ gear", kind: "hardware" },
  { key: "lighting", label: "Lighting & stage FX", kind: "hardware" },
  { key: "staging", label: "Staging & venue", kind: "hardware" },
  { key: "video", label: "Video & projection", kind: "hardware" },
  { key: "cameras", label: "Cameras & lenses", kind: "hardware" },
  { key: "cabling", label: "Cables & power", kind: "hardware" },
  { key: "software", label: "Creative software", kind: "software" },
  { key: "other", label: "Other", kind: "hardware" },
] as const;

export type EquipmentGroupKey = (typeof EQUIPMENT_GROUPS)[number]["key"];

export const EQUIPMENT_GROUP_KEYS = EQUIPMENT_GROUPS.map((g) => g.key) as EquipmentGroupKey[];

export function equipmentGroupLabel(key: string) {
  return EQUIPMENT_GROUPS.find((g) => g.key === key)?.label ?? "Other";
}

/** Wikidata software classes synced as named products, mapped to picker categories. */
export const WIKIDATA_SOFTWARE_CLASSES = [
  { qid: "Q1060750", category: "Music production (DAWs)" },
  { qid: "Q758870", category: "Audio editing" },
  { qid: "Q64601", category: "Notation & scoring" },
  { qid: "Q1373429", category: "Video editing" },
  { qid: "Q5156780", category: "Compositing & VFX" },
  { qid: "Q2351962", category: "Photo & image editing" },
  { qid: "Q1155404", category: "Vector & UI design" },
  { qid: "Q229371", category: "3D & animation" },
] as const;

export const WIKIDATA_SOFTWARE_CATEGORIES: string[] = WIKIDATA_SOFTWARE_CLASSES.map((c) => c.category);

export interface CatalogCandidate {
  externalId: string;
  name: string;
  slug: string;
  group: EquipmentGroupKey;
  category: string;
  kind: "hardware" | "software";
  path: string;
  description: string | null;
}
