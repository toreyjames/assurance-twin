/**
 * PLANT VISUALIZATION 2D FALLBACK
 * Simple 2D network topology view for mobile or browsers without WebGL
 */

import React, { useMemo, useState, useRef } from 'react'
import html2canvas from 'html2canvas'

// Security tier colors
const TIER_COLORS = {
  1: '#ef4444',
  2: '#f59e0b',
  3: '#6366f1',
}

export default function PlantVisualization2D({ result }) {
  const containerRef = useRef()
  const [selectedUnit, setSelectedUnit] = useState(null)
  const [selectedPlant, setSelectedPlant] = useState('all')
  
  // Extract unique plants
  const plants = useMemo(() => {
    const plantSet = new Set()
    const assets = result?.assets || []
    
    assets.forEach(a => {
      const plantName = a.plant || a.plant_code || a.facility || 'Unknown Site'
      if (plantName && plantName !== 'Unknown Site') {
        plantSet.add(plantName)
      }
    })
    
    return Array.from(plantSet).sort()
  }, [result])
  
  const isMultiSite = plants.length > 1
  
  // Filter assets by selected plant
  const filteredAssets = useMemo(() => {
    const assets = result?.assets || []
    if (selectedPlant === 'all') return assets
    return assets.filter(a => {
      const plantName = a.plant || a.plant_code || a.facility || 'Unknown Site'
      return plantName === selectedPlant
    })
  }, [result, selectedPlant])
  
  // Extract process units from filtered data
  const processUnits = useMemo(() => {
    const units = {}
    
    filteredAssets.forEach(a => {
      const unitName = a.unit || a.area || a.location || 'Unassigned'
      if (!units[unitName]) {
        units[unitName] = { 
          name: unitName, 
          count: 0, 
          tier1: 0, 
          tier2: 0, 
          tier3: 0,
          subnets: new Set()
        }
      }
      units[unitName].count++
      if (a.classification?.tier === 1) units[unitName].tier1++
      if (a.classification?.tier === 2) units[unitName].tier2++
      if (a.classification?.tier === 3) units[unitName].tier3++
      
      if (a.ip_address) {
        const subnet = a.ip_address.split('.').slice(0, 3).join('.')
        units[unitName].subnets.add(subnet)
      }
    })
    
    return Object.values(units)
      .filter(u => u.name !== 'Unassigned' || u.count > 10)
      .sort((a, b) => b.tier1 - a.tier1)
  }, [filteredAssets])
  
  // Find connections between units via shared subnets
  const connections = useMemo(() => {
    const conns = []
    
    for (let i = 0; i < processUnits.length; i++) {
      for (let j = i + 1; j < processUnits.length; j++) {
        const shared = [...processUnits[i].subnets]
          .filter(s => processUnits[j].subnets.has(s))
        
        if (shared.length > 0) {
          conns.push({
            from: processUnits[i].name,
            to: processUnits[j].name,
            hasCritical: processUnits[i].tier1 > 0 && processUnits[j].tier1 > 0
          })
        }
      }
    }
    
    return conns
  }, [processUnits])

  // Export as PNG
  const handleExport = async () => {
    if (!containerRef.current) return
    
    try {
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: '#0f172a',
        scale: 2
      })
      
      const link = document.createElement('a')
      link.download = `plant-topology-${new Date().toISOString().split('T')[0]}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  const selectedUnitData = selectedUnit 
    ? processUnits.find(u => u.name === selectedUnit) 
    : null

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      borderRadius: '0.75rem',
      overflow: 'hidden',
      marginBottom: '2rem',
      border: '2px solid #334155'
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid #334155',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div>
          <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem', fontWeight: '600' }}>
            🏭 Plant Topology {isMultiSite && selectedPlant !== 'all' && `— ${selectedPlant}`}
          </h3>
          <p style={{ margin: '0.25rem 0 0', color: '#94a3b8', fontSize: '0.8rem' }}>
            2D view • {isMultiSite ? `${plants.length} sites` : 'Click units to explore'}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {isMultiSite && (
            <select
              value={selectedPlant}
              onChange={(e) => {
                setSelectedPlant(e.target.value)
                setSelectedUnit(null)
              }}
              style={{
                padding: '0.5rem 0.75rem',
                background: '#1e293b',
                color: 'white',
                border: '1px solid #475569',
                borderRadius: '0.375rem',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Sites ({plants.length})</option>
              {plants.map(plant => (
                <option key={plant} value={plant}>{plant}</option>
              ))}
            </select>
          )}
          
          <button
            onClick={handleExport}
            style={{
              padding: '0.5rem 1rem',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: '600'
            }}
          >
            📷 Export
          </button>
        </div>
      </div>
      
      {/* 2D Grid View */}
      <div ref={containerRef} style={{ padding: '1.5rem', minHeight: '400px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: '1rem'
        }}>
          {processUnits.map(unit => {
            const isSelected = selectedUnit === unit.name
            const hasConnections = connections.some(
              c => c.from === unit.name || c.to === unit.name
            )
            
            return (
              <div
                key={unit.name}
                onClick={() => setSelectedUnit(isSelected ? null : unit.name)}
                style={{
                  padding: '1rem',
                  background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                  border: `2px solid ${isSelected ? '#3b82f6' : '#334155'}`,
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
              >
                {/* Critical indicator */}
                {unit.tier1 > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    width: '12px',
                    height: '12px',
                    background: TIER_COLORS[1],
                    borderRadius: '50%',
                    border: '2px solid #0f172a'
                  }} />
                )}
                
                {/* Connection indicator */}
                {hasConnections && (
                  <div style={{
                    position: 'absolute',
                    top: '-4px',
                    left: '-4px',
                    width: '12px',
                    height: '12px',
                    background: '#3b82f6',
                    borderRadius: '50%',
                    border: '2px solid #0f172a'
                  }} />
                )}
                
                <div style={{ 
                  color: 'white', 
                  fontWeight: '600', 
                  fontSize: '0.9rem',
                  marginBottom: '0.5rem'
                }}>
                  {unit.name}
                </div>
                
                <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                  {unit.count} assets
                </div>
                
                {/* Tier breakdown bar */}
                <div style={{
                  marginTop: '0.5rem',
                  height: '4px',
                  background: '#1e293b',
                  borderRadius: '2px',
                  display: 'flex',
                  overflow: 'hidden'
                }}>
                  {unit.tier1 > 0 && (
                    <div style={{
                      width: `${(unit.tier1 / unit.count) * 100}%`,
                      background: TIER_COLORS[1]
                    }} />
                  )}
                  {unit.tier2 > 0 && (
                    <div style={{
                      width: `${(unit.tier2 / unit.count) * 100}%`,
                      background: TIER_COLORS[2]
                    }} />
                  )}
                  {unit.tier3 > 0 && (
                    <div style={{
                      width: `${(unit.tier3 / unit.count) * 100}%`,
                      background: TIER_COLORS[3]
                    }} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Selected unit details */}
        {selectedUnitData && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid #3b82f6',
            borderRadius: '0.5rem'
          }}>
            <div style={{ 
              fontWeight: '600', 
              color: 'white',
              marginBottom: '0.5rem',
              fontSize: '1rem'
            }}>
              {selectedUnitData.name}
            </div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(4, 1fr)', 
              gap: '1rem',
              color: '#94a3b8',
              fontSize: '0.8rem'
            }}>
              <div>
                <div style={{ color: 'white', fontWeight: '600', fontSize: '1.25rem' }}>
                  {selectedUnitData.count}
                </div>
                Total Assets
              </div>
              <div>
                <div style={{ color: TIER_COLORS[1], fontWeight: '600', fontSize: '1.25rem' }}>
                  {selectedUnitData.tier1}
                </div>
                Critical
              </div>
              <div>
                <div style={{ color: TIER_COLORS[2], fontWeight: '600', fontSize: '1.25rem' }}>
                  {selectedUnitData.tier2}
                </div>
                Networkable
              </div>
              <div>
                <div style={{ color: TIER_COLORS[3], fontWeight: '600', fontSize: '1.25rem' }}>
                  {selectedUnitData.tier3}
                </div>
                Passive
              </div>
            </div>
            
            {selectedUnitData.subnets.size > 0 && (
              <div style={{ 
                marginTop: '0.75rem', 
                paddingTop: '0.75rem', 
                borderTop: '1px solid #334155',
                color: '#94a3b8',
                fontSize: '0.75rem'
              }}>
                <strong>Subnets:</strong> {[...selectedUnitData.subnets].join(', ')}
              </div>
            )}
            
            {/* Connected units */}
            {connections.filter(c => c.from === selectedUnitData.name || c.to === selectedUnitData.name).length > 0 && (
              <div style={{ 
                marginTop: '0.75rem', 
                paddingTop: '0.75rem', 
                borderTop: '1px solid #334155',
                color: '#94a3b8',
                fontSize: '0.75rem'
              }}>
                <strong>Connected to:</strong>{' '}
                {connections
                  .filter(c => c.from === selectedUnitData.name || c.to === selectedUnitData.name)
                  .map(c => c.from === selectedUnitData.name ? c.to : c.from)
                  .join(', ')}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div style={{
        padding: '0.75rem 1rem',
        borderTop: '1px solid #334155',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', gap: '1rem', color: '#94a3b8', fontSize: '0.75rem' }}>
          <span><span style={{ color: TIER_COLORS[1] }}>●</span> Critical</span>
          <span><span style={{ color: TIER_COLORS[2] }}>●</span> Networkable</span>
          <span><span style={{ color: TIER_COLORS[3] }}>●</span> Passive</span>
          <span><span style={{ color: '#3b82f6' }}>●</span> Connected</span>
        </div>
        <div style={{ color: '#64748b', fontSize: '0.7rem' }}>
          {processUnits.length} units • {filteredAssets.length.toLocaleString()} assets
          {isMultiSite && selectedPlant === 'all' && ` across ${plants.length} sites`}
        </div>
      </div>
    </div>
  )
}


