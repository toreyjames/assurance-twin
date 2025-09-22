import Papa from 'papaparse'
import dayjs from 'dayjs'

// helpers
const parseCsv = (text) => Papa.parse(text, { header: true, skipEmptyLines: true }).data
const monthsAgo = (m) => dayjs().subtract(m, 'month')

export const handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return resp(405, { error: 'POST only' })
    }
    const { thresholdMonths = 18, engineeringCsv, cmmsCsv, networkCsv } = JSON.parse(event.body || '{}')
    if (!engineeringCsv || !cmmsCsv || !networkCsv) {
      return resp(400, { error: 'Missing CSVs: engineeringCsv, cmmsCsv, networkCsv are required.' })
    }

    const eng = parseCsv(engineeringCsv)  // tag_id,loop_id,unit,plant,instrument_type,criticality
    const cmms = parseCsv(cmmsCsv)        // asset_id,tag_id,oem,model,serial,last_patch
    const net = parseCsv(networkCsv)      // asset_id,ip,mac,proto,last_seen,unit,plant

    // Indexes
    const cmmsByTag = new Map(cmms.filter(r => r.tag_id).map(r => [r.tag_id, r]))
    const cmmsByAsset = new Map(cmms.filter(r => r.asset_id).map(r => [r.asset_id, r]))

    // Derive network tags via CMMS crosswalk
    const networkTagIds = new Set()
    const orphanRows = []
    for (const n of net) {
      const c = cmmsByAsset.get(n.asset_id)
      if (c?.tag_id) networkTagIds.add(c.tag_id)
      else orphanRows.push(n) // on network but no cmms/engineering mapping
    }

    const engTagIds = new Set(eng.map(r => r.tag_id))
    const missingOnNetwork = [...engTagIds].filter(t => !networkTagIds.has(t))
    const orphansCount = orphanRows.length

    // Build canon rows by iterating engineering (ground truth) and enriching from CMMS + Network
    const cutoff = monthsAgo(Number(thresholdMonths))
    const canon = []
    let idx = 1

    // Map network by plant/unit/ip for enrichment (best-effort)
    const netByAsset = new Map(net.map(n => [n.asset_id, n]))

    for (const e of eng) {
      const cm = cmmsByTag.get(e.tag_id) || {}
      // network asset: if CMMS has asset_id, try to use that to find network row
      const netRow = cm.asset_id ? netByAsset.get(cm.asset_id) : null

      // firmware status
      let firmware_status = 'UNKNOWN'
      if (cm.last_patch) {
        const d = dayjs(cm.last_patch, 'YYYY-MM-DD', true)
        firmware_status = d.isValid() ? (d.isBefore(cutoff) ? 'OUTDATED' : 'OK') : 'UNKNOWN'
      }

      // visibility flags
      const flags = ['ENGINEERING']
      if (cm.asset_id) flags.push('CMMS')
      if (netRow) flags.push('NETWORK')

      // special states
      if (!netRow) {
        // present in engineering and maybe cmms, but not seen on network view
        // keep firmware_status as computed; add label via result column
      }

      canon.push({
        canon_id: `C${idx++}`,
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

    // Add true network orphans (not in engineering/cmms)
    for (const n of orphanRows) {
      canon.push({
        canon_id: `C${idx++}`,
        plant: n.plant || '',
        unit: n.unit || '',
        asset_id: n.asset_id || '',
        tag_id: '',
        loop_id: '',
        oem: '',
        model: '',
        serial: '',
        ip: n.ip || '',
        criticality: '',
        firmware_status: 'UNKNOWN',
        visibility_flags: ['NETWORK'] // orphaned
      })
    }

    // Label special states:
    // - MISSING_ON_NETWORK: engineering tag exists but no network row matched
    // - ORPHANED_IN_NETWORK: rows we appended above (visibility_flags only NETWORK)
    const rows = canon.map(r => {
      let status = r.firmware_status
      const hasEng = r.visibility_flags.includes('ENGINEERING')
      const hasNet = r.visibility_flags.includes('NETWORK')
      if (hasEng && !hasNet) status = 'MISSING_ON_NETWORK'
      if (!hasEng && hasNet) status = 'ORPHANED_IN_NETWORK'
      return { ...r, firmware_status: status }
    })

    // KPIs
    const engineering_total = eng.length
    const network_coverage_pct_est = Math.round(( (eng.length - missingOnNetwork.length) / eng.length ) * 1000) / 10
    const missing_on_network_est = missingOnNetwork.length
    const outdated_high_assets_est = rows.filter(r => r.criticality === 'High' && r.firmware_status === 'OUTDATED').length

    // HTML report (simple)
    const reportHtml = htmlReport({
      thresholdMonths,
      totals: {
        engineering_total,
        network_coverage_pct_est,
        missing_on_network_est,
        orphans_on_network: orphansCount,
        outdated_high_assets_est
      },
      rows
    })

    return resp(200, {
      thresholdMonths,
      kpis: {
        engineering_total,
        network_coverage_pct_est,
        missing_on_network_est,
        orphans_on_network: orphansCount,
        outdated_high_assets_est
      },
      rows,
      reportHtml
    })
  } catch (e) {
    console.error(e)
    return resp(500, { error: 'Internal error', detail: String(e?.message || e) })
  }
}

const resp = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  },
  body: JSON.stringify(body)
})

function htmlReport({ thresholdMonths, totals, rows }) {
  const header = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>OT Performance Assurance — Report</title>
<style>
body{font-family:Arial, sans-serif; margin:24px;}
h1{margin-bottom:4px}.sub{color:#555;margin:0 0 16px}
table{border-collapse:collapse;width:100%;margin:16px 0}
th,td{border:1px solid #ddd;padding:8px} th{text-align:left;background:#f5f5f5}
.kpis{display:flex;gap:12px;margin:12px 0;flex-wrap:wrap}
.kpi{border:1px solid #eee;padding:10px 12px;border-radius:8px}
.note{color:#666;font-size:.9em;margin-top:12px}
</style></head><body>
<h1>OT Performance Assurance — MVP</h1>
<div class="sub">Threshold: <b>${thresholdMonths} months</b></div>
<div class="kpis">
  <div class="kpi">Engineering total: <b>${totals.engineering_total}</b></div>
  <div class="kpi">Network coverage: <b>${totals.network_coverage_pct_est}%</b></div>
  <div class="kpi">Missing on network: <b>${totals.missing_on_network_est}</b></div>
  <div class="kpi">Orphans on network: <b>${totals.orphans_on_network}</b></div>
  <div class="kpi">Outdated (High): <b>${totals.outdated_high_assets_est}</b></div>
</div>
<h2>Results</h2>
<table><thead><tr>
  <th>canon_id</th><th>plant</th><th>unit</th><th>asset_id</th><th>tag_id</th>
  <th>loop_id</th><th>oem</th><th>model</th><th>serial</th><th>ip</th>
  <th>criticality</th><th>firmware_status</th><th>visibility_flags</th>
</tr></thead><tbody>
`
  const body = rows.slice(0, 1000).map(r => `
<tr>
  <td>${esc(r.canon_id)}</td><td>${esc(r.plant)}</td><td>${esc(r.unit)}</td>
  <td>${esc(r.asset_id)}</td><td>${esc(r.tag_id)}</td><td>${esc(r.loop_id)}</td>
  <td>${esc(r.oem)}</td><td>${esc(r.model)}</td><td>${esc(r.serial)}</td>
  <td>${esc(r.ip)}</td><td>${esc(r.criticality)}</td>
  <td>${esc(r.firmware_status)}</td><td>${Array.isArray(r.visibility_flags) ? r.visibility_flags.join(',') : ''}</td>
</tr>`).join('')

  const footer = `
</tbody></table>
<p class="note">MVP demonstration only. Not production-ready. Do not upload sensitive plant data.</p>
</body></html>`
  return header + body + footer
}
function esc(s){ return (s ?? '').toString().replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])) }