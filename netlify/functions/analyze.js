import Papa from 'papaparse'
import dayjs from 'dayjs'

export const handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'POST only' })
      }
    }

    const { thresholdMonths = 18, engineeringCsv, cmmsCsv, networkCsv } = JSON.parse(event.body || '{}')
    
    if (!engineeringCsv || !cmmsCsv || !networkCsv) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing CSV data' })
      }
    }

    // Parse CSV data
    const eng = Papa.parse(engineeringCsv, { header: true, skipEmptyLines: true }).data
    const cmms = Papa.parse(cmmsCsv, { header: true, skipEmptyLines: true }).data  
    const net = Papa.parse(networkCsv, { header: true, skipEmptyLines: true }).data

    // Build simple lookups
    const cmmsByTag = new Map()
    cmms.forEach(r => { if (r.tag_id) cmmsByTag.set(r.tag_id, r) })
    
    const netByAsset = new Map()
    net.forEach(n => { if (n.asset_id) netByAsset.set(n.asset_id, n) })

    // Process assets
    const canon = []
    const cutoff = dayjs().subtract(Number(thresholdMonths), 'month')
    let idx = 1

    for (const e of eng) {
      const cm = cmmsByTag.get(e.tag_id) || {}
      const netRow = cm.asset_id ? netByAsset.get(cm.asset_id) : null

      let firmware_status = 'UNKNOWN'
      if (cm.last_patch) {
        const d = dayjs(cm.last_patch, 'YYYY-MM-DD', true)
        if (d.isValid()) {
          firmware_status = d.isBefore(cutoff) ? 'OUTDATED' : 'OK'
        }
      }

      const flags = ['ENGINEERING']
      if (cm.asset_id) flags.push('CMMS')
      if (netRow) flags.push('NETWORK')
      
      if (!netRow) firmware_status = 'MISSING_ON_NETWORK'

      canon.push({
        canon_id: C,
        plant: e.plant || '',
        unit: e.unit || '',
        asset_id: cm.asset_id || '',
        tag_id: e.tag_id || '',
        loop_id: e.loop_id || '',
        oem: cm.oem || '',
        model: cm.model || '',
        serial: cm.serial || '',
        ip: netRow?.ip || '',
        criticality: e.criticality || '',
        firmware_status,
        visibility_flags: flags
      })
    }

    // Calculate KPIs
    const engineering_total = eng.length
    const networkVisible = canon.filter(r => r.visibility_flags.includes('NETWORK')).length
    const network_coverage_pct_est = Math.round((networkVisible / engineering_total) * 1000) / 10
    const missing_on_network_est = canon.filter(r => r.firmware_status === 'MISSING_ON_NETWORK').length
    const outdated_high_assets_est = canon.filter(r => r.criticality === 'High' && r.firmware_status === 'OUTDATED').length

    const reportHtml = <html><head><title>Report</title></head><body><h1>OT PA Report</h1><p>Total: , Coverage: %</p></body></html>

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        thresholdMonths,
        kpis: {
          engineering_total,
          network_coverage_pct_est,
          missing_on_network_est,
          orphans_on_network: 0,
          outdated_high_assets_est
        },
        rows: canon,
        reportHtml
      })
    }

  } catch (error) {
    console.error('Error:', error)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Processing failed', detail: String(error.message) })
    }
  }
}
