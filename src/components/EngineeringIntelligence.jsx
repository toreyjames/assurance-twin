/**
 * ENGINEERING INTELLIGENCE PANEL
 * Displays LLM-powered engineering analysis in a professional, audit-ready format
 * 
 * Features:
 * - Markdown rendering for structured analysis
 * - Loading states with progress indicators
 * - Export to PDF/clipboard functionality
 * - Collapsible sections
 * - Audit timestamp and model attribution
 */

import React, { useState, useRef } from 'react'

/**
 * Simple markdown parser for common patterns
 */
function parseMarkdown(text) {
  if (!text) return []
  
  const lines = text.split('\n')
  const elements = []
  let currentList = null
  let currentTable = null
  
  lines.forEach((line, idx) => {
    // Headers
    if (line.startsWith('### ')) {
      if (currentList) { elements.push(currentList); currentList = null }
      if (currentTable) { elements.push(currentTable); currentTable = null }
      elements.push({ type: 'h3', content: line.slice(4), key: idx })
    } else if (line.startsWith('## ')) {
      if (currentList) { elements.push(currentList); currentList = null }
      if (currentTable) { elements.push(currentTable); currentTable = null }
      elements.push({ type: 'h2', content: line.slice(3), key: idx })
    } else if (line.startsWith('# ')) {
      if (currentList) { elements.push(currentList); currentList = null }
      if (currentTable) { elements.push(currentTable); currentTable = null }
      elements.push({ type: 'h1', content: line.slice(2), key: idx })
    }
    // Table rows
    else if (line.startsWith('|') && line.endsWith('|')) {
      if (currentList) { elements.push(currentList); currentList = null }
      if (!currentTable) {
        currentTable = { type: 'table', rows: [], key: idx }
      }
      const cells = line.split('|').slice(1, -1).map(c => c.trim())
      if (!cells.every(c => c.match(/^[-:]+$/))) { // Skip separator rows
        currentTable.rows.push(cells)
      }
    }
    // List items
    else if (line.match(/^[\s]*[-*]\s/)) {
      if (currentTable) { elements.push(currentTable); currentTable = null }
      if (!currentList) {
        currentList = { type: 'list', items: [], key: idx }
      }
      currentList.items.push(line.replace(/^[\s]*[-*]\s/, ''))
    }
    // Numbered list
    else if (line.match(/^[\s]*\d+\.\s/)) {
      if (currentTable) { elements.push(currentTable); currentTable = null }
      if (!currentList) {
        currentList = { type: 'olist', items: [], key: idx }
      }
      currentList.items.push(line.replace(/^[\s]*\d+\.\s/, ''))
    }
    // Blockquote
    else if (line.startsWith('>')) {
      if (currentList) { elements.push(currentList); currentList = null }
      if (currentTable) { elements.push(currentTable); currentTable = null }
      elements.push({ type: 'blockquote', content: line.slice(1).trim(), key: idx })
    }
    // Horizontal rule
    else if (line.match(/^[-*_]{3,}$/)) {
      if (currentList) { elements.push(currentList); currentList = null }
      if (currentTable) { elements.push(currentTable); currentTable = null }
      elements.push({ type: 'hr', key: idx })
    }
    // Paragraph
    else if (line.trim()) {
      if (currentList) { elements.push(currentList); currentList = null }
      if (currentTable) { elements.push(currentTable); currentTable = null }
      elements.push({ type: 'p', content: line, key: idx })
    }
  })
  
  if (currentList) elements.push(currentList)
  if (currentTable) elements.push(currentTable)
  
  return elements
}

/**
 * Format inline markdown (bold, italic, code, links)
 */
function formatInline(text) {
  if (!text) return text
  
  // Bold
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  // Italic
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>')
  // Checkmarks and icons
  text = text.replace(/✅/g, '<span style="color:#22c55e">✅</span>')
  text = text.replace(/⚠️/g, '<span style="color:#f59e0b">⚠️</span>')
  text = text.replace(/🚨/g, '<span style="color:#ef4444">🚨</span>')
  
  return <span dangerouslySetInnerHTML={{ __html: text }} />
}

/**
 * Render parsed markdown elements
 */
function MarkdownRenderer({ content }) {
  const elements = parseMarkdown(content)
  
  return (
    <div className="markdown-content">
      {elements.map((el) => {
        switch (el.type) {
          case 'h1':
            return <h1 key={el.key} style={styles.h1}>{formatInline(el.content)}</h1>
          case 'h2':
            return <h2 key={el.key} style={styles.h2}>{formatInline(el.content)}</h2>
          case 'h3':
            return <h3 key={el.key} style={styles.h3}>{formatInline(el.content)}</h3>
          case 'p':
            return <p key={el.key} style={styles.p}>{formatInline(el.content)}</p>
          case 'list':
            return (
              <ul key={el.key} style={styles.list}>
                {el.items.map((item, i) => (
                  <li key={i} style={styles.listItem}>{formatInline(item)}</li>
                ))}
              </ul>
            )
          case 'olist':
            return (
              <ol key={el.key} style={styles.olist}>
                {el.items.map((item, i) => (
                  <li key={i} style={styles.listItem}>{formatInline(item)}</li>
                ))}
              </ol>
            )
          case 'table':
            return (
              <div key={el.key} style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      {el.rows[0]?.map((cell, i) => (
                        <th key={i} style={styles.th}>{formatInline(cell)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {el.rows.slice(1).map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci} style={styles.td}>{formatInline(cell)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          case 'blockquote':
            return <blockquote key={el.key} style={styles.blockquote}>{formatInline(el.content)}</blockquote>
          case 'hr':
            return <hr key={el.key} style={styles.hr} />
          default:
            return null
        }
      })}
    </div>
  )
}

/**
 * Loading spinner with progress message
 */
function LoadingState({ message }) {
  return (
    <div style={styles.loadingContainer}>
      <div style={styles.spinner} />
      <p style={styles.loadingText}>{message || 'Analyzing engineering data...'}</p>
      <p style={styles.loadingSubtext}>
        Comparing against industry norms and process engineering standards
      </p>
    </div>
  )
}

/**
 * Error state display
 */
function ErrorState({ error, onRetry }) {
  return (
    <div style={styles.errorContainer}>
      <div style={styles.errorIcon}>⚠️</div>
      <h3 style={styles.errorTitle}>Analysis Unavailable</h3>
      <p style={styles.errorMessage}>{error}</p>
      {onRetry && (
        <button onClick={onRetry} style={styles.retryButton}>
          Try Again
        </button>
      )}
    </div>
  )
}

/**
 * Main Engineering Intelligence Panel
 */
export default function EngineeringIntelligence({ 
  analysis,
  loading,
  error,
  onAnalyze,
  onRetry,
  timestamp,
  model,
  isFallback
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [copied, setCopied] = useState(false)
  const contentRef = useRef(null)
  
  // Copy to clipboard
  const handleCopy = async () => {
    if (!analysis) return
    try {
      await navigator.clipboard.writeText(analysis)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }
  
  // Export as text file
  const handleExport = () => {
    if (!analysis) return
    const blob = new Blob([
      `OT ASSURANCE TWIN - ENGINEERING ANALYSIS\n`,
      `Generated: ${timestamp || new Date().toISOString()}\n`,
      `Model: ${model || 'Unknown'}\n`,
      `${'='.repeat(60)}\n\n`,
      analysis
    ], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `engineering-analysis-${new Date().toISOString().split('T')[0]}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }
  
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button 
            onClick={() => setCollapsed(!collapsed)}
            style={styles.collapseButton}
          >
            {collapsed ? '▶' : '▼'}
          </button>
          <h3 style={styles.title}>
            🧠 Engineering Intelligence
          </h3>
          {isFallback && (
            <span style={styles.fallbackBadge}>Template Analysis</span>
          )}
          {!isFallback && model && (
            <span style={styles.modelBadge}>AI-Powered</span>
          )}
        </div>
        
        <div style={styles.headerRight}>
          {!loading && !error && !analysis && onAnalyze && (
            <button onClick={onAnalyze} style={styles.analyzeButton}>
              🔍 Analyze
            </button>
          )}
          {analysis && (
            <>
              <button 
                onClick={handleCopy} 
                style={styles.iconButton}
                title="Copy to clipboard"
              >
                {copied ? '✓' : '📋'}
              </button>
              <button 
                onClick={handleExport}
                style={styles.iconButton}
                title="Export as text"
              >
                📥
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Content */}
      {!collapsed && (
        <div ref={contentRef} style={styles.content}>
          {loading && <LoadingState />}
          
          {error && !analysis && (
            <ErrorState error={error} onRetry={onRetry} />
          )}
          
          {analysis && (
            <>
              <MarkdownRenderer content={analysis} />
              
              {/* Footer with attribution */}
              <div style={styles.footer}>
                <div style={styles.footerLeft}>
                  {timestamp && (
                    <span style={styles.timestamp}>
                      Generated: {new Date(timestamp).toLocaleString()}
                    </span>
                  )}
                </div>
                <div style={styles.footerRight}>
                  {model && (
                    <span style={styles.modelInfo}>
                      {model.includes('claude') ? '🤖 Claude' : '📋 Template'} Analysis
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
          
          {!loading && !error && !analysis && (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>
                Click <strong>Analyze</strong> to get AI-powered engineering insights
              </p>
              <p style={styles.emptySubtext}>
                Analysis includes baseline completeness, instrumentation gaps, 
                and recommendations based on industry norms.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Styles
 */
const styles = {
  container: {
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    borderRadius: '0.75rem',
    border: '2px solid #334155',
    overflow: 'hidden',
    marginBottom: '1.5rem'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    borderBottom: '1px solid #334155',
    background: 'rgba(0,0,0,0.2)'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  collapseButton: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '0.875rem',
    padding: '0.25rem'
  },
  title: {
    margin: 0,
    color: 'white',
    fontSize: '1.1rem',
    fontWeight: '600'
  },
  fallbackBadge: {
    fontSize: '0.7rem',
    padding: '0.25rem 0.5rem',
    background: 'rgba(251, 191, 36, 0.2)',
    color: '#fbbf24',
    borderRadius: '0.25rem',
    fontWeight: '500'
  },
  modelBadge: {
    fontSize: '0.7rem',
    padding: '0.25rem 0.5rem',
    background: 'rgba(34, 197, 94, 0.2)',
    color: '#22c55e',
    borderRadius: '0.25rem',
    fontWeight: '500'
  },
  analyzeButton: {
    padding: '0.5rem 1rem',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem'
  },
  iconButton: {
    padding: '0.5rem',
    background: 'rgba(255,255,255,0.1)',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '1rem'
  },
  content: {
    padding: '1.5rem',
    color: '#e2e8f0',
    fontSize: '0.9rem',
    lineHeight: '1.7'
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '3rem 2rem'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(255,255,255,0.1)',
    borderTop: '3px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1.5rem'
  },
  loadingText: {
    color: 'white',
    fontSize: '1rem',
    margin: '0 0 0.5rem'
  },
  loadingSubtext: {
    color: '#94a3b8',
    fontSize: '0.85rem',
    margin: 0
  },
  errorContainer: {
    textAlign: 'center',
    padding: '2rem'
  },
  errorIcon: {
    fontSize: '2.5rem',
    marginBottom: '1rem'
  },
  errorTitle: {
    color: '#f87171',
    margin: '0 0 0.5rem',
    fontSize: '1.1rem'
  },
  errorMessage: {
    color: '#94a3b8',
    margin: '0 0 1rem'
  },
  retryButton: {
    padding: '0.5rem 1rem',
    background: '#475569',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer'
  },
  emptyState: {
    textAlign: 'center',
    padding: '2rem'
  },
  emptyText: {
    color: '#e2e8f0',
    margin: '0 0 0.5rem'
  },
  emptySubtext: {
    color: '#64748b',
    fontSize: '0.85rem',
    margin: 0
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '1.5rem',
    paddingTop: '1rem',
    borderTop: '1px solid #334155',
    fontSize: '0.75rem',
    color: '#64748b'
  },
  footerLeft: {},
  footerRight: {},
  timestamp: {},
  modelInfo: {},
  
  // Markdown styles
  h1: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: 'white',
    margin: '0 0 1rem',
    paddingBottom: '0.5rem',
    borderBottom: '2px solid #3b82f6'
  },
  h2: {
    fontSize: '1.2rem',
    fontWeight: '600',
    color: '#f1f5f9',
    margin: '1.5rem 0 0.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  h3: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#cbd5e1',
    margin: '1.25rem 0 0.5rem'
  },
  p: {
    margin: '0 0 0.75rem',
    color: '#e2e8f0'
  },
  list: {
    margin: '0 0 1rem',
    paddingLeft: '1.5rem'
  },
  olist: {
    margin: '0 0 1rem',
    paddingLeft: '1.5rem'
  },
  listItem: {
    margin: '0.25rem 0',
    color: '#e2e8f0'
  },
  tableWrapper: {
    overflowX: 'auto',
    margin: '1rem 0'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.85rem'
  },
  th: {
    textAlign: 'left',
    padding: '0.5rem 0.75rem',
    background: 'rgba(59, 130, 246, 0.2)',
    color: '#93c5fd',
    fontWeight: '600',
    borderBottom: '2px solid #3b82f6'
  },
  td: {
    padding: '0.5rem 0.75rem',
    borderBottom: '1px solid #334155',
    color: '#e2e8f0'
  },
  blockquote: {
    margin: '1rem 0',
    padding: '0.75rem 1rem',
    background: 'rgba(59, 130, 246, 0.1)',
    borderLeft: '4px solid #3b82f6',
    color: '#93c5fd',
    fontStyle: 'italic'
  },
  hr: {
    border: 'none',
    height: '1px',
    background: '#334155',
    margin: '1.5rem 0'
  }
}

// Add keyframes for spinner animation
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `
  document.head.appendChild(styleSheet)
}
