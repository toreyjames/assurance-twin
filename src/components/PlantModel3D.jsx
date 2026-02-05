/**
 * PLANT MODEL 3D
 * Interactive 3D visualization of automotive manufacturing plant
 * 
 * Features:
 * - Actual 3D building models representing plant areas
 * - Zoom, pan, rotate controls
 * - Data-driven layout from asset relationships
 * - Click to explore areas
 * - Production flow visualization
 */

import React, { useMemo, useState, useRef, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Text, Html, Sky, Grid, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { generatePlantLayout } from '../lib/context/layout-engine.js'
import html2canvas from 'html2canvas'

// =============================================================================
// AUTOMOTIVE BUILDING CONFIGURATIONS
// =============================================================================

const BUILDING_CONFIG = {
  'stamping': {
    label: 'STAMPING',
    color: '#f59e0b',
    height: 12,
    roofType: 'sawtooth', // Industrial sawtooth roof
    description: 'Press Lines'
  },
  'body_shop': {
    label: 'BODY SHOP',
    color: '#3b82f6',
    height: 10,
    roofType: 'flat',
    description: 'Robotic Welding'
  },
  'paint_shop': {
    label: 'PAINT',
    color: '#a855f7',
    height: 14,
    roofType: 'peaked',
    description: 'Coating Lines'
  },
  'plastics': {
    label: 'PLASTICS',
    color: '#06b6d4',
    height: 8,
    roofType: 'flat',
    description: 'Injection Molding'
  },
  'assembly': {
    label: 'ASSEMBLY',
    color: '#22c55e',
    height: 10,
    roofType: 'flat',
    description: 'Final Assembly'
  },
  'powertrain': {
    label: 'POWERTRAIN',
    color: '#ef4444',
    height: 9,
    roofType: 'flat',
    description: 'Engine/Trans'
  },
  'battery': {
    label: 'BATTERY',
    color: '#f97316',
    height: 8,
    roofType: 'flat',
    description: 'EV Pack Assembly'
  },
  'quality': {
    label: 'QUALITY',
    color: '#6366f1',
    height: 6,
    roofType: 'flat',
    description: 'Test & Inspection'
  },
  'logistics': {
    label: 'LOGISTICS',
    color: '#64748b',
    height: 7,
    roofType: 'flat',
    description: 'Warehouse'
  },
  'plant_utilities': {
    label: 'UTILITIES',
    color: '#84cc16',
    height: 8,
    roofType: 'peaked',
    description: 'Power/HVAC'
  }
}

const DEFAULT_BUILDING = {
  label: 'BUILDING',
  color: '#94a3b8',
  height: 8,
  roofType: 'flat',
  description: 'Process Area'
}

// =============================================================================
// 3D FACTORY BUILDING COMPONENT
// =============================================================================

function FactoryBuilding({ position, width, depth, config, assetCount, name, isSelected, onClick }) {
  const meshRef = useRef()
  const [hovered, setHovered] = useState(false)
  
  const height = config.height
  const color = new THREE.Color(config.color)
  
  // Pulse animation for selected building
  useFrame((state) => {
    if (meshRef.current && isSelected) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.02
      meshRef.current.scale.y = scale
    } else if (meshRef.current) {
      meshRef.current.scale.y = 1
    }
  })

  return (
    <group position={position}>
      {/* Foundation/base */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[width + 2, 0.2, depth + 2]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      
      {/* Main building structure */}
      <mesh 
        ref={meshRef}
        position={[0, height / 2, 0]} 
        castShadow 
        receiveShadow
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial 
          color={hovered || isSelected ? color.clone().multiplyScalar(1.3) : color}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>
      
      {/* Roof structure based on type */}
      {config.roofType === 'sawtooth' && (
        <SawtoothRoof position={[0, height, 0]} width={width} depth={depth} color={config.color} />
      )}
      {config.roofType === 'peaked' && (
        <PeakedRoof position={[0, height, 0]} width={width} depth={depth} color={config.color} />
      )}
      {config.roofType === 'flat' && (
        <FlatRoof position={[0, height, 0]} width={width} depth={depth} color={config.color} />
      )}
      
      {/* Building windows (grid pattern) */}
      <BuildingWindows position={[0, height / 2, depth / 2 + 0.1]} width={width} height={height} />
      <BuildingWindows position={[0, height / 2, -depth / 2 - 0.1]} width={width} height={height} />
      
      {/* Loading docks */}
      <LoadingDocks position={[width / 2 + 1, 1.5, 0]} count={Math.min(3, Math.ceil(assetCount / 300))} />
      
      {/* Selection indicator */}
      {isSelected && (
        <mesh position={[0, 0.2, 0]}>
          <ringGeometry args={[Math.max(width, depth) / 2 + 2, Math.max(width, depth) / 2 + 3, 32]} />
          <meshBasicMaterial color="white" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
      
      {/* Building label */}
      <Html
        position={[0, height + 5, 0]}
        center
        style={{
          pointerEvents: 'none',
          userSelect: 'none'
        }}
      >
        <div style={{
          background: isSelected ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.85)',
          color: isSelected ? config.color : 'white',
          padding: '6px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold',
          fontFamily: 'monospace',
          whiteSpace: 'nowrap',
          border: `2px solid ${config.color}`,
          boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
        }}>
          <div>{config.label}</div>
          <div style={{ 
            fontSize: '10px', 
            opacity: 0.8,
            fontWeight: 'normal',
            marginTop: '2px'
          }}>
            {assetCount.toLocaleString()} assets
          </div>
        </div>
      </Html>
    </group>
  )
}

// =============================================================================
// ROOF COMPONENTS
// =============================================================================

function SawtoothRoof({ position, width, depth, color }) {
  const teeth = Math.floor(depth / 8)
  
  return (
    <group position={position}>
      {Array.from({ length: teeth }).map((_, i) => (
        <mesh key={i} position={[0, 1.5, (i - teeth / 2 + 0.5) * (depth / teeth)]} castShadow>
          <boxGeometry args={[width, 3, depth / teeth - 0.5]} />
          <meshStandardMaterial color={new THREE.Color(color).multiplyScalar(0.8)} />
        </mesh>
      ))}
    </group>
  )
}

function PeakedRoof({ position, width, depth, color }) {
  const roofGeometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-width / 2, 0)
    shape.lineTo(0, 4)
    shape.lineTo(width / 2, 0)
    shape.lineTo(-width / 2, 0)
    
    const extrudeSettings = { depth: depth, bevelEnabled: false }
    return new THREE.ExtrudeGeometry(shape, extrudeSettings)
  }, [width, depth])
  
  return (
    <mesh position={[0, 0, -depth / 2]} geometry={roofGeometry} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <meshStandardMaterial color={new THREE.Color(color).multiplyScalar(0.7)} />
    </mesh>
  )
}

function FlatRoof({ position, width, depth, color }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[width + 0.5, 1, depth + 0.5]} />
        <meshStandardMaterial color={new THREE.Color(color).multiplyScalar(0.6)} />
      </mesh>
      {/* HVAC units */}
      <mesh position={[width / 4, 2, 0]} castShadow>
        <boxGeometry args={[4, 3, 4]} />
        <meshStandardMaterial color="#475569" metalness={0.5} />
      </mesh>
    </group>
  )
}

// =============================================================================
// BUILDING DETAIL COMPONENTS
// =============================================================================

function BuildingWindows({ position, width, height }) {
  const cols = Math.floor(width / 6)
  const rows = Math.floor(height / 4)
  
  return (
    <group position={position}>
      {Array.from({ length: rows }).map((_, row) => (
        Array.from({ length: cols }).map((_, col) => (
          <mesh 
            key={`${row}-${col}`}
            position={[
              (col - cols / 2 + 0.5) * 5,
              (row - rows / 2 + 0.5) * 3.5,
              0
            ]}
          >
            <planeGeometry args={[3, 2]} />
            <meshStandardMaterial 
              color="#1e3a5f" 
              emissive="#1e3a5f"
              emissiveIntensity={0.2}
            />
          </mesh>
        ))
      ))}
    </group>
  )
}

function LoadingDocks({ position, count }) {
  return (
    <group position={position}>
      {Array.from({ length: count }).map((_, i) => (
        <group key={i} position={[0, 0, (i - count / 2 + 0.5) * 6]}>
          {/* Dock platform */}
          <mesh position={[1, 0, 0]}>
            <boxGeometry args={[3, 3, 4]} />
            <meshStandardMaterial color="#374151" />
          </mesh>
          {/* Dock door */}
          <mesh position={[-0.5, 0, 0]}>
            <boxGeometry args={[0.3, 2.5, 3]} />
            <meshStandardMaterial color="#1f2937" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// =============================================================================
// PRODUCTION FLOW LINES
// =============================================================================

function ProductionFlowLines({ connections, nodes, showFlow }) {
  if (!showFlow) return null
  
  return (
    <group>
      {connections.filter(c => c.isProductionFlow).map((conn, i) => {
        const fromNode = nodes.find(n => n.name === conn.from)
        const toNode = nodes.find(n => n.name === conn.to)
        
        if (!fromNode || !toNode) return null
        
        const start = new THREE.Vector3(fromNode.x / 10, 0.5, fromNode.y / 10)
        const end = new THREE.Vector3(toNode.x / 10, 0.5, toNode.y / 10)
        const mid = new THREE.Vector3().lerpVectors(start, end, 0.5)
        mid.y = 2 // Arch the line
        
        const curve = new THREE.QuadraticBezierCurve3(start, mid, end)
        const points = curve.getPoints(50)
        
        return (
          <group key={i}>
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={points.length}
                  array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial color="#22c55e" linewidth={2} />
            </line>
            {/* Arrow at end */}
            <mesh position={[end.x, end.y + 0.5, end.z]}>
              <coneGeometry args={[0.5, 1, 8]} />
              <meshBasicMaterial color="#22c55e" />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

// =============================================================================
// GROUND AND ENVIRONMENT
// =============================================================================

function PlantGround({ width, depth }) {
  return (
    <group>
      {/* Main ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      
      {/* Roads */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, depth / 4]} receiveShadow>
        <planeGeometry args={[width, 8]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -depth / 4]} receiveShadow>
        <planeGeometry args={[width, 8]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      
      {/* Parking areas */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-width / 2 + 15, 0.01, 0]} receiveShadow>
        <planeGeometry args={[20, depth - 20]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
    </group>
  )
}

// =============================================================================
// CAMERA CONTROLLER WITH ZOOM INFO
// =============================================================================

function CameraController({ onZoomChange }) {
  const { camera } = useThree()
  
  useFrame(() => {
    if (onZoomChange) {
      const distance = camera.position.length()
      onZoomChange(distance)
    }
  })
  
  return null
}

// =============================================================================
// LOADING INDICATOR
// =============================================================================

function LoadingIndicator() {
  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      color: 'white',
      textAlign: 'center',
      fontFamily: 'monospace'
    }}>
      <div style={{
        width: '50px',
        height: '50px',
        border: '3px solid rgba(255,255,255,0.2)',
        borderTop: '3px solid #22c55e',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 1rem'
      }} />
      <div>LOADING 3D MODEL...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function PlantModel3D({ result }) {
  const containerRef = useRef()
  const [selectedNode, setSelectedNode] = useState(null)
  const [selectedPlant, setSelectedPlant] = useState('all')
  const [showFlow, setShowFlow] = useState(true)
  const [zoomLevel, setZoomLevel] = useState(100)
  const [isLoading, setIsLoading] = useState(true)
  
  // Extract unique plants
  const plants = useMemo(() => {
    const plantSet = new Set()
    const assets = result?.assets || []
    assets.forEach(a => {
      const plantName = a.plant || a.plant_code || a.facility
      if (plantName) plantSet.add(plantName)
    })
    return Array.from(plantSet).sort()
  }, [result])
  
  // Filter assets
  const filteredAssets = useMemo(() => {
    const assets = result?.assets || []
    if (selectedPlant === 'all') return assets
    return assets.filter(a => {
      const plantName = a.plant || a.plant_code || a.facility
      return plantName === selectedPlant
    })
  }, [result, selectedPlant])
  
  // Generate layout
  const layout = useMemo(() => {
    if (filteredAssets.length === 0) return null
    return generatePlantLayout(filteredAssets, {
      industry: 'automotive',
      width: 800,
      height: 600
    })
  }, [filteredAssets])
  
  // Convert 2D layout to 3D positions
  const buildings = useMemo(() => {
    if (!layout) return []
    
    return layout.nodes.map(node => {
      const config = BUILDING_CONFIG[node.detectedType] || DEFAULT_BUILDING
      const sizeMultiplier = Math.max(0.8, Math.min(1.5, Math.sqrt(node.assetCount) / 20))
      
      return {
        ...node,
        config,
        position: [node.x / 10 - 40, 0, node.y / 10 - 30],
        width: 15 * sizeMultiplier,
        depth: 12 * sizeMultiplier
      }
    })
  }, [layout])
  
  // Export
  const handleExport = async () => {
    if (!containerRef.current) return
    try {
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: '#0f172a',
        scale: 2
      })
      const link = document.createElement('a')
      link.download = `plant-3d-model-${new Date().toISOString().split('T')[0]}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Export failed:', err)
    }
  }
  
  if (!layout || layout.nodes.length === 0) {
    return (
      <div style={{
        background: '#0f172a',
        borderRadius: '0.5rem',
        padding: '3rem',
        textAlign: 'center',
        color: '#64748b',
        border: '2px solid #1e293b',
        fontFamily: 'monospace'
      }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>[ NO DATA ]</div>
        <div>Upload plant data to generate 3D model</div>
      </div>
    )
  }
  
  const selectedBuilding = selectedNode 
    ? buildings.find(b => b.name === selectedNode) 
    : null

  return (
    <div style={{
      background: '#0f172a',
      borderRadius: '0.5rem',
      overflow: 'hidden',
      border: '2px solid #1e293b'
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem',
        borderBottom: '2px solid #1e293b',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
        background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div>
            <h3 style={{ 
              margin: 0, 
              color: 'white', 
              fontSize: '1rem', 
              fontWeight: '600',
              fontFamily: 'monospace'
            }}>
              [ 3D PLANT MODEL ]
            </h3>
            <p style={{ 
              margin: '0.25rem 0 0', 
              color: '#64748b', 
              fontSize: '0.75rem',
              fontFamily: 'monospace'
            }}>
              {buildings.length} BUILDINGS • {layout.summary.totalAssets.toLocaleString()} ASSETS
            </p>
          </div>
          
          {/* Site selector */}
          {plants.length > 1 && (
            <select
              value={selectedPlant}
              onChange={(e) => setSelectedPlant(e.target.value)}
              style={{
                padding: '0.5rem 1rem',
                background: '#1e293b',
                color: 'white',
                border: '2px solid #334155',
                borderRadius: '0.375rem',
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                cursor: 'pointer'
              }}
            >
              <option value="all">ALL SITES ({plants.length})</option>
              {plants.map(plant => (
                <option key={plant} value={plant}>{plant}</option>
              ))}
            </select>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Zoom indicator */}
          <div style={{
            padding: '0.5rem 0.75rem',
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '0.375rem',
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            color: '#94a3b8'
          }}>
            ZOOM: {Math.round(100 - zoomLevel / 2)}%
          </div>
          
          <button
            onClick={() => setShowFlow(!showFlow)}
            style={{
              padding: '0.5rem 1rem',
              background: showFlow ? '#22c55e' : '#1e293b',
              color: 'white',
              border: `2px solid ${showFlow ? '#22c55e' : '#334155'}`,
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: '600',
              fontFamily: 'monospace'
            }}
          >
            {showFlow ? '◉ FLOW' : '○ FLOW'}
          </button>
          
          <button
            onClick={handleExport}
            style={{
              padding: '0.5rem 1rem',
              background: '#3b82f6',
              color: 'white',
              border: '2px solid #3b82f6',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: '600',
              fontFamily: 'monospace'
            }}
          >
            ⬇ EXPORT
          </button>
        </div>
      </div>
      
      {/* 3D Canvas */}
      <div ref={containerRef} style={{ height: '600px', position: 'relative' }}>
        {isLoading && <LoadingIndicator />}
        
        <Canvas
          shadows
          onCreated={() => setIsLoading(false)}
          camera={{ position: [80, 60, 80], fov: 50 }}
        >
          <Suspense fallback={null}>
            {/* Lighting */}
            <ambientLight intensity={0.4} />
            <directionalLight
              position={[50, 80, 30]}
              intensity={1}
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
              shadow-camera-far={200}
              shadow-camera-left={-100}
              shadow-camera-right={100}
              shadow-camera-top={100}
              shadow-camera-bottom={-100}
            />
            <pointLight position={[-30, 20, -30]} intensity={0.3} color="#3b82f6" />
            
            {/* Sky */}
            <Sky sunPosition={[100, 50, 100]} />
            
            {/* Ground and grid */}
            <PlantGround width={150} depth={120} />
            <Grid
              args={[150, 120]}
              position={[0, 0.02, 0]}
              cellSize={5}
              cellThickness={0.5}
              cellColor="#334155"
              sectionSize={20}
              sectionThickness={1}
              sectionColor="#475569"
              fadeDistance={200}
              infiniteGrid
            />
            
            {/* Buildings */}
            {buildings.map(building => (
              <FactoryBuilding
                key={building.name}
                position={building.position}
                width={building.width}
                depth={building.depth}
                config={building.config}
                assetCount={building.assetCount}
                name={building.name}
                isSelected={selectedNode === building.name}
                onClick={() => setSelectedNode(
                  selectedNode === building.name ? null : building.name
                )}
              />
            ))}
            
            {/* Production flow lines */}
            <ProductionFlowLines 
              connections={layout.connections} 
              nodes={layout.nodes}
              showFlow={showFlow}
            />
            
            {/* Camera controls */}
            <OrbitControls
              enablePan
              enableZoom
              enableRotate
              minDistance={30}
              maxDistance={200}
              maxPolarAngle={Math.PI / 2.2}
            />
            
            <CameraController onZoomChange={setZoomLevel} />
          </Suspense>
        </Canvas>
        
        {/* Controls help */}
        <div style={{
          position: 'absolute',
          bottom: '1rem',
          left: '1rem',
          background: 'rgba(15, 23, 42, 0.9)',
          border: '1px solid #334155',
          borderRadius: '0.375rem',
          padding: '0.5rem 0.75rem',
          fontSize: '0.7rem',
          fontFamily: 'monospace',
          color: '#64748b'
        }}>
          <div>🖱️ LEFT: Rotate • RIGHT: Pan • SCROLL: Zoom</div>
        </div>
        
        {/* Selected building info */}
        {selectedBuilding && (
          <div style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            width: '280px',
            background: 'rgba(15, 23, 42, 0.95)',
            border: `2px solid ${selectedBuilding.config.color}`,
            borderRadius: '0.5rem',
            overflow: 'hidden'
          }}>
            <div style={{
              background: selectedBuilding.config.color,
              padding: '0.75rem 1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ 
                  fontWeight: '700', 
                  color: 'white', 
                  fontSize: '0.9rem',
                  fontFamily: 'monospace'
                }}>
                  {selectedBuilding.config.label}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)' }}>
                  {selectedBuilding.name}
                </div>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                style={{
                  background: 'rgba(0,0,0,0.2)',
                  border: 'none',
                  color: 'white',
                  borderRadius: '4px',
                  width: '24px',
                  height: '24px',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '1rem' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem'
              }}>
                <div style={{
                  background: 'rgba(255,255,255,0.05)',
                  padding: '0.75rem',
                  borderRadius: '0.375rem',
                  textAlign: 'center'
                }}>
                  <div style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: '700', 
                    color: 'white',
                    fontFamily: 'monospace'
                  }}>
                    {selectedBuilding.assetCount.toLocaleString()}
                  </div>
                  <div style={{ 
                    fontSize: '0.65rem', 
                    color: '#64748b',
                    textTransform: 'uppercase'
                  }}>
                    Assets
                  </div>
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.05)',
                  padding: '0.75rem',
                  borderRadius: '0.375rem',
                  textAlign: 'center'
                }}>
                  <div style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: '700', 
                    color: selectedBuilding.config.color,
                    fontFamily: 'monospace'
                  }}>
                    {selectedBuilding.subnets?.length || 0}
                  </div>
                  <div style={{ 
                    fontSize: '0.65rem', 
                    color: '#64748b',
                    textTransform: 'uppercase'
                  }}>
                    Subnets
                  </div>
                </div>
              </div>
              <div style={{
                marginTop: '0.75rem',
                padding: '0.5rem',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                color: '#94a3b8'
              }}>
                {selectedBuilding.config.description}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div style={{
        padding: '0.75rem 1rem',
        borderTop: '2px solid #1e293b',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.7rem',
        color: '#475569',
        fontFamily: 'monospace',
        background: '#0f172a'
      }}>
        <div>CLICK BUILDINGS TO SELECT • DRAG TO ROTATE • SCROLL TO ZOOM</div>
        <div>{layout.summary.detectedTypes.length} AREA TYPES DETECTED</div>
      </div>
    </div>
  )
}
