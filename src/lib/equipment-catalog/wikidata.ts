import { CatalogValidationError } from "@/lib/equipment-catalog/shopify";
import { WIKIDATA_SOFTWARE_CLASSES, type CatalogCandidate } from "@/lib/equipment-catalog/groups";

// Wikimedia asks automated clients to identify themselves; this names the
// app, not a person.
const USER_AGENT = "IndieCentral-EquipmentCatalog/1.0 (https://www.indiecentral.eu)";
const SPARQL_URL = "https://query.wikidata.org/sparql";
const API_URL = "https://www.wikidata.org/w/api.php";
const MIN_SITELINKS = 3;
const PER_CLASS_LIMIT = 300;

const QID = /^Q\d+$/;

export function wikidataSlug(qid: string) {
  return `wd-${qid.toLowerCase()}`;
}

function candidate(qid: string, name: string, description: string | null, category: string): CatalogCandidate {
  return { externalId: qid, name, slug: wikidataSlug(qid), group: "software", category, kind: "software", path: `Wikidata › ${category}`, description };
}

interface SparqlBinding {
  item: { value: string };
  itemLabel?: { value: string };
  itemDescription?: { value: string };
}

async function runSparql(query: string): Promise<SparqlBinding[]> {
  const url = `${SPARQL_URL}?${new URLSearchParams({ query, format: "json" })}`;
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/sparql-results+json" },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new CatalogValidationError(`Wikidata query failed (HTTP ${response.status}).`);
  let json: { results?: { bindings?: SparqlBinding[] } };
  try {
    json = await response.json();
  } catch {
    throw new CatalogValidationError("Wikidata returned a response that isn't valid JSON.");
  }
  if (!Array.isArray(json.results?.bindings)) throw new CatalogValidationError("Wikidata response is missing results.");
  return json.results.bindings;
}

/**
 * Named, still-maintained software in each class. Excludes items Wikidata
 * marks dissolved (P576) or discontinued (P2669), and obscure ones with few
 * Wikipedia articles. Labels fall back to "mul" because Wikidata now stores
 * many product names as language-neutral labels.
 */
export async function fetchWikidataCandidates(): Promise<{ version: string; candidates: CatalogCandidate[] }> {
  const out = new Map<string, CatalogCandidate>();
  for (const { qid, category } of WIKIDATA_SOFTWARE_CLASSES) {
    const bindings = await runSparql(`
      SELECT DISTINCT ?item ?itemLabel ?itemDescription ?links WHERE {
        ?item wdt:P31 wd:${qid} .
        ?item wikibase:sitelinks ?links .
        FILTER(?links >= ${MIN_SITELINKS})
        FILTER NOT EXISTS { ?item wdt:P576 [] }
        FILTER NOT EXISTS { ?item wdt:P2669 [] }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en,mul". }
      } ORDER BY DESC(?links) LIMIT ${PER_CLASS_LIMIT}`);
    for (const b of bindings) {
      const id = b.item.value.split("/").pop() ?? "";
      if (!QID.test(id)) throw new CatalogValidationError(`Unexpected Wikidata identifier "${b.item.value}".`);
      const label = b.itemLabel?.value?.trim() ?? "";
      if (!label || QID.test(label) || label.length > 120) continue; // no usable name yet
      if (!out.has(id)) out.set(id, candidate(id, label, b.itemDescription?.value ?? null, category));
    }
  }
  const candidates = [...out.values()];
  if (candidates.length < 30) throw new CatalogValidationError(`Wikidata returned only ${candidates.length} products; the queries may be broken.`);
  return { version: new Date().toISOString().slice(0, 10), candidates };
}

export interface WikidataSearchResult {
  qid: string;
  label: string;
  description: string | null;
}

export async function searchWikidata(query: string): Promise<WikidataSearchResult[]> {
  const params = new URLSearchParams({ action: "wbsearchentities", search: query, language: "en", uselang: "en", type: "item", limit: "10", format: "json" });
  const response = await fetch(`${API_URL}?${params}`, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Wikidata search failed (HTTP ${response.status}).`);
  const json = (await response.json()) as { search?: { id: string; label?: string; description?: string }[] };
  return (json.search ?? [])
    .filter((r) => QID.test(r.id) && r.label)
    .map((r) => ({ qid: r.id, label: r.label!, description: r.description ?? null }));
}

/** Resolves a single entity for a one-off admin import. */
export async function fetchWikidataEntity(qid: string): Promise<WikidataSearchResult> {
  if (!QID.test(qid)) throw new CatalogValidationError("Not a Wikidata item ID.");
  const params = new URLSearchParams({ action: "wbgetentities", ids: qid, props: "labels|descriptions", languages: "en|mul", format: "json" });
  const response = await fetch(`${API_URL}?${params}`, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Wikidata lookup failed (HTTP ${response.status}).`);
  const json = (await response.json()) as {
    entities?: Record<string, { missing?: string; labels?: Record<string, { value: string }>; descriptions?: Record<string, { value: string }> }>;
  };
  const entity = json.entities?.[qid];
  const label = entity?.labels?.en?.value ?? entity?.labels?.mul?.value;
  if (!entity || entity.missing !== undefined || !label) throw new CatalogValidationError(`Wikidata item ${qid} not found or has no name.`);
  return { qid, label, description: entity.descriptions?.en?.value ?? entity.descriptions?.mul?.value ?? null };
}

export function wikidataCandidateFor(result: WikidataSearchResult, category: string): CatalogCandidate {
  return candidate(result.qid, result.label, result.description, category);
}
