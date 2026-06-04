import { classifyDeviceClass, epistemicStateFromAsset } from './ontology.js'

function sourceRefs(asset, status) {
  const refs = []
  if (status !== 'orphan') {
    refs.push({
      source: 'engineering_baseline',
      anchors: [asset.tag_id, asset.plant, asset.unit, asset.device_type].filter(Boolean)
    })
  }
  if (status !== 'blind_spot') {
    refs.push({
      source: 'ot_discovery',
      anchors: [asset.ip_address || asset.discovered_ip, asset.hostname, asset.mac_address, asset.last_seen].filter(Boolean)
    })
  }
  return refs
}

function evidenceRules(asset, status, deviceClass) {
  const rules = [`status:${status}`]
  if (asset.matchType) rules.push(`match:${asset.matchType}`)
  if (asset.matchConfidence != null) rules.push(`match_confidence:${asset.matchConfidence}`)
  if (asset.classification?.tier || asset.security_tier) rules.push(`tier:${asset.classification?.tier || asset.security_tier}`)
  rules.push(`device_class:${deviceClass.id}`)
  rules.push(`layer:${deviceClass.layerKey}`)
  return rules
}

function expectationForStatus(asset, status, deviceClass) {
  if (status === 'blind_spot') {
    return {
      expected: true,
      observed: false,
      rationale: `${deviceClass.label} exists in baseline but lacks network observation.`
    }
  }
  if (status === 'orphan') {
    return {
      expected: false,
      observed: true,
      rationale: `${deviceClass.label} was observed on network without baseline identity.`
    }
  }
  return {
    expected: true,
    observed: true,
    rationale: `${deviceClass.label} appears in both baseline and discovery evidence.`
  }
}

function normalizeStatus(asset) {
  return asset?._status || asset?.match_type || asset?.matchType || 'matched'
}

export function attachEvidence(asset, forcedStatus) {
  const status = forcedStatus || normalizeStatus(asset)
  const deviceClass = classifyDeviceClass(asset)
  const epistemic = epistemicStateFromAsset(asset, status)
  const displayId = asset.tag_id || asset.asset_id || asset.ip_address || 'unknown-asset'

  const evidence = {
    claim: `${displayId} is treated as ${deviceClass.label}`,
    ontology: {
      deviceClass: deviceClass.id,
      layer: deviceClass.layerKey,
      zoneType: deviceClass.zoneType,
      tierHint: deviceClass.tierHint
    },
    sources: sourceRefs(asset, status),
    rules_fired: evidenceRules(asset, status, deviceClass),
    cross_validation: {
      confidence: asset.validation?.confidence || 'UNKNOWN',
      issues: asset.validation?.issues || [],
      checks: asset.validation?.checks || null
    },
    expectation: expectationForStatus(asset, status, deviceClass),
    epistemic_status: epistemic.id,
    epistemic_explanation: epistemic.explanation
  }

  return {
    ...asset,
    _status: status,
    ontology: {
      deviceClass,
      layer: deviceClass.layerKey,
      zoneType: deviceClass.zoneType
    },
    evidence
  }
}

function summarizeEnrichedAssets(enrichedAssets) {
  const summary = {
    total: enrichedAssets.length,
    byEpistemic: {},
    byDeviceClass: {}
  }

  for (const asset of enrichedAssets) {
    const epistemic = asset.evidence?.epistemic_status || 'unknown'
    const classId = asset.ontology?.deviceClass?.id || 'unclassified'
    const classLabel = asset.ontology?.deviceClass?.label || 'Unclassified Device'
    summary.byEpistemic[epistemic] = (summary.byEpistemic[epistemic] || 0) + 1
    if (!summary.byDeviceClass[classId]) {
      summary.byDeviceClass[classId] = { label: classLabel, count: 0 }
    }
    summary.byDeviceClass[classId].count += 1
  }

  return summary
}

export function buildEvidenceBundle({ assets = [], blindSpots = [], orphans = [] } = {}) {
  const matchedAssets = assets.map(asset => attachEvidence(asset, 'matched'))
  const enrichedBlindSpots = blindSpots.map(asset => attachEvidence(asset, 'blind_spot'))
  const enrichedOrphans = orphans.map(asset => attachEvidence(asset, 'orphan'))
  const allAssets = [...matchedAssets, ...enrichedBlindSpots, ...enrichedOrphans]

  return {
    assets: matchedAssets,
    blindSpots: enrichedBlindSpots,
    orphans: enrichedOrphans,
    summary: summarizeEnrichedAssets(allAssets)
  }
}
