/**
 * Transportation doctrine crosswalk.
 *
 * Agencies declare their operating model in publicly available doctrine:
 * Statewide ITS Architecture, TSMO Implementation Plan, Traffic Incident
 * Management (TIM) Strategic Plan, Cybersecurity Master Plan, federal
 * funding instruments (IIJA/MAP-21), FHWA performance management rules,
 * and engineering safety standards (IEC 61511, AASHTO movable bridge).
 *
 * Each declaration is a *claim about what the agency does and what
 * therefore must exist to support it*. This module reads each claim against
 * the observed evidence (via the reference model + mission capability) and
 * returns a crosswalk: confirmed, partial, unobserved, or contradicted.
 *
 * This is the move no vendor can make. Vendors see only their own data.
 * This module reads the agency's own published doctrine back to them and
 * shows where doctrine and observed reality don't yet line up.
 */

// -----------------------------------------------------------------------------
// Doctrine claims
//
// Each claim:
//   id            stable identifier
//   source        the doctrine document the claim is drawn from
//   sourceType    programmatic | regulatory | engineering | cybersecurity
//   declared      one-line operator-facing statement of the claim
//   requires      device classes that must be observed for the claim to be confirmed
//   strengthens   optional classes that raise confidence
//   minimumScope  scope units the agency must have declared
//   evidenceFor   builds an operator-facing evidence sentence
//   gapFor        builds an operator-facing gap sentence
// -----------------------------------------------------------------------------

export const DOCTRINE_CLAIMS = [
  {
    id: 'tsmo_central_operations',
    source: 'TSMO Implementation Plan',
    sourceType: 'programmatic',
    declared: '24/7 central traffic operations from a Traffic Management Center.',
    requires: ['atms_server', 'historian'],
    strengthens: ['nms', 'identity', 'core_router'],
    minimumScope: { tmc: 1 }
  },
  {
    id: 'its_corridor_surveillance',
    source: 'Statewide ITS Architecture',
    sourceType: 'programmatic',
    declared: 'Continuous freeway and arterial corridor surveillance with CCTV and vehicle detection.',
    requires: ['cctv', 'vehicle_detector'],
    strengthens: ['ramp_meter'],
    minimumScope: { corridor: 1 }
  },
  {
    id: 'its_traveler_information',
    source: 'Statewide ITS Architecture',
    sourceType: 'programmatic',
    declared: 'Real-time traveler information dissemination via DMS network on instrumented corridors.',
    requires: ['dms', 'atms_server'],
    strengthens: ['core_router'],
    minimumScope: { corridor: 1 }
  },
  {
    id: 'its_signal_coordination',
    source: 'Statewide ITS Architecture',
    sourceType: 'programmatic',
    declared: 'Arterial signal coordination across managed corridors.',
    requires: ['signal_controller'],
    strengthens: ['atms_server', 'field_switch'],
    minimumScope: { corridor: 1 }
  },
  {
    id: 'tim_incident_coordination',
    source: 'Traffic Incident Management Strategic Plan',
    sourceType: 'programmatic',
    declared: 'Statewide incident management coordination across districts (CCTV + DMS + central dispatch).',
    requires: ['cctv', 'dms', 'atms_server'],
    strengthens: ['historian'],
    minimumScope: { tmc: 1, corridor: 1 }
  },
  {
    id: 'rwis_weather_response',
    source: 'Statewide ITS Architecture',
    sourceType: 'programmatic',
    declared: 'Road weather monitoring with central historian integration in weather-vulnerable corridors.',
    requires: ['rwis'],
    strengthens: ['historian', 'atms_server'],
    minimumScope: { rwis_site: 1 }
  },
  {
    id: 'bridge_safety_ops',
    source: 'Movable Bridge Operating Plan (AASHTO / IEC 61511)',
    sourceType: 'engineering',
    declared: 'Movable / instrumented bridges operated with controller + supervisory link.',
    requires: ['bridge_controller'],
    strengthens: ['cctv', 'hmi'],
    minimumScope: { bridge: 1 }
  },
  {
    id: 'pump_flood_monitoring',
    source: 'Stormwater Asset Management Plan',
    sourceType: 'engineering',
    declared: 'Flood-control pump stations monitored with PLC + supervisory telemetry.',
    requires: ['pump_plc'],
    strengthens: ['hmi'],
    minimumScope: { pump_station: 1 }
  },
  {
    id: 'fhwa_pm3_reliability_reporting',
    source: 'FHWA PM3 System Performance Rule (23 CFR 490)',
    sourceType: 'regulatory',
    declared: 'Agency reports travel-time reliability requiring continuous corridor traffic data collection.',
    requires: ['vehicle_detector'],
    strengthens: ['historian', 'atms_server'],
    minimumScope: { corridor: 1 },
    // PM3 is a scale claim, not a presence claim: continuous reporting
    // requires detector density across declared corridors, not a single device.
    custom: (context) => {
      const { reference } = context
      if (!scopeMet(reference, { corridor: 1 })) {
        return {
          status: 'unknown',
          evidence: 'No declared corridor scope to evaluate against.',
          gap: 'Declare corridor scope to assess reliability reporting capability.'
        }
      }
      const observed = observedCount(reference, 'vehicle_detector')
      const expected = reference?.expected?.perClass?.vehicle_detector?.typical || 0
      const ratio = expected > 0 ? observed / expected : 0
      const hasHistorian = observedCount(reference, 'historian') > 0

      if (ratio >= 0.7 && hasHistorian) {
        return {
          status: 'confirmed',
          evidence: `Observed ${observed} vehicle detector${observed === 1 ? '' : 's'} against ~${expected} typical for declared corridor scope, with historian present.`,
          gap: 'Detector coverage and historian integration support continuous reliability reporting; validate sensor recency and data pipeline.'
        }
      }
      if (observed > 0) {
        return {
          status: 'partial',
          evidence: `Observed ${observed} vehicle detector${observed === 1 ? '' : 's'} against ~${expected} typical for declared corridor scope${hasHistorian ? '' : '; historian not observed'}.`,
          gap: 'Detector density insufficient for continuous corridor reliability reporting. Federal-aid reporting eligibility likely contested.'
        }
      }
      return {
        status: 'unobserved',
        evidence: 'No corridor vehicle-detection evidence observed.',
        gap: 'PM3 reliability reporting requires continuous corridor traffic data — no detector evidence in current dataset.'
      }
    }
  },
  {
    id: 'cyber_remote_access_governance',
    source: 'Agency Cybersecurity Master Plan / CISA OT Asset Inventory Guidance',
    sourceType: 'cybersecurity',
    declared: 'Vendor remote access governed through jump host + VPN concentrator with identity controls.',
    requires: ['jump_host', 'vpn_concentrator'],
    strengthens: ['identity', 'firewall'],
    minimumScope: { tmc: 1 }
  },
  {
    id: 'fhwa_its_asset_reporting',
    source: 'IIJA / FHWA ITS Deployment Tracking',
    sourceType: 'regulatory',
    declared: 'Agency maintains a complete ITS asset inventory eligible for federal-aid program reporting.',
    requires: [],
    strengthens: [],
    minimumScope: {},
    custom: (context) => {
      const shadow = context.reference?.shadow?.severity
      const observed = context.reference?.observed?.comparable || 0
      const expected = context.reference?.expected?.typical || 0
      if (expected === 0) {
        return {
          status: 'unknown',
          evidence: 'Declared scope is too thin to evaluate inventory completeness.',
          gap: 'Declare TMC, corridors, cabinet zones, bridges, and other operational units to evaluate this claim.'
        }
      }
      if (shadow === 'minimal') {
        return {
          status: 'confirmed',
          evidence: `Observed ${observed} comparable assets against ~${expected} typical for declared scope.`,
          gap: 'Inventory is consistent with declared scope. Continue periodic reconciliation to maintain reporting eligibility.'
        }
      }
      if (shadow === 'modest') {
        return {
          status: 'partial',
          evidence: `Observed ${observed} of ~${expected} typical for declared scope.`,
          gap: 'Modest undocumented population. Reconcile shadow assets before annual federal-aid reporting cycle.'
        }
      }
      return {
        status: 'unobserved',
        evidence: `Observed ${observed} of ~${expected} typical for declared scope.`,
        gap: 'Many undocumented assets likely. Inventory completeness insufficient for defensible federal-aid reporting.'
      }
    }
  }
]

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function observedCount(reference, classId) {
  return reference?.observed?.perClass?.[classId] || 0
}

function scopeMet(reference, minimumScope) {
  if (!minimumScope) return true
  for (const [unit, count] of Object.entries(minimumScope)) {
    if ((reference?.declaredScope?.[unit] || 0) < count) return false
  }
  return true
}

function describeScope(minimumScope) {
  if (!minimumScope) return ''
  const parts = []
  for (const [unit, count] of Object.entries(minimumScope)) {
    const label = unit.replace(/_/g, ' ')
    parts.push(`${count} ${label}${count === 1 ? '' : 's'}`)
  }
  return parts.join(' and ')
}

function classLabel(classId) {
  return classId.replace(/_/g, ' ')
}

// -----------------------------------------------------------------------------
// Standard evaluation: count required + strengthening classes present
// -----------------------------------------------------------------------------

function evaluateStandardClaim(claim, context) {
  const { reference } = context
  if (!scopeMet(reference, claim.minimumScope)) {
    return {
      status: 'unknown',
      evidence: `Required declared scope (${describeScope(claim.minimumScope)}) not present in supplied evidence.`,
      gap: 'Cannot evaluate doctrine claim until the agency declares the relevant operational scope.'
    }
  }

  const required = claim.requires || []
  const strengthens = claim.strengthens || []

  const requiredObserved = required.filter(id => observedCount(reference, id) > 0)
  const strengthensObserved = strengthens.filter(id => observedCount(reference, id) > 0)

  const requiredRatio = required.length === 0 ? 1 : requiredObserved.length / required.length

  let status
  if (required.length === 0) status = 'confirmed'
  else if (requiredRatio === 1) status = 'confirmed'
  else if (requiredRatio >= 0.5) status = 'partial'
  else if (requiredRatio > 0) status = 'partial'
  else status = 'unobserved'

  const observedSummary = [...requiredObserved, ...strengthensObserved]
    .map(id => `${classLabel(id)} (${observedCount(reference, id)})`)
    .join(', ')

  const missingRequired = required.filter(id => observedCount(reference, id) === 0)

  const evidence = observedSummary
    ? `Observed: ${observedSummary}.`
    : 'No supporting device classes observed in evidence.'

  let gap
  if (status === 'confirmed') {
    gap = 'All required device classes observed. Capability is supportable from current evidence; scale and resilience may still need validation.'
  } else if (status === 'partial') {
    gap = missingRequired.length > 0
      ? `Missing required classes: ${missingRequired.map(classLabel).join(', ')}.`
      : 'Required classes present at sample scale; expected population not yet validated.'
  } else if (status === 'unobserved') {
    gap = `Doctrine declares this capability but no supporting evidence observed. Required classes: ${required.map(classLabel).join(', ')}.`
  } else {
    gap = 'Capability cannot be assessed from current evidence.'
  }

  return { status, evidence, gap }
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export function evaluateDoctrine(context = {}) {
  const claims = DOCTRINE_CLAIMS.map(claim => {
    const verdict = claim.custom
      ? claim.custom(context)
      : evaluateStandardClaim(claim, context)

    return {
      id: claim.id,
      source: claim.source,
      sourceType: claim.sourceType,
      declared: claim.declared,
      status: verdict.status,
      evidence: verdict.evidence,
      gap: verdict.gap,
      requires: claim.requires || [],
      strengthens: claim.strengthens || [],
      minimumScope: claim.minimumScope || {}
    }
  })

  const summary = {
    confirmed: claims.filter(c => c.status === 'confirmed').length,
    partial: claims.filter(c => c.status === 'partial').length,
    unobserved: claims.filter(c => c.status === 'unobserved').length,
    contradicted: claims.filter(c => c.status === 'contradicted').length,
    unknown: claims.filter(c => c.status === 'unknown').length,
    total: claims.length
  }

  summary.statement = buildSummaryStatement(summary)

  return { claims, summary }
}

function buildSummaryStatement(summary) {
  const parts = []
  if (summary.confirmed > 0) {
    parts.push(`${summary.confirmed} doctrine claim${summary.confirmed === 1 ? '' : 's'} confirmed by evidence`)
  }
  if (summary.partial > 0) {
    parts.push(`${summary.partial} partial`)
  }
  if (summary.unobserved > 0) {
    parts.push(`${summary.unobserved} declared but unobserved`)
  }
  if (summary.contradicted > 0) {
    parts.push(`${summary.contradicted} contradicted`)
  }
  if (summary.unknown > 0) {
    parts.push(`${summary.unknown} undeterminable`)
  }
  if (parts.length === 0) {
    return 'No doctrine claims evaluated.'
  }
  return `Agency doctrine crosswalk: ${parts.join(', ')}. Doctrine claims are read from public agency plans and federal rules; status is derived from observed evidence only.`
}
