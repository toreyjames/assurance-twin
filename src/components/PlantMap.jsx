/**
 * PLANT MAP WRAPPER
 * Automatically selects 3D or 2D visualization based on device capabilities
 * Now uses the enhanced RefineryMap for realistic industrial visualization
 */

import React, { useState, useEffect } from 'react'
import RefineryMap from './RefineryMap'
import PlantVisualization from './PlantVisualization'
import PlantVisualization2D from './PlantVisualization2D'

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

export default function PlantMap({ result, industry = 'oil-gas', gapMatrix }) {
  const [viewMode, setViewMode] = useState('refinery') // 'refinery', 'simple3d', '2d'
  const [hasWebGL, setHasWebGL] = useState(true)
  
  useEffect(() => {
    const webglAvailable = isWebGLAvailable()
    const mobile = isMobileDevice()
    
    setHasWebGL(webglAvailable)
    if (!webglAvailable || mobile) {
      setViewMode('2d')
    }
  }, [])
  
  return (
    <div>
      {/* View toggle (only show if WebGL is available) */}
      {hasWebGL && (
        <div style={{
          marginBottom: '0.5rem',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <div style={{
            display: 'inline-flex',
            background: '#1e293b',
            borderRadius: '0.375rem',
            padding: '0.25rem',
            gap: '0.125rem'
          }}>
            <button
              onClick={() => setViewMode('refinery')}
              style={{
                padding: '0.375rem 0.75rem',
                background: viewMode === 'refinery' ? '#3b82f6' : 'transparent',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: viewMode === 'refinery' ? '600' : '400'
              }}
            >
              🏭 Refinery
            </button>
            <button
              onClick={() => setViewMode('simple3d')}
              style={{
                padding: '0.375rem 0.75rem',
                background: viewMode === 'simple3d' ? '#3b82f6' : 'transparent',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: viewMode === 'simple3d' ? '600' : '400'
              }}
            >
              📦 Blocks
            </button>
            <button
              onClick={() => setViewMode('2d')}
              style={{
                padding: '0.375rem 0.75rem',
                background: viewMode === '2d' ? '#3b82f6' : 'transparent',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: viewMode === '2d' ? '600' : '400'
              }}
            >
              📊 2D
            </button>
          </div>
        </div>
      )}
      
      {/* No WebGL warning */}
      {!hasWebGL && (
        <div style={{
          padding: '0.75rem 1rem',
          background: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '0.5rem',
          marginBottom: '0.5rem',
          fontSize: '0.8rem',
          color: '#92400e'
        }}>
          ⚠️ 3D visualization requires WebGL. Showing simplified 2D view.
        </div>
      )}
      
      {/* Render appropriate visualization */}
      {viewMode === '2d' && (
        <PlantVisualization2D result={result} />
      )}
      {viewMode === 'simple3d' && (
        <PlantVisualization result={result} />
      )}
      {viewMode === 'refinery' && (
        <RefineryMap result={result} industry={industry} gapMatrix={gapMatrix} />
      )}
    </div>
  )
}


