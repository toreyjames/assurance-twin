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

export default function App() {
  const [engineeringFile, setEngineeringFile] = useState(null)
  const [cmmsFile, setCmmsFile] = useState(null)
  const [networkFile, setNetworkFile] = useState(null)
  const [threshold, setThreshold] = useState(18)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const loadSample = async () => {
    const fetchText = async (path) => (await fetch(path)).text()
    const [e, c, n] = await Promise.all([
      fetchText('/samples/engineering.csv'),
      fetchText('/samples/cmms.csv'),
      fetchText('/samples/network.csv')
    ])
    setEngineeringFile(new File([e], 'engineering.csv', { type: 'text/csv' }))
    setCmmsFile(new File([c], 'cmms.csv', { type: 'text/csv' }))
    setNetworkFile(new File([n], 'network.csv', { type: 'text/csv' }))
  }

  const analyze = async () => {
    setError(null)
    if (!engineeringFile || !cmmsFile || !networkFile) {
      setError('Please choose all three CSV files (engineering, cmms, network) or click Load Sample.')
      return
    }
    setLoading(true)
    try {
      const [engineeringCsv, cmmsCsv, networkCsv] = await Promise.all([
        readFileText(engineeringFile),
        readFileText(cmmsFile),
        readFileText(networkFile)
      ])
      const res = await fetch('/.netlify/functions/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thresholdMonths: Number(threshold),
          engineeringCsv, cmmsCsv, networkCsv
        })
      })
      if (!res.ok) throw new Error(`Analyze failed: ${res.status}`)
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const downloadCSV = () => {
    if (!result?.rows) return
    const csv = Papa.unparse(result.rows)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'ot_pa_results.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const downloadHTML = () => {
    if (!result?.reportHtml) return
    const blob = new Blob([result.reportHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'ot_pa_report.html'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="container">
      <header className="header">
        <div className="brand">
          <img src="/logo.svg" alt="brand"/>
          <div className="brand-title">OT Performance Assurance</div>
        </div>
        <div className="subtle">MVP · Asset-light · Partner-first</div>
      </header>

      <section className="hero">
        <p className="subtle" style={{marginTop:0}}>
          Merge <b>engineering</b>, <b>network</b>, and <b>CMMS</b> views to build a process-aware asset canon and run simple, explainable assurance checks.
        </p>

        <div className="grid grid-2" style={{marginTop:12}}>
          <div className="card">
            <label>Engineering CSV</label>
            <input type="file" accept=".csv" onChange={e => setEngineeringFile(e.target.files[0] || null)} />
          </div>
          <div className="card">
            <label>CMMS CSV</label>
            <input type="file" accept=".csv" onChange={e => setCmmsFile(e.target.files[0] || null)} />
          </div>
          <div className="card">
            <label>Network CSV</label>
            <input type="file" accept=".csv" onChange={e => setNetworkFile(e.target.files[0] || null)} />
          </div>
          <div className="card">
            <label>Patch Recency Threshold (months)</label>
            <input type="number" min="1" value={threshold} onChange={e => setThreshold(e.target.value)} />
          </div>
        </div>

        <div className="controls" style={{marginTop:12}}>
          <button className="button ghost" onClick={loadSample}>Load Sample</button>
          <button className="button" onClick={analyze} disabled={loading}>{loading ? 'Analyzing…' : 'Analyze'}</button>
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
              <KPI label="Threshold (months)" value={result.thresholdMonths} />
              <KPI label="Engineering total" value={result.kpis.engineering_total} />
              <KPI label="Network coverage (%)" value={result.kpis.network_coverage_pct_est} />
              <KPI label="Missing on network" value={result.kpis.missing_on_network_est} />
              <KPI label="Orphans on network" value={result.kpis.orphans_on_network} />
              <KPI label="Outdated (High)" value={result.kpis.outdated_high_assets_est} />
            </div>
            <p className="note" style={{marginTop:8}}>
              *Visibility Coverage = (# assets seen in ≥2 sources) ÷ (engineering total)
            </p>
          </section>

          <section style={{marginTop:18}}>
            <h2 style={{margin:'8px 0'}}>Results</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {['canon_id','plant','unit','asset_id','tag_id','loop_id','oem','model','serial','ip','criticality','firmware_status','visibility_flags']
                      .map(h => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.slice(0, 500).map((r,i)=>(
                    <tr key={i}>
                      <td>{r.canon_id}</td><td>{r.plant}</td><td>{r.unit}</td>
                      <td>{r.asset_id}</td><td>{r.tag_id}</td><td>{r.loop_id}</td>
                      <td>{r.oem}</td><td>{r.model}</td><td>{r.serial}</td>
                      <td>{r.ip}</td><td>{r.criticality}</td>
                      <td>{r.firmware_status}</td>
                      <td>{Array.isArray(r.visibility_flags)? r.visibility_flags.join(',') : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {result.rows.length > 500 && <p className="note">Showing first 500 rows…</p>}
          </section>
        </>
      )}
    </div>
  )
}

function KPI({ label, value }){
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  )
}