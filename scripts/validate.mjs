import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(await readFile(path.join(root, "catalog.json"), "utf8"));
const errors = [];
const speciesIds = new Set();
const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);

const schemas = Object.fromEntries(
  await Promise.all(
    ["catalog", "species", "breeds", "mixes", "classifications"].map(async (name) => [
      name,
      JSON.parse(await readFile(path.join(root, "schema", `${name}.schema.json`), "utf8"))
    ])
  )
);
const validators = Object.fromEntries(
  Object.entries(schemas).map(([name, schema]) => [name, ajv.compile(schema)])
);

function validateSchema(name, value, file) {
  if (validators[name](value)) return;
  for (const error of validators[name].errors ?? []) {
    errors.push(`${file}${error.instancePath}: ${error.message}`);
  }
}

function addDuplicateErrors(values, label) {
  const seen = new Set();
  for (const value of values) {
    const key = value.toLocaleLowerCase("en");
    if (seen.has(key)) errors.push(`Duplicate ${label}: ${value}`);
    seen.add(key);
  }
}

function normalizeSearchName(value) {
  return value.normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("en")
    .replaceAll("&", " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compareClassificationRecords(left, right) {
  return left.taxonomyId?.localeCompare(right.taxonomyId ?? "", "en")
    || left.breedId?.localeCompare(right.breedId ?? "", "en")
    || left.id?.localeCompare(right.id ?? "", "en")
    || left.categoryId?.localeCompare(right.categoryId ?? "", "en")
    || 0;
}

function validateDateRange(value, label) {
  if (value.effectiveFrom && value.effectiveTo && value.effectiveFrom > value.effectiveTo) {
    errors.push(`${label}: effectiveFrom must not be after effectiveTo`);
  }
  if (value.status !== "historical" && value.effectiveTo) {
    errors.push(`${label}: only historical records may have effectiveTo`);
  }
  for (const provenance of value.provenance ?? []) {
    if (provenance.effectiveFrom && provenance.effectiveTo && provenance.effectiveFrom > provenance.effectiveTo) {
      errors.push(`${label}: provenance effectiveFrom must not be after effectiveTo`);
    }
  }
}

validateSchema("catalog", catalog, "catalog.json");

for (const entry of catalog.species) {
  if (speciesIds.has(entry.id)) errors.push(`Duplicate species id: ${entry.id}`);
  speciesIds.add(entry.id);

  const metadata = JSON.parse(await readFile(path.join(root, entry.metadata), "utf8"));
  const document = JSON.parse(await readFile(path.join(root, entry.breeds), "utf8"));
  const breeds = document.breeds;

  validateSchema("species", metadata, entry.metadata);
  validateSchema("breeds", document, entry.breeds);

  if (metadata.id !== entry.id) errors.push(`${entry.id}: metadata id mismatch`);
  if (document.species !== entry.id) errors.push(`${entry.id}: breed file species mismatch`);
  if (breeds.length !== entry.breedCount) {
    errors.push(`${entry.id}: expected ${entry.breedCount} breeds, found ${breeds.length}`);
  }

  const expectedList = `${breeds.map((breed) => breed.name).join("\n")}\n`;
  const actualList = await readFile(path.join(root, entry.list), "utf8").catch(() => null);
  if (actualList === null) {
    errors.push(`${entry.id}: missing static list ${entry.list}`);
  } else if (actualList !== expectedList) {
    errors.push(`${entry.id}: ${entry.list} is out of date; run npm run generate`);
  }

  const sortedNames = breeds.map((breed) => breed.name).sort((a, b) => a.localeCompare(b, "en"));
  if (breeds.some((breed, index) => breed.name !== sortedNames[index])) {
    errors.push(`${entry.id}: breeds are not sorted by name`);
  }

  addDuplicateErrors(breeds.map((breed) => breed.id), `${entry.id} id`);
  addDuplicateErrors(breeds.map((breed) => breed.slug), `${entry.id} slug`);
  addDuplicateErrors(breeds.map((breed) => breed.name), `${entry.id} name`);

  for (const breed of breeds) {
    if (breed.id !== `${entry.id}:${breed.slug}`) {
      errors.push(`${entry.id}: invalid id ${breed.id}`);
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(breed.slug)) {
      errors.push(`${entry.id}: invalid slug ${breed.slug}`);
    }
  }

  if (entry.mixes) {
    const mixDocument = JSON.parse(await readFile(path.join(root, entry.mixes), "utf8"));
    const mixes = mixDocument.mixes;
    validateSchema("mixes", mixDocument, entry.mixes);
    if (mixDocument.species !== entry.id) errors.push(`${entry.id}: mix file species mismatch`);
    if (mixes.length !== entry.mixCount) errors.push(`${entry.id}: expected ${entry.mixCount} mixes, found ${mixes.length}`);
    const expectedMixList = `${mixes.map((mix) => mix.name).join("\n")}\n`;
    const actualMixList = await readFile(path.join(root, entry.mixList), "utf8").catch(() => null);
    if (actualMixList !== expectedMixList) errors.push(`${entry.id}: ${entry.mixList} is missing or out of date; run npm run generate`);
    const sortedMixes = [...mixes].sort((left, right) => left.name.localeCompare(right.name, "en"));
    if (mixes.some((mix, index) => mix.id !== sortedMixes[index].id)) errors.push(`${entry.id}: mixes are not sorted by name`);
    addDuplicateErrors(mixes.map((mix) => mix.id), `${entry.id} mix id`);
    addDuplicateErrors(mixes.map((mix) => mix.slug), `${entry.id} mix slug`);
    const breedIds = new Set(breeds.map((breed) => breed.id));
    const searchNames = new Map();
    for (const record of [...breeds, ...mixes]) {
      if (!Array.isArray(record.aliases)) errors.push(`${record.id}: missing aliases array`);
      for (const name of [record.name, ...(record.aliases ?? [])]) {
        const normalized = normalizeSearchName(name);
        const previous = searchNames.get(normalized);
        if (previous && previous !== record.id) errors.push(`${record.id}: search name ${name} conflicts with ${previous}`);
        else searchNames.set(normalized, record.id);
      }
    }
    for (const mix of mixes) {
      if (mix.id !== `dog-mix:${mix.slug}`) errors.push(`${mix.id}: id and slug do not agree`);
      for (const parentId of mix.parentBreedIds ?? []) {
        if (!breedIds.has(parentId)) errors.push(`${mix.id}: missing parent breed ${parentId}`);
      }
    }
  }

  if (!entry.classifications) continue;
  const classifications = JSON.parse(await readFile(path.join(root, entry.classifications), "utf8"));
  validateSchema("classifications", classifications, entry.classifications);
  if (classifications.species !== entry.id) errors.push(`${entry.id}: classification file species mismatch`);
  if (classifications.taxonomies.length !== entry.taxonomyCount) {
    errors.push(`${entry.id}: expected ${entry.taxonomyCount} taxonomies, found ${classifications.taxonomies.length}`);
  }
  if (classifications.memberships.length !== entry.classificationMembershipCount) {
    errors.push(`${entry.id}: expected ${entry.classificationMembershipCount} classification memberships, found ${classifications.memberships.length}`);
  }

  const breedIds = new Set(breeds.map((breed) => breed.id));
  const taxonomyById = new Map(classifications.taxonomies.map((taxonomy) => [taxonomy.id, taxonomy]));
  const categoryById = new Map(classifications.categories.map((category) => [category.id, category]));
  addDuplicateErrors(classifications.taxonomies.map((taxonomy) => taxonomy.id), `${entry.id} taxonomy id`);
  addDuplicateErrors(classifications.categories.map((category) => category.id), `${entry.id} category id`);
  addDuplicateErrors(
    classifications.memberships.map((membership) => `${membership.breedId}|${membership.taxonomyId}|${membership.categoryId}`),
    `${entry.id} classification membership`
  );

  const sortedTaxonomies = [...classifications.taxonomies].sort((left, right) => left.id.localeCompare(right.id, "en"));
  if (classifications.taxonomies.some((taxonomy, index) => taxonomy.id !== sortedTaxonomies[index].id)) {
    errors.push(`${entry.id}: taxonomies are not sorted by id`);
  }
  const sortedCategories = [...classifications.categories].sort(compareClassificationRecords);
  if (classifications.categories.some((category, index) => category.id !== sortedCategories[index].id)) {
    errors.push(`${entry.id}: categories are not sorted by taxonomy and id`);
  }
  const sortedMemberships = [...classifications.memberships].sort((left, right) =>
    left.breedId.localeCompare(right.breedId, "en")
    || left.taxonomyId.localeCompare(right.taxonomyId, "en")
    || left.categoryId.localeCompare(right.categoryId, "en")
  );
  if (classifications.memberships.some((membership, index) =>
    `${membership.breedId}|${membership.taxonomyId}|${membership.categoryId}`
      !== `${sortedMemberships[index].breedId}|${sortedMemberships[index].taxonomyId}|${sortedMemberships[index].categoryId}`
  )) {
    errors.push(`${entry.id}: classification memberships are not sorted`);
  }

  for (const taxonomy of classifications.taxonomies) validateDateRange(taxonomy, `${entry.id}: taxonomy ${taxonomy.id}`);
  for (const category of classifications.categories) {
    if (!taxonomyById.has(category.taxonomyId)) errors.push(`${entry.id}: category ${category.id} references missing taxonomy ${category.taxonomyId}`);
    if (category.parentId) {
      const parent = categoryById.get(category.parentId);
      if (!parent) errors.push(`${entry.id}: category ${category.id} references missing parent ${category.parentId}`);
      else if (parent.taxonomyId !== category.taxonomyId) errors.push(`${entry.id}: category ${category.id} and its parent use different taxonomies`);
    }
    const ancestors = new Set([category.id]);
    let parentId = category.parentId;
    while (parentId) {
      if (ancestors.has(parentId)) {
        errors.push(`${entry.id}: category cycle includes ${category.id}`);
        break;
      }
      ancestors.add(parentId);
      parentId = categoryById.get(parentId)?.parentId;
    }
    validateDateRange(category, `${entry.id}: category ${category.id}`);
  }

  for (const membership of classifications.memberships) {
    const category = categoryById.get(membership.categoryId);
    if (!breedIds.has(membership.breedId)) errors.push(`${entry.id}: membership references missing breed ${membership.breedId}`);
    if (!taxonomyById.has(membership.taxonomyId)) errors.push(`${entry.id}: membership references missing taxonomy ${membership.taxonomyId}`);
    if (!category) errors.push(`${entry.id}: membership references missing category ${membership.categoryId}`);
    else if (category.taxonomyId !== membership.taxonomyId) errors.push(`${entry.id}: membership category and taxonomy do not agree for ${membership.breedId}`);
    validateDateRange(membership, `${entry.id}: membership ${membership.breedId} → ${membership.categoryId}`);
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  const summary = catalog.species.map((entry) => `${entry.breedCount} ${entry.id}`).join(", ");
  const classificationSummary = catalog.species
    .filter((entry) => entry.classifications)
    .map((entry) => `${entry.classificationMembershipCount} ${entry.id} classifications`)
    .join(", ");
  const mixSummary = catalog.species.filter((entry) => entry.mixes).map((entry) => `${entry.mixCount} ${entry.id} mixes`).join(", ");
  console.log(`Breed reference is valid: ${summary} breeds${mixSummary ? `; ${mixSummary}` : ""}${classificationSummary ? `; ${classificationSummary}` : ""}.`);
}
