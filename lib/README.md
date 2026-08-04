# Reconciliation core

A generic, domain-agnostic primitive for one question: when two systems of
record both talk about the same world, what do we actually know, and how do
we know it?

Every entity two sources both reference lands in exactly one epistemic
state:

| State            | Meaning                                                              |
|-------------------|-----------------------------------------------------------------------|
| **VERIFIED**       | Source A claims it exists, Source B independently corroborates it, and they agree on what it is. |
| **DISPUTED**       | Corroborated existence, contested facts. Matched, but sources disagree on an attribute. This is the dangerous one - it *looks* resolved because it matched. |
| **UNCORROBORATED** | Claimed by A, no independent evidence from B. ("Blind spot.") |
| **UNCLAIMED**      | Observed by B, no prior claim in A. ("Orphan.")            |

## Why this is domain-agnostic

The mechanic - prioritized identity-key matching, fuzzy fallback, then
attribute-level agreement checking on whatever matched - doesn't know or
care whether Source A is an OT engineering baseline and Source B is a
network discovery tool, or whether A is an HR roster and B is a directory
service. See `tools/reconciliation-proof.mjs` for both running through the
identical function with nothing but config and data changed.

This module is where `api/analyze-oil-gas-flexible.js`'s
`performFlexibleMatching` came from - that function is one instance of this
pattern, hardcoded to OT field names (tag_id/ip_address/hostname/mac). This
version generalizes it: the OT app's matching becomes one config, not one
codebase.

## Usage

```js
import { reconcile } from './reconciliation.js'

const result = reconcile(sourceA, sourceB, {
  identityKeys: ['tag_id', 'ip_address'],       // tried in order, exact match, first wins
  fuzzyFields: [['device_type', 'manufacturer']], // last-resort fuzzy pairing
  compareFields: ['manufacturer'],               // checked on any match; disagreement -> DISPUTED
  ownerA: 'Engineering',
  ownerB: 'OT Discovery'
})

// result.matched      - [{ a, b, status: 'verified' | 'disputed', disputes, matchType, matchConfidence }]
// result.blindSpots    - Source A records with no independent corroboration
// result.orphans       - Source B records with no prior claim
// result.stats         - counts + agreementPercent
```

## What this isn't (yet)

- No persistence - every call is stateless, same as the app it came from.
- No write path - this only reports disagreement, it doesn't resolve it or
  touch either source system.
- Not wired into the OT app yet - it's a proven-standalone primitive. Migrating
  `analyze-oil-gas-flexible.js` onto this core is the next step if the goal is
  one engine with many domain configs instead of three drifting copies.
