/**
 * PLANT VISUALIZATION - "The Map"
 * Interactive 3D visualization of plant assets and topology
 * 
 * Features:
 * - Data-driven layout from canonized assets
 * - Process units as 3D blocks
 * - Network connections between units
 * - Security tier color coding
 * - Click to explore unit details
 * - Export to PNG
 */

import React, { useMemo, useRef, useState, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text, Html, Line } from '@react-three/drei'
import html2canvas from 'html2canvas'

// Security tier colors
const TIER_COLORS = {
  1: '#ef4444', // Critical - Red
  2: '#f59e0b', // Networkable - Amber  
  3: '#6366f1', // Passive - Indigo
}

// Process unit type configurations
const UNIT_CONFIGS = {
  'Control Room': { color: '#3b82f6', height: 2 },
  'CDU': { color: '#64748b', height: 4 },
  'Crude Unit': { color: '#64748b', height: 4 },
  'Reformer': { color: '#8b5cf6', height: 3.5 },
  'FCC': { color: '#f59e0b', height: 5 },
  'Tank Farm': { color: '#10b981', height: 1.5 },
  'Coker': { color: '#ef4444', height: 4.5 },
  'Coker Unit': { color: '#ef4444', height: 4.5 },
  'Hydrotreater': { color: '#06b6d4', height: 3 },
  'Hydrocracker': { color: '#8b5cf6', height: 4 },
  'Loading': { color: '#f97316', height: 2 },
  'Utilities': { color: '#22c55e', height: 2.5 },
  'default': { color: '#64748b', height: 3 }
}

/**
 * Process Unit - 3D block representing a plant area
 */
function ProcessUnit({ unit, position, onClick, selected, viewMode }) {
  const meshRef = useRef()
  const config = UNIT_CONFIGS[unit.name] || UNIT_CONFIGS.default
  
  // Gentle pulse animation when selected
  useFrame((state) => {
    if (meshRef.current && selected) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.02
      meshRef.current.scale.setScalar(scale)
    } else if (meshRef.current) {
      meshRef.current.scale.setScalar(1)
    }
  })
  
  const criticalRatio = unit.count > 0 ? unit.tier1 / unit.count : 0
  
  // Color based on view mode
  let blockColor = config.color
  if (viewMode === 'security') {
    if (unit.tier1 > 20) blockColor = TIER_COLORS[1]
    else if (unit.tier2 > 20) blockColor = TIER_COLORS[2]
    else blockColor = TIER_COLORS[3]
  }
  
  return (
    <group position={position}>
      {/* Main unit block */}
      <mesh 
        ref={meshRef} 
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        castShadow
      >
        <boxGeometry args={[2, config.height, 2]} />
        <meshStandardMaterial 
          color={selected ? '#ffffff' : blockColor}
          emissive={selected ? blockColor : '#000000'}
          emissiveIntensity={selected ? 0.4 : 0}
        />
      </mesh>
      
      {/* Critical asset indicator (red glow on top) */}
      {unit.tier1 > 0 && (
        <mesh position={[0, config.height / 2 + 0.15, 0]}>
          <boxGeometry args={[2.1, 0.2, 2.1]} />
          <meshStandardMaterial 
            color={TIER_COLORS[1]} 
            emissive={TIER_COLORS[1]}
            emissiveIntensity={0.3 + criticalRatio * 0.5}
            transparent
            opacity={0.8}
          />
        </mesh>
      )}
      
      {/* Unit label */}
      <Html position={[0, config.height / 2 + 1.2, 0]} center>
        <div style={{
          background: selected ? 'rgba(59, 130, 246, 0.95)' : 'rgba(0,0,0,0.85)',
          color: 'white',
          padding: '6px 10px',
          borderRadius: '6px',
          fontSize: '11px',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          border: selected ? '2px solid white' : 'none'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '2px' }}>{unit.name}</div>
          <div style={{ fontSize: '10px', opacity: 0.85 }}>
            {unit.count} assets
            {unit.tier1 > 0 && <span style={{ color: '#fca5a5' }}> • {unit.tier1} critical</span>}
          </div>
        </div>
      </Html>
    </group>
  )
}

/**
 * Network connections between units
 */
function NetworkConnections({ units, connections }) {
  return (
    <>
      {connections.map((conn, i) => {
        const from = units.find(u => u.name === conn.from)
        const to = units.find(u => u.name === conn.to)
        if (!from || !to) return null
        
        const fromConfig = UNIT_CONFIGS[from.name] || UNIT_CONFIGS.default
        const toConfig = UNIT_CONFIGS[to.name] || UNIT_CONFIGS.default
        
        return (
          <Line
            key={i}
            points={[
              [from.position[0], fromConfig.height / 2, from.position[2]],
              [to.position[0], toConfig.height / 2, to.position[2]]
            ]}
            color={conn.hasCritical ? '#ef4444' : '#64748b'}
            lineWidth={conn.strength || 1}
            transparent
            opacity={0.6}
          />
        )
      })}
    </>
  )
}

/**
 * Ground plane with grid
 */
function Ground() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <gridHelper args={[60, 30, '#334155', '#1e293b']} position={[0, -0.49, 0]} />
    </>
  )
}

/**
 * Loading spinner for 3D scene
 */
function LoadingSpinner() {
  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      color: 'white',
      textAlign: 'center'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid rgba(255,255,255,0.2)',
        borderTop: '3px solid white',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 1rem'
      }} />
      <div>Loading 3D visualization...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

/**
 * Main Plant Visualization Component
 */
export default function PlantVisualization({ result, onExport }) {
  const containerRef = useRef()
  const [selectedUnit, setSelectedUnit] = useState(null)
  const [viewMode, setViewMode] = useState('physical') // physical, network, security
  const [selectedPlant, setSelectedPlant] = useState('all') // 'all' or specific plant name
  const [isLoading, setIsLoading] = useState(true)
  
  // Extract unique plants from data
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
  
  // Calculate per-plant summaries for "All Sites" view
  const plantSummaries = useMemo(() => {
    const summaries = {}
    const assets = result?.assets || []
    
    assets.forEach(a => {
      const plantName = a.plant || a.plant_code || a.facility || 'Unknown Site'
      if (!summaries[plantName]) {
        summaries[plantName] = {
          name: plantName,
          count: 0,
          tier1: 0,
          tier2: 0,
          tier3: 0,
          units: new Set()
        }
      }
      summaries[plantName].count++
      if (a.classification?.tier === 1) summaries[plantName].tier1++
      if (a.classification?.tier === 2) summaries[plantName].tier2++
      if (a.classification?.tier === 3) summaries[plantName].tier3++
      if (a.unit) summaries[plantName].units.add(a.unit)
    })
    
    return Object.values(summaries).sort((a, b) => b.tier1 - a.tier1)
  }, [result])
  
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
          assets: [],
          subnets: new Set(),
          position: [0, 0, 0],
          plant: a.plant || a.plant_code || 'Unknown'
        }
      }
      units[unitName].count++
      units[unitName].assets.push(a)
      if (a.classification?.tier === 1) units[unitName].tier1++
      if (a.classification?.tier === 2) units[unitName].tier2++
      if (a.classification?.tier === 3) units[unitName].tier3++
      
      // Track subnets for network view
      if (a.ip_address) {
        const subnet = a.ip_address.split('.').slice(0, 3).join('.')
        units[unitName].subnets.add(subnet)
      }
    })
    
    // Calculate positions in a grid layout
    const unitArray = Object.values(units)
      .filter(u => u.name !== 'Unassigned' || u.count > 10)
      .sort((a, b) => b.tier1 - a.tier1) // Critical units first
    
    const cols = Math.ceil(Math.sqrt(unitArray.length))
    const spacing = 6
    
    unitArray.forEach((unit, i) => {
      const row = Math.floor(i / cols)
      const col = i % cols
      unit.position = [
        col * spacing - ((cols - 1) * spacing / 2), 
        0, 
        row * spacing - ((Math.ceil(unitArray.length / cols) - 1) * spacing / 2)
      ]
    })
    
    return unitArray
  }, [filteredAssets])
  
  // Infer network connections from shared subnets
  const connections = useMemo(() => {
    if (viewMode !== 'network') return []
    
    const conns = []
    
    for (let i = 0; i < processUnits.length; i++) {
      for (let j = i + 1; j < processUnits.length; j++) {
        const shared = [...processUnits[i].subnets]
          .filter(s => processUnits[j].subnets.has(s))
        
        if (shared.length > 0) {
          conns.push({
            from: processUnits[i].name,
            to: processUnits[j].name,
            hasCritical: processUnits[i].tier1 > 0 && processUnits[j].tier1 > 0,
            strength: Math.min(shared.length, 3)
          })
        }
      }
    }
    
    return conns
  }, [processUnits, viewMode])

  // Export as PNG
  const handleExport = async () => {
    if (!containerRef.current) return
    
    try {
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: '#0f172a',
        scale: 2
      })
      
      const link = document.createElement('a')
      link.download = `plant-map-${new Date().toISOString().split('T')[0]}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  // Selected unit details panel
  const selectedUnitData = selectedUnit 
    ? processUnits.find(u => u.name === selectedUnit) 
    : null

  const isMultiSite = plants.length > 1

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      borderRadius: '0.75rem',
      overflow: 'hidden',
      marginBottom: '2rem',
      border: '2px solid #334155'
    }}>
      {/* Header with controls */}
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
            🏭 The Map {isMultiSite && selectedPlant !== 'all' && `— ${selectedPlant}`}
          </h3>
          <p style={{ margin: '0.25rem 0 0', color: '#94a3b8', fontSize: '0.8rem' }}>
            {isMultiSite 
              ? `${plants.length} sites • ${selectedPlant === 'all' ? 'Enterprise view' : 'Single site view'}`
              : 'Interactive 3D plant topology'
            } • Click units to explore
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Site selector (only show if multi-site) */}
          {isMultiSite && (
            <select
              value={selectedPlant}
              onChange={(e) => {
                setSelectedPlant(e.target.value)
                setSelectedUnit(null) // Reset selected unit when changing plants
              }}
              style={{
                padding: '0.5rem 0.75rem',
                background: '#1e293b',
                color: 'white',
                border: '1px solid #475569',
                borderRadius: '0.375rem',
                fontSize: '0.8rem',
                cursor: 'pointer',
                minWidth: '160px'
              }}
            >
              <option value="all">📊 All Sites ({plants.length})</option>
              {plants.map(plant => (
                <option key={plant} value={plant}>🏭 {plant}</option>
              ))}
            </select>
          )}
          
          {/* View mode buttons */}
          {['physical', 'network', 'security'].map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: '0.5rem 1rem',
                background: viewMode === mode ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.75rem',
                textTransform: 'capitalize',
                fontWeight: viewMode === mode ? '600' : '400'
              }}
            >
              {mode}
            </button>
          ))}
          
          {/* Export button */}
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
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            📷 Export
          </button>
        </div>
      </div>
      
      {/* All Sites Summary Panel */}
      {isMultiSite && selectedPlant === 'all' && (
        <div style={{
          padding: '1rem',
          borderBottom: '1px solid #334155',
          background: 'rgba(59, 130, 246, 0.05)'
        }}>
          <div style={{ 
            fontSize: '0.75rem', 
            color: '#94a3b8', 
            marginBottom: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Enterprise Overview — {plantSummaries.length} Sites
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.75rem'
          }}>
            {plantSummaries.map(plant => (
              <div
                key={plant.name}
                onClick={() => setSelectedPlant(plant.name)}
                style={{
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid #334155',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'
                  e.currentTarget.style.borderColor = '#3b82f6'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                  e.currentTarget.style.borderColor = '#334155'
                }}
              >
                <div style={{ 
                  fontWeight: '600', 
                  color: 'white', 
                  fontSize: '0.9rem',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>{plant.name}</span>
                  <span style={{ 
                    fontSize: '0.7rem', 
                    color: '#64748b',
                    background: 'rgba(255,255,255,0.1)',
                    padding: '0.15rem 0.4rem',
                    borderRadius: '0.25rem'
                  }}>
                    {plant.units.size} units
                  </span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  gap: '0.75rem', 
                  fontSize: '0.75rem',
                  color: '#94a3b8'
                }}>
                  <span>{plant.count.toLocaleString()} assets</span>
                  {plant.tier1 > 0 && (
                    <span style={{ color: TIER_COLORS[1] }}>
                      ● {plant.tier1} critical
                    </span>
                  )}
                </div>
                {/* Mini tier bar */}
                <div style={{
                  marginTop: '0.5rem',
                  height: '3px',
                  background: '#1e293b',
                  borderRadius: '2px',
                  display: 'flex',
                  overflow: 'hidden'
                }}>
                  {plant.tier1 > 0 && (
                    <div style={{
                      width: `${(plant.tier1 / plant.count) * 100}%`,
                      background: TIER_COLORS[1]
                    }} />
                  )}
                  {plant.tier2 > 0 && (
                    <div style={{
                      width: `${(plant.tier2 / plant.count) * 100}%`,
                      background: TIER_COLORS[2]
                    }} />
                  )}
                  {plant.tier3 > 0 && (
                    <div style={{
                      width: `${(plant.tier3 / plant.count) * 100}%`,
                      background: TIER_COLORS[3]
                    }} />
                  )}
                </div>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: '0.75rem',
            fontSize: '0.7rem',
            color: '#64748b'
          }}>
            Click a site card to drill down, or use the selector above
          </div>
        </div>
      )}
      
      {/* 3D Canvas */}
      <div ref={containerRef} style={{ height: selectedPlant === 'all' && isMultiSite ? '350px' : '500px', position: 'relative' }}>
        {isLoading && <LoadingSpinner />}
        
        <Canvas 
          shadows 
          camera={{ position: [20, 20, 20], fov: 50 }}
          onCreated={() => setIsLoading(false)}
        >
          <Suspense fallback={null}>
            <ambientLight intensity={0.4} />
            <directionalLight position={[10, 15, 5]} intensity={1} castShadow />
            <pointLight position={[-10, -10, -5]} intensity={0.3} color="#3b82f6" />
            
            <Ground />
            
            {/* Process units */}
            {processUnits.map((unit) => (
              <ProcessUnit
                key={unit.name}
                unit={unit}
                position={unit.position}
                selected={selectedUnit === unit.name}
                viewMode={viewMode}
                onClick={() => setSelectedUnit(
                  unit.name === selectedUnit ? null : unit.name
                )}
              />
            ))}
            
            {/* Network connections */}
            {viewMode === 'network' && (
              <NetworkConnections 
                units={processUnits} 
                connections={connections} 
              />
            )}
            
            <OrbitControls 
              enablePan 
              enableZoom 
              enableRotate
              maxDistance={50}
              minDistance={10}
            />
          </Suspense>
        </Canvas>
        
        {/* Selected unit details panel */}
        {selectedUnitData && (
          <div style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'rgba(0,0,0,0.9)',
            padding: '1rem',
            borderRadius: '0.5rem',
            color: 'white',
            fontSize: '0.8rem',
            maxWidth: '250px',
            border: '1px solid #334155'
          }}>
            <div style={{ 
              fontWeight: '600', 
              marginBottom: '0.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              {selectedUnitData.name}
              <button
                onClick={() => setSelectedUnit(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '0 0.25rem'
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ color: '#94a3b8', lineHeight: '1.6' }}>
              <div>Total assets: <strong style={{ color: 'white' }}>{selectedUnitData.count}</strong></div>
              <div>
                <span style={{ color: TIER_COLORS[1] }}>●</span> Critical: {selectedUnitData.tier1}
              </div>
              <div>
                <span style={{ color: TIER_COLORS[2] }}>●</span> Networkable: {selectedUnitData.tier2}
              </div>
              <div>
                <span style={{ color: TIER_COLORS[3] }}>●</span> Passive: {selectedUnitData.tier3}
              </div>
              {selectedUnitData.subnets.size > 0 && (
                <div style={{ marginTop: '0.5rem', borderTop: '1px solid #334155', paddingTop: '0.5rem' }}>
                  Subnets: {[...selectedUnitData.subnets].slice(0, 3).join(', ')}
                  {selectedUnitData.subnets.size > 3 && ` +${selectedUnitData.subnets.size - 3}`}
                </div>
              )}
            </div>
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
          <span><span style={{ color: TIER_COLORS[1] }}>●</span> Critical (Tier 1)</span>
          <span><span style={{ color: TIER_COLORS[2] }}>●</span> Networkable (Tier 2)</span>
          <span><span style={{ color: TIER_COLORS[3] }}>●</span> Passive (Tier 3)</span>
        </div>
        <div style={{ color: '#64748b', fontSize: '0.7rem' }}>
          {isMultiSite && selectedPlant !== 'all' && (
            <span style={{ color: '#3b82f6', marginRight: '0.5rem' }}>
              {selectedPlant} •
            </span>
          )}
          {processUnits.length} process units • {filteredAssets.length.toLocaleString()} assets
          {isMultiSite && selectedPlant === 'all' && ` across ${plants.length} sites`}
        </div>
      </div>
    </div>
  )
}


