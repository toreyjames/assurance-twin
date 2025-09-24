import Papa from 'papaparse'
import dayjs from 'dayjs'
import crypto from 'node:crypto'

const parseCsv = (text) => Papa.parse(text || '', { header: true, skipEmptyLines: true }).data
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex')
const monthsAgo = (m) => dayjs().subtract(m, 'month')

export const handler = async (event) => {
  try{
    if(event.httpMethod!=='POST') return resp(405,{error:'POST only'})
    const body = JSON.parse(event.body||'{}')
    const threshold = Number(body.thresholdMonths ?? 18)

    const eng = body.engineeringCsv ? parseCsv(body.engineeringCsv) : []
    const cmms = body.cmmsCsv ? parseCsv(body.cmmsCsv) : []
    const net  = body.networkCsv ? parseCsv(body.networkCsv) : []
    const hist = body.historianCsv ? parseCsv(body.historianCsv) : []

    const sources = { network: !!net.length, engineering: !!eng.length, cmms: !!cmms.length, historian: !!hist.length }
    const progress = Math.round((Object.values(sources).filter(Boolean).length/4)*100)

    // Indexes
    const cmmsByTag   = new Map(cmms.filter(r=>r.tag_id).map(r=>[r.tag_id,r]))
    const cmmsByAsset = new Map(cmms.filter(r=>r.asset_id).map(r=>[r.asset_id,r]))
    const netByAsset  = new Map(net.map(n=>[n.asset_id,n]))
    const histByTag   = new Map(hist.filter(r=>r.tag_id).map(r=>[r.tag_id,r]))

    // Determine stage
    const stage =
      sources.network && !sources.engineering && !sources.cmms ? 'network_only' :
      sources.network && sources.engineering && !sources.cmms ? 'network_plus_engineering' :
      sources.network && sources.engineering && sources.cmms && !sources.historian ? 'triad' :
      sources.network && sources.engineering && sources.cmms && sources.historian ? 'triad_plus_historian' :
      (!sources.network && sources.engineering && !sources.cmms) ? 'engineering_only' : 'mixed'

    // Canon rows
    const cutoff = monthsAgo(threshold)
    const rows = []
    let idx = 1

    if(eng.length){ // build from engineering baseline
      for(const e of eng){
        const c = cmmsByTag.get(e.tag_id) || {}
        const n = c.asset_id ? netByAsset.get(c.asset_id) : undefined
        const h = histByTag.get(e.tag_id) || {}

        // firmware recency
        let fw = 'UNKNOWN'
        if(c.last_patch){
          const d = dayjs(c.last_patch,'YYYY-MM-DD',true)
          fw = d.isValid() ? (d.isBefore(cutoff) ? 'OUTDATED':'OK') : 'UNKNOWN'
        }

        const flags = ['ENGINEERING']; if(c.asset_id) flags.push('CMMS'); if(n) flags.push('NETWORK')
        let status = fw
        if(flags.includes('ENGINEERING') && !flags.includes('NETWORK')) status = 'MISSING_ON_NETWORK'

        rows.push({
          canon_id:`C${idx++}`,
          plant:e.plant||'', unit:e.unit||'',
          asset_id:c.asset_id||'', tag_id:e.tag_id||'', loop_id:e.loop_id||'',
          oem:c.oem||'', model:c.model||'', serial:c.serial||'',
          ip:n?.ip||'', criticality:e.criticality||'',
          firmware_status: status,
          visibility_flags: flags,
          uptime_pct_30d: h.uptime_pct_30d ? Number(h.uptime_pct_30d) : null,
          alarm_count_30d: h.alarm_count_30d ? Number(h.alarm_count_30d) : null,
          bad_quality_count_30d: h.bad_quality_count_30d ? Number(h.bad_quality_count_30d) : null,
          _src:{eng:e,cmms:c,net:n,hist:h}
        })
      }
    } else if(net.length){ // network-only baseline
      for(const n of net){
        rows.push({
          canon_id:`C${idx++}`, plant:n.plant||'', unit:n.unit||'',
          asset_id:n.asset_id||'', tag_id:'', loop_id:'',
          oem:'', model:'', serial:'', ip:n.ip||'',
          criticality:'', firmware_status:'UNKNOWN',
          visibility_flags:['NETWORK'],
          _src:{eng:null,cmms:null,net:n,hist:null}
        })
      }
    }

    // add true orphans (net but not eng/cmms) — only if ENG/CMMS exist
    let orphans_on_network = 0
    if(eng.length || cmms.length){
      for(const n of net){
        const c = cmmsByAsset.get(n.asset_id)
        if(!c){
          rows.push({
            canon_id:`C${idx++}`, plant:n.plant||'', unit:n.unit||'',
            asset_id:n.asset_id||'', tag_id:'', loop_id:'',
            oem:'', model:'', serial:'', ip:n.ip||'',
            criticality:'', firmware_status:'ORPHANED_IN_NETWORK',
            visibility_flags:['NETWORK'],
            _src:{eng:null,cmms:null,net:n,hist:null}
          })
          orphans_on_network++
        }
      }
    }

    // PHS (performance health score)
    const weights = { patch:1.0, visibility:1.0, orphan:1.0, uptime:1.0, alarms:1.0 }
    const critMult = (crit) => (crit==='High'?1.3:crit==='Medium'?1.1:1.0)
    for(const r of rows){
      const srcCount = Array.isArray(r.visibility_flags)? r.visibility_flags.length : 0
      const lp = r._src.cmms?.last_patch
      let overdue=0
      if(lp){ const d = dayjs(lp,'YYYY-MM-DD',true); if(d.isValid()){ const diff = dayjs().diff(d,'month')-threshold; overdue= diff>0? diff:0 } }

      const patchPenalty = Math.min(40, overdue*2)
      const visibilityPenalty = r.firmware_status==='MISSING_ON_NETWORK' ? 40 : (srcCount>=2 ? 0 : 10)
      const orphanPenalty = r.firmware_status==='ORPHANED_IN_NETWORK' ? 30 : 0

      const uptime = r.uptime_pct_30d ?? null
      const alarms = r.alarm_count_30d ?? null
      const uptimePenalty = (uptime!==null && uptime<98) ? Math.min(20, (98-uptime)*2) : 0
      const alarmPenalty  = (alarms!==null && alarms>10) ? Math.min(20, (alarms-10)) : 0

      const penalty = weights.patch*patchPenalty + weights.visibility*visibilityPenalty +
                      weights.orphan*orphanPenalty + weights.uptime*uptimePenalty + weights.alarms*alarmPenalty
      const phsRaw = 100 - critMult(r.criticality)*penalty
      r.phs = Math.max(0, Math.round(phsRaw))
      r.months_overdue = overdue
    }

    // PPI
    const critW = (c) => (c==='High'?3:c==='Medium'?2:1)
    const ppiByPlant = {}
    for(const r of rows){ const k=r.plant||'Unknown', w=critW(r.criticality||'')
      if(!ppiByPlant[k]) ppiByPlant[k]={s:0,w:0}; ppiByPlant[k].s += r.phs*w; ppiByPlant[k].w += w }
    const ppi = {
      byPlant: Object.fromEntries(Object.entries(ppiByPlant).map(([k,v])=>[k, v.w? Math.round(v.s/v.w):0])),
      overall: (()=>{ const S=Object.values(ppiByPlant).reduce((a,x)=>a+x.s,0), W=Object.values(ppiByPlant).reduce((a,x)=>a+x.w,0); return W? Math.round(S/W):0 })()
    }

    // KPIs
    const engineering_total = eng.length || null
    const network_total = net.length || null
    let missing_on_network_est = null, network_coverage_pct_est = null
    if(eng.length && cmms.length && net.length){
      const networkTagIds = new Set()
      for(const n of net){ const c = cmmsByAsset.get(n.asset_id); if(c?.tag_id) networkTagIds.add(c.tag_id) }
      const engTagIds = new Set(eng.map(r=>r.tag_id))
      missing_on_network_est = [...engTagIds].filter(t=>!networkTagIds.has(t)).length
      network_coverage_pct_est = Math.round(((engTagIds.size - missing_on_network_est)/engTagIds.size)*1000)/10
    }

    const outdated_high_assets_est = rows.filter(r=>r.criticality==='High' && r.firmware_status==='OUTDATED').length

    const kpis = { engineering_total, network_total, network_coverage_pct_est, missing_on_network_est, orphans_on_network, outdated_high_assets_est }

    // Evidence snapshot hash (proof)
    const nowIso = new Date().toISOString()
    const snapshot = { generated_at: nowIso, threshold_months: threshold, kpis, ppi, assets_count: rows.length, sources }
    const snapshotHash = sha256(JSON.stringify(snapshot))

    const publicRows = rows.map(({_src, ...rest})=>rest)
    const reportHtml = htmlReport({ threshold, kpis, ppi, rows: publicRows, snapshotHash, stage, progress })

    return resp(200, { thresholdMonths: threshold, kpis, ppi, rows: publicRows, reportHtml, snapshotHash, stage, progress })
  }catch(e){
    console.error(e); return resp(500,{error:'Internal error', detail:String(e?.message||e)})
  }
}

const resp = (code, body) => ({ statusCode: code, headers: { 'Content-Type':'application/json','Access-Control-Allow-Origin':'*' }, body: JSON.stringify(body) })

function htmlReport({ threshold, kpis, ppi, rows, snapshotHash, stage, progress }){
  const header = `
<!DOCTYPE html><html><head><meta charset="utf-8"><title>OT Performance Assurance — Report</title>
<style>
body{font-family:Arial,sans-serif;margin:24px}
h1{margin-bottom:4px}.sub{color:#555;margin:0 0 12px}
.kpis{display:flex;gap:12px;flex-wrap:wrap;margin:12px 0}
.kpi{border:1px solid #eee;padding:10px 12px;border-radius:8px}
table{border-collapse:collapse;width:100%;margin:16px 0}
th,td{border:1px solid #ddd;padding:8px} th{background:#f5f5f5;text-align:left}
.footer{margin-top:16px;color:#666;font-size:.85em}
</style></head><body>
<h1>OT Performance Assurance — MVP</h1>
<div class="sub">Stage: <b>${stage}</b> · Progress: <b>${progress}%</b> · Threshold: <b>${threshold} months</b></div>
<div class="kpis">
  <div class="kpi">Engineering total: <b>${kpis.engineering_total ?? '–'}</b></div>
  <div class="kpi">Network assets: <b>${kpis.network_total ?? '–'}</b></div>
  <div class="kpi">Coverage: <b>${kpis.network_coverage_pct_est ?? '–'}%</b></div>
  <div class="kpi">Missing on network: <b>${kpis.missing_on_network_est ?? '–'}</b></div>
  <div class="kpi">Orphans on network: <b>${kpis.orphans_on_network ?? '–'}</b></div>
  <div class="kpi">Outdated (High): <b>${kpis.outdated_high_assets_est}</b></div>
  <div class="kpi">Plant Performance Index: <b>${ppi.overall}</b></div>
</div>
<h2>Results</h2>
<table><thead><tr>
  <th>canon_id</th><th>plant</th><th>unit</th><th>asset_id</th><th>tag_id</th><th>loop_id</th>
  <th>oem</th><th>model</th><th>serial</th><th>ip</th><th>criticality</th><th>firmware_status</th><th>visibility_flags</th><th>phs</th>
</tr></thead><tbody>`
  const body = rows.slice(0,1000).map(r=>`
<tr>
  <td>${esc(r.canon_id)}</td><td>${esc(r.plant)}</td><td>${esc(r.unit)}</td>
  <td>${esc(r.asset_id)}</td><td>${esc(r.tag_id)}</td><td>${esc(r.loop_id)}</td>
  <td>${esc(r.oem)}</td><td>${esc(r.model)}</td><td>${esc(r.serial)}</td>
  <td>${esc(r.ip)}</td><td>${esc(r.criticality)}</td><td>${esc(r.firmware_status)}</td>
  <td>${Array.isArray(r.visibility_flags)? r.visibility_flags.join(','):''}</td><td>${esc(r.phs)}</td>
</tr>`).join('')
  const plants = Object.entries(ppi.byPlant).map(([p,v])=>`<div class="kpi">${esc(p)} PPI: <b>${v}</b></div>`).join('')
  const footer = `</tbody></table><h3>Plant PPIs</h3><div class="kpis">${plants||'<div class="kpi">No plant data</div>'}</div>
<div class="footer">Snapshot hash: <code>${snapshotHash}</code></div>
</body></html>`
  return header+body+footer
}
function esc(s){ return (s??'').toString().replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])) }
