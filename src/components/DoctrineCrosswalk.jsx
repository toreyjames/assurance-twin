import React, { useMemo } from 'react'
import { evaluateDoctrine } from '../lib/core/transportation-doctrine.js'
import { evaluateReferenceModel } from '../lib/core/transportation-reference-model.js'
import { evaluateTransportationMissions } from '../lib/core/transportation-mission-capability.js'

const TONE = {
  positive: '#22c55e',
  attention: '#f59e0b',
  alert: '#ef4444',
  orphan: '#a855f7',
  text: '#f8fafc',
  textDim: '#94a3b8',
  textMuted: '#64748b',
  surface: '#0f172a',
  hairline: '#1e293b',
  background: '#020617'
}

const SYS_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

const STATUS_LABELS = {
  confirmed: 'Confirmed by evidence',
  partial: 'Partially supported',
  unobserved: 'Declared but unobserved',
  contradicted: 'Contradicted by evidence',
  unknown: 'Undeterminable'
}

const SOURCE_LABELS = {
  programmatic: 'Agency doctrine',
  regulatory: 'Federal regulation',
  engineering: 'Engineering standard',
  cybersecurity: 'Cyber doctrine'
}

function statusTone(status) {
  switch (status) {
    case 'confirmed': return TONE.positive
    case 'partial': return TONE.attention
    case 'unobserved': return TONE.alert
    case 'contradicted': return TONE.orphan
    default: return TONE.textMuted
  }
}

function normalizeAssets(result) {
  return [
    ...(result?.assets || []).map(asset => ({ ...asset })),
    ...(result?.blindSpots || []).map(asset => ({ ...asset, _status: 'blind_spot' })),
    ...(result?.orphans || []).map(asset => ({ ...asset, _status: 'orphan' }))
  ]
}

function ClaimCard({ claim, onDrillDown }) {
  const tone = statusTone(claim.status)
  return (
    <div
      style={{
        border: `1px solid ${TONE.hairline}`,
        borderLeft: `3px solid ${tone}`,
        borderRadius: '0.5rem',
        padding: '0.85rem 1rem',
        fontFamily: SYS_FONT,
        color: TONE.text
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
        <span style={{ fontSize: '0.7rem', color: TONE.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {SOURCE_LABELS[claim.sourceType] || claim.sourceType}
        </span>
        <span style={{ fontSize: '0.78rem', color: tone, fontWeight: 600 }}>
          {STATUS_LABELS[claim.status] || claim.status}
        </span>
      </div>

      <div style={{ fontSize: '0.78rem', color: TONE.text, lineHeight: 1.5, marginBottom: '0.35rem' }}>
        <span style={{ color: TONE.textDim }}>Declared</span> · {claim.declared}
      </div>

      <div style={{ fontSize: '0.74rem', color: TONE.textDim, lineHeight: 1.5, marginBottom: '0.25rem' }}>
        <span style={{ color: TONE.textMuted }}>Evidence:</span> {claim.evidence}
      </div>

      <div style={{ fontSize: '0.74rem', color: TONE.textDim, lineHeight: 1.5, marginBottom: '0.55rem' }}>
        <span style={{ color: TONE.textMuted }}>Gap:</span> {claim.gap}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.65rem', flexWrap: 'wrap', fontSize: '0.7rem' }}>
        <span style={{ color: TONE.textMuted }}>Source: {claim.source}</span>
        {(claim.requires || []).length > 0 && onDrillDown && (
          <button
            type="button"
            onClick={() => onDrillDown(claim.requires.join(' '))}
            style={{
              background: 'transparent',
              border: `1px solid #334155`,
              borderRadius: '0.3rem',
              padding: '0.25rem 0.6rem',
              color: TONE.textDim,
              fontSize: '0.72rem',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: SYS_FONT
            }}
          >
            Open evidence rows
          </button>
        )}
      </div>
    </div>
  )
}

function SummaryStat({ value, label, tone }) {
  return (
    <div style={{
      border: `1px solid ${TONE.hairline}`,
      borderRadius: '0.4rem',
      padding: '0.55rem 0.7rem',
      minWidth: '110px',
      background: 'transparent'
    }}>
      <div style={{
        fontSize: '1.3rem',
        fontWeight: 600,
        color: tone || TONE.text,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.02em',
        lineHeight: 1
      }}>
        {value}
      </div>
      <div style={{ fontSize: '0.7rem', color: TONE.textMuted, marginTop: '0.25rem' }}>
        {label}
      </div>
    </div>
  )
}

export default function DoctrineCrosswalk({ result, industry, onDrillDown }) {
  const model = useMemo(() => {
    if (industry !== 'transportation') return null
    const assets = normalizeAssets(result)
    const reference = evaluateReferenceModel(assets)
    const missions = evaluateTransportationMissions(assets)
    return evaluateDoctrine({ reference, missions })
  }, [result, industry])

  if (industry !== 'transportation') {
    return (
      <div style={{
        padding: '1.5rem',
        color: TONE.textDim,
        fontSize: '0.85rem',
        fontFamily: SYS_FONT,
        background: TONE.background,
        height: '100%'
      }}>
        Doctrine crosswalk is currently available for the Transportation / DOT profile.
        Other industries will get their own doctrine references in a future iteration.
      </div>
    )
  }

  if (!model) return null

  const grouped = model.claims.reduce((acc, claim) => {
    const key = claim.sourceType
    if (!acc[key]) acc[key] = []
    acc[key].push(claim)
    return acc
  }, {})

  const groupOrder = ['programmatic', 'engineering', 'regulatory', 'cybersecurity']
  const orderedGroups = groupOrder
    .filter(key => grouped[key])
    .map(key => ({ key, label: SOURCE_LABELS[key], claims: grouped[key] }))

  return (
    <div style={{
      padding: '1.25rem 1.5rem',
      overflow: 'auto',
      height: '100%',
      background: TONE.background,
      fontFamily: SYS_FONT
    }}>
      <div style={{ marginBottom: '1.1rem' }}>
        <h3 style={{ margin: 0, color: TONE.text, fontSize: '1.05rem', fontWeight: 600, letterSpacing: '-0.01em' }}>
          Doctrine crosswalk
        </h3>
        <p style={{ margin: '0.3rem 0 0', color: TONE.textDim, fontSize: '0.8rem', lineHeight: 1.5 }}>
          Reads the agency&apos;s published doctrine — ITS architecture, TSMO plan, TIM plan,
          engineering standards, federal regulations, cyber doctrine — and shows where each
          declared capability is supported by current evidence, partially supported, or
          declared but unobserved.
        </p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <SummaryStat value={model.summary.confirmed} label="Confirmed" tone={TONE.positive} />
        <SummaryStat value={model.summary.partial} label="Partial" tone={TONE.attention} />
        <SummaryStat value={model.summary.unobserved} label="Unobserved" tone={TONE.alert} />
        {model.summary.contradicted > 0 && (
          <SummaryStat value={model.summary.contradicted} label="Contradicted" tone={TONE.orphan} />
        )}
        {model.summary.unknown > 0 && (
          <SummaryStat value={model.summary.unknown} label="Undeterminable" tone={TONE.textMuted} />
        )}
      </div>

      <div style={{
        marginBottom: '1.1rem',
        fontSize: '0.74rem',
        color: TONE.textDim,
        lineHeight: 1.55,
        border: `1px solid ${TONE.hairline}`,
        borderRadius: '0.45rem',
        padding: '0.6rem 0.8rem'
      }}>
        {model.summary.statement}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {orderedGroups.map(group => (
          <div key={group.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{
              fontSize: '0.72rem',
              color: TONE.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontWeight: 600
            }}>
              {group.label}
            </div>
            {group.claims.map(claim => (
              <ClaimCard key={claim.id} claim={claim} onDrillDown={onDrillDown} />
            ))}
          </div>
        ))}
      </div>

      <p style={{ marginTop: '1rem', fontSize: '0.7rem', color: TONE.textMuted, lineHeight: 1.5 }}>
        Doctrine references are illustrative and drawn from the kinds of public documents
        every state DOT maintains. For an actual engagement, the crosswalk would be wired
        to the specific agency&apos;s published Statewide ITS Architecture, TSMO Implementation
        Plan, TIM Strategic Plan, Cybersecurity Master Plan, and applicable federal-aid
        instruments.
      </p>
    </div>
  )
}
