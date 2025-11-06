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
      const res = await fetch('/api/analyze-oil-gas-v2', {
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

          {/* Oil & Gas KPIs - OBJECTIVE METRICS ONLY */}
          <div className="kpis">
            <div className="kpi">
              <div className="label">Total Assets</div>
              <div className="value">{result.kpis.total_assets}</div>
            </div>
            <div className="kpi">
              <div className="label">Discovery Coverage</div>
              <div className="value" style={{ 
                color: result.kpis.coverage_percentage >= 80 ? '#10B981' : 
                       result.kpis.coverage_percentage >= 60 ? '#F59E0B' : '#EF4444'
              }}>
                {result.kpis.coverage_percentage}%
              </div>
            </div>
            <div className="kpi">
              <div className="label">Matched Assets</div>
              <div className="value" style={{ color: '#10B981' }}>
                {result.kpis.matched_assets}
              </div>
            </div>
            <div className="kpi">
              <div className="label">Blind Spots</div>
              <div className="value" style={{ color: '#EF4444' }}>
                {result.kpis.blind_spots}
              </div>
            </div>
            <div className="kpi">
              <div className="label">Process Units</div>
              <div className="value">{Object.keys(result.processUnitDistribution || {}).length}</div>
            </div>
            <div className="kpi">
              <div className="label">Device Types</div>
              <div className="value">{Object.keys(result.deviceTypeDistribution || {}).length}</div>
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

              {/* Step 2: Security Management - ONLY show if we have data */}
              {result.otDiscoveryAnalysis.managedPercentage !== undefined && 
               (result.otDiscoveryAnalysis.managedPercentage > 0 || 
                result.otDiscoveryAnalysis.patchedPercentage > 0 ||
                result.otDiscoveryAnalysis.encryptionPercentage > 0 ||
                result.otDiscoveryAnalysis.authenticationPercentage > 0) && (
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

          {/* Process Unit Distribution - OBJECTIVE */}
          {result.processUnitDistribution && Object.keys(result.processUnitDistribution).length > 0 && (
            <div className="card" style={{ marginTop: 20 }}>
              <h4>🏭 Process Unit Distribution</h4>
              <p className="subtle">Objective asset counts by process unit from engineering baseline</p>
              
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Process Unit</th>
                      <th>Total Assets</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(result.processUnitDistribution)
                      .sort((a, b) => b[1] - a[1])
                      .map(([unit, count]) => (
                        <tr key={unit}>
                          <td>{unit}</td>
                          <td>{count}</td>
                          <td>
                            {Math.round((count / result.kpis.total_assets) * 100)}%
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Device Type Distribution - OBJECTIVE */}
          {result.deviceTypeDistribution && Object.keys(result.deviceTypeDistribution).length > 0 && (
            <div className="card" style={{ marginTop: 20 }}>
              <h4>🔧 Device Type Distribution</h4>
              <p className="subtle">Asset inventory by device type</p>
              
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Device Type</th>
                      <th>Total Assets</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(result.deviceTypeDistribution)
                      .sort((a, b) => b[1] - a[1])
                      .map(([type, count]) => (
                        <tr key={type}>
                          <td>{type}</td>
                          <td>{count}</td>
                          <td>
                            {Math.round((count / result.kpis.total_assets) * 100)}%
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Manufacturer Distribution - OBJECTIVE */}
          {result.manufacturerDistribution && Object.keys(result.manufacturerDistribution).length > 0 && (
            <div className="card" style={{ marginTop: 20 }}>
              <h4>🏢 Manufacturer Distribution</h4>
              <p className="subtle">Asset inventory by manufacturer/vendor</p>
              
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Manufacturer</th>
                      <th>Total Assets</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(result.manufacturerDistribution)
                      .sort((a, b) => b[1] - a[1])
                      .map(([mfr, count]) => (
                        <tr key={mfr}>
                          <td>{mfr}</td>
                          <td>{count}</td>
                          <td>
                            {Math.round((count / result.kpis.total_assets) * 100)}%
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Suggested Manual Matches - FOR CLIENT ENRICHMENT */}
          {result.suggestedMatches && result.suggestedMatches.length > 0 && (
            <div className="card" style={{ marginTop: 20, backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }}>
              <h4>🔗 Suggested Asset Matches (Manual Review Required)</h4>
              <p className="subtle">
                These assets couldn't be automatically matched. Review suggested matches below and contact your OT team to verify.
              </p>
              
              {result.suggestedMatches.slice(0, 10).map((suggestion, idx) => (
                <div key={idx} style={{ 
                  marginBottom: 15, 
                  padding: 15, 
                  backgroundColor: '#FFFBEB', 
                  borderRadius: 8,
                  borderLeft: '4px solid #F59E0B'
                }}>
                  <div style={{ marginBottom: 10 }}>
                    <strong>Engineering Asset:</strong> {suggestion.engineering.tag_id}
                    <br/>
                    <span style={{ fontSize: '13px', color: '#6B7280' }}>
                      {suggestion.engineering.unit} • {suggestion.engineering.device_type}
                    </span>
                  </div>
                  
                  {suggestion.potentialMatches && suggestion.potentialMatches.length > 0 ? (
                    <div style={{ marginLeft: 20 }}>
                      <strong style={{ fontSize: '13px', color: '#92400E' }}>Potential Matches:</strong>
                      {suggestion.potentialMatches.map((match, midx) => (
                        <div key={midx} style={{ 
                          marginTop: 8,
                          padding: 10,
                          backgroundColor: '#FFFFFF',
                          borderRadius: 6,
                          fontSize: '13px'
                        }}>
                          → <strong>{match.discovered.hostname || match.discovered.ip_address}</strong>
                          {match.discovered.ip_address && ` (${match.discovered.ip_address})`}
                          <br/>
                          <span style={{ color: '#059669' }}>
                            {match.confidence}% confidence
                          </span>
                          {' • '}
                          <span style={{ color: '#6B7280' }}>
                            {match.reason}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ marginLeft: 20, fontSize: '13px', color: '#6B7280', fontStyle: 'italic' }}>
                      No automatic suggestions. Manual investigation required.
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

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
