import React, { useState } from 'react'
import Papa from 'papaparse'
import dayjs from 'dayjs'
import './styles.css'

const readFileText = (file) => new Promise((resolve) => {
  const r = new FileReader()
  r.onload = (e) => resolve(e.target.result)
  r.readAsText(file)
})

export default function AutomotiveCanonizer() {
  const [engineeringBaselineFile, setEngineeringBaselineFile] = useState(null)
  const [otDiscoveryFile, setOtDiscoveryFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const analyze = async () => {
    setError(null)
    if (!engineeringBaselineFile || !otDiscoveryFile) {
      setError('Please upload both Engineering Baseline and OT Discovery Tool Data to begin analysis.')
      return
    }

    setLoading(true)
    try {
      const payload = {}
      payload.engineeringCsv = await readFileText(engineeringBaselineFile)
      payload.otDiscoveryCsv = await readFileText(otDiscoveryFile)

      console.log('Sending automotive payload:', payload)
      const res = await fetch('/api/analyze-automotive-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      console.log('Automotive response status:', res.status)
      if (!res.ok) {
        const errorText = await res.text()
        console.error('Automotive error response:', errorText)
        throw new Error(`Analysis failed: ${res.status} - ${errorText}`)
      }
      
      const data = await res.json()
      console.log('Automotive response data:', data)

      if (data.success) {
        setResult(data)
      } else {
        setError(data.detail || 'An unknown error occurred during analysis.')
      }
    } catch (err) {
      console.error('Analysis failed:', err)
      setError('Failed to connect to the analysis service or process data: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <header className="header">
        <div className="brand">
          <img src="/logo.svg" alt="Deloitte" />
          <div className="brand-title">Automotive OT Assurance Twin</div>
        </div>
        <div className="subtle">Three-Step OT Asset Assurance: Inventory → Security → Performance</div>
      </header>

      <section className="hero">
        <h2>Automotive Plant OT Assurance Analysis</h2>
        <p className="subtle">
          Comprehensive three-step analysis: (1) What assets exist? (2) Are they protected? (3) How are they performing?
        </p>

        <div className="grid grid-1" style={{ marginTop: 20 }}>
          <div className="card">
            <label>📋 Engineering Baseline (CSV)</label>
            <input 
              type="file" 
              accept=".csv" 
              onChange={e => setEngineeringBaselineFile(e.target.files[0] || null)}
            />
            <small>Complete asset inventory from engineering records (P&IDs, asset registers)</small>
          </div>
          <div className="card" style={{ backgroundColor: '#F0F9FF', borderColor: '#3B82F6' }}>
            <label>🔍 OT Discovery Tool Data (CSV)</label>
            <input 
              type="file" 
              accept=".csv" 
              onChange={e => setOtDiscoveryFile(e.target.files[0] || null)}
            />
            <small>Actual network discovery results with security and performance data</small>
          </div>
        </div>

        <div className="controls" style={{ marginTop: 20 }}>
          <button className="button" onClick={analyze} disabled={loading}>
            {loading ? 'Analyzing...' : 'Run Three-Step OT Assurance Analysis'}
          </button>
        </div>
        {error && <div className="notice" style={{ marginTop: 20 }}>{error}</div>}
      </section>

      {result && (
        <section className="results">
          <h3>OT Assurance Assessment Results</h3>

          {/* Executive Summary - OBJECTIVE METRICS ONLY */}
          <div className="card" style={{ marginTop: 20, backgroundColor: '#F8FAFC' }}>
            <h4>📊 Executive Summary - Production-Ready OT Assessment</h4>
            <p className="subtle">
              <strong>Step 1:</strong> What assets does the plant have? | <strong>Step 2:</strong> What percentage are secured?
            </p>
            <div className="kpis" style={{ marginTop: 15 }}>
              <div className="kpi" style={{ borderLeft: '4px solid #3B82F6' }}>
                <div className="label">Total Assets</div>
                <div className="value" style={{ fontSize: '24px', fontWeight: 'bold', color: '#1E40AF' }}>
                  {result.kpis.total_assets}
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                  Engineering Baseline
                </div>
              </div>
              <div className="kpi" style={{ borderLeft: '4px solid #10B981' }}>
                <div className="label">Discovery Coverage</div>
                <div className="value" style={{ 
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: result.kpis.coverage_percentage >= 80 ? '#10B981' : 
                         result.kpis.coverage_percentage >= 60 ? '#F59E0B' : '#EF4444'
                }}>
                  {result.kpis.coverage_percentage}%
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                  {result.kpis.matched_assets} assets matched
                </div>
              </div>
              <div className="kpi" style={{ borderLeft: '4px solid #8B5CF6' }}>
                <div className="label">Blind Spots</div>
                <div className="value" style={{ 
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: result.kpis.blind_spots <= 20 ? '#10B981' : 
                         result.kpis.blind_spots <= 50 ? '#F59E0B' : '#EF4444'
                }}>
                  {result.kpis.blind_spots}
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                  Not discovered
                </div>
              </div>
              <div className="kpi" style={{ borderLeft: '4px solid #F59E0B' }}>
                <div className="label">Production Lines</div>
                <div className="value" style={{ fontSize: '24px', fontWeight: 'bold', color: '#F59E0B' }}>
                  {Object.keys(result.productionLineDistribution || {}).length}
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                  Different areas
                </div>
              </div>
              <div className="kpi" style={{ borderLeft: '4px solid #6366F1' }}>
                <div className="label">Device Types</div>
                <div className="value" style={{ fontSize: '24px', fontWeight: 'bold', color: '#6366F1' }}>
                  {Object.keys(result.deviceTypeDistribution || {}).length}
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                  Asset categories
                </div>
              </div>
            </div>
          </div>

          {/* Industry Benchmarks */}
          <div className="card" style={{ marginTop: 20, backgroundColor: '#F0F9FF', border: '2px solid #3B82F6' }}>
            <h4>📊 Industry Benchmarks & Targets</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: 15 }}>
              <div>
                <h5 style={{ fontSize: '14px', marginBottom: 10 }}>OT Discovery Coverage Targets</h5>
                <div style={{ fontSize: '13px', lineHeight: 1.8, color: '#1E40AF' }}>
                  <div><span style={{ color: '#10B981', fontWeight: 'bold' }}>✅ 60-75%</span> = Industry Typical (Initial Scan)</div>
                  <div><span style={{ color: '#10B981', fontWeight: 'bold' }}>✅ 75-85%</span> = Good (Mature Program)</div>
                  <div><span style={{ color: '#10B981', fontWeight: 'bold' }}>✅ 85-95%</span> = Excellent (Best in Class)</div>
                  <div><span style={{ color: '#EF4444', fontWeight: 'bold' }}>🚨 &lt;60%</span> = Needs Investigation</div>
                  <div><span style={{ color: '#F59E0B', fontWeight: 'bold' }}>⚠️ &gt;95%</span> = Suspicious (verify baseline)</div>
                </div>
              </div>
              <div>
                <h5 style={{ fontSize: '14px', marginBottom: 10 }}>Critical Asset Coverage (KEY METRIC)</h5>
                <div style={{ fontSize: '13px', lineHeight: 1.8, color: '#1E40AF' }}>
                  <div><span style={{ color: '#10B981', fontWeight: 'bold' }}>✅ 90-100%</span> = Target (Audit Ready)</div>
                  <div><span style={{ color: '#F59E0B', fontWeight: 'bold' }}>⚠️ 70-90%</span> = Acceptable (Document Gaps)</div>
                  <div><span style={{ color: '#EF4444', fontWeight: 'bold' }}>🚨 &lt;70%</span> = RED FLAG (Action Required)</div>
                </div>
              </div>
              <div>
                <h5 style={{ fontSize: '14px', marginBottom: 10 }}>Security Controls (Per NIST CSF / IEC 62443)</h5>
                <div style={{ fontSize: '13px', lineHeight: 1.8, color: '#1E40AF' }}>
                  <div><span style={{ fontWeight: 'bold' }}>Patch Management:</span> 80%+ target</div>
                  <div><span style={{ fontWeight: 'bold' }}>Network Segmentation:</span> 70%+ target</div>
                  <div><span style={{ fontWeight: 'bold' }}>Security Managed:</span> 60%+ (4/5 controls)</div>
                </div>
              </div>
              <div>
                <h5 style={{ fontSize: '14px', marginBottom: 10 }}>Why Not 100% Discovery?</h5>
                <div style={{ fontSize: '13px', lineHeight: 1.8, color: '#1E40AF' }}>
                  <div>• Air-gapped safety systems (by design)</div>
                  <div>• Passive field devices (4-20mA sensors)</div>
                  <div>• Offline/maintenance assets</div>
                  <div>• Security zones blocking scans</div>
                </div>
              </div>
            </div>
          </div>

          {/* Production Line Distribution - OBJECTIVE */}
          {result.productionLineDistribution && Object.keys(result.productionLineDistribution).length > 0 && (
            <div className="card" style={{ marginTop: 20 }}>
              <h4>🏭 Production Line Distribution</h4>
              <p className="subtle">Objective asset counts by production line from engineering baseline</p>
              
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Production Line</th>
                      <th>Total Assets</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(result.productionLineDistribution)
                      .sort((a, b) => b[1] - a[1])
                      .map(([line, count]) => (
                        <tr key={line}>
                          <td>{line}</td>
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
              <h4>🤖 Device Type Distribution</h4>
              <p className="subtle">Asset inventory by device type (robots, PLCs, HMIs, etc.)</p>
              
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

          {/* ISO 26262 ASIL Distribution - OBJECTIVE (Standard-based) */}
          {result.asilDistribution && Object.keys(result.asilDistribution).length > 0 && (
            <div className="card" style={{ marginTop: 20 }}>
              <h4>🛡️ ISO 26262 ASIL Level Distribution</h4>
              <p className="subtle">Safety integrity levels per ISO 26262 automotive standard (OBJECTIVE metric)</p>
              
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ASIL Level</th>
                      <th>Total Assets</th>
                      <th>Percentage</th>
                      <th>Safety Requirement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(result.asilDistribution)
                      .sort((a, b) => {
                        const order = {'ASIL-D': 0, 'ASIL-C': 1, 'ASIL-B': 2, 'ASIL-A': 3, 'QM': 4}
                        return (order[a[0]] || 99) - (order[b[0]] || 99)
                      })
                      .map(([level, count]) => (
                        <tr key={level}>
                          <td style={{ 
                            color: level === 'ASIL-D' ? '#EF4444' : 
                                   level === 'ASIL-C' ? '#F59E0B' : 
                                   level === 'ASIL-B' ? '#3B82F6' : '#6B7280'
                          }}>
                            <strong>{level}</strong>
                          </td>
                          <td>{count}</td>
                          <td>
                            {Math.round((count / result.kpis.total_assets) * 100)}%
                          </td>
                          <td style={{ fontSize: '12px', color: '#6B7280' }}>
                            {level === 'ASIL-D' && 'Highest - severe injury/life-threatening'}
                            {level === 'ASIL-C' && 'High - severe/life-threatening injury'}
                            {level === 'ASIL-B' && 'Medium - moderate injury'}
                            {level === 'ASIL-A' && 'Low - light injury'}
                            {level === 'QM' && 'Quality Management - no safety risk'}
                            {!['ASIL-D', 'ASIL-C', 'ASIL-B', 'ASIL-A', 'QM'].includes(level) && 'Not specified'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 2: SECURITY COVERAGE */}
          <div className="card" style={{ marginTop: 20, borderLeft: '4px solid #10B981', backgroundColor: '#F0FDF4' }}>
            <h4>🛡️ Step 2: What Percentage Are Secured?</h4>
            <p className="subtle" style={{ marginBottom: 15 }}>
              <strong>Source:</strong> OT Discovery Tool vs Engineering Baseline comparison<br/>
              <strong>Purpose:</strong> Measure security coverage and identify gaps
            </p>
            <div style={{ marginTop: 10, padding: 12, backgroundColor: '#DCFCE7', borderLeft: '3px solid #10B981', borderRadius: 6 }}>
              <div style={{ fontSize: '13px', color: '#166534' }}>
                <strong>Key Point:</strong> This shows what percentage of our "what the plant has" assets are actually discovered, 
                verified, and secured. The OT Discovery Tool tells us what's on the network and its security posture.
              </div>
            </div>
            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: 15 }}>
              {result.security.summary}
            </p>
            
            {/* Discovery Coverage */}
            <div style={{ marginTop: 15 }}>
              <h5>🔍 Discovery Coverage: How Many Assets Are Found?</h5>
              <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: 10 }}>
                Coverage calculated against <strong>unique</strong> assets that SHOULD be discovered (network-connected devices with IP/protocol).
                Excludes passive sensors, mechanical devices, and non-networked equipment.
              </p>
              
              <div className="kpis">
                <div className="kpi" style={{ borderLeft: '4px solid #3B82F6' }}>
                  <div className="label">STEP 1: What Plant Has</div>
                  <div className="value" style={{ fontSize: '18px', fontWeight: 'bold', color: '#1E40AF' }}>
                    {result.security.engineeringAssets}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                    Total engineering assets
                  </div>
                </div>
                <div className="kpi" style={{ borderLeft: '4px solid #10B981' }}>
                  <div className="label">STEP 2: Discovered</div>
                  <div className="value" style={{ fontSize: '18px', fontWeight: 'bold', color: '#10B981' }}>
                    {result.security.discoveredAssets}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                    Found by OT discovery tool
                  </div>
                </div>
                <div className="kpi" style={{ borderLeft: '4px solid #F59E0B' }}>
                  <div className="label">STEP 2: Matched</div>
                  <div className="value" style={{ fontSize: '18px', fontWeight: 'bold', color: '#F59E0B' }}>
                    {result.security.matchedAssetsCount}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                    Verified against baseline
                  </div>
                </div>
                <div className="kpi" style={{ borderLeft: '4px solid #EF4444' }}>
                  <div className="label">Coverage %</div>
                  <div className="value" style={{ 
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: result.security.coveragePercentage >= 80 ? '#10B981' : 
                           result.security.coveragePercentage >= 60 ? '#F59E0B' : '#EF4444'
                  }}>
                    {result.security.coveragePercentage}%
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                    Of {result.security.engineeringAssets} assets secured
                  </div>
                </div>
                <div className="kpi" style={{ borderLeft: '4px solid #8B5CF6' }}>
                  <div className="label">Blind Spots (Risk)</div>
                  <div className="value" style={{ fontSize: '18px', fontWeight: 'bold', color: '#8B5CF6' }}>
                    {result.security.blindSpots}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                    In baseline but not found
                  </div>
                </div>
              </div>
                <div className="kpi">
                  <div className="label">Compliance Gaps</div>
                  <div className="value" style={{ color: '#F59E0B' }}>
                    {result.security.complianceGaps}
                  </div>
                </div>
              </div>
            </div>

            {/* Critical Security Controls */}
            <div style={{ marginTop: 20 }}>
              <h5>🛡️ Critical Security Controls (NIST CSF / IEC 62443)</h5>
              <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: 10 }}>
                Individual security controls applied to the <strong>{result.security.matchedAssetsCount} discovered assets</strong>.
              </p>
              
              <div className="kpis">
                <div className="kpi">
                  <div className="label">1. Patch Management</div>
                  <div className="value" style={{ 
                    color: result.security.securityMetrics.patchCompliancePercentage >= 80 ? '#10B981' : '#EF4444'
                  }}>
                    {result.security.securityMetrics.patchCompliantAssets}/{result.security.matchedAssetsCount}
                    <span style={{ fontSize: '11px', color: '#6B7280', marginLeft: '4px' }}>
                      ({result.security.securityMetrics.patchCompliancePercentage}%)
                    </span>
                  </div>
                </div>
                <div className="kpi">
                  <div className="label">2. Network Segmentation</div>
                  <div className="value" style={{ 
                    color: result.security.securityMetrics.firewallProtectionPercentage >= 70 ? '#10B981' : '#EF4444'
                  }}>
                    {result.security.securityMetrics.firewallProtectedAssets}/{result.security.matchedAssetsCount}
                    <span style={{ fontSize: '11px', color: '#6B7280', marginLeft: '4px' }}>
                      ({result.security.securityMetrics.firewallProtectionPercentage}%)
                    </span>
                  </div>
                </div>
                <div className="kpi">
                  <div className="label">3. Encryption</div>
                  <div className="value" style={{ 
                    color: result.security.securityMetrics.encryptionPercentage >= 50 ? '#10B981' : '#F59E0B'
                  }}>
                    {result.security.securityMetrics.encryptionEnabledAssets}/{result.security.matchedAssetsCount}
                    <span style={{ fontSize: '11px', color: '#6B7280', marginLeft: '4px' }}>
                      ({result.security.securityMetrics.encryptionPercentage}%)
                    </span>
                  </div>
                </div>
                <div className="kpi">
                  <div className="label">4. Authentication</div>
                  <div className="value" style={{ 
                    color: result.security.securityMetrics.authenticationPercentage >= 80 ? '#10B981' : '#EF4444'
                  }}>
                    {result.security.securityMetrics.authenticationRequiredAssets}/{result.security.matchedAssetsCount}
                    <span style={{ fontSize: '11px', color: '#6B7280', marginLeft: '4px' }}>
                      ({result.security.securityMetrics.authenticationPercentage}%)
                    </span>
                  </div>
                </div>
                <div className="kpi">
                  <div className="label">5. Access Control</div>
                  <div className="value" style={{ 
                    color: result.security.securityMetrics.accessControlPercentage >= 50 ? '#10B981' : '#F59E0B'
                  }}>
                    {result.security.securityMetrics.accessControlAssets}/{result.security.matchedAssetsCount}
                    <span style={{ fontSize: '11px', color: '#6B7280', marginLeft: '4px' }}>
                      ({result.security.securityMetrics.accessControlPercentage}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Composite Security Score */}
            <div style={{ marginTop: 20, padding: 15, backgroundColor: '#F0FDF4', border: '2px solid #10B981', borderRadius: 8 }}>
              <h5>✅ Composite Security Score</h5>
              <div style={{ fontSize: '14px', color: '#065F46', marginBottom: 10 }}>
                <strong>Security Managed:</strong> Assets meeting 4+ out of 5 critical security controls
              </div>
              <div className="kpis">
                <div className="kpi">
                  <div className="label">Security Managed Assets</div>
                  <div className="value" style={{ 
                    fontSize: '24px',
                    color: result.security.securityMetrics.securityManagedPercentage >= 70 ? '#10B981' : '#EF4444'
                  }}>
                    {result.security.securityMetrics.securityManagedAssets}/{result.security.matchedAssetsCount}
                    <span style={{ fontSize: '14px', color: '#6B7280', marginLeft: '6px' }}>
                      ({result.security.securityMetrics.securityManagedPercentage}%)
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#065F46', marginTop: 10 }}>
                An asset is "Security Managed" when it meets at least 4 of the 5 critical controls above.
                This composite metric indicates the asset is properly secured according to industry standards.
              </div>
            </div>

            {/* Data Quality (separate from security) */}
            <div style={{ marginTop: 20 }}>
              <h5>📊 Data Quality Metrics</h5>
              <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: 10 }}>
                Discovery confidence - indicates reliability of OT discovery tool data (NOT a security metric).
              </p>
              <div className="kpis">
                <div className="kpi">
                  <div className="label">High Confidence Discovery</div>
                  <div className="value" style={{ 
                    color: result.security.discoveryQuality.highConfidencePercentage >= 80 ? '#10B981' : '#F59E0B'
                  }}>
                    {result.security.discoveryQuality.highConfidenceAssets}/{result.security.matchedAssetsCount}
                    <span style={{ fontSize: '11px', color: '#6B7280', marginLeft: '4px' }}>
                      ({result.security.discoveryQuality.highConfidencePercentage}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Critical Assets Coverage */}
            <div style={{ marginTop: 20 }}>
              <h5>Critical Assets Coverage</h5>
              <div className="kpis">
                <div className="kpi">
                  <div className="label">Critical Assets Total</div>
                  <div className="value">{result.security.criticalAssetsDetails.total}</div>
                </div>
                <div className="kpi">
                  <div className="label">Critical Discovered</div>
                  <div className="value" style={{ color: '#10B981' }}>
                    {result.security.criticalAssetsDetails.discovered}
                  </div>
                </div>
                <div className="kpi">
                  <div className="label">Critical Coverage %</div>
                  <div className="value" style={{ 
                    color: result.security.criticalAssetsDetails.percentage >= 90 ? '#10B981' : '#EF4444'
                  }}>
                    {result.security.criticalAssetsDetails.percentage}%
                  </div>
                </div>
                <div className="kpi">
                  <div className="label">Critical Missing</div>
                  <div className="value" style={{ color: '#EF4444' }}>
                    {result.security.criticalAssetsDetails.missing}
                  </div>
                </div>
              </div>
            </div>

            {/* Blind Spots Details */}
            {result.security.blindSpotsList && result.security.blindSpotsList.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h5>🚫 Top Blind Spots (Engineering → Not Discovered)</h5>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Tag ID</th>
                        <th>Unit</th>
                        <th>Device Type</th>
                        <th>Criticality</th>
                        <th>Expected IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.security.blindSpotsList.map((asset, idx) => (
                        <tr key={idx}>
                          <td>{asset.tag_id}</td>
                          <td>{asset.unit}</td>
                          <td>{asset.device_type}</td>
                          <td>
                            <span style={{ 
                              color: asset.criticality === 'Critical' ? '#EF4444' : '#F59E0B'
                            }}>
                              {asset.criticality}
                            </span>
                          </td>
                          <td>{asset.expected_ip}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Compliance Gaps Details */}
            {result.security.complianceGapsList && result.security.complianceGapsList.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h5>⚠️ Compliance Gaps (Discovered but Security Issues)</h5>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Tag ID</th>
                        <th>Unit</th>
                        <th>Device Type</th>
                        <th>Criticality</th>
                        <th>Issues</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.security.complianceGapsList.map((asset, idx) => (
                        <tr key={idx}>
                          <td>{asset.tag_id}</td>
                          <td>{asset.unit}</td>
                          <td>{asset.device_type}</td>
                          <td>
                            <span style={{ 
                              color: asset.criticality === 'Critical' ? '#EF4444' : '#F59E0B'
                            }}>
                              {asset.criticality}
                            </span>
                          </td>
                          <td>
                            {asset.issues.map((issue, i) => (
                              <span key={i} style={{ 
                                display: 'inline-block',
                                backgroundColor: '#FEF3C7',
                                color: '#92400E',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                marginRight: '4px',
                                marginBottom: '2px'
                              }}>
                                {issue}
                              </span>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* STEP 3: OPERATIONAL PERFORMANCE */}
          <div className="card" style={{ marginTop: 20, borderLeft: '4px solid #F59E0B', backgroundColor: '#FFFBEB' }}>
            <h4>⚡ Step 3: Operational Performance</h4>
            <p className="subtle" style={{ marginBottom: 15 }}>
              <strong>Question: How are they performing?</strong><br/>
              Source: OT Discovery Tool (discovered assets only)
            </p>
            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: 15 }}>
              {result.performance.summary}
            </p>
            
            {/* Asset Performance Summary */}
            <div style={{ marginTop: 15 }}>
              <h5>Asset Performance Summary</h5>
              <div className="kpis">
                <div className="kpi">
                  <div className="label">Assets Analyzed</div>
                  <div className="value" style={{ color: '#3B82F6' }}>
                    {result.performance.assetPerformance.assetsAnalyzed}
                  </div>
                </div>
                <div className="kpi">
                  <div className="label">Performance Issues</div>
                  <div className="value" style={{ color: '#EF4444' }}>
                    {result.performance.assetPerformance.performanceIssues}
                  </div>
                </div>
                <div className="kpi">
                  <div className="label">Maintenance Due</div>
                  <div className="value" style={{ color: '#F59E0B' }}>
                    {result.performance.assetPerformance.maintenanceDue}
                  </div>
                </div>
                <div className="kpi">
                  <div className="label">Operational Assets</div>
                  <div className="value" style={{ color: '#10B981' }}>
                    {result.performance.assetPerformance.operationalAssets}
                  </div>
                </div>
              </div>
            </div>

            {/* Vulnerability Analysis */}
            <div style={{ marginTop: 20 }}>
              <h5>Vulnerability Analysis</h5>
              <div className="kpis">
                <div className="kpi">
                  <div className="label">Total Vulnerabilities</div>
                  <div className="value" style={{ color: '#EF4444' }}>
                    {result.performance.vulnerabilities.totalVulnerabilities}
                  </div>
                </div>
                <div className="kpi">
                  <div className="label">Total CVEs</div>
                  <div className="value" style={{ color: '#EF4444' }}>
                    {result.performance.vulnerabilities.totalCVEs}
                  </div>
                </div>
                <div className="kpi">
                  <div className="label">Assets with Vulnerabilities</div>
                  <div className="value">
                    {result.performance.vulnerabilities.assetsWithVulnerabilities}
                  </div>
                </div>
                <div className="kpi">
                  <div className="label">Vulnerability Rate</div>
                  <div className="value" style={{ 
                    color: result.performance.vulnerabilities.vulnerabilityRate > 50 ? '#EF4444' : '#F59E0B'
                  }}>
                    {result.performance.vulnerabilities.vulnerabilityRate}%
                  </div>
                </div>
              </div>
            </div>

            {/* Asset Freshness */}
            <div style={{ marginTop: 20 }}>
              <h5>Asset Freshness (Last Seen)</h5>
              <div className="kpis">
                <div className="kpi">
                  <div className="label">Recently Seen (≤7 days)</div>
                  <div className="value" style={{ color: '#10B981' }}>
                    {result.performance.freshness.recentlySeenAssets}
                  </div>
                </div>
                <div className="kpi">
                  <div className="label">Stale Assets (&gt;30 days)</div>
                  <div className="value" style={{ color: '#EF4444' }}>
                    {result.performance.freshness.staleAssets}
                  </div>
                </div>
                <div className="kpi">
                  <div className="label">Freshness Rate</div>
                  <div className="value" style={{ 
                    color: result.performance.freshness.freshnessRate >= 80 ? '#10B981' : '#F59E0B'
                  }}>
                    {result.performance.freshness.freshnessRate}%
                  </div>
                </div>
              </div>
            </div>

            {/* Network Segmentation */}
            <div style={{ marginTop: 20 }}>
              <h5>Network Segmentation</h5>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Network Segment</th>
                      <th>Asset Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(result.performance.byNetworkSegment)
                      .sort((a, b) => b[1] - a[1])
                      .map(([segment, count]) => (
                        <tr key={segment}>
                          <td>{segment}</td>
                          <td>{count}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* PRODUCTION LINE MAPPING */}
          <div className="card" style={{ marginTop: 20 }}>
            <h4>🏭 Production Line Mapping (Combined View)</h4>
            <p className="subtle" style={{ marginBottom: 15 }}>
              <strong>Key Insight:</strong> Focus on Critical Asset Coverage (90%+ is target), not overall discovery %.
              <br/>
              60-80% overall discovery is GOOD in OT environments (air-gapped systems, passive devices, security zones).
            </p>
            
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Production Unit</th>
                    <th>Total Assets</th>
                    <th>Critical Assets</th>
                    <th>Critical Coverage %</th>
                    <th>Critical Blind Spots</th>
                    <th>Overall Discovery %</th>
                    <th>Total Blind Spots</th>
                    <th>Security Managed</th>
                    <th>High Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {result.productionLineMapping.units
                    .sort((a, b) => b.criticalAssets - a.criticalAssets) // Sort by critical assets first
                    .map((unit, idx) => (
                      <tr key={idx}>
                        <td><strong>{unit.name}</strong></td>
                        <td>{unit.totalAssets}</td>
                        <td>
                          <span style={{ color: '#EF4444' }}>
                            {unit.criticalAssets}
                          </span>
                        </td>
                        <td>
                          <span style={{ 
                            fontWeight: 'bold',
                            color: unit.criticalCoveragePercentage >= 90 ? '#10B981' : 
                                   unit.criticalCoveragePercentage >= 70 ? '#F59E0B' : '#EF4444'
                          }}>
                            {unit.criticalCoveragePercentage}%
                          </span>
                          <span style={{ fontSize: '11px', color: '#6B7280', marginLeft: '4px' }}>
                            ({unit.criticalDiscovered}/{unit.criticalAssets})
                          </span>
                        </td>
                        <td>
                          <span style={{ 
                            fontWeight: 'bold',
                            color: unit.criticalBlindSpots > 0 ? '#EF4444' : '#10B981' 
                          }}>
                            {unit.criticalBlindSpots}
                          </span>
                        </td>
                        <td>
                          <span style={{ 
                            color: unit.discoveryPercentage >= 80 ? '#10B981' : 
                                   unit.discoveryPercentage >= 60 ? '#F59E0B' : '#6B7280'
                          }}>
                            {unit.discoveryPercentage}%
                          </span>
                        </td>
                        <td>
                          <span style={{ color: '#6B7280' }}>
                            {unit.blindSpots}
                          </span>
                        </td>
                        <td>{unit.securityManagedAssets}</td>
                        <td>
                          <span style={{ color: unit.highRiskAssets > 0 ? '#EF4444' : '#10B981' }}>
                            {unit.highRiskAssets}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Coverage Guidance */}
            <div style={{ marginTop: 20, padding: 15, backgroundColor: '#F0F9FF', borderRadius: 8 }}>
              <h5>📘 OT Discovery Coverage Guidance</h5>
              <div style={{ fontSize: '13px', color: '#1E40AF', lineHeight: 1.6 }}>
                <div><strong>Critical Asset Coverage Target:</strong> 90%+ (RED FLAG if below 70%)</div>
                <div><strong>Overall Discovery Target:</strong> 60-80% is GOOD, 80-90% is EXCELLENT</div>
                <div><strong>Why not 100%?</strong> Air-gapped systems, passive devices, offline assets, security zones</div>
                <div><strong>Key Question:</strong> Are critical blind spots identified and documented?</div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
