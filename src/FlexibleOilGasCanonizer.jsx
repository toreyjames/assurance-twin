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
  const [loadingSample, setLoadingSample] = useState(false)
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

  const loadSampleSet = async (variant = 'medium') => {
    try {
      setError(null)
      setResult(null)
      setSelectedPlant('all')
      setLoadingSample(true)
      
      const basePath = `/samples/demo/oil-gas`
      const engineeringNames = [`engineering_baseline_${variant}.csv`]
      const otNames = [`ot_discovery_${variant}.csv`]
      const otherNames = [
        `cmms_work_orders_${variant}.csv`,
        `security_findings_${variant}.csv`,
        `firewall_segments_${variant}.csv`,
        `incidents_${variant}.csv`
      ]
      
      const fetchCsvFile = async (name) => {
        const resp = await fetch(`${basePath}/${name}`)
        if (!resp.ok) throw new Error(`Failed to load ${name}`)
        const text = await resp.text()
        return new File([text], name, { type: 'text/csv' })
      }
      
      const engineeringLoaded = await Promise.all(engineeringNames.map(fetchCsvFile))
      const otLoaded = await Promise.all(otNames.map(fetchCsvFile))
      
      const otherLoaded = []
      for (const name of otherNames) {
        try {
          const file = await fetchCsvFile(name)
          otherLoaded.push(file)
        } catch (err) {
          console.warn(`[Samples] Skipping optional file ${name}:`, err.message)
        }
      }
      
      setEngineeringFiles(engineeringLoaded)
      setOtToolFiles(otLoaded)
      setOtherFiles(otherLoaded)
    } catch (err) {
      console.error(err)
      setError(`Failed to load sample dataset: ${err.message}`)
    } finally {
      setLoadingSample(false)
    }
  }

  const insights = result?.assuranceInsights || {}
  const maintenanceInsights = insights.maintenance
  const vulnerabilityInsights = insights.vulnerability
  const segmentationInsights = insights.segmentation
  const incidentInsights = insights.incidents

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
        marginBottom: '1.5rem', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => loadSampleSet('medium')}
          disabled={loading || loadingSample}
          style={{
            padding: '0.65rem 1.5rem',
            fontSize: '0.95rem',
            fontWeight: '600',
            background: loadingSample ? '#94a3b8' : '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: (loading || loadingSample) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          {loadingSample ? '⏳ Loading enhanced demo…' : '⚡ Load Enhanced Demo Dataset'}
        </button>
        <span style={{ color: '#475569', fontSize: '0.85rem' }}>
          Preloads engineering, OT discovery, CMMS, vulnerability, and firewall data for a full-stack demo.
        </span>
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
          disabled={loading || loadingSample}
          style={{
            padding: '0.75rem 2rem',
            fontSize: '1rem',
            fontWeight: '600',
            background: (loading || loadingSample) ? '#94a3b8' : '#0f172a',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: (loading || loadingSample) ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '⚙️ Canonizing Assets...' : loadingSample ? '⏳ Loading Demo Files…' : '🚀 Canonize Assets'}
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
              {result.metadata?.dataSources && Object.entries(result.metadata.dataSources).map(([type, info]) => {
                const friendlyLabel = info.label || type.replace(/([A-Z])/g, ' $1').replace(/^\w/, (c) => c.toUpperCase())
                return (
                  <div key={type} style={{
                    padding: '0.75rem',
                    background: 'white',
                    borderRadius: '0.375rem',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                      {friendlyLabel}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                      {info.files} file{info.files !== 1 ? 's' : ''}, {info.rows} rows
                    </div>
                  </div>
                )
              })}
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
                  <div style={{ fontSize: '0.875rem', color: '#064e3b', marginTop: '0.5rem' }}>
                    From engineering baseline
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

          {/* 🔍 CLASSIFICATION CONFIDENCE - "How do we know?" */}
          {result.verificationSummary && (
            <div style={{
              padding: '2rem',
              background: 'white',
              border: '3px solid #6366f1',
              borderRadius: '0.75rem',
              marginBottom: '2rem'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>
                🔍 Classification Confidence: How Do We Know?
              </h3>
              <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.875rem', color: '#64748b' }}>
                Cross-verification of networkable vs passive classification. Verifies that devices classified as "networkable" are actually found on the network, and vice versa.
              </p>

              {/* Overall Confidence Badge */}
              <div style={{ 
                padding: '1rem', 
                background: result.verificationSummary.confidenceLevel === 'HIGH' ? '#f0fdf4' :
                           result.verificationSummary.confidenceLevel === 'MEDIUM' ? '#fffbeb' : '#fef2f2',
                border: `2px solid ${result.verificationSummary.confidenceLevel === 'HIGH' ? '#10b981' :
                                      result.verificationSummary.confidenceLevel === 'MEDIUM' ? '#f59e0b' : '#ef4444'}`,
                borderRadius: '0.5rem',
                marginBottom: '1.5rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                  Overall Classification Confidence
                </div>
                <div style={{ 
                  fontSize: '2rem', 
                  fontWeight: '700',
                  color: result.verificationSummary.confidenceLevel === 'HIGH' ? '#10b981' :
                         result.verificationSummary.confidenceLevel === 'MEDIUM' ? '#f59e0b' : '#ef4444'
                }}>
                  {result.verificationSummary.confidenceLevel}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
                  {result.verificationSummary.verificationRate}% of networkable assets verified by OT discovery
                </div>
              </div>

              {/* Verification Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {/* Verified */}
                <div style={{
                  padding: '1rem',
                  background: '#f0fdf4',
                  border: '2px solid #10b981',
                  borderRadius: '0.5rem'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#064e3b', marginBottom: '0.25rem', fontWeight: '600' }}>
                    ✅ VERIFIED
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981' }}>
                    {result.verificationSummary.verified.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#065f46', marginTop: '0.5rem', lineHeight: '1.4' }}>
                    Engineering says networkable + OT found it
                  </div>
                </div>

                {/* Unverified */}
                <div style={{
                  padding: '1rem',
                  background: '#fffbeb',
                  border: '2px solid #f59e0b',
                  borderRadius: '0.5rem'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#78350f', marginBottom: '0.25rem', fontWeight: '600' }}>
                    ⚠️ UNVERIFIED
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b' }}>
                    {result.verificationSummary.unverified.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#92400e', marginTop: '0.5rem', lineHeight: '1.4' }}>
                    Engineering says networkable but OT didn't find it
                  </div>
                </div>

                {/* Suspicious */}
                {result.verificationSummary.suspiciousCount > 0 && (
                  <div style={{
                    padding: '1rem',
                    background: '#fef2f2',
                    border: '2px solid #ef4444',
                    borderRadius: '0.5rem'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: '#7f1d1d', marginBottom: '0.25rem', fontWeight: '600' }}>
                      🚨 SUSPICIOUS
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#ef4444' }}>
                      {result.verificationSummary.suspiciousCount.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#991b1b', marginTop: '0.5rem', lineHeight: '1.4' }}>
                      Misclassified or missing from baseline
                    </div>
                  </div>
                )}

                {/* Verified Passive */}
                <div style={{
                  padding: '1rem',
                  background: '#f8fafc',
                  border: '2px solid #64748b',
                  borderRadius: '0.5rem'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#334155', marginBottom: '0.25rem', fontWeight: '600' }}>
                    📦 VERIFIED PASSIVE
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#64748b' }}>
                    {result.verificationSummary.verifiedPassive.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '0.5rem', lineHeight: '1.4' }}>
                    Passive/analog - OT didn't find (as expected)
                  </div>
                </div>
              </div>

              {/* What This Means */}
              <div style={{ 
                padding: '1rem', 
                background: '#eff6ff', 
                border: '1px solid #3b82f6',
                borderRadius: '0.5rem'
              }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '700', color: '#1e40af' }}>
                  📊 What This Means
                </h4>
                <div style={{ fontSize: '0.75rem', color: '#1e40af', lineHeight: '1.6' }}>
                  <strong>Verified ({result.verificationSummary.verified}):</strong> These devices are confirmed networkable - engineering baseline and OT discovery agree.<br />
                  <strong>Unverified ({result.verificationSummary.unverified}):</strong> Engineering says these have IP addresses, but OT discovery didn't find them. Could be offline, wrong IP, or stale baseline data.<br />
                  {result.verificationSummary.suspiciousCount > 0 && (
                    <><strong>Suspicious ({result.verificationSummary.suspiciousCount}):</strong> Misclassified devices - OT found them but engineering says they're passive, OR orphans that look like critical assets.<br /></>
                  )}
                  <strong>Verified Passive ({result.verificationSummary.verifiedPassive}):</strong> These are analog/non-network devices - no IP address and OT didn't find them (as expected).
                </div>
              </div>

              {/* Export Verification Data */}
              {(result.classificationVerification?.suspiciousPassive?.length > 0 || result.classificationVerification?.unverified?.length > 0) && (
                <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {result.classificationVerification.unverified.length > 0 && (
                    <button
                      onClick={() => {
                        console.log('Unverified networkable assets:', result.classificationVerification.unverified)
                        alert(`${result.classificationVerification.unverified.length} unverified assets logged to console. These should be investigated - are they offline? Wrong IPs?`)
                      }}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      ⚠️ Export Unverified Assets ({result.classificationVerification.unverified.length})
                    </button>
                  )}
                  
                  {result.classificationVerification.suspiciousPassive.length > 0 && (
                    <button
                      onClick={() => {
                        console.log('Suspicious passive classifications:', result.classificationVerification.suspiciousPassive)
                        alert(`${result.classificationVerification.suspiciousPassive.length} suspicious classifications logged to console. These are likely misclassified - update engineering baseline.`)
                      }}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      🚨 Export Suspicious Classifications ({result.classificationVerification.suspiciousPassive.length})
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 🛠 Maintenance & Reliability Insights */}
          {result.assuranceInsights?.maintenance?.total > 0 && (
            <div style={{
              padding: '2rem',
              background: 'white',
              border: '3px solid #16a34a',
              borderRadius: '0.75rem',
              marginBottom: '2rem'
            }}>
              <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>
                🛠 Maintenance & Reliability Insights
              </h3>
              <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.875rem', color: '#64748b' }}>
                Using CMMS data to spotlight maintenance backlog on critical assets.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '1rem', background: '#f0fdf4', border: '2px solid #10b981', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#047857', fontWeight: '600' }}>Total Work Orders</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#047857' }}>{result.assuranceInsights.maintenance.total.toLocaleString()}</div>
                </div>
                <div style={{ padding: '1rem', background: '#eff6ff', border: '2px solid #1d4ed8', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#1e3a8a', fontWeight: '600' }}>Open Work Orders</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1e3a8a' }}>{result.assuranceInsights.maintenance.open.toLocaleString()}</div>
                </div>
                <div style={{ padding: '1rem', background: '#fef2f2', border: '2px solid #ef4444', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: '600' }}>Overdue / Critical</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#b91c1c' }}>
                    {result.assuranceInsights.maintenance.overdue.toLocaleString()} / {result.assuranceInsights.maintenance.criticalOverdue.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#991b1b' }}>Overdue / critical overdue</div>
                </div>
                <div style={{ padding: '1rem', background: '#f8fafc', border: '2px solid #475569', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#334155', fontWeight: '600' }}>Linked to Canon</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#334155' }}>{result.assuranceInsights.maintenance.linkedToAssets.toLocaleString()}</div>
                </div>
              </div>

              {result.assuranceInsights.maintenance.topUnits?.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: '600', color: '#0f172a' }}>Units Feeling the Pain</h4>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#475569', fontSize: '0.9rem', lineHeight: '1.6' }}>
                    {result.assuranceInsights.maintenance.topUnits.map((unit) => (
                      <li key={unit.unit}>
                        <strong>{unit.unit}</strong>: {unit.open} open, {unit.overdue} overdue ({unit.critical} critical)
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.assuranceInsights.maintenance.sampleWorkOrders?.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: '600', color: '#0f172a' }}>Top Work Orders to Review</h4>
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {result.assuranceInsights.maintenance.sampleWorkOrders.map((wo, idx) => (
                      <div key={idx} style={{ padding: '0.75rem', background: '#f9fafb', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontWeight: '600', color: '#0f172a' }}>WO {wo.work_order_id} • {wo.tag_id}</div>
                        <div style={{ fontSize: '0.8rem', color: '#475569' }}>{wo.description}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>Due {wo.due_date} • {wo.priority} • {wo.status}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 🧪 Patch & Vulnerability Readiness */}
          {result.assuranceInsights?.vulnerability?.totalFindings > 0 && (
            <div style={{
              padding: '2rem',
              background: 'white',
              border: '3px solid #ef4444',
              borderRadius: '0.75rem',
              marginBottom: '2rem'
            }}>
              <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>
                🧪 Patch & Vulnerability Readiness
              </h3>
              <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.875rem', color: '#64748b' }}>
                Highlights critical findings requiring action across OT assets.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '1rem', background: '#fef2f2', border: '2px solid #ef4444', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: '600' }}>Total Findings</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#991b1b' }}>{result.assuranceInsights.vulnerability.totalFindings.toLocaleString()}</div>
                </div>
                <div style={{ padding: '1rem', background: '#fff7ed', border: '2px solid #f97316', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#9a3412', fontWeight: '600' }}>Open Findings</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#c2410c' }}>{result.assuranceInsights.vulnerability.openFindings.toLocaleString()}</div>
                </div>
                <div style={{ padding: '1rem', background: '#fff1f2', border: '2px solid #be123c', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#9f1239', fontWeight: '600' }}>Critical Unpatched</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#be123c' }}>{result.assuranceInsights.vulnerability.criticalUnpatched.toLocaleString()}</div>
                  <div style={{ fontSize: '0.7rem', color: '#9f1239' }}>Includes CVSS ≥ 7.5</div>
                </div>
                <div style={{ padding: '1rem', background: '#eff6ff', border: '2px solid #2563eb', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#1d4ed8', fontWeight: '600' }}>Assets with Critical Findings</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1d4ed8' }}>{result.assuranceInsights.vulnerability.assetsWithCritical.toLocaleString()}</div>
                </div>
              </div>

              {result.assuranceInsights.vulnerability.topCriticalAssets?.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: '600', color: '#0f172a' }}>Assets with the Most Critical Exposure</h4>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#475569', fontSize: '0.9rem', lineHeight: '1.6' }}>
                    {result.assuranceInsights.vulnerability.topCriticalAssets.map((asset) => (
                      <li key={asset.tag_id}>
                        <strong>{asset.tag_id}</strong> • {asset.unit} • {asset.manufacturer} — {asset.count} critical findings
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.assuranceInsights.vulnerability.topVendors?.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: '600', color: '#0f172a' }}>Vendors Driving the Risk</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {result.assuranceInsights.vulnerability.topVendors.map((vendor) => (
                      <div key={vendor.vendor} style={{ padding: '0.65rem 0.9rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#475569' }}>
                        {vendor.vendor}: {vendor.count} findings
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 🔐 Network Segmentation & Access Control */}
          {result.assuranceInsights?.network?.total > 0 && (
            <div style={{
              padding: '2rem',
              background: 'white',
              border: '3px solid #0ea5e9',
              borderRadius: '0.75rem',
              marginBottom: '2rem'
            }}>
              <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>
                🔐 Network Segmentation & Access Control
              </h3>
              <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.875rem', color: '#64748b' }}>
                Highlights assets that fall outside expected zones or firewall policies.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '1rem', background: '#ecfeff', border: '2px solid #06b6d4', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#0f766e', fontWeight: '600' }}>Devices Evaluated</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#0f766e' }}>{result.assuranceInsights.network.total.toLocaleString()}</div>
                </div>
                <div style={{ padding: '1rem', background: '#f0fdf4', border: '2px solid #16a34a', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: '600' }}>Compliant</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#15803d' }}>{result.assuranceInsights.network.compliant.toLocaleString()}</div>
                </div>
                <div style={{ padding: '1rem', background: '#fef2f2', border: '2px solid #ef4444', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: '600' }}>Out of Policy</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#b91c1c' }}>{result.assuranceInsights.network.outOfPolicy.toLocaleString()}</div>
                </div>
                <div style={{ padding: '1rem', background: '#fff7ed', border: '2px solid #f97316', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#9a3412', fontWeight: '600' }}>Missing Expected Zone</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#c2410c' }}>{result.assuranceInsights.network.missingExpectedZone.toLocaleString()}</div>
                </div>
              </div>

              {result.assuranceInsights.network.topOutOfPolicy?.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: '600', color: '#0f172a' }}>Assets to Re-Segment</h4>
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {result.assuranceInsights.network.topOutOfPolicy.map((asset, idx) => (
                      <div key={`${asset.tag_id}-${idx}`} style={{ padding: '0.75rem', background: '#f9fafb', borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#475569' }}>
                        <strong>{asset.tag_id}</strong> • {asset.unit}<br />Current: {asset.current_zone} • Expected: {asset.expected_zone}<br />Status: {asset.status}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 🚨 Incident & Ticket Snapshot */}
          {result.assuranceInsights?.incidents?.total > 0 && (
            <div style={{
              padding: '2rem',
              background: 'white',
              border: '3px solid #f97316',
              borderRadius: '0.75rem',
              marginBottom: '2rem'
            }}>
              <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>
                🚨 Incident & Ticket Snapshot
              </h3>
              <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.875rem', color: '#64748b' }}>
                ServiceNow / ticket data aligned to the asset canon for rapid response.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '1rem', background: '#fff7ed', border: '2px solid #f97316', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#c2410c', fontWeight: '600' }}>Total Incidents</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#c2410c' }}>{result.assuranceInsights.incidents.total.toLocaleString()}</div>
                </div>
                <div style={{ padding: '1rem', background: '#f0fdf4', border: '2px solid #16a34a', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: '600' }}>Open Tickets</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#15803d' }}>{result.assuranceInsights.incidents.open.toLocaleString()}</div>
                </div>
                <div style={{ padding: '1rem', background: '#fef2f2', border: '2px solid #ef4444', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#b91c1c', fontWeight: '600' }}>Critical Open</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#b91c1c' }}>{result.assuranceInsights.incidents.criticalOpen.toLocaleString()}</div>
                </div>
                <div style={{ padding: '1rem', background: '#eff6ff', border: '2px solid #2563eb', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#1d4ed8', fontWeight: '600' }}>Linked to Canon</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1d4ed8' }}>{result.assuranceInsights.incidents.linkedToAssets.toLocaleString()}</div>
                </div>
              </div>

              {result.assuranceInsights.incidents.recentIncidents?.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: '600', color: '#0f172a' }}>Recent Tickets</h4>
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {result.assuranceInsights.incidents.recentIncidents.map((incident) => (
                      <div key={incident.incident_id} style={{ padding: '0.75rem', background: '#f9fafb', borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#475569' }}>
                        <strong>{incident.incident_id}</strong> • {incident.tag_id}<br />Severity: {incident.severity} • Status: {incident.status}<br />Opened: {incident.opened_at} • Owner: {incident.owner}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {maintenanceInsights && maintenanceInsights.totalWorkOrders > 0 && (
            <div style={{
              padding: '2rem',
              background: 'white',
              border: '3px solid #10b981',
              borderRadius: '0.75rem',
              marginBottom: '2rem'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>
                🛠️ Maintenance & Reliability Snapshot
              </h3>
              <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.875rem', color: '#64748b' }}>
                Aligns CMMS work orders with the canon. Highlights overdue maintenance on networkable assets.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ padding: '1rem', background: '#f0fdf4', border: '1px solid #10b981', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#047857', textTransform: 'uppercase', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Total Work Orders
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#047857' }}>
                    {maintenanceInsights.totalWorkOrders.toLocaleString()}
                  </div>
                </div>
                <div style={{ padding: '1rem', background: '#fefce8', border: '1px solid #f59e0b', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#92400e', textTransform: 'uppercase', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Open Work Orders
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#d97706' }}>
                    {maintenanceInsights.openWorkOrders.toLocaleString()}
                  </div>
                </div>
                <div style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #ef4444', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#b91c1c', textTransform: 'uppercase', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Overdue Work Orders
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#b91c1c' }}>
                    {maintenanceInsights.overdueWorkOrders.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#b91c1c' }}>
                    Avg {maintenanceInsights.averageDaysOverdue} days overdue
                  </div>
                </div>
                <div style={{ padding: '1rem', background: '#eef2ff', border: '1px solid #6366f1', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#4338ca', textTransform: 'uppercase', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Linked to Assets
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#4338ca' }}>
                    {maintenanceInsights.linkedRecords.toLocaleString()}
                  </div>
                  {maintenanceInsights.unlinkedRecords > 0 && (
                    <div style={{ fontSize: '0.75rem', color: '#b91c1c' }}>
                      ⚠️ {maintenanceInsights.unlinkedRecords.toLocaleString()} records need asset mapping
                    </div>
                  )}
                </div>
              </div>
              {maintenanceInsights.sampleOverdue?.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: '#475569', marginBottom: '0.75rem' }}>
                    Top Overdue Work Orders
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#475569', fontSize: '0.85rem', lineHeight: '1.6' }}>
                    {maintenanceInsights.sampleOverdue.map(item => (
                      <li key={`${item.work_order_id}-${item.tag_id}`}>
                        <strong>{item.work_order_id || 'WO'}</strong> on <strong>{item.tag_id || 'Unknown Asset'}</strong> ({item.unit || 'Unknown Unit'}) — {item.daysOverdue} days overdue, status: {item.status || 'open'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {vulnerabilityInsights && vulnerabilityInsights.totalFindings > 0 && (
            <div style={{
              padding: '2rem',
              background: 'white',
              border: '3px solid #ef4444',
              borderRadius: '0.75rem',
              marginBottom: '2rem'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>
                🛡️ Patch & Vulnerability Posture
              </h3>
              <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.875rem', color: '#64748b' }}>
                Highlights CVEs tied to canonized assets and surfaces unpatched critical findings.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #ef4444', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#b91c1c', textTransform: 'uppercase', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Total Findings
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#b91c1c' }}>
                    {vulnerabilityInsights.totalFindings.toLocaleString()}
                  </div>
                </div>
                <div style={{ padding: '1rem', background: '#fee2e2', border: '1px solid #f87171', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#b91c1c', textTransform: 'uppercase', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Critical Findings
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#b91c1c' }}>
                    {vulnerabilityInsights.criticalFindings.toLocaleString()}
                  </div>
                </div>
                <div style={{ padding: '1rem', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#92400e', textTransform: 'uppercase', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Unpatched Critical
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#d97706' }}>
                    {vulnerabilityInsights.unpatchedCritical.toLocaleString()}
                  </div>
                </div>
                <div style={{ padding: '1rem', background: '#eef2ff', border: '1px solid #6366f1', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#4338ca', textTransform: 'uppercase', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Assets with Critical CVEs
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#4338ca' }}>
                    {vulnerabilityInsights.assetsWithCritical.toLocaleString()}
                  </div>
                </div>
              </div>
              {vulnerabilityInsights.sampleCritical?.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: '#475569', marginBottom: '0.75rem' }}>
                    Critical Findings Requiring Action
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#475569', fontSize: '0.85rem', lineHeight: '1.6' }}>
                    {vulnerabilityInsights.sampleCritical.map(item => (
                      <li key={`${item.cve_id}-${item.tag_id}`}>
                        <strong>{item.cve_id}</strong> on <strong>{item.tag_id || 'Unknown Asset'}</strong> — severity {item.severity || 'critical'}, patch available: {item.patch_available}. Last seen {item.last_seen || 'unknown'}.
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {segmentationInsights && segmentationInsights.totalRecords > 0 && (
            <div style={{
              padding: '2rem',
              background: 'white',
              border: '3px solid #0ea5e9',
              borderRadius: '0.75rem',
              marginBottom: '2rem'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>
                🛰️ Network Segmentation & Access Control
              </h3>
              <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.875rem', color: '#64748b' }}>
                Compares expected vs. actual zones and firewall enforcement to surface segmentation gaps.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ padding: '1rem', background: '#e0f2fe', border: '1px solid #0ea5e9', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#0369a1', textTransform: 'uppercase', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Records Reviewed
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#0369a1' }}>
                    {segmentationInsights.totalRecords.toLocaleString()}
                  </div>
                </div>
                <div style={{ padding: '1rem', background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#b91c1c', textTransform: 'uppercase', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Unenforced Policies
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#b91c1c' }}>
                    {segmentationInsights.unenforcedPolicies.toLocaleString()}
                  </div>
                </div>
                <div style={{ padding: '1rem', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#92400e', textTransform: 'uppercase', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Missing Zone Mapping
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#d97706' }}>
                    {segmentationInsights.missingZone.toLocaleString()}
                  </div>
                </div>
                <div style={{ padding: '1rem', background: '#ede9fe', border: '1px solid #8b5cf6', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#4c1d95', textTransform: 'uppercase', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Stale Audits (&gt;180 days)
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#4c1d95' }}>
                    {segmentationInsights.staleAudits.toLocaleString()}
                  </div>
                </div>
              </div>
              {segmentationInsights.sampleIssues?.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: '#475569', marginBottom: '0.75rem' }}>
                    Segmentation Issues Detected
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#475569', fontSize: '0.85rem', lineHeight: '1.6' }}>
                    {segmentationInsights.sampleIssues.map((item, idx) => (
                      <li key={`${item.tag_id || 'asset'}-${idx}`}>
                        <strong>{item.tag_id || 'Unknown Asset'}</strong> expected zone <strong>{item.expected_zone}</strong>, found <strong>{item.actual_zone}</strong>; policy status {item.policy_status}; last audit {item.last_audit}.
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {incidentInsights && incidentInsights.totalIncidents > 0 && (
            <div style={{
              padding: '2rem',
              background: 'white',
              border: '3px solid #f97316',
              borderRadius: '0.75rem',
              marginBottom: '2rem'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>
                🚨 Incident & Ticket Watch
              </h3>
              <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.875rem', color: '#64748b' }}>
                Connects ServiceNow / ticket feeds to the canon. Shows open incidents tied to critical assets.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ padding: '1rem', background: '#fff7ed', border: '1px solid #f97316', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#c2410c', textTransform: 'uppercase', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Total Incidents
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#c2410c' }}>
                    {incidentInsights.totalIncidents.toLocaleString()}
                  </div>
                </div>
                <div style={{ padding: '1rem', background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#b91c1c', textTransform: 'uppercase', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Open Incidents
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#b91c1c' }}>
                    {incidentInsights.openIncidents.toLocaleString()}
                  </div>
                </div>
                <div style={{ padding: '1rem', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#92400e', textTransform: 'uppercase', fontWeight: '600', marginBottom: '0.25rem' }}>
                    High Priority
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#d97706' }}>
                    {incidentInsights.highPriorityIncidents.toLocaleString()}
                  </div>
                </div>
              </div>
              {incidentInsights.sampleOpen?.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: '#475569', marginBottom: '0.75rem' }}>
                    Open Incidents
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#475569', fontSize: '0.85rem', lineHeight: '1.6' }}>
                    {incidentInsights.sampleOpen.map((item, idx) => (
                      <li key={`${item.incident_id || 'incident'}-${idx}`}>
                        <strong>{item.incident_id}</strong> on <strong>{item.tag_id || 'Unknown Asset'}</strong> — state {item.state || 'open'}, priority {item.priority || 'normal'}, owner {item.owner || 'unassigned'}.
                      </li>
                    ))}
                  </ul>
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

          {/* 📥 DOWNLOAD YOUR CANONIZED DATA - Export Section (AT THE BOTTOM) */}
          <div style={{
            padding: '2rem',
            background: 'white',
            border: '3px solid #3b82f6',
            borderRadius: '0.75rem',
            marginBottom: '2rem'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>
              📥 Download Your Canonized Asset Inventory
            </h3>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.875rem', color: '#64748b' }}>
              Your matched asset data is ready for export. Each CSV contains the canonized view with engineering baseline data merged with OT discovery data, aligned to the Canonizer framework.
            </p>

            {/* Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '1rem', background: '#f0fdf4', border: '2px solid #10b981', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#064e3b', marginBottom: '0.25rem', fontWeight: '600', textTransform: 'uppercase' }}>
                  ✅ Matched Assets
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981' }}>
                  {result.kpis.matched_assets.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#064e3b', marginTop: '0.5rem' }}>
                  Engineering baseline + OT discovery data merged
                </div>
              </div>

              <div style={{ padding: '1rem', background: '#fffbeb', border: '2px solid #f59e0b', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#78350f', marginBottom: '0.25rem', fontWeight: '600', textTransform: 'uppercase' }}>
                  ⚠️ Blind Spots
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b' }}>
                  {result.kpis.blind_spots.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#78350f', marginTop: '0.5rem' }}>
                  Engineered but not discovered (offline/passive devices)
                </div>
              </div>

              <div style={{ padding: '1rem', background: '#ede9fe', border: '2px solid #8b5cf6', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#4c1d95', marginBottom: '0.25rem', fontWeight: '600', textTransform: 'uppercase' }}>
                  👁️ Orphan Devices
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#8b5cf6' }}>
                  {result.kpis.orphan_assets.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#4c1d95', marginTop: '0.5rem' }}>
                  Discovered but not in baseline (investigate!)
                </div>
              </div>
            </div>

            {/* Export Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Matched Assets Export */}
              <div style={{ padding: '1.25rem', background: '#f0fdf4', border: '1px solid #10b981', borderRadius: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ flex: '1', minWidth: '250px' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '700', color: '#065f46' }}>
                      ✅ Matched Assets CSV
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#064e3b', lineHeight: '1.6' }}>
                      <strong>Full canonized inventory</strong> - Engineering data (tag_id, unit, device_type, manufacturer) merged with OT discovery data (IP address, security status, vulnerabilities, match type)
                    </p>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#059669', fontStyle: 'italic' }}>
                      💡 Use for: Security team prioritization, vulnerability management, asset tracking
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      // Convert matched assets to CSV
                      const headers = [
                        'tag_id', 'plant', 'unit', 'device_type', 'manufacturer', 'model',
                        'ip_address', 'hostname', 'mac_address',
                        'tier', 'security_classification', 'security_required',
                        'is_managed', 'has_security_patches', 'encryption_enabled', 'authentication_required',
                        'vulnerabilities', 'cve_count',
                        'match_type', 'match_confidence'
                      ]
                      
                      const rows = result.assets.map(asset => [
                        asset.tag_id || '',
                        asset.plant || '',
                        asset.unit || '',
                        asset.device_type || '',
                        asset.manufacturer || '',
                        asset.model || '',
                        asset.ip_address || '',
                        asset.hostname || '',
                        asset.mac_address || '',
                        asset.securityClass?.tier || '',
                        asset.securityClass?.classification || '',
                        asset.securityClass?.securityRequired || '',
                        asset.is_managed || '',
                        asset.has_security_patches || '',
                        asset.encryption_enabled || '',
                        asset.authentication_required || '',
                        asset.vulnerabilities || '',
                        asset.cve_count || '',
                        asset.sources?.matchType || '',
                        asset.sources?.matchConfidence || ''
                      ])
                      
                      const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n')
                      const blob = new Blob([csv], { type: 'text/csv' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `canonized_matched_assets_${new Date().toISOString().split('T')[0]}.csv`
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    📥 Download Matched Assets ({result.kpis.matched_assets.toLocaleString()})
                  </button>
                </div>
              </div>

              {/* Blind Spots Export */}
              {result.blindSpots && result.blindSpots.length > 0 && (
                <div style={{ padding: '1.25rem', background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ flex: '1', minWidth: '250px' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '700', color: '#92400e' }}>
                        ⚠️ Blind Spots CSV
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#78350f', lineHeight: '1.6' }}>
                        <strong>Assets not discovered</strong> - Engineering baseline assets that have no corresponding OT discovery record (likely offline, passive/analog devices, or missing network data)
                      </p>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#d97706', fontStyle: 'italic' }}>
                        💡 Use for: Data quality review, identifying missing network data, passive device inventory
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const headers = ['tag_id', 'plant', 'unit', 'device_type', 'manufacturer', 'model', 'ip_address', 'hostname']
                        const rows = result.blindSpots.slice(0, 10000).map(asset => [
                          asset.tag_id || '',
                          asset.plant || '',
                          asset.unit || '',
                          asset.device_type || '',
                          asset.manufacturer || '',
                          asset.model || '',
                          asset.ip_address || '',
                          asset.hostname || ''
                        ])
                        
                        const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n')
                        const blob = new Blob([csv], { type: 'text/csv' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `canonizer_blind_spots_${new Date().toISOString().split('T')[0]}.csv`
                        a.click()
                        URL.revokeObjectURL(url)
                      }}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      📥 Download Blind Spots ({result.kpis.blind_spots.toLocaleString()})
                    </button>
                  </div>
                </div>
              )}

              {/* Orphans Export */}
              {result.orphans && result.orphans.length > 0 && (
                <div style={{ padding: '1.25rem', background: '#f5f3ff', border: '1px solid #8b5cf6', borderRadius: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ flex: '1', minWidth: '250px' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '700', color: '#5b21b6' }}>
                        👁️ Orphan Devices CSV
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#4c1d95', lineHeight: '1.6' }}>
                        <strong>Discovered but not in baseline</strong> - OT discovery found these devices on your network, but they have no engineering baseline record (could be: contractor laptops, rogue devices, shadow IT, or missing documentation)
                      </p>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#7c3aed', fontStyle: 'italic' }}>
                        💡 Use for: Security investigation, rogue device detection, baseline documentation updates
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const headers = ['ip_address', 'hostname', 'mac_address', 'device_type', 'manufacturer', 'model', 'is_managed', 'vulnerabilities', 'cve_count', 'last_seen']
                        const rows = result.orphans.map(asset => [
                          asset.ip_address || '',
                          asset.hostname || '',
                          asset.mac_address || '',
                          asset.device_type || '',
                          asset.manufacturer || '',
                          asset.model || '',
                          asset.is_managed || '',
                          asset.vulnerabilities || '',
                          asset.cve_count || '',
                          asset.last_seen || ''
                        ])
                        
                        const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n')
                        const blob = new Blob([csv], { type: 'text/csv' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `canonizer_orphan_devices_${new Date().toISOString().split('T')[0]}.csv`
                        a.click()
                        URL.revokeObjectURL(url)
                      }}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: '#8b5cf6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      📥 Download Orphans ({result.kpis.orphan_assets.toLocaleString()})
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

