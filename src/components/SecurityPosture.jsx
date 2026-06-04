import React, { useMemo } from 'react'
import { assetHasCves } from '../lib/core/cve-count.js'

function statusTone(priority) {
  if (priority === 'critical') return { border: '#991b1b', bg: '#7f1d1d22', color: '#ef4444', tag: 'Critical' }
  if (priority === 'high') return { border: '#92400e', bg: '#78350f22', color: '#f59e0b', tag: 'High' }
  return { border: '#334155', bg: '#111827', color: '#94a3b8', tag: 'Tracked' }
}

function SnapshotCard({ label, value, detail, tone = '#e2e8f0' }) {
  return (
    <div style={{
      border: '1px solid #1e293b',
      borderRadius: '0.45rem',
      background: '#0f172a',
      padding: '0.65rem 0.7rem',
      minWidth: '170px',
      flex: 1
    }}>
      <div style={{ fontSize: '0.58rem', color: '#64748b', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.2rem', fontWeight: 800, lineHeight: 1, fontFamily: 'monospace', color: tone }}>
        {value}
      </div>
      <div style={{ marginTop: '0.25rem', fontSize: '0.67rem', color: '#94a3b8' }}>
        {detail}
      </div>
    </div>
  )
}

export default function SecurityPosture({ result }) {
  if (!result) return null

  const metrics = useMemo(() => {
    // result.assets are matched only. For canonical CVE/tier/telemetry counts
    // we want the full in-scope universe (matched + blind + orphan) so the
    // numbers reconcile with InventoryHeader's follow-ups row.
    const matchedAssets = result.assets || []
    const blindAssets = (result.blindSpots || []).map(a => ({ ...a, _status: 'blind_spot' }))
    const orphanAssets = (result.orphans || []).map(a => ({ ...a, _status: 'orphan' }))
    const allAssets = [...matchedAssets, ...blindAssets, ...orphanAssets]

    // Observed = anything we actually saw on the wire or in the field
    // (matched + orphan). Excludes blind spots — those by definition have
    // no live telemetry to score.
    const observed = [...matchedAssets, ...orphanAssets]

    const summary = result.summary || {}
    const discovered = observed.filter(a => Boolean(a.ip_address || a.discovered_ip || a.last_seen))
    const tier12 = allAssets.filter(a => {
      const tier = a.classification?.tier || a.security_tier
      return tier === 1 || tier === 2
    })
    const unmanagedCritical = tier12.filter(a => !(a.is_managed === true || a.is_managed === 'true'))
    const withCves = observed.filter(assetHasCves)
    const highRisk = observed.filter(a => Number(a.risk_score || 0) >= 75)
    const staleTelemetry = observed.filter(a => {
      if (!a.last_seen) return true
      const ts = Date.parse(a.last_seen)
      if (Number.isNaN(ts)) return true
      return Date.now() - ts > (45 * 24 * 60 * 60 * 1000)
    })

    const findings = [
      {
        id: 'unmanaged_tier12',
        priority: unmanagedCritical.length > 0 ? 'critical' : 'info',
        title: 'Unmanaged inferred Tier 1-2 assets',
        count: unmanagedCritical.length,
        detail: `${tier12.length.toLocaleString()} inferred Tier 1-2 assets total`,
        action: 'Assign owners and management controls for each unmanaged critical/networkable asset.'
      },
      {
        id: 'reconciliation_gaps',
        priority: (summary.blindSpots || 0) + (summary.orphans || 0) > 0 ? 'high' : 'info',
        title: 'Blind spots and orphans',
        count: (summary.blindSpots || 0) + (summary.orphans || 0),
        detail: `${(summary.blindSpots || 0).toLocaleString()} blind spots, ${(summary.orphans || 0).toLocaleString()} orphans`,
        action: 'Resolve blind spots and undocumented devices to tighten denominator confidence.'
      },
      {
        id: 'vulnerability_exposure',
        priority: withCves.length > 0 ? 'high' : 'info',
        title: 'Assets with known CVEs',
        count: withCves.length,
        detail: `${highRisk.length.toLocaleString()} currently high-risk by score`,
        action: 'Move CVE-bearing assets into remediation queue with due dates and evidence updates.'
      },
      {
        id: 'telemetry_drift',
        priority: staleTelemetry.length > 0 ? 'high' : 'info',
        title: 'Stale or missing telemetry',
        count: staleTelemetry.length,
        detail: `${discovered.length.toLocaleString()} assets observed on network`,
        action: 'Improve sensor coverage and recency validation.'
      }
    ]

    const topFindings = findings
      .filter(item => item.count > 0)
      .sort((a, b) => {
        const weight = { critical: 3, high: 2, info: 1 }
        return (weight[b.priority] || 0) - (weight[a.priority] || 0)
      })

    // Canonical denominators. summary.discoveryCoverage and summary.documented
    // are the new fields (plant-map-model). Keep legacy fallback for older
    // result payloads that may not have been re-processed.
    const matched = summary.matched ?? 0
    const blindSpots = summary.blindSpots ?? 0
    const documented = summary.documented ?? (matched + blindSpots) ?? summary.total ?? 0
    const coveragePct = summary.discoveryCoverage ?? (
      documented > 0 ? Math.round((matched / documented) * 100) : (summary.coverage || 0)
    )

    return {
      summary,
      matched,
      blindSpots,
      documented,
      coveragePct,
      tier12Total: tier12.length,
      unmanagedTier12: unmanagedCritical.length,
      withCves: withCves.length,
      highRisk: highRisk.length,
      discovered: discovered.length,
      staleTelemetry: staleTelemetry.length,
      findings: topFindings
    }
  }, [result])

  return (
    <div style={{
      background: '#020617',
      border: '1px solid #1e293b',
      borderRadius: '0.5rem',
      padding: '0.85rem',
      marginBottom: '0.75rem'
    }}>
      <div style={{ marginBottom: '0.6rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
          Security Posture
        </h3>
        <p style={{ margin: '0.22rem 0 0', fontSize: '0.72rem', color: '#94a3b8' }}>
          Snapshot of unmanaged criticals, CVE exposure, reconciliation gaps, and telemetry drift.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
        <SnapshotCard
          label="Unmanaged Tier 1-2"
          value={`${metrics.unmanagedTier12.toLocaleString()}/${metrics.tier12Total.toLocaleString()}`}
          detail="Heuristic critical/networkable tiering; validate with SMEs"
          tone={metrics.unmanagedTier12 > 0 ? '#ef4444' : '#22c55e'}
        />
        <SnapshotCard
          label="Discovery coverage"
          value={`${metrics.coveragePct}%`}
          detail={`${metrics.matched.toLocaleString()} matched / ${metrics.documented.toLocaleString()} documented`}
          tone={metrics.coveragePct >= 70 ? '#22c55e' : '#f59e0b'}
        />
        <SnapshotCard
          label="Assets with CVEs"
          value={metrics.withCves.toLocaleString()}
          detail={`${metrics.highRisk.toLocaleString()} high risk by score`}
          tone={metrics.withCves > 0 ? '#ef4444' : '#22c55e'}
        />
      </div>

      <div style={{
        border: '1px solid #1e293b',
        borderRadius: '0.45rem',
        background: '#0b1220',
        padding: '0.55rem'
      }}>
        <div style={{ fontSize: '0.6rem', color: '#64748b', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
          Findings
        </div>
        {metrics.findings.length === 0 ? (
          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
            No open security findings detected in current dataset.
          </div>
        ) : metrics.findings.map(item => {
          const tone = statusTone(item.priority)
          return (
            <div
              key={item.id}
              style={{
                border: `1px solid ${tone.border}`,
                borderRadius: '0.4rem',
                background: tone.bg,
                padding: '0.45rem 0.5rem',
                marginBottom: '0.35rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.4rem', marginBottom: '0.15rem' }}>
                <div style={{ fontSize: '0.71rem', color: '#f8fafc', fontWeight: 700 }}>
                  {item.title}
                </div>
                <span style={{ fontFamily: 'monospace', fontSize: '0.66rem', color: tone.color, fontWeight: 700 }}>
                  {tone.tag}: {item.count.toLocaleString()}
                </span>
              </div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginBottom: '0.15rem' }}>
                {item.detail}
              </div>
              <div style={{ fontSize: '0.69rem', color: '#cbd5e1' }}>
                Next step: {item.action}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: '0.45rem', fontSize: '0.66rem', color: '#64748b', fontFamily: 'monospace' }}>
        Tier labels are inferred heuristics from available fields and require SME validation for final criticality adjudication.
      </div>
    </div>
  )
}
