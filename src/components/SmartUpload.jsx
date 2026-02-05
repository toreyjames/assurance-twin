/**
 * SMART UPLOAD COMPONENT
 * Single drop zone that auto-detects file types
 * 
 * Key feature: Users don't need to know which category their file belongs to
 * The system figures it out from content patterns
 */

import React, { useState, useCallback, useRef } from 'react'
import Papa from 'papaparse'
import { detectSourceType } from '../lib/context/constructor.js'

// =============================================================================
// SOURCE TYPE DEFINITIONS
// =============================================================================

const SOURCE_TYPE_INFO = {
  engineering: {
    label: 'Engineering Baseline',
    icon: '📋',
    color: '#10b981',
    description: 'Asset registers, equipment lists, P&ID data'
  },
  discovery: {
    label: 'OT Discovery',
    icon: '🔍',
    color: '#3b82f6',
    description: 'Network scans, Claroty/Nozomi exports'
  },
  maintenance: {
    label: 'CMMS/Maintenance',
    icon: '🔧',
    color: '#f59e0b',
    description: 'Work orders, maintenance history'
  },
  vulnerability: {
    label: 'Security/Vulnerability',
    icon: '🛡️',
    color: '#ef4444',
    description: 'Vulnerability scans, security assessments'
  },
  historian: {
    label: 'Historian/Process',
    icon: '📊',
    color: '#8b5cf6',
    description: 'PI tags, process data exports'
  },
  network: {
    label: 'Network Topology',
    icon: '🌐',
    color: '#06b6d4',
    description: 'Network diagrams, switch configs'
  },
  unknown: {
    label: 'Other Data',
    icon: '📄',
    color: '#64748b',
    description: 'Unrecognized format'
  }
}

// =============================================================================
// FILE CARD COMPONENT
// =============================================================================

function FileCard({ file, onRemove, isProcessing }) {
  const typeInfo = SOURCE_TYPE_INFO[file.detectedType] || SOURCE_TYPE_INFO.unknown
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.75rem 1rem',
      background: 'white',
      border: `2px solid ${typeInfo.color}20`,
      borderLeft: `4px solid ${typeInfo.color}`,
      borderRadius: '0.5rem',
      fontSize: '0.875rem'
    }}>
      <span style={{ fontSize: '1.25rem' }}>{typeInfo.icon}</span>
      
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ 
          fontWeight: '600', 
          color: '#0f172a',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {file.name}
        </div>
        <div style={{ 
          display: 'flex', 
          gap: '0.75rem', 
          alignItems: 'center',
          marginTop: '0.25rem'
        }}>
          <span style={{ 
            fontSize: '0.75rem',
            padding: '0.125rem 0.5rem',
            background: `${typeInfo.color}15`,
            color: typeInfo.color,
            borderRadius: '0.25rem',
            fontWeight: '500'
          }}>
            {typeInfo.label}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {file.rowCount?.toLocaleString()} rows
          </span>
          {file.confidence && (
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {file.confidence}% match
            </span>
          )}
        </div>
      </div>
      
      {!isProcessing && (
        <button
          onClick={() => onRemove(file.id)}
          style={{
            background: 'none',
            border: 'none',
            color: '#ef4444',
            cursor: 'pointer',
            padding: '0.25rem',
            fontSize: '1.25rem',
            lineHeight: 1
          }}
          title="Remove file"
        >
          ×
        </button>
      )}
    </div>
  )
}

// =============================================================================
// MAIN SMART UPLOAD COMPONENT
// =============================================================================

export default function SmartUpload({ onFilesChange, disabled = false }) {
  const [files, setFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef(null)
  
  // Process a single file - parse and detect type
  const processFile = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        const content = e.target.result
        
        // Parse CSV to detect type
        Papa.parse(content, {
          header: true,
          skipEmptyLines: true,
          preview: 100, // Just need first 100 rows for detection
          complete: (results) => {
            const headers = results.meta.fields || []
            const { type, confidence } = detectSourceType(headers, file.name)
            
            resolve({
              id: `${file.name}-${Date.now()}`,
              name: file.name,
              file,
              content,
              detectedType: type,
              confidence,
              rowCount: results.data.length,
              headers,
              sampleData: results.data.slice(0, 5)
            })
          },
          error: () => {
            resolve({
              id: `${file.name}-${Date.now()}`,
              name: file.name,
              file,
              content,
              detectedType: 'unknown',
              confidence: 0,
              rowCount: 0,
              headers: [],
              sampleData: []
            })
          }
        })
      }
      
      reader.onerror = () => {
        resolve({
          id: `${file.name}-${Date.now()}`,
          name: file.name,
          file,
          content: null,
          detectedType: 'unknown',
          confidence: 0,
          error: 'Failed to read file'
        })
      }
      
      reader.readAsText(file)
    })
  }
  
  // Handle file selection
  const handleFiles = useCallback(async (newFiles) => {
    const csvFiles = Array.from(newFiles).filter(f => 
      f.name.endsWith('.csv') || f.type === 'text/csv'
    )
    
    if (csvFiles.length === 0) return
    
    setIsProcessing(true)
    
    try {
      const processedFiles = await Promise.all(csvFiles.map(processFile))
      
      setFiles(prev => {
        const updated = [...prev, ...processedFiles]
        // Notify parent of change
        if (onFilesChange) {
          onFilesChange(updated)
        }
        return updated
      })
    } finally {
      setIsProcessing(false)
    }
  }, [onFilesChange])
  
  // Remove a file
  const handleRemove = useCallback((fileId) => {
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId)
      if (onFilesChange) {
        onFilesChange(updated)
      }
      return updated
    })
  }, [onFilesChange])
  
  // Drag and drop handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }, [disabled])
  
  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])
  
  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    if (!disabled) {
      handleFiles(e.dataTransfer.files)
    }
  }, [disabled, handleFiles])
  
  // Click to upload
  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [disabled])
  
  const handleFileInput = useCallback((e) => {
    handleFiles(e.target.files)
    // Reset input so same file can be selected again
    e.target.value = ''
  }, [handleFiles])
  
  // Group files by type for summary
  const filesByType = files.reduce((acc, f) => {
    if (!acc[f.detectedType]) acc[f.detectedType] = []
    acc[f.detectedType].push(f)
    return acc
  }, {})
  
  return (
    <div style={{ marginBottom: '2rem' }}>
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        style={{
          padding: '2rem',
          background: isDragging ? '#f0fdf4' : '#f8fafc',
          border: `3px dashed ${isDragging ? '#22c55e' : '#cbd5e1'}`,
          borderRadius: '0.75rem',
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          transition: 'all 0.2s'
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          multiple
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />
        
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
          {isProcessing ? '⏳' : '📁'}
        </div>
        
        <div style={{ fontWeight: '600', color: '#0f172a', marginBottom: '0.25rem' }}>
          {isProcessing ? 'Analyzing files...' : 'Drop your CSV files here'}
        </div>
        
        <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
          or click to browse • We'll auto-detect the file types
        </div>
        
        {/* Source type hints */}
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '0.5rem',
          justifyContent: 'center'
        }}>
          {Object.entries(SOURCE_TYPE_INFO).slice(0, 5).map(([type, info]) => (
            <span
              key={type}
              style={{
                fontSize: '0.7rem',
                padding: '0.25rem 0.5rem',
                background: `${info.color}10`,
                color: info.color,
                borderRadius: '0.25rem'
              }}
            >
              {info.icon} {info.label}
            </span>
          ))}
        </div>
      </div>
      
      {/* Files Summary */}
      {files.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '0.75rem'
          }}>
            <h3 style={{ 
              margin: 0, 
              fontSize: '1rem', 
              fontWeight: '600', 
              color: '#0f172a' 
            }}>
              Uploaded Files ({files.length})
            </h3>
            
            {/* Quick stats */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {Object.entries(filesByType).map(([type, typeFiles]) => {
                const info = SOURCE_TYPE_INFO[type] || SOURCE_TYPE_INFO.unknown
                return (
                  <span
                    key={type}
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.5rem',
                      background: `${info.color}15`,
                      color: info.color,
                      borderRadius: '0.25rem',
                      fontWeight: '500'
                    }}
                  >
                    {info.icon} {typeFiles.length}
                  </span>
                )
              })}
            </div>
          </div>
          
          {/* File list */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.5rem' 
          }}>
            {files.map(file => (
              <FileCard
                key={file.id}
                file={file}
                onRemove={handleRemove}
                isProcessing={isProcessing}
              />
            ))}
          </div>
          
          {/* Total row count */}
          <div style={{ 
            marginTop: '0.75rem', 
            fontSize: '0.875rem', 
            color: '#64748b',
            textAlign: 'right'
          }}>
            Total: {files.reduce((sum, f) => sum + (f.rowCount || 0), 0).toLocaleString()} rows
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// HELPER COMPONENT: Upload Summary
// =============================================================================

export function UploadSummary({ files }) {
  if (!files || files.length === 0) return null
  
  const filesByType = files.reduce((acc, f) => {
    if (!acc[f.detectedType]) acc[f.detectedType] = { count: 0, rows: 0 }
    acc[f.detectedType].count++
    acc[f.detectedType].rows += f.rowCount || 0
    return acc
  }, {})
  
  return (
    <div style={{
      padding: '1rem',
      background: '#f8fafc',
      borderRadius: '0.5rem',
      marginBottom: '1rem'
    }}>
      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '600' }}>
        Data Sources Summary
      </h4>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
        {Object.entries(filesByType).map(([type, data]) => {
          const info = SOURCE_TYPE_INFO[type] || SOURCE_TYPE_INFO.unknown
          return (
            <div key={type} style={{ fontSize: '0.8rem' }}>
              <span style={{ color: info.color }}>{info.icon}</span>
              <span style={{ marginLeft: '0.25rem', fontWeight: '500' }}>
                {data.count} {info.label}
              </span>
              <span style={{ color: '#64748b', marginLeft: '0.25rem' }}>
                ({data.rows.toLocaleString()} rows)
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
