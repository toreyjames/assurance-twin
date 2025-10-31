import React, { useState } from 'react'
import Papa from 'papaparse'
import './styles.css'

const readFileText = (file) => new Promise((resolve, reject) => {
  const r = new FileReader()
  r.onload = () => resolve(r.result)
  r.onerror = reject
  r.readAsText(file)
})

// Utilities Industry-Specific Canonizer UI
export default function UtilitiesCanonizer() {
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

      const res = await fetch('/api/analyze-utilities', {
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
    nerc_cip_critical: filteredAssets.filter(a => a.nercCipCritical).length,
    ferc_regulated: filteredAssets.filter(a => a.fercRegulated).length,
    grid_stability: filteredAssets.filter(a => a.gridStability).length,
    protection_systems: filteredAssets.filter(a => a.protectionSystems).length,
    environmental_controls: filteredAssets.filter(a => a.environmentalControls).length,
    environmental_monitoring: filteredAssets.filter(a => a.environmentalMonitoring).length,
    load_management: filteredAssets.filter(a => a.loadManagement).length,
    cyber_security: filteredAssets.filter(a => a.cyberSecurity).length,
    arc_flash_protection: filteredAssets.filter(a => a.arcFlashProtection).length,
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
        nercCip: unitAssets.filter(a => a.nercCipCritical).length,
        fercRegulated: unitAssets.filter(a => a.fercRegulated).length,
        gridStability: unitAssets.filter(a => a.gridStability).length,
        protectionSystems: unitAssets.filter(a => a.protectionSystems).length,
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
          <div className="brand-title">Utilities OT Assurance Twin</div>
        </div>
        <div className="subtle">NERC CIP, FERC Compliant Grid Operations Canonizer</div>
      </header>

      <section className="hero">
        <h2>Power & Utilities Asset Canonization</h2>
        <p className="subtle">
          Industry-specific canonizer for power generation, transmission, and distribution. 
          Integrates grid operations data, environmental controls, and regulatory compliance 
          for comprehensive asset assurance.
        </p>

        <div className="grid grid-2" style={{ marginTop: 20 }}>
          <div className="card">
            <label>Grid Operations Data (CSV)</label>
            <input 
              type="file" 
              accept=".csv" 
              onChange={e => setEngineeringFile(e.target.files[0] || null)}
            />
            <small>Generation, transmission, distribution assets</small>
          </div>
          
          <div className="card">
            <label>Protection Systems (CSV)</label>
            <input 
              type="file" 
              accept=".csv" 
              onChange={e => setCmmsFile(e.target.files[0] || null)}
            />
            <small>Relays, IEDs, protection equipment</small>
          </div>
          
          <div className="card">
            <label>Environmental Controls (CSV)</label>
            <input 
              type="file" 
              accept=".csv" 
              onChange={e => setNetworkFile(e.target.files[0] || null)}
            />
            <small>Emission controls, environmental monitoring</small>
          </div>
          
          <div className="card">
            <label>Grid Stability Data (CSV)</label>
            <input 
              type="file" 
              accept=".csv" 
              onChange={e => setHistorianFile(e.target.files[0] || null)}
            />
            <small>SCADA, EMS, grid stability metrics</small>
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
                Utility: 
                <select 
                  value={selectedPlant} 
                  onChange={e => setSelectedPlant(e.target.value)}
                  style={{ marginLeft: 8, padding: 8 }}
                >
                  <option value="all">All Utilities ({result.assets.length} assets)</option>
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

          {/* NERC CIP Compliance */}
          <div className="card" style={{ marginTop: 20 }}>
            <h4>NERC CIP Compliance</h4>
            <div className="kpis">
              <div className="kpi">
                <div className="label">NERC CIP Critical</div>
                <div className="value" style={{ color: '#EF4444' }}>
                  {filteredKPIs.nerc_cip_critical}
                </div>
              </div>
              <div className="kpi">
                <div className="label">FERC Regulated</div>
                <div className="value" style={{ color: '#F59E0B' }}>
                  {filteredKPIs.ferc_regulated}
                </div>
              </div>
              <div className="kpi">
                <div className="label">Grid Stability</div>
                <div className="value" style={{ color: '#3B82F6' }}>
                  {filteredKPIs.grid_stability}
                </div>
              </div>
              <div className="kpi">
                <div className="label">Protection Systems</div>
                <div className="value" style={{ color: '#8B5CF6' }}>
                  {filteredKPIs.protection_systems}
                </div>
              </div>
            </div>
          </div>

          {/* Environmental & Safety Controls */}
          <div className="card" style={{ marginTop: 20 }}>
            <h4>Environmental & Safety Controls</h4>
            <div className="kpis">
              <div className="kpi">
                <div className="label">Environmental Controls</div>
                <div className="value" style={{ color: '#10B981' }}>
                  {filteredKPIs.environmental_controls}
                </div>
              </div>
              <div className="kpi">
                <div className="label">Environmental Monitoring</div>
                <div className="value" style={{ color: '#3B82F6' }}>
                  {filteredKPIs.environmental_monitoring}
                </div>
              </div>
              <div className="kpi">
                <div className="label">Load Management</div>
                <div className="value" style={{ color: '#F59E0B' }}>
                  {filteredKPIs.load_management}
                </div>
              </div>
              <div className="kpi">
                <div className="label">Cyber Security</div>
                <div className="value" style={{ color: '#8B5CF6' }}>
                  {filteredKPIs.cyber_security}
                </div>
              </div>
              <div className="kpi">
                <div className="label">Arc Flash Protection</div>
                <div className="value" style={{ color: '#EF4444' }}>
                  {filteredKPIs.arc_flash_protection}
                </div>
              </div>
            </div>
          </div>

          {/* Plant Mapping */}
          {filteredPlantMapping && filteredPlantMapping.units.length > 0 && (
            <div className="card" style={{ marginTop: 20 }}>
              <h4>🏭 Grid Operations Mapping</h4>
              
              {/* Process Units */}
              <div style={{ marginBottom: 20 }}>
                <h5>Grid Units</h5>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Unit</th>
                        <th>Function</th>
                        <th>Criticality</th>
                        <th>NERC CIP</th>
                        <th>FERC Regulated</th>
                        <th>Grid Stability</th>
                        <th>Protection Systems</th>
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
                            <span style={{ color: '#EF4444' }}>
                              {unit.nercCip}
                            </span>
                          </td>
                          <td>
                            <span style={{ color: '#F59E0B' }}>
                              {unit.fercRegulated}
                            </span>
                          </td>
                          <td>
                            <span style={{ color: '#3B82F6' }}>
                              {unit.gridStability}
                            </span>
                          </td>
                          <td>
                            <span style={{ color: '#8B5CF6' }}>
                              {unit.protectionSystems}
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
                <h5>Critical Grid Paths</h5>
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
                <h5>Power Flows</h5>
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
                      <th>NERC CIP</th>
                      <th>FERC Regulated</th>
                      <th>Grid Stability</th>
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
                            color: asset.nercCipCritical ? '#EF4444' : '#10B981'
                          }}>
                            {asset.nercCipCritical ? 'Critical' : 'Standard'}
                          </span>
                        </td>
                        <td>
                          <span style={{ 
                            color: asset.fercRegulated ? '#F59E0B' : '#10B981'
                          }}>
                            {asset.fercRegulated ? 'Regulated' : 'Non-Regulated'}
                          </span>
                        </td>
                        <td>
                          <span style={{ 
                            color: asset.gridStability ? '#3B82F6' : '#10B981'
                          }}>
                            {asset.gridStability ? 'Yes' : 'No'}
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
                    <th>Control Level</th>
                    <th>Criticality</th>
                    <th>NERC CIP</th>
                    <th>FERC Regulated</th>
                    <th>Grid Stability</th>
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
                          color: asset.nercCipCritical ? '#EF4444' : '#10B981'
                        }}>
                          {asset.nercCipCritical ? 'Critical' : 'Standard'}
                        </span>
                      </td>
                      <td>
                        <span style={{ 
                          color: asset.fercRegulated ? '#F59E0B' : '#10B981'
                        }}>
                          {asset.fercRegulated ? 'Regulated' : 'Non-Regulated'}
                        </span>
                      </td>
                      <td>
                        <span style={{ 
                          color: asset.gridStability ? '#3B82F6' : '#10B981'
                        }}>
                          {asset.gridStability ? 'Yes' : 'No'}
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
              <div><strong>Utility:</strong> {selectedPlant === 'all' ? result.plant : selectedPlant}</div>
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






