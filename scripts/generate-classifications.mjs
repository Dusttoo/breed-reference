import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const auditedAt = "2026-10-13";

const definitions = {
  dog: [
    {
      registry: "akc",
      name: "AKC Breed Classification",
      authority: "American Kennel Club",
      authorityUrl: "https://www.akc.org/",
      sourceUrl: "https://www.akc.org/dog-breeds/",
      categories: [
        ["sporting", "Sporting Group", "group"], ["hound", "Hound Group", "group"],
        ["working", "Working Group", "group"], ["terrier", "Terrier Group", "group"],
        ["toy", "Toy Group", "group"], ["non-sporting", "Non-Sporting Group", "group"],
        ["herding", "Herding Group", "group"], ["miscellaneous-class", "Miscellaneous Class", "class"],
        ["foundation-stock-service", "Foundation Stock Service", "program"]
      ]
    },
    {
      registry: "ckc",
      name: "CKC Breed Groups",
      authority: "Canadian Kennel Club",
      authorityUrl: "https://www.ckc.ca/",
      sourceUrl: "https://www.ckc.ca/en/Breeding-Dogs/CKC-Breed-Standards",
      categories: [
        ["Sporting-Dogs", "Group 1 — Sporting Dogs", "group"], ["Hounds", "Group 2 — Hounds", "group"],
        ["Working-Dogs", "Group 3 — Working Dogs", "group"], ["Terriers", "Group 4 — Terriers", "group"],
        ["Toy-Dogs", "Group 5 — Toys", "group"], ["Non-Sporting-Dogs", "Group 6 — Non-Sporting", "group"],
        ["Herding-Dogs", "Group 7 — Herding", "group"]
      ]
    },
    {
      registry: "dogsAustralia",
      name: "Dogs Australia Breed Groups",
      authority: "Dogs Australia",
      authorityUrl: "https://www.dogsaustralia.org.au/",
      sourceUrl: "https://www.dogsaustralia.org.au/BrowseBreed/browse-a-breed/",
      categories: [
        ["group-1", "Group 1 — Toys", "group"], ["group-2", "Group 2 — Terriers", "group"],
        ["group-3", "Group 3 — Gundogs", "group"], ["group-4", "Group 4 — Hounds", "group"],
        ["group-5", "Group 5 — Working Dogs", "group"], ["group-6", "Group 6 — Utility", "group"],
        ["group-7", "Group 7 — Non Sporting", "group"]
      ]
    },
    {
      registry: "fci",
      name: "FCI Breed Groups",
      authority: "Fédération Cynologique Internationale",
      authorityUrl: "https://www.fci.be/",
      sourceUrl: "https://www.fci.be/en/Nomenclature/Default.aspx",
      categories: [
        ["group-1", "Group 1 — Sheepdogs and Cattledogs", "group"],
        ["group-2", "Group 2 — Pinscher and Schnauzer, Molossoid and Swiss Mountain and Cattledogs", "group"],
        ["group-3", "Group 3 — Terriers", "group"], ["group-4", "Group 4 — Dachshunds", "group"],
        ["group-5", "Group 5 — Spitz and Primitive Types", "group"],
        ["group-6", "Group 6 — Scent Hounds and Related Breeds", "group"],
        ["group-7", "Group 7 — Pointing Dogs", "group"],
        ["group-8", "Group 8 — Retrievers, Flushing Dogs and Water Dogs", "group"],
        ["group-9", "Group 9 — Companion and Toy Dogs", "group"],
        ["group-10", "Group 10 — Sighthounds", "group"]
      ],
      include: (record) => record.status === "definitive"
    },
    {
      registry: "ukc",
      name: "UKC Breed Groups and Listing Service",
      authority: "United Kennel Club",
      authorityUrl: "https://www.ukcdogs.com/",
      sourceUrl: "https://www.ukcdogs.com/breed-standards",
      categories: [
        ["Companion Dog", "Companion Dog Group", "group"], ["Guardian Dog", "Guardian Dog Group", "group"],
        ["Gun Dog", "Gun Dog Group", "group"], ["Herding Dog", "Herding Dog Group", "group"],
        ["Northern Breed", "Northern Breed Group", "group"], ["Scenthound", "Scenthound Group", "group"],
        ["Sighthound & Pariah", "Sighthound & Pariah Group", "group"], ["Terrier", "Terrier Group", "group"],
        ["UKC Bloodlines Listing Service", "UKC Bloodlines Listing Service", "program"]
      ]
    }
  ],
  cat: [
    {
      registry: "cfa",
      name: "CFA Competition Status",
      authority: "Cat Fanciers' Association",
      authorityUrl: "https://cfa.org/",
      sourceUrl: "https://cfa.org/wp-content/uploads/2026/04/26-27standards.pdf",
      categories: [["championship", "Championship", "class"], ["provisional", "Provisional", "class"]]
    },
    {
      registry: "fife",
      name: "FIFe Breed Categories",
      authority: "Fédération Internationale Féline",
      authorityUrl: "https://fifeweb.org/",
      sourceUrl: "https://fifeweb.org/cats/breeds/",
      categories: [1, 2, 3, 4].map((number) => [`category-${number}`, `Category ${number}`, "group"])
    },
    {
      registry: "gccf",
      name: "GCCF Show Sections",
      authority: "Governing Council of the Cat Fancy",
      authorityUrl: "https://www.gccfcats.org/",
      sourceUrl: "https://www.gccfcats.org/breeding-cats/new-to-breeding/registration-policies/gems-codes/",
      categories: [1, 2, 3, 4, 5, 6].map((number) => [`section-${number}`, `Section ${number}`, "section"])
    },
    {
      registry: "tica",
      name: "TICA Recognition Status",
      authority: "The International Cat Association",
      authorityUrl: "https://tica.org/",
      sourceUrl: "https://tica.org/ticas-breeds/browse-all-breeds/",
      categories: [
        ["championship", "Championship", "class"],
        ["advanced-new-breed", "Advanced New Breed", "class"]
      ]
    }
  ]
};

function slugify(value) {
  return value.toLocaleLowerCase("en").replace(/&amp;/g, "and").replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function membershipStatus(status) {
  return ["recognized", "definitive"].includes(status) ? "current" : "pending-recognition";
}

for (const species of Object.keys(definitions)) {
  const breedsDocument = JSON.parse(await readFile(path.join(root, "species", species, "breeds.json"), "utf8"));
  const snapshot = JSON.parse(await readFile(path.join(root, "research", "registry-snapshots", `${species}-registries-${auditedAt}.json`), "utf8"));
  const registryMaps = new Map();
  for (const breed of breedsDocument.breeds) {
    for (const recognition of breed.facts?.registryRecognition ?? []) {
      const key = `${recognition.registry}:${recognition.registryId}`;
      const existing = registryMaps.get(key);
      if (existing && existing !== breed.id) throw new Error(`${key} maps to both ${existing} and ${breed.id}`);
      registryMaps.set(key, breed.id);
    }
  }

  const taxonomies = [];
  const categories = [];
  const memberships = [];
  for (const definition of definitions[species]) {
    const taxonomyId = `${species}:${slugify(definition.registry)}-classification`;
    taxonomies.push({
      id: taxonomyId,
      name: definition.name,
      version: auditedAt,
      authority: { id: slugify(definition.registry), name: definition.authority, url: definition.authorityUrl },
      status: "current",
      provenance: [{ source: definition.authority, url: definition.sourceUrl, retrievedAt: auditedAt }]
    });
    const categoryBySource = new Map();
    for (const [sourceId, name, categoryType] of definition.categories) {
      const slug = slugify(sourceId);
      const category = {
        id: `${taxonomyId}:${slug}`,
        taxonomyId,
        name,
        slug,
        categoryType,
        status: "current",
        provenance: [{ source: definition.authority, url: definition.sourceUrl, retrievedAt: auditedAt }]
      };
      categories.push(category);
      categoryBySource.set(sourceId, category);
    }
    for (const record of snapshot.registries[definition.registry].breeds) {
      if (definition.include && !definition.include(record)) continue;
      if (!record.classification) throw new Error(`${definition.registry} ${record.name} has no classification`);
      const category = categoryBySource.get(record.classification);
      if (!category) throw new Error(`${definition.registry} ${record.name} has unknown classification ${record.classification}`);
      const breedId = registryMaps.get(`${definition.registry}:${record.registryId}`);
      if (!breedId) throw new Error(`${definition.registry} ${record.name} (${record.registryId}) has no canonical breed mapping`);
      memberships.push({
        breedId,
        taxonomyId,
        categoryId: category.id,
        status: membershipStatus(record.status),
        provenance: [{
          source: definition.authority,
          url: definition.sourceUrl,
          reference: `${definition.registry.toUpperCase()} identifier ${record.registryId}`,
          retrievedAt: auditedAt
        }]
      });
    }
  }

  const uniqueMemberships = [...new Map(memberships.map((membership) => [
    `${membership.breedId}|${membership.taxonomyId}|${membership.categoryId}`,
    membership
  ])).values()];
  taxonomies.sort((left, right) => left.id.localeCompare(right.id, "en"));
  categories.sort((left, right) => left.taxonomyId.localeCompare(right.taxonomyId, "en") || left.id.localeCompare(right.id, "en"));
  uniqueMemberships.sort((left, right) => left.breedId.localeCompare(right.breedId, "en")
    || left.taxonomyId.localeCompare(right.taxonomyId, "en")
    || left.categoryId.localeCompare(right.categoryId, "en"));

  const document = {
    $schema: "../../schema/classifications.schema.json",
    schemaVersion: 1,
    species,
    taxonomies,
    categories,
    memberships: uniqueMemberships
  };
  await writeFile(path.join(root, "species", species, "classifications.json"), `${JSON.stringify(document, null, 2)}\n`);
  console.log(`${species}: ${taxonomies.length} taxonomies, ${categories.length} categories, ${uniqueMemberships.length} memberships`);
}
