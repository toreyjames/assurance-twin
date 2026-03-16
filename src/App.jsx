/**
 * OT ASSURANCE TWIN
 * AIGNE-Aligned Context Engineering Framework for OT Asset Management
 * 
 * Simplified architecture with:
 * - Single unified canonizer (replaces 4 industry-specific components)
 * - Industry auto-detection from data patterns (AIGNE principle)
 * - Progressive disclosure (Basic/Standard/Premium tiers)
 * - Full provenance tracking for audit trails
 * - Human review checkpoint for assurance engagements
 */

import React from 'react'
import AssuranceWorkspace from './AssuranceWorkspace.jsx'
import './styles.css'

export default function App() {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.5rem 1.5rem', background: '#020617', borderBottom: '1px solid #1e293b',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/logo.svg" alt="Deloitte" style={{ height: '24px' }} />
          <span style={{ fontWeight: '700', color: '#f8fafc', fontSize: '0.9rem', fontFamily: 'monospace' }}>
            OT Assurance Twin
          </span>
        </div>
        <span style={{ color: '#475569', fontSize: '0.7rem', fontFamily: 'monospace' }}>
          Context-Aware Asset Canonization
        </span>
      </header>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        <AssuranceWorkspace />
      </div>
    </div>
  )
}
