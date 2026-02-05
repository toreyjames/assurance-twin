/**
 * PLANT MAP WRAPPER
 * Automatically selects visualization based on industry and device capabilities
 * 
 * View modes:
 *   Automotive:
 *     - ENGINEERING (default): ISA-95 compliant schematic drawing
 *     - FLOW: Production flow (raw → finished vehicle)
 *     - 3D MODEL: Interactive Three.js plant model
 *     - 2D: Simplified 2D fallback
 * 
 *   Oil & Gas / Pharma / Utilities:
 *     - 3D Plant: Refinery-style Three.js visualization
 *     - Blocks: Simple 3D block view
 *     - 2D: Fallback
 */

import React, { useState, useEffect } from 'react'
import RefineryMap from './RefineryMap'
import PlantVisualization from './PlantVisualization'
import PlantVisualization2D from './PlantVisualization2D'
import AutomotivePlantMap from './AutomotivePlantMap'
import PlantModel3D from './PlantModel3D'
import ProductionFlow from './ProductionFlow'

/**
 * Check if WebGL is available
 */
function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    )
  } catch (e) {
    return false
  }
}

/**
 * Check if device is mobile
 */
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

/**
 * View toggle component
 */
function ViewToggle({ viewMode, setViewMode, isAutomotive, hasWebGL }) {
  const btnStyle = (mode, color = '#3b82f6') => ({
    padding: '0.375rem 0.75rem',
    background: viewMode === mode ? color : 'transparent',
    color: 'white',
    border: 'none',
    borderRadius: '0.25rem',
    cursor: 'pointer',
    fontSize: '0.7rem',
    fontWeight: viewMode === mode ? '700' : '400',
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: '0.03em',
    opacity: viewMode === mode ? 1 : 0.6,
    transition: 'all 0.15s ease'
  })

  return (
    <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{
        display: 'inline-flex', background: '#0f172a',
        borderRadius: '0.375rem', padding: '0.2rem',
        gap: '0.125rem', border: '1px solid #1e293b'
      }}>
        {/* Automotive views */}
        {isAutomotive && (
          <>
            <button onClick={() => setViewMode('schematic')} style={btnStyle('schematic', '#22c55e')}>
              ENGINEERING
            </button>
            <button onClick={() => setViewMode('flow')} style={btnStyle('flow', '#3b82f6')}>
              FLOW
            </button>
            {hasWebGL && (
              <button onClick={() => setViewMode('3d-model')} style={btnStyle('3d-model', '#a855f7')}>
                3D MODEL
              </button>
            )}
          </>
        )}

        {/* Non-automotive views */}
        {!isAutomotive && hasWebGL && (
          <>
            <button onClick={() => setViewMode('refinery')} style={btnStyle('refinery', '#3b82f6')}>
              3D PLANT
            </button>
            <button onClick={() => setViewMode('simple3d')} style={btnStyle('simple3d')}>
              BLOCKS
            </button>
          </>
        )}

        <button onClick={() => setViewMode('2d')} style={btnStyle('2d', '#64748b')}>
          2D
        </button>
      </div>
    </div>
  )
}

export default function PlantMap({ result, industry = 'oil-gas', gapMatrix, selectedPlant = 'all' }) {
  const [viewMode, setViewMode] = useState('schematic')
  const [hasWebGL, setHasWebGL] = useState(true)
  
  const isAutomotive = industry === 'automotive'
  
  useEffect(() => {
    const webglAvailable = isWebGLAvailable()
    const mobile = isMobileDevice()
    
    setHasWebGL(webglAvailable)
    
    if (!webglAvailable || mobile) {
      setViewMode(isAutomotive ? 'schematic' : '2d') // Schematic works without WebGL
    } else if (isAutomotive) {
      setViewMode('schematic') // Default to engineer-grade schematic
    } else {
      setViewMode('refinery')
    }
  }, [isAutomotive])
  
  const toggle = (
    <ViewToggle 
      viewMode={viewMode} 
      setViewMode={setViewMode} 
      isAutomotive={isAutomotive}
      hasWebGL={hasWebGL}
    />
  )

  // Automotive: Engineering Schematic (default)
  if (isAutomotive && viewMode === 'schematic') {
    return <div>{toggle}<AutomotivePlantMap result={result} /></div>
  }

  // Automotive: Production Flow
  if (isAutomotive && viewMode === 'flow') {
    return <div>{toggle}<ProductionFlow result={result} /></div>
  }
  
  // Automotive: 3D Model
  if (isAutomotive && viewMode === '3d-model') {
    return <div>{toggle}<PlantModel3D result={result} /></div>
  }
  
  return (
    <div>
      {toggle}
      
      {!hasWebGL && viewMode !== '2d' && viewMode !== 'schematic' && (
        <div style={{
          padding: '0.75rem 1rem', background: '#fef3c7',
          border: '1px solid #f59e0b', borderRadius: '0.5rem',
          marginBottom: '0.5rem', fontSize: '0.8rem', color: '#92400e'
        }}>
          3D visualization requires WebGL. Showing simplified view.
        </div>
      )}
      
      {viewMode === '2d' && <PlantVisualization2D result={result} />}
      {viewMode === 'simple3d' && <PlantVisualization result={result} />}
      {viewMode === 'refinery' && (
        <RefineryMap result={result} industry={industry} gapMatrix={gapMatrix} />
      )}
    </div>
  )
}
