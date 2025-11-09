import React, { useState } from 'react'
import Papa from 'papaparse'
import './styles.css'

const readFileText = (file) => new Promise((resolve, reject) => {
  const r = new FileReader()
  r.onload = () => resolve(r.result)
  r.onerror = reject
  r.readAsText(file)
})

// FLEXIBLE Multi-File Upload Component
function MultiFileUpload({ label, description, files, setFiles, accept = ".csv" }) {
  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files)
    setFiles([...files, ...newFiles])
  }

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  return (
    <div className="file-upload-section">
      <label className="upload-label">
        {label}
        <span className="upload-description">{description}</span>
      </label>
      
      {/* Show current files */}
      {files.length > 0 && (
        <div className="file-list">
          {files.map((file, idx) => (
            <div key={idx} className="file-item">
              <span className="file-name">📄 {file.name}</span>
              <button 
                type="button"
                className="remove-file-btn"
                onClick={() => removeFile(idx)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload more button */}
      <label className="upload-button">
        <input
          type="file"
          accept={accept}
          multiple
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        + Add {files.length > 0 ? 'More ' : ''}Files
      </label>
      
      <div className="file-count">
        {files.length > 0 ? `${files.length} file${files.length > 1 ? 's' : ''} selected` : 'No files selected'}
      </div>
    </div>
  )
}

// Flexible Oil & Gas Canonizer with Multi-Upload Support
export default function FlexibleOilGasCanonizer() {
  // Multi-file state for each data source type
  const [engineeringFiles, setEngineeringFiles] = useState([])
  const [otToolFiles, setOtToolFiles] = useState([])
  const [otherFiles, setOtherFiles] = useState([])
  
  const [threshold, setThreshold] = useState(18)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [selectedPlant, setSelectedPlant] = useState('all')

  const analyze = async () => {
    setError(null)
    const totalFiles = engineeringFiles.length + otToolFiles.length + otherFiles.length
    
    if (totalFiles === 0) {
      setError('Upload at least one file to begin canonization.')
      return
    }

    setLoading(true)
    try {
      // Read all files and group by type
      const payload = { 
        thresholdMonths: Number(threshold),
        dataSources: {
          engineering: [],
          otDiscovery: [],
          other: []
        }
      }

      // Process engineering files
      for (const file of engineeringFiles) {
        const text = await readFileText(file)
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
        payload.dataSources.engineering.push({
          filename: file.name,
          data: parsed.data
        })
      }

      // Process OT tool files (maps to otDiscovery in backend)
      for (const file of otToolFiles) {
        const text = await readFileText(file)
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
        payload.dataSources.otDiscovery.push({
          filename: file.name,
          data: parsed.data
        })
      }

      // Process other files
      for (const file of otherFiles) {
        const text = await readFileText(file)
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
        payload.dataSources.other.push({
          filename: file.name,
          data: parsed.data
        })
      }

      const resp = await fetch('/api/analyze-oil-gas-flexible', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(`${resp.status} - ${JSON.stringify(errData)}`)
      }

      const data = await resp.json()
      setResult(data)
    } catch (e) {
      setError(`Canonization failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>🛢️ Oil & Gas OT Canonizer</h1>
      <p style={{ color: '#64748b', marginBottom: '1rem' }}>
        Upload multiple files from any data source. The canonizer will automatically merge and match assets.
      </p>
      
      <div style={{
        padding: '1rem',
        background: '#dcfce7',
        border: '2px solid #16a34a',
        borderRadius: '0.5rem',
        marginBottom: '1rem',
        fontSize: '0.875rem',
        color: '#166534'
      }}>
        ✅ <strong>Recommended Datasets:</strong> Use <strong>Demo (200 assets)</strong> for quick demos or <strong>Medium (1,500 assets)</strong> for client presentations. 
        Find sample files in: 
        <code style={{ background: '#fff', padding: '0.125rem 0.375rem', borderRadius: '0.25rem', margin: '0 0.25rem' }}>
          public/samples/demo/oil-gas/
        </code>
        <br />
        <span style={{ fontSize: '0.8rem', marginTop: '0.5rem', display: 'inline-block' }}>
          ❌ Enterprise (25,000 assets) is too large for hosted demos - use locally only.
        </span>
      </div>
      
      <div style={{
        padding: '1rem',
        background: '#eff6ff',
        border: '1px solid #3b82f6',
        borderRadius: '0.5rem',
        marginBottom: '2rem',
        fontSize: '0.875rem',
        color: '#1e40af'
      }}>
        💡 <strong>Tip:</strong> Your OT platform (Claroty, Nozomi) already pulls security data from tools like Tenable or Qualys via API.
        Just export from your OT tool - it will include both discovery and security information in one file.
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <MultiFileUpload
          label="📋 Engineering Baseline"
          description="Your asset data: P&IDs, asset registers, CMMS exports, spreadsheets"
          files={engineeringFiles}
          setFiles={setEngineeringFiles}
        />

        <MultiFileUpload
          label="🔍 OT Tool Export"
          description="Claroty, Nozomi, Armis, Tenable.ot - includes device discovery, vulnerabilities, and security posture"
          files={otToolFiles}
          setFiles={setOtToolFiles}
        />

        <MultiFileUpload
          label="📦 Additional Data (Optional)"
          description="Supplemental data: compliance reports, manual inventories, or other asset sources"
          files={otherFiles}
          setFiles={setOtherFiles}
        />
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <button
          onClick={analyze}
          disabled={loading}
          style={{
            padding: '0.75rem 2rem',
            fontSize: '1rem',
            fontWeight: '600',
            background: loading ? '#94a3b8' : '#0f172a',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '⚙️ Canonizing Assets...' : '🚀 Canonize Assets'}
        </button>

        <div style={{ color: '#64748b', fontSize: '0.875rem' }}>
          Total files: {engineeringFiles.length + otToolFiles.length + otherFiles.length}
        </div>
      </div>

      {error && (
        <div style={{
          padding: '1rem',
          background: '#fee2e2',
          border: '1px solid #ef4444',
          borderRadius: '0.5rem',
          color: '#b91c1c',
          marginBottom: '1rem'
        }}>
          ❌ {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '2rem' }}>
          <h2>✅ Canonization Complete</h2>
          
          {/* Data Sources Summary */}
          <div style={{
            padding: '1.5rem',
            background: '#f1f5f9',
            borderRadius: '0.5rem',
            marginBottom: '2rem'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>📊 Data Sources Processed</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {result.metadata?.dataSources && Object.entries(result.metadata.dataSources).map(([type, info]) => (
                <div key={type} style={{
                  padding: '0.75rem',
                  background: 'white',
                  borderRadius: '0.375rem',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{ fontWeight: '600', textTransform: 'capitalize', marginBottom: '0.25rem' }}>
                    {type}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                    {info.files} file{info.files !== 1 ? 's' : ''}, {info.rows} rows
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 1️⃣ COMPLETE ASSET INVENTORY & SECURITY POSTURE (FIRST!) */}
          {result.learningInsights?.deviceClassification && (
            <div style={{
              padding: '2rem',
              background: 'white',
              border: '3px solid #3b82f6',
              borderRadius: '0.75rem',
              marginBottom: '2rem'
            }}>
              <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>
                🛡️ Complete Asset Inventory & Security Posture
              </h3>
              
              {/* Top-Level Summary */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem'
              }}>
                <div style={{
                  padding: '1.25rem',
                  background: '#f0fdf4',
                  borderRadius: '0.5rem',
                  border: '2px solid #10b981'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '600' }}>
                    Total Asset Inventory
                  </div>
                  <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#059669' }}>
                    {result.learningInsights.deviceClassification.totalAssets.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#10b981', marginTop: '0.5rem' }}>
                    ✓ Complete visibility
                  </div>
                </div>

                <div style={{
                  padding: '1.25rem',
                  background: '#fffbeb',
                  borderRadius: '0.5rem',
                  border: '2px solid #f59e0b'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '600' }}>
                    Networkable Assets
                  </div>
                  <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#d97706' }}>
                    {result.learningInsights.deviceClassification.networkableAssets.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#92400e', marginTop: '0.5rem' }}>
                    ⚠️ Require security management
                  </div>
                </div>

                <div style={{
                  padding: '1.25rem',
                  background: result.learningInsights.deviceClassification.securityPosture.securityCoveragePercent >= 70 ? '#f0fdf4' : '#fef2f2',
                  borderRadius: '0.5rem',
                  border: `2px solid ${result.learningInsights.deviceClassification.securityPosture.securityCoveragePercent >= 70 ? '#10b981' : '#ef4444'}`
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '600' }}>
                    Security Coverage
                  </div>
                  <div style={{ fontSize: '2.5rem', fontWeight: '700', color: result.learningInsights.deviceClassification.securityPosture.securityCoveragePercent >= 70 ? '#059669' : '#dc2626' }}>
                    {result.learningInsights.deviceClassification.securityPosture.securityCoveragePercent}%
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem' }}>
                    {result.learningInsights.deviceClassification.securityPosture.networkableManaged.toLocaleString()} / {result.learningInsights.deviceClassification.networkableAssets.toLocaleString()} secured
                  </div>
                </div>

                <div style={{
                  padding: '1.25rem',
                  background: '#eff6ff',
                  borderRadius: '0.5rem',
                  border: '2px solid #6366f1'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '600' }}>
                    Passive/Analog Devices
                  </div>
                  <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#4f46e5' }}>
                    {result.learningInsights.deviceClassification.passiveAssets.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#4338ca', marginTop: '0.5rem' }}>
                    ℹ️ Inventory only
                  </div>
                </div>
              </div>

              {/* 3-Tier Breakdown */}
              <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#475569' }}>
                Device Classification by Security Requirement
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Tier 1 */}
                <div style={{
                  padding: '1.25rem',
                  background: '#fef2f2',
                  border: '3px solid #ef4444',
                  borderRadius: '0.5rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: '700', color: '#991b1b' }}>
                        🔴 Tier 1: {result.learningInsights.deviceClassification.tier1.label}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
                        PLCs, DCS, HMIs, SCADA, RTUs • <strong style={{ color: '#991b1b' }}>MUST secure</strong>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '2rem', fontWeight: '700', color: '#991b1b' }}>
                        {result.learningInsights.deviceClassification.tier1.count.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>assets</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                    <div>
                      <span style={{ color: '#64748b' }}>Discovered:</span>{' '}
                      <strong>{result.learningInsights.deviceClassification.tier1.matched.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Secured:</span>{' '}
                      <strong style={{ color: result.learningInsights.deviceClassification.tier1.managed >= result.learningInsights.deviceClassification.tier1.count * 0.9 ? '#10b981' : '#ef4444' }}>
                        {result.learningInsights.deviceClassification.tier1.managed.toLocaleString()}
                      </strong>
                      {result.learningInsights.deviceClassification.tier1.count > 0 && (
                        <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                          {' '}({Math.round((result.learningInsights.deviceClassification.tier1.managed / result.learningInsights.deviceClassification.tier1.count) * 100)}%)
                        </span>
                      )}
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Unsecured:</span>{' '}
                      <strong style={{ color: '#ef4444' }}>
                        {(result.learningInsights.deviceClassification.tier1.count - result.learningInsights.deviceClassification.tier1.managed).toLocaleString()}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Tier 2 */}
                <div style={{
                  padding: '1.25rem',
                  background: '#fffbeb',
                  border: '3px solid #f59e0b',
                  borderRadius: '0.5rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: '700', color: '#92400e' }}>
                        🟡 Tier 2: {result.learningInsights.deviceClassification.tier2.label}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
                        Smart transmitters, IP devices, analyzers • <strong style={{ color: '#92400e' }}>SHOULD secure</strong>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '2rem', fontWeight: '700', color: '#92400e' }}>
                        {result.learningInsights.deviceClassification.tier2.count.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>assets</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                    <div>
                      <span style={{ color: '#64748b' }}>Discovered:</span>{' '}
                      <strong>{result.learningInsights.deviceClassification.tier2.matched.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Secured:</span>{' '}
                      <strong style={{ color: result.learningInsights.deviceClassification.tier2.managed >= result.learningInsights.deviceClassification.tier2.count * 0.7 ? '#10b981' : '#f59e0b' }}>
                        {result.learningInsights.deviceClassification.tier2.managed.toLocaleString()}
                      </strong>
                      {result.learningInsights.deviceClassification.tier2.count > 0 && (
                        <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                          {' '}({Math.round((result.learningInsights.deviceClassification.tier2.managed / result.learningInsights.deviceClassification.tier2.count) * 100)}%)
                        </span>
                      )}
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Unsecured:</span>{' '}
                      <strong style={{ color: '#f59e0b' }}>
                        {(result.learningInsights.deviceClassification.tier2.count - result.learningInsights.deviceClassification.tier2.managed).toLocaleString()}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Tier 3 */}
                <div style={{
                  padding: '1.25rem',
                  background: '#eff6ff',
                  border: '3px solid #6366f1',
                  borderRadius: '0.5rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: '700', color: '#4338ca' }}>
                        🔵 Tier 3: {result.learningInsights.deviceClassification.tier3.label}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
                        4-20mA transmitters, analog valves, thermocouples • <strong style={{ color: '#4338ca' }}>Inventory only</strong>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '2rem', fontWeight: '700', color: '#4338ca' }}>
                        {result.learningInsights.deviceClassification.tier3.count.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>assets</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#475569', padding: '0.75rem', background: '#dbeafe', borderRadius: '0.375rem' }}>
                    ℹ️ These devices have no network connectivity and cannot be secured by traditional IT security tools. They are tracked for inventory and maintenance purposes only.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2️⃣ PLANT INTELLIGENCE (WHERE IS IT?) */}
          {result.distributions && (
            <div style={{
              padding: '2rem',
              background: 'white',
              border: '2px solid #10b981',
              borderRadius: '0.75rem',
              marginBottom: '2rem'
            }}>
              <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>
                📍 Plant Intelligence: Where Are Your Assets?
              </h3>

              {/* Process Unit Distribution */}
              {result.distributions.processUnitDistribution && (
                <div style={{ marginBottom: '2rem' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#475569' }}>
                    By Process Unit
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.75rem' }}>
                    {Object.entries(result.distributions.processUnitDistribution)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 12)
                      .map(([unit, count]) => (
                        <div key={unit} style={{
                          padding: '0.75rem 1rem',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.375rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span style={{ fontSize: '0.875rem', color: '#475569' }}>{unit}</span>
                          <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{count.toLocaleString()}</strong>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Device Type Distribution */}
              {result.distributions.deviceTypeDistribution && (
                <div style={{ marginBottom: '2rem' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#475569' }}>
                    By Device Type
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                    {Object.entries(result.distributions.deviceTypeDistribution)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 15)
                      .map(([type, count]) => (
                        <div key={type} style={{
                          padding: '0.75rem 1rem',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.375rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span style={{ fontSize: '0.875rem', color: '#475569' }}>{type.replace(/_/g, ' ')}</span>
                          <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{count.toLocaleString()}</strong>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Manufacturer Distribution */}
              {result.distributions.manufacturerDistribution && (
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#475569' }}>
                    By Manufacturer
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                    {Object.entries(result.distributions.manufacturerDistribution)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 10)
                      .map(([mfr, count]) => (
                        <div key={mfr} style={{
                          padding: '0.75rem 1rem',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.375rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span style={{ fontSize: '0.875rem', color: '#475569' }}>{mfr || 'Unknown'}</span>
                          <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{count.toLocaleString()}</strong>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3️⃣ TOP 3 ACTIONS (AT THE BOTTOM!) */}
          {result.learningInsights?.recommendations?.length > 0 && (
            <div style={{
              padding: '2rem',
              background: 'white',
              border: '3px solid #fbbf24',
              borderRadius: '0.75rem',
              marginBottom: '2rem'
            }}>
              <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>
                🎯 Top 3 Recommended Actions
              </h3>
              <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.875rem', color: '#64748b' }}>
                Prioritized based on risk, impact, and feasibility
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {result.learningInsights.recommendations.map((rec, idx) => {
                  const severityColors = {
                    critical: { bg: '#fef2f2', border: '#ef4444', icon: '🔴' },
                    high: { bg: '#fffbeb', border: '#f59e0b', icon: '🟡' },
                    medium: { bg: '#eff6ff', border: '#3b82f6', icon: '🔵' }
                  }
                  const colors = severityColors[rec.severity] || severityColors.medium

                  return (
                    <div key={idx} style={{
                      padding: '1.5rem',
                      background: colors.bg,
                      border: `2px solid ${colors.border}`,
                      borderRadius: '0.5rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                        <span style={{ fontSize: '2rem' }}>{colors.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.5rem' }}>
                            {rec.message}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.75rem' }}>
                            <strong>Impact:</strong> {rec.impact}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '0.75rem' }}>
                            {rec.detail}
                          </div>
                          <div style={{ 
                            fontSize: '0.875rem', 
                            color: '#0f172a',
                            fontWeight: '600',
                            padding: '0.75rem',
                            background: 'white',
                            borderRadius: '0.375rem',
                            border: '1px solid #e2e8f0'
                          }}>
                            → <strong>Action:</strong> {rec.action}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

