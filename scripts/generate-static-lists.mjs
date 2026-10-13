import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(await readFile(path.join(root, "catalog.json"), "utf8"));

await mkdir(path.join(root, "lists"), { recursive: true });

for (const entry of catalog.species) {
  const document = JSON.parse(await readFile(path.join(root, entry.breeds), "utf8"));
  const contents = `${document.breeds.map((breed) => breed.name).join("\n")}\n`;
  await writeFile(path.join(root, entry.list), contents);
  console.log(`Generated ${entry.list} with ${document.breeds.length} names.`);
}
