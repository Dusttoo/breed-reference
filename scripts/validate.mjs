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
    ["catalog", "species", "breeds"].map(async (name) => [
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
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  const summary = catalog.species.map((entry) => `${entry.breedCount} ${entry.id}`).join(", ");
  console.log(`Breed reference is valid: ${summary} breeds.`);
}
