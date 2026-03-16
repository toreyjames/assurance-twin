/**
 * INDUSTRIAL INTELLIGENCE API — FEDERAL CONTRACTS
 * Query USAspending.gov for federal contract awards
 * 
 * Catches: defense programs, aerospace manufacturing, pharma facilities,
 * energy infrastructure, government-funded plant upgrades and new builds
 * 
 * No auth required. Free API.
 * 
 * Usage:
 *   POST /api/intel-contracts
 *   Body: { keywords, agency, state, minAmount, startDate, endDate, naicsCodes, limit }
 */

const USA_SPENDING_BASE = 'https://api.usaspending.gov/api/v2'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST method required' })

  const {
    keywords = [],
    agency,
    state,
    minAmount,
    startDate,
    endDate,
    naicsCodes,
    limit = 10
  } = req.body || {}

  if (!keywords.length && !agency && !state && !naicsCodes) {
    return res.status(400).json({ error: 'Provide at least one of: keywords, agency, state, or naicsCodes' })
  }

  console.log('[INTEL-CONTRACTS] Query:', JSON.stringify({ keywords, agency, state, naicsCodes, limit }))

  const result = {
    contracts: [],
    signals: [],
    aggregate: null,
    errors: [],
    timestamp: new Date().toISOString()
  }

  try {
    // Build filters
    const filters = {
      award_type_codes: ['A', 'B', 'C', 'D'], // contracts only
      time_period: [{
        start_date: startDate || '2024-01-01',
        end_date: endDate || new Date().toISOString().slice(0, 10)
      }]
    }

    if (keywords.length) filters.keywords = keywords
    if (state) filters.place_of_performance_locations = [{ country: 'USA', state }]
    if (agency) filters.agencies = [{ type: 'awarding', tier: 'toptier', name: agency }]
    if (naicsCodes) filters.naics_codes = { require: naicsCodes }
    if (minAmount) filters.award_amounts = [{ lower_bound: minAmount }]

    const body = {
      filters,
      fields: [
        'Award ID', 'Recipient Name', 'Award Amount', 'Description',
        'Start Date', 'End Date', 'Awarding Agency', 'Awarding Sub Agency',
        'Place of Performance State Code', 'Place of Performance City Code',
        'NAICS Code', 'NAICS Description'
      ],
      limit: Math.min(limit, 50),
      page: 1,
      sort: 'Award Amount',
      order: 'desc'
    }

    const apiRes = await fetch(`${USA_SPENDING_BASE}/search/spending_by_award/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25000)
    })

    if (!apiRes.ok) {
      result.errors.push({ source: 'USAspending', status: apiRes.status })
      return res.status(200).json(result)
    }

    const data = await apiRes.json()
    const awards = data?.results || []

    for (const a of awards) {
      const contract = {
        awardId: a['Award ID'],
        recipient: a['Recipient Name'],
        amount: a['Award Amount'],
        description: a['Description'],
        startDate: a['Start Date'],
        endDate: a['End Date'],
        agency: a['Awarding Agency'],
        subAgency: a['Awarding Sub Agency'],
        state: a['Place of Performance State Code'],
        naicsCode: a['NAICS Code'],
        naicsDescription: a['NAICS Description'],
        source: 'USAspending'
      }
      result.contracts.push(contract)

      // Extract signals from contract data
      const desc = (contract.description || '').toLowerCase()
      const amt = contract.amount || 0

      if (amt > 100000000) {
        result.signals.push({
          type: 'MAJOR_CONTRACT',
          severity: 'high',
          facility: contract.recipient,
          detail: `$${(amt / 1e6).toFixed(0)}M contract from ${contract.agency}`,
          description: contract.description?.slice(0, 200),
          implication: 'Large federal contract — likely involves facility investment, manufacturing capacity, or infrastructure'
        })
      }

      if (desc.includes('facility') || desc.includes('plant') || desc.includes('manufacturing')) {
        result.signals.push({
          type: 'FACILITY_ACTIVITY',
          severity: 'high',
          facility: contract.recipient,
          detail: `Contract mentions facility/plant/manufacturing work`,
          description: contract.description?.slice(0, 200),
          state: contract.state,
          implication: 'Direct facility or manufacturing activity — potential new build, expansion, or upgrade'
        })
      }

      if (desc.includes('construct') || desc.includes('moderniz') || desc.includes('upgrade') || desc.includes('expansion')) {
        result.signals.push({
          type: 'CONSTRUCTION_OR_UPGRADE',
          severity: 'high',
          facility: contract.recipient,
          detail: `Contract involves construction, modernization, or upgrade work`,
          description: contract.description?.slice(0, 200),
          state: contract.state,
          implication: 'Active capital project — construction or modernization underway'
        })
      }
    }

    // Deduplicate signals per facility
    const seen = new Set()
    result.signals = result.signals.filter(s => {
      const key = `${s.type}:${s.facility}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    result.aggregate = {
      contractsFound: awards.length,
      totalValue: awards.reduce((sum, a) => sum + (a['Award Amount'] || 0), 0),
      topAgencies: [...new Set(awards.map(a => a['Awarding Agency']).filter(Boolean))],
      topRecipients: [...new Set(awards.map(a => a['Recipient Name']).filter(Boolean))].slice(0, 10),
      states: [...new Set(awards.map(a => a['Place of Performance State Code']).filter(Boolean))]
    }

    result.summary = {
      contractsFound: awards.length,
      totalValueFormatted: `$${(result.aggregate.totalValue / 1e6).toFixed(0)}M`,
      signalsFound: result.signals.length,
      highSeverity: result.signals.filter(s => s.severity === 'high').length,
      source: 'USAspending'
    }

  } catch (err) {
    result.errors.push({ source: 'USAspending', error: err.message })
  }

  console.log('[INTEL-CONTRACTS] Result:', result.summary || 'error')
  return res.status(200).json(result)
}
