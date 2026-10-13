# Breed classification audit — 2026-10-13

## Model decision

A classification is an assertion made by a named authority under a versioned
taxonomy. It is not an intrinsic property of a canonical breed. Taxonomies,
categories, and memberships therefore have independent stable identifiers,
statuses, and provenance.

Categories may form a hierarchy through `parentId`. A membership always names
both its taxonomy and category so consumers can query efficiently while the
validator prevents cross-taxonomy links. Historical memberships remain in the
catalog with effective dates when those dates are known.

## Initial AKC snapshot

The initial dataset uses the American Kennel Club's official breed directory,
retrieved 2026-10-13. Its seven fully recognized breed groups are represented
as `group` categories. Miscellaneous Class is represented as a `class`, and
Foundation Stock Service as a `program`; their memberships are marked
`pending-recognition` rather than current group recognition.

| Category | Type | Memberships | Status |
| --- | --- | ---: | --- |
| Sporting Group | group | 33 | current |
| Hound Group | group | 33 | current |
| Working Group | group | 32 | current |
| Terrier Group | group | 32 | current |
| Toy Group | group | 24 | current |
| Non-Sporting Group | group | 21 | current |
| Herding Group | group | 33 | current |
| Miscellaneous Class | class | 13 | pending-recognition |
| Foundation Stock Service | program | 71 | pending-recognition |

All 292 source entries resolve to a canonical dog breed through their AKC
registry identifier. The generator fails instead of guessing when a source
entry has no unique canonical mapping.

## Scope boundaries

- An identically named category from another registry must use a different
  taxonomy and may have different membership.
- Registry recognition is evidence for that registry only.
- Official aliases, origin assertions, historical names, and authoritative
  breed relationships are suitable future factual additions when provenance is
  available.
- Temperament, suitability, popularity, expected health, and family-fit claims
  remain outside the canonical catalog because they require editorial judgment
  and cannot be represented as stable identity facts.
