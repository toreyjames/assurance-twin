/**
 * Verifies reconciliation metrics for the transportation-dot-large demo.
 * Run: node scripts/verify-metric-mapping.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import Papa from 'papaparse'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const sampleDir = path.join(root, 'public/samples/aigne/transportation/large')

function mergeDiscoveryDuplicates(rows) {
  const byTag = new Map()
  const noTag = []
  for (const row of rows) {
    if (!row?.tag_id) {
      noTag.push({ ...row, _sourceLabels: row._sourceLabel ? [row._sourceLabel] : [] })
      continue
    }
    const existing = byTag.get(row.tag_id)
    if (!existing) {
      byTag.set(row.tag_id, { ...row, _sourceLabels: row._sourceLabel ? [row._sourceLabel] : [] })
      continue
    }
    const merged = { ...existing }
    for (const key of Object.keys(row)) {
      if (key === '_sourceLabel' || key === '_sourceLabels') continue
      const incoming = row[key]
      const current = merged[key]
      const incomingEmpty = incoming === undefined || incoming === null || incoming === '' || incoming === 0
      const currentEmpty = current === undefined || current === null || current === '' || current === 0
      if (!incomingEmpty && currentEmpty) merged[key] = incoming
    }
    const labels = new Set(existing._sourceLabels || [])
    if (row._sourceLabel) labels.add(row._sourceLabel)
    merged._sourceLabels = Array.from(labels)
    byTag.set(row.tag_id, merged)
  }
  return [...byTag.values(), ...noTag]
}

const server = await createServer({
  root,
  logLevel: 'silent',
  server: { middlewareMode: true },
  appType: 'custom'
})

try {
  const { normalizeDataset } = await server.ssrLoadModule('/src/lib/context/constructor.js')
  const { performMatching } = await server.ssrLoadModule('/src/lib/context/constructor.js')
  const { buildPlantMapModel } = await server.ssrLoadModule('/src/lib/core/plant-map-model.js')
  const { attachEvidence } = await server.ssrLoadModule('/src/lib/core/evidence-builder.js')
  const { epistemicStateFromAsset } = await server.ssrLoadModule('/src/lib/core/ontology.js')
  const { canonicalCveCount, assetHasCves } = await server.ssrLoadModule('/src/lib/core/cve-count.js')

  const files = [
    { name: 'engineering_baseline_large.csv', type: 'engineering', label: 'Engineering baseline' },
    { name: 'ot_network_discovery_large.csv', type: 'discovery', label: 'Network discovery' },
    { name: 'ot_field_inventory_large.csv', type: 'discovery', label: 'Field inventory' }
  ]

  let allEngineering = []
  let allDiscovery = []

  for (const spec of files) {
    const content = fs.readFileSync(path.join(sampleDir, spec.name), 'utf8')
    const parsed = Papa.parse(content, { header: true, skipEmptyLines: true })
    const rows = normalizeDataset(parsed.data || [], `file-${spec.name}`)
    for (const r of rows) r._sourceLabel = spec.label
    if (spec.type === 'engineering') allEngineering.push(...rows)
    else allDiscovery.push(...rows)
  }

  allDiscovery = mergeDiscoveryDuplicates(allDiscovery)

  const matchResults = performMatching(allEngineering, allDiscovery, null)
  const canonicalAssets = matchResults.matched.map(m => ({
    ...m.engineering,
    ...m.discovered,
    discovered: m.discovered,
    validation: { confidence: 'HIGH' },
    matchConfidence: m.confidence,
    match_type: 'matched',
    _status: 'matched'
  }))
  const blindSpots = matchResults.blindSpots.map(a => ({ ...a, _status: 'blind_spot' }))
  const orphans = matchResults.orphans.map(a => ({ ...a, _status: 'orphan' }))

  const result = {
    assets: canonicalAssets,
    blindSpots,
    orphans,
    summary: {
      matched: matchResults.stats.matchedCount,
      blindSpots: matchResults.stats.blindSpotCount,
      orphans: matchResults.stats.orphanCount,
      crossValidated: canonicalAssets.filter(a =>
        Array.isArray(a.discovered?._sourceLabels) && a.discovered._sourceLabels.length >= 2
      ).length
    }
  }

  const mapModel = buildPlantMapModel(result)
  const s = mapModel.summary
  const allUnified = [...canonicalAssets, ...blindSpots, ...orphans]

  const globalCoverage = s.documented > 0 ? Math.round((s.matched / s.documented) * 100) : 0

  // WorldModel-style average of per-site rates (the bug)
  const bySite = new Map()
  for (const a of allUnified) {
    const site = a.plant || 'Unassigned'
    if (!bySite.has(site)) bySite.set(site, { matched: 0, blind: 0, orphan: 0 })
    const bucket = bySite.get(site)
    const st = a._status
    if (st === 'blind_spot') bucket.blind++
    else if (st === 'orphan') bucket.orphan++
    else bucket.matched++
  }
  const siteRates = [...bySite.values()].map(b => {
    const base = b.matched + b.blind
    return base > 0 ? Math.round((b.matched / base) * 100) : 100
  })
  const avgSiteCoverage = siteRates.length
    ? Math.round(siteRates.reduce((a, b) => a + b, 0) / siteRates.length)
    : 0

  const enriched = [
    ...canonicalAssets.map(a => attachEvidence(a, 'matched')),
    ...blindSpots.map(a => attachEvidence(a, 'blind_spot')),
    ...orphans.map(a => attachEvidence(a, 'orphan'))
  ]
  const epistemicCross = enriched.filter(a =>
    a.evidence?.epistemic_status === 'cross_validated'
  ).length
  const epistemicSupported = enriched.filter(a =>
    a.evidence?.epistemic_status === 'supported'
  ).length

  const streamCross = result.summary.crossValidated
  const observedAssets = [...canonicalAssets, ...orphans]
  const withCvesObserved = observedAssets.filter(assetHasCves).length
  const withCvesMatched = canonicalAssets.filter(assetHasCves).length
  const withVulnsLegacy = canonicalAssets.filter(a => {
    const v = parseInt(a.vulnerabilities) || parseInt(a.discovered?.vulnerabilities) || 0
    return v > 0
  }).length

  const siteSum = [...bySite.values()].reduce((sum, b) => sum + b.matched + b.blind + b.orphan, 0)

  console.log('=== Transportation DOT large — metric audit ===\n')
  console.log('Reconciliation (canonical):')
  console.log(`  matched=${s.matched} blind=${s.blindSpots} orphan=${s.orphans} inScope=${s.inScope} documented=${s.documented}`)
  console.log(`  discovery coverage (global): ${globalCoverage}% (${s.matched}/${s.documented})`)
  console.log(`  discovery coverage (avg per-site — WRONG if shown in UI): ${avgSiteCoverage}%`)
  console.log(`  stream cross-validated (network+field): ${streamCross}`)
  console.log(`  epistemic cross-validated (network+field): ${epistemicCross}`)
  console.log(`  epistemic single-source matched: ${epistemicSupported}`)
  console.log(`  site chip sum: ${siteSum} (should equal inScope ${s.inScope})`)
  console.log('\nCVE counts:')
  console.log(`  with CVEs (observed = matched+orphan): ${withCvesObserved}`)
  console.log(`  with CVEs (matched only, canonical): ${withCvesMatched}`)
  console.log(`  with vulns (matched, legacy vulnerabilities field): ${withVulnsLegacy}`)
  console.log(`  clean matched (canonical): ${canonicalAssets.length - withCvesMatched}`)

  assert.equal(s.matched + s.blindSpots + s.orphans, s.inScope, 'inScope = matched+blind+orphan')
  assert.equal(s.matched + s.blindSpots, s.documented, 'documented = matched+blind')
  assert.equal(siteSum, s.inScope, 'site chips sum to inScope')
  assert.equal(globalCoverage, s.discoveryCoverage, 'plant-map discoveryCoverage is global')
  assert.equal(epistemicCross, streamCross, 'epistemic cross-validated aligns with stream count')
  assert.equal(epistemicSupported, s.matched - streamCross, 'single-source = matched - cross-validated')

  console.log('\nAll mapping checks passed.')
} finally {
  await server.close()
}
