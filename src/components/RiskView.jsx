/**
 * RISK VIEW COMPONENT
 * Closure-priority ranking layered on the canonical inventory.
 *
 * Visual language follows the Tesla-minimal pattern used by InventoryHeader,
 * LayeredTopology, and DoctrineCrosswalk: dark surface, hairline borders,
 * tabular numerals, a single accent per role.
 */

import React, { useState } from 'react'
import { RiskLevel } from '../lib/context/risk-engine.js'

const TONE = {
  positive: '#22c55e',
  attention: '#f59e0b',
  alert: '#ef4444',
  orphan: '#a855f7',
  text: '#f8fafc',
  textDim: '#cbd5e1',
  textMuted: '#94a3b8',
  textFaint: '#64748b',
  surface: '#0f172a',
  surfaceDeep: '#0b1220',
  hairline: '#1e293b',
  background: '#020617'
}

const SYS_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

// Map risk-engine level colors (light-theme defaults) to our dark-mode palette.
function levelTone(level) {
  if (!level) return TONE.textMuted
  const id = String(level.label || level.id || '').toLowerCase()
  if (id.includes('critical')) return TONE.alert
  if (id.includes('high')) return TONE.attention
  if (id.includes('medium')) return '#facc15'
  if (id.includes('low')) return TONE.positive
  return TONE.textMuted
}

function PanelCard({ title, children, primer }) {
  return (
    <div style={{
      border: `1px solid ${TONE.hairline}`,
      borderRadius: '0.5rem',
      background: TONE.surface,
      padding: '0.85rem 1rem',
      fontFamily: SYS_FONT
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: '0.5rem',
        marginBottom: '0.7rem'
      }}>
        <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: TONE.text, letterSpacing: '-0.01em' }}>
          {title}
        </h4>
        {primer && (
          <span style={{ fontSize: '0.7rem', color: TONE.textMuted }}>
            {primer}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

function RiskBadge({ score, level, size = 'medium' }) {
  const sizes = {
    small: { width: '2.1rem', height: '2.1rem', fontSize: '0.75rem' },
    medium: { width: '2.6rem', height: '2.6rem', fontSize: '0.9rem' },
    large: { width: '3.4rem', height: '3.4rem', fontSize: '1.15rem' }
  }
  const sizeStyle = sizes[size] || sizes.medium
  const tone = levelTone(level)
  return (
    <div style={{
      ...sizeStyle,
      borderRadius: '50%',
      background: 'transparent',
      border: `1.5px solid ${tone}`,
      color: tone,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 700,
      fontFamily: SYS_FONT,
      fontVariantNumeric: 'tabular-nums'
    }}>
      {score}
    </div>
  )
}

function RiskDistribution({ distribution, total }) {
  const bars = [
    { label: 'Critical', count: distribution.critical, tone: TONE.alert },
    { label: 'High', count: distribution.high, tone: TONE.attention },
    { label: 'Medium', count: distribution.medium, tone: '#facc15' },
    { label: 'Low', count: distribution.low, tone: TONE.positive }
  ]
  const maxCount = Math.max(...bars.map(b => b.count), 1)

  return (
    <PanelCard title="Risk distribution" primer={`${total.toLocaleString()} assets analyzed`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
        {bars.map(bar => (
          <div key={bar.label} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '64px', fontSize: '0.75rem', color: TONE.textDim }}>
              {bar.label}
            </div>
            <div style={{
              flex: 1,
              height: '0.85rem',
              background: TONE.hairline,
              borderRadius: '0.2rem',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${(bar.count / maxCount) * 100}%`,
                height: '100%',
                background: bar.tone,
                minWidth: bar.count > 0 ? '3px' : 0
              }} />
            </div>
            <div style={{
              width: '48px',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: bar.tone,
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums'
            }}>
              {bar.count.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </PanelCard>
  )
}

function RiskFactorsPanel({ factorFrequency }) {
  if (!factorFrequency || factorFrequency.length === 0) return null
  const topFactors = factorFrequency.slice(0, 6)

  const factorLabels = {
    device_criticality: 'Device criticality',
    safety_related: 'Safety related',
    unit_criticality: 'Unit criticality',
    eol_status: 'Lifecycle / EOL status',
    network_exposure: 'Network exposure',
    internet_reachable: 'Internet reachable',
    undocumented: 'Undocumented device',
    no_discovery: 'No discovery data',
    single_point_of_failure: 'Single point of failure',
    high_downstream_impact: 'High downstream impact'
  }

  return (
    <PanelCard title="Top risk factors" primer="Why assets are scoring up">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {topFactors.map(f => (
          <div key={f.factor} style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '0.6rem',
            padding: '0.35rem 0',
            borderBottom: `1px solid ${TONE.hairline}`
          }}>
            <span style={{ flex: 1, fontSize: '0.78rem', color: TONE.textDim }}>
              {factorLabels[f.factor] || f.factor}
            </span>
            <span style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: TONE.text,
              fontVariantNumeric: 'tabular-nums'
            }}>
              {f.count.toLocaleString()}
            </span>
            <span style={{ fontSize: '0.7rem', color: TONE.textMuted }}>
              assets
            </span>
          </div>
        ))}
      </div>
    </PanelCard>
  )
}

function TopRisksTable({ topRisks, onAssetClick }) {
  if (!topRisks || topRisks.length === 0) return null

  return (
    <PanelCard title="Highest risk assets" primer="Click a row for the evidence trail">
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.78rem',
          fontFamily: SYS_FONT
        }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${TONE.hairline}` }}>
              {['Score', 'Asset', 'Unit', 'Type', 'Top factors'].map(h => (
                <th key={h} style={{
                  padding: '0.45rem 0.5rem',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: TONE.textMuted,
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topRisks.slice(0, 10).map(({ asset, risk }, idx) => (
              <tr
                key={risk.assetId || idx}
                onClick={() => onAssetClick?.(asset)}
                style={{
                  borderBottom: `1px solid ${TONE.hairline}`,
                  cursor: onAssetClick ? 'pointer' : 'default',
                  transition: 'background 120ms ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = TONE.surfaceDeep }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <td style={{ padding: '0.5rem' }}>
                  <RiskBadge score={risk.normalizedScore} level={risk.riskLevel} size="small" />
                </td>
                <td style={{
                  padding: '0.5rem',
                  color: TONE.text,
                  fontWeight: 600,
                  fontFamily: 'monospace',
                  fontSize: '0.75rem'
                }}>
                  {asset.tag_id || asset.asset_id || 'Unknown'}
                </td>
                <td style={{ padding: '0.5rem', color: TONE.textDim }}>
                  {asset.unit || asset.area || '—'}
                </td>
                <td style={{ padding: '0.5rem', color: TONE.textDim }}>
                  {asset.device_type || risk.context?.deviceContext?.type || '—'}
                </td>
                <td style={{ padding: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                    {risk.topFactors?.slice(0, 2).map((f, i) => (
                      <span key={i} style={{
                        fontSize: '0.68rem',
                        padding: '0.12rem 0.45rem',
                        border: `1px solid ${TONE.alert}55`,
                        background: 'transparent',
                        color: TONE.alert,
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
    </PanelCard>
  )
}

function UnitRiskSummary({ unitRisks }) {
  if (!unitRisks || unitRisks.length === 0) return null
  return (
    <PanelCard title="Risk by unit" primer="Average score and critical / high counts per process unit">
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '0.55rem'
      }}>
        {unitRisks.slice(0, 8).map(unit => {
          const tone = levelTone(unit.riskLevel)
          return (
            <div key={unit.unit} style={{
              padding: '0.65rem 0.7rem',
              background: TONE.surfaceDeep,
              border: `1px solid ${TONE.hairline}`,
              borderLeft: `2px solid ${tone}`,
              borderRadius: '0.4rem'
            }}>
              <div style={{
                fontWeight: 600,
                fontSize: '0.82rem',
                color: TONE.text,
                marginBottom: '0.3rem'
              }}>
                {unit.unit}
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline'
              }}>
                <span style={{ fontSize: '0.72rem', color: TONE.textMuted }}>
                  {unit.assets.toLocaleString()} assets
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  color: tone,
                  fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  avg {unit.averageScore}
                </span>
              </div>
              {(unit.criticalCount > 0 || unit.highCount > 0) && (
                <div style={{ marginTop: '0.4rem', fontSize: '0.7rem', color: TONE.textDim }}>
                  {unit.criticalCount > 0 && (
                    <span style={{ color: TONE.alert, fontWeight: 600 }}>
                      {unit.criticalCount} critical
                    </span>
                  )}
                  {unit.criticalCount > 0 && unit.highCount > 0 && (
                    <span style={{ color: TONE.hairline, margin: '0 0.3rem' }}>·</span>
                  )}
                  {unit.highCount > 0 && (
                    <span style={{ color: TONE.attention, fontWeight: 600 }}>
                      {unit.highCount} high
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </PanelCard>
  )
}

function RecommendationsPanel({ recommendations }) {
  if (!recommendations || recommendations.length === 0) return null

  const priorityTone = {
    critical: TONE.alert,
    high: TONE.attention,
    medium: '#facc15'
  }

  return (
    <PanelCard title="Recommended actions" primer="Sequenced by priority">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
        {recommendations.map((rec, idx) => {
          const tone = priorityTone[rec.priority] || TONE.textMuted
          return (
            <div key={idx} style={{
              padding: '0.7rem 0.85rem',
              background: TONE.surfaceDeep,
              border: `1px solid ${TONE.hairline}`,
              borderLeft: `2px solid ${tone}`,
              borderRadius: '0.4rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: '0.5rem',
                marginBottom: '0.3rem'
              }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: TONE.text }}>
                  {rec.title}
                </div>
                <span style={{
                  fontSize: '0.65rem',
                  color: tone,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: 700
                }}>
                  {rec.priority || 'note'}
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: TONE.textDim, lineHeight: 1.5, marginBottom: '0.45rem' }}>
                {rec.description}
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: TONE.text,
                fontWeight: 500
              }}>
                <span style={{ color: TONE.textMuted, marginRight: '0.3rem' }}>Action</span>
                {rec.action}
              </div>
              {rec.assets && rec.assets.length > 0 && (
                <div style={{
                  marginTop: '0.45rem',
                  fontSize: '0.7rem',
                  color: TONE.textMuted,
                  fontFamily: 'monospace'
                }}>
                  Affected: {rec.assets.join(', ')}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </PanelCard>
  )
}

export default function RiskView({ riskAnalysis, onAssetClick }) {
  const [activeTab, setActiveTab] = useState('overview')

  if (!riskAnalysis) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: TONE.textMuted,
        background: TONE.background,
        height: '100%',
        fontFamily: SYS_FONT
      }}>
        No risk analysis available. Process your data to see risk insights.
      </div>
    )
  }

  const { summary } = riskAnalysis
  const avgScore = summary.averageRiskScore || 0
  const avgTone = avgScore >= 50 ? TONE.alert : avgScore >= 30 ? TONE.attention : TONE.positive

  return (
    <div style={{
      padding: '1.25rem 1.5rem',
      overflow: 'auto',
      height: '100%',
      background: TONE.background,
      fontFamily: SYS_FONT,
      color: TONE.text
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '1rem',
        marginBottom: '1.1rem',
        flexWrap: 'wrap'
      }}>
        <div>
          <h3 style={{
            margin: 0,
            fontSize: '1.05rem',
            fontWeight: 600,
            color: TONE.text,
            letterSpacing: '-0.01em'
          }}>
            Risk rollup
          </h3>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.8rem', color: TONE.textMuted, lineHeight: 1.5 }}>
            Closure-priority ranking from device, location, lifecycle, and exposure context.
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: '0.7rem',
            color: TONE.textMuted,
            marginBottom: '0.2rem'
          }}>
            Portfolio risk
          </div>
          <div style={{
            fontSize: '2.1rem',
            lineHeight: 1,
            fontWeight: 600,
            color: avgTone,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em'
          }}>
            {avgScore}
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        gap: '0.4rem',
        marginBottom: '1rem',
        borderBottom: `1px solid ${TONE.hairline}`,
        paddingBottom: '0.5rem',
        flexWrap: 'wrap'
      }}>
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'assets', label: 'Top risks' },
          { id: 'units', label: 'By unit' },
          { id: 'actions', label: 'Actions' }
        ].map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.4rem 0.8rem',
                background: 'transparent',
                color: isActive ? TONE.text : TONE.textMuted,
                border: 'none',
                borderBottom: `1px solid ${isActive ? TONE.text : 'transparent'}`,
                cursor: 'pointer',
                fontWeight: isActive ? 600 : 400,
                fontSize: '0.78rem',
                fontFamily: SYS_FONT
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'overview' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '0.75rem'
        }}>
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
