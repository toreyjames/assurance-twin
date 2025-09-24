import React, { useState } from 'react'
import Papa from 'papaparse'
import './styles.css'

const readFileText = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsText(file)
  })

export default function App(){
  const [engineeringFile, setEngineeringFile] = useState(null)
  const [cmmsFile, setCmmsFile] = useState(null)
  const [networkFile, setNetworkFile] = useState(null)
  const [historianFile, setHistorianFile] = useState(null)
  const [threshold, setThreshold] = useState(18)
  const [useLarge, setUseLarge] = useState(false)

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const base = useLarge ? '/samples/large' : '/samples/small'

  const loadStage1 = async () => { // network only
    const n = await (await fetch(`${base}/network.csv`)).text()
    setNetworkFile(new File([n], 'network.csv', { type:'text/csv' }))
  }
  const loadStage2 = async () => { // + engineering
    const e = await (await fetch(`${base}/engineering.csv`)).text()
    setEngineeringFile(new File([e], 'engineering.csv', { type:'text/csv' }))
  }
  const loadStage3 = async () => { // + cmms
    const c = await (await fetch(`${base}/cmms.csv`)).text()
    setCmmsFile(new File([c], 'cmms.csv', { type:'text/csv' }))
  }
  const loadStage4 = async () => { // + historian
    const h = await (await fetch(`${base}/historian.csv`)).text()
    setHistorianFile(new File([h], 'historian.csv', { type:'text/csv' }))
  }

  const analyze = async () => {
    setError(null)
    if(!engineeringFile && !cmmsFile && !networkFile && !historianFile){
      setError('Load at least one document (start with Network).')
      return
    }
    setLoading(true)
    try{
      const payload = { thresholdMonths: Number(threshold) }
      if(engineeringFile) payload.engineeringCsv = await readFileText(engineeringFile)
      if(cmmsFile)       payload.cmmsCsv        = await readFileText(cmmsFile)
      if(networkFile)    payload.networkCsv     = await readFileText(networkFile)
      if(historianFile)  payload.historianCsv   = await readFileText(historianFile)
      const res = await fetch('/.netlify/functions/analyze', {
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
      })
      if(!res.ok) throw new Error(`Analyze failed: ${res.status}`)
      setResult(await res.json())
    }catch(e){ setError(e.message) } finally{ setLoading(false) }
  }

  const downloadCSV = () => {
    if(!result?.rows) return
    const csv = Papa.unparse(result.rows)
    const blob = new Blob([csv], { type:'text/csv' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href = url; a.download = 'ot_pa_results.csv'; a.click(); URL.revokeObjectURL(url)
  }
  const downloadHTML = () => {
    if(!result?.reportHtml) return
    const blob = new Blob([result.reportHtml], { type:'text/html' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href = url; a.download = 'ot_pa_report.html'; a.click(); URL.revokeObjectURL(url)
  }

  const progress = result?.progress ?? calcProgress({engineeringFile, cmmsFile, networkFile, historianFile})

  return (
    <div className="container">
      <header className="header">
        <div className="brand"><img src="/logo.svg" alt="brand"/><div className="brand-title">OT Performance Assurance</div></div>
        <div className="subtle">Plant Visibility Quest  MVP</div>
      </header>

      <section className="hero">
        <p className="subtle" style={{marginTop:0}}>
          Add documents step-by-step. Watch <b>Assurance Progress</b> rise, coverage unlock, and blind spots disappear.
        </p>

        <div className="progress"><div className="fill" style={{width:`${progress}%`}}/></div>
        <div className="badges" style={{marginTop:10}}>
          <span className={'badge ' + (networkFile ? 'on':'')}>Network</span>
          <span className={'badge ' + (engineeringFile ? 'on':'')}>Engineering</span>
          <span className={'badge ' + (cmmsFile ? 'on':'')}>CMMS</span>
          <span className={'badge ' + (historianFile ? 'on':'')}>Historian</span>
        </div>

        <div className="controls" style={{marginTop:8}}>
          <label><input type="checkbox" checked={useLarge} onChange={e=>setUseLarge(e.target.checked)} /> Use Large Samples (120 assets)</label>
        </div>

        <div className="grid grid-2" style={{marginTop:12}}>
          <div className="card">
            <label>Network CSV</label>
            <input type="file" accept=".csv" onChange={e=>setNetworkFile(e.target.files[0]||null)}/>
            <div className="controls" style={{marginTop:8}}><button className="button ghost" onClick={loadStage1}>Load Stage 1 Sample</button></div>
          </div>
          <div className="card">
            <label>Engineering CSV</label>
            <input type="file" accept=".csv" onChange={e=>setEngineeringFile(e.target.files[0]||null)}/>
            <div className="controls" style={{marginTop:8}}><button className="button ghost" onClick={loadStage2}>Load Stage 2 Sample</button></div>
          </div>
          <div className="card">
            <label>CMMS CSV</label>
            <input type="file" accept=".csv" onChange={e=>setCmmsFile(e.target.files[0]||null)}/>
            <div className="controls" style={{marginTop:8}}><button className="button ghost" onClick={loadStage3}>Load Stage 3 Sample</button></div>
          </div>
          <div className="card">
            <label>Historian CSV (optional)</label>
            <input type="file" accept=".csv" onChange={e=>setHistorianFile(e.target.files[0]||null)}/>
            <div className="controls" style={{marginTop:8}}><button className="button ghost" onClick={loadStage4}>Load Stage 4 Sample</button></div>
          </div>
          <div className="card">
            <label>Patch Recency Threshold (months)</label>
            <input type="number" min="1" value={threshold} onChange={e=>setThreshold(e.target.value)} />
          </div>
        </div>

        <div className="controls" style={{marginTop:12}}>
          <button className="button" onClick={analyze} disabled={loading}>{loading?'Analyzing':'Analyze'}</button>
          <button className="button ghost" onClick={downloadCSV} disabled={!result}>Download CSV</button>
          <button className="button ghost" onClick={downloadHTML} disabled={!result || !result.reportHtml}>Download HTML</button>
        </div>
        {error && <div className="notice" style={{marginTop:12}}>{error}</div>}
      </section>

      {result && (
        <>
          <section style={{marginTop:18}}>
            <h2 style={{margin:'8px 0'}}>Summary</h2>
            <div className="kpis">
              <KPI label="Threshold (months)" value={result.thresholdMonths}/>
              <KPI label="Engineering total" value={val(result.kpis.engineering_total)}/>
              <KPI label="Network assets (raw)" value={val(result.kpis.network_total)}/>
              <KPI label="Network coverage (%)" value={val(result.kpis.network_coverage_pct_est, '')}/>
              <KPI label="Missing on network" value={val(result.kpis.missing_on_network_est, '')}/>
              <KPI label="Orphans on network" value={val(result.kpis.orphans_on_network, '')}/>
              <KPI label="Outdated (High)" value={val(result.kpis.outdated_high_assets_est, '')}/>
              <KPI label="Plant Performance Index" value={val(result?.ppi?.overall, '')}/>
            </div>
            <p className="note" style={{marginTop:8}}>
              *As you add documents, new metrics unlock. Coverage requires Network + Engineering + CMMS.
            </p>
          </section>

          <section style={{marginTop:18}}>
            <h2 style={{margin:'8px 0'}}>Visuals</h2>
            <Legend/>
            <PlantUnitMap rows={result.rows}/>
          </section>

          <section style={{marginTop:18}}>
            <h2 style={{margin:'8px 0'}}>Results</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>{['canon_id','plant','unit','asset_id','tag_id','loop_id','oem','model','serial','ip','criticality','firmware_status','visibility_flags','phs'].map(h=> <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {result.rows.slice(0,500).map((r,i)=>(
                    <tr key={i}>
                      <td>{r.canon_id}</td><td>{r.plant}</td><td>{r.unit}</td>
                      <td>{r.asset_id}</td><td>{r.tag_id}</td><td>{r.loop_id}</td>
                      <td>{r.oem}</td><td>{r.model}</td><td>{r.serial}</td>
                      <td>{r.ip}</td><td>{r.criticality}</td>
                      <td>{r.firmware_status}</td><td>{Array.isArray(r.visibility_flags)? r.visibility_flags.join(','):''}</td>
                      <td>{r.phs ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {result.rows.length>500 && <p className="note">Showing first 500 rows</p>}
          </section>
        </>
      )}
    </div>
  )
}

function KPI({label, value}){ return <div className="kpi"><div className="label">{label}</div><div className="value">{value}</div></div> }
function val(x, d='0'){ return (x===null || x===undefined) ? d : x }

function Legend(){
  return (
    <div className="legend">
      <span><strong>Coverage</strong>: assets visible on NETWORK  engineering total</span>
      <span><strong>OUTDATED</strong>: firmware/patch past threshold</span>
      <span><strong>MISSING_ON_NETWORK</strong>: in ENG/CMMS not visible on network</span>
      <span><strong>ORPHANED_IN_NETWORK</strong>: on network not in ENG/CMMS</span>
    </div>
  )
}
function includesFlag(r,f){ const a = Array.isArray(r.visibility_flags)? r.visibility_flags:[]; return a.includes(f) }
function groupByPlantUnit(rows){
  const map = new Map()
  for(const r of rows){ const plant=r.plant||'Unknown', unit=r.unit||'Unknown', k=`${plant}::${unit}`
    if(!map.has(k)) map.set(k,{plant,unit,rows:[]}); map.get(k).rows.push(r) }
  return Array.from(map.values())
}
function UnitCard({plant,unit,rows}){
  const total = rows.length, seenOnNet = rows.filter(r=>includesFlag(r,'NETWORK')).length
  const coverage = total ? Math.round((seenOnNet/total)*100) : 0
  const outdated = rows.filter(r=>r.firmware_status==='OUTDATED').length
  const missing  = rows.filter(r=>r.firmware_status==='MISSING_ON_NETWORK').length
  const orphans  = rows.filter(r=>r.firmware_status==='ORPHANED_IN_NETWORK').length
  const ok       = rows.filter(r=>r.firmware_status==='OK').length
  return (
    <div className="unit-card">
      <div className="unit-head"><div className="unit-name">{plant}  {unit}</div><div className="subtle">{coverage}%</div></div>
      <div className="cover-bar"><div className="cover-fill" style={{width:`${coverage}%`}}/></div>
      <div className="metrics">
        <div className="metric">Total<strong>{total}</strong></div>
        <div className="metric">OK<strong>{ok}</strong></div>
        <div className="metric">Outdated<strong>{outdated}</strong></div>
        <div className="metric">Missing on net<strong>{missing}</strong></div>
        <div className="metric">Orphans<strong>{orphans}</strong></div>
      </div>
    </div>
  )
}
function PlantUnitMap({rows}){
  if(!rows?.length) return null
  const byPlant = new Map()
  for(const g of groupByPlantUnit(rows)){ if(!byPlant.has(g.plant)) byPlant.set(g.plant,[]); byPlant.get(g.plant).push(g)}
  return <>
    {Array.from(byPlant.entries()).map(([plant,units])=>(
      <div key={plant} className="plant-section">
        <div className="plant-title">{plant}</div>
        <div className="unit-grid">{units.map(u=> <UnitCard key={`${u.plant}-${u.unit}`} {...u} />)}</div>
      </div>
    ))}
  </>
}
function calcProgress(files){ const total = ['networkFile','engineeringFile','cmmsFile','historianFile'].filter(k=>files[k]).length; return Math.round((total/4)*100) }
