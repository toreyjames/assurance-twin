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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.5rem 1.5rem', background: '#020617', borderBottom: '1px solid #1e293b',
        flexShrink: 0,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/logo.svg" alt="Deloitte" style={{ height: '22px' }} />
          <span style={{ fontWeight: '500', color: '#f8fafc', fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
            OT Assurance Twin
          </span>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <AssuranceWorkspace />
      </div>
    </div>
  )
}
