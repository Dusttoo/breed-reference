import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const auditedAt = "2026-10-13";
const taxonomyId = "dog:akc-breed-classification";
const source = "American Kennel Club";

const categoryDefinitions = [
  { slug: "sporting", name: "Sporting Group", categoryType: "group" },
  { slug: "hound", name: "Hound Group", categoryType: "group" },
  { slug: "working", name: "Working Group", categoryType: "group" },
  { slug: "terrier", name: "Terrier Group", categoryType: "group" },
  { slug: "toy", name: "Toy Group", categoryType: "group" },
  { slug: "non-sporting", name: "Non-Sporting Group", categoryType: "group" },
  { slug: "herding", name: "Herding Group", categoryType: "group" },
  { slug: "miscellaneous-class", name: "Miscellaneous Class", categoryType: "class" },
  { slug: "foundation-stock-service", name: "Foundation Stock Service", categoryType: "program" }
];

const breedsDocument = JSON.parse(await readFile(path.join(root, "species", "dog", "breeds.json"), "utf8"));
const snapshot = JSON.parse(
  await readFile(path.join(root, "research", "registry-snapshots", `dog-registries-${auditedAt}.json`), "utf8")
);

const canonicalByAkcId = new Map();
for (const breed of breedsDocument.breeds) {
  for (const recognition of breed.facts?.registryRecognition ?? []) {
    if (recognition.registry !== "akc") continue;
    if (canonicalByAkcId.has(recognition.registryId)) {
      throw new Error(`Duplicate canonical AKC registry ID: ${recognition.registryId}`);
    }
    canonicalByAkcId.set(recognition.registryId, breed.id);
  }
}

const categories = categoryDefinitions.map((definition) => ({
  id: `${taxonomyId}:${definition.slug}`,
  taxonomyId,
  name: definition.name,
  slug: definition.slug,
  categoryType: definition.categoryType,
  status: "current",
  provenance: [
    {
      source,
      url: `https://www.akc.org/dog-breeds/${definition.slug}/`,
      retrievedAt: auditedAt
    }
  ]
})).sort((left, right) => left.taxonomyId.localeCompare(right.taxonomyId, "en") || left.id.localeCompare(right.id, "en"));

const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
const memberships = snapshot.registries.akc.breeds.map((record) => {
  const breedId = canonicalByAkcId.get(record.registryId);
  if (!breedId) throw new Error(`AKC breed ${record.name} (${record.registryId}) has no canonical breed mapping`);
  const category = categoryBySlug.get(record.classification);
  if (!category) throw new Error(`AKC breed ${record.name} has no recognized classification`);
  return {
    breedId,
    taxonomyId,
    categoryId: category.id,
    status: record.status === "recognized" ? "current" : "pending-recognition",
    provenance: [
      {
        source,
        url: `https://www.akc.org/dog-breeds/${record.classification}/`,
        reference: `AKC breed ID ${record.registryId}`,
        retrievedAt: auditedAt
      }
    ]
  };
}).sort((left, right) =>
  left.breedId.localeCompare(right.breedId, "en")
  || left.taxonomyId.localeCompare(right.taxonomyId, "en")
  || left.categoryId.localeCompare(right.categoryId, "en")
);

const document = {
  $schema: "../../schema/classifications.schema.json",
  schemaVersion: 1,
  species: "dog",
  taxonomies: [
    {
      id: taxonomyId,
      name: "AKC Breed Classification",
      version: auditedAt,
      authority: {
        id: "akc",
        name: source,
        url: "https://www.akc.org/"
      },
      status: "current",
      provenance: [
        {
          source,
          url: "https://www.akc.org/dog-breeds/",
          retrievedAt: auditedAt,
          note: "Seven recognized breed groups plus the Miscellaneous Class and Foundation Stock Service program."
        }
      ]
    }
  ],
  categories,
  memberships
};

await writeFile(path.join(root, "species", "dog", "classifications.json"), `${JSON.stringify(document, null, 2)}\n`);
console.log(`Generated ${document.taxonomies.length} taxonomy, ${categories.length} categories, and ${memberships.length} memberships.`);
