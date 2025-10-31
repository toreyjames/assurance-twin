import React, { useState } from 'react'
import Papa from 'papaparse'
import './styles.css'

const readFileText = (file) => new Promise((resolve, reject) => {
  const r = new FileReader()
  r.onload = () => resolve(r.result)
  r.onerror = reject
  r.readAsText(file)
})

// Oil & Gas Industry-Specific Canonizer UI
export default function OilGasCanonizer() {
  const [engineeringFile, setEngineeringFile] = useState(null)
  const [cmmsFile, setCmmsFile] = useState(null)
  const [networkFile, setNetworkFile] = useState(null)
  const [historianFile, setHistorianFile] = useState(null)
  const [otDiscoveryFile, setOtDiscoveryFile] = useState(null)
  const [threshold, setThreshold] = useState(18)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [selectedPlant, setSelectedPlant] = useState('all')

  const analyze = async () => {
    setError(null)
    if (!engineeringFile && !cmmsFile && !networkFile && !historianFile && !otDiscoveryFile) {
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
      if (otDiscoveryFile) payload.otDiscoveryCsv = await readFileText(otDiscoveryFile)

      console.log('Sending payload:', payload)
      const res = await fetch('/api/analyze-oil-gas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      console.log('Response status:', res.status)
      if (!res.ok) {
        const errorText = await res.text()
        console.error('Error response:', errorText)
        throw new Error(`Canonization failed: ${res.status} - ${errorText}`)
      }
      
      const data = await res.json()
      console.log('Response data:', data)
      setResult(data)
    } catch (e) {
      console.error('Analysis error:', e)
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
    critical_assets: filteredAssets.filter(a => a.criticality === 'Critical').length,
    crown_jewel_assets: filteredAssets.filter(a => a.is_crown_jewel).length,
    critical_path_assets: filteredAssets.filter(a => a.is_critical_path).length,
    sis_assets: filteredAssets.filter(a => a.is_sis).length,
    process_critical_assets: filteredAssets.filter(a => a.is_process_critical).length,
    network_coverage: filteredAssets.length > 0 ? 
      Math.round((filteredAssets.filter(a => a.network_status === 'ON_NETWORK').length / filteredAssets.length) * 100) : 0,
    outdated_assets: filteredAssets.filter(a => a.firmware_status === 'OUTDATED').length,
    security_level_4: filteredAssets.filter(a => a.security_level === 4).length,
    security_level_3: filteredAssets.filter(a => a.security_level === 3).length,
    security_level_2: filteredAssets.filter(a => a.security_level === 2).length,
    security_level_1: filteredAssets.filter(a => a.security_level === 1).length,
    field_level_assets: filteredAssets.filter(a => a.control_level === 'Field_Level').length,
    control_level_assets: filteredAssets.filter(a => a.control_level === 'Control_Level').length,
    supervisory_level_assets: filteredAssets.filter(a => a.control_level === 'Supervisory_Level').length,
    safety_level_assets: filteredAssets.filter(a => a.control_level === 'Safety_Level').length,
    engineering_without_network: filteredAssets.filter(a => 
      a.visibility_flags.includes('ENGINEERING') && 
      !a.visibility_flags.includes('NETWORK')
    ).length,
    engineering_without_cmms: filteredAssets.filter(a => 
      a.visibility_flags.includes('ENGINEERING') && 
      !a.visibility_flags.includes('CMMS')
    ).length,
    network_orphans: filteredAssets.filter(a => 
      a.visibility_flags.includes('NETWORK') && 
      !a.visibility_flags.includes('ENGINEERING')
    ).length,
    critical_blind_spots: filteredAssets.filter(a => 
      (a.is_crown_jewel || a.is_critical_path || a.is_sis) && 
      !a.visibility_flags.includes('NETWORK')
    ).length,
    blind_spot_percentage: filteredAssets.length > 0 ? 
      Math.round((filteredAssets.filter(a => 
        a.visibility_flags.includes('ENGINEERING') && 
        !a.visibility_flags.includes('NETWORK')
      ).length / filteredAssets.length) * 100) : 0
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
        sisAssets: unitAssets.filter(a => a.is_sis).length,
        networkCoverage: result.otDiscoveryAnalysis ? 
          Math.round((result.otDiscoveryAnalysis.matchedAssets / result.otDiscoveryAnalysis.engineeringAssets) * 100) : 
          (unitAssets.length > 0 ? 
            Math.round((unitAssets.filter(a => a.network_status === 'ON_NETWORK').length / unitAssets.length) * 100) : 0),
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
          <div className="brand-title">Oil & Gas OT Assurance Twin</div>
        </div>
        <div className="subtle">ISA/IEC 62443, IEC 61511 Compliant Refinery Canonizer</div>
      </header>

      <section className="hero">
        <h2>Refinery Asset Canonization</h2>
        <p className="subtle">
          Industry-specific canonizer for oil & gas refineries. 
          Integrates engineering, CMMS, network, and historian data to build 
          a comprehensive asset model with process safety, cybersecurity, 
          and operational criticality assessment.
        </p>

        <div className="grid grid-2" style={{ marginTop: 20 }}>
          <div className="card">
            <label>Engineering Data (CSV)</label>
            <input 
              type="file" 
              accept=".csv" 
              onChange={e => setEngineeringFile(e.target.files[0] || null)}
            />
            <small>Asset tags, process units, instrument types, criticality</small>
          </div>
          
          <div className="card">
            <label>CMMS Data (CSV)</label>
            <input 
              type="file" 
              accept=".csv" 
              onChange={e => setCmmsFile(e.target.files[0] || null)}
            />
            <small>Asset IDs, OEM, models, last patch dates</small>
          </div>
          
          <div className="card">
            <label>Network Data (CSV)</label>
            <input 
              type="file" 
              accept=".csv" 
              onChange={e => setNetworkFile(e.target.files[0] || null)}
            />
            <small>IP addresses, MAC addresses, protocols, last seen</small>
          </div>
          
          <div className="card">
            <label>Historian Data (CSV)</label>
            <input 
              type="file" 
              accept=".csv" 
              onChange={e => setHistorianFile(e.target.files[0] || null)}
            />
            <small>Performance data, uptime, alarms, quality metrics</small>
          </div>
          <div className="card" style={{ backgroundColor: '#F0F9FF', borderColor: '#3B82F6' }}>
            <label>🔍 OT Discovery Tool Data (CSV)</label>
            <input 
              type="file" 
              accept=".csv" 
              onChange={e => setOtDiscoveryFile(e.target.files[0] || null)}
            />
            <small>What the OT Discovery Tool actually found on the network</small>
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
                Refinery: 
                <select 
                  value={selectedPlant} 
                  onChange={e => setSelectedPlant(e.target.value)}
                  style={{ marginLeft: 8, padding: 8 }}
                >
                  <option value="all">All Refineries ({result.assets.length} assets)</option>
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

          {/* Oil & Gas KPIs */}
          <div className="kpis">
            <div className="kpi">
              <div className="label">Total Assets</div>
              <div className="value">{filteredKPIs.total_assets}</div>
            </div>
            <div className="kpi">
              <div className="label">Critical Assets</div>
              <div className="value" style={{ color: '#EF4444' }}>
                {filteredKPIs.critical_assets}
              </div>
            </div>
            <div className="kpi">
              <div className="label">Crown Jewels</div>
              <div className="value" style={{ color: '#DC2626' }}>
                {filteredKPIs.crown_jewel_assets}
              </div>
            </div>
            <div className="kpi">
              <div className="label">Critical Path</div>
              <div className="value" style={{ color: '#F59E0B' }}>
                {filteredKPIs.critical_path_assets}
              </div>
            </div>
            <div className="kpi">
              <div className="label">SIS Assets</div>
              <div className="value" style={{ color: '#8B5CF6' }}>
                {filteredKPIs.sis_assets}
              </div>
            </div>
          </div>

          {/* OT Discovery & Security Analysis */}
          {result.otDiscoveryAnalysis && (
            <div className="card" style={{ marginTop: 20, backgroundColor: '#F0F9FF', borderColor: '#3B82F6' }}>
              <h4>🔍 OT Discovery & Security Management Analysis</h4>
              <p className="subtle" style={{ marginBottom: 15 }}>
                Engineering baseline compared against actual network discovery to identify coverage gaps and security posture for CISO audit readiness.
              </p>
              
              {/* Step 1: Asset Inventory & Discovery */}
              <div style={{ marginBottom: 20 }}>
                <h5 style={{ fontSize: '14px', color: '#1E40AF', marginBottom: 10 }}>
                  📦 Step 1: Asset Inventory & Discovery Coverage
                </h5>
                <div className="kpis">
                  <div className="kpi">
                    <div className="label">Engineering Assets</div>
                    <div className="value">{result.otDiscoveryAnalysis.engineeringAssets}</div>
                    <small style={{ color: '#6B7280' }}>What we HAVE</small>
                  </div>
                  <div className="kpi">
                    <div className="label">Discovered Assets</div>
                    <div className="value">{result.otDiscoveryAnalysis.discoveredAssets}</div>
                    <small style={{ color: '#6B7280' }}>What we can SEE</small>
                  </div>
                  <div className="kpi">
                    <div className="label">Matched Assets</div>
                    <div className="value" style={{ color: '#10B981' }}>
                      {result.otDiscoveryAnalysis.matchedAssets}
                    </div>
                    <small style={{ color: '#6B7280' }}>Verified matches</small>
                  </div>
                  <div className="kpi">
                    <div className="label">Discovery Coverage</div>
                    <div className="value" style={{ 
                      color: result.otDiscoveryAnalysis.coveragePercentage >= 80 ? '#10B981' : 
                             result.otDiscoveryAnalysis.coveragePercentage >= 60 ? '#F59E0B' : '#EF4444'
                    }}>
                      {result.otDiscoveryAnalysis.coveragePercentage}%
                    </div>
                    <small style={{ color: '#6B7280' }}>
                      {result.otDiscoveryAnalysis.coveragePercentage >= 80 ? 'Excellent' : 
                       result.otDiscoveryAnalysis.coveragePercentage >= 60 ? 'Good' : 'Needs Attention'}
                    </small>
                  </div>
                  <div className="kpi">
                    <div className="label">Blind Spots</div>
                    <div className="value" style={{ color: '#EF4444' }}>
                      {result.otDiscoveryAnalysis.blindSpots}
                    </div>
                    <small style={{ color: '#6B7280' }}>Not discovered</small>
                  </div>
                </div>
              </div>

              {/* Step 2: Security Management */}
              {result.otDiscoveryAnalysis.managedPercentage !== undefined && (
                <div style={{ marginBottom: 20 }}>
                  <h5 style={{ fontSize: '14px', color: '#059669', marginBottom: 10 }}>
                    🛡️ Step 2: Security Management Coverage
                  </h5>
                  <div className="kpis">
                    <div className="kpi">
                      <div className="label">Managed by Security Tools</div>
                      <div className="value" style={{ 
                        color: result.otDiscoveryAnalysis.managedPercentage >= 70 ? '#10B981' : 
                               result.otDiscoveryAnalysis.managedPercentage >= 50 ? '#F59E0B' : '#EF4444'
                      }}>
                        {result.otDiscoveryAnalysis.managedPercentage}%
                      </div>
                      <small style={{ color: '#6B7280' }}>{result.otDiscoveryAnalysis.securityManaged} assets</small>
                    </div>
                    <div className="kpi">
                      <div className="label">Current Security Patches</div>
                      <div className="value" style={{ 
                        color: result.otDiscoveryAnalysis.patchedPercentage >= 80 ? '#10B981' : 
                               result.otDiscoveryAnalysis.patchedPercentage >= 60 ? '#F59E0B' : '#EF4444'
                      }}>
                        {result.otDiscoveryAnalysis.patchedPercentage}%
                      </div>
                      <small style={{ color: '#6B7280' }}>{result.otDiscoveryAnalysis.securityPatched} assets</small>
                    </div>
                    {result.otDiscoveryAnalysis.encryptionPercentage !== undefined && (
                      <div className="kpi">
                        <div className="label">Encryption Enabled</div>
                        <div className="value" style={{ color: '#6B7280' }}>
                          {result.otDiscoveryAnalysis.encryptionPercentage}%
                        </div>
                        <small style={{ color: '#6B7280' }}>{result.otDiscoveryAnalysis.withEncryption} assets</small>
                      </div>
                    )}
                    {result.otDiscoveryAnalysis.authenticationPercentage !== undefined && (
                      <div className="kpi">
                        <div className="label">Authentication Required</div>
                        <div className="value" style={{ color: '#6B7280' }}>
                          {result.otDiscoveryAnalysis.authenticationPercentage}%
                        </div>
                        <small style={{ color: '#6B7280' }}>{result.otDiscoveryAnalysis.withAuthentication} assets</small>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Vulnerability Posture */}
              {result.otDiscoveryAnalysis.totalVulnerabilities !== undefined && result.otDiscoveryAnalysis.totalVulnerabilities > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <h5 style={{ fontSize: '14px', color: '#DC2626', marginBottom: 10 }}>
                    ⚠️ Step 3: Vulnerability Posture
                  </h5>
                  <div className="kpis">
                    <div className="kpi">
                      <div className="label">Total Vulnerabilities</div>
                      <div className="value" style={{ color: '#EF4444' }}>
                        {result.otDiscoveryAnalysis.totalVulnerabilities}
                      </div>
                      <small style={{ color: '#6B7280' }}>Known issues</small>
                    </div>
                    <div className="kpi">
                      <div className="label">Total CVEs</div>
                      <div className="value" style={{ color: '#EF4444' }}>
                        {result.otDiscoveryAnalysis.totalCVEs}
                      </div>
                      <small style={{ color: '#6B7280' }}>Common vulnerabilities</small>
                    </div>
                    {result.otDiscoveryAnalysis.criticalWithVulnerabilities > 0 && (
                      <div className="kpi">
                        <div className="label">Critical Assets at Risk</div>
                        <div className="value" style={{ color: '#DC2626', fontWeight: 'bold' }}>
                          {result.otDiscoveryAnalysis.criticalWithVulnerabilities}
                        </div>
                        <small style={{ color: '#DC2626' }}>URGENT</small>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div style={{ marginTop: 20, padding: 15, backgroundColor: '#EFF6FF', borderRadius: 8, borderLeft: '4px solid #3B82F6' }}>
                <strong style={{ color: '#1E40AF' }}>Analysis Summary:</strong>
                <p style={{ fontSize: '14px', color: '#1E3A8A', marginTop: 8, marginBottom: 0 }}>
                  {result.otDiscoveryAnalysis.summary}
                </p>
              </div>
            </div>
          )}

          {/* Plant Mapping */}
          {filteredPlantMapping && filteredPlantMapping.units.length > 0 && (
            <div className="card" style={{ marginTop: 20 }}>
              <h4>🏭 Plant Mapping & Critical Paths</h4>
              
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
                        <th>Crown Jewel</th>
                        <th>Critical Path</th>
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
                          <td>{unit.crownJewel ? '👑' : '✗'}</td>
                          <td>{unit.criticalPath ? '⚡' : '✗'}</td>
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
                <h5>Critical Paths</h5>
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

          {/* Security Level Distribution */}
          <div className="card" style={{ marginTop: 20 }}>
            <h4>ISA/IEC 62443 Security Level Distribution</h4>
            <div className="kpis">
              <div className="kpi">
                <div className="label">SL-4 (Critical)</div>
                <div className="value" style={{ color: '#EF4444' }}>
                  {filteredKPIs.security_level_4}
                </div>
              </div>
              <div className="kpi">
                <div className="label">SL-3 (High)</div>
                <div className="value" style={{ color: '#F59E0B' }}>
                  {filteredKPIs.security_level_3}
                </div>
              </div>
              <div className="kpi">
                <div className="label">SL-2 (Medium)</div>
                <div className="value" style={{ color: '#3B82F6' }}>
                  {filteredKPIs.security_level_2}
                </div>
              </div>
              <div className="kpi">
                <div className="label">SL-1 (Low)</div>
                <div className="value" style={{ color: '#10B981' }}>
                  {filteredKPIs.security_level_1}
                </div>
              </div>
            </div>
          </div>

          {/* Control System Hierarchy */}
          <div className="card" style={{ marginTop: 20 }}>
            <h4>Control System Hierarchy Distribution</h4>
            <div className="kpis">
              <div className="kpi">
                <div className="label">Field Level</div>
                <div className="value">{filteredKPIs.field_level_assets}</div>
              </div>
              <div className="kpi">
                <div className="label">Control Level</div>
                <div className="value">{filteredKPIs.control_level_assets}</div>
              </div>
              <div className="kpi">
                <div className="label">Supervisory Level</div>
                <div className="value">{filteredKPIs.supervisory_level_assets}</div>
              </div>
              <div className="kpi">
                <div className="label">Safety Level</div>
                <div className="value" style={{ color: '#8B5CF6' }}>
                  {filteredKPIs.safety_level_assets}
                </div>
              </div>
            </div>
          </div>

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
                    <th>Security Level</th>
                    <th>SIS</th>
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
                      <td>SL-{asset.security_level}</td>
                      <td>{asset.is_sis ? '✓' : '✗'}</td>
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
              <div><strong>Refinery:</strong> {selectedPlant === 'all' ? result.refinery : selectedPlant}</div>
              <div><strong>Evidence Hash:</strong> {result.evidenceHash}</div>
              <div><strong>Timestamp:</strong> {result.timestamp}</div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
