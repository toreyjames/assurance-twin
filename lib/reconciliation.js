// Generic reconciliation core: an epistemic-grounding primitive.
//
// The question this answers, for every entity two systems both talk about,
// is not "what's true" - it's "what do we know, and how do we know it":
//
//   VERIFIED      - A claims it exists, B independently corroborates it,
//                    and they agree on what it is.
//   DISPUTED      - A claims it exists, B independently corroborates it,
//                    but they disagree on what it is (matched identity,
//                    contested facts). This is the dangerous one - it
//                    *looks* resolved because it matched.
//   UNCORROBORATED (blind spot) - A claims it, no independent evidence
//                    from B.
//   UNCLAIMED     (orphan) - B observed it, no prior claim in A.
//
// Matching two disagreeing systems-of-record isn't an OT-specific problem -
// it's the same mechanic everywhere: exact-match on a prioritized list of
// identity keys, fall back to fuzzy similarity, then check the matched pairs
// for factual agreement before calling anything "verified".
// analyze-oil-gas-flexible.js's performFlexibleMatching is one hardcoded
// instance of this. This is the same mechanic, generalized to config.
//
// reconcile(sourceA, sourceB, config) where config is:
//   identityKeys: string[]       - fields tried in order, exact match, first wins
//   fuzzyFields:  [string,string][] - optional field-pairs tried as a last resort
//                                     (both records must match on both fields, case-insensitive)
//   compareFields: string[]      - fields checked for agreement once matched;
//                                   any mismatch marks the pair DISPUTED instead of VERIFIED
//   ownerA, ownerB: string        - labels for who/what each side represents,
//                                   carried through onto every finding
export function reconcile(sourceA, sourceB, config = {}) {
  const {
    identityKeys = [],
    fuzzyFields = [],
    compareFields = [],
    ownerA = 'Source A',
    ownerB = 'Source B'
  } = config

  const matched = []
  const usedB = new Set()

  const identityOf = (record, keys) => keys.map(k => record[k]).filter(Boolean).join('|')

  const disputesFor = (a, b) => compareFields.filter(f =>
    a[f] != null && b[f] != null && String(a[f]).toLowerCase() !== String(b[f]).toLowerCase()
  )

  const recordMatch = (a, b, matchType, matchKey, matchConfidence) => {
    const disputes = disputesFor(a, b)
    matched.push({
      a, b,
      matchType, matchKey, matchConfidence,
      status: disputes.length > 0 ? 'disputed' : 'verified',
      disputes: disputes.map(f => ({ field: f, [ownerA]: a[f], [ownerB]: b[f] })),
      ownerA, ownerB
    })
    usedB.add(identityOf(b, identityKeys))
  }

  for (const key of identityKeys) {
    for (const a of sourceA) {
      if (!a[key]) continue
      if (matched.find(m => m.a === a)) continue

      const b = sourceB.find(b => b[key] && b[key] === a[key] && !usedB.has(identityOf(b, identityKeys)))
      if (b) recordMatch(a, b, `exact_${key}`, key, 100 - identityKeys.indexOf(key) * 5)
    }
  }

  for (const [fieldX, fieldY] of fuzzyFields) {
    for (const a of sourceA) {
      if (matched.find(m => m.a === a)) continue
      if (!a[fieldX] || !a[fieldY]) continue

      const b = sourceB.find(b =>
        !usedB.has(identityOf(b, identityKeys)) &&
        b[fieldX] && String(b[fieldX]).toLowerCase() === String(a[fieldX]).toLowerCase() &&
        b[fieldY] && String(b[fieldY]).toLowerCase() === String(a[fieldY]).toLowerCase()
      )
      if (b) recordMatch(a, b, `fuzzy_${fieldX}_${fieldY}`, `${fieldX}+${fieldY}`, 60)
    }
  }

  const blindSpots = sourceA.filter(a => !matched.find(m => m.a === a))
  const orphans = sourceB.filter(b => !usedB.has(identityOf(b, identityKeys)))
  const verifiedCount = matched.filter(m => m.status === 'verified').length
  const disputedCount = matched.filter(m => m.status === 'disputed').length

  return {
    matched,
    blindSpots,
    orphans,
    stats: {
      totalA: sourceA.length,
      totalB: sourceB.length,
      matchedCount: matched.length,
      verifiedCount,
      disputedCount,
      agreementPercent: sourceA.length > 0 ? Math.round((matched.length / sourceA.length) * 100) : 0,
      ownerA,
      ownerB
    }
  }
}
