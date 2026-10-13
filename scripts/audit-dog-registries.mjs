import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const auditedAt = "2026-10-13";

const registrySources = {
  akc: "https://www.akc.org/dog-breeds/",
  ukc: "https://www.ukcdogs.com/breed-standards",
  ckc: "https://www.ckc.ca/en/Choosing-a-Dog/Choosing-a-Breed/All-Dogs",
  abkc: "https://abkcdogs.net/breed2/",
  fci: "https://www.fci.be/en/Nomenclature/Default.aspx",
  dogsAustralia: "https://www.dogsaustralia.org.au/BrowseBreed/browse-a-breed/"
};

function decodeHtml(value) {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"'
  };
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&([a-z]+);/gi, (entity, name) => named[name.toLowerCase()] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
}

function unique(records, key = "name") {
  const seen = new Set();
  return records.filter((record) => {
    if (seen.has(record[key])) return false;
    seen.add(record[key]);
    return true;
  });
}

async function get(url, allowNotFound = false) {
  const response = await fetch(url, {
    headers: { "user-agent": "breed-reference-registry-audit/1.0" }
  });
  if (allowNotFound && response.status === 404) return null;
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.text();
}

async function fetchAkc() {
  const records = [];
  const groups = [
    ["sporting", "recognized"],
    ["hound", "recognized"],
    ["working", "recognized"],
    ["terrier", "recognized"],
    ["toy", "recognized"],
    ["non-sporting", "recognized"],
    ["herding", "recognized"],
    ["miscellaneous-class", "miscellaneous"],
    ["foundation-stock-service", "foundation-stock-service"]
  ];
  for (const [group, status] of groups) {
    for (let page = 1; page <= 30; page += 1) {
      const url = `https://www.akc.org/dog-breeds/${group}/${page === 1 ? "" : `page/${page}/`}`;
      const html = await get(url, true);
      if (html === null) break;
      const pageRecords = [...html.matchAll(/data-title="([^"]+)"[\s\S]*?data-id="(\d+)"/g)]
        .map((match) => ({ name: decodeHtml(match[1]), registryId: match[2], status, classification: group }));
      if (pageRecords.length === 0) break;
      const before = records.length;
      for (const record of pageRecords) records.push(record);
      if (unique(records, "registryId").length === unique(records.slice(0, before), "registryId").length) break;
    }
  }
  return unique(records, "registryId");
}

async function fetchUkc() {
  const html = await get(registrySources.ukc);
  const select = html.match(/<select[^>]+id="breed-select"[\s\S]*?<\/select>/)?.[0]
    ?? html.match(/<select[^>]*>[\s\S]*?<optgroup label="Companion Dog">[\s\S]*?<\/select>/)?.[0];
  if (!select) throw new Error("Unable to locate the UKC breed selector");
  const records = [];
  let status = "recognized";
  let classification = "";
  const tokenPattern = /<optgroup label="([^"]+)"|<option value="([^"]*)"[^>]*>([^<]*)<\/option>/g;
  for (const match of select.matchAll(tokenPattern)) {
    if (match[1]) {
      status = match[1].includes("Bloodlines Listing Service") ? "listed" : "recognized";
      classification = decodeHtml(match[1]);
      continue;
    }
    if (!match[2] || !match[3]) continue;
    records.push({ name: decodeHtml(match[3]), registryId: match[2], status, classification });
  }
  return unique(records, "registryId");
}

async function fetchCkc() {
  const html = await get(registrySources.ckc);
  const records = [];
  const pattern = /<h3 class="breedListing">\s*<a[^>]+href="(\/en\/Choosing-a-Dog\/Choosing-a-Breed\/[^"#?]+)"[^>]*>([^<]+)<\/a>\s*<\/h3>/g;
  for (const match of html.matchAll(pattern)) {
    const name = decodeHtml(match[2]);
    const segments = match[1].split("/");
    records.push({
      name,
      registryId: segments.at(-1),
      status: "recognized",
      classification: segments.at(-2)
    });
  }
  return unique(records, "registryId");
}

async function fetchAbkc() {
  const html = await get(registrySources.abkc);
  const records = [];
  const pattern = /<a href="https:\/\/abkcdogs\.net\/breeds\/([^"/]+)\/"[^>]*>([^<]+)<\/a>/g;
  for (const match of html.matchAll(pattern)) {
    records.push({ name: decodeHtml(match[2]), registryId: match[1], status: "recognized" });
  }
  return unique(records, "registryId");
}

async function fetchDogsAustralia() {
  const records = [];
  const pattern = /openDetailBrowseAllBreed\((\d+),[\s\S]*?<span class="dog-breed-name">([\s\S]*?)<\/span>/g;
  for (let group = 1; group <= 7; group += 1) {
    for (let page = 1; page <= 30; page += 1) {
      const url = `https://www.dogsaustralia.org.au/Frontend/BrowseBreed?Search.ItemsPerPage=40&Search.GroupID=${group}&page=${page}`;
      const html = await get(url);
      const pageRecords = [...html.matchAll(pattern)].map((match) => ({
        name: decodeHtml(match[2]),
        registryId: match[1],
        status: "recognized",
        classification: `group-${group}`
      }));
      if (pageRecords.length === 0) break;
      records.push(...pageRecords);
    }
  }
  return unique(records, "registryId");
}

function parseFciRecords(html, status, classification) {
  const records = [];
  const pattern = /<a[^>]+class="nom"[^>]+href="[^"]+-(\d+)\.html"[^>]*>([\s\S]*?)<\/a>/g;
  for (const match of html.matchAll(pattern)) {
    const rawName = decodeHtml(match[2]);
    const numberMarker = `(${match[1]})`;
    const [nativeName, translatedName = ""] = rawName.split(numberMarker);
    const trimmedTranslation = translatedName.trim();
    const name = trimmedTranslation.startsWith("(") && trimmedTranslation.endsWith(")")
      ? trimmedTranslation.slice(1, -1).trim()
      : nativeName.trim();
    records.push({ name, rawName, registryId: match[1], status, ...(classification ? { classification } : {}) });
  }
  return records;
}

async function fetchFci() {
  const index = await get(registrySources.fci);
  const groupPaths = unique(
    [...index.matchAll(/href="(\/en\/nomenclature\/\d+-[^"#]+\.html)"/g)].map((match) => ({ path: match[1] })),
    "path"
  );
  const groups = await Promise.all(groupPaths.map(async ({ path: groupPath }) => {
    const group = groupPath.match(/^\/en\/nomenclature\/(\d+)-/)?.[1];
    return parseFciRecords(await get(`https://www.fci.be${groupPath}`), "definitive", `group-${group}`);
  }));
  const definitive = groups.flat();
  const provisional = parseFciRecords(index, "provisional");
  return unique([...definitive, ...provisional], "registryId");
}

const entries = await Promise.all([
  fetchAkc(),
  fetchUkc(),
  fetchCkc(),
  fetchAbkc(),
  fetchFci(),
  fetchDogsAustralia()
]);

const registries = Object.fromEntries(
  Object.keys(registrySources).map((key, index) => [
    key,
    {
      source: registrySources[key],
      count: entries[index].length,
      breeds: entries[index].sort((left, right) => left.name.localeCompare(right.name, "en"))
    }
  ])
);

const output = { auditedAt, registries };
const outputPath = path.join(root, "research", "registry-snapshots", `dog-registries-${auditedAt}.json`);
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);

for (const [key, registry] of Object.entries(registries)) {
  const statuses = Object.groupBy(registry.breeds, (breed) => breed.status);
  const summary = Object.entries(statuses).map(([status, breeds]) => `${breeds.length} ${status}`).join(", ");
  console.log(`${key}: ${registry.count} (${summary})`);
}
