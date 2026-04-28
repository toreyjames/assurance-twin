/**
 * ASSURANCE WORKSPACE
 * Single-screen data interface replacing the wizard flow.
 * 
 * Left panel:   Data sources (SmartUpload + demo datasets)
 * Center canvas: Plant assembles from data (3D/2D visualization)
 * Right panel:   Detail, evidence, review, insights
 * 
 * The plant builds itself as data is processed — no wizard, no gates.
 */

import React, { useState, useCallback, useMemo } from 'react'
import Papa from 'papaparse'

import { normalizeDataset, performMatching, detectSourceType } from './lib/context/constructor.js'
import { classifySecurityTier, crossValidate, identifyReviewItems } from './lib/context/evaluator.js'
import ProvenanceTracker from './lib/context/provenance.js'
import { getAFS, resetAFS, FileType } from './lib/context/afs.js'
import { detectIndustry } from './lib/context/industry-detector.js'
import { addDeviceContext } from './lib/context/device-patterns.js'
import { addLifecycleStatus, generateLifecycleSummary } from './lib/context/lifecycle-tracker.js'
import { generateDependencyMap } from './lib/context/dependency-mapper.js'
import { analyzeAllGaps } from './lib/context/gap-analyzer.js'
import { analyzePortfolioRisk } from './lib/context/risk-engine.js'
import { buildPlantMapModel } from './lib/core/plant-map-model.js'

import SmartUpload from './components/SmartUpload.jsx'
import PlantMap from './components/PlantMap.jsx'
import GapPanel from './components/GapPanel.jsx'
import SecurityPosture from './components/SecurityPosture.jsx'
import AssetTable from './components/AssetTable.jsx'
import WorldModel from './components/WorldModel.jsx'

// =============================================================================
// SESSION PERSISTENCE
// =============================================================================

const WS_SESSION_KEY = 'ot_workspace_session'

function saveWorkspaceSession(data) {
  try {
    localStorage.setItem(WS_SESSION_KEY, JSON.stringify({ ...data, savedAt: new Date().toISOString() }))
  } catch (err) { console.warn('[SESSION] Save failed:', err) }
}

function loadWorkspaceSession() {
  try {
    const stored = localStorage.getItem(WS_SESSION_KEY)
    if (!stored) return null
    const session = JSON.parse(stored)
    const hours = (Date.now() - new Date(session.savedAt).getTime()) / 3.6e6
    if (hours > 24) { localStorage.removeItem(WS_SESSION_KEY); return null }
    return session
  } catch { return null }
}

function clearWorkspaceSession() {
  localStorage.removeItem(WS_SESSION_KEY)
}

// =============================================================================
// ASSEMBLY ANIMATION STYLES
// =============================================================================

const ASSEMBLY_CSS = `
@keyframes ws-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
@keyframes ws-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes ws-build {
  0% { transform: scaleY(0); opacity: 0; }
  60% { transform: scaleY(1.05); opacity: 0.8; }
  100% { transform: scaleY(1); opacity: 1; }
}
@keyframes ws-fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.ws-pulse { animation: ws-pulse 2s ease-in-out infinite; }
.ws-spin { animation: ws-spin 1.5s linear infinite; }
.ws-build { animation: ws-build 0.6s ease-out forwards; transform-origin: bottom; }
.ws-fade-in { animation: ws-fade-in 0.4s ease-out forwards; }
`

// =============================================================================
// DEMO DATASETS
// =============================================================================

const DEMO_DATASETS = [
  { id: 'automotive-large', label: 'Automotive (~12K, 5 plants)', industry: 'automotive', scale: 'large', path: '/samples/aigne/automotive/large' },
  { id: 'oil-gas-medium', label: 'Oil & Gas - Medium (~12K)', industry: 'oil-gas', scale: 'medium', path: '/samples/demo/oil-gas' },
  { id: 'oil-gas-large', label: 'Oil & Gas - Large (~11K, 3 plants)', industry: 'oil-gas', scale: 'large', path: '/samples/aigne/oil-gas/large' },
  { id: 'oil-gas-enterprise', label: 'Oil & Gas - Enterprise (~32K, 5 plants)', industry: 'oil-gas', scale: 'enterprise', path: '/samples/aigne/oil-gas/enterprise' },
  { id: 'pharma-large', label: 'Pharma (~11K, 3 plants)', industry: 'pharma', scale: 'large', path: '/samples/aigne/pharma/large' },
  { id: 'utilities-large', label: 'Utilities (~10K, 3 plants)', industry: 'utilities', scale: 'large', path: '/samples/aigne/utilities/large' }
]

// =============================================================================
// PROCESSING PHASES (for the assembly animation)
// =============================================================================

const PHASES = {
  IDLE: 'idle',
  INGESTING: 'ingesting',
  RECONCILING: 'reconciling',
  MAPPING: 'mapping',
  VERIFYING: 'verifying',
  ENRICHING: 'enriching',
  COMPLETE: 'complete'
}

// =============================================================================
// ASSEMBLY STATUS BAR
// =============================================================================

function AssemblyStatus({ phase, stats }) {
  const phases = [
    { key: PHASES.INGESTING, label: 'Ingesting' },
    { key: PHASES.RECONCILING, label: 'Reconciling' },
    { key: PHASES.MAPPING, label: 'Mapping' },
    { key: PHASES.VERIFYING, label: 'Verifying' },
    { key: PHASES.ENRICHING, label: 'Enriching' },
    { key: PHASES.COMPLETE, label: 'Complete' }
  ]

  const currentIdx = phases.findIndex(p => p.key === phase)

  return (
    <div style={{ padding: '0.5rem 0', borderBottom: '1px solid #1e293b' }}>
      <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', marginBottom: '0.5rem' }}>
        {phases.map((p, i) => (
          <React.Fragment key={p.key}>
            <div style={{
              fontSize: '0.65rem',
              fontFamily: 'monospace',
              fontWeight: i === currentIdx ? '700' : '400',
              color: i < currentIdx ? '#22c55e' : i === currentIdx ? '#fbbf24' : '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {i < currentIdx ? '\u2713' : i === currentIdx && phase !== PHASES.COMPLETE ? '\u25CF' : ''} {p.label}
            </div>
            {i < phases.length - 1 && (
              <div style={{
                flex: 1,
                height: '1px',
                background: i < currentIdx ? '#22c55e' : '#334155'
              }} />
            )}
          </React.Fragment>
        ))}
      </div>
      {stats && (
        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.7rem', fontFamily: 'monospace', color: '#94a3b8' }}>
          {stats.totalRows > 0 && <span>{stats.totalRows.toLocaleString()} rows ingested</span>}
          {stats.matched > 0 && <span>{stats.matched} matched</span>}
          {stats.blindSpots > 0 && <span>{stats.blindSpots} blind spots</span>}
          {stats.orphans > 0 && <span>{stats.orphans} orphans</span>}
          {stats.coverage > 0 && <span>{stats.coverage}% coverage</span>}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// RIGHT PANEL: DETAIL VIEW
// =============================================================================

function DetailPanel({ selected, result, onReviewDecision, rightTab, setRightTab }) {
  const hasInsights = result?.assuranceInsights && Object.keys(result.assuranceInsights).length > 0
  const tabs = [
    { id: 'detail', label: 'Detail' },
    { id: 'gaps', label: 'Gaps' },
    { id: 'security', label: 'Security' },
    ...(hasInsights ? [{ id: 'insights', label: 'Insights' }] : []),
    { id: 'table', label: 'Table' }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setRightTab(tab.id)}
            style={{
              flex: 1,
              padding: '0.5rem',
              background: rightTab === tab.id ? '#1e293b' : 'transparent',
              color: rightTab === tab.id ? '#f8fafc' : '#64748b',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.7rem',
              fontFamily: 'monospace',
              fontWeight: rightTab === tab.id ? '700' : '400',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0.75rem' }}>
        {rightTab === 'detail' && (
          <AssetDetail selected={selected} onReviewDecision={onReviewDecision} />
        )}

        {rightTab === 'gaps' && result?.contextAnalysis?.gapAnalysis && (
          <GapPanel gapAnalysis={result.contextAnalysis.gapAnalysis} />
        )}

        {rightTab === 'security' && result && (
          <SecurityPosture result={result} gapAnalysis={result.contextAnalysis?.gapAnalysis} />
        )}

        {rightTab === 'insights' && hasInsights && (
          <InsightsPanels insights={result.assuranceInsights} />
        )}

        {rightTab === 'table' && result && (
          <div>
            <div style={{ marginBottom: '0.5rem', textAlign: 'right' }}>
              <button
                onClick={() => exportCSV(result)}
                style={{
                  padding: '0.3rem 0.75rem', background: '#1e293b', color: '#94a3b8',
                  border: '1px solid #334155', borderRadius: '0.25rem', cursor: 'pointer',
                  fontSize: '0.65rem', fontFamily: 'monospace'
                }}
              >
                Export CSV
              </button>
            </div>
            <AssetTable unifiedAssets={buildUnifiedAssets(result)} result={result} />
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// ASSET DETAIL (right panel default)
// =============================================================================

function AssetDetail({ selected, onReviewDecision }) {
  if (!selected) {
    return (
      <div style={{ color: '#475569', fontSize: '0.85rem', padding: '2rem 1rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.3 }}>&#8592;</div>
        Select an asset or unit on the canvas to see detail and evidence trail.
      </div>
    )
  }

  const isLowConfidence = selected.matchConfidence < 70 || selected.validation?.confidence === 'LOW'
  const isOrphan = selected._status === 'orphan'
  const isBlindSpot = selected._status === 'blind_spot'

  return (
    <div style={{ fontSize: '0.8rem' }}>
      <div style={{ fontWeight: '700', fontSize: '1rem', color: '#f8fafc', marginBottom: '0.75rem', fontFamily: 'monospace' }}>
        {selected.tag_id || selected.asset_id || 'Unknown Asset'}
      </div>

      {/* Status badge */}
      <div style={{ marginBottom: '1rem' }}>
        <span style={{
          padding: '0.2rem 0.6rem',
          borderRadius: '0.25rem',
          fontSize: '0.65rem',
          fontWeight: '700',
          fontFamily: 'monospace',
          textTransform: 'uppercase',
          background: isBlindSpot ? '#7c2d1220' : isOrphan ? '#7c3aed20' : isLowConfidence ? '#f59e0b20' : '#22c55e20',
          color: isBlindSpot ? '#ef4444' : isOrphan ? '#8b5cf6' : isLowConfidence ? '#f59e0b' : '#22c55e'
        }}>
          {isBlindSpot ? 'Blind Spot' : isOrphan ? 'Orphan' : isLowConfidence ? 'Needs Review' : 'Verified'}
        </span>
      </div>

      {/* Core fields */}
      <FieldGroup title="Identity" fields={[
        { label: 'Tag ID', value: selected.tag_id },
        { label: 'IP', value: selected.ip_address },
        { label: 'Hostname', value: selected.hostname },
        { label: 'MAC', value: selected.mac_address }
      ]} />

      <FieldGroup title="Location" fields={[
        { label: 'Plant', value: selected.plant },
        { label: 'Unit', value: selected.unit },
        { label: 'Segment', value: selected.network_segment }
      ]} />

      <FieldGroup title="Device" fields={[
        { label: 'Type', value: selected.device_type },
        { label: 'Manufacturer', value: selected.manufacturer },
        { label: 'Model', value: selected.model },
        { label: 'Tier', value: selected.classification?.tier ? `Tier ${selected.classification.tier}` : '' }
      ]} />

      <FieldGroup title="Evidence" fields={[
        { label: 'Match Type', value: selected.matchType || selected.match_type },
        { label: 'Confidence', value: selected.matchConfidence ? `${selected.matchConfidence}%` : '' },
        { label: 'Validation', value: selected.validation?.confidence },
        { label: 'Last Seen', value: selected.last_seen }
      ]} />

      {/* Evidence Trail */}
      {(selected.validation || selected.classification) && (
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{
            fontSize: '0.6rem', color: '#64748b', fontFamily: 'monospace', fontWeight: '600',
            textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem'
          }}>
            Evidence Trail
          </div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', lineHeight: 1.6 }}>
            {selected.classification?.reason && (
              <div style={{ padding: '0.2rem 0', borderBottom: '1px solid #1e293b' }}>
                <span style={{ color: '#64748b' }}>Classification:</span> {selected.classification.reason}
              </div>
            )}
            {selected.validation?.issues && selected.validation.issues.length > 0 && (
              <div style={{ padding: '0.2rem 0' }}>
                <span style={{ color: '#f59e0b' }}>Issues:</span>
                {selected.validation.issues.map((issue, i) => (
                  <div key={i} style={{ paddingLeft: '0.5rem', color: '#f59e0b', fontSize: '0.65rem' }}>
                    {'\u2022'} {issue}
                  </div>
                ))}
              </div>
            )}
            {selected.validation?.checks && (
              <div style={{ padding: '0.2rem 0', borderBottom: '1px solid #1e293b' }}>
                <span style={{ color: '#64748b' }}>Checks passed:</span> {selected.validation.checks?.passed || 0}/{selected.validation.checks?.total || 0}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Security details */}
      <FieldGroup title="Security" fields={[
        { label: 'Vulnerabilities', value: selected.vulnerabilities > 0 ? `${selected.vulnerabilities}` : '' },
        { label: 'CVEs', value: selected.cve_count > 0 ? `${selected.cve_count}` : '' },
        { label: 'Risk Score', value: selected.risk_score > 0 ? `${selected.risk_score}` : '' },
        { label: 'Managed', value: selected.is_managed === true ? 'Yes' : selected.is_managed === false ? 'No' : '' },
        { label: 'Last Patch', value: selected.last_patch_date },
        { label: 'Firmware', value: selected.firmware_version }
      ]} />

      {/* Inline review for uncertain items */}
      {(isLowConfidence || isOrphan) && onReviewDecision && (
        <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#1e293b', borderRadius: '0.5rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            Review Decision
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => onReviewDecision(selected, 'accept')}
              style={{ flex: 1, padding: '0.4rem', background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600' }}
            >
              Accept
            </button>
            <button
              onClick={() => onReviewDecision(selected, 'reject')}
              style={{ flex: 1, padding: '0.4rem', background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600' }}
            >
              Reject
            </button>
            <button
              onClick={() => onReviewDecision(selected, 'flag')}
              style={{ flex: 1, padding: '0.4rem', background: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b40', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600' }}
            >
              Flag
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// INSIGHTS PANELS (maintenance, vulnerability, segmentation, incidents)
// =============================================================================

function InsightsPanels({ insights }) {
  if (!insights) return null
  return (
    <div style={{ fontSize: '0.8rem' }}>
      {insights.maintenance && (
        <InsightCard
          title="Maintenance"
          color="#f59e0b"
          stats={[
            { label: 'Work Orders', value: insights.maintenance.totalWorkOrders },
            { label: 'Open', value: insights.maintenance.openWorkOrders },
            { label: 'Overdue', value: insights.maintenance.overdueWorkOrders, warn: insights.maintenance.overdueWorkOrders > 0 },
            { label: 'Avg Days Overdue', value: insights.maintenance.averageDaysOverdue },
            { label: 'Linked to Assets', value: insights.maintenance.linkedRecords },
            { label: 'Unlinked', value: insights.maintenance.unlinkedRecords, warn: insights.maintenance.unlinkedRecords > 0 }
          ]}
          samples={insights.maintenance.sampleOverdue}
          sampleLabel="Top Overdue"
        />
      )}
      {insights.vulnerability && (
        <InsightCard
          title="Vulnerability"
          color="#ef4444"
          stats={[
            { label: 'Scanned Assets', value: insights.vulnerability.totalScanned },
            { label: 'Vulnerable', value: insights.vulnerability.vulnerableCount, warn: true },
            { label: 'Critical CVEs', value: insights.vulnerability.criticalCVEs, warn: insights.vulnerability.criticalCVEs > 0 },
            { label: 'Unpatched', value: insights.vulnerability.unpatchedCount, warn: insights.vulnerability.unpatchedCount > 0 },
            { label: 'Avg Days Since Patch', value: insights.vulnerability.avgDaysSincePatch }
          ]}
        />
      )}
      {insights.segmentation && (
        <InsightCard
          title="Network Segmentation"
          color="#06b6d4"
          stats={[
            { label: 'Rules Analyzed', value: insights.segmentation.totalRules },
            { label: 'Allow Rules', value: insights.segmentation.allowRules },
            { label: 'Deny Rules', value: insights.segmentation.denyRules },
            { label: 'Violations', value: insights.segmentation.violations, warn: insights.segmentation.violations > 0 }
          ]}
        />
      )}
      {insights.incidents && (
        <InsightCard
          title="Incidents"
          color="#8b5cf6"
          stats={[
            { label: 'Total Incidents', value: insights.incidents.totalIncidents },
            { label: 'Open', value: insights.incidents.openIncidents, warn: insights.incidents.openIncidents > 0 },
            { label: 'Critical', value: insights.incidents.criticalIncidents, warn: insights.incidents.criticalIncidents > 0 },
            { label: 'Linked to Assets', value: insights.incidents.linkedRecords }
          ]}
        />
      )}
    </div>
  )
}

function InsightCard({ title, color, stats, samples, sampleLabel }) {
  return (
    <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#1e293b', borderRadius: '0.5rem', borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: '0.7rem', fontWeight: '700', fontFamily: 'monospace', color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
        {title}
      </div>
      {stats.filter(s => s.value != null).map(s => (
        <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15rem 0', borderBottom: '1px solid #0f172a' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>{s.label}</span>
          <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', fontWeight: '600', color: s.warn ? color : '#e2e8f0' }}>
            {typeof s.value === 'number' ? s.value.toLocaleString() : s.value}
          </span>
        </div>
      ))}
      {samples && samples.length > 0 && (
        <div style={{ marginTop: '0.5rem' }}>
          <div style={{ fontSize: '0.6rem', color: '#64748b', fontFamily: 'monospace', marginBottom: '0.25rem' }}>{sampleLabel}</div>
          {samples.slice(0, 3).map((s, i) => (
            <div key={i} style={{ fontSize: '0.65rem', color: '#94a3b8', fontFamily: 'monospace', padding: '0.1rem 0' }}>
              {s.tag_id || s.asset_id || 'Unknown'} — {s.daysOverdue}d overdue
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FieldGroup({ title, fields }) {
  const populated = fields.filter(f => f.value)
  if (populated.length === 0) return null

  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div style={{
        fontSize: '0.6rem', color: '#64748b', fontFamily: 'monospace', fontWeight: '600',
        textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem'
      }}>
        {title}
      </div>
      {populated.map(f => (
        <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15rem 0', borderBottom: '1px solid #1e293b' }}>
          <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{f.label}</span>
          <span style={{ color: '#e2e8f0', fontSize: '0.75rem', fontFamily: 'monospace' }}>{f.value}</span>
        </div>
      ))}
    </div>
  )
}

// =============================================================================
// THREE QUESTIONS SUMMARY BAR
// =============================================================================

// Expected unit count per plant type (for topological coverage)
const EXPECTED_UNITS = { 'oil-gas': 14, 'pharma': 10, 'automotive': 8, 'utilities': 10 }

function ThreeQuestions({ result, industry }) {
  const stats = useMemo(() => {
    if (!result) return null
    const mapModel = buildPlantMapModel(result)
    const total = mapModel.summary.totalAssets

    // Plant visibility separates plant-layout recognition from discovery coverage.
    const unitSet = new Set()
    mapModel.assets.forEach(a => { const u = a.unit || a.area || a.location; if (u && u !== 'Unassigned') unitSet.add(u) })
    const expectedUnits = EXPECTED_UNITS[industry] || 14
    const topoCoverage = Math.min(100, Math.round(unitSet.size / expectedUnits * 100))
    const discoveryCoverage = mapModel.summary.coveragePercent

    const networkedAssets = mapModel.assets.filter(a => { const t = a.classification?.tier || a.security_tier; return t === 1 || t === 2 })
    const managed = networkedAssets.filter(a => a.is_managed === true || a.is_managed === 'true')
    const withCVEs = networkedAssets.filter(a => (a.cve_count || 0) > 0)

    return {
      total,
      tier1: mapModel.summary.tier1,
      tier2: mapModel.summary.tier2,
      tier3: mapModel.summary.tier3,
      discoveryCoverage,
      topoCoverage,
      matched: mapModel.summary.matched,
      blindSpots: mapModel.summary.blindSpots,
      orphans: mapModel.summary.orphans,
      networkedTotal: networkedAssets.length,
      managed: managed.length,
      unmanaged: networkedAssets.length - managed.length,
      withCVEs: withCVEs.length
    }
  }, [result, industry])

  if (!stats) return null

  const visColor = stats.discoveryCoverage >= 70 ? '#22c55e' : stats.discoveryCoverage >= 50 ? '#f59e0b' : '#ef4444'
  const secColor = stats.unmanaged === 0 ? '#22c55e' : stats.unmanaged > 10 ? '#ef4444' : '#f59e0b'

  return (
    <div style={{ display: 'flex', gap: '1px', background: '#1e293b', borderBottom: '1px solid #1e293b' }}>
      <QCard
        label="Assets"
        value={stats.total.toLocaleString()}
        detail={`${stats.tier1} critical \u00B7 ${stats.tier2} networkable \u00B7 ${stats.tier3} passive`}
      />
      <QCard
        label="Discovery Coverage"
        value={`${stats.discoveryCoverage}%`}
        detail={`${stats.matched.toLocaleString()} matched \u00B7 ${stats.blindSpots.toLocaleString()} blind spots \u00B7 ${stats.orphans.toLocaleString()} orphans`}
        valueColor={visColor}
      />
      <QCard
        label="Security Coverage"
        value={`${stats.managed}/${stats.networkedTotal}`}
        detail={stats.unmanaged > 0 ? `${stats.unmanaged} unmanaged${stats.withCVEs > 0 ? ` \u00B7 ${stats.withCVEs} with CVEs` : ''}` : 'All networked devices covered'}
        valueColor={secColor}
      />
    </div>
  )
}

function QCard({ label, value, detail, valueColor }) {
  return (
    <div style={{ flex: 1, padding: '0.75rem 1rem', background: '#0f172a' }}>
      <div style={{ fontSize: '0.55rem', color: '#64748b', fontFamily: 'monospace', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: '800', fontFamily: 'monospace', lineHeight: 1, color: valueColor || '#f8fafc' }}>
        {value}
      </div>
      <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '0.25rem', fontFamily: 'monospace' }}>
        {detail}
      </div>
    </div>
  )
}

// =============================================================================
// HELPERS
// =============================================================================

function buildUnifiedAssets(result) {
  if (!result) return []
  const list = []
  for (const a of (result.assets || [])) list.push({ ...a, _status: 'matched' })
  for (const a of (result.blindSpots || [])) list.push({ ...a, _status: 'blind_spot', classification: a.classification || { tier: a.security_tier || 3 } })
  for (const a of (result.orphans || [])) list.push({ ...a, _status: 'orphan', classification: a.classification || { tier: a.security_tier || 3 } })
  return list
}

function exportCSV(result) {
  const assets = buildUnifiedAssets(result)
  if (assets.length === 0) return
  const cols = ['tag_id', 'ip_address', 'hostname', 'mac_address', 'plant', 'unit', 'device_type', 'manufacturer', 'model', 'security_tier', 'network_segment', 'matchType', 'matchConfidence', '_status']
  const header = cols.join(',')
  const rows = assets.map(a => cols.map(c => {
    const val = a[c] ?? (c === 'security_tier' ? a.classification?.tier : '')
    return `"${String(val).replace(/"/g, '""')}"`
  }).join(','))
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `assurance-twin-export-${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// =============================================================================
// MAIN WORKSPACE
// =============================================================================

export default function AssuranceWorkspace() {
  const savedSession = useMemo(() => loadWorkspaceSession(), [])

  // Data state
  const [files, setFiles] = useState([])
  const [result, setResult] = useState(savedSession?.result || null)
  const [phase, setPhase] = useState(savedSession?.result ? PHASES.COMPLETE : PHASES.IDLE)
  const [stats, setStats] = useState(savedSession?.stats || {})
  const [error, setError] = useState(null)
  const [industry, setIndustry] = useState(savedSession?.industry || null)

  // UI state
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [rightTab, setRightTab] = useState('detail')
  const [leftCollapsed, setLeftCollapsed] = useState(!!savedSession?.result)
  const [rightCollapsed, setRightCollapsed] = useState(!savedSession?.result)
  const [selectedDemo, setSelectedDemo] = useState('oil-gas-medium')
  const [reviewDecisions, setReviewDecisions] = useState({})
  const [showWorldModel, setShowWorldModel] = useState(false)
  const [mapCollapsed, setMapCollapsed] = useState(false)

  // Persist when result changes
  React.useEffect(() => {
    if (result) saveWorkspaceSession({ result, stats, industry })
  }, [result, stats, industry])

  const readFileText = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsText(file)
  })

  // ---- PROCESSING PIPELINE ----

  const processData = useCallback(async (smartFiles) => {
    if (!smartFiles || smartFiles.length === 0) return

    setError(null)
    setResult(null)
    setSelectedAsset(null)
    setRightCollapsed(true)

    try {
      // Phase 1: Ingest
      setPhase(PHASES.INGESTING)
      const provenance = new ProvenanceTracker()
      const afs = getAFS()
      provenance.record({ type: 'PIPELINE_START' })

      let allEngineering = []
      let allDiscovery = []
      let totalRows = 0
      const sourceFileIds = []

      for (const sf of smartFiles) {
        const content = sf.content
        if (!content) continue

        const fileId = afs.registerFile({
          name: sf.name,
          type: sf.detectedType === 'engineering' ? FileType.SOURCE_ENGINEERING : FileType.SOURCE_DISCOVERY,
          content,
          metadata: { category: sf.detectedType, rowCount: sf.rowCount }
        })
        sourceFileIds.push(fileId)

        const parsed = Papa.parse(content, { header: true, skipEmptyLines: true })
        const rows = normalizeDataset(parsed.data || [], fileId)
        totalRows += rows.length

        if (sf.detectedType === 'engineering') {
          allEngineering.push(...rows)
        } else {
          allDiscovery.push(...rows)
        }

        provenance.recordSourceIngestion(fileId, sf.name, null, rows.length, sf.detectedType)
      }

      setStats({ totalRows })

      // Detect industry silently
      const sampleRows = [...allEngineering.slice(0, 200), ...allDiscovery.slice(0, 200)]
      if (sampleRows.length > 0) {
        const detection = detectIndustry(sampleRows)
        if (detection.isReliable) setIndustry(detection.detected)
      }

      // Phase 2: Reconcile/Match
      setPhase(PHASES.RECONCILING)
      await tick()

      const matchResults = performMatching(allEngineering, allDiscovery, provenance)
      if (!matchResults || !Array.isArray(matchResults.matched)) {
        throw new Error('Matching failed — check data format')
      }
      provenance.record({ type: 'MATCHING_COMPLETE', ...matchResults.stats })

      setStats(prev => ({
        ...prev,
        matched: matchResults.stats.matchedCount,
        blindSpots: matchResults.stats.blindSpotCount,
        orphans: matchResults.stats.orphanCount,
        coverage: matchResults.stats.coveragePercent
      }))

      // Phase 3: Map (classify + validate)
      setPhase(PHASES.MAPPING)
      await tick()

      const canonicalAssets = matchResults.matched.map(match => {
        const classification = classifySecurityTier(match.engineering)
        const validation = crossValidate(match)
        return {
          tag_id: match.engineering.tag_id || match.discovered?.tag_id || 'UNKNOWN',
          ip_address: match.discovered?.ip_address || match.engineering.ip_address || '',
          hostname: match.discovered?.hostname || match.engineering.hostname || '',
          mac_address: match.discovered?.mac_address || match.engineering.mac_address || '',
          plant: match.engineering.plant,
          plant_code: match.engineering.plant_code || match.engineering.tag_id?.split('-')?.[0] || '',
          unit: match.engineering.unit,
          unit_code: match.engineering.unit_code || '',
          device_type: match.engineering.device_type,
          manufacturer: match.engineering.manufacturer,
          model: match.engineering.model,
          criticality: match.engineering.criticality || '',
          security_tier: match.engineering.security_tier || classification?.tier || 3,
          last_seen: match.discovered?.last_seen || '',
          discovered_ip: match.discovered?.ip_address || '',
          vulnerabilities: match.discovered?.vulnerabilities ?? 0,
          cve_count: match.discovered?.cve_count ?? 0,
          risk_score: match.discovered?.risk_score ?? 0,
          is_managed: match.discovered?.is_managed ?? false,
          last_patch_date: match.discovered?.last_patch_date || '',
          firmware_version: match.discovered?.firmware_version || match.engineering?.firmware_version || '',
          network_segment: match.discovered?.network_segment || match.engineering?.network_segment || '',
          protocol: match.discovered?.protocol || match.engineering?.protocol || '',
          classification,
          validation,
          matchType: match.matchType,
          match_type: 'matched',
          matchConfidence: match.confidence,
          discovered: match.discovered
        }
      })

      // Phase 4: Verify (context analysis)
      setPhase(PHASES.VERIFYING)
      await tick()

      const blindSpots = matchResults.blindSpots.map(asset => {
        const classification = classifySecurityTier(asset)
        return {
          ...asset,
          classification,
          security_tier: asset.security_tier || classification?.tier || 3,
          _status: 'blind_spot',
          match_type: 'blind_spot'
        }
      })
      const orphans = matchResults.orphans.map(asset => {
        const classification = classifySecurityTier(asset)
        return {
          ...asset,
          classification,
          security_tier: asset.security_tier || classification?.tier || 3,
          _status: 'orphan',
          match_type: 'orphan'
        }
      })

      const reviewItems = identifyReviewItems(canonicalAssets, blindSpots, orphans)

      const summary = {
        total: matchResults.stats.engineeringTotal,
        matched: matchResults.stats.matchedCount,
        blindSpots: matchResults.stats.blindSpotCount,
        orphans: matchResults.stats.orphanCount,
        coverage: matchResults.stats.coveragePercent,
        tier1: [...canonicalAssets, ...blindSpots].filter(a => a.classification?.tier === 1).length,
        tier2: [...canonicalAssets, ...blindSpots].filter(a => a.classification?.tier === 2).length,
        tier3: [...canonicalAssets, ...blindSpots].filter(a => a.classification?.tier === 3).length
      }

      // Phase 5: Enrich (context analysis)
      setPhase(PHASES.ENRICHING)
      await tick()

      let contextAnalysis = null
      try {
        const ind = industry || 'oil-gas'
        const assetsWithDeviceContext = addDeviceContext(canonicalAssets)
        const assetsWithLifecycle = addLifecycleStatus(assetsWithDeviceContext)
        const lifecycleSummary = generateLifecycleSummary(assetsWithLifecycle)
        const dependencyMap = generateDependencyMap(assetsWithLifecycle, ind)
        const gapAnalysis = analyzeAllGaps(assetsWithLifecycle, matchResults, ind)
        const riskAnalysis = analyzePortfolioRisk(assetsWithLifecycle, {
          industry: ind,
          dependencies: dependencyMap.dependencies
        })
        contextAnalysis = { assets: assetsWithLifecycle, lifecycleSummary, dependencyMap, gapAnalysis, riskAnalysis, industry: ind }
      } catch (ctxErr) {
        console.warn('[WORKSPACE] Context analysis error:', ctxErr)
      }

      const audit = await provenance.generateAuditPackage(canonicalAssets, summary)

      // Try flexible API for enrichment if additional source types detected
      let assuranceInsights = null
      const enrichmentTypes = smartFiles.filter(f => ['maintenance', 'vulnerability', 'network', 'historian'].includes(f.detectedType))
      if (enrichmentTypes.length > 0) {
        try {
          const sources = { engineering: [], discovery: [], maintenance: [], vulnerability: [], network: [], incidents: [] }
          for (const sf of smartFiles) {
            const bucket = sources[sf.detectedType] || sources.engineering
            bucket.push({ filename: sf.name, content: sf.content })
          }
          const flexRes = await fetch('/api/analyze-oil-gas-flexible', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sources, industry: industry || 'oil-gas' })
          })
          if (flexRes.ok) {
            const flexData = await flexRes.json()
            if (flexData.assuranceInsights) assuranceInsights = flexData.assuranceInsights
          }
        } catch (flexErr) {
          console.warn('[WORKSPACE] Flexible enrichment unavailable:', flexErr.message)
        }
      }

      const data = {
        status: 'COMPLETE',
        assets: contextAnalysis?.assets || canonicalAssets,
        blindSpots,
        orphans,
        summary,
        reviewRequired: reviewItems,
        contextAnalysis,
        assuranceInsights,
        audit,
        fileCatalog: afs.getCatalog()
      }

      setResult(data)
      setPhase(PHASES.COMPLETE)
      setRightCollapsed(false)
      setRightTab('detail')
      if (files.length > 3) setLeftCollapsed(true)

      console.log('[WORKSPACE] Processing complete:', summary)

    } catch (err) {
      console.error('[WORKSPACE] Error:', err)
      setError(err.message)
      setPhase(PHASES.IDLE)
    }
  }, [industry, files.length])

  // ---- DEMO DATA LOADER ----

  const loadDemo = useCallback(async () => {
    const dataset = DEMO_DATASETS.find(d => d.id === selectedDemo) || DEMO_DATASETS[0]
    const basePath = dataset.path
    const isAigne = basePath.includes('/aigne/')
    const fileNames = isAigne
      ? [`engineering_baseline_${dataset.scale}.csv`, `ot_discovery_${dataset.scale}.csv`]
      : ['engineering_baseline_medium.csv', 'ot_discovery_medium.csv']

    setPhase(PHASES.INGESTING)
    setError(null)
    setIndustry(dataset.industry)

    try {
      const smartFiles = []
      for (const fname of fileNames) {
        const res = await fetch(`${basePath}/${fname}`)
        if (!res.ok) { console.warn(`[DEMO] Failed: ${fname}`); continue }
        const content = await res.text()
        const parsed = Papa.parse(content, { header: true, skipEmptyLines: true, preview: 100 })
        const headers = parsed.meta.fields || []
        const { type } = detectSourceType(headers, fname)
        smartFiles.push({
          id: `demo-${fname}-${Date.now()}`,
          name: fname,
          content,
          detectedType: type || (fname.includes('engineering') ? 'engineering' : 'discovery'),
          rowCount: content.split('\n').length - 1,
          headers
        })
      }
      setFiles(smartFiles)
      await processData(smartFiles)
    } catch (err) {
      setError('Failed to load demo: ' + err.message)
      setPhase(PHASES.IDLE)
    }
  }, [selectedDemo, processData])

  // ---- FILE UPLOAD HANDLER ----

  const handleFilesChange = useCallback((smartFiles) => {
    setFiles(smartFiles)
  }, [])

  const handleProcess = useCallback(() => {
    processData(files)
  }, [files, processData])

  // ---- REVIEW ----

  const handleUnitSelect = useCallback((unit) => {
    if (!unit || !result) {
      setSelectedAsset(null)
      return
    }
    const allAssets = buildUnifiedAssets(result)
    const unitAssets = allAssets.filter(a =>
      (a.unit || a.area || a.location || 'Unassigned') === unit.name
    )
    setSelectedAsset(unitAssets[0] || { tag_id: unit.name, unit: unit.name, _status: 'unit_summary', ...unit })
    setRightTab('detail')
    setRightCollapsed(false)
  }, [result])

  const handleReviewDecision = useCallback((asset, decision) => {
    const key = asset.tag_id || asset.ip_address || Math.random().toString()
    setReviewDecisions(prev => ({ ...prev, [key]: decision }))
  }, [])

  // ---- RESET ----

  const handleReset = useCallback(() => {
    resetAFS()
    clearWorkspaceSession()
    setFiles([])
    setResult(null)
    setPhase(PHASES.IDLE)
    setStats({})
    setError(null)
    setIndustry(null)
    setSelectedAsset(null)
    setReviewDecisions({})
    setLeftCollapsed(false)
    setRightCollapsed(true)
    setShowWorldModel(false)
  }, [])

  // ---- LAYOUT ----

  const leftWidth = leftCollapsed ? 48 : 280
  const rightWidth = rightCollapsed ? 0 : 340

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 80px)',
      background: '#0f172a',
      color: '#e2e8f0',
      overflow: 'hidden',
      borderRadius: '0.5rem'
    }}>
      <style>{ASSEMBLY_CSS}</style>
      {/* Three Questions bar (visible when results exist) */}
      {result && <ThreeQuestions result={result} industry={industry || 'oil-gas'} />}

      {/* Assembly status + toolbar */}
      {phase !== PHASES.IDLE && (
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #1e293b' }}>
          <div style={{ flex: 1 }}>
            <AssemblyStatus phase={phase} stats={stats} />
          </div>
          {result && (
            <div style={{ display: 'flex', gap: '0.5rem', padding: '0 0.75rem', flexShrink: 0 }}>
              <button
                onClick={() => setMapCollapsed(!mapCollapsed)}
                style={{
                  padding: '0.3rem 0.6rem', background: mapCollapsed ? '#1e293b' : 'transparent',
                  color: '#94a3b8', border: '1px solid #334155', borderRadius: '0.25rem',
                  cursor: 'pointer', fontSize: '0.65rem', fontFamily: 'monospace'
                }}
              >
                {mapCollapsed ? 'Show Map' : 'Hide Map'}
              </button>
              <button
                onClick={() => setShowWorldModel(!showWorldModel)}
                style={{
                  padding: '0.3rem 0.6rem', background: showWorldModel ? '#1e293b' : 'transparent',
                  color: '#94a3b8', border: '1px solid #334155', borderRadius: '0.25rem',
                  cursor: 'pointer', fontSize: '0.65rem', fontFamily: 'monospace'
                }}
              >
                Sites
              </button>
              <button
                onClick={() => exportCSV(result)}
                style={{
                  padding: '0.3rem 0.6rem', background: 'transparent',
                  color: '#94a3b8', border: '1px solid #334155', borderRadius: '0.25rem',
                  cursor: 'pointer', fontSize: '0.65rem', fontFamily: 'monospace'
                }}
              >
                Export CSV
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main workspace: left + center + right */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* LEFT PANEL: Sources */}
        <div style={{
          width: leftWidth,
          minWidth: leftWidth,
          borderRight: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s',
          overflow: 'hidden'
        }}>
          {leftCollapsed ? (
            <button
              onClick={() => setLeftCollapsed(false)}
              style={{
                background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
                padding: '0.75rem', fontSize: '1rem', writingMode: 'vertical-rl'
              }}
              title="Expand sources"
            >
              Sources &#9654;
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{
                padding: '0.75rem', borderBottom: '1px solid #1e293b',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
                  Sources
                </span>
                <button onClick={() => setLeftCollapsed(true)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem' }}>
                  &#9664;
                </button>
              </div>

              <div style={{ flex: 1, overflow: 'auto', padding: '0.75rem' }}>
                {/* Demo loader */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', fontFamily: 'monospace', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                    Demo Dataset
                  </div>
                  <select
                    value={selectedDemo}
                    onChange={e => setSelectedDemo(e.target.value)}
                    style={{
                      width: '100%', padding: '0.4rem', background: '#1e293b', color: '#e2e8f0',
                      border: '1px solid #334155', borderRadius: '0.25rem', fontSize: '0.75rem', marginBottom: '0.5rem'
                    }}
                  >
                    {DEMO_DATASETS.map(ds => (
                      <option key={ds.id} value={ds.id}>{ds.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={loadDemo}
                    disabled={phase !== PHASES.IDLE && phase !== PHASES.COMPLETE}
                    style={{
                      width: '100%', padding: '0.5rem', background: '#2563eb', color: 'white',
                      border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600'
                    }}
                  >
                    Load Demo
                  </button>
                </div>

                {/* Divider */}
                <div style={{ borderTop: '1px solid #1e293b', margin: '0.75rem 0' }} />

                {/* SmartUpload (compact for sidebar) */}
                <div style={{ fontSize: '0.65rem', color: '#64748b', fontFamily: 'monospace', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                  Upload Files
                </div>
                <SmartUpload onFilesChange={handleFilesChange} disabled={phase !== PHASES.IDLE && phase !== PHASES.COMPLETE} />

                {files.length > 0 && phase !== PHASES.COMPLETE && (
                  <button
                    onClick={handleProcess}
                    disabled={phase !== PHASES.IDLE}
                    style={{
                      width: '100%', padding: '0.6rem', marginTop: '0.5rem',
                      background: phase === PHASES.IDLE ? '#0f172a' : '#334155',
                      color: 'white', border: '1px solid #334155', borderRadius: '0.25rem',
                      cursor: phase === PHASES.IDLE ? 'pointer' : 'not-allowed',
                      fontSize: '0.8rem', fontWeight: '700', fontFamily: 'monospace'
                    }}
                  >
                    {phase === PHASES.IDLE ? 'PROCESS' : 'PROCESSING...'}
                  </button>
                )}
              </div>

              {/* Source summary after processing */}
              {result && files.length > 0 && (
                <div style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '0.6rem', color: '#64748b', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    Processed Sources
                  </div>
                  {files.map(f => (
                    <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', padding: '0.1rem 0', color: '#94a3b8' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>{f.name}</span>
                      <span style={{ fontFamily: 'monospace', color: '#64748b' }}>{(f.rowCount || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Reset button at bottom */}
              {result && (
                <div style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid #1e293b' }}>
                  <button
                    onClick={handleReset}
                    style={{
                      width: '100%', padding: '0.4rem', background: 'transparent',
                      color: '#64748b', border: '1px solid #334155', borderRadius: '0.25rem',
                      cursor: 'pointer', fontSize: '0.7rem', fontFamily: 'monospace'
                    }}
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CENTER: Plant Canvas */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          {/* WorldModel overlay */}
          {showWorldModel && result && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 10, background: '#0f172a',
              overflow: 'auto', padding: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>
                  Enterprise Sites
                </span>
                <button
                  onClick={() => setShowWorldModel(false)}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1rem' }}
                >
                  {'\u2715'}
                </button>
              </div>
              <WorldModel result={result} industry={industry || 'oil-gas'} />
            </div>
          )}
          {result ? (
            mapCollapsed ? (
              <div style={{ flex: 1, overflow: 'auto', background: '#0f172a', padding: '0.5rem' }}>
                <AssetTable unifiedAssets={buildUnifiedAssets(result)} result={result} />
              </div>
            ) : (
              <PlantMap
                result={result}
                industry={industry || 'oil-gas'}
                gapMatrix={result.contextAnalysis?.gapAnalysis}
                onUnitSelect={handleUnitSelect}
              />
            )
          ) : (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', color: '#334155'
            }}>
              {phase !== PHASES.IDLE ? (
                <div style={{ textAlign: 'center' }} className="ws-fade-in">
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }} className="ws-pulse">
                    {phase === PHASES.INGESTING ? '\u25A6' : phase === PHASES.RECONCILING ? '\u25A7' : phase === PHASES.MAPPING ? '\u25A8' : '\u25A9'}
                  </div>
                  <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: '#64748b' }}>
                    {phase === PHASES.INGESTING ? 'Ingesting data sources...' :
                     phase === PHASES.RECONCILING ? 'Reconciling and matching assets...' :
                     phase === PHASES.MAPPING ? 'Building plant topology...' :
                     phase === PHASES.VERIFYING ? 'Verifying against evidence...' :
                     'Running context analysis...'}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.15 }}>{'\u2B22'}</div>
                  <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', marginBottom: '0.5rem' }}>
                    No data loaded
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                    Upload files or load a demo dataset to see the plant assemble.
                  </div>
                </div>
              )}

              {error && (
                <div style={{
                  marginTop: '1.5rem', padding: '0.75rem 1rem', background: '#7f1d1d20',
                  border: '1px solid #ef4444', borderRadius: '0.25rem', color: '#ef4444',
                  fontSize: '0.8rem', maxWidth: '400px'
                }}>
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Detail */}
        {!rightCollapsed && (
          <div style={{
            width: rightWidth,
            minWidth: rightWidth,
            borderLeft: '1px solid #1e293b',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <DetailPanel
              selected={selectedAsset}
              result={result}
              onReviewDecision={handleReviewDecision}
              rightTab={rightTab}
              setRightTab={setRightTab}
            />
          </div>
        )}

        {/* Right panel toggle */}
        {result && rightCollapsed && (
          <button
            onClick={() => setRightCollapsed(false)}
            style={{
              background: 'none', border: 'none', borderLeft: '1px solid #1e293b',
              color: '#64748b', cursor: 'pointer', padding: '0.75rem', fontSize: '0.8rem',
              writingMode: 'vertical-rl'
            }}
            title="Show detail panel"
          >
            &#9664; Detail
          </button>
        )}
      </div>
    </div>
  )
}

function tick() {
  return new Promise(resolve => setTimeout(resolve, 50))
}
