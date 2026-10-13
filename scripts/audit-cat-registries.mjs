import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const auditedAt = "2026-10-13";

const registrySources = {
  cfa: "https://cfa.org/breeds/",
  tica: "https://tica.org/ticas-breeds/browse-all-breeds/",
  fife: "https://fifeweb.org/cats/breeds/",
  gccf: "https://www.gccfcats.org/breeding-cats/stats-and-policies/"
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
  for (const match of html.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/g)) {
    const heading = decodeHtml(match[1]);
    const parsed = heading.match(/^([A-Z]{3})\s*[–-]\s*(.+)$/);
    if (!parsed) continue;
    const [, registryId, name] = parsed;
    if (name.startsWith("House Cat") || name.startsWith("Charcoal") || name.startsWith("Golden")) continue;
    records.push({
      name,
      registryId,
      status: match.index >= preliminaryOffset ? "preliminary" : "recognized"
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
    breeds: cfaBreeds.map((name) => ({ name, registryId: name, status: "recognized" }))
  },
  tica: {
    source: registrySources.tica,
    count: ticaBreeds.length,
    note: "Current public browse entries, including separately displayed coat and tail variants.",
    breeds: ticaBreeds.map((name) => ({ name, registryId: name, status: "listed" }))
  },
  fife: {
    source: registrySources.fife,
    count: fifeBreeds.length,
    breeds: fifeBreeds
  },
  gccf: {
    source: registrySources.gccf,
    count: 40,
    note: "GCCF reports 40 recognized breeds; used as a supplementary count check because its public page does not expose a stable breed-name index.",
    breeds: []
  }
};

const outputPath = path.join(root, "research", "registry-snapshots", `cat-registries-${auditedAt}.json`);
await writeFile(outputPath, `${JSON.stringify({ auditedAt, registries }, null, 2)}\n`);

for (const [key, registry] of Object.entries(registries)) {
  console.log(`${key}: ${registry.count}${registry.breeds.length ? ` (${registry.breeds.length} captured entries)` : ""}`);
}
