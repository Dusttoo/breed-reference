# Contributing

Corrections, missing breeds, additional reputable registries, and support for
new species are welcome.

## Proposing a change

1. Open an issue describing the registry source and the proposed change.
2. Use an official registry page or standard wherever possible.
3. Preserve the registry's recognition status instead of treating every public
   entry as fully recognized.
4. Run `npm install`, `npm run generate`, and `npm test` before submitting a
   pull request.

Breed identity is not determined by spelling alone. Translations, historic
names, coat varieties, size varieties, and registry-specific classifications
must be reviewed before records are merged or split.

## Refreshing registry data

Run the relevant `audit:*` script to capture a dated registry snapshot. Then
run its `reconcile-*-catalog.mjs` script without `--write` and review the
proposal under `research/`. Use `--write` only after reviewing additions,
removals, aliases, and status changes. Regenerate the static lists afterward.
