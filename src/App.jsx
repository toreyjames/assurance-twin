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
import UnifiedCanonizer from './UnifiedCanonizer.jsx'
import './styles.css'

export default function App() {
  return (
    <div className="container">
      {/* Header */}
      <header className="header">
        <div className="brand">
          <img src="/logo.svg" alt="Deloitte" />
          <div className="brand-title">OT Assurance Twin</div>
        </div>
        <div className="subtle">
          Context-Aware Asset Canonization Framework
        </div>
      </header>

      {/* Main Canonizer - Industry is auto-detected from data (AIGNE principle) */}
      <UnifiedCanonizer />

      {/* Footer */}
      <footer style={{
        marginTop: '4rem',
        padding: '2rem',
        borderTop: '1px solid #e2e8f0',
        textAlign: 'center',
        color: '#64748b',
        fontSize: '0.875rem'
      }}>
        <p style={{ margin: '0 0 0.5rem 0' }}>
          <strong>OT Assurance Twin Framework</strong> — Context-Aware Asset Canonization
        </p>
        <p style={{ margin: 0 }}>
          Built on AIGNE principles for traceable, audit-ready OT asset management
        </p>
      </footer>
    </div>
  )
}
