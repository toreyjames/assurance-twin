/**
 * RISK VIEW COMPONENT
 * Displays context-aware risk analysis for the Context tier
 * 
 * Shows risk distribution, top risks, and actionable recommendations
 */

import React, { useState, useMemo } from 'react'
import { RiskLevel } from '../lib/context/risk-engine.js'

// =============================================================================
// RISK SCORE BADGE
// =============================================================================

function RiskBadge({ score, level, size = 'medium' }) {
  const sizes = {
    small: { width: '2rem', height: '2rem', fontSize: '0.75rem' },
    medium: { width: '3rem', height: '3rem', fontSize: '1rem' },
    large: { width: '4rem', height: '4rem', fontSize: '1.25rem' }
  }
  
  const sizeStyle = sizes[size] || sizes.medium
  
  return (
    <div style={{
      ...sizeStyle,
      borderRadius: '50%',
      background: level.color,
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: '700',
      boxShadow: `0 2px 4px ${level.color}40`
    }}>
      {score}
    </div>
  )
}

// =============================================================================
// RISK DISTRIBUTION CHART
// =============================================================================

function RiskDistribution({ distribution, total }) {
  const bars = [
    { label: 'Critical', count: distribution.critical, color: RiskLevel.CRITICAL.color },
    { label: 'High', count: distribution.high, color: RiskLevel.HIGH.color },
    { label: 'Medium', count: distribution.medium, color: RiskLevel.MEDIUM.color },
    { label: 'Low', count: distribution.low, color: RiskLevel.LOW.color }
  ]
  
  const maxCount = Math.max(...bars.map(b => b.count), 1)
  
  return (
    <div style={{
      padding: '1.25rem',
      background: 'white',
      borderRadius: '0.75rem',
      border: '1px solid #e2e8f0'
    }}>
      <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: '600', color: '#0f172a' }}>
        Risk Distribution
      </h4>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {bars.map(bar => (
          <div key={bar.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '60px', fontSize: '0.8rem', fontWeight: '500', color: '#475569' }}>
              {bar.label}
            </div>
            <div style={{ flex: 1, height: '1.5rem', background: '#f1f5f9', borderRadius: '0.375rem', overflow: 'hidden' }}>
              <div style={{
                width: `${(bar.count / maxCount) * 100}%`,
                height: '100%',
                background: bar.color,
                transition: 'width 0.3s ease',
                minWidth: bar.count > 0 ? '4px' : 0
              }} />
            </div>
            <div style={{ width: '50px', fontSize: '0.875rem', fontWeight: '600', color: bar.color, textAlign: 'right' }}>
              {bar.count}
            </div>
          </div>
        ))}
      </div>
      
      <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
          <span style={{ color: '#64748b' }}>Total assets analyzed:</span>
          <span style={{ fontWeight: '600', color: '#0f172a' }}>{total}</span>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// RISK FACTORS BREAKDOWN
// =============================================================================

function RiskFactorsPanel({ factorFrequency }) {
  if (!factorFrequency || factorFrequency.length === 0) return null
  
  const topFactors = factorFrequency.slice(0, 6)
  
  const factorLabels = {
    device_criticality: { icon: '⚙️', label: 'Device Criticality' },
    safety_related: { icon: '🛡️', label: 'Safety Related' },
    unit_criticality: { icon: '🏭', label: 'Unit Criticality' },
    eol_status: { icon: '📅', label: 'Lifecycle/EOL Status' },
    network_exposure: { icon: '🌐', label: 'Network Exposure' },
    internet_reachable: { icon: '☁️', label: 'Internet Reachable' },
    undocumented: { icon: '👻', label: 'Undocumented Device' },
    no_discovery: { icon: '🔍', label: 'No Discovery Data' },
    single_point_of_failure: { icon: '⚠️', label: 'Single Point of Failure' },
    high_downstream_impact: { icon: '📊', label: 'High Downstream Impact' }
  }
  
  return (
    <div style={{
      padding: '1.25rem',
      background: 'white',
      borderRadius: '0.75rem',
      border: '1px solid #e2e8f0'
    }}>
      <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: '600', color: '#0f172a' }}>
        Top Risk Factors
      </h4>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {topFactors.map(f => {
          const info = factorLabels[f.factor] || { icon: '•', label: f.factor }
          return (
            <div key={f.factor} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem',
              background: '#f8fafc',
              borderRadius: '0.375rem'
            }}>
              <span style={{ fontSize: '1rem' }}>{info.icon}</span>
              <span style={{ flex: 1, fontSize: '0.8rem', color: '#475569' }}>{info.label}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#0f172a' }}>
                {f.count} assets
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// =============================================================================
// TOP RISKS TABLE
// =============================================================================

function TopRisksTable({ topRisks, onAssetClick }) {
  if (!topRisks || topRisks.length === 0) return null
  
  return (
    <div style={{
      padding: '1.25rem',
      background: 'white',
      borderRadius: '0.75rem',
      border: '1px solid #e2e8f0'
    }}>
      <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: '600', color: '#0f172a' }}>
        Highest Risk Assets
      </h4>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '600', color: '#64748b' }}>Score</th>
              <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '600', color: '#64748b' }}>Asset</th>
              <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '600', color: '#64748b' }}>Unit</th>
              <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '600', color: '#64748b' }}>Type</th>
              <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '600', color: '#64748b' }}>Top Factors</th>
            </tr>
          </thead>
          <tbody>
            {topRisks.slice(0, 10).map(({ asset, risk }, idx) => (
              <tr 
                key={risk.assetId || idx}
                onClick={() => onAssetClick?.(asset)}
                style={{ 
                  borderBottom: '1px solid #f1f5f9',
                  cursor: onAssetClick ? 'pointer' : 'default',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
              >
                <td style={{ padding: '0.5rem' }}>
                  <RiskBadge score={risk.normalizedScore} level={risk.riskLevel} size="small" />
                </td>
                <td style={{ padding: '0.5rem', fontFamily: 'monospace', fontWeight: '600' }}>
                  {asset.tag_id || asset.asset_id || 'Unknown'}
                </td>
                <td style={{ padding: '0.5rem', color: '#64748b' }}>
                  {asset.unit || asset.area || '-'}
                </td>
                <td style={{ padding: '0.5rem', color: '#64748b' }}>
                  {asset.device_type || risk.context?.deviceContext?.type || '-'}
                </td>
                <td style={{ padding: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                    {risk.topFactors?.slice(0, 2).map((f, i) => (
                      <span key={i} style={{
                        fontSize: '0.65rem',
                        padding: '0.125rem 0.375rem',
                        background: '#fee2e2',
                        color: '#dc2626',
                        borderRadius: '0.25rem'
                      }}>
                        {f.description.split(':')[0]}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// =============================================================================
// UNIT RISK SUMMARY
// =============================================================================

function UnitRiskSummary({ unitRisks }) {
  if (!unitRisks || unitRisks.length === 0) return null
  
  return (
    <div style={{
      padding: '1.25rem',
      background: 'white',
      borderRadius: '0.75rem',
      border: '1px solid #e2e8f0'
    }}>
      <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: '600', color: '#0f172a' }}>
        Risk by Process Unit
      </h4>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
        {unitRisks.slice(0, 8).map(unit => (
          <div key={unit.unit} style={{
            padding: '0.75rem',
            background: `${unit.riskLevel.color}08`,
            border: `1px solid ${unit.riskLevel.color}30`,
            borderRadius: '0.5rem'
          }}>
            <div style={{ 
              fontWeight: '600', 
              fontSize: '0.85rem', 
              color: '#0f172a',
              marginBottom: '0.25rem'
            }}>
              {unit.unit}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {unit.assets} assets
              </span>
              <span style={{
                fontSize: '0.7rem',
                padding: '0.125rem 0.375rem',
                background: unit.riskLevel.color,
                color: 'white',
                borderRadius: '0.25rem',
                fontWeight: '600'
              }}>
                Avg: {unit.averageScore}
              </span>
            </div>
            {(unit.criticalCount > 0 || unit.highCount > 0) && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#dc2626' }}>
                {unit.criticalCount > 0 && `${unit.criticalCount} critical`}
                {unit.criticalCount > 0 && unit.highCount > 0 && ' • '}
                {unit.highCount > 0 && `${unit.highCount} high`}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// RECOMMENDATIONS PANEL
// =============================================================================

function RecommendationsPanel({ recommendations }) {
  if (!recommendations || recommendations.length === 0) return null
  
  const priorityColors = {
    critical: { bg: '#fef2f2', border: '#ef4444', text: '#dc2626' },
    high: { bg: '#fff7ed', border: '#f97316', text: '#ea580c' },
    medium: { bg: '#fefce8', border: '#eab308', text: '#ca8a04' }
  }
  
  return (
    <div style={{
      padding: '1.25rem',
      background: 'white',
      borderRadius: '0.75rem',
      border: '1px solid #e2e8f0'
    }}>
      <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: '600', color: '#0f172a' }}>
        🎯 Recommended Actions
      </h4>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {recommendations.map((rec, idx) => {
          const colors = priorityColors[rec.priority] || priorityColors.medium
          return (
            <div key={idx} style={{
              padding: '1rem',
              background: colors.bg,
              borderLeft: `4px solid ${colors.border}`,
              borderRadius: '0.5rem'
            }}>
              <div style={{ 
                fontWeight: '600', 
                fontSize: '0.875rem', 
                color: colors.text,
                marginBottom: '0.25rem'
              }}>
                {rec.title}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '0.5rem' }}>
                {rec.description}
              </div>
              <div style={{ 
                fontSize: '0.75rem', 
                color: '#0f172a',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                → {rec.action}
              </div>
              {rec.assets && rec.assets.length > 0 && (
                <div style={{ 
                  marginTop: '0.5rem', 
                  fontSize: '0.7rem', 
                  color: '#64748b',
                  fontFamily: 'monospace'
                }}>
                  Affected: {rec.assets.join(', ')}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// =============================================================================
// MAIN RISK VIEW COMPONENT
// =============================================================================

export default function RiskView({ riskAnalysis, onAssetClick }) {
  const [activeTab, setActiveTab] = useState('overview')
  
  if (!riskAnalysis) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#64748b'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
        <div>No risk analysis available. Process your data to see risk insights.</div>
      </div>
    )
  }
  
  const { summary } = riskAnalysis
  
  return (
    <div style={{
      background: 'linear-gradient(135deg, #fef3f2 0%, #fef9f0 50%, #f0fdf4 100%)',
      border: '2px solid #f97316',
      borderRadius: '0.75rem',
      padding: '1.5rem',
      marginBottom: '2rem'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1.5rem'
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
            🎯 Context-Aware Risk Analysis
          </h3>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#64748b' }}>
            Risk scores based on device, location, lifecycle, and exposure context
          </p>
        </div>
        
        {/* Average risk indicator */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>
            Portfolio Risk
          </div>
          <div style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: summary.averageRiskScore >= 50 ? '#dc2626' : 
                   summary.averageRiskScore >= 30 ? '#f97316' : '#22c55e'
          }}>
            {summary.averageRiskScore}
          </div>
        </div>
      </div>
      
      {/* Tab navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginBottom: '1rem',
        borderBottom: '2px solid #e2e8f0',
        paddingBottom: '0.5rem'
      }}>
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'assets', label: 'Top Risks' },
          { id: 'units', label: 'By Unit' },
          { id: 'actions', label: 'Actions' }
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
              fontSize: '0.875rem'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Tab content */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          <RiskDistribution distribution={summary.riskDistribution} total={summary.totalAssets} />
          <RiskFactorsPanel factorFrequency={summary.factorFrequency} />
        </div>
      )}
      
      {activeTab === 'assets' && (
        <TopRisksTable topRisks={summary.topRisks} onAssetClick={onAssetClick} />
      )}
      
      {activeTab === 'units' && (
        <UnitRiskSummary unitRisks={summary.unitRisks} />
      )}
      
      {activeTab === 'actions' && (
        <RecommendationsPanel recommendations={summary.recommendations} />
      )}
    </div>
  )
}
