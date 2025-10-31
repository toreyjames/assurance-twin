import React, { useState } from 'react'
import OilGasCanonizer from './OilGasCanonizer.jsx'
import AutomotiveCanonizer from './AutomotiveCanonizer.jsx'
import PharmaCanonizer from './PharmaCanonizer.jsx'
import UtilitiesCanonizer from './UtilitiesCanonizer.jsx'
import './styles.css'

export default function App() {
  const [industry, setIndustry] = useState('oil-gas')
  
  const industries = {
    'oil-gas': {
      name: 'Oil & Gas Refineries',
      icon: '⛽',
      description: 'Refinery process units, safety systems, material flows',
      standards: ['ISA/IEC 62443', 'IEC 61511', 'API 1164', 'NIST CSF'],
      governance: ['SOX 404', 'NERC CIP', 'TSA Pipeline Security']
    },
    'automotive': {
      name: 'Automotive Plants',
      icon: '🚗',
      description: 'Production lines, robots, quality systems, JIT',
      standards: ['ISO 26262', 'IEC 61508', 'ISO 13849', 'ISO 21434'],
      governance: ['IATF 16949', 'ISO 14001', 'ISO 27001']
    },
    'pharma': {
      name: 'Pharmaceutical Plants',
      icon: '💊',
      description: 'API manufacturing, batch processes, GMP compliance',
      standards: ['FDA 21 CFR Part 11', 'GAMP 5', 'ISO 27001', 'ICH Q9'],
      governance: ['GMP', 'FDA Validation', 'EU Annex 11']
    },
    'utilities': {
      name: 'Power & Utilities',
      icon: '⚡',
      description: 'Generation units, grid stability, environmental controls',
      standards: ['NERC CIP', 'IEC 61850', 'IEEE 1815', 'IEEE 1584'],
      governance: ['FERC', 'NERC Reliability', 'NFPA 70E']
    }
  }

  const renderCanonizer = () => {
    switch(industry) {
      case 'oil-gas': return <OilGasCanonizer />
      case 'automotive': return <AutomotiveCanonizer />
      case 'pharma': return <PharmaCanonizer />
      case 'utilities': return <UtilitiesCanonizer />
      default: return <OilGasCanonizer />
    }
  }

  return (
    <div className="container">
      <header className="header">
        <div className="brand">
          <img src="/logo.svg" alt="Deloitte" />
          <div className="brand-title">OT Assurance Twin</div>
        </div>
        <div className="subtle">Multi-Industry Asset Canonizer with Standards Compliance</div>
      </header>

      <section className="industry-selector">
        <h2>Select Your Industry</h2>
        <div className="industry-grid">
          {Object.entries(industries).map(([key, industryData]) => (
            <div 
              key={key}
              className={`industry-card ${industry === key ? 'selected' : ''}`}
              onClick={() => setIndustry(key)}
            >
              <div className="industry-icon">{industryData.icon}</div>
              <div className="industry-name">{industryData.name}</div>
              <div className="industry-desc">{industryData.description}</div>
              <div className="industry-standards">
                <strong>Standards:</strong> {industryData.standards.join(', ')}
              </div>
              <div className="industry-governance">
                <strong>Governance:</strong> {industryData.governance.join(', ')}
              </div>
            </div>
          ))}
        </div>
      </section>

      {renderCanonizer()}
    </div>
  )
}