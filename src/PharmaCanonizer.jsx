import React, { useState } from 'react'
import Papa from 'papaparse'
import './styles.css'

const readFileText = (file) => new Promise((resolve, reject) => {
  const r = new FileReader()
  r.onload = () => resolve(r.result)
  r.onerror = reject
  r.readAsText(file)
})

// Pharmaceutical Industry-Specific Canonizer UI
export default function PharmaCanonizer() {
  const [engineeringFile, setEngineeringFile] = useState(null)
  const [cmmsFile, setCmmsFile] = useState(null)
  const [networkFile, setNetworkFile] = useState(null)
  const [historianFile, setHistorianFile] = useState(null)
  const [threshold, setThreshold] = useState(18)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [selectedPlant, setSelectedPlant] = useState('all')

  const analyze = async () => {
    setError(null)
    if (!engineeringFile && !cmmsFile && !networkFile && !historianFile) {
      setError('Load at least one document to begin canonization.')
      return
    }

    setLoading(true)
    try {
      const payload = { thresholdMonths: Number(threshold) }
      if (engineeringFile) payload.engineeringCsv = await readFileText(engineeringFile)
      if (cmmsFile) payload.cmmsCsv = await readFileText(cmmsFile)
      if (networkFile) payload.networkCsv = await readFileText(networkFile)
      if (historianFile) payload.historianCsv = await readFileText(historianFile)

      const res = await fetch('/api/analyze-pharma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error(`Canonization failed: ${res.status}`)
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Filter all data based on selected plant
  const filteredAssets = result?.assets?.filter(asset => 
    selectedPlant === 'all' || asset.plant === selectedPlant
  ) || []

  const plants = result?.assets ? 
    Array.from(new Set(result.assets.map(a => a.plant))) : []

  // Calculate filtered KPIs
  const filteredKPIs = result ? {
    total_assets: filteredAssets.length,
    fda21cfr11_compliant: filteredAssets.filter(a => a.fda21cfr11Compliant).length,
    gamp5_categorized: filteredAssets.filter(a => a.gamp5Category).length,
    gmp_critical: filteredAssets.filter(a => a.gmpCritical).length,
    batch_tracking: filteredAssets.filter(a => a.batchTracking).length,
    serialization: filteredAssets.filter(a => a.serialization).length,
    track_trace: filteredAssets.filter(a => a.trackTrace).length,
    contamination_control: filteredAssets.filter(a => a.contaminationControl).length,
    environmental_monitoring: filteredAssets.filter(a => a.environmentalMonitoring).length,
    data_integrity: filteredAssets.filter(a => a.dataIntegrity).length,
    temperature_control: filteredAssets.filter(a => a.temperatureControl).length,
    network_coverage: filteredAssets.length > 0 ? 
      Math.round((filteredAssets.filter(a => a.network_status === 'ON_NETWORK').length / filteredAssets.length) * 100) : 0,
    outdated_assets: filteredAssets.filter(a => a.firmware_status === 'OUTDATED').length
  } : {}

  // Filter crown jewels
  const filteredCrownJewels = filteredAssets.filter(a => a.is_crown_jewel)

  // Filter plant mapping data
  const filteredPlantMapping = result?.plantMapping ? {
    ...result.plantMapping,
    units: result.plantMapping.units.map(unit => {
      const unitAssets = filteredAssets.filter(a => a.unit === unit.name)
      return {
        ...unit,
        assetCount: unitAssets.length,
        criticalAssets: unitAssets.filter(a => a.criticality === 'Critical').length,
        fda21cfr11: unitAssets.filter(a => a.fda21cfr11Compliant).length,
        gmpCritical: unitAssets.filter(a => a.gmpCritical).length,
        batchTracking: unitAssets.filter(a => a.batchTracking).length,
        contaminationControl: unitAssets.filter(a => a.contaminationControl).length,
        networkCoverage: unitAssets.length > 0 ? 
          Math.round((unitAssets.filter(a => a.network_status === 'ON_NETWORK').length / unitAssets.length) * 100) : 0,
        blindSpots: unitAssets.filter(a => 
          a.visibility_flags.includes('ENGINEERING') && 
          !a.visibility_flags.includes('NETWORK')
        ).length
      }
    }).filter(unit => unit.assetCount > 0)
  } : null

  return (
    <div className="container">
      <header className="header">
        <div className="brand">
          <img src="/logo.svg" alt="Deloitte" />
          <div className="brand-title">Pharmaceutical OT Assurance Twin</div>
        </div>
        <div className="subtle">FDA 21 CFR Part 11, GAMP 5 Compliant Batch Process Canonizer</div>
      </header>

      <section className="hero">
        <h2>Pharmaceutical Plant Asset Canonization</h2>
        <p className="subtle">
          Industry-specific canonizer for pharmaceutical manufacturing plants. 
          Integrates batch process data, quality control, environmental monitoring, 
          and regulatory compliance for comprehensive asset assurance.
        </p>

        <div className="grid grid-2" style={{ marginTop: 20 }}>
          <div className="card">
            <label>Batch Process Data (CSV)</label>
            <input 
              type="file" 
              accept=".csv" 
              onChange={e => setEngineeringFile(e.target.files[0] || null)}
            />
            <small>API manufacturing, formulation, batch tracking</small>
          </div>
          
          <div className="card">
            <label>Quality Control (CSV)</label>
            <input 
              type="file" 
              accept=".csv" 
              onChange={e => setCmmsFile(e.target.files[0] || null)}
            />
            <small>LIMS, test results, quality certificates</small>
          </div>
          
          <div className="card">
            <label>Environmental Monitoring (CSV)</label>
            <input 
              type="file" 
              accept=".csv" 
              onChange={e => setNetworkFile(e.target.files[0] || null)}
            />
            <small>Temperature, humidity, contamination control</small>
          </div>
          
          <div className="card">
            <label>Serialization Data (CSV)</label>
            <input 
              type="file" 
              accept=".csv" 
              onChange={e => setHistorianFile(e.target.files[0] || null)}
            />
            <small>Track & trace, serialization, packaging</small>
          </div>
        </div>

        <div className="controls" style={{ marginTop: 20 }}>
          <label>
            Firmware Threshold (months): 
            <input 
              type="number" 
              value={threshold} 
              onChange={e => setThreshold(Number(e.target.value))}
              style={{ width: 80, marginLeft: 8 }}
            />
          </label>
          <button 
            className="button" 
            onClick={analyze} 
            disabled={loading}
          >
            {loading ? 'Canonizing...' : 'Canonize Assets'}
          </button>
        </div>

        {error && <div className="notice">{error}</div>}
      </section>

      {result && (
        <section className="results">
          <h3>Canonization Results {selectedPlant !== 'all' ? `- ${selectedPlant}` : ''}</h3>
          
          {/* Plant Selection */}
          {plants.length > 1 && (
            <div className="controls" style={{ marginBottom: 20 }}>
              <label>
                Plant: 
                <select 
                  value={selectedPlant} 
                  onChange={e => setSelectedPlant(e.target.value)}
                  style={{ marginLeft: 8, padding: 8 }}
                >
                  <option value="all">All Plants ({result.assets.length} assets)</option>
                  {plants.map(plant => {
                    const plantAssetCount = result.assets.filter(a => a.plant === plant).length
                    return (
                      <option key={plant} value={plant}>
                        {plant} ({plantAssetCount} assets)
                      </option>
                    )
                  })}
                </select>
              </label>
            </div>
          )}

          {/* FDA 21 CFR Part 11 Compliance */}
          <div className="card" style={{ marginTop: 20 }}>
            <h4>FDA 21 CFR Part 11 Compliance</h4>
            <div className="kpis">
              <div className="kpi">
                <div className="label">FDA 21 CFR Part 11 Compliant</div>
                <div className="value" style={{ color: '#10B981' }}>
                  {filteredKPIs.fda21cfr11_compliant}
                </div>
              </div>
              <div className="kpi">
                <div className="label">GAMP 5 Categorized</div>
                <div className="value" style={{ color: '#3B82F6' }}>
                  {filteredKPIs.gamp5_categorized}
                </div>
              </div>
              <div className="kpi">
                <div className="label">GMP Critical</div>
                <div className="value" style={{ color: '#EF4444' }}>
                  {filteredKPIs.gmp_critical}
                </div>
              </div>
              <div className="kpi">
                <div className="label">Data Integrity</div>
                <div className="value" style={{ color: '#8B5CF6' }}>
                  {filteredKPIs.data_integrity}
                </div>
              </div>
            </div>
          </div>

          {/* Batch Process & Quality Control */}
          <div className="card" style={{ marginTop: 20 }}>
            <h4>Batch Process & Quality Control</h4>
            <div className="kpis">
              <div className="kpi">
                <div className="label">Batch Tracking</div>
                <div className="value" style={{ color: '#10B981' }}>
                  {filteredKPIs.batch_tracking}
                </div>
              </div>
              <div className="kpi">
                <div className="label">Serialization</div>
                <div className="value" style={{ color: '#3B82F6' }}>
                  {filteredKPIs.serialization}
                </div>
              </div>
              <div className="kpi">
                <div className="label">Track & Trace</div>
                <div className="value" style={{ color: '#F59E0B' }}>
                  {filteredKPIs.track_trace}
                </div>
              </div>
              <div className="kpi">
                <div className="label">Contamination Control</div>
                <div className="value" style={{ color: '#EF4444' }}>
                  {filteredKPIs.contamination_control}
                </div>
              </div>
              <div className="kpi">
                <div className="label">Environmental Monitoring</div>
                <div className="value" style={{ color: '#8B5CF6' }}>
                  {filteredKPIs.environmental_monitoring}
                </div>
              </div>
              <div className="kpi">
                <div className="label">Temperature Control</div>
                <div className="value" style={{ color: '#06B6D4' }}>
                  {filteredKPIs.temperature_control}
                </div>
              </div>
            </div>
          </div>

          {/* Plant Mapping */}
          {filteredPlantMapping && filteredPlantMapping.units.length > 0 && (
            <div className="card" style={{ marginTop: 20 }}>
              <h4>🏭 Pharmaceutical Plant Mapping</h4>
              
              {/* Process Units */}
              <div style={{ marginBottom: 20 }}>
                <h5>Process Units</h5>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Unit</th>
                        <th>Function</th>
                        <th>Criticality</th>
                        <th>FDA 21 CFR Part 11</th>
                        <th>GMP Critical</th>
                        <th>Batch Tracking</th>
                        <th>Contamination Control</th>
                        <th>Assets</th>
                        <th>Network %</th>
                        <th>Blind Spots</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPlantMapping.units.map(unit => (
                        <tr key={unit.name}>
                          <td>{unit.name}</td>
                          <td>{unit.function}</td>
                          <td>
                            <span style={{ 
                              color: unit.criticality === 'Critical' ? '#EF4444' : 
                                     unit.criticality === 'High' ? '#F59E0B' : '#3B82F6'
                            }}>
                              {unit.criticality}
                            </span>
                          </td>
                          <td>
                            <span style={{ color: '#10B981' }}>
                              {unit.fda21cfr11}
                            </span>
                          </td>
                          <td>
                            <span style={{ color: '#EF4444' }}>
                              {unit.gmpCritical}
                            </span>
                          </td>
                          <td>
                            <span style={{ color: '#10B981' }}>
                              {unit.batchTracking}
                            </span>
                          </td>
                          <td>
                            <span style={{ color: '#EF4444' }}>
                              {unit.contaminationControl}
                            </span>
                          </td>
                          <td>{unit.assetCount}</td>
                          <td>
                            <span style={{ 
                              color: unit.networkCoverage >= 80 ? '#10B981' : 
                                     unit.networkCoverage >= 60 ? '#F59E0B' : '#EF4444'
                            }}>
                              {unit.networkCoverage}%
                            </span>
                          </td>
                          <td>
                            <span style={{ 
                              color: unit.blindSpots > 0 ? '#EF4444' : '#10B981'
                            }}>
                              {unit.blindSpots}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Critical Paths */}
              <div style={{ marginBottom: 20 }}>
                <h5>Critical Process Paths</h5>
                {filteredPlantMapping.criticalPaths.map((path, index) => (
                  <div key={index} style={{ 
                    marginBottom: 10, 
                    padding: 10, 
                    backgroundColor: '#F3F4F6', 
                    borderRadius: 8 
                  }}>
                    <strong>{path.name}</strong>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>
                      {path.description}
                    </div>
                    <div style={{ fontSize: '12px', marginTop: 4 }}>
                      Units: {path.units.join(' → ')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Material Flows */}
              <div>
                <h5>Material Flows</h5>
                {filteredPlantMapping.materialFlows.map((flow, index) => (
                  <div key={index} style={{ 
                    marginBottom: 8, 
                    padding: 8, 
                    backgroundColor: '#F9FAFB', 
                    borderRadius: 6 
                  }}>
                    <span style={{ 
                      color: flow.criticality === 'Critical' ? '#EF4444' : '#F59E0B'
                    }}>
                      {flow.from} → {flow.to}: {flow.material}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Crown Jewels */}
          {filteredCrownJewels && filteredCrownJewels.length > 0 && (
            <div className="card" style={{ marginTop: 20 }}>
              <h4>👑 Crown Jewels ({filteredCrownJewels.length})</h4>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Tag ID</th>
                      <th>Unit</th>
                      <th>Type</th>
                      <th>FDA 21 CFR Part 11</th>
                      <th>GMP Critical</th>
                      <th>Criticality</th>
                      <th>Network</th>
                      <th>Risk Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCrownJewels.map(asset => (
                      <tr key={asset.canon_id}>
                        <td>{asset.tag_id}</td>
                        <td>{asset.unit}</td>
                        <td>{asset.instrument_type}</td>
                        <td>
                          <span style={{ 
                            color: asset.fda21cfr11Compliant ? '#10B981' : '#EF4444'
                          }}>
                            {asset.fda21cfr11Compliant ? 'Compliant' : 'Non-Compliant'}
                          </span>
                        </td>
                        <td>
                          <span style={{ 
                            color: asset.gmpCritical ? '#EF4444' : '#10B981'
                          }}>
                            {asset.gmpCritical ? 'Critical' : 'Standard'}
                          </span>
                        </td>
                        <td>
                          <span style={{ 
                            color: asset.criticality === 'Critical' ? '#EF4444' : '#F59E0B'
                          }}>
                            {asset.criticality}
                          </span>
                        </td>
                        <td>
                          <span style={{ 
                            color: asset.network_status === 'ON_NETWORK' ? '#10B981' : '#EF4444'
                          }}>
                            {asset.network_status}
                          </span>
                        </td>
                        <td>{asset.risk_score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Asset Table */}
          <div className="card" style={{ marginTop: 20 }}>
            <h4>Canonical Asset Model ({filteredAssets.length} assets)</h4>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tag ID</th>
                    <th>Unit</th>
                    <th>Type</th>
                    <th>GAMP 5</th>
                    <th>Control Level</th>
                    <th>Criticality</th>
                    <th>FDA 21 CFR Part 11</th>
                    <th>GMP Critical</th>
                    <th>Network</th>
                    <th>Firmware</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.map(asset => (
                    <tr key={asset.canon_id}>
                      <td>{asset.tag_id}</td>
                      <td>{asset.unit}</td>
                      <td>{asset.instrument_type}</td>
                      <td>
                        <span style={{ 
                          color: asset.gamp5Category ? '#3B82F6' : '#6B7280'
                        }}>
                          {asset.gamp5Category || 'N/A'}
                        </span>
                      </td>
                      <td>{asset.control_level}</td>
                      <td>
                        <span style={{ 
                          color: asset.criticality === 'Critical' ? '#EF4444' : 
                                 asset.criticality === 'High' ? '#F59E0B' : 
                                 asset.criticality === 'Medium' ? '#3B82F6' : '#10B981'
                        }}>
                          {asset.criticality}
                        </span>
                      </td>
                      <td>
                        <span style={{ 
                          color: asset.fda21cfr11Compliant ? '#10B981' : '#EF4444'
                        }}>
                          {asset.fda21cfr11Compliant ? 'Compliant' : 'Non-Compliant'}
                        </span>
                      </td>
                      <td>
                        <span style={{ 
                          color: asset.gmpCritical ? '#EF4444' : '#10B981'
                        }}>
                          {asset.gmpCritical ? 'Critical' : 'Standard'}
                        </span>
                      </td>
                      <td>
                        <span style={{ 
                          color: asset.network_status === 'ON_NETWORK' ? '#10B981' : '#EF4444'
                        }}>
                          {asset.network_status}
                        </span>
                      </td>
                      <td>
                        <span style={{ 
                          color: asset.firmware_status === 'CURRENT' ? '#10B981' : 
                                 asset.firmware_status === 'OUTDATED' ? '#F59E0B' : '#6B7280'
                        }}>
                          {asset.firmware_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Evidence Trail */}
          <div className="card" style={{ marginTop: 20 }}>
            <h4>Audit Evidence Trail</h4>
            <div style={{ fontSize: '12px', color: '#6A6F76' }}>
              <div><strong>Industry:</strong> {result.industry}</div>
              <div><strong>Plant:</strong> {selectedPlant === 'all' ? result.plant : selectedPlant}</div>
              <div><strong>Standards:</strong> {result.standards?.join(', ')}</div>
              <div><strong>Governance:</strong> {result.governance?.join(', ')}</div>
              <div><strong>Evidence Hash:</strong> {result.evidenceHash}</div>
              <div><strong>Timestamp:</strong> {result.timestamp}</div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}






