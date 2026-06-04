import React, { useMemo } from 'react'
import { evaluateLayeredTopology } from '../lib/core/topology-layers.js'

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

function confidenceTone(status) {
  switch (status) {
    case 'cross_validated':
      return TONE.positive
    case 'supported':
      return TONE.textDim
    case 'sample':
    case 'limited':
      return TONE.attention
    case 'observed_unexpected':
      return TONE.orphan
    case 'expected_missing':
      return TONE.alert
    case 'absent':
    default:
      return TONE.textMuted
  }
}

function normalizeAssets(result) {
  return [
    ...(result?.assets || []).map(asset => ({ ...asset })),
    ...(result?.blindSpots || []).map(asset => ({ ...asset, _status: 'blind_spot' })),
    ...(result?.orphans || []).map(asset => ({ ...asset, _status: 'orphan' }))
  ]
}

function LayerRow({ layer, onDrillDown }) {
  const tone = confidenceTone(layer.confidence.status)
  return (
    <button
      type="button"
      onClick={() => layer.assets > 0 && onDrillDown?.(layer.queryHint)}
      title={layer.assets > 0 ? `Filter the asset table by ${layer.label}` : 'No assets observed in this layer'}
      style={{
        background: 'transparent',
        border: `1px solid ${TONE.hairline}`,
        borderRadius: '0.5rem',
        padding: '0.85rem 1rem',
        textAlign: 'left',
        cursor: layer.assets > 0 ? 'pointer' : 'default',
        fontFamily: SYS_FONT,
        color: TONE.text,
        outline: 'none',
        transition: 'border-color 120ms ease'
      }}
      onMouseEnter={layer.assets > 0 ? (e) => { e.currentTarget.style.borderColor = tone } : undefined}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = TONE.hairline }}
    >
      {/* Header line: layer name + confidence */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.95rem', fontWeight: 600, color: TONE.text, letterSpacing: '-0.01em' }}>
          {layer.label}
        </span>
        <span style={{ fontSize: '0.78rem', color: tone, fontWeight: 600 }}>
          {layer.confidence.label}
        </span>
      </div>

      {/* Description */}
      <div style={{ marginTop: '0.25rem', fontSize: '0.78rem', color: TONE.textDim, lineHeight: 1.45 }}>
        {layer.description}
      </div>

      {/* Counts row */}
      <div style={{
        marginTop: '0.7rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
        gap: '0.5rem'
      }}>
        <Stat value={layer.matched} label="Matched" tone={layer.matched > 0 ? TONE.positive : TONE.textMuted} />
        <Stat value={layer.blindSpots} label="Blind spots" tone={layer.blindSpots > 0 ? TONE.alert : TONE.textMuted} />
        <Stat value={layer.orphans} label="Orphans" tone={layer.orphans > 0 ? TONE.orphan : TONE.textMuted} />
        <Stat value={`${layer.confidence.coveragePct}%`} label="Coverage" tone={tone} subtle />
      </div>

      {/* Mission dependencies */}
      {layer.missions?.length > 0 && (
        <div style={{ marginTop: '0.65rem', fontSize: '0.74rem', color: TONE.textDim }}>
          <span style={{ color: TONE.textMuted, marginRight: '0.4rem' }}>Supports</span>
          {layer.missions.map((m, idx) => (
            <span key={m} style={{ color: TONE.text }}>
              {m}
              {idx < layer.missions.length - 1 && (
                <span style={{ color: TONE.hairline, margin: '0 0.35rem' }}>·</span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Confidence note */}
      <div style={{ marginTop: '0.45rem', fontSize: '0.72rem', color: TONE.textMuted }}>
        {layer.confidence.note}
      </div>
    </button>
  )
}

function Stat({ value, label, tone, subtle }) {
  return (
    <div>
      <div style={{
        fontSize: '1.25rem',
        fontWeight: 600,
        color: tone || TONE.text,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.02em',
        opacity: subtle ? 0.95 : 1
      }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div style={{ fontSize: '0.7rem', color: TONE.textMuted, marginTop: '0.15rem' }}>
        {label}
      </div>
    </div>
  )
}

export default function LayeredTopology({ result, industry, onDrillDown }) {
  const model = useMemo(() => {
    const assets = normalizeAssets(result)
    return evaluateLayeredTopology(assets, industry)
  }, [result, industry])

  const isDot = model.model === 'dot-operational'

  return (
    <div style={{
      padding: '1.25rem 1.5rem',
      overflow: 'auto',
      height: '100%',
      background: TONE.background,
      fontFamily: SYS_FONT
    }}>
      <div style={{ marginBottom: '1.1rem' }}>
        <h3 style={{
          margin: 0,
          color: TONE.text,
          fontSize: '1.05rem',
          fontWeight: 600,
          letterSpacing: '-0.01em'
        }}>
          {isDot ? 'Operational topology' : 'Layered topology'}
        </h3>
        <p style={{ margin: '0.3rem 0 0', color: TONE.textDim, fontSize: '0.8rem', lineHeight: 1.5 }}>
          {isDot
            ? 'How your transportation evidence stacks operationally — from the TMC brain down to the field, with safety-critical structures and the vendor access perimeter held separately.'
            : 'Evidence by Purdue level — ISA-95 / IEC 62264 hierarchy.'}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
        {model.layers.map(layer => (
          <LayerRow key={layer.id} layer={layer} onDrillDown={onDrillDown} />
        ))}
      </div>

      {isDot && (
        <p style={{
          marginTop: '1rem',
          fontSize: '0.72rem',
          color: TONE.textMuted,
          lineHeight: 1.5
        }}>
          Each layer carries its own confidence label so you can see where the evidence is strong, where it is partial, and where the model is honestly silent.
        </p>
      )}
    </div>
  )
}
