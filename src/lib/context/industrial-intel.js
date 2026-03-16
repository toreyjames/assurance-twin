/**
 * INDUSTRIAL INTELLIGENCE MODULE
 * External signal aggregation for plant/facility awareness
 * 
 * Pulls from public APIs to surface: what is happening at industrial sites
 * — permits, compliance changes, enforcement, facility metadata —
 * independent of any client-provided data.
 * 
 * Sources:
 *   EPA ECHO — compliance history, inspections, violations, enforcement
 *   EPA DFR  — detailed facility reports (permits, programs, regulatory footprint)
 * 
 * Future:
 *   IIR      — capital projects, turnarounds, offline events (commercial API)
 *   OSHA ITA — injury/illness patterns
 *   Federal Permitting Dashboard — major infrastructure permits
 */

const ECHO_BASE = 'https://echodata.epa.gov/echo'

// ============================================================================
// SEARCH — find facilities and aggregate compliance signals
// ============================================================================

/**
 * Search EPA ECHO for facilities matching criteria
 * Returns aggregate compliance/enforcement stats and actionable signals
 */
export async function searchFacilities({ name, state, city, zip } = {}) {
  const params = new URLSearchParams({ output: 'JSON', p_act: 'Y', responseset: '100' })
  if (name) params.set('p_fn', name)
  if (state) params.set('p_st', state)
  if (zip) params.set('p_zip', zip)
  if (city) params.set('p_ct', city)

  const url = `${ECHO_BASE}/echo_rest_services.get_facilities?${params.toString()}`
  console.log('[INTEL] ECHO search:', url)

  const res = await fetch(url, { signal: AbortSignal.timeout(25000) })
  if (!res.ok) throw new Error(`ECHO returned ${res.status}`)

  const data = await res.json()
  const r = data?.Results
  if (!r) throw new Error('No results from ECHO')

  const aggregate = {
    facilitiesFound: parseInt(r.QueryRows, 10) || 0,
    queryId: r.QueryID,
    totalPenalties: r.TotalPenalties || '$0',
    facilitiesWithViolations: parseInt(r.CVRows, 10) || 0,
    facilitiesWithSevereViolations: parseInt(r.SVRows, 10) || 0,
    facilitiesInspected: parseInt(r.INSPRows, 10) || 0,
    formalEnforcementActions: parseInt(r.FEARows, 10) || 0,
    informalEnforcementActions: parseInt(r.InfFEARows, 10) || 0
  }

  return { aggregate, signals: extractSearchSignals(aggregate) }
}

// ============================================================================
// DETAIL — full facility report by EPA Registry ID
// ============================================================================

/**
 * Get detailed facility report from EPA ECHO DFR
 * Returns permits, programs, regulatory footprint, and signals
 */
export async function getFacilityDetail(registryId) {
  const url = `${ECHO_BASE}/dfr_rest_services.get_dfr?p_id=${encodeURIComponent(registryId)}&output=JSON`
  console.log('[INTEL] DFR detail:', url)

  const res = await fetch(url, { signal: AbortSignal.timeout(25000) })
  if (!res.ok) throw new Error(`DFR returned ${res.status}`)

  const data = await res.json()
  const r = data?.Results
  if (!r) throw new Error('No results from DFR')

  const permits = (r.Permits || []).map(p => ({
    statute: p.Statute || 'FRS',
    system: p.EPASystem,
    sourceId: p.SourceID,
    name: p.FacilityName,
    status: p.FacilityStatus,
    universe: p.Universe || null,
    areas: p.Areas || null,
    sic: p.SIC,
    naics: p.NAICS,
    lat: p.Latitude,
    lng: p.Longitude
  }))

  const facility = permits.find(p => p.name)
  const programs = [...new Set(permits.map(p => p.statute).filter(s => s && s !== 'FRS'))]

  return {
    facility: facility ? {
      name: facility.name,
      lat: facility.lat,
      lng: facility.lng,
      sic: facility.sic,
      naics: facility.naics,
      status: facility.status
    } : null,
    permits,
    programs,
    signals: extractDetailSignals(permits, programs)
  }
}

// ============================================================================
// COMBINED INTELLIGENCE
// ============================================================================

/**
 * Pull combined search + detail intelligence for a facility
 */
export async function getIntelligence({ name, state, city, zip, registryId } = {}) {
  const result = { search: null, detail: null, allSignals: [], errors: [], timestamp: new Date().toISOString() }

  if (name || state || zip) {
    try {
      result.search = await searchFacilities({ name, state, city, zip })
      result.allSignals.push(...result.search.signals)
    } catch (err) {
      result.errors.push({ source: 'ECHO_search', error: err.message })
    }
  }

  if (registryId) {
    try {
      result.detail = await getFacilityDetail(registryId)
      result.allSignals.push(...result.detail.signals)
    } catch (err) {
      result.errors.push({ source: 'ECHO_DFR', error: err.message })
    }
  }

  return result
}

// ============================================================================
// SIGNAL EXTRACTION
// ============================================================================

function extractSearchSignals(agg) {
  const signals = []
  const penaltyNum = parseFloat((agg.totalPenalties || '').replace(/[$,]/g, '')) || 0

  if (penaltyNum > 1000000) {
    signals.push({
      type: 'HIGH_TOTAL_PENALTIES',
      severity: 'high',
      detail: `${agg.totalPenalties} total penalties across ${agg.facilitiesFound} facilities`,
      implication: 'Significant enforcement activity — likely driving capital investment or process changes'
    })
  }

  if (agg.facilitiesWithSevereViolations > 0) {
    signals.push({
      type: 'SEVERE_VIOLATIONS_PRESENT',
      severity: 'high',
      detail: `${agg.facilitiesWithSevereViolations} facilities with severe violations`,
      implication: 'Severe violations often trigger consent decrees, mandated upgrades, or operational changes'
    })
  }

  if (agg.formalEnforcementActions > 3) {
    signals.push({
      type: 'HIGH_ENFORCEMENT',
      severity: 'high',
      detail: `${agg.formalEnforcementActions} formal enforcement actions`,
      implication: 'Elevated regulatory pressure — expect remediation projects and equipment changes'
    })
  }

  if (agg.facilitiesFound > 0 && agg.facilitiesInspected / agg.facilitiesFound > 0.5) {
    signals.push({
      type: 'HIGH_INSPECTION_RATE',
      severity: 'medium',
      detail: `${agg.facilitiesInspected} of ${agg.facilitiesFound} facilities inspected`,
      implication: 'Above-average regulatory scrutiny in this area'
    })
  }

  return signals
}

function extractDetailSignals(permits, programs) {
  const signals = []
  const statuses = permits.map(p => p.status).filter(Boolean)

  if (statuses.includes('INACTIVE') && statuses.includes('Operating')) {
    signals.push({
      type: 'MIXED_STATUS',
      severity: 'medium',
      detail: 'Facility has both active and inactive program registrations',
      implication: 'May indicate unit decommissioning, process changes, or equipment transitions'
    })
  }

  if (permits.some(p => (p.universe || '').includes('Major'))) {
    signals.push({
      type: 'MAJOR_EMITTER',
      severity: 'info',
      detail: 'Classified as major emissions source',
      implication: 'Subject to stricter requirements — upgrades/changes require permits'
    })
  }

  if (programs.length > 3) {
    signals.push({
      type: 'MULTI_PROGRAM',
      severity: 'info',
      detail: `Subject to ${programs.length} regulatory programs: ${programs.join(', ')}`,
      implication: 'Complex regulatory footprint — changes may require multi-program coordination'
    })
  }

  return signals
}

export default { searchFacilities, getFacilityDetail, getIntelligence }
