# Breed Reference

Breed Reference is a species-neutral catalog of canonical breed names. It gives
applications a shared set of identifiers without copying lists between codebases.

For quick copying, use the plain-text lists:

- [`lists/dog-breeds.txt`](lists/dog-breeds.txt) — 439 dog breeds
- [`lists/cat-breeds.txt`](lists/cat-breeds.txt) — 71 cat breeds

Each file contains one alphabetically sorted display name per line. The JSON
catalogs provide stable IDs, URL slugs, aliases, and registry recognition data.

The catalog compiles dog and cat breed names from major public breed registries.
It does not claim that one registry's definition of “every breed” is universal.
A breed can be recognized by one organization and treated as a variety,
provisional breed, foundation-stock population, or unrecognized population by
another. Each breed's `facts.registryRecognition` entries preserve those
registry-specific names and statuses without changing the stable identity used
by applications.

The dog catalog is audited against FCI, AKC, UKC, the Canadian Kennel Club,
ABKC, and Dogs Australia. The Royal Kennel Club's public A–Z is used as a
supplementary coverage check. The cat catalog is audited against CFA, TICA, and
FIFe, with GCCF used as an additional coverage check. The current snapshot was
audited on 2026-10-13; registry recognition changes over time.

## Layout

```text
catalog.json
lists/
  cat-breeds.txt
  dog-breeds.txt
schema/
  breeds.schema.json
  catalog.schema.json
  species.schema.json
species/
  cat/
    breeds.json
    species.json
  dog/
    breeds.json
    species.json
scripts/
  audit-cat-registries.mjs
  audit-dog-registries.mjs
  reconcile-cat-catalog.mjs
  reconcile-dog-catalog.mjs
  validate.mjs
research/
  dog-registry-audit-2026-10-13.md
  registry-snapshots/
```

`catalog.json` is the entry point. Each species has metadata in `species.json`
and a list of breed records in `breeds.json`. Consumers should use `id` as the
stable identifier, `slug` in URLs and machine interfaces, and `name` for the
default display label.

Breed records are intentionally small today. The schema already permits:

- alternate names in `aliases`;
- registry or application identifiers in `externalIds`;
- named varieties in `variants`;
- extensible, namespaced data in `facts`;
- record-level source citations in `sources`.

Facts should use a stable namespace such as `physical`, `temperament`,
`health`, or `registryRecognition`. New species get a new directory and one
entry in `catalog.json`; no dog- or cat-specific shape is required.

## Registry methodology

Registry pages are captured as dated snapshots, then reconciled into canonical
records. Exact synonyms and translated names become aliases. Coat, size, and
tail entries that a registry presents separately may be folded into one breed
record when they are varieties of the same breed; genuinely distinct registry
concepts remain separate. Recognition status is never inferred from presence
in another registry.

Run the audit scripts to refresh the raw snapshots. Run the reconciliation
scripts without `--write` to review proposed catalogs under `research/`, or
with `--write` to update the live species files. Review registry changes before
committing generated output because registry pages and taxonomies can change.

## Validation

Run:

```sh
npm install
npm test
```

The validator applies the JSON Schemas and checks file references, counts,
identifiers, slugs, sort order, uniqueness, and exact agreement between each
JSON catalog and its generated text list. Run `npm run generate` after changing
breed names or membership.

The catalog keeps one `Saint Bernard` record with `St. Bernard` as an alias and
represents Standard, Miniature, and Toy Poodles as separate breed records.
The dated audit report documents counts, caveats, and records that need further
registry confirmation.

## License

Released under the [MIT License](LICENSE).

