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
  const [otDiscoveryFiles, setOtDiscoveryFiles] = useState([])
  const [securityFiles, setSecurityFiles] = useState([])
  const [otherFiles, setOtherFiles] = useState([])
  
  const [threshold, setThreshold] = useState(18)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [selectedPlant, setSelectedPlant] = useState('all')

  const analyze = async () => {
    setError(null)
    const totalFiles = engineeringFiles.length + otDiscoveryFiles.length + securityFiles.length + otherFiles.length
    
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
          security: [],
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

      // Read OT discovery files
      for (const file of otDiscoveryFiles) {
        const content = await readFileText(file)
        payload.dataSources.otDiscovery.push({
          filename: file.name,
          content: content
        })
      }

      // Read security files
      for (const file of securityFiles) {
        const content = await readFileText(file)
        payload.dataSources.security.push({
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
          otDiscovery: payload.dataSources.otDiscovery.length + ' files',
          security: payload.dataSources.security.length + ' files',
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
      <h1>🛢️ Oil & Gas OT Canonizer (Flexible Upload)</h1>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>
        Upload multiple files from any data source. The canonizer will automatically merge and match assets.
      </p>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <MultiFileUpload
          label="📋 Engineering Baseline"
          description="Asset registers, P&IDs, engineering databases (any format)"
          files={engineeringFiles}
          setFiles={setEngineeringFiles}
        />

        <MultiFileUpload
          label="🔍 OT Discovery"
          description="Network scans (Claroty, Nozomi, Armis, Tenable.ot, etc.)"
          files={otDiscoveryFiles}
          setFiles={setOtDiscoveryFiles}
        />

        <MultiFileUpload
          label="🔒 Security Management"
          description="Vulnerability scans, patch data, firewall configs"
          files={securityFiles}
          setFiles={setSecurityFiles}
        />

        <MultiFileUpload
          label="📦 Other Data Sources"
          description="CMMS, historian, compliance, or any other asset data"
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
          Total files: {engineeringFiles.length + otDiscoveryFiles.length + securityFiles.length + otherFiles.length}
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

          {/* Rest of the results display (reuse existing components) */}
          <div style={{ color: '#64748b', marginTop: '2rem' }}>
            Total Assets: {result.kpis?.total_assets || 0}
          </div>
          <div style={{ color: '#64748b' }}>
            Discovery Coverage: {result.kpis?.discovery_coverage_percentage || 0}%
          </div>
        </div>
      )}
    </div>
  )
}

