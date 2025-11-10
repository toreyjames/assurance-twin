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
  const MAX_FILE_SIZE = 1024 * 1024 // 1 MB per file (allows 12,000 asset refinery on Vercel Pro)
  
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }
  
  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files)
    
    // Check for oversized files
    const oversizedFiles = newFiles.filter(f => f.size > MAX_FILE_SIZE)
    const validFiles = newFiles.filter(f => f.size <= MAX_FILE_SIZE)
    
    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map(f => `${f.name} (${formatFileSize(f.size)})`).join('\n')
      alert(`⚠️ The following files are too large for hosted demos:\n\n${fileNames}\n\nMaximum file size: ${formatFileSize(MAX_FILE_SIZE)}\n\nPlease use the Demo or Medium datasets instead.\n\nEnterprise datasets (25K assets) only work locally - run "npm run dev" on your machine.`)
    }
    
    if (validFiles.length > 0) {
      setFiles([...files, ...validFiles])
    }
  }

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index))
  }
  
  const getTotalSize = () => {
    return files.reduce((sum, f) => sum + f.size, 0)
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
              <span className="file-name">
                📄 {file.name} 
                <span style={{ color: '#64748b', fontSize: '0.85rem', marginLeft: '0.5rem' }}>
                  ({formatFileSize(file.size)})
                </span>
              </span>
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
        payload.dataSources.engineering.push({
          filename: file.name,
          content: text  // Send raw CSV text, backend will parse it
        })
      }

      // Process OT tool files (maps to otDiscovery in backend)
      for (const file of otToolFiles) {
        const text = await readFileText(file)
        payload.dataSources.otDiscovery.push({
          filename: file.name,
          content: text  // Send raw CSV text, backend will parse it
        })
      }

      // Process other files
      for (const file of otherFiles) {
        const text = await readFileText(file)
        payload.dataSources.other.push({
          filename: file.name,
          content: text  // Send raw CSV text, backend will parse it
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
        ✅ <strong>Demo-Ready:</strong> Use <strong>Medium (12,000 assets)</strong> - realistic 200,000+ bpd large refinery. 
        Find sample files in: 
        <code style={{ background: '#fff', padding: '0.125rem 0.375rem', borderRadius: '0.25rem', margin: '0 0.25rem' }}>
          public/samples/demo/oil-gas/
        </code>
        <br />
        <span style={{ fontSize: '0.8rem', marginTop: '0.5rem', display: 'inline-block' }}>
          💡 Demo (500): quick test | Medium (12K): large refinery - BEST FOR DEMOS | Enterprise (25K): local only
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
                        Smart transmitters, IP devices, analyzers • <strong style={{ color: '#92400e' }}>MUST secure</strong> (network-facing)
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

          {/* 2️⃣ PLANT INTELLIGENCE: WHERE ARE YOUR ASSETS? (Bridges IT/OT Gap) */}
          {result.distributions && (
            <div style={{
              padding: '2rem',
              background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%)',
              border: '3px solid #10b981',
              borderRadius: '0.75rem',
              marginBottom: '2rem'
            }}>
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: '700', color: '#0f172a' }}>
                  🏭 Plant Intelligence: Where Are Your Assets?
                </h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
                  Understanding WHERE devices are located helps bridge the IT/OT knowledge gap. 
                  IT teams need to know which process units have security coverage and which have blind spots.
                </p>
              </div>

              {/* Process Unit Distribution WITH SECURITY METRICS BY LOCATION */}
              {result.distributions.processUnitSecurity && (
                <div style={{ marginBottom: '2rem' }}>
                  <h4 style={{ 
                    fontSize: '1.125rem', 
                    fontWeight: '700', 
                    marginBottom: '1rem', 
                    color: '#0f172a',
                    padding: '0.75rem',
                    background: 'white',
                    borderRadius: '0.5rem',
                    border: '2px solid #10b981'
                  }}>
                    📍 Security Coverage by Process Unit / Area
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
                    {Object.entries(result.distributions.processUnitSecurity)
                      .sort(([, a], [, b]) => b.totalAssets - a.totalAssets)
                      .slice(0, 12)
                      .map(([unit, stats]) => {
                        const securityPercent = stats.networkableAssets > 0 
                          ? Math.round((stats.securedAssets / stats.networkableAssets) * 100) 
                          : 0
                        const discoveryPercent = stats.networkableAssets > 0 
                          ? Math.round((stats.discoveredAssets / stats.networkableAssets) * 100) 
                          : 0
                        
                        const securityColor = securityPercent >= 70 ? '#10b981' : 
                                              securityPercent >= 40 ? '#f59e0b' : '#ef4444'
                        
                        return (
                          <div key={unit} style={{
                            padding: '1rem',
                            background: 'white',
                            border: `2px solid ${securityColor}`,
                            borderRadius: '0.5rem',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.75rem' }}>
                              {unit}
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                              <div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10b981' }}>
                                  {stats.totalAssets.toLocaleString()}
                                </div>
                                <div style={{ fontSize: '0.65rem', color: '#64748b' }}>total assets</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#3b82f6' }}>
                                  {stats.networkableAssets.toLocaleString()}
                                </div>
                                <div style={{ fontSize: '0.65rem', color: '#64748b' }}>networkable</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: securityColor }}>
                                  {stats.securedAssets.toLocaleString()}
                                </div>
                                <div style={{ fontSize: '0.65rem', color: '#64748b' }}>secured</div>
                              </div>
                            </div>
                            
                            <div style={{ 
                              padding: '0.5rem', 
                              background: securityPercent >= 70 ? '#f0fdf4' : 
                                          securityPercent >= 40 ? '#fffbeb' : '#fef2f2',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}>
                              🔒 Security: <span style={{ color: securityColor }}>{securityPercent}%</span>
                              {' • '}
                              🔍 Discovery: {discoveryPercent}%
                            </div>
                          </div>
                        )
                      })}
                  </div>
                  <div style={{ 
                    marginTop: '1rem', 
                    padding: '0.75rem', 
                    background: '#fffbeb', 
                    border: '1px solid #f59e0b',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    color: '#92400e'
                  }}>
                    💡 <strong>For IT Teams:</strong> These are the physical areas of the refinery. Each area has critical control systems that need security coverage. 
                    For example, "Crude Distillation Unit" has PLCs controlling temperature/pressure, "Tank Farm" has level monitors, etc.
                  </div>
                </div>
              )}

              {/* Device Type Distribution */}
              {result.distributions.deviceTypeDistribution && (
                <div style={{ marginBottom: '2rem' }}>
                  <h4 style={{ 
                    fontSize: '1.125rem', 
                    fontWeight: '700', 
                    marginBottom: '1rem', 
                    color: '#0f172a',
                    padding: '0.75rem',
                    background: 'white',
                    borderRadius: '0.5rem',
                    border: '2px solid #3b82f6'
                  }}>
                    🔧 What Types of Devices Do We Have?
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                    {Object.entries(result.distributions.deviceTypeDistribution)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 15)
                      .map(([type, count]) => (
                        <div key={type} style={{
                          padding: '0.75rem 1rem',
                          background: 'white',
                          border: '1px solid #cbd5e1',
                          borderRadius: '0.375rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span style={{ fontSize: '0.875rem', color: '#475569', fontWeight: '500' }}>
                            {type.replace(/_/g, ' ')}
                          </span>
                          <strong style={{ fontSize: '1.125rem', color: '#3b82f6' }}>{count.toLocaleString()}</strong>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Manufacturer Distribution */}
              {result.distributions.manufacturerDistribution && (
                <div>
                  <h4 style={{ 
                    fontSize: '1.125rem', 
                    fontWeight: '700', 
                    marginBottom: '1rem', 
                    color: '#0f172a',
                    padding: '0.75rem',
                    background: 'white',
                    borderRadius: '0.5rem',
                    border: '2px solid #8b5cf6'
                  }}>
                    🏢 Who Makes Our Equipment?
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                    {Object.entries(result.distributions.manufacturerDistribution)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 10)
                      .map(([mfr, count]) => {
                        const securityStats = result.distributions.manufacturerSecurity[mfr] || { totalAssets: 0, networkableAssets: 0, securedAssets: 0 }
                        const securityPercent = securityStats.networkableAssets > 0 
                          ? Math.round((securityStats.securedAssets / securityStats.networkableAssets) * 100)
                          : 0
                        const isUnknown = !mfr || mfr.toLowerCase().includes('unknown')
                        
                        return (
                          <div key={mfr} style={{
                            padding: '0.875rem',
                            background: isUnknown ? '#fef3c7' : 'white',
                            border: isUnknown ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                            borderRadius: '0.375rem'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <span style={{ fontSize: '0.875rem', color: '#475569', fontWeight: '600' }}>
                                {mfr || 'Unknown'} {isUnknown && '⚠️'}
                              </span>
                              <strong style={{ fontSize: '1rem', color: '#8b5cf6' }}>{count.toLocaleString()}</strong>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                              <span>Networkable:</span>
                              <strong>{securityStats.networkableAssets.toLocaleString()}</strong>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                              <span>Secured:</span>
                              <strong style={{ 
                                color: securityPercent >= 80 ? '#10b981' : securityPercent >= 50 ? '#f59e0b' : '#ef4444' 
                              }}>
                                {securityStats.securedAssets.toLocaleString()} ({securityPercent}%)
                              </strong>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                  <div style={{ 
                    marginTop: '1rem', 
                    padding: '0.75rem', 
                    background: '#eff6ff', 
                    border: '1px solid #3b82f6',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    color: '#1e40af'
                  }}>
                    💡 <strong>Why This Matters:</strong> Different OT vendors require different security tools and patches. 
                    Siemens PLCs need different vulnerability scanners than Allen-Bradley or Schneider devices.
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

          {/* 🎯 HOW THE CANONIZER WORKS - Match Strategy Breakdown */}
          {result.matchResults && (
            <div style={{
              padding: '2rem',
              background: 'white',
              border: '3px solid #8b5cf6',
              borderRadius: '0.75rem',
              marginBottom: '2rem'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>
                🎯 How the Canonizer Matched Your Assets
              </h3>
              <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.875rem', color: '#64748b' }}>
                Even without perfect data, the Canonizer intelligently matched {result.kpis.matched_assets.toLocaleString()} assets using multiple strategies. This shows what data sources you have and where improvements can be made.
              </p>

              {/* Match Strategy Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {/* Tag ID matches - gold standard */}
                <div style={{
                  padding: '1rem',
                  background: '#fef3c7',
                  border: '2px solid #f59e0b',
                  borderRadius: '0.5rem'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#92400e', marginBottom: '0.25rem', fontWeight: '600' }}>
                    🥇 TAG ID MATCH
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#d97706' }}>
                    {(result.matchResults.strategyBreakdown?.tag_id || 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#78350f' }}>
                    Gold standard - exact match
                  </div>
                </div>

                {/* IP Address matches */}
                <div style={{
                  padding: '1rem',
                  background: '#e0e7ff',
                  border: '2px solid #6366f1',
                  borderRadius: '0.5rem'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#312e81', marginBottom: '0.25rem', fontWeight: '600' }}>
                    🌐 IP ADDRESS MATCH
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#4f46e5' }}>
                    {(result.matchResults.strategyBreakdown?.ip_address || 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#3730a3' }}>
                    No tag_id, used IP
                  </div>
                </div>

                {/* Hostname matches */}
                <div style={{
                  padding: '1rem',
                  background: '#dbeafe',
                  border: '2px solid #3b82f6',
                  borderRadius: '0.5rem'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#1e3a8a', marginBottom: '0.25rem', fontWeight: '600' }}>
                    💻 HOSTNAME MATCH
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#2563eb' }}>
                    {(result.matchResults.strategyBreakdown?.hostname || 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#1e40af' }}>
                    Matched by device name
                  </div>
                </div>

                {/* MAC Address matches */}
                <div style={{
                  padding: '1rem',
                  background: '#d1fae5',
                  border: '2px solid #10b981',
                  borderRadius: '0.5rem'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#064e3b', marginBottom: '0.25rem', fontWeight: '600' }}>
                    🔌 MAC ADDRESS MATCH
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#059669' }}>
                    {(result.matchResults.strategyBreakdown?.mac_address || 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#065f46' }}>
                    Network hardware address
                  </div>
                </div>

                {/* Fuzzy matches */}
                <div style={{
                  padding: '1rem',
                  background: '#fce7f3',
                  border: '2px solid #ec4899',
                  borderRadius: '0.5rem'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#831843', marginBottom: '0.25rem', fontWeight: '600' }}>
                    🧠 FUZZY LOGIC MATCH
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#db2777' }}>
                    {(result.matchResults.strategyBreakdown?.fuzzy || 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#9f1239' }}>
                    Device type + manufacturer
                  </div>
                </div>

                {/* Intelligent pairing */}
                <div style={{
                  padding: '1rem',
                  background: '#ede9fe',
                  border: '2px solid #8b5cf6',
                  borderRadius: '0.5rem'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#4c1d95', marginBottom: '0.25rem', fontWeight: '600' }}>
                    🤖 INTELLIGENT PAIRING
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#7c3aed' }}>
                    {(result.matchResults.strategyBreakdown?.intelligent_pairing || 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#5b21b6' }}>
                    AI-inferred match
                  </div>
                </div>
              </div>

              {/* Data Quality Insights */}
              <div style={{ 
                padding: '1rem', 
                background: '#f0fdf4', 
                border: '1px solid #10b981',
                borderRadius: '0.5rem',
                marginBottom: '1rem'
              }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '700', color: '#065f46' }}>
                  📊 What This Tells Us About Your Data
                </h4>
                <div style={{ fontSize: '0.75rem', color: '#065f46', lineHeight: '1.6' }}>
                  {result.matchResults.strategyBreakdown.tag_id > result.kpis.matched_assets * 0.5 ? (
                    <>✅ <strong>Excellent:</strong> You have Tag IDs in both engineering & OT discovery - gold standard for asset management!</>
                  ) : result.matchResults.strategyBreakdown.tag_id > 0 ? (
                    <>⚠️ <strong>Good:</strong> Some Tag IDs present, but many matches fell back to IP/hostname. Consider adding Tag IDs to OT discovery data.</>
                  ) : (
                    <>🚨 <strong>Needs Improvement:</strong> No Tag ID matches - OT discovery lacks asset tags. Canonizer used IP/hostname fallback strategies.</>
                  )}
                  <br />
                  {result.matchResults.strategyBreakdown.ip_address + result.matchResults.strategyBreakdown.hostname > result.kpis.matched_assets * 0.3 && (
                    <>💡 <strong>Recommendation:</strong> Add asset tag fields to your OT discovery tool configuration for more accurate matching.</>
                  )}
                </div>
              </div>

              {/* Coverage Summary */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: '#fef3c7', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '0.875rem', color: '#92400e', textAlign: 'center' }}>
                  <strong>✅ Matched:</strong> {result.kpis.matched_assets.toLocaleString()} assets
                </div>
                <div style={{ fontSize: '0.875rem', color: '#92400e', textAlign: 'center' }}>
                  <strong>⚠️ Blind Spots:</strong> {result.kpis.blind_spots.toLocaleString()} (engineered but not discovered)
                </div>
                <div style={{ fontSize: '0.875rem', color: '#92400e', textAlign: 'center' }}>
                  <strong>👁️ Orphans:</strong> {result.kpis.orphan_assets.toLocaleString()} (discovered but not in baseline)
                </div>
              </div>
            </div>
          )}

          {/* 🏭 PLANT COMPLETENESS & OPERATIONAL CONTEXT - The merged operational + cyber view */}
          {result.plantCompleteness && Object.keys(result.plantCompleteness).length > 0 && (
            <div style={{
              padding: '2rem',
              background: 'white',
              border: '3px solid #10b981',
              borderRadius: '0.75rem',
              marginBottom: '2rem'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>
                🏭 Plant Completeness & Operational Context
              </h3>
              <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.875rem', color: '#64748b' }}>
                Operational Intelligence + Cyber Security = Context-Aware Defense. For each process unit, we analyze: Is it complete for production? What's the attack surface? Where are the gaps?
              </p>

              {/* Process Unit Cards */}
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {Object.entries(result.plantCompleteness)
                  .filter(([_, unit]) => unit.canAssess) // Only show units we can assess
                  .sort((a, b) => {
                    // Sort by operational risk (HIGH first)
                    const riskOrder = { HIGH: 0, MEDIUM: 1, LOW: 2, UNKNOWN: 3 }
                    return riskOrder[a[1].operationalRisk] - riskOrder[b[1].operationalRisk]
                  })
                  .map(([unitName, unit]) => {
                    const completenessColor = unit.completenessScore >= 85 ? '#10b981' :
                                             unit.completenessScore >= 70 ? '#f59e0b' : '#ef4444'
                    const opRiskColor = unit.operationalRisk === 'HIGH' ? '#ef4444' :
                                        unit.operationalRisk === 'MEDIUM' ? '#f59e0b' : '#10b981'
                    const cyberRiskColor = unit.cyberRisk === 'HIGH' ? '#ef4444' :
                                          unit.cyberRisk === 'MEDIUM' ? '#f59e0b' : '#10b981'
                    
                    const criticalGaps = unit.analysis.gaps.filter(g => g.criticality === 'CRITICAL')
                    
                    return (
                      <div key={unitName} style={{
                        padding: '1.5rem',
                        background: unit.operationalRisk === 'HIGH' || unit.cyberRisk === 'HIGH' ? '#fef2f2' : '#f8fafc',
                        border: `2px solid ${unit.operationalRisk === 'HIGH' || unit.cyberRisk === 'HIGH' ? '#ef4444' : '#cbd5e1'}`,
                        borderRadius: '0.5rem'
                      }}>
                        {/* Header */}
                        <div style={{ marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                          <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>
                            {unit.displayName}
                          </h4>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
                            {unit.description}
                          </div>
                        </div>

                        {/* Metrics Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                          {/* Operational Completeness */}
                          <div style={{ padding: '0.75rem', background: 'white', borderRadius: '0.375rem', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '600' }}>
                              🏭 Operational Completeness
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: completenessColor }}>
                              {unit.completenessScore}%
                            </div>
                            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                              {unit.totalAssets} assets vs {unit.totalExpected} expected
                            </div>
                          </div>

                          {/* Operational Risk */}
                          <div style={{ padding: '0.75rem', background: 'white', borderRadius: '0.375rem', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '600' }}>
                              ⚠️ Operational Risk
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: opRiskColor }}>
                              {unit.operationalRisk}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                              {criticalGaps.length > 0 ? `${criticalGaps.length} critical gap(s)` : 'No critical gaps'}
                            </div>
                          </div>

                          {/* Cyber Security Posture */}
                          <div style={{ padding: '0.75rem', background: 'white', borderRadius: '0.375rem', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '600' }}>
                              🔒 Security Posture
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: cyberRiskColor }}>
                              {unit.securityMetrics.securityPercent}%
                            </div>
                            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                              {unit.securityMetrics.securedAssets} / {unit.securityMetrics.networkableAssets} networkable secured
                            </div>
                          </div>

                          {/* Cyber Risk */}
                          <div style={{ padding: '0.75rem', background: 'white', borderRadius: '0.375rem', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '600' }}>
                              🎯 Cyber Risk Level
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: cyberRiskColor }}>
                              {unit.cyberRisk}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                              {unit.cyberRisk === 'HIGH' ? 'Wide open to attack' : unit.cyberRisk === 'MEDIUM' ? 'Needs improvement' : 'Well protected'}
                            </div>
                          </div>
                        </div>

                        {/* Merged Recommendation */}
                        {(unit.operationalRisk !== 'LOW' || unit.cyberRisk !== 'LOW') && (
                          <div style={{ padding: '1rem', background: '#fff7ed', border: '1px solid #f59e0b', borderRadius: '0.375rem' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#92400e', marginBottom: '0.5rem' }}>
                              🎯 MERGED RECOMMENDATION (Plant Manager + CISO):
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#78350f', lineHeight: '1.6' }}>
                              {criticalGaps.length > 0 && (
                                <>
                                  <strong>Operations:</strong> Missing {criticalGaps.length} critical equipment type(s) ({criticalGaps.map(g => g.deviceType).join(', ')}). 
                                  {criticalGaps.some(g => g.severity === 'CRITICAL') ? ' ⚠️ Cannot operate safely without these assets.' : ' Verify data completeness.'}
                                  <br />
                                </>
                              )}
                              {unit.cyberRisk === 'HIGH' && (
                                <>
                                  <strong>Cyber:</strong> Only {unit.securityMetrics.securityPercent}% of networkable devices are secured. 
                                  {unit.completenessScore >= 85 
                                    ? ` This unit is operational but vulnerable - ransomware could shut down production.`
                                    : ` Data gaps + poor security = high risk of undetected compromise.`
                                  }
                                  <br />
                                </>
                              )}
                              {unit.analysis.unknowns.length > 0 && (
                                <>
                                  <strong>Unknown Devices:</strong> {unit.analysis.unknowns.length} devices couldn't be classified. 
                                  {unit.analysis.unknowns.filter(u => u.confidence !== 'LOW').length > 0 
                                    ? ` AI suggests: ${unit.analysis.unknowns.filter(u => u.confidence !== 'LOW').slice(0, 2).map(u => u.inferredType).join(', ')}.`
                                    : ' Conduct physical audit to identify these assets.'}
                                </>
                              )}
                            </div>
                          </div>
                        )}
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

