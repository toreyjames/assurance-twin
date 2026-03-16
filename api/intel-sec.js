/**
 * INDUSTRIAL INTELLIGENCE API — SEC FILINGS
 * Query SEC EDGAR for company filings mentioning capital projects,
 * facility expansions, new builds, turnarounds, and major investments
 * 
 * Catches: public company announcements about plant investments,
 * capacity expansions, acquisitions, divestitures, and capital allocation
 * 
 * No auth required. Free API. Must include User-Agent header.
 * 
 * Usage:
 *   POST /api/intel-sec
 *   Body: { query, company, forms, startDate, endDate }
 */

const EDGAR_EFTS = 'https://efts.sec.gov/LATEST/search-index'

const INDUSTRY_QUERIES = {
  'facility-expansion': '"facility expansion" OR "plant expansion" OR "new facility" OR "capital investment"',
  'turnaround': '"turnaround" OR "shutdown" OR "outage" OR "maintenance capital"',
  'new-build': '"new plant" OR "greenfield" OR "ground-breaking" OR "new construction"',
  'defense': '"defense contract" OR "defense program" OR "military" OR "DoD"',
  'pharma': '"manufacturing facility" OR "GMP" OR "FDA approval" OR "drug manufacturing"',
  'energy': '"refinery" OR "pipeline" OR "LNG" OR "renewable energy" OR "power plant"',
  'aerospace': '"aerospace" OR "aircraft" OR "engine manufacturing" OR "space"'
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST method required' })

  const {
    query,
    preset,
    company,
    forms = ['8-K', '10-K'],
    startDate,
    endDate,
    limit = 20
  } = req.body || {}

  const searchQuery = query || INDUSTRY_QUERIES[preset]
  if (!searchQuery) {
    return res.status(400).json({
      error: 'Provide a query string or a preset',
      availablePresets: Object.keys(INDUSTRY_QUERIES)
    })
  }

  console.log('[INTEL-SEC] Query:', JSON.stringify({ query: searchQuery.slice(0, 100), company, forms }))

  const result = {
    filings: [],
    signals: [],
    aggregate: null,
    errors: [],
    timestamp: new Date().toISOString()
  }

  try {
    const params = new URLSearchParams({
      q: searchQuery,
      forms: forms.join(','),
      dateRange: 'custom',
      startdt: startDate || '2025-01-01',
      enddt: endDate || new Date().toISOString().slice(0, 10)
    })

    if (company) params.set('q', `"${company}" AND (${searchQuery})`)

    const url = `${EDGAR_EFTS}?${params.toString()}`
    console.log('[INTEL-SEC] EDGAR:', url)

    const edgarRes = await fetch(url, {
      headers: {
        'User-Agent': 'AssuranceTwin/1.0 research@deloitte.com',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(25000)
    })

    if (!edgarRes.ok) {
      result.errors.push({ source: 'SEC_EDGAR', status: edgarRes.status })
      return res.status(200).json(result)
    }

    const data = await edgarRes.json()
    const hits = data?.hits?.hits || []
    const totalHits = data?.hits?.total?.value || 0

    for (const hit of hits.slice(0, limit)) {
      const s = hit._source || {}
      const filing = {
        id: hit._id,
        company: (s.display_names || [])[0] || 'Unknown',
        form: s.form,
        fileDate: s.file_date,
        state: (s.biz_states || [])[0],
        location: (s.biz_locations || [])[0],
        sic: (s.sics || [])[0],
        accession: s.adsh || hit._id?.split(':')[0],
        source: 'SEC_EDGAR'
      }
      result.filings.push(filing)

      result.signals.push({
        type: 'SEC_FILING',
        severity: 'medium',
        facility: filing.company,
        detail: `${filing.form} filed ${filing.fileDate}`,
        location: filing.location,
        state: filing.state,
        implication: 'Public company disclosed activity matching capital/facility search criteria'
      })
    }

    // Aggregate by entity and state
    const entityBuckets = data?.aggregations?.entity_filter?.buckets || []
    const stateBuckets = data?.aggregations?.biz_states_filter?.buckets || []
    const formBuckets = data?.aggregations?.form_filter?.buckets || []

    result.aggregate = {
      totalFilings: totalHits,
      returnedFilings: result.filings.length,
      topCompanies: entityBuckets.slice(0, 15).map(b => ({ name: b.key, count: b.doc_count })),
      topStates: stateBuckets.slice(0, 10).map(b => ({ state: b.key, count: b.doc_count })),
      formBreakdown: formBuckets.map(b => ({ form: b.key, count: b.doc_count }))
    }

    // High-level signals from aggregates
    if (totalHits > 100) {
      result.signals.unshift({
        type: 'HIGH_FILING_VOLUME',
        severity: 'high',
        detail: `${totalHits} filings match this search in the time period`,
        implication: 'Significant industry-wide activity in this area'
      })
    }

    result.summary = {
      totalFilings: totalHits,
      returnedFilings: result.filings.length,
      topCompaniesCount: entityBuckets.length,
      signalsFound: result.signals.length,
      source: 'SEC_EDGAR'
    }

  } catch (err) {
    result.errors.push({ source: 'SEC_EDGAR', error: err.message })
  }

  console.log('[INTEL-SEC] Result:', result.summary || 'error')
  return res.status(200).json(result)
}
