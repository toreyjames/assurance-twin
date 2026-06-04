import React, { useMemo } from 'react'
import { assetHasCves } from '../lib/core/cve-count.js'

const PIPELINE_STEPS = [
  { id: 1, name: 'Ingest', detail: 'Read engineering baseline and OT discovery records into a canonical shape.' },
  { id: 2, name: 'Normalize', detail: 'Standardize identifiers, site/unit fields, and device attributes for comparison.' },
  { id: 3, name: 'Match', detail: 'Reconcile records using deterministic identity matches (tag/IP/hostname/MAC).' },
  { id: 4, name: 'Classify', detail: 'Apply rule-based tiering and ontology device classes for control-system context.' },
  { id: 5, name: 'Validate', detail: 'Cross-check confidence and mismatch issues to surface review-required assets.' },
  { id: 6, name: 'Enrich', detail: 'Attach lifecycle/risk/dependency context and evidence records per asset claim.' },
  { id: 7, name: 'Visualize', detail: 'Render inventory, topology, and site views from the same canonical denominator.' }
]

const EPISTEMIC_GLOSSARY = [
  { key: 'cross_validated', label: 'Cross-validated', desc: 'Observed by two or more independent discovery streams (e.g., network scan and field walkdown).' },
  { key: 'supported', label: 'Single-source', desc: 'Baseline and discovery agree, but only one discovery stream observed the asset.' },
  { key: 'inferred', label: 'Inferred', desc: 'Match exists but rests on weak or partially conflicting evidence.' },
  { key: 'expected_missing', label: 'Expected missing', desc: 'Baseline expects the asset but no discovery stream observed it.' },
  { key: 'observed_unexpected', label: 'Observed undocumented', desc: 'Discovery observed the asset but baseline has no record.' },
  { key: 'unknown', label: 'Unknown', desc: 'Insufficient evidence to make a grounded claim.' }
]

function normalizedStatus(asset) {
  return asset?._status || asset?.match_type || asset?.matchType || 'matched'
}

function allAssets(result) {
  return [
    ...(result?.assets || []).map(asset => ({ ...asset, _status: normalizedStatus(asset) })),
    ...(result?.blindSpots || []).map(asset => ({ ...asset, _status: 'blind_spot' })),
    ...(result?.orphans || []).map(asset => ({ ...asset, _status: 'orphan' }))
  ]
}

export default function MethodologyView({ result }) {
  const stats = useMemo(() => {
    const assets = allAssets(result)
    const byStatus = {}
    const byClass = {}
    let tier12Total = 0
    let managedTier12 = 0
    let withCves = 0
    let telemetryFresh = 0
    let telemetryStale = 0
    let lifecycleRisk = 0

    const now = Date.now()
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

    for (const asset of assets) {
      const epistemic = asset.evidence?.epistemic_status || 'unknown'
      const label = asset.ontology?.deviceClass?.label || 'Unclassified Device'
      byStatus[epistemic] = (byStatus[epistemic] || 0) + 1
      byClass[label] = (byClass[label] || 0) + 1

      const tier = asset.classification?.tier || asset.security_tier
      if (tier === 1 || tier === 2) {
        tier12Total += 1
        if (asset.is_managed === true || asset.is_managed === 'true') managedTier12 += 1
      }
      if (assetHasCves(asset)) withCves += 1

      const life = String(asset.lifecycleStatus?.status || '')
      if (life === 'eol' || life === 'eos' || life === 'obsolete') lifecycleRisk += 1

      const status = asset._status || asset.match_type || asset.matchType || 'matched'
      if (status !== 'blind_spot') {
        const seen = asset.last_seen
        if (!seen) {
          telemetryStale += 1
        } else {
          const ts = Date.parse(seen)
          if (!Number.isNaN(ts) && (now - ts) <= THIRTY_DAYS_MS) telemetryFresh += 1
          else telemetryStale += 1
        }
      }
    }

    const topClasses = Object.entries(byClass)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)

    return {
      total: assets.length,
      byStatus,
      topClasses,
      tier12Total,
      managedTier12,
      withCves,
      telemetryFresh,
      telemetryStale,
      lifecycleRisk
    }
  }, [result])

  return (
    <div style={{ padding: '0.85rem', overflow: 'auto', height: '100%' }}>
      <div style={{ marginBottom: '0.8rem' }}>
        <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1rem', fontWeight: 700 }}>Methodology and Canon</h3>
        <p style={{ margin: '0.25rem 0 0', color: '#94a3b8', fontSize: '0.76rem' }}>
          This view explains how inventory claims are constructed, validated, and surfaced for assurance decisions.
        </p>
      </div>

      <div style={{
        border: '1px solid #1e293b',
        borderRadius: '0.5rem', background: '#0b1220', padding: '0.65rem', marginBottom: '0.7rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <div style={{ color: '#cbd5e1', fontFamily: 'monospace', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Engineering Epistemology
          </div>
          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
            {['NIST NCCoE OT Asset Mgmt', 'CISA Aug 2025 Inventory Guide', 'NIST SP 800-82r3', 'SANS 2026 CIE'].map(chip => (
              <span key={chip} style={{
                fontSize: '0.55rem', color: '#94a3b8', fontFamily: 'monospace',
                background: '#111827', padding: '0.1rem 0.4rem', borderRadius: '0.25rem',
                border: '1px solid #334155'
              }}>
                {chip}
              </span>
            ))}
          </div>
        </div>
        <div style={{ color: '#cbd5e1', fontSize: '0.72rem', lineHeight: 1.5, marginBottom: '0.5rem' }}>
          The discipline of how we know what we know about a plant, with what confidence, from what evidence, and what we don&apos;t yet know but probably should. The Twin reconciles four states most plants live in simultaneously and surfaces the gap between them.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.35rem', marginBottom: '0.5rem' }}>
          {[
            { name: 'As-designed', detail: 'Engineering baseline, P&IDs, criticality intent' },
            { name: 'As-built', detail: 'Network discovery, endpoint inventory' },
            { name: 'As-operated', detail: 'Historian, work orders, lifecycle status' },
            { name: 'As-assured', detail: 'Reconciled claim with provenance per asset' }
          ].map(state => (
            <div key={state.name} style={{ border: '1px solid #1e293b', borderRadius: '0.35rem', padding: '0.35rem 0.4rem', background: '#0f172a' }}>
              <div style={{ color: '#e2e8f0', fontFamily: 'monospace', fontSize: '0.66rem', fontWeight: 700 }}>
                {state.name}
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.64rem', marginTop: '0.15rem', lineHeight: 1.35 }}>
                {state.detail}
              </div>
            </div>
          ))}
        </div>
        <div style={{ color: '#94a3b8', fontSize: '0.69rem', lineHeight: 1.5 }}>
          Reconciled output names three things equally: <span style={{ color: '#22c55e' }}>corroborated</span> (sources agree), <span style={{ color: '#f59e0b' }}>contradicted</span> (sources disagree, review), and <span style={{ color: '#ef4444' }}>absent-but-expected</span> (no source reports something a competent source should have).
          <br />
          Industry shorthand for the same idea travels under different names &mdash; Cyber-Informed Engineering, physics-first OT defense, witness reconciliation, control-loop-awareness. They are downstream applications of this discipline.
        </div>
      </div>

      <div style={{ border: '1px solid #1e293b', borderRadius: '0.5rem', background: '#0b1220', padding: '0.65rem', marginBottom: '0.7rem' }}>
        <div style={{ color: '#64748b', fontFamily: 'monospace', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
          Canonical Pipeline
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.45rem' }}>
          {PIPELINE_STEPS.map(step => (
            <div key={step.id} style={{ border: '1px solid #1e293b', borderRadius: '0.4rem', padding: '0.45rem', background: '#0f172a' }}>
              <div style={{ color: '#cbd5e1', fontFamily: 'monospace', fontSize: '0.71rem', fontWeight: 700 }}>
                {step.id}. {step.name}
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.69rem', marginTop: '0.2rem' }}>
                {step.detail}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ border: '1px solid #1e293b', borderRadius: '0.5rem', background: '#0b1220', padding: '0.65rem', marginBottom: '0.7rem' }}>
        <div style={{ color: '#64748b', fontFamily: 'monospace', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
          Epistemic States (live counts)
        </div>
        {EPISTEMIC_GLOSSARY.map(item => (
          <div key={item.key} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 60px', gap: '0.6rem', alignItems: 'baseline', borderBottom: '1px solid #1e293b', padding: '0.3rem 0' }}>
            <span style={{ color: '#cbd5e1', fontSize: '0.72rem', fontWeight: 600 }}>{item.label}</span>
            <span style={{ color: '#94a3b8', fontSize: '0.7rem', lineHeight: 1.45 }}>{item.desc}</span>
            <span style={{ color: '#f8fafc', fontFamily: 'monospace', fontSize: '0.72rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {(stats.byStatus[item.key] || 0).toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      <div style={{ border: '1px solid #1e293b', borderRadius: '0.5rem', background: '#0b1220', padding: '0.65rem', marginBottom: '0.7rem' }}>
        <div style={{ color: '#64748b', fontFamily: 'monospace', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
          Decision Follow-Ups
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.45rem' }}>
          <div style={{ border: '1px solid #1e293b', borderRadius: '0.4rem', background: '#0f172a', padding: '0.45rem' }}>
            <div style={{ color: '#f8fafc', fontSize: '0.72rem', fontWeight: 700 }}>What do we have?</div>
            <div style={{ color: '#94a3b8', fontSize: '0.69rem', marginTop: '0.2rem' }}>
              {stats.total.toLocaleString()} in-scope assets, ontology-tagged and evidence-scored.
            </div>
          </div>
          <div style={{ border: '1px solid #1e293b', borderRadius: '0.4rem', background: '#0f172a', padding: '0.45rem' }}>
            <div style={{ color: '#f8fafc', fontSize: '0.72rem', fontWeight: 700 }}>Is it secure?</div>
            <div style={{ color: '#94a3b8', fontSize: '0.69rem', marginTop: '0.2rem' }}>
              {stats.withCves.toLocaleString()} assets with CVEs, {Math.max(0, stats.tier12Total - stats.managedTier12).toLocaleString()} unmanaged inferred Tier 1-2 assets.
            </div>
          </div>
          <div style={{ border: '1px solid #1e293b', borderRadius: '0.4rem', background: '#0f172a', padding: '0.45rem' }}>
            <div style={{ color: '#f8fafc', fontSize: '0.72rem', fontWeight: 700 }}>How is it performing?</div>
            <div style={{ color: '#94a3b8', fontSize: '0.69rem', marginTop: '0.2rem' }}>
              {stats.telemetryFresh.toLocaleString()} fresh telemetry, {stats.telemetryStale.toLocaleString()} stale/no telemetry, {stats.lifecycleRisk.toLocaleString()} lifecycle-risk assets.
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '-0.25rem', marginBottom: '0.7rem', fontSize: '0.67rem', color: '#64748b', fontFamily: 'monospace' }}>
        Tiering shown here is heuristic inference, not final control-system criticality adjudication.
      </div>

      <div style={{ border: '1px solid #1e293b', borderRadius: '0.5rem', background: '#0b1220', padding: '0.65rem' }}>
        <div style={{ color: '#64748b', fontFamily: 'monospace', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
          Ontology Coverage ({stats.total.toLocaleString()} assets)
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
          {stats.topClasses.map(([label, count]) => (
            <span key={label} style={{ border: '1px solid #334155', background: '#111827', borderRadius: '999px', padding: '0.12rem 0.45rem', color: '#cbd5e1', fontFamily: 'monospace', fontSize: '0.67rem' }}>
              {label} ({count.toLocaleString()})
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
