# Breed registry audit — 2026-10-13

This audit validates the initial dog and cat catalogs against current public
breed indexes from prominent registry organizations. Counts below describe
registry entries, not necessarily distinct breeds: several organizations expose
coat, size, or national varieties as separate entries.

## Result

- Dog catalog: 212 to 439 canonical records, adding 227 records.
- Cat catalog: 52 to 73 canonical records, adding 21 records.
- Registry names, identifiers, and recognition statuses are retained in each
  record under `facts.registryRecognition`.
- Confirmed translations and synonyms are aliases instead of duplicate records.
- Registry-specific concepts remain separate when the organizations do not
  agree that they are merely synonyms or varieties.

Two pre-existing dog names, `American Bandogge` and `Exotic Bully`, were not
confirmed by the audited registry indexes. They remain in the catalog to avoid
silently removing supported application values and carry
`facts.reviewStatus: not-confirmed-by-audited-registries` for future review.

## Dog sources

| Registry | Captured entries | Status breakdown |
| --- | ---: | --- |
| [FCI](https://www.fci.be/en/Nomenclature/Default.aspx) | 364 | 344 definitive; 20 provisional |
| [AKC](https://www.akc.org/dog-breeds/) | 292 | 208 recognized; 13 Miscellaneous Class; 71 Foundation Stock Service |
| [UKC](https://www.ukcdogs.com/breed-standards) | 387 | 377 recognized; 10 Bloodlines Listing Service |
| [Canadian Kennel Club](https://www.ckc.ca/en/Choosing-a-Dog/Choosing-a-Breed/All-Dogs) | 213 | 213 public breed or variety entries |
| [ABKC](https://abkcdogs.net/breed2/) | 22 | 22 recognized entries |
| [Dogs Australia](https://www.dogsaustralia.org.au/BrowseBreed/browse-a-breed/) | 231 | 231 recognized entries |

The [Royal Kennel Club breed A–Z](https://www.royalkennelclub.com/search/breeds-a-to-z/)
reported 230 results and was used as an additional coverage check. Its current
search page was not imported into the machine-readable snapshot because it did
not provide a stable server-readable listing during the audit.

The Canadian Kennel Club describes 187 recognized breeds while its public
listing exposes more entries because it separates some sizes, coats, and
varieties. This catalog records those public entries but reconciles confirmed
varieties to their canonical breed where appropriate.

## Cat sources

| Registry | Captured entries | Status breakdown |
| --- | ---: | --- |
| [CFA](https://cfa.org/breeds/) | 45 | 44 championship; 1 provisional |
| [TICA](https://tica.org/ticas-breeds/browse-all-breeds/) | 83 | 81 championship browse entries; 2 Advanced New Breeds |
| [FIFe](https://fifeweb.org/cats/breeds/) | 50 | 48 fully recognized; 2 preliminary |
| [GCCF](https://www.gccfcats.org/breeding-cats/new-to-breeding/registration-policies/gems-codes/) | 46 | recognized GEMS breed codes across six show sections |

TICA describes 73 recognized breeds while its browse page displays 83 entries
because it presents several longhair, shorthair, tailed, and other variants
separately. Those entries are preserved as registry facts and folded into one
canonical record when they are variants of the same breed.

## Reproduction and review

The dated source responses are normalized into
`research/registry-snapshots/`. Run `scripts/audit-dog-registries.mjs` and
`scripts/audit-cat-registries.mjs` to refresh them, then run the corresponding
`reconcile-*-catalog.mjs` script without `--write` to produce a proposed file
for review. Passing `--write` promotes the reviewed proposal to the live
species catalog.

Registry taxonomies change and disagree. A future refresh should review added,
removed, and renamed entries rather than accepting a changed count by itself.
