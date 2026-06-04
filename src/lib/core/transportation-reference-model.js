/**
 * Transportation reference model.
 *
 * Reconciliation tells us what the sources agree on. A reference model tells
 * us what should exist for the agency to perform its declared operations.
 * The gap between them is the part of operational reality that no source
 * captured — the most consequential population for an assurance program.
 *
 * Unlike a refinery, a DOT does not have a single physics-derived reference
 * model. It has layered reference frames:
 *
 *   - hard:         safety/engineering must-haves (bridges, pumps, tunnels)
 *   - mission:      components required to perform a declared mission
 *   - statistical:  peer-DOT density patterns (FHWA ITS deployment)
 *   - programmatic: agency's own published ITS / TSMO architecture
 *   - regulatory:   federal funding / compliance instruments
 *
 * This module currently encodes the first three. Programmatic and regulatory
 * references are surfaced as confidence labels until per-agency doctrine
 * crosswalks are wired in.
 */

// -----------------------------------------------------------------------------
// Device classification patterns (kept aligned with mission-capability & topology)
// -----------------------------------------------------------------------------

const CLASS_PATTERNS = {
  atms_server: [/atms/i, /traffic management/i],
  historian: [/historian/i],
  nms: [/network management/i, /\bnms\b/i],
  identity: [/domain controller/i, /\bidentity\b/i, /active directory/i],
  firewall: [/firewall/i],
  jump_host: [/jump host/i, /\bjump\b/i],
  vpn_concentrator: [/vpn/i, /remote access concentrator/i, /concentrator/i, /remote access/i],
  core_router: [/core router/i],
  distribution_switch: [/distribution switch/i],
  field_switch: [/field ethernet switch/i, /field switch/i, /industrial switch/i],
  cellular_router: [/cellular router/i],
  signal_controller: [/signal controller/i],
  ramp_meter: [/ramp meter/i],
  cctv: [/cctv/i, /\bcamera\b/i],
  dms: [/dynamic message sign/i, /\bdms\b/i],
  vehicle_detector: [/detector/i, /\bradar\b/i],
  rwis: [/rwis/i, /weather station/i],
  weigh_controller: [/weigh station/i, /weigh-in-motion/i],
  bridge_controller: [/bridge controller/i],
  pump_plc: [/pump station plc/i, /pump plc/i],
  hmi: [/hmi panel/i, /\bhmi\b/i],
  ups: [/\bups\b/i],
  cabinet_door_sensor: [/cabinet door sensor/i, /door sensor/i]
}

const CLASS_LABELS = {
  atms_server: 'ATMS server',
  historian: 'Historian',
  nms: 'Network management server',
  identity: 'Identity / domain controller',
  firewall: 'Firewall',
  jump_host: 'Jump host',
  vpn_concentrator: 'VPN / remote-access concentrator',
  core_router: 'Core router',
  distribution_switch: 'Distribution switch',
  field_switch: 'Field switch',
  cellular_router: 'Cellular router',
  signal_controller: 'Signal controller',
  ramp_meter: 'Ramp meter controller',
  cctv: 'CCTV camera',
  dms: 'Dynamic message sign',
  vehicle_detector: 'Vehicle detector',
  rwis: 'RWIS weather station',
  weigh_controller: 'Weigh-station controller',
  bridge_controller: 'Bridge controller',
  pump_plc: 'Pump station PLC',
  hmi: 'Local HMI panel',
  ups: 'UPS / backup power',
  cabinet_door_sensor: 'Cabinet door sensor'
}

// Dominant basis per class (used when summing per-class expectations across
// scope units that draw from different reference frames).
const CLASS_BASIS = {
  atms_server: 'mission',
  historian: 'mission',
  nms: 'mission',
  identity: 'mission',
  firewall: 'mission',
  jump_host: 'mission',
  vpn_concentrator: 'mission',
  core_router: 'mission',
  distribution_switch: 'mission',
  field_switch: 'hard',
  cellular_router: 'statistical',
  signal_controller: 'statistical',
  ramp_meter: 'statistical',
  cctv: 'statistical',
  dms: 'statistical',
  vehicle_detector: 'statistical',
  rwis: 'mission',
  weigh_controller: 'mission',
  bridge_controller: 'hard',
  pump_plc: 'hard',
  hmi: 'hard',
  ups: 'hard',
  cabinet_door_sensor: 'statistical'
}

// -----------------------------------------------------------------------------
// Per-scope-unit reference cards
//
// Each entry says: "for one instance of this scope unit, here is the device
// population we would expect, with low / typical / high ranges." Numbers are
// deliberately conservative for a single-instance scope so the model is
// defensible when the agency's actual footprint is much larger.
// -----------------------------------------------------------------------------

const SCOPE_REFERENCES = {
  tmc: {
    label: 'Traffic Management Center',
    basis: 'mission',
    reference: 'Active 24/7 TMC operations: ATMS, historian, network management, identity, perimeter access, network backbone.',
    devices: {
      atms_server:        { low: 1, typical: 1, high: 2 },
      historian:          { low: 1, typical: 1, high: 2 },
      nms:                { low: 1, typical: 1, high: 2 },
      identity:           { low: 1, typical: 1, high: 2 },
      firewall:           { low: 1, typical: 2, high: 4 },
      jump_host:          { low: 1, typical: 1, high: 2 },
      vpn_concentrator:   { low: 1, typical: 1, high: 2 },
      core_router:        { low: 1, typical: 2, high: 4 },
      distribution_switch:{ low: 1, typical: 2, high: 6 }
    }
  },
  corridor: {
    label: 'Roadway corridor',
    basis: 'statistical',
    reference: 'Per FHWA ITS deployment density (peer-DOT averages). Density varies with corridor length, AADT, urban/rural classification.',
    devices: {
      signal_controller:  { low: 2, typical: 8,  high: 30 },
      cctv:               { low: 2, typical: 8,  high: 25 },
      dms:                { low: 1, typical: 3,  high: 10 },
      vehicle_detector:   { low: 2, typical: 6,  high: 20 },
      ramp_meter:         { low: 0, typical: 2,  high: 8 }
    }
  },
  cabinet_zone: {
    label: 'Roadside cabinet location',
    basis: 'hard',
    reference: 'Standard instrumented roadside cabinet: switch + UPS + cellular link, often with physical access sensor.',
    devices: {
      field_switch:        { low: 1, typical: 1, high: 2 },
      ups:                 { low: 1, typical: 1, high: 1 },
      cellular_router:     { low: 0, typical: 1, high: 1 },
      cabinet_door_sensor: { low: 0, typical: 1, high: 1 }
    }
  },
  bridge: {
    label: 'Movable / instrumented bridge',
    basis: 'hard',
    reference: 'IEC 61511 / AASHTO movable-bridge control practice: controller + local visibility + supervisory link.',
    devices: {
      bridge_controller:  { low: 1, typical: 1, high: 2 },
      cctv:               { low: 1, typical: 1, high: 2 },
      hmi:                { low: 0, typical: 1, high: 1 }
    }
  },
  pump_station: {
    label: 'Stormwater / underpass pump station',
    basis: 'hard',
    reference: 'Flood-control pump PLC with local HMI and supervisory telemetry path.',
    devices: {
      pump_plc:           { low: 1, typical: 1, high: 2 },
      hmi:                { low: 0, typical: 1, high: 1 }
    }
  },
  rwis_site: {
    label: 'Road weather information site',
    basis: 'mission',
    reference: 'Per declared RWIS site: one weather station with embedded sensors.',
    devices: {
      rwis:               { low: 1, typical: 1, high: 1 }
    }
  },
  weigh_station: {
    label: 'Weigh-in-motion / commercial vehicle station',
    basis: 'mission',
    reference: 'Per declared weigh station: scale controller with supervisory link.',
    devices: {
      weigh_controller:   { low: 1, typical: 1, high: 2 }
    }
  }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function deviceText(asset) {
  return String(
    asset?.device_type ||
      asset?.ontology?.deviceClass?.label ||
      asset?.tag_id ||
      ''
  ).toLowerCase()
}

function unitText(asset) {
  return String(asset?.unit || asset?.area || asset?.location || '').toLowerCase()
}

function plantText(asset) {
  return String(asset?.plant || asset?.plant_code || asset?.facility || '').toLowerCase()
}

function classifyAsset(asset) {
  const text = deviceText(asset)
  for (const [classId, patterns] of Object.entries(CLASS_PATTERNS)) {
    if (patterns.some(re => re.test(text))) return classId
  }
  return null
}

function uniqueKey(...parts) {
  return parts
    .map(p => String(p || '').trim().toLowerCase())
    .filter(Boolean)
    .join(' :: ')
}

// -----------------------------------------------------------------------------
// Scope derivation
//
// We read declared scope from the unit + plant fields the engineering baseline
// already exposes. This is deliberate: the agency tells us what it operates by
// the structure of its own data, so the reference model is anchored in what
// they themselves declared rather than in something we made up.
// -----------------------------------------------------------------------------

function deriveDeclaredScope(assets) {
  const tmc = new Set()
  const corridor = new Set()
  const cabinet = new Set()
  const bridge = new Set()
  const pump = new Set()
  const rwis = new Set()
  const weigh = new Set()

  for (const asset of assets) {
    const unit = unitText(asset)
    const plant = plantText(asset)
    const area = String(asset?.area || '').toLowerCase()

    // A single statewide TMC may span several rooms (TMC core, DMZ, fiber
    // backhaul, remote-access). They all belong to one logical TMC scope unit,
    // so we key TMCs by plant only.
    const isTmcUnit =
      unit.includes('traffic management center') ||
      unit.includes('dmz') ||
      unit.includes('fiber backhaul') ||
      unit.includes('remote access')
    if (plant.includes('traffic operations') || (isTmcUnit && plant)) {
      tmc.add(uniqueKey(plant))
    }

    if (unit.includes('corridor')) {
      corridor.add(uniqueKey(plant, unit))
    }
    if (unit.includes('roadside cabinet') || unit.includes('cabinet')) {
      // each distinct (plant, area) cabinet location counts as a zone
      cabinet.add(uniqueKey(plant, area || unit))
    }
    if (unit.includes('bridge')) {
      bridge.add(uniqueKey(plant, area || unit))
    }
    if (unit.includes('pump')) {
      pump.add(uniqueKey(plant, area || unit))
    }
    if (unit.includes('rwis') || unit.includes('weather')) {
      rwis.add(uniqueKey(plant, area || unit))
    }
    if (unit.includes('weigh')) {
      weigh.add(uniqueKey(plant, area || unit))
    }
  }

  return {
    tmc: tmc.size,
    corridor: corridor.size,
    cabinet_zone: cabinet.size,
    bridge: bridge.size,
    pump_station: pump.size,
    rwis_site: rwis.size,
    weigh_station: weigh.size
  }
}

// -----------------------------------------------------------------------------
// Expectation rollup
// -----------------------------------------------------------------------------

function rollupExpectations(declaredScope) {
  const perClass = {}
  let low = 0
  let typical = 0
  let high = 0
  const bases = new Set()

  for (const [scopeId, count] of Object.entries(declaredScope)) {
    if (!count) continue
    const card = SCOPE_REFERENCES[scopeId]
    if (!card) continue
    bases.add(card.basis)
    for (const [classId, range] of Object.entries(card.devices)) {
      const entry = perClass[classId] || { id: classId, low: 0, typical: 0, high: 0 }
      entry.low += range.low * count
      entry.typical += range.typical * count
      entry.high += range.high * count
      perClass[classId] = entry
      low += range.low * count
      typical += range.typical * count
      high += range.high * count
    }
  }

  return {
    perClass,
    totals: { low, typical, high },
    referenceBases: Array.from(bases)
  }
}

// -----------------------------------------------------------------------------
// Observed rollup (only classes we model — so we compare like-for-like)
// -----------------------------------------------------------------------------

function rollupObserved(assets) {
  const perClass = {}
  let comparable = 0
  let unclassified = 0

  for (const asset of assets) {
    const classId = classifyAsset(asset)
    if (!classId) {
      unclassified += 1
      continue
    }
    perClass[classId] = (perClass[classId] || 0) + 1
    comparable += 1
  }

  return { perClass, comparable, unclassified }
}

// -----------------------------------------------------------------------------
// Shadow estimate + confidence
// -----------------------------------------------------------------------------

function estimateShadow(observedComparable, expectedTotals) {
  if (expectedTotals.typical <= 0) {
    return {
      low: 0,
      typical: 0,
      high: 0,
      severity: 'unknown',
      label: 'Scope undeclared',
      statement: 'No declared scope detected: cannot estimate undocumented assets.'
    }
  }

  const lowGap = Math.max(0, expectedTotals.low - observedComparable)
  const typicalGap = Math.max(0, expectedTotals.typical - observedComparable)
  const highGap = Math.max(0, expectedTotals.high - observedComparable)
  const ratio = typicalGap / expectedTotals.typical

  let severity
  let label
  if (ratio >= 0.5) {
    severity = 'material'
    label = 'Many undocumented assets likely'
  } else if (ratio >= 0.2) {
    severity = 'modest'
    label = 'Some undocumented assets likely'
  } else {
    severity = 'minimal'
    label = 'Within peer-DOT expected range'
  }

  const statement = severity === 'minimal'
    ? `Observed ${observedComparable} comparable assets against ~${expectedTotals.typical} typical for declared scope: within expected range.`
    : `Observed ${observedComparable} comparable assets against ~${expectedTotals.typical} typical (range ${expectedTotals.low}-${expectedTotals.high}) for declared scope: ~${typicalGap} assets likely undocumented (range ${lowGap}-${highGap}).`

  return {
    low: lowGap,
    typical: typicalGap,
    high: highGap,
    severity,
    label,
    statement
  }
}

function buildConfidenceStatement(declaredScope, expected, observed, shadow) {
  const parts = []
  const scopeParts = []
  if (declaredScope.tmc) scopeParts.push(`${declaredScope.tmc} TMC`)
  if (declaredScope.corridor) scopeParts.push(`${declaredScope.corridor} corridor${declaredScope.corridor === 1 ? '' : 's'}`)
  if (declaredScope.cabinet_zone) scopeParts.push(`${declaredScope.cabinet_zone} cabinet zone${declaredScope.cabinet_zone === 1 ? '' : 's'}`)
  if (declaredScope.bridge) scopeParts.push(`${declaredScope.bridge} bridge${declaredScope.bridge === 1 ? '' : 's'}`)
  if (declaredScope.pump_station) scopeParts.push(`${declaredScope.pump_station} pump station${declaredScope.pump_station === 1 ? '' : 's'}`)
  if (declaredScope.rwis_site) scopeParts.push(`${declaredScope.rwis_site} RWIS site${declaredScope.rwis_site === 1 ? '' : 's'}`)
  if (declaredScope.weigh_station) scopeParts.push(`${declaredScope.weigh_station} weigh station${declaredScope.weigh_station === 1 ? '' : 's'}`)

  if (scopeParts.length === 0) {
    return 'Declared scope is empty: reference-model gap cannot be computed until unit / area context is supplied.'
  }

  parts.push(`Declared scope: ${scopeParts.join(', ')}.`)
  parts.push(`Expected typical population for that scope: ~${expected.typical} (range ${expected.low}-${expected.high}).`)
  parts.push(`Observed comparable assets: ${observed.comparable}.`)
  parts.push(shadow.statement)
  return parts.join(' ')
}

// -----------------------------------------------------------------------------
// Per-class gap construction
// -----------------------------------------------------------------------------

function buildPerClassGaps(expected, observed) {
  const ids = new Set([
    ...Object.keys(expected.perClass),
    ...Object.keys(observed.perClass)
  ])
  const rows = []
  for (const id of ids) {
    const exp = expected.perClass[id] || { low: 0, typical: 0, high: 0 }
    const obs = observed.perClass[id] || 0
    const gap = exp.typical - obs
    rows.push({
      id,
      label: CLASS_LABELS[id] || id,
      basis: CLASS_BASIS[id] || 'statistical',
      observed: obs,
      expectedLow: exp.low,
      expectedTypical: exp.typical,
      expectedHigh: exp.high,
      gap,
      severity: gap >= 5 ? 'material' : gap >= 2 ? 'modest' : gap > 0 ? 'minor' : 'none'
    })
  }
  return rows.sort((a, b) => b.gap - a.gap)
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export function evaluateReferenceModel(assets) {
  const safe = Array.isArray(assets) ? assets : []
  const declaredScope = deriveDeclaredScope(safe)
  const expected = rollupExpectations(declaredScope)
  const observed = rollupObserved(safe)
  const shadow = estimateShadow(observed.comparable, expected.totals)
  const perClass = buildPerClassGaps(expected, observed)
  const statement = buildConfidenceStatement(declaredScope, expected.totals, observed, shadow)

  return {
    declaredScope,
    expected: {
      perClass: expected.perClass,
      low: expected.totals.low,
      typical: expected.totals.typical,
      high: expected.totals.high,
      referenceBases: expected.referenceBases
    },
    observed,
    shadow,
    perClass,
    confidence: {
      statement,
      referenceBases: expected.referenceBases
    }
  }
}

export const __referenceCards = SCOPE_REFERENCES
export const __classLabels = CLASS_LABELS
