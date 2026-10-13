# Breed Reference

Breed Reference is a species-neutral catalog of canonical breed names. It gives
applications a shared set of identifiers without copying lists between codebases.

For quick copying, use the plain-text lists:

- [`lists/dog-breeds.txt`](lists/dog-breeds.txt) — 439 dog breeds
- [`lists/cat-breeds.txt`](lists/cat-breeds.txt) — 73 cat breeds

Each file contains one alphabetically sorted display name per line. The JSON
catalogs provide stable IDs, URL slugs, aliases, and registry recognition data.

Registry classifications are separate, versioned assertions. They are not an
intrinsic `breed.group` property: the same breed can belong to different groups
in different registry systems. The first classification release contains the
American Kennel Club's seven recognized groups, Miscellaneous Class, and
Foundation Stock Service classifications alongside classifications from four
other major dog registries and four major cat registries.

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
  classifications.schema.json
  species.schema.json
species/
  cat/
    breeds.json
    classifications.json
    species.json
  dog/
    breeds.json
    classifications.json
    species.json
scripts/
  audit-cat-registries.mjs
  audit-dog-registries.mjs
  reconcile-cat-catalog.mjs
  reconcile-dog-catalog.mjs
  generate-classifications.mjs
  validate.mjs
research/
  dog-registry-audit-2026-10-13.md
  registry-snapshots/
```

`catalog.json` is the entry point. Each species has metadata in `species.json`
and a list of breed records in `breeds.json`. Consumers should use `id` as the
stable identifier, `slug` in URLs and machine interfaces, and `name` for the
default display label.

An optional `classifications` path on a species catalog entry points to a
classification document containing:

- versioned taxonomies owned by a registry or other authority;
- categories within each taxonomy, including optional parent categories;
- memberships linking canonical breed IDs to categories;
- source provenance and effective dates;
- `current`, `historical`, or `pending-recognition` status.

Applications should join classifications through `breedId`, `taxonomyId`, and
`categoryId`. Category names and memberships may change when a registry changes
its system; canonical breed identity does not.

Breed records are intentionally small today. The schema already permits:

- alternate names in `aliases`;
- registry or application identifiers in `externalIds`;
- named varieties in `variants`;
- extensible, namespaced data in `facts`;
- record-level source citations in `sources`.

Canonical facts must be objective and tied to authoritative provenance. The
catalog currently uses `facts.registryRecognition`; future additions may cover
official names, origin assertions, and authoritative breed relationships.
Subjective temperament, suitability, popularity, expected-health, and
“good with children” assessments do not belong in this reference. New species
get a new directory and one entry in `catalog.json`; no dog- or cat-specific
shape is required.

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
The audits preserve classification labels with each registry record and
`npm run generate:classifications` resolves registry identifiers to canonical
breed IDs. Every registry has a separate taxonomy even when category names look
similar. The published classification coverage includes AKC, CKC, Dogs
Australia, FCI, and UKC for dogs, and CFA, FIFe, GCCF, and TICA for cats. ABKC
is retained as a recognition source but has no classification taxonomy because
its public breed list does not publish a formal grouping system.

## Validation

Run:

```sh
npm ci
npm test
```

The validator applies the JSON Schemas and checks file references, counts,
identifiers, slugs, sort order, uniqueness, and exact agreement between each
JSON catalog and its generated text list. Run `npm run generate` after changing
breed names. Classification validation also checks taxonomy, category, parent,
breed and membership references; hierarchy cycles; status/date rules; sort
order; and catalog counts. Run `npm run generate:classifications` after
refreshing either registry audit snapshot.

The catalog keeps one `Saint Bernard` record with `St. Bernard` as an alias and
represents Standard, Miniature, and Toy Poodles as separate breed records.
The dated audit report documents counts, caveats, and records that need further
registry confirmation.

## License

Released under the [MIT License](LICENSE).

