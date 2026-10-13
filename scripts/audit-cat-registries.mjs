import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const auditedAt = "2026-10-13";

const registrySources = {
  cfa: "https://cfa.org/breeds/",
  tica: "https://tica.org/ticas-breeds/browse-all-breeds/",
  fife: "https://fifeweb.org/cats/breeds/",
  gccf: "https://www.gccfcats.org/breeding-cats/new-to-breeding/registration-policies/gems-codes/"
};

const cfaBreeds = [
  "Abyssinian", "American Bobtail", "American Curl", "American Shorthair", "American Wirehair",
  "Balinese", "Bengal", "Birman", "Bombay", "British Shorthair", "Burmese", "Burmilla",
  "Chartreux", "Colorpoint Shorthair", "Cornish Rex", "Devon Rex", "Egyptian Mau",
  "European Burmese", "Exotic", "Havana Brown", "Japanese Bobtail", "Khao Manee", "Korat",
  "LaPerm", "Lykoi", "Maine Coon", "Manx", "Norwegian Forest Cat", "Ocicat", "Oriental",
  "Persian", "RagaMuffin", "Ragdoll", "Russian Blue", "Scottish Fold", "Selkirk Rex",
  "Siamese", "Siberian", "Singapura", "Somali", "Sphynx", "Tonkinese", "Toybob",
  "Turkish Angora", "Turkish Van"
];

const cfaProvisional = new Set(["Khao Manee"]);
const ticaAdvancedNewBreeds = new Set(["Serengeti", "Toybob"]);

const gccfBreeds = [
  ["EXO", "Exotic Shorthair", 1], ["PER", "Persian", 1],
  ["MCO", "Maine Coon", 2], ["NEB", "Nebelung", 2], ["NFO", "Norwegian Forest Cat", 2],
  ["RAG", "Ragdoll", 2], ["RGM", "RagaMuffin", 2], ["SBI", "Birman", 2],
  ["SIB", "Siberian", 2], ["SOL", "Somali", 2], ["SOS", "Somali", 2],
  ["TUV", "Turkish Van", 2], ["BLH", "British Longhair", 3], ["BSH", "British Shorthair", 3],
  ["CHA", "Chartreux", 3], ["MAN", "Manx", 3], ["SRL", "Selkirk Rex Longhair", 3],
  ["SRS", "Selkirk Rex", 3], ["ABY", "Abyssinian", 4], ["BEN", "Bengal", 4],
  ["CRX", "Cornish Rex", 4], ["DRX", "Devon Rex", 4], ["KOR", "Korat", 4],
  ["LPL", "LaPerm Longhair", 4], ["LPS", "LaPerm", 4], ["LYL", "Lykoi Longhair", 4],
  ["LYS", "Lykoi", 4], ["MAU", "Egyptian Mau", 4], ["OCI", "Ocicat", 4],
  ["RUS", "Russian Blue", 4], ["SIN", "Singapura", 4], ["SNO", "Snowshoe", 4],
  ["SOK", "Sokoke", 4], ["SPH", "Sphynx", 4], ["TAI", "Thai", 4],
  ["TOY", "Toyger", 4], ["ALH", "Asian Longhair", 5], ["ASH", "Asian Shorthair", 5],
  ["AUM", "Australian Mist", 5], ["BUR", "Burmese", 5], ["SUF", "Suffolk", 5],
  ["TOS", "Tonkinese", 5], ["BAL", "Balinese", 6], ["OLH", "Oriental Longhair", 6],
  ["OSH", "Oriental Shorthair", 6], ["SIA", "Siamese", 6]
];

const ticaBreeds = [
  "Abyssinian", "American Bobtail", "American Bobtail Shorthair", "American Curl",
  "American Curl Longhair", "American Shorthair", "American Wirehair", "Australian Mist",
  "Balinese", "Bengal", "Bengal Longhair", "Birman", "Bombay", "British Longhair",
  "British Shorthair", "Burmese", "Burmilla", "Burmilla Longhair", "Chartreux", "Chausie",
  "Cherubim", "Cornish Rex", "Cymric", "Cymric Tailed", "Devon Rex", "Donskoy", "Egyptian Mau",
  "Exotic Shorthair", "Havana", "Highlander", "Highlander Shorthair", "Himalayan",
  "Japanese Bobtail", "Japanese Bobtail Longhair", "Khaomanee", "Korat", "Kurilian Bobtail",
  "Kurilian Bobtail Longhair", "LaPerm", "LaPerm Shorthair", "Lykoi", "Maine Coon",
  "Maine Coon Polydactyl", "Manx", "Manx Tailed", "Minuet", "Minuet Longhair", "Minuet Talls",
  "Minuet Talls Longhair", "Munchkin", "Munchkin Longhair", "Nebelung", "Norwegian Forest",
  "Ocicat", "Oriental Longhair", "Oriental Shorthair", "Persian", "Peterbald", "Pixiebob",
  "Pixiebob Longhair", "Ragdoll", "Russian Blue", "Savannah", "Scottish Fold",
  "Scottish Fold Longhair", "Scottish Straight", "Scottish Straight Longhair", "Selkirk Rex",
  "Selkirk Rex Longhair", "Serengeti", "Siamese", "Siberian", "Singapura", "Snowshoe", "Somali",
  "Sphynx", "Tennessee Rex", "Thai", "Tonkinese", "Toybob", "Toyger", "Turkish Angora",
  "Turkish Van"
];

function decodeHtml(value) {
  const named = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: '"' };
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&([a-z]+);/gi, (entity, name) => named[name.toLowerCase()] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
}

async function get(url) {
  const response = await fetch(url, { headers: { "user-agent": "breed-reference-registry-audit/1.0" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.text();
}

async function fetchFife() {
  const html = await get(registrySources.fife);
  const preliminaryOffset = html.lastIndexOf("Preliminary Recognised Breeds and Varieties");
  const records = [];
  let category;
  for (const match of html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>|<h3[^>]*>([\s\S]*?)<\/h3>/g)) {
    if (match[1]) {
      const parsedCategory = decodeHtml(match[1]).match(/Category\s+(\d)/i)?.[1];
      if (parsedCategory) category = `category-${parsedCategory}`;
      continue;
    }
    const heading = decodeHtml(match[2]);
    const parsed = heading.match(/^([A-Z]{3})\s*[–-]\s*(.+)$/);
    if (!parsed) continue;
    const [, registryId, name] = parsed;
    if (name.startsWith("House Cat") || name.startsWith("Charcoal") || name.startsWith("Golden")) continue;
    records.push({
      name,
      registryId,
      status: match.index >= preliminaryOffset ? "preliminary" : "recognized",
      classification: category
    });
  }
  return records;
}

const fifeBreeds = await fetchFife();
const registries = {
  cfa: {
    source: registrySources.cfa,
    count: cfaBreeds.length,
    note: "Current CFA recognized-breed index, transcribed as a dated snapshot.",
    breeds: cfaBreeds.map((name) => ({
      name,
      registryId: name,
      status: cfaProvisional.has(name) ? "provisional" : "recognized",
      classification: cfaProvisional.has(name) ? "provisional" : "championship"
    }))
  },
  tica: {
    source: registrySources.tica,
    count: ticaBreeds.length,
    note: "Current public browse entries, including separately displayed coat and tail variants.",
    breeds: ticaBreeds.map((name) => ({
      name,
      registryId: name,
      status: ticaAdvancedNewBreeds.has(name) ? "advanced-new-breed" : "recognized",
      classification: ticaAdvancedNewBreeds.has(name) ? "advanced-new-breed" : "championship"
    }))
  },
  fife: {
    source: registrySources.fife,
    count: fifeBreeds.length,
    breeds: fifeBreeds
  },
  gccf: {
    source: registrySources.gccf,
    count: gccfBreeds.length,
    note: "GCCF GEMS codes mapped to the six official show sections; coat-length codes can resolve to one canonical breed.",
    breeds: gccfBreeds.map(([registryId, name, section]) => ({
      name,
      registryId,
      status: "recognized",
      classification: `section-${section}`
    }))
  }
};

const outputPath = path.join(root, "research", "registry-snapshots", `cat-registries-${auditedAt}.json`);
await writeFile(outputPath, `${JSON.stringify({ auditedAt, registries }, null, 2)}\n`);

for (const [key, registry] of Object.entries(registries)) {
  console.log(`${key}: ${registry.count}${registry.breeds.length ? ` (${registry.breeds.length} captured entries)` : ""}`);
}
