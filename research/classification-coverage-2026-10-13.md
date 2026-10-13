# Registry classification coverage — 2026-10-13

This audit records which official registry classification systems are published
in the catalog. Categories remain registry-owned assertions rather than an
intrinsic property of a breed. Entry counts can exceed canonical-breed counts
when a registry classifies coat, size, or tail varieties separately.

## Published dog taxonomies

| Authority | Published system | Categories | Memberships | Notes |
| --- | --- | ---: | ---: | --- |
| [AKC](https://www.akc.org/dog-breeds/) | Breed groups and recognition programs | 9 | 292 | Seven groups, Miscellaneous Class, and Foundation Stock Service |
| [Canadian Kennel Club](https://www.ckc.ca/en/Breeding-Dogs/CKC-Breed-Standards) | Breed groups | 7 | 204 | Public variety entries can collapse to one canonical membership |
| [Dogs Australia](https://www.dogsaustralia.org.au/BrowseBreed/browse-a-breed/) | Breed groups | 7 | 215 | Seven numbered groups |
| [FCI](https://www.fci.be/en/Nomenclature/Default.aspx) | Breed groups | 10 | 341 | Definitively recognized breeds only; 20 provisional breeds have no published group assignment |
| [UKC](https://www.ukcdogs.com/breed-standards) | Breed groups and listing service | 9 | 385 | Eight groups plus Bloodlines Listing Service |

[ABKC](https://abkcdogs.net/breed2/) remains a recognition source. Its public
breed index does not define a formal group or class taxonomy, so the catalog
does not manufacture one. The Royal Kennel Club was reviewed as a supplementary
coverage source but is not yet published because its current public listing did
not provide a stable, reproducible server-readable classification snapshot.

## Published cat taxonomies

| Authority | Published system | Categories | Memberships | Notes |
| --- | --- | ---: | ---: | --- |
| [CFA](https://cfa.org/wp-content/uploads/2026/04/26-27standards.pdf) | Competition status | 2 | 45 | Championship and Provisional |
| [FIFe](https://fifeweb.org/cats/breeds/) | Breed categories | 4 | 46 | Includes two preliminary breeds with pending-recognition status |
| [GCCF](https://www.gccfcats.org/breeding-cats/new-to-breeding/registration-policies/gems-codes/) | Show sections | 6 | 41 | GEMS coat-length codes can collapse to one canonical membership |
| [TICA](https://tica.org/ticas-breeds/browse-all-breeds/) | Recognition status | 2 | 64 | Championship and Advanced New Breed; displayed variants collapse to canonical breeds |

## Reproduction rules

The dated raw records live in `research/registry-snapshots/`. The audit scripts
capture the registry’s classification label with each record. The classification
generator resolves registry identifiers to canonical breed IDs, de-duplicates
variant entries within a category, and preserves non-final recognition as
`pending-recognition`.

No classification is inferred from another registry. A source record without
an official category remains unclassified, and the absence is documented. Run
the audits, review their diffs, then run `npm run generate:classifications` to
rebuild both species files deterministically.
