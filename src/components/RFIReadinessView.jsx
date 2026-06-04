import React, { useMemo, useState } from 'react'
import {
  capStatusWithContract,
  evaluateClientDataContract,
  CLIENT_CONTRACT_PROFILES,
  DEFAULT_CONTRACT_PROFILE
} from '../lib/core/client-data-contract.js'
import { assetHasCves } from '../lib/core/cve-count.js'

function allAssets(result) {
  return [
    ...(result?.assets || []).map(asset => ({ ...asset, _status: asset?._status || asset?.match_type || 'matched' })),
    ...(result?.blindSpots || []).map(asset => ({ ...asset, _status: 'blind_spot' })),
    ...(result?.orphans || []).map(asset => ({ ...asset, _status: 'orphan' }))
  ]
}

function hasValue(asset, keys) {
  return keys.some(key => {
    const value = asset?.[key]
    if (value === 0) return true
    if (typeof value === 'string') return value.trim().length > 0
    if (Array.isArray(value)) return value.length > 0
    return value != null
  })
}

function pct(count, total) {
  if (!total) return 0
  return Math.round((count / total) * 100)
}

function statusFromPercent(percent) {
  if (percent >= 80) return 'met'
  if (percent >= 45) return 'partial'
  return 'gap'
}

function statusForGapCount(gapCount) {
  if (gapCount === 0) return 'met'
  if (gapCount < 5) return 'partial'
  return 'gap'
}

const STATUS_STYLE = {
  met: { label: 'Met', color: '#22c55e', bg: '#14532d33', border: '#166534' },
  partial: { label: 'Partial', color: '#f59e0b', bg: '#78350f33', border: '#92400e' },
  gap: { label: 'Gap', color: '#ef4444', bg: '#7f1d1d33', border: '#991b1b' }
}

const SYS_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

// Shared ghost-pill action button. One language for all secondary actions so
// the RFI view reads as the same product as Inventory / Topology / Doctrine.
const GHOST_BUTTON = {
  border: '1px solid #334155',
  background: 'transparent',
  borderRadius: '0.3rem',
  color: '#cbd5e1',
  fontFamily: SYS_FONT,
  fontSize: '0.72rem',
  fontWeight: 500,
  padding: '0.25rem 0.6rem',
  cursor: 'pointer'
}

function RequirementCard({ item, onDrillDown, onOpenSecurity }) {
  const tone = STATUS_STYLE[item.status] || STATUS_STYLE.gap

  return (
    <div style={{
      border: `1px solid ${tone.border}`,
      background: tone.bg,
      borderRadius: '0.45rem',
      padding: '0.55rem 0.6rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
        <div style={{ color: '#f8fafc', fontFamily: 'monospace', fontSize: '0.68rem', fontWeight: 700 }}>
          {item.id} — {item.title}
        </div>
        <span style={{
          border: `1px solid ${tone.border}`,
          borderRadius: '999px',
          padding: '0.08rem 0.45rem',
          color: tone.color,
          fontFamily: 'monospace',
          fontSize: '0.6rem',
          fontWeight: 700
        }}>
          {tone.label}
        </span>
      </div>

      <div style={{ color: '#cbd5e1', fontSize: '0.69rem', lineHeight: 1.45, marginBottom: '0.25rem' }}>
        <strong>Evidence basis:</strong> {item.evidence}
      </div>
      <div style={{ color: '#94a3b8', fontSize: '0.69rem', lineHeight: 1.45 }}>
        <strong>Closure action:</strong> {item.closureAction}
      </div>

      <div style={{ marginTop: '0.45rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {item.drillQuery && (
          <button
            onClick={() => onDrillDown?.(item.drillQuery)}
            style={GHOST_BUTTON}
          >
            Open evidence rows
          </button>
        )}
        {(item.status === 'partial' || item.status === 'gap') && (
          <button
            onClick={() => onOpenSecurity?.()}
            style={GHOST_BUTTON}
          >
            Open closure priorities
          </button>
        )}
      </div>
    </div>
  )
}

function inferDefaultProfile(result, industry) {
  if (result?.clientAlignment?.profileId) return result.clientAlignment.profileId
  if (industry === 'transportation') return 'transportation-dot'
  return DEFAULT_CONTRACT_PROFILE
}

export default function RFIReadinessView({ result, industry, complianceSummary, onDrillDown, onOpenSecurity, onExportBrief }) {
  const [profileId, setProfileId] = useState(() => inferDefaultProfile(result, industry))
  const sourceFiles = result?.sourceFiles || []

  const alignment = useMemo(() => {
    if (sourceFiles.length === 0) return result?.clientAlignment || null
    return evaluateClientDataContract(sourceFiles, profileId)
  }, [sourceFiles, profileId, result])

  const model = useMemo(() => {
    const assets = allAssets(result)
    const total = assets.length
    const summary = result?.summary || {}
    const gapSummary = result?.contextAnalysis?.gapAnalysis?.summary
    const capability = alignment?.capabilities || {}
    const isCapReady = key => Boolean(alignment) && Boolean(capability[key])

    const deviceTypeCoverage = pct(
      assets.filter(asset => hasValue(asset, ['device_type'])).length,
      total
    )
    const locationCoverage = pct(
      assets.filter(asset => hasValue(asset, ['plant', 'site', 'facility']) && hasValue(asset, ['unit', 'area', 'location'])).length,
      total
    )
    const manufacturerCoverage = pct(
      assets.filter(asset => hasValue(asset, ['manufacturer', 'vendor', 'oem'])).length,
      total
    )
    const firmwareCoverage = pct(
      assets.filter(asset => hasValue(asset, ['firmware_version', 'firmware', 'fw_version'])).length,
      total
    )
    const maintenanceCoverage = pct(
      assets.filter(asset => hasValue(asset, ['maintenance_provider', 'service_provider', 'maintainer', 'owner'])).length,
      total
    )
    const interfaceCoverage = pct(
      assets.filter(asset => hasValue(asset, ['protocol', 'network_segment', 'interfacing_devices', 'interfacing_device_count'])).length,
      total
    )
    const cveCoverage = pct(
      assets.filter(asset => assetHasCves(asset) || hasValue(asset, ['cve_ids', 'cve_count', 'vulnerabilities'])).length,
      total
    )
    const cvssCoverage = pct(
      assets.filter(asset => hasValue(asset, ['cvss', 'cvss_score'])).length,
      total
    )
    const epssCoverage = pct(
      assets.filter(asset => hasValue(asset, ['epss', 'epss_score'])).length,
      total
    )
    const cweCoverage = pct(
      assets.filter(asset => hasValue(asset, ['cwe', 'cwe_ids'])).length,
      total
    )
    const telemetryCoverage = pct(
      assets.filter(asset => hasValue(asset, ['last_seen'])).length,
      total
    )
    const riskCoverage = pct(
      assets.filter(asset => hasValue(asset, ['risk_score'])).length,
      total
    )
    const configCoverage = pct(
      assets.filter(asset => hasValue(asset, ['login_attempts_before_lockout', 'lockout_threshold', 'remote_access', 'ssh_enabled'])).length,
      total
    )
    const ownershipCoverage = pct(
      assets.filter(asset => hasValue(asset, ['asset_owner', 'owner', 'responsible_team'])).length,
      total
    )
    const remoteAccessCoverage = pct(
      assets.filter(asset => hasValue(asset, ['remote_access', 'ssh_enabled', 'rdp_enabled'])).length,
      total
    )

    const requirements = [
      {
        id: '2.1',
        title: 'OT device type inventory',
        status: capStatusWithContract(statusFromPercent(deviceTypeCoverage), isCapReady('inventoryDenominator')),
        evidence: `${deviceTypeCoverage}% of in-scope records include ` + '`device_type`' + ` classification.`,
        closureAction: 'Prioritize unknown/untyped assets for source enrichment and ontology remap.',
        drillQuery: 'unclassified'
      },
      {
        id: '2.2',
        title: 'Per-device identity and pedigree',
        status: capStatusWithContract(statusFromPercent(Math.round((locationCoverage + manufacturerCoverage + firmwareCoverage + interfaceCoverage) / 4)), isCapReady('devicePassport')),
        evidence: `Location ${locationCoverage}% · Manufacturer ${manufacturerCoverage}% · Firmware ${firmwareCoverage}% · Interface context ${interfaceCoverage}%.`,
        closureAction: 'Use Device Passport to fill missing manufacturer/firmware/interface fields from CMDB and scans.',
        drillQuery: 'firmware'
      },
      {
        id: '2.3',
        title: 'Vulnerability risk attributes (CVE/CVSS/EPSS/CWE)',
        status: capStatusWithContract(statusFromPercent(Math.round((cveCoverage + cvssCoverage + epssCoverage + cweCoverage) / 4)), isCapReady('vulnerabilityEvidence')),
        evidence: `CVE ${cveCoverage}% · CVSS ${cvssCoverage}% · EPSS ${epssCoverage}% · CWE ${cweCoverage}%.`,
        closureAction: 'Normalize vuln feeds into canonical fields to produce defensible ranking and closure tracking.',
        drillQuery: 'cve'
      },
      {
        id: '2.4 / 2.5',
        title: 'Ownership and configuration baseline',
        status: capStatusWithContract(
          statusFromPercent(Math.round((maintenanceCoverage + ownershipCoverage + configCoverage) / 3)),
          isCapReady('ownershipEvidence') && isCapReady('configurationEvidence')
        ),
        evidence: `Maintenance ${maintenanceCoverage}% · Ownership ${ownershipCoverage}% · Config controls ${configCoverage}%.`,
        closureAction: 'Bind owner/team and baseline settings per asset to support audit accountability.',
        drillQuery: 'owner'
      },
      {
        id: '4.2 / 4.3',
        title: 'Network topology and segmentation evidence',
        status: capStatusWithContract(total > 0 ? 'met' : 'gap', isCapReady('topologyEvidence')),
        evidence: `Topology views active for ${total.toLocaleString()} assets; blind spots ${summary.blindSpots || 0}; orphans ${summary.orphans || 0}.`,
        closureAction: 'Layer zone boundary policy evidence and unauthorized connection controls.',
        drillQuery: 'orphan'
      },
      {
        id: '5.1 / 5.3',
        title: 'Risk-scored vulnerability posture',
        status: capStatusWithContract(statusFromPercent(Math.round((cveCoverage + riskCoverage) / 2)), isCapReady('vulnerabilityEvidence')),
        evidence: `Vulnerability fields ${cveCoverage}% · risk score fields ${riskCoverage}%.`,
        closureAction: 'Route high-risk findings into closure queue with owners and due dates.',
        drillQuery: 'risk_score'
      },
      {
        id: '11',
        title: 'Continuous inventory maintenance',
        status: capStatusWithContract(statusFromPercent(telemetryCoverage), isCapReady('inventoryDenominator')),
        evidence: `Telemetry recency available on ${telemetryCoverage}% of records.`,
        closureAction: 'Use stale/no-telemetry assets as first remediation queue for discovery coverage.',
        drillQuery: 'last_seen'
      },
      {
        id: '10 / 12 / 13 / 14 / 17',
        title: 'Access, remote control, response, and resilience',
        status: capStatusWithContract(statusFromPercent(remoteAccessCoverage), isCapReady('responseReadiness')),
        evidence: `Remote-access configuration evidence exists on ${remoteAccessCoverage}% of records; full orchestration controls not yet implemented.`,
        closureAction: 'Extend from visibility to response runbooks, RBAC policy, and resilience controls.',
        drillQuery: 'remote_access'
      },
      {
        id: 'Crosswalk',
        title: 'Control-framework traceability',
        status: complianceSummary ? statusForGapCount((complianceSummary.bySeverity?.critical || 0) + (complianceSummary.bySeverity?.high || 0)) : 'gap',
        evidence: complianceSummary
          ? `${complianceSummary.iecControlsImpacted}/${complianceSummary.iecControlsTotal} IEC controls and ${complianceSummary.nistControlsImpacted}/${complianceSummary.nistControlsTotal} NIST controls impacted by current findings.`
          : 'Compliance crosswalk not available until gap analysis is populated.',
        closureAction: 'Focus first on controls linked to critical/high findings before broad policy uplift.',
        drillQuery: 'expected_missing'
      }
    ]

    const met = requirements.filter(item => item.status === 'met').length
    const partial = requirements.filter(item => item.status === 'partial').length
    const gap = requirements.filter(item => item.status === 'gap').length

    return {
      total,
      met,
      partial,
      gap,
      requirements,
      criticalFindings: (gapSummary?.critical || 0) + (gapSummary?.high || 0),
      contractReady: Boolean(alignment?.contractReady),
      readinessScore: alignment?.readinessScore || 0,
      strictIssues: alignment?.strictIssues || (alignment ? [] : ['Re-run ingest to evaluate client data contract coverage.'])
    }
  }, [complianceSummary, result, alignment])

  const profileOptions = Object.values(CLIENT_CONTRACT_PROFILES)

  return (
    <div style={{ padding: '0.85rem', overflow: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.7rem', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1rem', fontWeight: 700 }}>Requirement Readiness</h3>
          <p style={{ margin: '0.25rem 0 0', color: '#94a3b8', fontSize: '0.75rem' }}>
            Translates the canonical inventory and evidence into a client requirement crosswalk.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.65rem', color: '#94a3b8', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Profile:
          </label>
          <select
            value={profileId}
            onChange={e => setProfileId(e.target.value)}
            style={{
              background: '#0f172a',
              color: '#cbd5e1',
              border: '1px solid #334155',
              borderRadius: '0.3rem',
              fontSize: '0.7rem',
              fontFamily: 'monospace',
              padding: '0.25rem 0.4rem'
            }}
          >
            {profileOptions.map(profile => (
              <option key={profile.id} value={profile.id}>{profile.label}</option>
            ))}
          </select>
          {onExportBrief && (
            <button
              onClick={() => onExportBrief(profileId)}
              style={GHOST_BUTTON}
            >
              Export RFI brief
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <div style={{ border: '1px solid #1e293b', borderRadius: '0.4rem', padding: '0.45rem 0.6rem', background: '#0b1220', fontFamily: 'monospace', fontSize: '0.72rem', color: '#cbd5e1' }}>
          In-scope assets: {model.total.toLocaleString()}
        </div>
        <div style={{ border: '1px solid #166534', borderRadius: '0.4rem', padding: '0.45rem 0.6rem', background: '#14532d33', fontFamily: 'monospace', fontSize: '0.72rem', color: '#22c55e' }}>
          Met: {model.met}
        </div>
        <div style={{ border: '1px solid #92400e', borderRadius: '0.4rem', padding: '0.45rem 0.6rem', background: '#78350f33', fontFamily: 'monospace', fontSize: '0.72rem', color: '#f59e0b' }}>
          Partial: {model.partial}
        </div>
        <div style={{ border: '1px solid #991b1b', borderRadius: '0.4rem', padding: '0.45rem 0.6rem', background: '#7f1d1d33', fontFamily: 'monospace', fontSize: '0.72rem', color: '#ef4444' }}>
          Gaps: {model.gap}
        </div>
        <div style={{ border: '1px solid #334155', borderRadius: '0.4rem', padding: '0.45rem 0.6rem', background: '#111827', fontFamily: 'monospace', fontSize: '0.72rem', color: '#94a3b8' }}>
          Critical + high closure items: {model.criticalFindings.toLocaleString()}
        </div>
        <div style={{ border: `1px solid ${model.contractReady ? '#166534' : '#92400e'}`, borderRadius: '0.4rem', padding: '0.45rem 0.6rem', background: model.contractReady ? '#14532d33' : '#78350f33', fontFamily: 'monospace', fontSize: '0.72rem', color: model.contractReady ? '#22c55e' : '#f59e0b' }}>
          Data-contract readiness: {model.readinessScore}%
        </div>
      </div>

      {model.strictIssues.length > 0 && (
        <div style={{
          marginBottom: '0.7rem',
          border: '1px solid #92400e',
          borderRadius: '0.4rem',
          background: '#78350f22',
          padding: '0.5rem 0.6rem',
          fontSize: '0.69rem',
          color: '#fbbf24'
        }}>
          Requirement status is contract-gated. Missing data contract items: {model.strictIssues.join(' · ')}.
        </div>
      )}

      <div style={{ display: 'grid', gap: '0.5rem' }}>
        {model.requirements.map(item => (
          <RequirementCard
            key={item.id}
            item={item}
            onDrillDown={onDrillDown}
            onOpenSecurity={onOpenSecurity}
          />
        ))}
      </div>
    </div>
  )
}
