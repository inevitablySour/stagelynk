import { gunzipSync } from "node:zlib";
import type { CatalogCandidate, EquipmentGroupKey } from "@/lib/equipment-catalog/groups";

// Shopify Standard Product Taxonomy (MIT): https://github.com/Shopify/product-taxonomy
export const SHOPIFY_TAXONOMY_URL =
  "https://github.com/Shopify/product-taxonomy/releases/latest/download/categories.en.json.gz";

interface ShopifyNode {
  id: string;
  name: string;
  full_name: string;
  level: number;
  parent_id: string | null;
  children: { id: string; name: string }[];
}

interface ShopifyTaxonomy {
  version: string;
  verticals: { name: string; categories: ShopifyNode[] }[];
}

/**
 * A branch of the taxonomy to offer. `depth` controls granularity: 0 makes
 * the node itself one item; 1 makes each child an item (deeper descendants
 * fold into it); 2 makes grandchildren items with their parent as the
 * category heading. Paths (not IDs) keep this readable; if Shopify renames a
 * configured path the sync fails loudly instead of silently dropping gear.
 */
interface BranchSpec {
  path: string;
  depth: 0 | 1 | 2;
  group: EquipmentGroupKey;
  category?: string;
  exclude?: string[];
}

const HOBBIES = "Arts & Entertainment > Hobbies & Creative Arts";
const INSTRUMENTS = `${HOBBIES} > Musical Instruments`;
const INSTRUMENT_ACC = `${HOBBIES} > Musical Instrument & Orchestra Accessories`;
const AUDIO = "Electronics > Audio";
const STAGE = `${AUDIO} > Stage Equipment`;
const VIDEO = "Electronics > Video";
const CAMERA_ACC = "Cameras & Optics > Camera & Optic Accessories";
const CAMERA_PARTS = `${CAMERA_ACC} > Camera Parts & Accessories`;
const EFFECTS = "Arts & Entertainment > Party & Celebration > Special Effects";
const ACCESSORIES = "Electronics > Electronics Accessories";

const leaf = (group: EquipmentGroupKey, category: string, ...paths: string[]): BranchSpec[] =>
  paths.map((path) => ({ path, depth: 0, group, category }));

export const SHOPIFY_BRANCHES: BranchSpec[] = [
  {
    path: INSTRUMENTS, depth: 2, group: "instruments",
    exclude: [`${INSTRUMENTS} > Woodwinds > Train Whistles`, `${INSTRUMENTS} > Woodwinds > Flutophones`, `${INSTRUMENTS} > Percussion > Hand Percussion`],
  },
  { path: `${INSTRUMENTS} > Percussion > Hand Percussion`, depth: 1, group: "instruments", category: "Hand Percussion", exclude: [`${INSTRUMENTS} > Percussion > Hand Percussion > Hand Drums`] },
  { path: `${INSTRUMENTS} > Percussion > Hand Percussion > Hand Drums`, depth: 1, group: "instruments", category: "Hand Percussion" },

  { path: `${INSTRUMENT_ACC} > Musical Instrument Amplifiers`, depth: 1, group: "backline", category: "Amplifiers" },
  {
    path: `${INSTRUMENT_ACC} > Musical Instrument Amplifier Accessories`, depth: 1, group: "backline", category: "Amplifiers",
    exclude: ["Knobs", "Tubes", "Covers & Cases"].map((n) => `${INSTRUMENT_ACC} > Musical Instrument Amplifier Accessories > Musical Instrument Amplifier ${n}`),
  },
  { path: `${INSTRUMENT_ACC} > Percussion Accessories > Drum Kit Hardware`, depth: 1, group: "backline", category: "Drum hardware" },
  ...leaf("backline", "Drum hardware", `${INSTRUMENT_ACC} > Percussion Accessories > Electronic Drum Modules`, `${INSTRUMENT_ACC} > Percussion Accessories > Percussion Stands`),
  ...leaf("backline", "Stands & pedals",
    `${INSTRUMENT_ACC} > Musical Keyboard Accessories > Musical Keyboard Stands`,
    `${INSTRUMENT_ACC} > Musical Keyboard Accessories > Sustain Pedals`,
    `${INSTRUMENT_ACC} > String Instrument Accessories > Guitar Accessories > Guitar Stands`,
    `${INSTRUMENT_ACC} > Music Stands`,
    `${INSTRUMENT_ACC} > Music Benches & Stools`),
  ...leaf("backline", "Tuners & timing", `${INSTRUMENT_ACC} > Electronic Tuners`, `${INSTRUMENT_ACC} > Metronomes`),

  {
    path: `${AUDIO} > Audio Components`, depth: 2, group: "live-sound", category: "Core audio",
    exclude: ["Audio & Video Receivers", "Audio Transmitters", "Speakers", "Signal Processors > Phono Preamps"].map((n) => `${AUDIO} > Audio Components > ${n}`),
  },
  ...leaf("live-sound", "Speakers & PA", `${AUDIO} > Audio Components > Speakers`, `${AUDIO} > Audio Components > Speakers > Subwoofers`, `${AUDIO} > Public Address Systems`),
  ...leaf("live-sound", "Stage audio", `${STAGE} > In-Ear Monitor Systems`, `${STAGE} > Stage Monitors`, `${STAGE} > Stage Snakes`, `${STAGE} > Wireless Receivers`, `${STAGE} > Wireless Transmitters`),
  ...leaf("live-sound", "Mic & speaker stands", `${AUDIO} > Audio Accessories > Microphone Accessories`, `${AUDIO} > Audio Accessories > Microphone Stands`, `${AUDIO} > Audio Accessories > Speaker Accessories > Speaker Stands & Mounts`),
  ...leaf("live-sound", "Recorders", `${AUDIO} > Audio Players & Recorders > Multitrack Recorders`, `${AUDIO} > Audio Players & Recorders > Voice Recorders`),

  { path: `${AUDIO} > DJ & Specialty Audio`, depth: 1, group: "dj", category: "DJ gear" },
  ...leaf("dj", "DJ gear", `${AUDIO} > Audio Players & Recorders > Turntables & Record Players`),

  { path: EFFECTS, depth: 2, group: "lighting", category: "Stage effects", exclude: [`${EFFECTS} > Disco Balls`] },
  { path: "Cameras & Optics > Photography > Lighting & Studio", depth: 1, group: "lighting", category: "Studio lighting", exclude: ["Cameras & Optics > Photography > Lighting & Studio > Light Meter Accessories"] },

  ...leaf("staging", "Stage & rigging", `${STAGE} > Stage Decks & Platforms`, `${STAGE} > Scrims, Skirts & Facades`, `${STAGE} > Trusses & Rigging Hardware`, `${STAGE} > Stage Floor Pockets & Boxes`),

  { path: `${VIDEO} > Video Editing Hardware & Production Equipment`, depth: 1, group: "video", category: "Production & switching" },
  ...leaf("video", "Production & switching", `${VIDEO} > Video Servers`, `${ACCESSORIES} > Computer Components > I/O Cards & Adapters > Video Cards & Adapters > Video Capture Cards`),
  { path: `${VIDEO} > Video Transmitters`, depth: 1, group: "video", category: "Signal transport", exclude: [`${VIDEO} > Video Transmitters > FPV Video Transmitters`] },
  ...leaf("video", "Signal transport", `${ACCESSORIES} > Audio & Video Splitters & Switches > HDMI Splitters & Switches`, `${ACCESSORIES} > Audio & Video Splitters & Switches > SDI Splitters & Switches`),
  ...leaf("video", "Projection",
    `${VIDEO} > Projectors > Multimedia Projectors`,
    `${VIDEO} > Video Accessories > Projector Accessories > Projection Screens`,
    `${VIDEO} > Video Accessories > Projector Accessories > Projection Screen Stands`,
    `${VIDEO} > Video Accessories > Projector Accessories > Projector Mounts`),
  ...leaf("video", "Displays", `${VIDEO} > Video Wall Displays & Packages`, `${VIDEO} > Computer Monitors`, `${VIDEO} > Video Accessories > Teleprompters`),

  { path: "Cameras & Optics > Cameras > Digital Cameras", depth: 1, group: "cameras", category: "Cameras" },
  { path: "Cameras & Optics > Cameras > Video Cameras", depth: 1, group: "cameras", category: "Cameras", exclude: ["Cameras & Optics > Cameras > Video Cameras > Dash Video Cameras"] },
  ...leaf("cameras", "Cameras", "Cameras & Optics > Cameras > Film Cameras", "Cameras & Optics > Cameras > Webcams"),
  { path: `${CAMERA_ACC} > Camera & Video Camera Lenses`, depth: 1, group: "cameras", category: "Lenses", exclude: [`${CAMERA_ACC} > Camera & Video Camera Lenses > Surveillance Camera Lenses`] },
  ...leaf("cameras", "Lenses", `${CAMERA_ACC} > Camera Lens Accessories > Lens Filters`),
  ...leaf("cameras", "Camera support", `${CAMERA_ACC} > Tripods & Monopods`, `${CAMERA_ACC} > Tripod & Monopod Accessories > Tripod & Monopod Heads`, `${CAMERA_PARTS} > Camera Stabilizers & Supports`),
  ...leaf("cameras", "Camera accessories",
    `${CAMERA_PARTS} > On-Camera Monitors`, `${CAMERA_PARTS} > Video Camera Lights`, `${CAMERA_PARTS} > Camera Flashes`,
    `${CAMERA_PARTS} > Camera Focus Devices`, `${CAMERA_PARTS} > Camera Remote Controls`, `${CAMERA_PARTS} > Camera Silencers & Sound Blimps`),

  { path: `${ACCESSORIES} > Cables > Audio & Video Cables`, depth: 1, group: "cabling", category: "Cables" },
  ...leaf("cabling", "Cables", `${ACCESSORIES} > Adapters > Audio & Video Cable Adapters & Couplers`),
  ...leaf("cabling", "Power", `${ACCESSORIES} > Power > Power Strips & Surge Suppressors`, "Hardware > Power & Electrical Supplies > Extension Cords", "Hardware > Power & Electrical Supplies > Generators"),

  {
    path: "Software > Computer Software > Multimedia & Design Software", depth: 1, group: "software", category: "Software types",
    exclude: ["Home & Interior Design Software", "Home Publishing Software", "Media Viewing Software"].map((n) => `Software > Computer Software > Multimedia & Design Software > ${n}`),
  },
];

export class CatalogValidationError extends Error {}

const ID_PATTERN = /^gid:\/\/shopify\/TaxonomyCategory\/[a-z]{2}(-\d+)+$/;

export function shopifySlug(externalId: string) {
  return `shopify-${externalId.split("/").pop()}`;
}

/** Pure selection over a parsed taxonomy, so it can be tested offline. */
export function selectShopifyCandidates(taxonomy: ShopifyTaxonomy): CatalogCandidate[] {
  if (!/^\d{4}-\d{2}/.test(taxonomy.version ?? "")) throw new CatalogValidationError(`Unexpected taxonomy version "${taxonomy.version}".`);
  if (!Array.isArray(taxonomy.verticals) || taxonomy.verticals.length < 20) throw new CatalogValidationError("Taxonomy has too few top-level verticals; the download looks incomplete.");

  const byId = new Map<string, ShopifyNode>();
  const byPath = new Map<string, ShopifyNode>();
  for (const vertical of taxonomy.verticals) {
    for (const node of vertical.categories ?? []) {
      byId.set(node.id, node);
      byPath.set(node.full_name, node);
    }
  }
  if (byId.size < 5000) throw new CatalogValidationError(`Only ${byId.size} categories parsed; expected thousands.`);

  const missing = SHOPIFY_BRANCHES.flatMap((b) => [b.path, ...(b.exclude ?? [])]).filter((p) => !byPath.has(p));
  if (missing.length) throw new CatalogValidationError(`Configured taxonomy paths no longer exist (Shopify may have renamed them): ${missing.join("; ")}`);

  const out = new Map<string, CatalogCandidate>();
  const emit = (node: ShopifyNode, branch: BranchSpec, category: string) => {
    if (out.has(node.id)) return;
    out.set(node.id, {
      externalId: node.id,
      name: node.name,
      slug: shopifySlug(node.id),
      group: branch.group,
      category,
      kind: branch.group === "software" ? "software" : "hardware",
      path: node.full_name,
      description: null,
    });
  };

  for (const branch of SHOPIFY_BRANCHES) {
    const root = byPath.get(branch.path)!;
    const excluded = new Set((branch.exclude ?? []).map((p) => byPath.get(p)!.id));
    const walk = (node: ShopifyNode, rel: number) => {
      if (excluded.has(node.id)) return;
      const children = node.children.map((c) => byId.get(c.id)).filter((c): c is ShopifyNode => Boolean(c));
      if (rel === branch.depth || (rel > 0 && children.length === 0)) {
        const parentName = byId.get(node.parent_id ?? "")?.name ?? root.name;
        const category = rel <= 1 ? branch.category ?? (rel === 0 ? parentName : root.name) : parentName;
        emit(node, branch, category);
        return;
      }
      children.forEach((child) => walk(child, rel + 1));
    };
    walk(root, 0);
  }

  const candidates = [...out.values()];
  if (candidates.length < 100 || candidates.length > 2000) throw new CatalogValidationError(`Selection produced ${candidates.length} items; expected 100–2000.`);
  for (const c of candidates) {
    if (!ID_PATTERN.test(c.externalId)) throw new CatalogValidationError(`Malformed category ID "${c.externalId}".`);
    if (!c.name.trim() || c.name.length > 120) throw new CatalogValidationError(`Malformed category name for ${c.externalId}.`);
  }
  return candidates;
}

export async function fetchShopifyCandidates(): Promise<{ version: string; candidates: CatalogCandidate[] }> {
  const response = await fetch(SHOPIFY_TAXONOMY_URL, { signal: AbortSignal.timeout(60_000), redirect: "follow" });
  if (!response.ok) throw new CatalogValidationError(`Shopify taxonomy download failed (HTTP ${response.status}).`);
  const compressed = Buffer.from(await response.arrayBuffer());
  if (compressed.length < 500_000) throw new CatalogValidationError(`Download is only ${compressed.length} bytes; expected a multi-megabyte file.`);

  let taxonomy: ShopifyTaxonomy;
  try {
    taxonomy = JSON.parse(gunzipSync(compressed).toString("utf8"));
  } catch {
    throw new CatalogValidationError("Downloaded taxonomy could not be decompressed or parsed as JSON.");
  }
  return { version: taxonomy.version, candidates: selectShopifyCandidates(taxonomy) };
}
