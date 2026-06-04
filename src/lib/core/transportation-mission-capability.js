import transportationTemplate from '../templates/transportation.json'
import { evaluateReferenceModel } from './transportation-reference-model.js'

const PATTERNS = {
  atms_server: [/atms/i, /traffic management/i],
  historian: [/historian/i],
  firewall: [/firewall/i],
  jump_host: [/jump host/i, /\bjump\b/i],
  remote_access: [/remote access/i, /vpn/i, /concentrator/i],
  cctv: [/cctv/i, /camera/i],
  dms: [/dynamic message sign/i, /\bdms\b/i],
  signal_controller: [/signal controller/i],
  ramp_meter: [/ramp meter/i],
  vehicle_detector: [/detector/i, /radar/i],
  rwis: [/rwis/i, /weather station/i],
  bridge_controller: [/bridge controller/i],
  pump_plc: [/pump station plc/i, /pump plc/i],
  field_switch: [/field ethernet switch/i, /field switch/i, /\bswitch\b/i],
  cellular_router: [/cellular router/i, /\brouter\b/i],
  core_router: [/core router/i],
  ups: [/\bups\b/i],
  nms: [/network management/i]
}

const GROUPS = {
  tmc_core: ['atms_server'],
  surveillance_field: ['cctv', 'vehicle_detector'],
  signaling_field: ['signal_controller', 'ramp_meter'],
  weather_field: ['rwis'],
  comms_backbone: ['field_switch', 'cellular_router', 'core_router'],
  traveler_information: ['dms'],
  bridge_ops: ['bridge_controller'],
  flood_ops: ['pump_plc'],
  security_access: ['firewall', 'jump_host', 'remote_access']
}

const GROUP_LABELS = {
  tmc_core: 'TMC core',
  surveillance_field: 'surveillance field devices',
  signaling_field: 'signal coordination field devices',
  weather_field: 'RWIS weather sensing',
  comms_backbone: 'communications backbone',
  traveler_information: 'traveler information signs',
  bridge_ops: 'bridge operations controls',
  flood_ops: 'pump flood controls',
  security_access: 'remote-access governance controls',
  ups: 'backup power'
}

// Presence thresholds to avoid false confidence from a single representative device.
const GROUP_MIN_COUNTS = {
  tmc_core: 2,
  surveillance_field: 3,
  signaling_field: 4,
  weather_field: 2,
  comms_backbone: 4,
  traveler_information: 2,
  bridge_ops: 1,
  flood_ops: 1,
  security_access: 3,
  ups: 1
}

const MISSIONS = [
  {
    id: 'surveillance',
    label: 'Real-time surveillance',
    required: ['tmc_core', 'surveillance_field', 'comms_backbone']
  },
  {
    id: 'traveler_info',
    label: 'Traveler information',
    required: ['tmc_core', 'traveler_information', 'comms_backbone']
  },
  {
    id: 'signal_coordination',
    label: 'Signal coordination',
    required: ['tmc_core', 'signaling_field', 'comms_backbone']
  },
  {
    id: 'incident_response',
    label: 'Incident response',
    required: ['tmc_core', 'surveillance_field', 'traveler_information', 'comms_backbone']
  },
  {
    id: 'weather_response',
    label: 'Road weather response',
    required: ['tmc_core', 'weather_field', 'comms_backbone']
  },
  {
    id: 'bridge_operations',
    label: 'Bridge operations',
    required: ['bridge_ops', 'comms_backbone']
  },
  {
    id: 'pump_operations',
    label: 'Pump flood control',
    required: ['flood_ops', 'comms_backbone', 'ups']
  },
  {
    id: 'remote_access_governance',
    label: 'Remote access governance',
    required: ['security_access', 'tmc_core']
  }
]

function deviceText(asset) {
  return String(
    asset?.device_type ||
    asset?.ontology?.deviceClass?.label ||
    asset?.tag_id ||
    ''
  ).toLowerCase()
}

function countAssetsMatching(assets, key) {
  const matchers = PATTERNS[key] || []
  let count = 0
  for (const asset of assets || []) {
    const text = deviceText(asset)
    if (matchers.some(re => re.test(text))) count += 1
  }
  return count
}

function evaluateGroup(assets, groupId) {
  const keys = GROUPS[groupId] || [groupId]
  const count = keys.reduce((sum, key) => sum + countAssetsMatching(assets, key), 0)
  const min = GROUP_MIN_COUNTS[groupId] || 1
  return {
    id: groupId,
    min,
    count,
    present: count >= min
  }
}

function missionStatus(requiredCount, satisfiedCount) {
  if (requiredCount === 0) return 'unknown'
  if (satisfiedCount === requiredCount) return 'operable'
  if (satisfiedCount >= Math.ceil(requiredCount * 0.6)) return 'degraded'
  return 'unknown'
}

function normalizeUnit(unit) {
  return String(unit || '').trim().toLowerCase()
}

function countUnits(assets, keyword) {
  const seen = new Set()
  for (const asset of assets || []) {
    const unit = normalizeUnit(asset?.unit || asset?.area)
    if (unit.includes(keyword)) seen.add(unit)
  }
  return seen.size
}

function estimateScope(assets) {
  const tmcUnits = countUnits(assets, 'traffic management center')
  const corridorUnits = countUnits(assets, 'corridor')
  const cabinetUnits = countUnits(assets, 'roadside cabinet')

  const byType = {}
  for (const key of Object.keys(PATTERNS)) {
    byType[key] = countAssetsMatching(assets, key)
  }

  const observedComparable =
    byType.signal_controller +
    byType.cctv +
    byType.dms +
    byType.field_switch +
    byType.cellular_router +
    byType.ups +
    byType.atms_server

  let expectedTypical = 0
  const pu = transportationTemplate.processUnits || {}

  if (tmcUnits > 0 && pu['Traffic Management Center']?.expectedDevices) {
    expectedTypical += tmcUnits * Object.values(pu['Traffic Management Center'].expectedDevices)
      .reduce((sum, d) => sum + (d.typical || 0), 0)
  }
  if (corridorUnits > 0 && pu.Corridor?.expectedDevices) {
    expectedTypical += corridorUnits * Object.values(pu.Corridor.expectedDevices)
      .reduce((sum, d) => sum + (d.typical || 0), 0)
  }
  if (cabinetUnits > 0 && pu['Roadside Cabinets']?.expectedDevices) {
    expectedTypical += cabinetUnits * Object.values(pu['Roadside Cabinets'].expectedDevices)
      .reduce((sum, d) => sum + (d.typical || 0), 0)
  }

  const coveragePct = expectedTypical > 0
    ? Math.round((observedComparable / expectedTypical) * 100)
    : 0

  let status = 'unknown'
  let label = 'Unknown scope'
  if (expectedTypical > 0 && coveragePct < 25) {
    status = 'sample'
    label = 'Sample-scale evidence'
  } else if (expectedTypical > 0 && coveragePct < 60) {
    status = 'partial'
    label = 'Partial scope evidence'
  } else if (expectedTypical > 0) {
    status = 'broad'
    label = 'Broad scope evidence'
  }

  const note = expectedTypical > 0
    ? `${observedComparable} comparable field assets observed vs ~${expectedTypical} typical for declared units`
    : 'Insufficient unit context to estimate expected scope'

  return {
    tmcUnits,
    corridorUnits,
    cabinetUnits,
    observedComparable,
    expectedTypical,
    coveragePct,
    status,
    label,
    note
  }
}

function evaluateMissionConfidence(summary) {
  if (summary.unknown > 0) {
    return {
      status: 'limited',
      label: 'Limited mission confidence',
      note: `${summary.unknown} mission${summary.unknown === 1 ? '' : 's'} cannot be asserted from the supplied evidence`
    }
  }
  if (summary.degraded > 0) {
    return {
      status: 'qualified',
      label: 'Qualified mission confidence',
      note: `${summary.degraded} mission${summary.degraded === 1 ? '' : 's'} depend on incomplete supporting classes`
    }
  }
  return {
    status: 'strong',
    label: 'Strong mission confidence',
    note: 'All modeled mission dependency classes meet minimum evidence thresholds'
  }
}

function buildConfidenceStatement(inventory, mission) {
  if (inventory.status === 'sample') {
    return `This is sample evidence: useful for mission reasoning, not for asserting DOT-wide inventory completeness. ${mission.note}.`
  }
  if (inventory.status === 'partial') {
    return `This is partial inventory evidence: mission conclusions are directional until remaining declared units are reconciled. ${mission.note}.`
  }
  if (inventory.status === 'broad') {
    return `This is broad inventory evidence for the declared unit scope. ${mission.note}.`
  }
  return `Inventory scope is unknown: mission confidence is limited until expected DOT units and source coverage are declared. ${mission.note}.`
}

function missionDeviceClasses(mission) {
  const classes = new Set()
  for (const groupId of mission.required) {
    const keys = GROUPS[groupId] || [groupId]
    for (const key of keys) classes.add(key)
  }
  return Array.from(classes)
}

function missionScopeExpectation(mission, reference) {
  if (!reference || reference.expected.typical <= 0) return null
  const classes = missionDeviceClasses(mission)
  let observed = 0
  let low = 0
  let typical = 0
  let high = 0
  for (const classId of classes) {
    const exp = reference.expected.perClass[classId]
    const obs = reference.observed.perClass[classId] || 0
    observed += obs
    if (exp) {
      low += exp.low
      typical += exp.typical
      high += exp.high
    }
  }
  if (typical === 0) return null
  const ratio = observed / typical
  let coverage
  if (ratio >= 0.8) coverage = 'broad'
  else if (ratio >= 0.4) coverage = 'partial'
  else coverage = 'sample'
  return { observed, low, typical, high, coverage }
}

export function evaluateTransportationMissions(assets) {
  const reference = evaluateReferenceModel(assets)

  const missions = MISSIONS.map(mission => {
    const groups = mission.required.map(groupId => evaluateGroup(assets, groupId))
    const requiredCount = groups.length
    const satisfiedCount = groups.filter(g => g.present).length
    const status = missionStatus(requiredCount, satisfiedCount)
    const missing = groups.filter(g => !g.present).map(g => GROUP_LABELS[g.id] || g.id)
    const scopeExpectation = missionScopeExpectation(mission, reference)

    return {
      id: mission.id,
      label: mission.label,
      status,
      requiredCount,
      satisfiedCount,
      missing,
      scopeExpectation,
      reason: `${satisfiedCount}/${requiredCount} dependency classes meet minimum counts`
    }
  })

  const operable = missions.filter(m => m.status === 'operable').length
  const degraded = missions.filter(m => m.status === 'degraded').length
  const unknown = missions.filter(m => m.status === 'unknown').length
  const summary = { operable, degraded, unknown, total: missions.length }
  const inventory = estimateScope(assets)
  const mission = evaluateMissionConfidence(summary)

  return {
    missions,
    summary,
    scope: inventory,
    reference,
    confidence: {
      inventory,
      mission,
      statement: buildConfidenceStatement(inventory, mission)
    }
  }
}

