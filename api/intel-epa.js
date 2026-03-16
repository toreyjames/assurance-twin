/**
 * INDUSTRIAL INTELLIGENCE API — EPA
 * Query EPA ECHO + DFR for facility awareness and compliance signals
 * 
 * Two modes:
 *   SEARCH: POST { state, city, name, zip }
 *     → aggregate compliance summary for matching facilities
 * 
 *   DETAIL: POST { registryId }
 *     → full facility report (permits, programs, compliance, enforcement)
 * 
 * Sources: EPA ECHO, EPA DFR (Detailed Facility Report)
 */

const ECHO_BASE = 'https://echodata.epa.gov/echo'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST method required' })

  const { registryId, state, city, name, zip } = req.body || {}

  // Route: detail mode (specific facility) vs search mode
  if (registryId) {
    return await handleDetail(res, registryId)
  }

  if (!state && !name && !zip) {
    return res.status(400).json({ error: 'Provide registryId for detail, or at least one of: state, name, zip for search' })
  }

  return await handleSearch(res, { state, city, name, zip })
}

// ============================================================================
// SEARCH MODE — aggregate facility intelligence for a query
// ============================================================================

async function handleSearch(res, { state, city, name, zip }) {
  console.log('[INTEL-EPA] Search:', JSON.stringify({ state, city, name, zip }))

  const result = {
    mode: 'search',
    query: { state, city, name, zip },
    aggregate: null,
    signals: [],
    errors: [],
    timestamp: new Date().toISOString()
  }

  try {
    const params = new URLSearchParams({ output: 'JSON', p_act: 'Y', responseset: '100' })
    if (name) params.set('p_fn', name)
    if (state) params.set('p_st', state)
    if (zip) params.set('p_zip', zip)
    if (city) params.set('p_ct', city)

    const url = `${ECHO_BASE}/echo_rest_services.get_facilities?${params.toString()}`
    const echoRes = await fetch(url, { signal: AbortSignal.timeout(25000) })

    if (!echoRes.ok) {
      result.errors.push({ source: 'ECHO', status: echoRes.status })
      return res.status(200).json(result)
    }

    const data = await echoRes.json()
    const r = data?.Results

    if (!r) {
      result.errors.push({ source: 'ECHO', error: 'No results returned' })
      return res.status(200).json(result)
    }

    result.aggregate = {
      facilitiesFound: parseInt(r.QueryRows, 10) || 0,
      queryId: r.QueryID,
      totalPenalties: r.TotalPenalties || '$0',
      facilitiesWithViolations: parseInt(r.CVRows, 10) || 0,
      facilitiesWithSevereViolations: parseInt(r.SVRows, 10) || 0,
      facilitiesInspected: parseInt(r.INSPRows, 10) || 0,
      formalEnforcementActions: parseInt(r.FEARows, 10) || 0,
      informalEnforcementActions: parseInt(r.InfFEARows, 10) || 0,
      cleanAirAct: parseInt(r.CAARows, 10) || 0,
      cleanWaterAct: parseInt(r.CWARows, 10) || 0,
      rcra: parseInt(r.RCRRows, 10) || 0,
      toxicRelease: parseInt(r.TRIRows, 10) || 0
    }

    // Extract signals from aggregate data
    const agg = result.aggregate
    const penaltyNum = parseFloat((agg.totalPenalties || '').replace(/[$,]/g, '')) || 0

    if (penaltyNum > 1000000) {
      result.signals.push({
        type: 'HIGH_TOTAL_PENALTIES',
        severity: 'high',
        detail: `${agg.totalPenalties} total penalties across ${agg.facilitiesFound} facilities`,
        implication: 'Significant enforcement activity — likely driving capital investment or process changes'
      })
    }

    if (agg.facilitiesWithSevereViolations > 0) {
      result.signals.push({
        type: 'SEVERE_VIOLATIONS_PRESENT',
        severity: 'high',
        detail: `${agg.facilitiesWithSevereViolations} facilities with severe violations`,
        implication: 'Severe violations often trigger consent decrees, mandated upgrades, or operational changes'
      })
    }

    if (agg.formalEnforcementActions > 3) {
      result.signals.push({
        type: 'HIGH_ENFORCEMENT',
        severity: 'high',
        detail: `${agg.formalEnforcementActions} formal enforcement actions`,
        implication: 'Elevated regulatory pressure — expect remediation projects and equipment changes'
      })
    }

    if (agg.facilitiesFound > 0 && agg.facilitiesInspected / agg.facilitiesFound > 0.5) {
      result.signals.push({
        type: 'HIGH_INSPECTION_RATE',
        severity: 'medium',
        detail: `${agg.facilitiesInspected} of ${agg.facilitiesFound} facilities inspected`,
        implication: 'Above-average regulatory scrutiny in this area'
      })
    }

    result.summary = {
      facilitiesFound: agg.facilitiesFound,
      signalsFound: result.signals.length,
      highSeverity: result.signals.filter(s => s.severity === 'high').length,
      source: 'EPA_ECHO'
    }

  } catch (err) {
    result.errors.push({ source: 'ECHO', error: err.message })
  }

  console.log('[INTEL-EPA] Search result:', result.summary || 'error')
  return res.status(200).json(result)
}

// ============================================================================
// DETAIL MODE — full facility report by registry ID
// ============================================================================

async function handleDetail(res, registryId) {
  console.log('[INTEL-EPA] Detail:', registryId)

  const result = {
    mode: 'detail',
    registryId,
    facility: null,
    permits: [],
    programs: [],
    signals: [],
    errors: [],
    timestamp: new Date().toISOString()
  }

  try {
    const url = `${ECHO_BASE}/dfr_rest_services.get_dfr?p_id=${encodeURIComponent(registryId)}&output=JSON`
    const dfrRes = await fetch(url, { signal: AbortSignal.timeout(25000) })

    if (!dfrRes.ok) {
      result.errors.push({ source: 'ECHO_DFR', status: dfrRes.status })
      return res.status(200).json(result)
    }

    const data = await dfrRes.json()
    const r = data?.Results

    if (!r) {
      result.errors.push({ source: 'ECHO_DFR', error: 'No results returned' })
      return res.status(200).json(result)
    }

    // Parse permits (each represents a program/system link for this facility)
    const permits = r.Permits || []
    for (const p of permits) {
      if (!result.facility && p.FacilityName) {
        result.facility = {
          name: p.FacilityName,
          address: p.FacilityStreet,
          city: p.FacilityCity,
          state: p.FacilityState,
          zip: p.FacilityZip,
          county: p.FacilityCountyName,
          lat: p.Latitude,
          lng: p.Longitude,
          sic: p.SIC,
          naics: p.NAICS,
          status: p.FacilityStatus
        }
      }

      result.permits.push({
        statute: p.Statute || 'FRS',
        system: p.EPASystem,
        sourceId: p.SourceID,
        name: p.FacilityName,
        status: p.FacilityStatus,
        universe: p.Universe || null,
        areas: p.Areas || null
      })

      if (p.Statute && !result.programs.includes(p.Statute)) {
        result.programs.push(p.Statute)
      }
    }

    // Extract signals from detail data
    const statuses = permits.map(p => p.FacilityStatus).filter(Boolean)
    const hasInactive = statuses.some(s => s === 'INACTIVE')
    const hasOperating = statuses.some(s => s === 'Operating')
    const majorEmitter = permits.some(p => (p.Universe || '').includes('Major'))

    if (hasInactive && hasOperating) {
      result.signals.push({
        type: 'MIXED_STATUS',
        severity: 'medium',
        detail: 'Facility has both active and inactive program registrations',
        implication: 'May indicate unit decommissioning, process changes, or equipment transitions'
      })
    }

    if (majorEmitter) {
      result.signals.push({
        type: 'MAJOR_EMITTER',
        severity: 'info',
        detail: 'Classified as major emissions source',
        implication: 'Subject to stricter regulatory requirements — upgrades/changes require permits'
      })
    }

    if (result.programs.length > 3) {
      result.signals.push({
        type: 'MULTI_PROGRAM',
        severity: 'info',
        detail: `Facility subject to ${result.programs.length} regulatory programs: ${result.programs.join(', ')}`,
        implication: 'Complex regulatory footprint — changes or upgrades may require multi-program coordination'
      })
    }

    result.summary = {
      facilityName: result.facility?.name || 'Unknown',
      permitCount: result.permits.length,
      programCount: result.programs.length,
      signalsFound: result.signals.length,
      source: 'EPA_ECHO_DFR'
    }

  } catch (err) {
    result.errors.push({ source: 'ECHO_DFR', error: err.message })
  }

  console.log('[INTEL-EPA] Detail result:', result.summary || 'error')
  return res.status(200).json(result)
}
