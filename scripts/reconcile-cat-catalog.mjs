import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const snapshot = JSON.parse(
  await readFile(path.join(root, "research", "registry-snapshots", "cat-registries-2026-10-13.json"), "utf8")
);
const currentDocument = JSON.parse(await readFile(path.join(root, "species", "cat", "breeds.json"), "utf8"));

function normalize(value) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugify(value) {
  return normalize(value).replaceAll(" ", "-");
}

const overrides = new Map(Object.entries({
  "asian longhair": "asian",
  "asian shorthair": "asian",
  "american bobtail shorthair": "american-bobtail",
  "american curl longhair": "american-curl",
  "american curl shorthair": "american-curl",
  "bengal longhair": "bengal",
  "burmilla longhair": "burmilla",
  "cymric tailed": "cymric",
  "don sphynx": "donskoy",
  "european": "european-shorthair",
  "exotic": "exotic-shorthair",
  "havana": "havana-brown",
  "highlander shorthair": "highlander",
  "japanese bobtail longhair": "japanese-bobtail",
  "japanese bobtail shorthair": "japanese-bobtail",
  "khaomanee": "khao-manee",
  "kurilean bobtail longhair": "kurilian-bobtail",
  "kurilean bobtail shorthair": "kurilian-bobtail",
  "kurilian bobtail longhair": "kurilian-bobtail",
  "laperm longhair": "laperm",
  "laperm shorthair": "laperm",
  "lykoi longhair": "lykoi",
  "maine coon polydactyl": "maine-coon",
  "manx tailed": "manx",
  "minuet longhair": "minuet",
  "minuet talls": "minuet",
  "minuet talls longhair": "minuet",
  "munchkin longhair": "munchkin",
  "norwegian forest": "norwegian-forest-cat",
  "oriental": "oriental-shorthair",
  "pixiebob longhair": "pixiebob",
  "sacred birman": "birman",
  "scottish fold longhair": "scottish-fold",
  "scottish straight longhair": "scottish-straight",
  "selkirk rex longhair": "selkirk-rex",
  "selkirk rex shorthair": "selkirk-rex",
  "somali longhair": "somali",
  "somali shorthair": "somali"
}));

const preferredNames = new Map(Object.entries({
  "asian": "Asian",
  "donskoy": "Donskoy",
  "european-shorthair": "European Shorthair",
  "kurilian-bobtail": "Kurilian Bobtail"
}));

const breeds = currentDocument.breeds.map((breed) => structuredClone(breed));
for (const breed of breeds) {
  if (!breed.facts) continue;
  delete breed.facts.registryRecognition;
  if (Object.keys(breed.facts).length === 0) delete breed.facts;
}
const bySlug = new Map(breeds.map((breed) => [breed.slug, breed]));

function ensureBreed(entry) {
  const key = normalize(entry.name);
  const requestedSlug = overrides.get(key);
  let breed = requestedSlug ? bySlug.get(requestedSlug) : null;
  if (!breed) {
    breed = breeds.find((candidate) =>
      [candidate.name, ...(candidate.aliases ?? [])].some((name) => normalize(name) === key)
    );
  }
  if (breed) return breed;

  const name = preferredNames.get(requestedSlug) ?? entry.name;
  let slug = requestedSlug ?? slugify(name);
  if (bySlug.has(slug)) {
    let suffix = 2;
    while (bySlug.has(`${slug}-${suffix}`)) suffix += 1;
    slug = `${slug}-${suffix}`;
  }
  breed = { id: `cat:${slug}`, name, slug };
  breeds.push(breed);
  bySlug.set(slug, breed);
  return breed;
}

for (const registry of ["cfa", "tica", "fife", "gccf"]) {
  for (const entry of snapshot.registries[registry].breeds) {
    const breed = ensureBreed(entry);
    breed.facts ??= {};
    breed.facts.registryRecognition ??= [];
    if (!breed.facts.registryRecognition.some((item) => item.registry === registry && item.registryId === entry.registryId)) {
      breed.facts.registryRecognition.push({
        registry,
        registryId: entry.registryId,
        name: entry.name,
        status: entry.status,
        auditedAt: snapshot.auditedAt
      });
    }
    if (normalize(entry.name) !== normalize(breed.name)) {
      breed.aliases ??= [];
      if (!breed.aliases.some((alias) => normalize(alias) === normalize(entry.name))) breed.aliases.push(entry.name);
    }
  }
}

for (const breed of breeds) {
  if (breed.aliases) breed.aliases.sort((left, right) => left.localeCompare(right, "en"));
  if (breed.facts?.registryRecognition) {
    breed.facts.registryRecognition.sort((left, right) => left.registry.localeCompare(right.registry, "en"));
  }
}

breeds.sort((left, right) => left.name.localeCompare(right.name, "en"));
const proposed = {
  ...currentDocument,
  sources: [
    { name: "Cat Fanciers' Association breeds", url: snapshot.registries.cfa.source, retrievedAt: snapshot.auditedAt },
    { name: "The International Cat Association breeds", url: snapshot.registries.tica.source, retrievedAt: snapshot.auditedAt },
    { name: "Federation Internationale Feline breeds", url: snapshot.registries.fife.source, retrievedAt: snapshot.auditedAt },
    { name: "Governing Council of the Cat Fancy GEMS codes", url: snapshot.registries.gccf.source, retrievedAt: snapshot.auditedAt, note: snapshot.registries.gccf.note }
  ],
  breeds
};

const outputPath = path.join(root, "research", "proposed-cat-breeds.json");
await writeFile(outputPath, `${JSON.stringify(proposed, null, 2)}\n`);
if (process.argv.includes("--write")) {
  await writeFile(path.join(root, "species", "cat", "breeds.json"), `${JSON.stringify(proposed, null, 2)}\n`);
}

console.log(`${process.argv.includes("--write") ? "Updated" : "Proposed"} catalog: ${breeds.length} breeds (${breeds.length - currentDocument.breeds.length} additions).`);
