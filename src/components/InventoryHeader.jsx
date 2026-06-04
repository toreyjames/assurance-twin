import React, { useMemo } from 'react'
import { evaluateTransportationMissions } from '../lib/core/transportation-mission-capability'
import { evaluateReferenceModel } from '../lib/core/transportation-reference-model'
import { assetHasCves } from '../lib/core/cve-count.js'

const EPISTEMIC_LABELS = {
  cross_validated: 'Cross-validated',
  supported: 'Single-source',
  inferred: 'Inferred',
  expected_missing: 'Expected missing',
  observed_unexpected: 'Observed undocumented',
  unknown: 'Unknown'
}

const EPISTEMIC_TONES = {
  cross_validated: '#22c55e',
  supported: '#94a3b8',
  inferred: '#f59e0b',
  expected_missing: '#ef4444',
  observed_unexpected: '#a855f7',
  unknown: '#94a3b8'
}

// Single semantic palette - one role per color, no shade duplicates
const TONE = {
  positive: '#22c55e',
  attention: '#f59e0b',
  alert: '#ef4444',
  orphan: '#a855f7',
  text: '#f8fafc',
  textDim: '#94a3b8',
  textMuted: '#64748b',
  surface: '#0f172a',
  hairline: '#1e293b'
}

const SYS_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

const HERO_PRIMER = 'Unified rows = matched + blind + orphan. Reconciles engineering baseline against network discovery. NIST CSF ID.AM-01.'
const COVERAGE_PRIMER = 'Discovery coverage = matched / documented. NIST SP 800-82r3 §5.1.'
const HEURISTIC_PRIMER = 'Tier calls are heuristic inferences from device type and network identity. ISA/IEC 62443-3-2. Validate with SME review.'
const BASELINE_PRIMER = 'Documented assets in engineering baseline. NIST CSF ID.AM-01.'
const DISCOVERY_PRIMER = 'Endpoints observed on the network during discovery.'

function HeroCell({ value, label, sublabel, tone, onClick, primer }) {
  const interactive = Boolean(onClick)
  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
      title={primer}
      style={{
        padding: '0.7rem 0.85rem',
        background: interactive ? TONE.surface : 'transparent',
        border: `1px solid ${interactive ? TONE.hairline : 'transparent'}`,
        borderRadius: '0.4rem',
        cursor: interactive ? 'pointer' : 'default',
        textAlign: 'left',
        outline: 'none',
        transition: 'background 120ms ease, border-color 120ms ease'
      }}
      onMouseEnter={interactive ? (e) => { e.currentTarget.style.borderColor = tone || TONE.text } : undefined}
      onMouseLeave={interactive ? (e) => { e.currentTarget.style.borderColor = TONE.hairline } : undefined}
    >
      <div style={{
        fontSize: '2rem',
        lineHeight: 1,
        fontWeight: 600,
        color: tone || TONE.text,
        fontFamily: SYS_FONT,
        letterSpacing: '-0.02em'
      }}>
        {value}
      </div>
      <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: TONE.text, fontFamily: SYS_FONT, fontWeight: 500 }}>
        {label}
      </div>
      {sublabel && (
        <div style={{ marginTop: '0.15rem', fontSize: '0.7rem', color: TONE.textDim, fontFamily: SYS_FONT }}>
          {sublabel}
        </div>
      )}
    </div>
  )
}

function ChipRow({ label, items, onSelect, getTone, activeId, allLabel }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap' }}>
      <span style={{
        fontSize: '0.72rem',
        color: TONE.textMuted,
        fontFamily: SYS_FONT,
        minWidth: 96,
        flexShrink: 0
      }}>
        {label}
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem 0.65rem', flex: 1 }}>
        {allLabel && (
          <button
            key="__all"
            type="button"
            onClick={() => onSelect?.('__all')}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              color: !activeId || activeId === 'all' ? TONE.text : TONE.textMuted,
              fontFamily: SYS_FONT,
              fontSize: '0.78rem',
              fontWeight: !activeId || activeId === 'all' ? 600 : 400,
              cursor: 'pointer',
              borderBottom: !activeId || activeId === 'all' ? `1px solid ${TONE.text}` : '1px solid transparent'
            }}
            title="Clear filter"
          >
            {allLabel}
          </button>
        )}
        {items.map(item => {
          const itemTone = getTone ? getTone(item) : TONE.textDim
          const isActive = activeId && activeId === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect?.(item.id)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                color: TONE.text,
                fontFamily: SYS_FONT,
                fontSize: '0.78rem',
                fontWeight: isActive ? 600 : 400,
                cursor: onSelect ? 'pointer' : 'default',
                borderBottom: isActive ? `1px solid ${TONE.text}` : '1px solid transparent'
              }}
              title={item.title || `Filter table by ${item.label}`}
            >
              <span style={{ color: TONE.text }}>{item.label}</span>
              <span style={{ color: itemTone, marginLeft: '0.3rem', fontVariantNumeric: 'tabular-nums' }}>
                {item.count.toLocaleString()}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function InventoryHeader({ model, assets, onDrillDown, activePlant = 'all', industry }) {
  const derived = useMemo(() => {
    const byClass = new Map()
    const byEpistemic = new Map()
    const bySite = new Map()
    let managedTier12 = 0
    let tier12Total = 0
    let withCves = 0
    let telemetryFresh = 0
    let telemetryStale = 0
    let lifecycleRisk = 0

    const now = Date.now()
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

    for (const asset of assets) {
      const site = asset.plant || asset.plant_code || asset.facility || 'Unassigned'
      bySite.set(site, (bySite.get(site) || 0) + 1)

      // For transportation we prefer the raw device_type because the DOT
      // ontology mapping falls back to generic OT labels ("Critical Network
      // Asset", "MES Server", "Unclassified Device") that read wrong to an
      // operator. The DOT source data already carries the right vocabulary
      // (CCTV Camera, Signal Controller, Bridge Controller, etc).
      const classInfo = asset.ontology?.deviceClass
      const preferDeviceType = industry === 'transportation'
      const rawLabel = preferDeviceType
        ? (asset.device_type || classInfo?.label || 'Unclassified Device')
        : (classInfo?.label || asset.device_type || 'Unclassified Device')
      const rawId = preferDeviceType
        ? (asset.device_type || classInfo?.id || 'unclassified')
        : (classInfo?.id || 'unclassified')
      const classId = String(rawId).trim() || 'unclassified'
      const classLabel = String(rawLabel).trim() || 'Unclassified Device'
      byClass.set(classId, {
        id: classId,
        label: classLabel,
        count: (byClass.get(classId)?.count || 0) + 1
      })

      const epistemic = asset.evidence?.epistemic_status || 'unknown'
      byEpistemic.set(epistemic, (byEpistemic.get(epistemic) || 0) + 1)

      const tier = asset.classification?.tier || asset.security_tier
      if (tier === 1 || tier === 2) {
        tier12Total += 1
        if (asset.is_managed === true || asset.is_managed === 'true') managedTier12 += 1
      }

      const status = asset._status || asset.match_type || asset.matchType || 'matched'
      if (status !== 'blind_spot' && assetHasCves(asset)) withCves += 1

      const life = String(asset.lifecycleStatus?.status || '')
      if (life === 'eol' || life === 'eos' || life === 'obsolete') lifecycleRisk += 1

      const seen = asset.last_seen
      if (status !== 'blind_spot') {
        if (!seen) {
          telemetryStale += 1
        } else {
          const ts = Date.parse(seen)
          if (!Number.isNaN(ts) && (now - ts) <= THIRTY_DAYS_MS) telemetryFresh += 1
          else telemetryStale += 1
        }
      }
    }

    return {
      classes: Array.from(byClass.values()).sort((a, b) => b.count - a.count),
      epistemic: Array.from(byEpistemic.entries()).sort((a, b) => b[1] - a[1]),
      sites: Array.from(bySite.entries())
        .map(([name, count]) => ({ id: name, label: name, count }))
        .sort((a, b) => b.count - a.count),
      managedTier12,
      tier12Total,
      unmanagedTier12: Math.max(0, tier12Total - managedTier12),
      withCves,
      telemetryFresh,
      telemetryStale,
      lifecycleRisk
    }
  }, [assets])

  const summary = model?.summary || {}
  const documented = summary.documented ?? 0
  const discovered = summary.discovered ?? 0
  const matched = summary.matched ?? 0
  const blindSpots = summary.blindSpots ?? 0
  const orphans = summary.orphans ?? 0
  const sources = Array.isArray(summary.sources) ? summary.sources : []
  const crossValidated = summary.crossValidated ?? 0
  const union =
    summary.inScope != null
      ? summary.inScope
      : matched + blindSpots + orphans
  const coveragePct = summary.discoveryCoverage || 0
  const coverageColor = coveragePct >= 70 ? TONE.positive : coveragePct >= 50 ? TONE.attention : TONE.alert
  const tier12Color = derived.tier12Total > 0 && derived.unmanagedTier12 === 0
    ? TONE.positive
    : derived.withCves > 0 && derived.unmanagedTier12 > 0
      ? TONE.alert
      : TONE.attention

  const drillStatus = (status) => onDrillDown?.(`status:${status}`)

  const classChips = derived.classes.slice(0, industry === 'transportation' ? 5 : 8).map(c => ({
    id: c.label,
    label: c.label,
    count: c.count,
    title: `Filter asset table by ${c.label}`
  }))

  const epistemicChips = derived.epistemic.map(([key, count]) => ({
    id: key,
    label: EPISTEMIC_LABELS[key] || key,
    count,
    tone: EPISTEMIC_TONES[key],
    title: `Filter by epistemic state: ${EPISTEMIC_LABELS[key] || key}`
  }))

  const siteChips = derived.sites.map(s => ({
    id: s.id,
    label: s.label,
    count: s.count,
    title: `Filter table by site: ${s.label}`
  }))

  const handleSiteSelect = (id) => {
    if (id === '__all' || id === activePlant) {
      onDrillDown?.('plant:all')
    } else {
      onDrillDown?.(`plant:${id}`)
    }
  }

  const missionModel = useMemo(() => {
    if (industry !== 'transportation') return null
    return evaluateTransportationMissions(assets)
  }, [industry, assets])

  const referenceModel = useMemo(() => {
    if (industry !== 'transportation') return null
    return evaluateReferenceModel(assets)
  }, [industry, assets])

  const shadowTone = (severity) => (
    severity === 'material'
      ? TONE.alert
      : severity === 'modest'
        ? TONE.attention
        : severity === 'minimal'
          ? TONE.positive
          : TONE.textMuted
  )

  const basisLabel = (basis) => (
    basis === 'hard' ? 'must-exist'
      : basis === 'mission' ? 'mission-required'
        : basis === 'statistical' ? 'peer-typical'
          : basis === 'programmatic' ? 'doctrine'
            : basis === 'regulatory' ? 'regulated'
              : basis
  )

  const missionTone = (status) => (
    status === 'operable'
      ? TONE.positive
      : status === 'degraded'
        ? TONE.attention
        : TONE.alert
  )

  const confidenceTone = (status) => (
    status === 'strong' || status === 'broad'
      ? TONE.positive
      : status === 'qualified' || status === 'partial' || status === 'sample'
        ? TONE.attention
        : TONE.alert
  )

  return (
    <div style={{
      borderBottom: `1px solid ${TONE.hairline}`,
      background: '#020617',
      padding: '1.25rem 1.5rem 1rem',
      fontFamily: SYS_FONT
    }}>

      {/* BLOCK 1: Denominator hero --------------------------------------- */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.85rem' }}>
          <span
            title={HERO_PRIMER}
            style={{
              fontSize: '3rem',
              lineHeight: 1,
              fontWeight: 600,
              color: TONE.text,
              letterSpacing: '-0.035em',
              fontVariantNumeric: 'tabular-nums',
              cursor: 'help'
            }}
          >
            {union.toLocaleString()}
          </span>
          <span style={{ fontSize: '0.95rem', color: TONE.textDim, fontWeight: 400 }}>
            unified rows
          </span>
          <span style={{ fontSize: '0.78rem', color: TONE.textMuted, marginLeft: 'auto' }}>
            {sources.length > 0 ? (
              sources.map((src, idx) => (
                <React.Fragment key={src.label || src.name}>
                  {idx > 0 && <span style={{ margin: '0 0.5rem', color: TONE.hairline }}>·</span>}
                  <span
                    title={src.detectedType === 'engineering'
                      ? BASELINE_PRIMER
                      : src.label === 'Field inventory'
                        ? 'Physical inventory from roadside walkdowns, bridge inspections, and cabinet surveys.'
                        : DISCOVERY_PRIMER}
                  >
                    {src.label || src.name} {(src.rowCount || 0).toLocaleString()}
                  </span>
                </React.Fragment>
              ))
            ) : (
              <>
                <span title={BASELINE_PRIMER}>Engineering baseline {documented.toLocaleString()}</span>
                <span style={{ margin: '0 0.5rem', color: TONE.hairline }}>·</span>
                <span title={DISCOVERY_PRIMER}>Network discovery {discovered.toLocaleString()}</span>
              </>
            )}
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
          gap: '0.5rem'
        }}>
          <HeroCell
            value={matched.toLocaleString()}
            label="Matched"
            sublabel="In baseline · on network"
            tone={TONE.positive}
            onClick={() => drillStatus('matched')}
            primer="In both engineering baseline and network discovery."
          />
          <HeroCell
            value={blindSpots.toLocaleString()}
            label="Blind spots"
            sublabel="Documented · not observed"
            tone={blindSpots > 0 ? TONE.attention : TONE.textDim}
            onClick={() => drillStatus('blind_spot')}
            primer="Expected from engineering baseline but not seen on the network."
          />
          <HeroCell
            value={orphans.toLocaleString()}
            label="Orphans"
            sublabel="Observed · not in baseline"
            tone={orphans > 0 ? TONE.orphan : TONE.textDim}
            onClick={() => drillStatus('orphan')}
            primer="Discovered on the network but not in engineering baseline."
          />
          <HeroCell
            value={`${coveragePct}%`}
            label="Discovery coverage"
            sublabel={`${matched.toLocaleString()} matched / ${documented.toLocaleString()} documented`}
            tone={coverageColor}
            primer={COVERAGE_PRIMER}
          />
        </div>

        {sources.length >= 3 && matched > 0 && (
          <div
            style={{
              marginTop: '0.7rem',
              fontSize: '0.74rem',
              color: TONE.textDim,
              lineHeight: 1.5
            }}
            title="Cross-validated assets are observed by both network discovery and field walkdown. Single-source assets are seen by only one stream — those are the ones most likely to drift."
          >
            <span style={{ color: TONE.textMuted, marginRight: '0.35rem' }}>Of {matched.toLocaleString()} matched</span>
            <span style={{ color: TONE.positive, fontWeight: 600 }}>{crossValidated.toLocaleString()} cross-validated</span>
            <span style={{ color: TONE.hairline, margin: '0 0.4rem' }}>·</span>
            <span style={{ color: TONE.attention, fontWeight: 600 }}>{(matched - crossValidated).toLocaleString()} single-source only</span>
            <span style={{ color: TONE.textMuted, marginLeft: '0.4rem' }}>
              ({matched > 0 ? Math.round((crossValidated / matched) * 100) : 0}% agreement between network and field)
            </span>
          </div>
        )}
      </div>

      {/* BLOCK 2: Categorical evidence ----------------------------------- */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.55rem',
        paddingTop: '0.9rem',
        marginBottom: '0.9rem',
        borderTop: `1px solid ${TONE.hairline}`
      }}>
        {siteChips.length > 1 && (
          <ChipRow
            label={`Sites (${siteChips.length})`}
            items={siteChips}
            onSelect={handleSiteSelect}
            activeId={activePlant && activePlant !== 'all' ? activePlant : null}
            allLabel={`All sites`}
          />
        )}
        {classChips.length > 0 && (
          <ChipRow
            label="Device classes"
            items={classChips}
            onSelect={(id) => onDrillDown?.(id)}
          />
        )}
        {epistemicChips.length > 0 && (
          <ChipRow
            label="Evidence"
            items={epistemicChips}
            onSelect={(id) => onDrillDown?.(id)}
            getTone={(item) => item.tone || TONE.textDim}
          />
        )}
      </div>

      {missionModel && (
        <div style={{
          paddingTop: '0.8rem',
          marginBottom: '0.9rem',
          borderTop: `1px solid ${TONE.hairline}`,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.45rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', color: TONE.textMuted }}>Mission capability (DOT)</span>
            <span style={{ fontSize: '0.78rem', color: TONE.text }}>
              <span style={{ color: TONE.positive }}>{missionModel.summary.operable} operable</span>
              <span style={{ color: TONE.hairline, margin: '0 0.35rem' }}>·</span>
              <span style={{ color: TONE.attention }}>{missionModel.summary.degraded} degraded</span>
              <span style={{ color: TONE.hairline, margin: '0 0.35rem' }}>·</span>
              <span style={{ color: TONE.alert }}>{missionModel.summary.unknown} unknown</span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.45rem', flexWrap: 'wrap', fontSize: '0.76rem' }}>
            <span style={{ color: confidenceTone(missionModel.confidence.inventory.status), fontWeight: 600 }}>
              {missionModel.confidence.inventory.label}
            </span>
            <span style={{ color: TONE.hairline }}>·</span>
            <span style={{ color: confidenceTone(missionModel.confidence.mission.status), fontWeight: 600 }}>
              {missionModel.confidence.mission.label}
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem 0.85rem' }}>
            {missionModel.missions.map(mission => {
              const scope = mission.scopeExpectation
              const scopeTitle = scope
                ? ` · observed ${scope.observed} of ~${scope.typical} expected at declared scope (range ${scope.low}-${scope.high})`
                : ''
              return (
                <span
                  key={mission.id}
                  title={`${mission.reason}${mission.missing.length ? ` · missing: ${mission.missing.join(', ')}` : ''}${scopeTitle}`}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'default',
                    color: TONE.text,
                    fontSize: '0.76rem',
                    fontFamily: SYS_FONT
                  }}
                >
                  <span style={{ color: missionTone(mission.status), marginRight: '0.28rem' }}>●</span>
                  {mission.label}
                  <span style={{ color: TONE.textMuted, marginLeft: '0.3rem' }}>
                    {mission.satisfiedCount} of {mission.requiredCount} groups
                  </span>
                  {scope && (
                    <span style={{
                      color: shadowTone(scope.coverage === 'broad' ? 'minimal' : scope.coverage === 'partial' ? 'modest' : 'material'),
                      marginLeft: '0.3rem',
                      fontVariantNumeric: 'tabular-nums'
                    }}>
                      {scope.observed >= scope.typical
                        ? ` · ${scope.observed} devices (≥ ~${scope.typical} typical)`
                        : ` · ${scope.observed} of ~${scope.typical} devices`}
                    </span>
                  )}
                </span>
              )
            })}
          </div>

          <div
            title="Benchmarked against transportation template expected device ranges for declared unit types."
            style={{ fontSize: '0.72rem', color: TONE.textMuted }}
          >
            {missionModel.confidence.statement}
          </div>
        </div>
      )}

      {referenceModel && referenceModel.expected.typical > 0 && (
        <div style={{
          paddingTop: '0.8rem',
          marginBottom: '0.9rem',
          borderTop: `1px solid ${TONE.hairline}`,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', color: TONE.textMuted }}>Reference-model gap (DOT)</span>
            <span style={{ fontSize: '0.78rem', color: shadowTone(referenceModel.shadow.severity), fontWeight: 600 }}>
              {referenceModel.shadow.label}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.65rem', flexWrap: 'wrap', fontSize: '0.78rem' }}>
            <span style={{ color: TONE.text }}>
              Expected <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>~{referenceModel.expected.typical}</span>
              <span style={{ color: TONE.textMuted, marginLeft: '0.25rem' }}>
                ({referenceModel.expected.low}-{referenceModel.expected.high})
              </span>
            </span>
            <span style={{ color: TONE.hairline }}>·</span>
            <span style={{ color: TONE.text }}>
              Observed <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{referenceModel.observed.comparable}</span>
            </span>
            <span style={{ color: TONE.hairline }}>·</span>
            <span style={{ color: shadowTone(referenceModel.shadow.severity), fontWeight: 600 }}>
              Likely undocumented ~{referenceModel.shadow.typical}
              <span style={{ color: TONE.textMuted, marginLeft: '0.25rem', fontWeight: 400 }}>
                ({referenceModel.shadow.low}-{referenceModel.shadow.high})
              </span>
            </span>
          </div>

          {referenceModel.perClass.filter(g => g.gap > 0).slice(0, 4).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem 0.7rem', fontSize: '0.74rem' }}>
              <span style={{ color: TONE.textMuted, marginRight: '0.1rem' }}>Largest class gaps</span>
              {referenceModel.perClass.filter(g => g.gap > 0).slice(0, 4).map(gap => (
                <span
                  key={gap.id}
                  title={`Expected ~${gap.expectedTypical} (${gap.expectedLow}-${gap.expectedHigh}). Observed ${gap.observed}. Basis: ${basisLabel(gap.basis)}.`}
                  style={{ color: TONE.text }}
                >
                  {gap.label}
                  <span style={{ color: shadowTone(gap.severity), marginLeft: '0.3rem', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    {gap.observed}/~{gap.expectedTypical}
                  </span>
                  <span style={{ color: TONE.textMuted, marginLeft: '0.25rem', fontSize: '0.66rem' }}>
                    {basisLabel(gap.basis)}
                  </span>
                </span>
              ))}
            </div>
          )}

          <div
            title="Declared scope is derived from observed unit/area structure. Expectations layer hard (engineering must-exist), mission (operationally required), and statistical (peer-DOT density) references."
            style={{ fontSize: '0.72rem', color: TONE.textMuted, lineHeight: 1.5 }}
          >
            {referenceModel.confidence.statement}
          </div>
        </div>
      )}

      {/* BLOCK 3: Follow-ups one-liner ----------------------------------- */}
      <div style={{
        paddingTop: '0.7rem',
        borderTop: `1px solid ${TONE.hairline}`,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'baseline',
        gap: '0.4rem 0.85rem',
        fontSize: '0.78rem',
        color: TONE.textDim
      }}>
        <span style={{ color: TONE.textMuted, minWidth: 96 }}>Follow-ups</span>
        <span title={HEURISTIC_PRIMER} style={{ cursor: 'help' }}>
          <span style={{ color: tier12Color, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
            {derived.unmanagedTier12.toLocaleString()}
          </span>
          {' '}unmanaged Tier 1-2
          <span style={{ color: TONE.textMuted }}> (of {derived.tier12Total.toLocaleString()})</span>
          <span style={{ color: TONE.textMuted, marginLeft: '0.25rem' }}>ⓘ</span>
        </span>
        <span style={{ color: TONE.hairline }}>·</span>
        <span>
          <span style={{ color: derived.withCves > 0 ? TONE.alert : TONE.textDim, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
            {derived.withCves.toLocaleString()}
          </span>
          {' '}with CVEs
          <span style={{ color: TONE.textMuted }}> (observed)</span>
        </span>
        <span style={{ color: TONE.hairline }}>·</span>
        <span>
          <span style={{ color: derived.telemetryStale > 0 ? TONE.attention : TONE.textDim, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
            {derived.telemetryStale.toLocaleString()}
          </span>
          {' '}stale telemetry
        </span>
        <span style={{ color: TONE.hairline }}>·</span>
        <span>
          <span style={{ color: derived.lifecycleRisk > 0 ? TONE.attention : TONE.textDim, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
            {derived.lifecycleRisk.toLocaleString()}
          </span>
          {' '}lifecycle risk
        </span>
      </div>
    </div>
  )
}
