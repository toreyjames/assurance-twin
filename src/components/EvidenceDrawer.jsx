import React from 'react'

function Row({ label, value }) {
  if (!value && value !== 0) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', padding: '0.15rem 0' }}>
      <span style={{ color: '#64748b' }}>{label}</span>
      <span style={{ color: '#e2e8f0', fontFamily: 'monospace', textAlign: 'right' }}>
        {String(value)}
      </span>
    </div>
  )
}

export default function EvidenceDrawer({ asset }) {
  const evidence = asset?.evidence
  if (!evidence) return null

  return (
    <details style={{ marginTop: '0.8rem', border: '1px solid #1e293b', borderRadius: '0.4rem', padding: '0.45rem 0.55rem', background: '#0b1220' }}>
      <summary style={{ cursor: 'pointer', color: '#cbd5e1', fontFamily: 'monospace', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
        How We Know
      </summary>

      <div style={{ marginTop: '0.55rem', fontSize: '0.72rem', lineHeight: 1.5 }}>
        <div style={{ color: '#e2e8f0', marginBottom: '0.4rem' }}>{evidence.claim}</div>

        <div style={{ marginBottom: '0.45rem', borderTop: '1px solid #1e293b', paddingTop: '0.35rem' }}>
          <Row label="Epistemic status" value={evidence.epistemic_status} />
          <Row label="Ontology class" value={evidence.ontology?.deviceClass} />
          <Row label="Layer" value={evidence.ontology?.layer} />
          <Row label="Zone type" value={evidence.ontology?.zoneType} />
          <Row label="Validation confidence" value={evidence.cross_validation?.confidence} />
        </div>

        {Array.isArray(evidence.rules_fired) && evidence.rules_fired.length > 0 && (
          <div style={{ marginBottom: '0.45rem' }}>
            <div style={{ color: '#64748b', fontFamily: 'monospace', fontSize: '0.66rem', marginBottom: '0.2rem', textTransform: 'uppercase' }}>
              Rules fired
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
              {evidence.rules_fired.map(rule => (
                <span key={rule} style={{ border: '1px solid #334155', background: '#111827', borderRadius: '999px', padding: '0.1rem 0.4rem', color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.65rem' }}>
                  {rule}
                </span>
              ))}
            </div>
          </div>
        )}

        {Array.isArray(evidence.sources) && evidence.sources.length > 0 && (
          <div style={{ marginBottom: '0.45rem' }}>
            <div style={{ color: '#64748b', fontFamily: 'monospace', fontSize: '0.66rem', marginBottom: '0.2rem', textTransform: 'uppercase' }}>
              Sources
            </div>
            {evidence.sources.map(source => (
              <div key={source.source} style={{ padding: '0.2rem 0', borderBottom: '1px solid #1e293b' }}>
                <div style={{ color: '#cbd5e1', fontFamily: 'monospace', fontSize: '0.66rem' }}>{source.source}</div>
                <div style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.64rem' }}>
                  {(source.anchors || []).join(' | ')}
                </div>
              </div>
            ))}
          </div>
        )}

        {Array.isArray(evidence.cross_validation?.issues) && evidence.cross_validation.issues.length > 0 && (
          <div>
            <div style={{ color: '#f59e0b', fontFamily: 'monospace', fontSize: '0.66rem', marginBottom: '0.2rem', textTransform: 'uppercase' }}>
              Validation issues
            </div>
            {evidence.cross_validation.issues.map(issue => (
              <div key={issue} style={{ color: '#f59e0b', fontSize: '0.67rem' }}>
                - {issue}
              </div>
            ))}
          </div>
        )}
      </div>
    </details>
  )
}
