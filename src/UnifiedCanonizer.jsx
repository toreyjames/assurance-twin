/**
 * UNIFIED CANONIZER
 * Single component with progressive disclosure (Basic/Standard/Premium tiers)
 * 
 * Based on AIGNE Framework principles + "Car Wash" pricing model:
 * - Basic: "Just the List" - simple asset inventory
 * - Standard: "Prioritized" - with security tiers & risk
 * - Premium: "Audit-Ready" - full evidence package
 */

import React, { useState, useCallback, useEffect } from 'react'
import Papa from 'papaparse'
import './styles.css'

// Import context modules for client-side processing
import { normalizeDataset, performMatching, detectSourceType } from './lib/context/constructor.js'
import { classifySecurityTier, crossValidate, identifyReviewItems, generateSummary } from './lib/context/evaluator.js'
import ProvenanceTracker from './lib/context/provenance.js'

// Import Agentic File System for AIGNE-compliant file management
import { getAFS, resetAFS, FileType, FileStatus } from './lib/context/afs.js'

// Import industry auto-detector
import { detectIndustry, getAvailableIndustries, getIndustryInfo } from './lib/context/industry-detector.js'

// Import Plant Map visualization (for "The Map" tier)
import PlantMap from './components/PlantMap.jsx'

// Import Engineering Intelligence (LLM-powered analysis)
import EngineeringIntelligence from './components/EngineeringIntelligence.jsx'
import { analyzeEngineering, generateFallbackAnalysis } from './lib/context/engineering-analyzer.js'

// =============================================================================
// FILE UPLOAD COMPONENT
// =============================================================================

function FileUploader({ label, description, files, setFiles }) {
  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files)
    setFiles(prev => [...prev, ...newFiles])
  }

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div style={{
      padding: '1.5rem',
      background: '#f8fafc',
      borderRadius: '0.75rem',
      border: '2px dashed #cbd5e1'
    }}>
      <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#0f172a' }}>
        {label}
      </div>
      <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
        {description}
      </div>
      
      {files.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          {files.map((file, idx) => (
            <div key={idx} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.5rem 0.75rem',
              background: 'white',
              borderRadius: '0.375rem',
              marginBottom: '0.5rem',
              border: '1px solid #e2e8f0'
            }}>
              <span style={{ fontSize: '0.875rem' }}>📄 {file.name}</span>
              <button
                onClick={() => removeFile(idx)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >×</button>
            </div>
          ))}
        </div>
      )}
      
      <label style={{
        display: 'inline-block',
        padding: '0.5rem 1rem',
        background: '#0f172a',
        color: 'white',
        borderRadius: '0.5rem',
        cursor: 'pointer',
        fontSize: '0.875rem',
        fontWeight: '500'
      }}>
        <input
          type="file"
          accept=".csv"
          multiple
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        + Add Files
      </label>
    </div>
  )
}

// =============================================================================
// TIER SELECTOR COMPONENT
// =============================================================================

function TierSelector({ selected, onSelect, disabled }) {
  const tiers = [
    {
      id: 'list',
      name: 'The List',
      subtitle: 'What You Have',
      icon: '📋',
      color: '#10b981',
      description: 'Clean, deduplicated asset inventory',
      features: [
        'Single source of truth',
        'Standardized CSV format',
        'Merged from all sources'
      ],
      useCase: '"We need to know what we have"'
    },
    {
      id: 'priorities',
      name: 'The Priorities',
      subtitle: 'What Typically Matters',
      icon: '🎯',
      color: '#3b82f6',
      description: 'Security classified with insights',
      features: [
        'Everything in The List',
        'Security tier classification',
        'Blind spots and orphans',
        'Executive summary',
        'Process unit breakdown'
      ],
      useCase: '"Where should we focus?"'
    },
    {
      id: 'map',
      name: 'The Map',
      subtitle: 'How It Connects',
      icon: '🏭',
      color: '#8b5cf6',
      description: 'Interactive plant visualization',
      features: [
        'Everything in The Priorities',
        '3D plant topology',
        'Network relationships',
        'Click-to-explore units',
        'Exportable views'
      ],
      useCase: '"Show me the big picture"'
    }
  ]

  return (
    <div style={{ marginBottom: '2rem' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#475569' }}>
        What do you need today?
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1rem'
      }}>
        {tiers.map(tier => (
          <button
            key={tier.id}
            onClick={() => !disabled && onSelect(tier.id)}
            disabled={disabled}
            style={{
              padding: '1.5rem',
              background: selected === tier.id ? `${tier.color}10` : 'white',
              border: `3px solid ${selected === tier.id ? tier.color : '#e2e8f0'}`,
              borderRadius: '0.75rem',
              cursor: disabled ? 'not-allowed' : 'pointer',
              textAlign: 'left',
              opacity: disabled ? 0.6 : 1,
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>{tier.icon}</span>
              <div>
                <div style={{ fontWeight: '700', color: '#0f172a' }}>{tier.name}</div>
                <div style={{ fontSize: '0.75rem', color: tier.color, fontWeight: '600' }}>{tier.subtitle}</div>
              </div>
            </div>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.75rem' }}>
              {tier.description}
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.75rem', color: '#475569', marginBottom: '0.75rem' }}>
              {tier.features.map((f, i) => <li key={i} style={{ marginBottom: '0.25rem' }}>{f}</li>)}
            </ul>
            {tier.useCase && (
              <div style={{ 
                fontSize: '0.7rem', 
                color: tier.color, 
                fontStyle: 'italic',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '0.5rem',
                marginTop: '0.5rem'
              }}>
                {tier.useCase}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// INDUSTRY SELECTOR COMPONENT (AIGNE: Auto-detect with manual override)
// =============================================================================

function IndustrySelector({ detection, selected, onSelect, disabled }) {
  const industries = getAvailableIndustries()
  const [expanded, setExpanded] = React.useState(false)
  
  // If auto-detected with confidence, show compact view
  const showAutoDetected = detection?.isReliable
  
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#475569' }}>
        Industry Context
      </h3>
      
      {/* Auto-detected banner */}
      {showAutoDetected && (
        <div style={{
          padding: '0.75rem 1rem',
          background: '#f0fdf4',
          border: '1px solid #22c55e',
          borderRadius: '0.5rem',
          marginBottom: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>{detection.industry.icon}</span>
            <div>
              <span style={{ fontWeight: '600', color: '#166534' }}>
                Auto-detected: {detection.industry.name}
              </span>
              <span style={{ 
                fontSize: '0.75rem', 
                color: '#15803d',
                marginLeft: '0.5rem',
                padding: '0.125rem 0.375rem',
                background: '#dcfce7',
                borderRadius: '0.25rem'
              }}>
                {detection.confidence}% confidence
              </span>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              background: 'transparent',
              border: '1px solid #22c55e',
              borderRadius: '0.25rem',
              color: '#166534',
              cursor: 'pointer'
            }}
          >
            {expanded ? 'Hide options' : 'Change'}
          </button>
        </div>
      )}
      
      {/* Industry selector grid (shown if no detection or expanded) */}
      {(!showAutoDetected || expanded) && (
        <>
          {!showAutoDetected && detection && !detection.isReliable && (
            <div style={{
              padding: '0.5rem 0.75rem',
              background: '#fefce8',
              border: '1px solid #facc15',
              borderRadius: '0.5rem',
              marginBottom: '0.75rem',
              fontSize: '0.875rem',
              color: '#854d0e'
            }}>
              ⚠️ {detection.reason}
            </div>
          )}
          
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            {/* Universal option */}
            <button
              onClick={() => onSelect(null)}
              disabled={disabled}
              style={{
                padding: '0.5rem 1rem',
                background: selected === null ? '#3b82f610' : 'white',
                border: `2px solid ${selected === null ? '#3b82f6' : '#e2e8f0'}`,
                borderRadius: '0.5rem',
                cursor: disabled ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                opacity: disabled ? 0.6 : 1
              }}
            >
              <span>🌐</span>
              <span style={{ fontWeight: selected === null ? '600' : '400' }}>Universal</span>
            </button>
            
            {/* Industry options */}
            {industries.map(ind => (
              <button
                key={ind.id}
                onClick={() => onSelect(ind.id)}
                disabled={disabled}
                style={{
                  padding: '0.5rem 1rem',
                  background: selected === ind.id ? '#3b82f610' : 'white',
                  border: `2px solid ${selected === ind.id ? '#3b82f6' : '#e2e8f0'}`,
                  borderRadius: '0.5rem',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  opacity: disabled ? 0.6 : 1
                }}
              >
                <span>{ind.icon}</span>
                <span style={{ fontWeight: selected === ind.id ? '600' : '400' }}>{ind.name}</span>
                {detection?.scores?.find(s => s.id === ind.id)?.percentage > 0 && (
                  <span style={{ 
                    fontSize: '0.625rem', 
                    color: '#64748b',
                    padding: '0.125rem 0.25rem',
                    background: '#f1f5f9',
                    borderRadius: '0.25rem'
                  }}>
                    {detection.scores.find(s => s.id === ind.id).percentage}%
                  </span>
                )}
              </button>
            ))}
          </div>
          
          <p style={{ 
            fontSize: '0.75rem', 
            color: '#64748b', 
            marginTop: '0.5rem',
            fontStyle: 'italic'
          }}>
            Industry context adds relevant compliance standards and terminology. 
            Universal works for any OT environment.
          </p>
        </>
      )}
    </div>
  )
}

// =============================================================================
// HUMAN REVIEW COMPONENT
// =============================================================================

function HumanReview({ reviewItems, onComplete, onSkip }) {
  const [decisions, setDecisions] = useState({})

  const handleDecision = (assetId, decision) => {
    setDecisions(prev => ({ ...prev, [assetId]: decision }))
  }

  const totalItems = reviewItems.lowConfidence.length + 
                    reviewItems.suspiciousClassifications.length + 
                    reviewItems.criticalOrphans.length

  return (
    <div style={{
      padding: '2rem',
      background: '#fffbeb',
      border: '3px solid #f59e0b',
      borderRadius: '0.75rem',
      marginBottom: '2rem'
    }}>
      <h3 style={{ margin: '0 0 0.5rem 0', color: '#92400e' }}>
        👁️ Human Review Checkpoint
      </h3>
      <p style={{ color: '#78350f', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        {totalItems} items flagged for verification before finalizing results
      </p>

      {/* Low confidence matches */}
      {reviewItems.lowConfidence.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.95rem', color: '#0f172a', marginBottom: '0.75rem' }}>
            ⚠️ Low Confidence Matches ({reviewItems.lowConfidence.length})
          </h4>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {reviewItems.lowConfidence.slice(0, 10).map((item, idx) => (
              <div key={idx} style={{
                padding: '0.75rem',
                background: 'white',
                borderRadius: '0.375rem',
                marginBottom: '0.5rem',
                fontSize: '0.875rem'
              }}>
                <strong>{item.tag_id}</strong> — {item.device_type} ({item.unit})
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Match: {item.matchType}, Confidence: {item.matchConfidence}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suspicious classifications */}
      {reviewItems.suspiciousClassifications.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.95rem', color: '#0f172a', marginBottom: '0.75rem' }}>
            🔍 Suspicious Classifications ({reviewItems.suspiciousClassifications.length})
          </h4>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>
            Classified as passive/analog but found on network
          </p>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {reviewItems.suspiciousClassifications.slice(0, 10).map((item, idx) => (
              <div key={idx} style={{
                padding: '0.75rem',
                background: 'white',
                borderRadius: '0.375rem',
                marginBottom: '0.5rem',
                fontSize: '0.875rem'
              }}>
                <strong>{item.tag_id}</strong> — {item.device_type}
                <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>
                  Has IP: {item.discovered?.ip_address} but classified as Tier 3
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Critical orphans */}
      {reviewItems.criticalOrphans.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.95rem', color: '#0f172a', marginBottom: '0.75rem' }}>
            👁️ Critical Orphan Devices ({reviewItems.criticalOrphans.length})
          </h4>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>
            Discovered on network but not in engineering baseline
          </p>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {reviewItems.criticalOrphans.slice(0, 10).map((item, idx) => (
              <div key={idx} style={{
                padding: '0.75rem',
                background: 'white',
                borderRadius: '0.375rem',
                marginBottom: '0.5rem',
                fontSize: '0.875rem'
              }}>
                <strong>{item.ip_address || item.hostname}</strong> — {item.device_type}
                <div style={{ fontSize: '0.75rem', color: '#8b5cf6' }}>
                  Manufacturer: {item.manufacturer || 'Unknown'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <button
          onClick={() => onComplete(decisions)}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          ✓ Mark as Reviewed
        </button>
        <button
          onClick={onSkip}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#64748b',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Skip Review →
        </button>
      </div>
    </div>
  )
}

// =============================================================================
// OPERATIONS CONTEXT (PREMIUM) - Shows we understand the plant
// =============================================================================

function OperationsContext({ result }) {
  // Extract insights from the data
  const assets = result.assets || []
  
  // Process unit breakdown (from unit/area/location fields)
  const processUnits = React.useMemo(() => {
    const units = {}
    assets.forEach(a => {
      const unit = a.unit || a.area || a.location || 'Unassigned'
      if (!units[unit]) {
        units[unit] = { count: 0, tier1: 0, tier2: 0, critical: [] }
      }
      units[unit].count++
      if (a.classification?.tier === 1) {
        units[unit].tier1++
        units[unit].critical.push(a.tag_id || a.asset_id)
      }
      if (a.classification?.tier === 2) units[unit].tier2++
    })
    return Object.entries(units)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.tier1 - a.tier1)
      .slice(0, 10)
  }, [assets])
  
  // Safety systems identification
  const safetySystems = React.useMemo(() => {
    const safetyKeywords = ['sis', 'esd', 'f&g', 'fire', 'gas', 'shutdown', 'safety', 'bms', 'emergency']
    return assets.filter(a => {
      const text = JSON.stringify(a).toLowerCase()
      return safetyKeywords.some(kw => text.includes(kw))
    }).slice(0, 20)
  }, [assets])
  
  // Dependency analysis - find assets with similar network segments
  const networkClusters = React.useMemo(() => {
    const clusters = {}
    assets.forEach(a => {
      if (a.ip_address) {
        const subnet = a.ip_address.split('.').slice(0, 3).join('.') + '.x'
        if (!clusters[subnet]) clusters[subnet] = []
        clusters[subnet].push(a)
      }
    })
    return Object.entries(clusters)
      .filter(([, items]) => items.length >= 3)
      .map(([subnet, items]) => ({
        subnet,
        count: items.length,
        hasCritical: items.some(i => i.classification?.tier === 1)
      }))
      .slice(0, 8)
  }, [assets])
  
  // Generate executive insights
  const insights = React.useMemo(() => {
    const total = assets.length
    const tier1 = assets.filter(a => a.classification?.tier === 1).length
    const tier2 = assets.filter(a => a.classification?.tier === 2).length
    const matched = result.summary?.matched || 0
    const coverage = result.summary?.coverage || 0
    
    const messages = []
    
    // Coverage insight
    if (coverage < 50) {
      messages.push({
        type: 'warning',
        icon: '⚠️',
        title: 'Low Discovery Coverage',
        text: `Only ${coverage}% of documented assets were found on the network. This suggests either disconnected assets, documentation gaps, or network visibility issues.`
      })
    } else if (coverage > 80) {
      messages.push({
        type: 'success',
        icon: '✅',
        title: 'Good Discovery Coverage',
        text: `${coverage}% of documented assets were discovered on the network, indicating good baseline-to-reality alignment.`
      })
    }
    
    // Critical asset insight
    if (tier1 > 0) {
      messages.push({
        type: 'alert',
        icon: '🔴',
        title: `${tier1} Critical Control Systems Identified`,
        text: `These Tier 1 assets (PLCs, DCS, safety systems) should be prioritized for hardening, monitoring, and incident response planning.`
      })
    }
    
    // Safety systems insight
    if (safetySystems.length > 0) {
      messages.push({
        type: 'info',
        icon: '🛡️',
        title: `${safetySystems.length} Safety-Related Assets`,
        text: `Detected ESD, F&G, SIS, or similar safety systems. These require special handling per IEC 61511/ISA 84.`
      })
    }
    
    // Orphan insight
    if (result.summary?.orphans > 10) {
      messages.push({
        type: 'warning',
        icon: '👻',
        title: `${result.summary.orphans} Undocumented Network Devices`,
        text: `These "orphans" were found on the network but don't appear in engineering documentation. Investigate for shadow IT or documentation gaps.`
      })
    }
    
    return messages
  }, [assets, safetySystems.length, result.summary])

  return (
    <div style={{
      background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
      border: '2px solid #8b5cf6',
      borderRadius: '0.75rem',
      padding: '1.5rem',
      marginBottom: '2rem'
    }}>
      <h3 style={{ 
        margin: '0 0 1.5rem 0', 
        fontSize: '1.25rem', 
        fontWeight: '700', 
        color: '#5b21b6',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        🏭 Operations Context
        <span style={{ fontSize: '0.75rem', fontWeight: '400', color: '#7c3aed' }}>
          — We understand how your plant operates
        </span>
      </h3>
      
      {/* Executive Insights */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem', fontWeight: '600', color: '#6b21a8' }}>
          Executive Summary
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {insights.map((insight, i) => (
            <div key={i} style={{
              padding: '0.75rem 1rem',
              background: 'white',
              borderRadius: '0.5rem',
              borderLeft: `4px solid ${
                insight.type === 'warning' ? '#f59e0b' :
                insight.type === 'alert' ? '#ef4444' :
                insight.type === 'success' ? '#10b981' : '#3b82f6'
              }`
            }}>
              <div style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                {insight.icon} {insight.title}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {insight.text}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Process Unit Breakdown */}
      {processUnits.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem', fontWeight: '600', color: '#6b21a8' }}>
            Process Unit Breakdown
          </h4>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
            gap: '0.5rem' 
          }}>
            {processUnits.map((unit, i) => (
              <div key={i} style={{
                padding: '0.75rem',
                background: 'white',
                borderRadius: '0.5rem',
                fontSize: '0.8rem'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{unit.name}</div>
                <div style={{ color: '#64748b' }}>
                  {unit.count} assets
                  {unit.tier1 > 0 && (
                    <span style={{ color: '#ef4444', marginLeft: '0.5rem' }}>
                      ({unit.tier1} critical)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Network Topology Insight */}
      {networkClusters.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem', fontWeight: '600', color: '#6b21a8' }}>
            Network Topology
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {networkClusters.map((cluster, i) => (
              <div key={i} style={{
                padding: '0.5rem 0.75rem',
                background: cluster.hasCritical ? '#fef2f2' : 'white',
                border: cluster.hasCritical ? '1px solid #fecaca' : '1px solid #e2e8f0',
                borderRadius: '0.375rem',
                fontSize: '0.75rem'
              }}>
                <code>{cluster.subnet}</code>
                <span style={{ marginLeft: '0.5rem', color: '#64748b' }}>
                  {cluster.count} devices
                </span>
                {cluster.hasCritical && (
                  <span style={{ marginLeft: '0.25rem', color: '#ef4444' }}>⚠️</span>
                )}
              </div>
            ))}
          </div>
          <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.5rem', fontStyle: 'italic' }}>
            Subnets with critical assets highlighted. Consider network segmentation review.
          </p>
        </div>
      )}
      
      {/* Safety Systems */}
      {safetySystems.length > 0 && (
        <div>
          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem', fontWeight: '600', color: '#6b21a8' }}>
            Safety Systems Identified ({safetySystems.length})
          </h4>
          <div style={{ 
            background: '#fef2f2', 
            border: '1px solid #fecaca', 
            borderRadius: '0.5rem',
            padding: '0.75rem'
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {safetySystems.slice(0, 10).map((sys, i) => (
                <span key={i} style={{
                  padding: '0.25rem 0.5rem',
                  background: 'white',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace'
                }}>
                  {sys.tag_id || sys.asset_id || 'Unknown'}
                </span>
              ))}
              {safetySystems.length > 10 && (
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  +{safetySystems.length - 10} more
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: '0.5rem', marginBottom: 0 }}>
              🛡️ These require IEC 61511 / ISA 84 compliance review
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// RESULTS COMPONENT
// =============================================================================

function Results({ result, outputLevel, onReset, industry }) {
  // Engineering analysis state (for The Map tier)
  const [engineeringAnalysis, setEngineeringAnalysis] = React.useState(null)
  const [analysisLoading, setAnalysisLoading] = React.useState(false)
  const [analysisError, setAnalysisError] = React.useState(null)
  
  // Handle engineering analysis request
  const handleAnalyze = async () => {
    if (!result || analysisLoading) return
    
    setAnalysisLoading(true)
    setAnalysisError(null)
    
    try {
      console.log('[ANALYSIS] Starting engineering analysis...')
      const analysisResult = await analyzeEngineering(result, industry)
      
      if (analysisResult.success) {
        console.log('[ANALYSIS] Complete:', analysisResult.model)
        setEngineeringAnalysis(analysisResult)
      } else {
        console.warn('[ANALYSIS] Using fallback due to:', analysisResult.error)
        // Use fallback if API fails
        const fallback = generateFallbackAnalysis(result, industry, null)
        setEngineeringAnalysis(fallback)
      }
    } catch (error) {
      console.error('[ANALYSIS] Error:', error)
      setAnalysisError(error.message)
      // Still try to show fallback
      const fallback = generateFallbackAnalysis(result, industry, null)
      setEngineeringAnalysis(fallback)
    } finally {
      setAnalysisLoading(false)
    }
  }
  
  // Auto-analyze for Map tier on first render
  React.useEffect(() => {
    if (outputLevel === 'map' && result && !engineeringAnalysis && !analysisLoading) {
      handleAnalyze()
    }
  }, [outputLevel, result])
  
  const downloadCSV = (data, filename) => {
    if (!data || data.length === 0) return
    
    const headers = Object.keys(data[0]).filter(k => !k.startsWith('_') && k !== 'discovered' && k !== 'classification' && k !== 'validation' && k !== 'provenance')
    const rows = data.map(item => 
      headers.map(h => {
        let val = item[h]
        if (typeof val === 'object') val = JSON.stringify(val)
        return `"${String(val || '').replace(/"/g, '""')}"`
      }).join(',')
    )
    
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <SummaryCard 
          label="Total Assets" 
          value={result.summary.total} 
          color="#10b981" 
        />
        <SummaryCard 
          label="Matched" 
          value={result.summary.matched} 
          sublabel={`${result.summary.coverage}% coverage`}
          color="#3b82f6" 
        />
        <SummaryCard 
          label="Blind Spots" 
          value={result.summary.blindSpots} 
          sublabel="Not discovered"
          color="#f59e0b" 
        />
        <SummaryCard 
          label="Orphans" 
          value={result.summary.orphans} 
          sublabel="Not in baseline"
          color="#8b5cf6" 
        />
      </div>

      {/* Tier Distribution (Standard & Premium) */}
      {outputLevel !== 'list' && (
        <div style={{
          padding: '1.5rem',
          background: '#f8fafc',
          borderRadius: '0.75rem',
          marginBottom: '2rem'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '600' }}>
            Security Tier Distribution
          </h3>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <TierBadge tier={1} count={result.summary.tier1} label="Critical" color="#ef4444" />
            <TierBadge tier={2} count={result.summary.tier2} label="Networkable" color="#f59e0b" />
            <TierBadge tier={3} count={result.summary.tier3} label="Passive" color="#6366f1" />
          </div>
          <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
            <strong>{result.summary.tier1 + result.summary.tier2}</strong> assets require security management
          </div>
        </div>
      )}

      {/* Operations Context (Priorities and Map tiers) */}
      {(outputLevel === 'priorities' || outputLevel === 'map') && (
        <OperationsContext result={result} />
      )}

      {/* 3D Plant Visualization (Map tier only) */}
      {outputLevel === 'map' && (
        <PlantMap result={result} industry={industry} />
      )}
      
      {/* Engineering Intelligence Panel (Map tier only) */}
      {outputLevel === 'map' && (
        <EngineeringIntelligence
          analysis={engineeringAnalysis?.analysis}
          loading={analysisLoading}
          error={analysisError}
          onAnalyze={handleAnalyze}
          onRetry={handleAnalyze}
          timestamp={engineeringAnalysis?.timestamp}
          model={engineeringAnalysis?.model}
          isFallback={engineeringAnalysis?.isFallback}
        />
      )}

      {/* Download Buttons */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        marginBottom: '2rem'
      }}>
        <button
          onClick={() => downloadCSV(result.assets, `canonized_assets_${new Date().toISOString().split('T')[0]}.csv`)}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          📥 Download Assets ({result.assets?.length || 0})
        </button>
        
        {result.blindSpots?.length > 0 && (
          <button
            onClick={() => downloadCSV(result.blindSpots, `blind_spots_${new Date().toISOString().split('T')[0]}.csv`)}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            📥 Blind Spots ({result.blindSpots.length})
          </button>
        )}
        
        {result.orphans?.length > 0 && (
          <button
            onClick={() => downloadCSV(result.orphans, `orphans_${new Date().toISOString().split('T')[0]}.csv`)}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            📥 Orphans ({result.orphans.length})
          </button>
        )}
      </div>

      {/* Start Over */}
      <button
        onClick={onReset}
        style={{
          padding: '0.75rem 1.5rem',
          background: '#0f172a',
          color: 'white',
          border: 'none',
          borderRadius: '0.5rem',
          fontWeight: '600',
          cursor: 'pointer'
        }}
      >
        ← Start New Canonization
      </button>
    </div>
  )
}

function SummaryCard({ label, value, sublabel, color }) {
  return (
    <div style={{
      padding: '1.25rem',
      background: `${color}10`,
      border: `2px solid ${color}`,
      borderRadius: '0.75rem'
    }}>
      <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>
        {label}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: '700', color }}>
        {value?.toLocaleString?.() || value}
      </div>
      {sublabel && (
        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{sublabel}</div>
      )}
    </div>
  )
}

function TierBadge({ tier, count, label, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{
        width: '2.5rem',
        height: '2.5rem',
        borderRadius: '50%',
        background: color,
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '700'
      }}>
        {tier}
      </div>
      <div>
        <div style={{ fontWeight: '600', color: '#0f172a' }}>{count.toLocaleString()}</div>
        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{label}</div>
      </div>
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

// =============================================================================
// SESSION PERSISTENCE (AIGNE: Context must not be forgotten)
// =============================================================================

const SESSION_KEY = 'ot_canonizer_session'

function saveSession(data) {
  try {
    const session = {
      ...data,
      savedAt: new Date().toISOString()
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    console.log('[SESSION] Saved:', session.stage, session.result?.summary?.matched || 0, 'assets')
  } catch (err) {
    console.warn('[SESSION] Failed to save:', err)
  }
}

function loadSession() {
  try {
    const stored = localStorage.getItem(SESSION_KEY)
    if (!stored) return null
    const session = JSON.parse(stored)
    
    // Check if session is less than 24 hours old
    const savedAt = new Date(session.savedAt)
    const hoursSince = (Date.now() - savedAt.getTime()) / (1000 * 60 * 60)
    if (hoursSince > 24) {
      console.log('[SESSION] Expired, clearing')
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    
    console.log('[SESSION] Restored:', session.stage, 'from', session.savedAt)
    return session
  } catch (err) {
    console.warn('[SESSION] Failed to load:', err)
    return null
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY)
  console.log('[SESSION] Cleared')
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function UnifiedCanonizer() {
  // Load persisted session on mount
  const savedSession = loadSession()
  
  // File state (not persisted - files can't be serialized)
  const [engineeringFiles, setEngineeringFiles] = useState([])
  const [discoveryFiles, setDiscoveryFiles] = useState([])
  const [otherFiles, setOtherFiles] = useState([])
  
  // UI state - restore from session if available
  const [stage, setStage] = useState(savedSession?.stage || 'upload')
  const [outputLevel, setOutputLevel] = useState(savedSession?.outputLevel || 'priorities')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(savedSession?.result || null)
  
  // Industry auto-detection (AIGNE: adapt to data patterns)
  const [industryDetection, setIndustryDetection] = useState(null) // { detected, confidence, scores }
  const [selectedIndustry, setSelectedIndustry] = useState(savedSession?.industry || null) // User override
  
  // Persist state changes
  React.useEffect(() => {
    if (result || stage !== 'upload') {
      saveSession({ stage, outputLevel, result, industry: selectedIndustry })
    }
  }, [stage, outputLevel, result, selectedIndustry])

  // Auto-detect industry when files change (AIGNE: Context Constructor auto-detection)
  React.useEffect(() => {
    const detectFromFiles = async () => {
      const allFiles = [...engineeringFiles, ...discoveryFiles]
      if (allFiles.length === 0) {
        setIndustryDetection(null)
        return
      }
      
      try {
        // Read and parse first few files for detection
        const sampleRows = []
        for (const file of allFiles.slice(0, 3)) {
          const content = await readFile(file)
          const parsed = Papa.parse(content, { header: true, skipEmptyLines: true })
          sampleRows.push(...parsed.data.slice(0, 200)) // Sample first 200 rows per file
        }
        
        if (sampleRows.length > 0) {
          const detection = detectIndustry(sampleRows)
          setIndustryDetection(detection)
          
          // Auto-select if confident and user hasn't manually selected
          if (detection.isReliable && !selectedIndustry) {
            setSelectedIndustry(detection.detected)
          }
          
          console.log('[INDUSTRY] Auto-detected:', JSON.stringify({
            detected: detection.detected,
            confidence: detection.confidence,
            isReliable: detection.isReliable,
            reason: detection.reason
          }))
        }
      } catch (err) {
        console.warn('[INDUSTRY] Detection failed:', err)
      }
    }
    
    detectFromFiles()
  }, [engineeringFiles, discoveryFiles])

  // Read file as text
  const readFile = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsText(file)
  })

  // Client-side canonization (for demo when API unavailable)
  const processClientSide = async (sources) => {
    const provenance = new ProvenanceTracker()
    const afs = getAFS()
    
    provenance.record({ type: 'PIPELINE_START', outputLevel })

    // Parse and normalize files with AFS registration
    let allEngineering = []
    let allDiscovery = []
    const sourceFileIds = []

    console.log('[PROCESS] Engineering sources:', sources.engineering?.length || 0)
    console.log('[PROCESS] Discovery sources:', sources.discovery?.length || 0)

    // Process engineering sources
    for (const source of sources.engineering || []) {
      // Register file in AFS
      const fileId = afs.registerFile({
        name: source.filename,
        type: FileType.SOURCE_ENGINEERING,
        content: source.content,
        metadata: { category: 'engineering' }
      })
      sourceFileIds.push(fileId)
      
      // Parse and normalize
      const parsed = Papa.parse(source.content, { header: true, skipEmptyLines: true })
      const schema = parsed.meta.fields || []
      const detectedType = detectSourceType(schema, source.filename)
      
      // Update AFS with ingestion details
      afs.markIngested(fileId, {
        rowCount: parsed.data?.length || 0,
        schema,
        detectedType
      })
      
      console.log('[PROCESS] Parsed engineering:', parsed.data?.length, 'rows from', source.filename)
      const rows = normalizeDataset(parsed.data || [], fileId) // Use fileId as sourceId
      allEngineering.push(...rows)
      provenance.recordSourceIngestion(fileId, source.filename, afs.getFile(fileId).contentHash, rows.length, detectedType)
    }

    // Process discovery sources
    for (const source of sources.discovery || []) {
      // Register file in AFS
      const fileId = afs.registerFile({
        name: source.filename,
        type: FileType.SOURCE_DISCOVERY,
        content: source.content,
        metadata: { category: 'discovery' }
      })
      sourceFileIds.push(fileId)
      
      // Parse and normalize
      const parsed = Papa.parse(source.content, { header: true, skipEmptyLines: true })
      const schema = parsed.meta.fields || []
      const detectedType = detectSourceType(schema, source.filename)
      
      // Update AFS with ingestion details
      afs.markIngested(fileId, {
        rowCount: parsed.data?.length || 0,
        schema,
        detectedType
      })
      
      console.log('[PROCESS] Parsed discovery:', parsed.data?.length, 'rows from', source.filename)
      const rows = normalizeDataset(parsed.data || [], fileId)
      allDiscovery.push(...rows)
      provenance.recordSourceIngestion(fileId, source.filename, afs.getFile(fileId).contentHash, rows.length, detectedType)
    }

    console.log('[PROCESS] Total engineering rows:', allEngineering.length)
    console.log('[PROCESS] Total discovery rows:', allDiscovery.length)
    console.log('[AFS] Source files registered:', sourceFileIds.length)

    // Perform matching
    const matchResults = performMatching(allEngineering, allDiscovery, provenance)
    console.log('[PROCESS] Match results:', JSON.stringify(matchResults?.stats || {}))
    console.log('[PROCESS] Matched array?', Array.isArray(matchResults?.matched), 'Length:', matchResults?.matched?.length)
    
    // Safety check - if matched isn't an array, create empty results
    if (!matchResults || !Array.isArray(matchResults.matched)) {
      console.error('[PROCESS] Invalid matchResults - creating empty result')
      return {
        status: 'COMPLETE',
        assets: [],
        blindSpots: allEngineering.slice(0, 100),
        orphans: allDiscovery.slice(0, 100),
        summary: {
          total: allEngineering.length,
          matched: 0,
          blindSpots: allEngineering.length,
          orphans: allDiscovery.length,
          coverage: 0,
          tier1: 0, tier2: 0, tier3: 0
        },
        reviewRequired: { lowConfidenceMatches: [], suspiciousClassifications: [], criticalOrphans: [], summary: { lowConfidenceCount: 0, suspiciousCount: 0, criticalOrphanCount: 0 } }
      }
    }
    
    provenance.record({ type: 'MATCHING_COMPLETE', ...matchResults.stats })

    // Classify and validate
    const canonicalAssets = matchResults.matched.map(match => {
      const classification = classifySecurityTier(match.engineering)
      const validation = crossValidate(match)

      return {
        tag_id: match.engineering.tag_id || match.discovered?.tag_id || 'UNKNOWN',
        ip_address: match.discovered?.ip_address || match.engineering.ip_address || '',
        hostname: match.discovered?.hostname || match.engineering.hostname || '',
        mac_address: match.discovered?.mac_address || match.engineering.mac_address || '',
        plant: match.engineering.plant,
        unit: match.engineering.unit,
        device_type: match.engineering.device_type,
        manufacturer: match.engineering.manufacturer,
        model: match.engineering.model,
        last_seen: match.discovered?.last_seen || '',
        is_managed: match.discovered?.is_managed || false,
        classification,
        validation,
        matchType: match.matchType,
        matchConfidence: match.confidence,
        discovered: match.discovered
      }
    })

    // Generate summary
    const summary = {
      total: matchResults.stats.engineeringTotal,
      matched: matchResults.stats.matchedCount,
      blindSpots: matchResults.stats.blindSpotCount,
      orphans: matchResults.stats.orphanCount,
      coverage: matchResults.stats.coveragePercent,
      tier1: canonicalAssets.filter(a => a.classification?.tier === 1).length,
      tier2: canonicalAssets.filter(a => a.classification?.tier === 2).length,
      tier3: canonicalAssets.filter(a => a.classification?.tier === 3).length
    }

    // Identify review items
    const reviewItems = identifyReviewItems(canonicalAssets, matchResults.blindSpots, matchResults.orphans)

    // Register output files in AFS (with lineage tracking)
    const assetsFileId = afs.registerFile({
      name: 'canonical_assets.json',
      type: FileType.CANONICAL_ASSETS,
      metadata: { assetCount: canonicalAssets.length, outputLevel }
    })
    afs.recordDerivation(sourceFileIds, assetsFileId, 'MATCHING_AND_CLASSIFICATION')

    const blindSpotsFileId = afs.registerFile({
      name: 'blind_spots.json',
      type: FileType.CANONICAL_BLIND_SPOTS,
      metadata: { count: matchResults.blindSpots.length }
    })
    afs.recordDerivation(sourceFileIds.filter(id => afs.getFile(id)?.type === FileType.SOURCE_ENGINEERING), blindSpotsFileId, 'UNMATCHED_ENGINEERING')

    const orphansFileId = afs.registerFile({
      name: 'orphans.json',
      type: FileType.CANONICAL_ORPHANS,
      metadata: { count: matchResults.orphans.length }
    })
    afs.recordDerivation(sourceFileIds.filter(id => afs.getFile(id)?.type === FileType.SOURCE_DISCOVERY), orphansFileId, 'UNMATCHED_DISCOVERY')

    console.log('[AFS] Output files registered:', { assetsFileId, blindSpotsFileId, orphansFileId })
    console.log('[AFS] File catalog:', afs.getCatalog())

    return {
      status: reviewItems.summary.lowConfidenceCount > 0 ? 'PENDING_REVIEW' : 'COMPLETE',
      assets: canonicalAssets,
      blindSpots: matchResults.blindSpots.slice(0, 100),
      orphans: matchResults.orphans.slice(0, 100),
      summary,
      reviewRequired: reviewItems,
      audit: outputLevel === 'map' ? await provenance.generateAuditPackage(canonicalAssets, summary) : null,
      // Include AFS catalog for AIGNE compliance
      fileCatalog: afs.getCatalog()
    }
  }

  // Run canonization
  const handleCanonize = async () => {
    const totalFiles = engineeringFiles.length + discoveryFiles.length + otherFiles.length
    if (totalFiles === 0) {
      setError('Please upload at least one file')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Prepare sources
      const sources = {
        engineering: [],
        discovery: [],
        other: []
      }

      for (const file of engineeringFiles) {
        const content = await readFile(file)
        sources.engineering.push({ filename: file.name, content })
      }

      for (const file of discoveryFiles) {
        const content = await readFile(file)
        sources.discovery.push({ filename: file.name, content })
      }

      for (const file of otherFiles) {
        const content = await readFile(file)
        sources.other.push({ filename: file.name, content })
      }

      // Try API first, fall back to client-side
      let data
      try {
        const response = await fetch('/api/canonize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sources, outputLevel, industry: 'oil-gas' })
        })

        if (!response.ok) {
          throw new Error('API unavailable')
        }

        data = await response.json()
        console.log('[CANONIZE] API result:', data)
      } catch (apiErr) {
        console.log('[CANONIZE] API unavailable, using client-side processing')
        try {
          data = await processClientSide(sources)
          console.log('[CANONIZE] Client-side result:', data)
        } catch (clientErr) {
          console.error('[CANONIZE] Client-side error:', clientErr)
          throw new Error('Processing failed: ' + clientErr.message)
        }
      }

      setResult(data)

      // Move to review if needed, otherwise results
      const hasReviewItems = data.status === 'PENDING_REVIEW' && 
        (data.reviewRequired?.summary?.lowConfidenceCount > 0 || data.reviewRequired?.lowConfidenceMatches?.length > 0)
      
      console.log('[CANONIZE] Review needed:', hasReviewItems, 'Stage:', hasReviewItems && outputLevel !== 'list' ? 'review' : 'results')
      
      if (hasReviewItems && outputLevel !== 'list') {
        setStage('review')
      } else {
        setStage('results')
      }

    } catch (err) {
      console.error('[CANONIZE] Error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Handle human review completion
  const handleReviewComplete = (decisions) => {
    // In a full implementation, we'd send decisions back to API
    // For now, just move to results
    setStage('results')
  }

  // Reset to start (explicit user action clears session and AFS)
  const handleReset = () => {
    clearSession() // Clear persisted session
    resetAFS() // Clear the Agentic File System
    setEngineeringFiles([])
    setDiscoveryFiles([])
    setOtherFiles([])
    setResult(null)
    setError(null)
    setStage('upload')
    setIndustryDetection(null) // Reset industry detection
    setSelectedIndustry(null) // Reset industry selection
    console.log('[RESET] Session, AFS, and industry detection cleared')
  }

  // Available demo datasets (AIGNE-generated)
  const DEMO_DATASETS = [
    { id: 'oil-gas-medium', label: 'Oil & Gas - Medium (~12K assets)', industry: 'oil-gas', scale: 'medium', path: '/samples/demo/oil-gas' },
    { id: 'oil-gas-large', label: 'Oil & Gas - Large (~11K assets, 3 plants)', industry: 'oil-gas', scale: 'large', path: '/samples/aigne/oil-gas/large' },
    { id: 'oil-gas-enterprise', label: 'Oil & Gas - Enterprise (~32K assets, 5 plants)', industry: 'oil-gas', scale: 'enterprise', path: '/samples/aigne/oil-gas/enterprise' },
    { id: 'pharma-large', label: 'Pharma - Large (~11K assets, 3 plants)', industry: 'pharma', scale: 'large', path: '/samples/aigne/pharma/large' },
    { id: 'utilities-large', label: 'Utilities - Large (~10K assets, 3 plants)', industry: 'utilities', scale: 'large', path: '/samples/aigne/utilities/large' }
  ]
  
  const [selectedDemoDataset, setSelectedDemoDataset] = useState('oil-gas-large')

  // Load demo data
  const loadDemoData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const dataset = DEMO_DATASETS.find(d => d.id === selectedDemoDataset) || DEMO_DATASETS[0]
      const basePath = dataset.path
      
      // Determine file naming based on dataset type
      const isAigneDataset = basePath.includes('/aigne/')
      const files = isAigneDataset ? [
        { name: `engineering_baseline_${dataset.scale}.csv`, type: 'engineering' },
        { name: `ot_discovery_${dataset.scale}.csv`, type: 'discovery' }
      ] : [
        { name: 'engineering_baseline_medium.csv', type: 'engineering' },
        { name: 'ot_discovery_medium.csv', type: 'discovery' }
      ]

      console.log('[DEMO] Loading dataset:', dataset.label, 'from', basePath)

      for (const fileInfo of files) {
        const response = await fetch(`${basePath}/${fileInfo.name}`)
        if (!response.ok) {
          console.warn(`[DEMO] Failed to load ${fileInfo.name}:`, response.status)
          continue
        }
        const text = await response.text()
        const file = new File([text], fileInfo.name, { type: 'text/csv' })
        
        if (fileInfo.type === 'engineering') {
          setEngineeringFiles(prev => [...prev, file])
        } else {
          setDiscoveryFiles(prev => [...prev, file])
        }
      }
      
      console.log('[DEMO] Dataset loaded successfully')
    } catch (err) {
      setError('Failed to load demo data: ' + err.message)
      console.error('[DEMO] Error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* UPLOAD STAGE */}
      {stage === 'upload' && (
        <>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
            OT Asset Canonizer
          </h2>
          <p style={{ color: '#64748b', marginBottom: '2rem' }}>
            Upload your data sources. We'll merge, match, and validate your OT asset inventory.
          </p>

          {/* Demo data selector */}
          <div style={{ 
            display: 'flex', 
            gap: '0.75rem', 
            alignItems: 'center',
            marginBottom: '2rem',
            flexWrap: 'wrap'
          }}>
            <select
              value={selectedDemoDataset}
              onChange={(e) => setSelectedDemoDataset(e.target.value)}
              disabled={loading}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                border: '2px solid #e2e8f0',
                background: 'white',
                fontSize: '0.9rem',
                cursor: 'pointer',
                minWidth: '280px'
              }}
            >
              {DEMO_DATASETS.map(ds => (
                <option key={ds.id} value={ds.id}>{ds.label}</option>
              ))}
            </select>
            <button
              onClick={loadDemoData}
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              ⚡ Load Dataset
            </button>
          </div>

          {/* Output level selector */}
          <TierSelector 
            selected={outputLevel} 
            onSelect={setOutputLevel}
            disabled={loading}
          />

          {/* Industry auto-detection (AIGNE: Context Constructor adapts to data) */}
          <IndustrySelector
            detection={industryDetection}
            selected={selectedIndustry}
            onSelect={setSelectedIndustry}
            disabled={loading}
          />

          {/* File uploaders */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            <FileUploader
              label="📋 Engineering Baseline"
              description="Asset registers, P&IDs, CMMS exports"
              files={engineeringFiles}
              setFiles={setEngineeringFiles}
            />
            <FileUploader
              label="🔍 OT Discovery"
              description="Claroty, Nozomi, Armis exports"
              files={discoveryFiles}
              setFiles={setDiscoveryFiles}
            />
            <FileUploader
              label="📦 Other Data (Optional)"
              description="Additional sources - auto-detected"
              files={otherFiles}
              setFiles={setOtherFiles}
            />
          </div>

          {/* Error display */}
          {error && (
            <div style={{
              padding: '1rem',
              background: '#fef2f2',
              border: '1px solid #ef4444',
              borderRadius: '0.5rem',
              color: '#b91c1c',
              marginBottom: '1rem'
            }}>
              ❌ {error}
            </div>
          )}

          {/* Canonize button */}
          <button
            onClick={handleCanonize}
            disabled={loading || (engineeringFiles.length + discoveryFiles.length + otherFiles.length) === 0}
            style={{
              padding: '1rem 2rem',
              background: loading ? '#94a3b8' : '#0f172a',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: '700',
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? '⚙️ Processing...' : '🚀 Canonize Assets'}
          </button>
          
          <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: '#64748b' }}>
            Files ready: {engineeringFiles.length + discoveryFiles.length + otherFiles.length}
          </div>
        </>
      )}

      {/* REVIEW STAGE */}
      {stage === 'review' && result?.reviewRequired && (
        <>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>
            Canonization Complete - Review Required
          </h2>
          <HumanReview
            reviewItems={result.reviewRequired}
            onComplete={handleReviewComplete}
            onSkip={() => setStage('results')}
          />
        </>
      )}

      {/* RESULTS STAGE */}
      {stage === 'results' && result && (
        <>
          {/* Session restored indicator */}
          {savedSession?.result && (
            <div style={{
              padding: '0.75rem 1rem',
              background: '#eff6ff',
              border: '1px solid #3b82f6',
              borderRadius: '0.5rem',
              color: '#1e40af',
              marginBottom: '1rem',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              🔄 <strong>Session Restored</strong> — Your previous results are still here. 
              <span style={{ color: '#64748b' }}>
                (Saved {new Date(savedSession.savedAt).toLocaleString()})
              </span>
            </div>
          )}
          
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
            ✅ Canonization Complete
          </h2>
          <p style={{ color: '#64748b', marginBottom: '2rem' }}>
            Output level: <strong>{outputLevel.charAt(0).toUpperCase() + outputLevel.slice(1)}</strong>
          </p>
          <Results 
            result={result} 
            outputLevel={outputLevel}
            onReset={handleReset}
            industry={selectedIndustry}
          />
        </>
      )}
    </div>
  )
}

