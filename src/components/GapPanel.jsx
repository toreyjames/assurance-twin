/**
 * GAP PANEL COMPONENT
 * Displays gap analysis results with context
 * 
 * Three gap categories:
 * 1. Asset Gaps - Missing/undocumented devices
 * 2. Functional Gaps - Missing capabilities
 * 3. Coverage Gaps - Discovery blind spots
 */

import React, { useState } from 'react'
import { GapType, GapSeverity } from '../lib/context/gap-analyzer.js'

// =============================================================================
// SEVERITY STYLING
// =============================================================================

const SEVERITY_STYLES = {
  [GapSeverity.CRITICAL]: { 
    bg: '#fef2f2', 
    border: '#ef4444', 
    text: '#dc2626',
    icon: '🔴'
  },
  [GapSeverity.HIGH]: { 
    bg: '#fff7ed', 
    border: '#f97316', 
    text: '#ea580c',
    icon: '🟠'
  },
  [GapSeverity.MEDIUM]: { 
    bg: '#fefce8', 
    border: '#eab308', 
    text: '#ca8a04',
    icon: '🟡'
  },
  [GapSeverity.LOW]: { 
    bg: '#f0fdf4', 
    border: '#22c55e', 
    text: '#16a34a',
    icon: '🟢'
  },
  [GapSeverity.INFO]: { 
    bg: '#f8fafc', 
    border: '#64748b', 
    text: '#475569',
    icon: 'ℹ️'
  }
}

// =============================================================================
// GAP TYPE LABELS
// =============================================================================

const GAP_TYPE_LABELS = {
  [GapType.BLIND_SPOT]: { icon: '👁️', label: 'Blind Spot', description: 'Documented but not discovered' },
  [GapType.ORPHAN]: { icon: '👻', label: 'Orphan Device', description: 'Discovered but not documented' },
  [GapType.STALE_DATA]: { icon: '⏰', label: 'Stale Data', description: 'Not seen recently' },
  [GapType.MISSING_FUNCTION]: { icon: '❌', label: 'Missing Function', description: 'Expected capability not present' },
  [GapType.INSUFFICIENT_COVERAGE]: { icon: '📉', label: 'Insufficient Coverage', description: 'Not enough devices for function' },
  [GapType.NO_REDUNDANCY]: { icon: '⚠️', label: 'No Redundancy', description: 'Single point of failure' },
  [GapType.NO_VISIBILITY]: { icon: '🚫', label: 'No Visibility', description: 'Unit has no discovery data' },
  [GapType.LOW_VISIBILITY]: { icon: '🔅', label: 'Low Visibility', description: 'Low discovery coverage' },
  [GapType.NETWORK_BLIND_SPOT]: { icon: '🌐', label: 'Network Blind Spot', description: 'Subnet without discovery' }
}

// =============================================================================
// SUMMARY CARDS
// =============================================================================

function GapSummaryCards({ summary }) {
  if (!summary) return null
  
  const cards = [
    { 
      label: 'Critical', 
      count: summary.critical, 
      color: SEVERITY_STYLES[GapSeverity.CRITICAL].text,
      bg: SEVERITY_STYLES[GapSeverity.CRITICAL].bg 
    },
    { 
      label: 'High', 
      count: summary.high, 
      color: SEVERITY_STYLES[GapSeverity.HIGH].text,
      bg: SEVERITY_STYLES[GapSeverity.HIGH].bg 
    },
    { 
      label: 'Medium', 
      count: summary.medium, 
      color: SEVERITY_STYLES[GapSeverity.MEDIUM].text,
      bg: SEVERITY_STYLES[GapSeverity.MEDIUM].bg 
    },
    { 
      label: 'Low', 
      count: summary.low, 
      color: SEVERITY_STYLES[GapSeverity.LOW].text,
      bg: SEVERITY_STYLES[GapSeverity.LOW].bg 
    }
  ]
  
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
      gap: '0.75rem',
      marginBottom: '1.5rem'
    }}>
      {cards.map(card => (
        <div key={card.label} style={{
          padding: '1rem',
          background: card.bg,
          borderRadius: '0.5rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: card.color }}>
            {card.count}
          </div>
          <div style={{ fontSize: '0.75rem', color: card.color, fontWeight: '500' }}>
            {card.label}
          </div>
        </div>
      ))}
    </div>
  )
}

// =============================================================================
// GAP TYPE BREAKDOWN
// =============================================================================

function GapTypeBreakdown({ byType }) {
  if (!byType) return null
  
  const types = [
    { type: 'blindSpots', ...GAP_TYPE_LABELS[GapType.BLIND_SPOT], count: byType.blindSpots },
    { type: 'orphans', ...GAP_TYPE_LABELS[GapType.ORPHAN], count: byType.orphans },
    { type: 'missingFunctions', ...GAP_TYPE_LABELS[GapType.MISSING_FUNCTION], count: byType.missingFunctions },
    { type: 'insufficientCoverage', ...GAP_TYPE_LABELS[GapType.INSUFFICIENT_COVERAGE], count: byType.insufficientCoverage },
    { type: 'noVisibility', ...GAP_TYPE_LABELS[GapType.NO_VISIBILITY], count: byType.noVisibility },
    { type: 'staleData', ...GAP_TYPE_LABELS[GapType.STALE_DATA], count: byType.staleData }
  ].filter(t => t.count > 0)
  
  if (types.length === 0) return null
  
  return (
    <div style={{
      padding: '1.25rem',
      background: 'white',
      borderRadius: '0.75rem',
      border: '1px solid #e2e8f0',
      marginBottom: '1rem'
    }}>
      <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: '600', color: '#0f172a' }}>
        Gap Types Found
      </h4>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {types.map(t => (
          <div key={t.type} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            background: '#f8fafc',
            borderRadius: '0.375rem'
          }}>
            <span style={{ fontSize: '1rem' }}>{t.icon}</span>
            <span style={{ fontSize: '0.8rem', color: '#475569' }}>{t.label}</span>
            <span style={{ 
              fontSize: '0.75rem', 
              fontWeight: '700', 
              color: '#0f172a',
              background: '#e2e8f0',
              padding: '0.125rem 0.375rem',
              borderRadius: '0.25rem'
            }}>
              {t.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// SINGLE GAP CARD
// =============================================================================

function GapCard({ gap, onExpand, isExpanded }) {
  const style = SEVERITY_STYLES[gap.severity] || SEVERITY_STYLES[GapSeverity.INFO]
  const typeInfo = GAP_TYPE_LABELS[gap.type] || { icon: '•', label: gap.type }
  
  return (
    <div style={{
      padding: '1rem',
      background: style.bg,
      borderLeft: `4px solid ${style.border}`,
      borderRadius: '0.5rem',
      marginBottom: '0.5rem'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1rem' }}>{typeInfo.icon}</span>
          <span style={{ 
            fontSize: '0.7rem', 
            padding: '0.125rem 0.375rem',
            background: style.border,
            color: 'white',
            borderRadius: '0.25rem',
            fontWeight: '600'
          }}>
            {gap.severity.toUpperCase()}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {typeInfo.label}
          </span>
        </div>
        
        {gap.tagId && (
          <span style={{ 
            fontFamily: 'monospace', 
            fontSize: '0.8rem', 
            fontWeight: '600',
            color: '#0f172a'
          }}>
            {gap.tagId}
          </span>
        )}
      </div>
      
      <div style={{ fontSize: '0.875rem', color: '#0f172a', marginBottom: '0.5rem' }}>
        {gap.reason}
      </div>
      
      {gap.unit && (
        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>
          📍 Unit: {gap.unit}
        </div>
      )}
      
      {gap.recommendation && (
        <div style={{ 
          fontSize: '0.75rem', 
          color: style.text,
          marginTop: '0.5rem',
          paddingTop: '0.5rem',
          borderTop: `1px dashed ${style.border}40`
        }}>
          → <strong>Action:</strong> {gap.recommendation}
        </div>
      )}
      
      {isExpanded && gap.possibleCauses && (
        <div style={{ marginTop: '0.75rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#475569', marginBottom: '0.25rem' }}>
            Possible Causes:
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.75rem', color: '#64748b' }}>
            {gap.possibleCauses.map((cause, i) => (
              <li key={i}>{cause}</li>
            ))}
          </ul>
        </div>
      )}
      
      {gap.possibleCauses && (
        <button
          onClick={() => onExpand?.(gap)}
          style={{
            marginTop: '0.5rem',
            background: 'none',
            border: 'none',
            color: style.text,
            cursor: 'pointer',
            fontSize: '0.7rem',
            padding: 0
          }}
        >
          {isExpanded ? '▲ Show less' : '▼ Show possible causes'}
        </button>
      )}
    </div>
  )
}

// =============================================================================
// GAPS LIST
// =============================================================================

function GapsList({ gaps, title, maxItems = 10 }) {
  const [expanded, setExpanded] = useState({})
  const [showAll, setShowAll] = useState(false)
  
  if (!gaps || gaps.length === 0) return null
  
  const displayedGaps = showAll ? gaps : gaps.slice(0, maxItems)
  
  return (
    <div style={{
      padding: '1.25rem',
      background: 'white',
      borderRadius: '0.75rem',
      border: '1px solid #e2e8f0',
      marginBottom: '1rem'
    }}>
      <h4 style={{ 
        margin: '0 0 1rem 0', 
        fontSize: '0.9rem', 
        fontWeight: '600', 
        color: '#0f172a',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {title}
        <span style={{ 
          fontSize: '0.75rem', 
          fontWeight: '400', 
          color: '#64748b' 
        }}>
          {gaps.length} total
        </span>
      </h4>
      
      {displayedGaps.map((gap, idx) => (
        <GapCard
          key={gap.tagId || idx}
          gap={gap}
          isExpanded={expanded[idx]}
          onExpand={() => setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }))}
        />
      ))}
      
      {gaps.length > maxItems && (
        <button
          onClick={() => setShowAll(!showAll)}
          style={{
            width: '100%',
            padding: '0.5rem',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '0.375rem',
            color: '#64748b',
            cursor: 'pointer',
            fontSize: '0.8rem',
            marginTop: '0.5rem'
          }}
        >
          {showAll ? `Show less` : `Show ${gaps.length - maxItems} more`}
        </button>
      )}
    </div>
  )
}

// =============================================================================
// TOP RECOMMENDATIONS
// =============================================================================

function TopRecommendations({ recommendations }) {
  if (!recommendations || recommendations.length === 0) return null
  
  return (
    <div style={{
      padding: '1.25rem',
      background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
      borderRadius: '0.75rem',
      border: '2px solid #3b82f6',
      marginBottom: '1rem'
    }}>
      <h4 style={{ 
        margin: '0 0 1rem 0', 
        fontSize: '0.9rem', 
        fontWeight: '600', 
        color: '#1e40af',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        🎯 Priority Actions
      </h4>
      
      {recommendations.map((rec, idx) => (
        <div key={idx} style={{
          padding: '0.75rem',
          background: 'white',
          borderRadius: '0.5rem',
          marginBottom: idx < recommendations.length - 1 ? '0.5rem' : 0
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            marginBottom: '0.25rem'
          }}>
            <span style={{
              fontSize: '0.65rem',
              padding: '0.125rem 0.375rem',
              background: rec.priority === 'critical' ? '#dc2626' : 
                         rec.priority === 'high' ? '#f97316' : '#eab308',
              color: 'white',
              borderRadius: '0.25rem',
              fontWeight: '600',
              textTransform: 'uppercase'
            }}>
              {rec.priority}
            </span>
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0f172a' }}>
              {rec.title}
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            {rec.description}
          </div>
        </div>
      ))}
    </div>
  )
}

// =============================================================================
// AFFECTED UNITS
// =============================================================================

function AffectedUnits({ units }) {
  if (!units || units.length === 0) return null
  
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ 
        fontSize: '0.75rem', 
        fontWeight: '600', 
        color: '#64748b', 
        marginBottom: '0.5rem' 
      }}>
        Affected Units:
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {units.map(unit => (
          <span key={unit} style={{
            fontSize: '0.75rem',
            padding: '0.25rem 0.5rem',
            background: '#fef2f2',
            color: '#dc2626',
            borderRadius: '0.25rem',
            fontWeight: '500'
          }}>
            {unit}
          </span>
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// MAIN GAP PANEL COMPONENT
// =============================================================================

export default function GapPanel({ gapAnalysis }) {
  const [activeTab, setActiveTab] = useState('all')
  
  if (!gapAnalysis) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#64748b'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
        <div>No gap analysis available. Process your data to identify gaps.</div>
      </div>
    )
  }
  
  const { gaps, assetGaps, functionalGaps, coverageGaps, summary } = gapAnalysis
  
  return (
    <div style={{
      background: 'linear-gradient(135deg, #fef9f0 0%, #fff7ed 50%, #fef2f2 100%)',
      border: '2px solid #f97316',
      borderRadius: '0.75rem',
      padding: '1.5rem',
      marginBottom: '2rem'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1rem'
      }}>
        <div>
          <h3 style={{ 
            margin: '0', 
            fontSize: '1.25rem', 
            fontWeight: '700', 
            color: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            🔍 Gap Analysis
          </h3>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#64748b' }}>
            Identifying what's missing, undocumented, or unmonitored
          </p>
        </div>
        
        <div style={{
          padding: '0.5rem 1rem',
          background: summary.critical > 0 ? '#dc2626' : 
                     summary.high > 0 ? '#f97316' : '#22c55e',
          color: 'white',
          borderRadius: '0.5rem',
          fontWeight: '700',
          fontSize: '1.25rem'
        }}>
          {summary.total}
        </div>
      </div>
      
      <GapSummaryCards summary={summary} />
      
      <TopRecommendations recommendations={summary.topRecommendations} />
      
      <AffectedUnits units={summary.affectedUnits} />
      
      <GapTypeBreakdown byType={summary.byType} />
      
      {/* Tab navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginBottom: '1rem',
        borderBottom: '2px solid #e2e8f0',
        paddingBottom: '0.5rem'
      }}>
        {[
          { id: 'all', label: `All Gaps (${gaps.length})` },
          { id: 'asset', label: `Asset (${assetGaps.length})` },
          { id: 'functional', label: `Functional (${functionalGaps.length})` },
          { id: 'coverage', label: `Coverage (${coverageGaps.length})` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.5rem 1rem',
              background: activeTab === tab.id ? '#0f172a' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#64748b',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '0.8rem'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Tab content */}
      {activeTab === 'all' && (
        <GapsList 
          gaps={gaps.filter(g => g.severity === 'critical' || g.severity === 'high')} 
          title="Critical & High Priority Gaps" 
        />
      )}
      
      {activeTab === 'asset' && (
        <>
          <GapsList 
            gaps={assetGaps.filter(g => g.type === GapType.ORPHAN)} 
            title="👻 Orphan Devices (Undocumented)" 
          />
          <GapsList 
            gaps={assetGaps.filter(g => g.type === GapType.BLIND_SPOT)} 
            title="👁️ Blind Spots (Not Discovered)" 
          />
        </>
      )}
      
      {activeTab === 'functional' && (
        <GapsList 
          gaps={functionalGaps} 
          title="Functional Gaps by Unit" 
        />
      )}
      
      {activeTab === 'coverage' && (
        <GapsList 
          gaps={coverageGaps} 
          title="Discovery Coverage Gaps" 
        />
      )}
    </div>
  )
}
