# Contributing

Corrections, missing breeds, additional reputable registries, and support for
new species are welcome.

## Proposing a change

1. Open an issue describing the registry source and the proposed change.
2. Use an official registry page or standard wherever possible.
3. Preserve the registry's recognition status instead of treating every public
   entry as fully recognized.
4. Run `npm ci`, the relevant generators, and `npm test` before submitting a
   pull request.

Breed identity is not determined by spelling alone. Translations, historic
names, coat varieties, size varieties, and registry-specific classifications
must be reviewed before records are merged or split.

## Refreshing registry data

Run the relevant `audit:*` script to capture a dated registry snapshot. Then
run its `reconcile-*-catalog.mjs` script without `--write` and review the
proposal under `research/`. Use `--write` only after reviewing additions,
removals, aliases, and status changes. Regenerate the static lists afterward.

## Classification data

Never add a registry category as a single property on a breed. Add or update a
versioned taxonomy, its categories, and explicit memberships in the species'
classification document. Every taxonomy, category, and membership needs
official provenance. Similar-looking groups from different registries remain
different taxonomies.

Preserve historical memberships rather than deleting them, and use
`pending-recognition` for a registry's provisional class or program when that
is what its source actually states. Do not infer classification from a breed's
name, purpose, country, or another registry.
