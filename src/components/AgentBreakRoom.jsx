/**
 * AGENT BREAK ROOM (dark theme)
 *
 * Live view of the multi-agent reasoning layer: specialized agents
 * (security, risk, gap, dependency, lifecycle) observe the canonical evidence,
 * post findings to a shared break room, ask each other questions, and the
 * Coordinator surfaces conflicts and escalations.
 *
 * This is a read-out of src/lib/agents/* — it renders whatever the break room
 * contains. It does NOT recompute any metric, so it stays reconciled with the
 * rest of the workspace by construction.
 *
 * Visual language matches InventoryHeader / LayeredTopology / RiskView
 * (Tesla-minimal: dark surface, hairline borders, one accent per role).
 */

import React, { useEffect, useMemo, useRef, useState } from 'react'

const TONE = {
  positive: '#22c55e',
  attention: '#f59e0b',
  alert: '#ef4444',
  orphan: '#a855f7',
  info: '#38bdf8',
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

// Message type → how it reads in the feed. The "cross-talk" types (question /
// response / alert) are what make the agents visibly feed each other info.
const TYPE_META = {
  observation: { label: 'Observation', tone: TONE.textMuted },
  compliment: { label: 'Strength', tone: TONE.positive },
  critique: { label: 'Weakness', tone: TONE.alert },
  suggestion: { label: 'Suggestion', tone: TONE.attention },
  question: { label: 'Question', tone: TONE.info },
  response: { label: 'Response', tone: TONE.info },
  alert: { label: 'Escalation', tone: TONE.alert },
  summary: { label: 'Summary', tone: TONE.textDim }
}

const ROLE_TONE = {
  security: TONE.alert,
  risk: TONE.attention,
  gap: TONE.orphan,
  dependency: TONE.info,
  lifecycle: '#facc15',
  plant: TONE.textDim,
  coordinator: TONE.positive,
  system: TONE.textFaint,
  human: TONE.text
}

function relativeTime(ts) {
  if (!ts) return ''
  const delta = Date.now() - ts
  const s = Math.round(delta / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  return `${h}h ago`
}

function roleLabel(role) {
  if (!role) return 'Agent'
  return role.charAt(0).toUpperCase() + role.slice(1)
}

function AgentChip({ agent }) {
  const health = typeof agent.getPlantHealth === 'function' ? agent.getPlantHealth() : null
  const score = health?.healthScore ?? health?.plantHealth?.score
  const tone = score == null
    ? TONE.textMuted
    : score >= 80 ? TONE.positive : score >= 50 ? TONE.attention : TONE.alert
  const subAgents = agent.subAgents ? agent.subAgents.size : 0

  return (
    <div style={{
      border: `1px solid ${TONE.hairline}`,
      borderRadius: '0.4rem',
      padding: '0.5rem 0.65rem',
      background: TONE.surface,
      minWidth: 150
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.78rem', color: TONE.text, fontWeight: 600 }}>
          {agent.plant || agent.name}
        </span>
        {score != null && (
          <span style={{ fontSize: '0.78rem', color: tone, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {score}
          </span>
        )}
      </div>
      <div style={{ fontSize: '0.68rem', color: TONE.textMuted, marginTop: '0.2rem' }}>
        {subAgents > 0 ? `${subAgents} domain agents` : roleLabel(agent.role)}
        {health?.status ? ` · ${health.status.replace('_', ' ')}` : ''}
      </div>
    </div>
  )
}

function MessageRow({ msg }) {
  const meta = TYPE_META[msg.type] || TYPE_META.observation
  const roleTone = ROLE_TONE[msg.role] || TONE.textMuted
  const isCrossTalk = msg.type === 'question' || msg.type === 'response' || msg.type === 'alert'

  return (
    <div style={{
      borderBottom: `1px solid ${TONE.hairline}`,
      padding: '0.6rem 0',
      display: 'flex',
      gap: '0.7rem',
      alignItems: 'flex-start'
    }}>
      <div style={{
        width: 3,
        alignSelf: 'stretch',
        borderRadius: 2,
        background: meta.tone,
        flexShrink: 0,
        opacity: isCrossTalk ? 1 : 0.5
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', color: roleTone, fontWeight: 600 }}>
            {msg.agentName || 'Agent'}
          </span>
          <span style={{
            fontSize: '0.62rem',
            color: meta.tone,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontWeight: 700
          }}>
            {meta.label}
          </span>
          {msg.metadata?.plant && (
            <span style={{ fontSize: '0.68rem', color: TONE.textFaint }}>
              {msg.metadata.plant}
            </span>
          )}
          <span style={{ fontSize: '0.66rem', color: TONE.textFaint, marginLeft: 'auto' }}>
            {relativeTime(msg.timestamp)}
          </span>
        </div>
        <div style={{
          fontSize: '0.78rem',
          color: TONE.textDim,
          lineHeight: 1.5,
          marginTop: '0.2rem',
          whiteSpace: 'pre-wrap'
        }}>
          {msg.content}
        </div>
      </div>
    </div>
  )
}

export default function AgentBreakRoom({
  breakRoom,
  agents = [],
  isObserving = false,
  lastObservation,
  onObserve
}) {
  const [tick, setTick] = useState(0)
  const feedRef = useRef(null)

  // Re-render whenever a new message is posted to the break room.
  useEffect(() => {
    if (!breakRoom) return
    const unsubscribe = breakRoom.subscribe(() => setTick(t => t + 1))
    return unsubscribe
  }, [breakRoom])

  const messages = useMemo(() => {
    if (!breakRoom) return []
    return breakRoom.getRecentMessages(200)
    // tick is an intentional invalidation signal as the break room mutates in place
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breakRoom, tick])

  const stats = breakRoom?.stats || {}
  const observationCount = breakRoom?.observations?.length || 0
  const criticalCount = (breakRoom?.observations || []).filter(o => o.severity === 'critical').length
  const crossTalk = messages.filter(m => m.type === 'question' || m.type === 'response' || m.type === 'alert').length

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
        marginBottom: '1rem',
        flexWrap: 'wrap'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: TONE.text, letterSpacing: '-0.01em' }}>
            Agent break room
          </h3>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.8rem', color: TONE.textMuted, lineHeight: 1.5, maxWidth: 680 }}>
            Specialized agents read the same canonical evidence, post findings, and challenge each other.
            The Coordinator flags conflicting reads and escalates criticals. Every line traces to an
            observation with evidence — no claim originates here.
          </p>
        </div>
        <button
          onClick={onObserve}
          disabled={isObserving || !onObserve}
          style={{
            border: `1px solid ${TONE.hairline}`,
            background: 'transparent',
            borderRadius: '0.3rem',
            color: isObserving ? TONE.textMuted : TONE.text,
            fontFamily: SYS_FONT,
            fontSize: '0.78rem',
            fontWeight: 500,
            padding: '0.4rem 0.85rem',
            cursor: isObserving || !onObserve ? 'default' : 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          {isObserving ? 'Reasoning…' : 'Run reasoning round'}
        </button>
      </div>

      {/* Stat strip */}
      <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <Stat value={agents.length} label="Plant agents" />
        <Stat value={observationCount} label="Findings" />
        <Stat value={crossTalk} label="Cross-agent exchanges" tone={crossTalk > 0 ? TONE.info : TONE.textMuted} />
        <Stat value={criticalCount} label="Critical" tone={criticalCount > 0 ? TONE.alert : TONE.positive} />
        {lastObservation && <Stat value={relativeTime(lastObservation)} label="Last round" tone={TONE.textDim} small />}
      </div>

      {/* Agent roster */}
      {agents.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.1rem' }}>
          {agents.map(a => <AgentChip key={a.id} agent={a} />)}
        </div>
      )}

      {/* Live feed */}
      <div ref={feedRef} style={{
        border: `1px solid ${TONE.hairline}`,
        borderRadius: '0.5rem',
        background: TONE.surface,
        padding: '0.5rem 0.9rem'
      }}>
        {messages.length === 0 ? (
          <div style={{ padding: '1.5rem 0.5rem', textAlign: 'center', color: TONE.textMuted, fontSize: '0.8rem' }}>
            {agents.length === 0
              ? 'Agents initialize once data is loaded.'
              : 'No messages yet. Run a reasoning round to have the agents analyze the loaded evidence.'}
          </div>
        ) : (
          messages.slice().reverse().map(msg => <MessageRow key={msg.id} msg={msg} />)
        )}
      </div>
    </div>
  )
}

function Stat({ value, label, tone, small }) {
  return (
    <div>
      <div style={{
        fontSize: small ? '1rem' : '1.5rem',
        lineHeight: 1.1,
        fontWeight: 600,
        color: tone || TONE.text,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.02em'
      }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div style={{ fontSize: '0.7rem', color: TONE.textMuted, marginTop: '0.2rem' }}>
        {label}
      </div>
    </div>
  )
}
