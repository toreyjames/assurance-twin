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

      // Read engineering files
      for (const file of engineeringFiles) {
        const content = await readFileText(file)
        payload.dataSources.engineering.push({
          filename: file.name,
          content: content
        })
      }

      // Read OT tool files (includes discovery + security data)
      for (const file of otToolFiles) {
        const content = await readFileText(file)
        payload.dataSources.otDiscovery.push({
          filename: file.name,
          content: content
        })
      }

      // Read other files
      for (const file of otherFiles) {
        const content = await readFileText(file)
        payload.dataSources.other.push({
          filename: file.name,
          content: content
        })
      }

      console.log('Sending flexible payload:', {
        ...payload,
        dataSources: {
          engineering: payload.dataSources.engineering.length + ' files',
          otTool: payload.dataSources.otDiscovery.length + ' files',
          other: payload.dataSources.other.length + ' files'
        }
      })

      const res = await fetch('/api/analyze-oil-gas-flexible', {
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

  // Filter assets by plant
  const filteredAssets = result?.assets?.filter(asset => 
    selectedPlant === 'all' || asset.plant === selectedPlant
  ) || []

  const plants = result?.assets ? 
    Array.from(new Set(result.assets.map(a => a.plant))).filter(Boolean) : []

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>🛢️ Oil & Gas OT Canonizer</h1>
      <p style={{ color: '#64748b', marginBottom: '1rem' }}>
        Upload multiple files from any data source. The canonizer will automatically merge and match assets.
      </p>
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
          description="Claroty, Nozomi, Armis, Tenable.ot - includes device discovery, vulnerabilities, and security posture (security tools like Tenable/Nessus integrate with your OT platform)"
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

          {/* KPIs - Clear messaging */}
          <div style={{
            padding: '1.5rem',
            background: 'white',
            border: '2px solid #3b82f6',
            borderRadius: '0.75rem',
            marginBottom: '2rem'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem' }}>📊 Asset Inventory Summary</h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem'
            }}>
              <div style={{
                padding: '1rem',
                background: '#f8fafc',
                borderRadius: '0.5rem',
                border: '2px solid #10b981'
              }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Total Asset Inventory</div>
                <div style={{ fontSize: '1.75rem', fontWeight: '700' }}>{result.kpis?.total_assets || 0}</div>
                <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.25rem' }}>✓ Complete visibility</div>
              </div>
              
              {result.learningInsights?.deviceClassification && (
                <>
                  <div style={{
                    padding: '1rem',
                    background: '#fffbeb',
                    borderRadius: '0.5rem',
                    border: '2px solid #f59e0b'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Networkable Assets</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#f59e0b' }}>
                      {result.learningInsights.deviceClassification.networkableAssets}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#92400e', marginTop: '0.25rem' }}>
                      Require security management
                    </div>
                  </div>
                  
                  <div style={{
                    padding: '1rem',
                    background: result.learningInsights.deviceClassification.securityPosture.networkableMatched / result.learningInsights.deviceClassification.networkableAssets >= 0.5 ? '#f0fdf4' : '#fef2f2',
                    borderRadius: '0.5rem',
                    border: `2px solid ${result.learningInsights.deviceClassification.securityPosture.networkableMatched / result.learningInsights.deviceClassification.networkableAssets >= 0.5 ? '#10b981' : '#ef4444'}`
                  }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Networkable Discovered</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: '700', color: result.learningInsights.deviceClassification.securityPosture.networkableMatched / result.learningInsights.deviceClassification.networkableAssets >= 0.5 ? '#10b981' : '#ef4444' }}>
                      {result.learningInsights.deviceClassification.securityPosture.networkableMatched}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                      {Math.round((result.learningInsights.deviceClassification.securityPosture.networkableMatched / result.learningInsights.deviceClassification.networkableAssets) * 100)}% of networkable found
                    </div>
                  </div>
                  
                  <div style={{
                    padding: '1rem',
                    background: '#eff6ff',
                    borderRadius: '0.5rem',
                    border: '2px solid #6366f1'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Passive/Analog Devices</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#6366f1' }}>
                      {result.learningInsights.deviceClassification.passiveAssets}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#4338ca', marginTop: '0.25rem' }}>
                      Inventory only (no network)
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              background: '#f8fafc',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              color: '#475569'
            }}>
              <strong>Why overall coverage looks low:</strong> {result.learningInsights?.deviceClassification?.passiveAssets || 0} assets are passive analog devices (4-20mA transmitters, valves) with no network connectivity. These cannot be discovered by network scans but are tracked in your inventory.
            </div>
          </div>

          {/* 🧠 LEARNING INSIGHTS */}
          {result.learningInsights && (
            <>
              {/* Smart Recommendations */}
              {result.learningInsights.recommendations?.length > 0 && (
                <div style={{
                  padding: '1.5rem',
                  background: '#fffbeb',
                  border: '2px solid #fbbf24',
                  borderRadius: '0.5rem',
                  marginBottom: '2rem'
                }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🧠 AI Insights & Recommendations
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {result.learningInsights.recommendations.map((rec, idx) => {
                      const severityColors = {
                        critical: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
                        high: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
                        medium: { bg: '#dbeafe', border: '#3b82f6', text: '#1e3a8a' }
                      }
                      const colors = severityColors[rec.severity] || severityColors.medium

                      return (
                        <div key={idx} style={{
                          padding: '1rem',
                          background: colors.bg,
                          border: `1px solid ${colors.border}`,
                          borderRadius: '0.375rem'
                        }}>
                          <div style={{ 
                            display: 'flex', 
                            gap: '0.5rem', 
                            alignItems: 'flex-start',
                            marginBottom: '0.5rem'
                          }}>
                            <span style={{
                              fontSize: '0.625rem',
                              fontWeight: '700',
                              textTransform: 'uppercase',
                              color: colors.text,
                              padding: '0.125rem 0.5rem',
                              background: 'white',
                              borderRadius: '0.25rem'
                            }}>
                              {rec.severity}
                            </span>
                            <span style={{
                              fontSize: '0.75rem',
                              color: '#64748b',
                              fontWeight: '500'
                            }}>
                              {rec.type.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div style={{ 
                            fontSize: '0.9375rem', 
                            color: colors.text, 
                            fontWeight: '500',
                            marginBottom: '0.5rem'
                          }}>
                            {rec.message}
                          </div>
                          <div style={{ 
                            fontSize: '0.875rem', 
                            color: '#475569',
                            fontWeight: '400',
                            fontStyle: 'italic'
                          }}>
                            💡 {rec.action}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Data Quality Analysis */}
              <div style={{
                padding: '1.5rem',
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                marginBottom: '2rem'
              }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>📈 Data Quality Analysis</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                  {/* Engineering Data Quality */}
                  <div>
                    <h4 style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.75rem' }}>
                      Engineering Baseline
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <span>With IP Address:</span>
                        <strong>{result.learningInsights.dataQuality?.engineering?.withIP || 0} / {result.learningInsights.dataQuality?.engineering?.totalAssets || 0}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <span>With Hostname:</span>
                        <strong>{result.learningInsights.dataQuality?.engineering?.withHostname || 0} / {result.learningInsights.dataQuality?.engineering?.totalAssets || 0}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <span>With MAC Address:</span>
                        <strong>{result.learningInsights.dataQuality?.engineering?.withMAC || 0} / {result.learningInsights.dataQuality?.engineering?.totalAssets || 0}</strong>
                      </div>
                      <div style={{ 
                        marginTop: '0.5rem', 
                        padding: '0.5rem', 
                        background: '#f1f5f9', 
                        borderRadius: '0.25rem',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Overall Completeness</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#3b82f6' }}>
                          {result.learningInsights.dataQuality?.engineering?.completeness || 0}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Discovery Data Quality */}
                  <div>
                    <h4 style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.75rem' }}>
                      OT Discovery Data
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <span>With IP Address:</span>
                        <strong>{result.learningInsights.dataQuality?.discovery?.withIP || 0} / {result.learningInsights.dataQuality?.discovery?.totalAssets || 0}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <span>With Hostname:</span>
                        <strong>{result.learningInsights.dataQuality?.discovery?.withHostname || 0} / {result.learningInsights.dataQuality?.discovery?.totalAssets || 0}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <span>With MAC Address:</span>
                        <strong>{result.learningInsights.dataQuality?.discovery?.withMAC || 0} / {result.learningInsights.dataQuality?.discovery?.totalAssets || 0}</strong>
                      </div>
                      <div style={{ 
                        marginTop: '0.5rem', 
                        padding: '0.5rem', 
                        background: '#f1f5f9', 
                        borderRadius: '0.25rem',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Overall Completeness</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10b981' }}>
                          {result.learningInsights.dataQuality?.discovery?.completeness || 0}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Device Classification & Security Posture */}
              {result.learningInsights.deviceClassification && (
                <div style={{
                  padding: '1.5rem',
                  background: 'white',
                  border: '2px solid #3b82f6',
                  borderRadius: '0.5rem',
                  marginBottom: '2rem'
                }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🛡️ Complete Asset Inventory & Security Posture
                  </h3>
                  
                  {/* Overview Summary */}
                  <div style={{
                    padding: '1rem',
                    background: '#f8fafc',
                    borderRadius: '0.375rem',
                    marginBottom: '1.5rem',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Total Asset Inventory</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                          {result.learningInsights.deviceClassification.totalAssets}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                          Complete visibility ✅
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Networkable Assets</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f59e0b' }}>
                          {result.learningInsights.deviceClassification.networkableAssets}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                          Require security management
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Security Coverage</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: result.learningInsights.deviceClassification.securityPosture.securityCoveragePercent >= 80 ? '#10b981' : '#ef4444' }}>
                          {result.learningInsights.deviceClassification.securityPosture.securityCoveragePercent}%
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                          {result.learningInsights.deviceClassification.securityPosture.networkableManaged} / {result.learningInsights.deviceClassification.networkableAssets} secured
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Passive/Analog Devices</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#6366f1' }}>
                          {result.learningInsights.deviceClassification.passiveAssets}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                          Inventory only (no security needed)
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3-Tier Breakdown */}
                  <h4 style={{ fontSize: '0.9375rem', fontWeight: '600', marginBottom: '1rem' }}>
                    Device Classification by Security Requirement
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Tier 1: Critical Network Assets */}
                    <div style={{
                      padding: '1rem',
                      background: '#fef2f2',
                      border: '2px solid #ef4444',
                      borderRadius: '0.5rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#991b1b' }}>
                            🔴 Tier 1: {result.learningInsights.deviceClassification.tier1.label}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                            PLCs, DCS, HMIs, SCADA, RTUs - <strong style={{ color: '#991b1b' }}>MUST secure</strong>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#991b1b' }}>
                            {result.learningInsights.deviceClassification.tier1.count}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>assets</div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
                        <div>
                          <span style={{ color: '#64748b' }}>Matched:</span>{' '}
                          <strong>{result.learningInsights.deviceClassification.tier1.matched}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>Secured:</span>{' '}
                          <strong style={{ color: result.learningInsights.deviceClassification.tier1.managed >= result.learningInsights.deviceClassification.tier1.count * 0.9 ? '#10b981' : '#ef4444' }}>
                            {result.learningInsights.deviceClassification.tier1.managed}
                          </strong>
                          {result.learningInsights.deviceClassification.tier1.count > 0 && (
                            <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                              {' '}({Math.round((result.learningInsights.deviceClassification.tier1.managed / result.learningInsights.deviceClassification.tier1.count) * 100)}%)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tier 2: Smart/Networkable */}
                    <div style={{
                      padding: '1rem',
                      background: '#fffbeb',
                      border: '2px solid #f59e0b',
                      borderRadius: '0.5rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#92400e' }}>
                            🟡 Tier 2: {result.learningInsights.deviceClassification.tier2.label}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                            Smart transmitters, IP devices, analyzers - <strong style={{ color: '#92400e' }}>SHOULD secure</strong>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#92400e' }}>
                            {result.learningInsights.deviceClassification.tier2.count}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>assets</div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
                        <div>
                          <span style={{ color: '#64748b' }}>Matched:</span>{' '}
                          <strong>{result.learningInsights.deviceClassification.tier2.matched}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>Secured:</span>{' '}
                          <strong style={{ color: result.learningInsights.deviceClassification.tier2.managed >= result.learningInsights.deviceClassification.tier2.count * 0.7 ? '#10b981' : '#f59e0b' }}>
                            {result.learningInsights.deviceClassification.tier2.managed}
                          </strong>
                          {result.learningInsights.deviceClassification.tier2.count > 0 && (
                            <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                              {' '}({Math.round((result.learningInsights.deviceClassification.tier2.managed / result.learningInsights.deviceClassification.tier2.count) * 100)}%)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tier 3: Passive/Analog */}
                    <div style={{
                      padding: '1rem',
                      background: '#eff6ff',
                      border: '2px solid #6366f1',
                      borderRadius: '0.5rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#4338ca' }}>
                            🔵 Tier 3: {result.learningInsights.deviceClassification.tier3.label}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                            4-20mA, analog valves, pressure/temperature sensors - <strong style={{ color: '#4338ca' }}>Inventory only</strong>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#4338ca' }}>
                            {result.learningInsights.deviceClassification.tier3.count}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>assets</div>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.875rem' }}>
                        <span style={{ color: '#64748b' }}>Inventoried:</span>{' '}
                        <strong>{result.learningInsights.deviceClassification.tier3.matched}</strong>
                        <span style={{ color: '#4338ca', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                          ✅ No security management needed
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Security Posture Details */}
                  <div style={{
                    marginTop: '1.5rem',
                    padding: '1rem',
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
                    borderRadius: '0.5rem'
                  }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem' }}>
                      📊 Networkable Assets Security Posture
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', fontSize: '0.875rem' }}>
                      <div>
                        <div style={{ color: '#64748b' }}>Matched & Visible</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>
                          {result.learningInsights.deviceClassification.securityPosture.networkableMatched} / {result.learningInsights.deviceClassification.securityPosture.networkableTotal}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#64748b' }}>Managed by Security Tool</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#10b981' }}>
                          {result.learningInsights.deviceClassification.securityPosture.managedPercent}%
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#64748b' }}>Patched</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#3b82f6' }}>
                          {result.learningInsights.deviceClassification.securityPosture.patchedPercent}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Match Strategy Performance */}
              <div style={{
                padding: '1.5rem',
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                marginBottom: '2rem'
              }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>🎯 Match Strategy Performance</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {result.learningInsights.columnUsage && Object.entries(result.learningInsights.columnUsage)
                    .sort((a, b) => b[1] - a[1])
                    .map(([strategy, count]) => {
                      const total = result.kpis?.matched_assets || 1
                      const percentage = Math.round((count / total) * 100)
                      
                      return (
                        <div key={strategy} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ 
                            minWidth: '120px', 
                            fontSize: '0.875rem', 
                            fontWeight: '500',
                            textTransform: 'capitalize'
                          }}>
                            {strategy.replace(/_/g, ' ')}
                          </div>
                          <div style={{ 
                            flex: 1, 
                            height: '24px', 
                            background: '#f1f5f9', 
                            borderRadius: '0.25rem',
                            overflow: 'hidden',
                            position: 'relative'
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${percentage}%`,
                              background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                              transition: 'width 0.3s ease'
                            }} />
                            <span style={{
                              position: 'absolute',
                              right: '0.5rem',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              color: percentage > 50 ? 'white' : '#64748b'
                            }}>
                              {count} ({percentage}%)
                            </span>
                          </div>
                        </div>
                      )
                    })}
                </div>

                {result.learningInsights.patterns?.bestMatchStrategy && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}>
                    ✅ <strong>Best Strategy:</strong> {result.learningInsights.patterns.bestMatchStrategy[0].replace(/_/g, ' ')} with {result.learningInsights.patterns.bestMatchStrategy[1]} matches
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

