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
import { buildEvidenceBundle } from './lib/core/evidence-builder.js'
import { ComplianceMapper } from './lib/core/compliance-mapper.js'
import { ReportGenerator } from './lib/core/report-generator.js'
import { evaluateClientDataContract } from './lib/core/client-data-contract.js'
import { canonicalCveCount } from './lib/core/cve-count.js'

import SmartUpload from './components/SmartUpload.jsx'
import PlantMap from './components/PlantMap.jsx'
import GapPanel from './components/GapPanel.jsx'
import SecurityPosture from './components/SecurityPosture.jsx'
import AssetTable from './components/AssetTable.jsx'
import WorldModel from './components/WorldModel.jsx'
import InventoryHeader from './components/InventoryHeader.jsx'
import LayeredTopology from './components/LayeredTopology.jsx'
import MethodologyView from './components/MethodologyView.jsx'
import DoctrineCrosswalk from './components/DoctrineCrosswalk.jsx'
import EvidenceDrawer from './components/EvidenceDrawer.jsx'
import DevicePassport from './components/DevicePassport.jsx'
import RFIReadinessView from './components/RFIReadinessView.jsx'
import RiskView from './components/RiskView.jsx'
import AgentBreakRoom from './components/AgentBreakRoom.jsx'
import { useAgenticLayer, useAgentsFromResults } from './lib/agents/useAgenticLayer.js'

// =============================================================================
// SESSION PERSISTENCE
// =============================================================================

const WS_SESSION_KEY = 'ot_workspace_session'
// localStorage budget: skip session save when the serialized payload exceeds this.
// Large enterprise datasets (>= ~32K assets) can blow past the 5 MB browser quota.
const WS_SESSION_MAX_BYTES = 4 * 1024 * 1024

function saveWorkspaceSession(data) {
  try {
    const payload = JSON.stringify({ ...data, savedAt: new Date().toISOString() })
    if (payload.length > WS_SESSION_MAX_BYTES) {
      console.info('[SESSION] Skipping save - payload exceeds localStorage budget',
        { bytes: payload.length, budget: WS_SESSION_MAX_BYTES })
      try { localStorage.removeItem(WS_SESSION_KEY) } catch { /* ignore */ }
      return
    }
    localStorage.setItem(WS_SESSION_KEY, payload)
  } catch (err) {
    // QuotaExceededError or any storage failure - silent skip and clear stale entry.
    console.info('[SESSION] Save skipped:', err && err.name ? err.name : err)
    try { localStorage.removeItem(WS_SESSION_KEY) } catch { /* ignore */ }
  }
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
// WORKSPACE STYLES (no decorative animation; assurance product)
// =============================================================================

const ASSEMBLY_CSS = `
.ws-pulse, .ws-spin, .ws-build, .ws-fade-in { animation: none; }
`

// =============================================================================
// DEMO DATASETS
// =============================================================================

const DEMO_DATASETS = [
  { id: 'automotive-large', label: 'Automotive (~12K, 5 plants)', industry: 'automotive', scale: 'large', path: '/samples/aigne/automotive/large' },
  {
    id: 'transportation-dot-large',
    label: 'Transportation / DOT (statewide demo)',
    industry: 'transportation',
    scale: 'large',
    path: '/samples/aigne/transportation/large',
    files: [
      { name: 'engineering_baseline_large.csv', detectedType: 'engineering', sourceLabel: 'Engineering baseline' },
      { name: 'ot_network_discovery_large.csv', detectedType: 'discovery', sourceLabel: 'Network discovery' },
      { name: 'ot_field_inventory_large.csv',   detectedType: 'discovery', sourceLabel: 'Field inventory' }
    ]
  },
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

const CENTER_VIEWS = {
  RFI: 'rfi',
  SECURITY: 'security',
  INVENTORY: 'inventory',
  TOPOLOGY: 'topology',
  RISK: 'risk',
  SITES: 'sites',
  METHODOLOGY: 'methodology',
  DOCTRINE: 'doctrine',
  AGENTS: 'agents'
}

// =============================================================================
// ASSEMBLY STATUS BAR
// =============================================================================

function AssemblyStatus({ phase, stats }) {
  const SYS_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  const phases = [
    { key: PHASES.INGESTING, label: 'Ingesting' },
    { key: PHASES.RECONCILING, label: 'Reconciling' },
    { key: PHASES.MAPPING, label: 'Mapping' },
    { key: PHASES.VERIFYING, label: 'Verifying' },
    { key: PHASES.ENRICHING, label: 'Enriching' },
    { key: PHASES.COMPLETE, label: 'Complete' }
  ]

  const currentIdx = phases.findIndex(p => p.key === phase)
  const isComplete = phase === PHASES.COMPLETE
  const totalRows = stats?.totalRows || 0
  const sourceCount = stats?.sourceCount || 0
  const inScope = (stats?.matched || 0) + (stats?.blindSpots || 0) + (stats?.orphans || 0)

  // Once complete the hero already restates matched / blind / orphan / coverage — collapse to one quiet line.
  // We tie the raw input rows to the reconciled in-scope count so neither number
  // looks orphaned: e.g. "428 source rows across 3 streams · 88 in-scope assets".
  if (isComplete) {
    return (
      <div style={{
        padding: '0.5rem 0.85rem',
        fontFamily: SYS_FONT,
        fontSize: '0.75rem',
        color: '#64748b',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        <span style={{ color: '#22c55e', flexShrink: 0 }}>●</span>
        <span style={{ color: '#cbd5e1', flexShrink: 0 }}>Pipeline complete</span>
        {totalRows > 0 && (
          <>
            <span style={{ color: '#1e293b', flexShrink: 0 }}>·</span>
            <span style={{ flexShrink: 0 }}>
              {totalRows.toLocaleString()} source rows{sourceCount > 0 ? ` across ${sourceCount} stream${sourceCount === 1 ? '' : 's'}` : ''}
            </span>
          </>
        )}
        {inScope > 0 && (
          <>
            <span style={{ color: '#1e293b', flexShrink: 0 }}>·</span>
            <span style={{ flexShrink: 0 }}>{inScope.toLocaleString()} in-scope assets</span>
          </>
        )}
      </div>
    )
  }

  // During processing keep a single progress line with step + live count.
  const currentLabel = phases[currentIdx]?.label || 'Working'
  return (
    <div style={{
      padding: '0.5rem 0.85rem',
      fontFamily: SYS_FONT,
      fontSize: '0.75rem',
      color: '#94a3b8',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      whiteSpace: 'nowrap'
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%', background: '#f59e0b',
        display: 'inline-block', flexShrink: 0
      }} />
      <span style={{ color: '#f8fafc' }}>{currentLabel}</span>
      <span style={{ color: '#64748b' }}>· step {Math.max(0, currentIdx) + 1} of {phases.length}</span>
      {totalRows > 0 && (
        <>
          <span style={{ color: '#1e293b' }}>·</span>
          <span>{totalRows.toLocaleString()} rows</span>
        </>
      )}
    </div>
  )
}

// =============================================================================
// RIGHT PANEL: DETAIL VIEW
// =============================================================================

function DetailPanel({ selected, result, onReviewDecision, rightTab, setRightTab }) {
  const hasInsights = Boolean(result?.assuranceInsights)
  const tabs = [
    { id: 'detail', label: 'Detail' },
    { id: 'gaps', label: 'Gaps' },
    { id: 'security', label: 'Security' }
  ]
  if (hasInsights) tabs.push({ id: 'insights', label: 'Insights' })

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      <div style={{ display: 'flex', borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setRightTab(tab.id)}
            style={{
              flex: 1,
              padding: '0.55rem 0.5rem',
              background: rightTab === tab.id ? '#0f172a' : 'transparent',
              color: rightTab === tab.id ? '#f8fafc' : '#64748b',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: rightTab === tab.id ? '600' : '400'
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
          <SecurityPosture result={result} />
        )}

        {rightTab === 'insights' && hasInsights && (
          <InsightsPanels insights={result.assuranceInsights} />
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
      <div style={{
        color: '#64748b',
        fontSize: '0.78rem',
        padding: '0.75rem 0.5rem',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }}>
        Select an asset to view its evidence trail.
      </div>
    )
  }

  if (selected._status === 'unit_summary') {
    return <UnitSummary unit={selected} />
  }

  const validationConf = selected.validation?.confidence
  const isOrphan = selected._status === 'orphan'
  const isBlindSpot = selected._status === 'blind_spot'
  const isLowConfidence = !isOrphan && !isBlindSpot && (
    validationConf === 'LOW' || (selected.matchConfidence != null && selected.matchConfidence < 70)
  )

  const cveCountForDisplay = canonicalCveCount(selected)

  let badgeLabel = 'Matched'
  let badgeBg = '#22c55e20'
  let badgeColor = '#22c55e'
  if (isBlindSpot) {
    badgeLabel = 'Blind Spot'
    badgeBg = '#7c2d1220'
    badgeColor = '#ef4444'
  } else if (isOrphan) {
    badgeLabel = 'Orphan'
    badgeBg = '#7c3aed20'
    badgeColor = '#8b5cf6'
  } else if (validationConf) {
    const lower = String(validationConf).toLowerCase()
    badgeLabel = `Matched (${lower})`
    if (validationConf === 'LOW') {
      badgeBg = '#f59e0b20'
      badgeColor = '#f59e0b'
    } else if (validationConf === 'MEDIUM') {
      badgeBg = '#fde68a20'
      badgeColor = '#facc15'
    }
  }

  return (
    <div style={{ fontSize: '0.8rem' }}>
      <div style={{ fontWeight: '700', fontSize: '1rem', color: '#f8fafc', marginBottom: '0.75rem', fontFamily: 'monospace' }}>
        {selected.tag_id || selected.asset_id || 'Unknown Asset'}
      </div>

      {/* Reconciliation badge */}
      <div style={{ marginBottom: '1rem' }}>
        <span style={{
          padding: '0.2rem 0.6rem',
          borderRadius: '0.25rem',
          fontSize: '0.65rem',
          fontWeight: '700',
          fontFamily: 'monospace',
          textTransform: 'uppercase',
          background: badgeBg,
          color: badgeColor
        }}>
          {badgeLabel}
        </span>
        {isLowConfidence && (
          <span style={{
            marginLeft: '0.5rem',
            padding: '0.2rem 0.6rem',
            borderRadius: '0.25rem',
            fontSize: '0.65rem',
            fontWeight: '700',
            fontFamily: 'monospace',
            background: '#f59e0b20',
            color: '#f59e0b'
          }}>
            Needs Review
          </span>
        )}
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

      <EvidenceDrawer asset={selected} />

      {/* Security details. cve_count is the canonical max of the
          vulnerabilities / cve_count / cve_ids fields, so we surface a single
          "Known CVEs" row rather than two near-duplicate counts. */}
      <FieldGroup title="Security" fields={[
        { label: 'Known CVEs', value: cveCountForDisplay > 0 ? `${cveCountForDisplay}` : '' },
        { label: 'Risk Score', value: selected.risk_score > 0 ? `${selected.risk_score}` : '' },
        { label: 'Managed', value: selected.is_managed === true ? 'Yes' : selected.is_managed === false ? 'No' : '' },
        { label: 'Last Patch', value: selected.last_patch_date },
        { label: 'Firmware', value: selected.firmware_version }
      ]} />

      <DevicePassport asset={selected} />

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
// UNIT SUMMARY (right panel when a unit is clicked on the map)
// =============================================================================

function UnitSummary({ unit }) {
  const matched = unit.matched ?? 0
  const blind = unit.blindSpots ?? 0
  const orphans = unit.orphans ?? 0
  const total = unit.count ?? (matched + blind + orphans)
  const documented = matched + blind
  const coverage = documented > 0 ? Math.round((matched / documented) * 100) : 0
  const subnets = Array.isArray(unit.subnets) ? unit.subnets : []
  const protocols = Array.isArray(unit.protocols) ? unit.protocols : []
  const sample = Array.isArray(unit.assets) ? unit.assets.slice(0, 5) : []

  const Stat = ({ label, value, tone }) => (
    <div style={{
      flex: 1, minWidth: '100px',
      padding: '0.6rem 0.75rem', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '0.35rem'
    }}>
      <div style={{ fontSize: '0.55rem', color: '#64748b', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'monospace', color: tone || '#f8fafc' }}>
        {value}
      </div>
    </div>
  )

  return (
    <div style={{ fontSize: '0.8rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
        <div style={{ fontWeight: '700', fontSize: '1rem', color: '#f8fafc', fontFamily: 'monospace' }}>
          {unit.name || unit.unit || 'Unit'}
        </div>
        <span style={{
          fontSize: '0.6rem', color: '#94a3b8', fontFamily: 'monospace',
          background: '#1e293b', padding: '0.15rem 0.45rem', borderRadius: '0.25rem',
          border: '1px solid #334155'
        }}>
          Unit summary
        </span>
      </div>
      {unit.site && (
        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', marginBottom: '0.75rem' }}>
          Site: {unit.site}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <Stat label="In-scope" value={total.toLocaleString()} />
        <Stat label="Documented" value={documented.toLocaleString()} />
        <Stat label="Coverage" value={`${coverage}%`} tone={coverage >= 70 ? '#22c55e' : coverage >= 50 ? '#f59e0b' : '#ef4444'} />
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <Stat label="Matched" value={matched.toLocaleString()} tone="#22c55e" />
        <Stat label="Blind Spots" value={blind.toLocaleString()} tone={blind > 0 ? '#f59e0b' : '#94a3b8'} />
        <Stat label="Orphans" value={orphans.toLocaleString()} tone={orphans > 0 ? '#a855f7' : '#94a3b8'} />
      </div>

      <FieldGroup title="Tier Mix" fields={[
        { label: 'Inferred Tier 1 Critical', value: unit.tier1 || 0 },
        { label: 'Inferred Tier 2 Networkable', value: unit.tier2 || 0 },
        { label: 'Inferred Tier 3 Passive', value: unit.tier3 || 0 }
      ]} />

      {(subnets.length > 0 || protocols.length > 0) && (
        <FieldGroup title="Network Evidence" fields={[
          { label: 'Subnets', value: subnets.length ? subnets.slice(0, 4).join(', ') + (subnets.length > 4 ? ` (+${subnets.length - 4})` : '') : '' },
          { label: 'Protocols', value: protocols.length ? protocols.slice(0, 4).join(', ') + (protocols.length > 4 ? ` (+${protocols.length - 4})` : '') : '' }
        ]} />
      )}

      {sample.length > 0 && (
        <div style={{ marginTop: '0.5rem' }}>
          <div style={{
            fontSize: '0.6rem', color: '#64748b', fontFamily: 'monospace',
            fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem'
          }}>
            Sample Assets
          </div>
          {sample.map((a, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15rem 0', borderBottom: '1px solid #1e293b' }}>
              <span style={{ color: '#e2e8f0', fontFamily: 'monospace', fontSize: '0.72rem' }}>
                {a.tag_id || a.ip_address || a.hostname || 'asset'}
              </span>
              <span style={{ color: '#64748b', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                {(a._status || 'matched').replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '0.75rem', fontSize: '0.65rem', color: '#64748b', fontFamily: 'monospace', lineHeight: 1.5 }}>
        Click any asset row in the Asset Table to inspect a single device. Use the Plant/Unit filters in the table to scope to this unit.
      </div>
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

function ThreeQuestions({ result, industry }) {
  const stats = useMemo(() => {
    if (!result) return null
    const mapModel = buildPlantMapModel(result)
    const s = mapModel.summary

    const networkedAssets = mapModel.assets.filter(a => {
      const t = a.classification?.tier || a.security_tier
      return t === 1 || t === 2
    })
    const managed = networkedAssets.filter(a => a.is_managed === true || a.is_managed === 'true')
    const withCVEs = networkedAssets.filter(a => (a.cve_count || 0) > 0)

    return {
      documented: s.documented,
      discovered: s.discovered,
      inScope: s.inScope,
      discoveryCoverage: s.discoveryCoverage,
      tier1: s.tier1,
      tier2: s.tier2,
      tier3: s.tier3,
      matched: s.matched,
      blindSpots: s.blindSpots,
      orphans: s.orphans,
      networkedTotal: networkedAssets.length,
      managed: managed.length,
      unmanaged: networkedAssets.length - managed.length,
      withCVEs: withCVEs.length
    }
  }, [result, industry])

  if (!stats) return null

  const covColor = stats.discoveryCoverage >= 70 ? '#22c55e' : stats.discoveryCoverage >= 50 ? '#f59e0b' : '#ef4444'
  const secColor = stats.unmanaged === 0 ? '#22c55e' : stats.unmanaged > 10 ? '#ef4444' : '#f59e0b'

  return (
    <div style={{ display: 'flex', gap: '1px', background: '#1e293b', borderBottom: '1px solid #1e293b' }}>
      <QCard
        label="Documented Assets"
        value={stats.documented.toLocaleString()}
        detail={`Engineering baseline \u00B7 ${stats.matched.toLocaleString()} matched \u00B7 ${stats.blindSpots.toLocaleString()} blind`}
        chip="NIST CSF ID.AM-01"
      />
      <QCard
        label="Discovery Coverage"
        value={`${stats.discoveryCoverage}%`}
        detail={`matched / documented \u00B7 ${stats.orphans.toLocaleString()} orphans on network`}
        valueColor={covColor}
        chip={'800-82r3 \u00A75.1'}
      />
      <QCard
        label={'Inferred Tier 1\u20132 Managed'}
        value={`${stats.managed.toLocaleString()}/${stats.networkedTotal.toLocaleString()}`}
        detail={stats.unmanaged > 0
          ? `${stats.unmanaged.toLocaleString()} unmanaged${stats.withCVEs > 0 ? ` \u00B7 ${stats.withCVEs.toLocaleString()} with CVEs` : ''}`
          : 'All networkable assets managed'}
        valueColor={secColor}
        chip="62443-3-2"
      />
    </div>
  )
}

function QCard({ label, value, detail, valueColor, chip }) {
  return (
    <div style={{ flex: 1, padding: '0.75rem 1rem', background: '#0f172a', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
        <span style={{ fontSize: '0.55rem', color: '#64748b', fontFamily: 'monospace', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
        {chip && (
          <span style={{
            fontSize: '0.55rem', color: '#94a3b8', fontFamily: 'monospace',
            background: '#1e293b', padding: '0.125rem 0.4rem', borderRadius: '0.2rem',
            border: '1px solid #334155', letterSpacing: '0.02em'
          }}>
            {chip}
          </span>
        )}
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

function ViewButton({ active, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.3rem 0.7rem',
        background: active ? '#0f172a' : 'transparent',
        color: active ? '#f8fafc' : '#94a3b8',
        border: `1px solid ${active ? '#334155' : 'transparent'}`,
        borderRadius: '0.3rem',
        cursor: 'pointer',
        fontSize: '0.78rem',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontWeight: active ? 600 : 500
      }}
    >
      {label}
    </button>
  )
}

function MethodologyPrimer({ phase, stats }) {
  const currentPhaseLabel =
    phase === PHASES.INGESTING ? 'Ingesting source files' :
    phase === PHASES.RECONCILING ? 'Reconciling engineering baseline vs network discovery vs field inventory' :
    phase === PHASES.MAPPING ? 'Classifying and validating assets' :
    phase === PHASES.VERIFYING ? 'Cross-validating evidence claims' :
    phase === PHASES.ENRICHING ? 'Enriching with context and risk' :
    phase === PHASES.COMPLETE ? 'Ready' :
    'Awaiting input'

  const stepStyle = {
    border: '1px solid #1e293b',
    borderRadius: '0.4rem',
    background: '#0b1220',
    padding: '0.45rem 0.55rem'
  }

  const ingestedRows = stats?.totalRows || 0
  const matched = stats?.matched || 0
  const blindSpots = stats?.blindSpots || 0
  const orphans = stats?.orphans || 0
  const coverage = stats?.coverage || 0

  return (
    <div style={{
      width: 'min(980px, 96%)',
      border: '1px solid #1e293b',
      borderRadius: '0.6rem',
      background: '#020617',
      padding: '0.75rem',
      color: '#cbd5e1'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.55rem' }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: '#f8fafc', fontWeight: 700, fontFamily: 'monospace' }}>
            Assurance Methodology
          </div>
          <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
            Canonical pipeline for converging engineering and network evidence.
          </div>
        </div>
        <span style={{
          border: '1px solid #334155',
          background: '#111827',
          color: '#94a3b8',
          borderRadius: '999px',
          padding: '0.15rem 0.5rem',
          fontFamily: 'monospace',
          fontSize: '0.62rem'
        }}>
          {currentPhaseLabel}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.45rem', marginBottom: '0.55rem' }}>
        <div style={stepStyle}>
          <div style={{ fontSize: '0.62rem', color: '#64748b', fontFamily: 'monospace', textTransform: 'uppercase' }}>1. Ingest + normalize</div>
          <div style={{ fontSize: '0.7rem', marginTop: '0.15rem' }}>Load CSV sources and standardize IDs/fields for matching.</div>
        </div>
        <div style={stepStyle}>
          <div style={{ fontSize: '0.62rem', color: '#64748b', fontFamily: 'monospace', textTransform: 'uppercase' }}>2. Reconcile + classify</div>
          <div style={{ fontSize: '0.7rem', marginTop: '0.15rem' }}>Deterministic matching and rule-based tier/device class assignment.</div>
        </div>
        <div style={stepStyle}>
          <div style={{ fontSize: '0.62rem', color: '#64748b', fontFamily: 'monospace', textTransform: 'uppercase' }}>3. Validate + enrich</div>
          <div style={{ fontSize: '0.7rem', marginTop: '0.15rem' }}>Attach evidence status, risk context, and topology-level insights.</div>
        </div>
        <div style={stepStyle}>
          <div style={{ fontSize: '0.62rem', color: '#64748b', fontFamily: 'monospace', textTransform: 'uppercase' }}>4. Visualize + drill down</div>
          <div style={{ fontSize: '0.7rem', marginTop: '0.15rem' }}>RFI, Security, Inventory, Topology, and Methodology views from one denominator.</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '0.45rem' }}>
        <div style={stepStyle}>
          <div style={{ fontSize: '0.62rem', color: '#64748b', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
            Core routines (commands used)
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.67rem', color: '#94a3b8', lineHeight: 1.6, wordBreak: 'break-word' }}>
            {'normalizeDataset -> performMatching -> classifySecurityTier -> crossValidate -> addDeviceContext -> addLifecycleStatus -> analyzeAllGaps -> analyzePortfolioRisk -> buildEvidenceBundle'}
          </div>
        </div>
        <div style={stepStyle}>
          <div style={{ fontSize: '0.62rem', color: '#64748b', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
            AI usage
          </div>
          <div style={{ fontSize: '0.69rem', color: '#94a3b8', lineHeight: 1.55 }}>
            Core reconciliation and denominator metrics are deterministic (no AI required). Optional AI enrichment runs only when extra source types are present and the flexible API route is available.
          </div>
        </div>
      </div>

      <div style={{ marginTop: '0.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.45rem' }}>
        <div style={stepStyle}>
          <div style={{ fontSize: '0.62rem', color: '#64748b', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
            What we have so far
          </div>
          <div style={{ fontSize: '0.69rem', color: '#94a3b8', lineHeight: 1.55 }}>
            {ingestedRows > 0
              ? `${ingestedRows.toLocaleString()} rows ingested, ${matched.toLocaleString()} matched, ${blindSpots.toLocaleString()} blind spots, ${orphans.toLocaleString()} orphans, ${coverage}% discovery coverage.`
              : 'No dataset loaded yet. Start with engineering baseline + OT discovery to establish the in-scope denominator.'}
          </div>
        </div>
        <div style={stepStyle}>
          <div style={{ fontSize: '0.62rem', color: '#64748b', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
            Security follow-up
          </div>
          <div style={{ fontSize: '0.69rem', color: '#94a3b8', lineHeight: 1.55 }}>
            After reconciliation: verify unmanaged inferred Tier 1-2 assets, CVE exposure, and boundary weak points for risk-ranked remediation.
          </div>
        </div>
        <div style={stepStyle}>
          <div style={{ fontSize: '0.62rem', color: '#64748b', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
            Performance follow-up
          </div>
          <div style={{ fontSize: '0.69rem', color: '#94a3b8', lineHeight: 1.55 }}>
            After enrichment: check telemetry freshness (`last_seen`), lifecycle risk (`eol/eos/obsolete`), and operational drift by site/unit.
          </div>
        </div>
      </div>
      <div style={{ marginTop: '0.45rem', fontSize: '0.66rem', color: '#64748b', fontFamily: 'monospace' }}>
        Tier calls are provisional heuristics from available data. Final criticality and zone decisions require control/cyber SME validation.
      </div>
    </div>
  )
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Merge multiple discovery streams (e.g. network discovery + field walkdown)
 * into a single record per tag_id. Field-level merge: each column is filled
 * from whichever source has a non-empty value. Source provenance is tracked
 * in `_sourceLabels` so downstream UI can show cross-validation.
 */
function mergeDiscoveryDuplicates(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return []
  const byTag = new Map()
  const noTag = []

  for (const row of rows) {
    if (!row?.tag_id) {
      noTag.push({ ...row, _sourceLabels: row._sourceLabel ? [row._sourceLabel] : [] })
      continue
    }
    const existing = byTag.get(row.tag_id)
    if (!existing) {
      byTag.set(row.tag_id, {
        ...row,
        _sourceLabels: row._sourceLabel ? [row._sourceLabel] : []
      })
      continue
    }
    const merged = { ...existing }
    for (const key of Object.keys(row)) {
      if (key === '_sourceLabel' || key === '_sourceLabels') continue
      const incoming = row[key]
      const current = merged[key]
      const incomingEmpty = incoming === undefined || incoming === null || incoming === '' || incoming === 0
      const currentEmpty = current === undefined || current === null || current === '' || current === 0
      if (!incomingEmpty && currentEmpty) merged[key] = incoming
    }
    const labels = new Set(existing._sourceLabels || [])
    if (row._sourceLabel) labels.add(row._sourceLabel)
    merged._sourceLabels = Array.from(labels)
    byTag.set(row.tag_id, merged)
  }

  return [...byTag.values(), ...noTag]
}

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

function downloadTextFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function exportEngagementReport(result, industry) {
  if (!result) return

  let report = result.report
  let generator = new ReportGenerator({
    industry: industry || 'oil-gas',
    clientName: 'Client',
    plantName: 'All Sites',
    assessor: 'OT Assurance Twin'
  })

  if (!report) {
    const contextAnalysis = {
      gaps: result.contextAnalysis?.gapAnalysis?.gaps || [],
      risks: result.contextAnalysis?.riskAnalysis || {},
      dependencies: result.contextAnalysis?.dependencyMap || {},
      lifecycle: result.contextAnalysis?.lifecycleSummary || {}
    }
    report = generator.generateReport(result, contextAnalysis)
  }

  const md = generator.toExecutiveMarkdown(report)
  const gapMatrixCsv = generator.toGapMatrixCSV(report)
  const riskHeatCsv = generator.toRiskHeatMapCSV(report)

  const date = new Date().toISOString().split('T')[0]
  downloadTextFile(md, `assurance-rfi-brief-${date}.md`, 'text/markdown')
  downloadTextFile(gapMatrixCsv, `assurance-gap-matrix-${date}.csv`, 'text/csv')
  downloadTextFile(riskHeatCsv, `assurance-risk-heatmap-${date}.csv`, 'text/csv')
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
  const [selectedDemo, setSelectedDemo] = useState('transportation-dot-large')
  const [reviewDecisions, setReviewDecisions] = useState({})
  const [activeView, setActiveView] = useState(CENTER_VIEWS.INVENTORY)
  const [tableSearchPreset, setTableSearchPreset] = useState('')
  const [tableFilterPreset, setTableFilterPreset] = useState('all')
  const [tablePlantPreset, setTablePlantPreset] = useState('all')
  const [mapCollapsed, setMapCollapsed] = useState(true)

  const unifiedAssets = useMemo(() => buildUnifiedAssets(result), [result])
  const mapModel = useMemo(() => {
    if (!result) return null
    return buildPlantMapModel(result)
  }, [result])

  // Multi-agent reasoning layer. Rule-based (llmClient stays null) so the
  // cross-agent findings are deterministic and every claim traces to evidence.
  // useAgentsFromResults builds one PlantAgent (with security/risk/gap/
  // dependency/lifecycle sub-agents) per plant from the canonical contextAnalysis
  // and runs an initial observation round.
  const agentLayer = useAgenticLayer({ enabled: Boolean(result), llmClient: null })
  useAgentsFromResults(agentLayer, result, industry)

  const compliancePack = useMemo(() => {
    const gapAnalysis = result?.contextAnalysis?.gapAnalysis
    const gaps = gapAnalysis?.gaps || []
    if (gaps.length === 0) return { findings: [], summary: null, unitCompliance: [] }

    try {
      const mapper = new ComplianceMapper(industry || result?.contextAnalysis?.industry || 'oil-gas')
      const findings = mapper.mapGaps(gaps)
      return {
        findings,
        summary: mapper.generateComplianceSummary(findings),
        unitCompliance: mapper.generateUnitCompliance(findings)
      }
    } catch (err) {
      console.warn('[WORKSPACE] Compliance mapping error:', err)
      return { findings: [], summary: null, unitCompliance: [] }
    }
  }, [industry, result])

  // Persist when result changes
  React.useEffect(() => {
    if (result) saveWorkspaceSession({ result, stats, industry })
  }, [result, stats, industry])

  const handleInventoryDrillDown = useCallback((query) => {
    if (!query) return
    if (typeof query === 'string' && query.startsWith('status:')) {
      const raw = query.slice(7)
      const allowed = ['matched', 'blind_spot', 'orphan', 'all']
      setTableFilterPreset(allowed.includes(raw) ? raw : 'all')
      setTableSearchPreset('')
    } else if (typeof query === 'string' && query.startsWith('plant:')) {
      const raw = query.slice(6)
      setTablePlantPreset(raw || 'all')
    } else {
      setTableSearchPreset(query)
      setTableFilterPreset('all')
    }
    setActiveView(CENTER_VIEWS.INVENTORY)
    setMapCollapsed(true)
  }, [])

  const handleRiskDrillDown = useCallback((asset) => {
    if (!asset) return
    setSelectedAsset(asset)
    setRightTab('detail')
    setRightCollapsed(false)
  }, [])

  // ---- PROCESSING PIPELINE ----

  const processData = useCallback(async (smartFiles, industryOverride) => {
    if (!smartFiles || smartFiles.length === 0) return

    setError(null)
    setResult(null)
    setSelectedAsset(null)
    setRightCollapsed(true)

    // loadDemo calls setIndustry then processData in the same tick, so the
    // closure's `industry` is still stale. Accept an explicit override.
    const effectiveIndustry = industryOverride ?? industry

    try {
      // Match the contract profile to the active industry so the RFI view
      // defaults to the right doctrine (e.g. transportation-dot for DOT).
      const profileForIndustry = effectiveIndustry === 'transportation' ? 'transportation-dot' : undefined
      const clientAlignment = evaluateClientDataContract(smartFiles, profileForIndustry)

      // Phase 1: Ingest
      setPhase(PHASES.INGESTING)
      const provenance = new ProvenanceTracker()
      const afs = getAFS()
      provenance.record({ type: 'PIPELINE_START' })
      provenance.record({
        type: 'CLIENT_CONTRACT_EVALUATED',
        profile: clientAlignment.profileId,
        contractReady: clientAlignment.contractReady,
        missingRequiredTypes: clientAlignment.missingRequiredTypes
      })

      let allEngineering = []
      let allDiscovery = []
      let totalRows = 0
      const sourceFileIds = []
      // Per-source row counts (e.g. "Engineering baseline" / "Network discovery"
      // / "Field inventory") so the UI can render the three-stream breakdown.
      const sourceBreakdown = []

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

        // Stamp each row with its source label so the merge step downstream
        // can attribute matches to the right stream.
        const sourceLabel = sf.sourceLabel
          || (sf.detectedType === 'engineering' ? 'Engineering baseline'
            : sf.name?.toLowerCase().includes('field') ? 'Field inventory'
              : 'Network discovery')
        for (const r of rows) r._sourceLabel = sourceLabel

        if (sf.detectedType === 'engineering') {
          allEngineering.push(...rows)
        } else {
          allDiscovery.push(...rows)
        }

        sourceBreakdown.push({
          label: sourceLabel,
          detectedType: sf.detectedType,
          name: sf.name,
          rowCount: rows.length
        })

        provenance.recordSourceIngestion(fileId, sf.name, null, rows.length, sf.detectedType)
      }

      // When the same tag_id appears in multiple discovery streams (e.g. a
      // signal controller seen by both network discovery and the field
      // walkdown), merge them into one record with combined evidence. The
      // matcher is one-to-one, so without this dedupe the second source's row
      // would become a phantom orphan.
      allDiscovery = mergeDiscoveryDuplicates(allDiscovery)

      setStats({ totalRows, sourceCount: sourceBreakdown.length })

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
          cve_ids: match.discovered?.cve_ids || '',
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

      // Per-source row counts for the UI breakdown (e.g. "Engineering baseline
      // 80 · Network discovery 55 · Field inventory 64"). Also compute
      // cross-validation counts based on which sources observed each tag.
      const crossValidated = canonicalAssets.filter(a =>
        Array.isArray(a.discovered?._sourceLabels) && a.discovered._sourceLabels.length >= 2
      ).length

      const summary = {
        total: matchResults.stats.engineeringTotal,
        matched: matchResults.stats.matchedCount,
        blindSpots: matchResults.stats.blindSpotCount,
        orphans: matchResults.stats.orphanCount,
        coverage: matchResults.stats.coveragePercent,
        sources: sourceBreakdown,
        crossValidated,
        tier1: [...canonicalAssets, ...blindSpots].filter(a => a.classification?.tier === 1).length,
        tier2: [...canonicalAssets, ...blindSpots].filter(a => a.classification?.tier === 2).length,
        tier3: [...canonicalAssets, ...blindSpots].filter(a => a.classification?.tier === 3).length
      }

      // Phase 5: Enrich (context analysis)
      setPhase(PHASES.ENRICHING)
      await tick()

      let contextAnalysis = null
      try {
        const ind = effectiveIndustry || 'oil-gas'
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

      const baseAssets = contextAnalysis?.assets || canonicalAssets
      const evidenceBundle = buildEvidenceBundle({
        assets: baseAssets,
        blindSpots,
        orphans
      })

      const audit = await provenance.generateAuditPackage(evidenceBundle.assets, summary)

      let report = null
      try {
        const generator = new ReportGenerator({
          industry: effectiveIndustry || contextAnalysis?.industry || 'oil-gas',
          clientName: 'Client',
          plantName: 'All Sites',
          assessor: 'OT Assurance Twin'
        })
        report = generator.generateReport(
          {
            status: 'COMPLETE',
            assets: evidenceBundle.assets,
            blindSpots: evidenceBundle.blindSpots,
            orphans: evidenceBundle.orphans,
            summary
          },
          {
            gaps: contextAnalysis?.gapAnalysis?.gaps || [],
            risks: contextAnalysis?.riskAnalysis || {},
            dependencies: contextAnalysis?.dependencyMap || {},
            lifecycle: contextAnalysis?.lifecycleSummary || {}
          }
        )
      } catch (reportErr) {
        console.warn('[WORKSPACE] Report generation failed:', reportErr)
      }

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
            body: JSON.stringify({ sources, industry: effectiveIndustry || 'oil-gas' })
          })
          if (flexRes.ok) {
            const flexData = await flexRes.json()
            if (flexData.assuranceInsights) assuranceInsights = flexData.assuranceInsights
          }
        } catch (flexErr) {
          console.warn('[WORKSPACE] Flexible enrichment unavailable:', flexErr.message)
        }
      }

      const sourceFiles = smartFiles.map(sf => ({
        name: sf.name,
        detectedType: sf.detectedType,
        headers: sf.headers || [],
        rowCount: sf.rowCount || 0
      }))

      const data = {
        status: 'COMPLETE',
        assets: evidenceBundle.assets,
        blindSpots: evidenceBundle.blindSpots,
        orphans: evidenceBundle.orphans,
        summary,
        reviewRequired: reviewItems,
        contextAnalysis,
        evidenceSummary: evidenceBundle.summary,
        assuranceInsights,
        audit,
        report,
        clientAlignment,
        sourceFiles,
        fileCatalog: afs.getCatalog()
      }

      setResult(data)
      setPhase(PHASES.COMPLETE)
      setRightCollapsed(false)
      setRightTab('detail')
      setActiveView(CENTER_VIEWS.INVENTORY)
      setTableSearchPreset('')
      setTableFilterPreset('all')
      setTablePlantPreset('all')
      setMapCollapsed(true)
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

    // Datasets can declare an explicit file list with source labels (used by
    // the transportation demo so we can show Engineering / Network discovery /
    // Field inventory as three distinct source streams). Otherwise fall back
    // to the legacy 2-file convention.
    const fileSpecs = dataset.files || (isAigne
      ? [
          { name: `engineering_baseline_${dataset.scale}.csv`, detectedType: 'engineering', sourceLabel: 'Engineering baseline' },
          { name: `ot_discovery_${dataset.scale}.csv`, detectedType: 'discovery', sourceLabel: 'Network discovery' }
        ]
      : [
          { name: 'engineering_baseline_medium.csv', detectedType: 'engineering', sourceLabel: 'Engineering baseline' },
          { name: 'ot_discovery_medium.csv', detectedType: 'discovery', sourceLabel: 'Network discovery' }
        ])

    setPhase(PHASES.INGESTING)
    setError(null)
    setIndustry(dataset.industry)

    try {
      const smartFiles = []
      for (const spec of fileSpecs) {
        const res = await fetch(`${basePath}/${spec.name}`)
        if (!res.ok) { console.warn(`[DEMO] Failed: ${spec.name}`); continue }
        const content = await res.text()
        const parsed = Papa.parse(content, { header: true, skipEmptyLines: true, preview: 100 })
        const headers = parsed.meta.fields || []
        const { type } = detectSourceType(headers, spec.name)
        smartFiles.push({
          id: `demo-${spec.name}-${Date.now()}`,
          name: spec.name,
          content,
          detectedType: spec.detectedType || type || (spec.name.includes('engineering') ? 'engineering' : 'discovery'),
          sourceLabel: spec.sourceLabel || null,
          rowCount: content.split('\n').length - 1,
          headers
        })
      }
      setFiles(smartFiles)
      await processData(smartFiles, dataset.industry)
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

    // Pull the canonical unit aggregate from the plant model so every number
    // (matched / blind / orphan / tier mix) lines up with the rest of the UI.
    const model = buildPlantMapModel(result)
    const unitName = unit.name || unit.unit
    const aggregate = model.units.find(u => u.name === unitName) || null

    if (aggregate) {
      setSelectedAsset({
        ...aggregate,
        _status: 'unit_summary',
        unit: aggregate.name,
        plant: aggregate.site
      })
    } else {
      // Fallback: synthesize from raw asset list when the model has no entry.
      const allAssets = buildUnifiedAssets(result)
      const unitAssets = allAssets.filter(a =>
        (a.unit || a.area || a.location || 'Unassigned') === unitName
      )
      setSelectedAsset({
        _status: 'unit_summary',
        name: unitName,
        unit: unitName,
        site: unit.site || unit.plant || '',
        count: unitAssets.length,
        matched: unitAssets.filter(a => a._status === 'matched').length,
        blindSpots: unitAssets.filter(a => a._status === 'blind_spot').length,
        orphans: unitAssets.filter(a => a._status === 'orphan').length,
        tier1: unitAssets.filter(a => (a.classification?.tier || a.security_tier) === 1).length,
        tier2: unitAssets.filter(a => (a.classification?.tier || a.security_tier) === 2).length,
        tier3: unitAssets.filter(a => (a.classification?.tier || a.security_tier) === 3).length,
        assets: unitAssets,
        subnets: [],
        protocols: []
      })
    }

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
    setRightTab('detail')
    setActiveView(CENTER_VIEWS.INVENTORY)
    setTableSearchPreset('')
    setTableFilterPreset('all')
    setTablePlantPreset('all')
    setMapCollapsed(true)
  }, [])

  // ---- LAYOUT ----

  const leftWidth = leftCollapsed ? 48 : 280
  const rightWidth = rightCollapsed ? 0 : 340

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: 'calc(100vh - 80px)',
      background: '#0f172a',
      color: '#e2e8f0',
      overflow: 'visible',
      borderRadius: '0.5rem'
    }}>
      <style>{ASSEMBLY_CSS}</style>
      {result && (
        <InventoryHeader
          model={mapModel}
          assets={unifiedAssets}
          onDrillDown={handleInventoryDrillDown}
          activePlant={tablePlantPreset}
          industry={industry}
        />
      )}

      {/* Assembly status + toolbar */}
      {phase !== PHASES.IDLE && (
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #1e293b' }}>
          <div style={{ flex: 1 }}>
            <AssemblyStatus phase={phase} stats={stats} />
          </div>
          {result && (
            <div style={{ display: 'flex', gap: '0.5rem', padding: '0 0.75rem', flexShrink: 0 }}>
              {/* Demo narrative order:
                 denominator → reality → promise vs delivery → what to chase →
                 specific exposures → what we'd hand back → how we got here.
                 See pre-demo review (docs/demo/) for the rationale. */}
              <ViewButton active={activeView === CENTER_VIEWS.INVENTORY} label="Inventory" onClick={() => setActiveView(CENTER_VIEWS.INVENTORY)} />
              <ViewButton active={activeView === CENTER_VIEWS.TOPOLOGY} label="Topology" onClick={() => setActiveView(CENTER_VIEWS.TOPOLOGY)} />
              <ViewButton active={activeView === CENTER_VIEWS.SITES} label="Sites" onClick={() => setActiveView(CENTER_VIEWS.SITES)} />
              {industry === 'transportation' && (
                <ViewButton active={activeView === CENTER_VIEWS.DOCTRINE} label="Doctrine" onClick={() => setActiveView(CENTER_VIEWS.DOCTRINE)} />
              )}
              <ViewButton active={activeView === CENTER_VIEWS.RISK} label="Risk" onClick={() => setActiveView(CENTER_VIEWS.RISK)} />
              <ViewButton active={activeView === CENTER_VIEWS.SECURITY} label="Security" onClick={() => setActiveView(CENTER_VIEWS.SECURITY)} />
              <ViewButton active={activeView === CENTER_VIEWS.RFI} label="RFI" onClick={() => setActiveView(CENTER_VIEWS.RFI)} />
              <ViewButton active={activeView === CENTER_VIEWS.AGENTS} label="Agents" onClick={() => setActiveView(CENTER_VIEWS.AGENTS)} />
              <ViewButton active={activeView === CENTER_VIEWS.METHODOLOGY} label="Methodology" onClick={() => setActiveView(CENTER_VIEWS.METHODOLOGY)} />
              <button
                onClick={() => exportCSV(result)}
                style={{
                  padding: '0.3rem 0.7rem', background: 'transparent',
                  color: '#94a3b8', border: '1px solid #334155', borderRadius: '0.3rem',
                  cursor: 'pointer', fontSize: '0.78rem',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  fontWeight: 500
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
          {result ? (
            activeView === CENTER_VIEWS.SITES ? (
              <div style={{ flex: 1, overflow: 'auto', padding: '0.75rem' }}>
                <WorldModel result={result} industry={industry || 'oil-gas'} />
              </div>
            ) : activeView === CENTER_VIEWS.RFI ? (
              <RFIReadinessView
                result={result}
                industry={industry}
                complianceSummary={compliancePack.summary}
                onDrillDown={handleInventoryDrillDown}
                onOpenSecurity={() => setActiveView(CENTER_VIEWS.SECURITY)}
                onExportBrief={() => exportEngagementReport(result, industry)}
              />
            ) : activeView === CENTER_VIEWS.SECURITY ? (
              <div style={{ flex: 1, overflow: 'auto', padding: '0.75rem' }}>
                <SecurityPosture result={result} />
              </div>
            ) : activeView === CENTER_VIEWS.TOPOLOGY ? (
              <LayeredTopology result={result} industry={industry} onDrillDown={handleInventoryDrillDown} />
            ) : activeView === CENTER_VIEWS.RISK ? (
              <div style={{ flex: 1, overflow: 'auto', padding: '0.75rem' }}>
                <RiskView riskAnalysis={result.contextAnalysis?.riskAnalysis} onAssetClick={handleRiskDrillDown} />
              </div>
            ) : activeView === CENTER_VIEWS.METHODOLOGY ? (
              <MethodologyView result={result} />
            ) : activeView === CENTER_VIEWS.DOCTRINE ? (
              <DoctrineCrosswalk result={result} industry={industry} onDrillDown={handleInventoryDrillDown} />
            ) : activeView === CENTER_VIEWS.AGENTS ? (
              <AgentBreakRoom
                breakRoom={agentLayer.breakRoom}
                agents={agentLayer.plantAgents}
                isObserving={agentLayer.isObserving}
                lastObservation={agentLayer.lastObservation}
                onObserve={agentLayer.observe}
              />
            ) : mapCollapsed ? (
              <div style={{ flex: 1, overflow: 'auto', background: '#0f172a', padding: '0.5rem' }}>
                <AssetTable
                  unifiedAssets={unifiedAssets}
                  result={result}
                  selectedAsset={selectedAsset}
                  searchPreset={tableSearchPreset}
                  filterPreset={tableFilterPreset}
                  plantPreset={tablePlantPreset}
                  onPlantChange={setTablePlantPreset}
                  onSelectAsset={asset => {
                    setSelectedAsset(asset)
                    if (asset) {
                      setRightTab('detail')
                      setRightCollapsed(false)
                    }
                  }}
                />
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
              <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.9rem', fontFamily: 'monospace', marginBottom: '0.35rem', color: '#cbd5e1' }}>
                  {phase !== PHASES.IDLE
                    ? (phase === PHASES.INGESTING ? 'Ingesting data sources' :
                      phase === PHASES.RECONCILING ? 'Reconciling engineering and discovery' :
                      phase === PHASES.MAPPING ? 'Classifying and validating' :
                      phase === PHASES.VERIFYING ? 'Cross-validating evidence' :
                      'Running context analysis')
                    : 'No data loaded'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {phase !== PHASES.IDLE
                    ? 'Building canonical inventory and evidence-backed topology.'
                    : 'Upload files or load a demo dataset to begin.'}
                </div>
              </div>

              <MethodologyPrimer phase={phase} stats={stats} />

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
