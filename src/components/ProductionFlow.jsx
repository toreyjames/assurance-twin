/**
 * PRODUCTION FLOW VISUALIZATION
 * Shows how raw materials flow through the plant to become finished products
 * 
 * Automotive Manufacturing Flow:
 * Steel Coils → Stamping → Body Shop → Paint → Assembly → Testing → Shipping
 * 
 * Maps OT assets to each production stage to show:
 * - What equipment is at each stage
 * - Material/product flow between stages
 * - Cycle times, throughput, status
 * - Network connections and dependencies
 */

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react'

// =============================================================================
// AUTOMOTIVE PRODUCTION STAGES
// =============================================================================

const PRODUCTION_STAGES = [
  {
    id: 'receiving',
    name: 'RECEIVING',
    shortName: 'RCV',
    description: 'Inbound materials & components',
    inputs: ['Steel Coils', 'Parts', 'Components'],
    outputs: ['Raw Materials'],
    icon: '📦',
    color: '#64748b',
    equipment: ['AGVs', 'Cranes', 'Conveyors', 'Scanners'],
    keywords: ['receiving', 'inbound', 'warehouse', 'logistics', 'material', 'storage', 'agv']
  },
  {
    id: 'stamping',
    name: 'STAMPING',
    shortName: 'STP',
    description: 'Press lines form body panels',
    inputs: ['Steel Coils'],
    outputs: ['Body Panels', 'Structural Parts'],
    icon: '🔨',
    color: '#f59e0b',
    equipment: ['Transfer Presses', 'Blanking Lines', 'Die Sets', 'Coil Feeders'],
    keywords: ['stamp', 'press', 'blanking', 'coil', 'die', 'panel']
  },
  {
    id: 'bodyshop',
    name: 'BODY SHOP',
    shortName: 'BDY',
    description: 'Robotic welding assembles body-in-white',
    inputs: ['Body Panels', 'Structural Parts'],
    outputs: ['Body-in-White'],
    icon: '🤖',
    color: '#3b82f6',
    equipment: ['Welding Robots', 'Fixtures', 'Conveyors', 'Vision Systems'],
    keywords: ['body', 'weld', 'robot', 'biw', 'framing', 'spot', 'joining']
  },
  {
    id: 'paint',
    name: 'PAINT SHOP',
    shortName: 'PNT',
    description: 'E-coat, primer, base, clear coat',
    inputs: ['Body-in-White'],
    outputs: ['Painted Body'],
    icon: '🎨',
    color: '#a855f7',
    equipment: ['E-Coat Tanks', 'Paint Robots', 'Ovens', 'Booths'],
    keywords: ['paint', 'coat', 'booth', 'oven', 'sealer', 'primer', 'ecoat', 'topcoat']
  },
  {
    id: 'assembly',
    name: 'FINAL ASSEMBLY',
    shortName: 'ASM',
    description: 'Interior, powertrain, trim installation',
    inputs: ['Painted Body', 'Engine', 'Interior', 'Wheels'],
    outputs: ['Completed Vehicle'],
    icon: '🚗',
    color: '#22c55e',
    equipment: ['Assembly Lines', 'Torque Tools', 'AGVs', 'Lift Assists'],
    keywords: ['assembly', 'trim', 'final', 'install', 'line', 'chassis', 'marriage']
  },
  {
    id: 'quality',
    name: 'QUALITY & TEST',
    shortName: 'QTY',
    description: 'Inspection, testing, validation',
    inputs: ['Completed Vehicle'],
    outputs: ['Validated Vehicle'],
    icon: '✅',
    color: '#06b6d4',
    equipment: ['Dynos', 'Leak Test', 'Vision', 'Alignment'],
    keywords: ['quality', 'test', 'inspect', 'qc', 'dyno', 'alignment', 'leak', 'audit']
  },
  {
    id: 'shipping',
    name: 'SHIPPING',
    shortName: 'SHP',
    description: 'Vehicle dispatch to dealers',
    inputs: ['Validated Vehicle'],
    outputs: ['Shipped Vehicle'],
    icon: '🚚',
    color: '#10b981',
    equipment: ['Yard Management', 'Loading', 'Tracking'],
    keywords: ['ship', 'dispatch', 'yard', 'load', 'outbound', 'delivery']
  }
]

// Supporting systems (not in main flow but feed into it)
const SUPPORT_SYSTEMS = [
  {
    id: 'powertrain',
    name: 'POWERTRAIN',
    shortName: 'PWR',
    description: 'Engine & transmission',
    feedsInto: 'assembly',
    icon: '⚙️',
    color: '#ef4444',
    keywords: ['engine', 'powertrain', 'transmission', 'motor', 'battery', 'ev']
  },
  {
    id: 'plastics',
    name: 'PLASTICS',
    shortName: 'PLS',
    description: 'Injection molding for parts',
    feedsInto: 'assembly',
    icon: '🧱',
    color: '#8b5cf6',
    keywords: ['plastic', 'injection', 'molding', 'bumper', 'fascia']
  },
  {
    id: 'utilities',
    name: 'UTILITIES',
    shortName: 'UTL',
    description: 'Power, HVAC, compressed air',
    feedsInto: 'all',
    icon: '⚡',
    color: '#84cc16',
    keywords: ['utility', 'power', 'hvac', 'air', 'compressor', 'boiler', 'chiller']
  }
]

// =============================================================================
// ASSET CLASSIFICATION
// =============================================================================

function classifyAssetToStage(asset) {
  const searchText = [
    asset.name || '',
    asset.description || '',
    asset.unit || '',
    asset.zone || '',
    asset.area || '',
    asset.system || '',
    asset.tag || ''
  ].join(' ').toLowerCase()
  
  // Check main production stages
  for (const stage of PRODUCTION_STAGES) {
    for (const keyword of stage.keywords) {
      if (searchText.includes(keyword)) {
        return { stage: stage.id, type: 'production' }
      }
    }
  }
  
  // Check support systems
  for (const system of SUPPORT_SYSTEMS) {
    for (const keyword of system.keywords) {
      if (searchText.includes(keyword)) {
        return { stage: system.id, type: 'support' }
      }
    }
  }
  
  // Default to unclassified
  return { stage: 'unclassified', type: 'unknown' }
}

// =============================================================================
// SVG FLOW COMPONENTS
// =============================================================================

function ProductionStageNode({ stage, x, y, width, height, assetCount, isSelected, onClick, scale }) {
  const [hovered, setHovered] = useState(false)
  
  return (
    <g 
      transform={`translate(${x}, ${y})`}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: 'pointer' }}
    >
      {/* Glow effect when selected/hovered */}
      {(isSelected || hovered) && (
        <rect
          x={-5}
          y={-5}
          width={width + 10}
          height={height + 10}
          rx={12}
          fill="none"
          stroke={stage.color}
          strokeWidth={2}
          opacity={0.5}
        />
      )}
      
      {/* Main container */}
      <rect
        width={width}
        height={height}
        rx={8}
        fill={`${stage.color}15`}
        stroke={stage.color}
        strokeWidth={isSelected ? 3 : 2}
      />
      
      {/* Header bar */}
      <rect
        width={width}
        height={32}
        rx={8}
        fill={stage.color}
      />
      <rect
        y={24}
        width={width}
        height={8}
        fill={stage.color}
      />
      
      {/* Icon */}
      <text
        x={15}
        y={22}
        fontSize={16}
        fill="white"
      >
        {stage.icon}
      </text>
      
      {/* Stage name */}
      <text
        x={38}
        y={22}
        fontSize={12}
        fontWeight="bold"
        fontFamily="monospace"
        fill="white"
      >
        {stage.shortName}
      </text>
      
      {/* Asset count badge */}
      <rect
        x={width - 45}
        y={8}
        width={38}
        height={18}
        rx={9}
        fill="rgba(0,0,0,0.3)"
      />
      <text
        x={width - 26}
        y={21}
        fontSize={10}
        fontWeight="bold"
        fontFamily="monospace"
        fill="white"
        textAnchor="middle"
      >
        {assetCount}
      </text>
      
      {/* Description */}
      <text
        x={width / 2}
        y={52}
        fontSize={9}
        fontFamily="monospace"
        fill="#94a3b8"
        textAnchor="middle"
      >
        {stage.description}
      </text>
      
      {/* Inputs */}
      <g transform={`translate(10, 70)`}>
        <text fontSize={8} fill="#64748b" fontFamily="monospace">IN:</text>
        {stage.inputs.slice(0, 2).map((input, i) => (
          <text key={i} x={20} y={i * 12} fontSize={8} fill="#94a3b8" fontFamily="monospace">
            {input.length > 12 ? input.slice(0, 12) + '…' : input}
          </text>
        ))}
      </g>
      
      {/* Outputs */}
      <g transform={`translate(10, ${height - 30})`}>
        <text fontSize={8} fill="#64748b" fontFamily="monospace">OUT:</text>
        {stage.outputs.slice(0, 1).map((output, i) => (
          <text key={i} x={25} y={i * 12} fontSize={8} fill={stage.color} fontFamily="monospace" fontWeight="bold">
            {output.length > 15 ? output.slice(0, 15) + '…' : output}
          </text>
        ))}
      </g>
      
      {/* Equipment icons */}
      <g transform={`translate(${width - 60}, ${height - 25})`}>
        <text fontSize={8} fill="#475569" fontFamily="monospace">
          {stage.equipment.length} types
        </text>
      </g>
    </g>
  )
}

function FlowArrow({ from, to, label, isMain = true }) {
  const midX = (from.x + to.x) / 2
  const midY = (from.y + to.y) / 2
  
  // Calculate control point for curved arrow
  const dx = to.x - from.x
  const dy = to.y - from.y
  const controlX = midX
  const controlY = midY - Math.abs(dy) * 0.3
  
  const path = `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`
  
  return (
    <g>
      {/* Arrow line */}
      <path
        d={path}
        fill="none"
        stroke={isMain ? '#22c55e' : '#64748b'}
        strokeWidth={isMain ? 3 : 2}
        strokeDasharray={isMain ? 'none' : '5,5'}
        markerEnd={`url(#arrow-${isMain ? 'main' : 'support'})`}
      />
      
      {/* Flow label */}
      {label && (
        <g transform={`translate(${midX}, ${controlY - 5})`}>
          <rect
            x={-30}
            y={-10}
            width={60}
            height={16}
            rx={4}
            fill="#1e293b"
            stroke={isMain ? '#22c55e' : '#64748b'}
            strokeWidth={1}
          />
          <text
            textAnchor="middle"
            fontSize={8}
            fontFamily="monospace"
            fill={isMain ? '#22c55e' : '#94a3b8'}
            y={3}
          >
            {label}
          </text>
        </g>
      )}
    </g>
  )
}

function SupportSystemNode({ system, x, y, assetCount, feedPoint, onClick, isSelected }) {
  const [hovered, setHovered] = useState(false)
  
  return (
    <g>
      {/* Connection line to main flow */}
      <line
        x1={x + 40}
        y1={y}
        x2={feedPoint.x}
        y2={feedPoint.y}
        stroke={system.color}
        strokeWidth={2}
        strokeDasharray="4,4"
        opacity={0.6}
      />
      
      {/* Node */}
      <g 
        transform={`translate(${x}, ${y})`}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ cursor: 'pointer' }}
      >
        <rect
          x={-5}
          y={-5}
          width={90}
          height={60}
          rx={8}
          fill={isSelected || hovered ? `${system.color}30` : `${system.color}15`}
          stroke={system.color}
          strokeWidth={isSelected ? 3 : 1.5}
        />
        
        <text x={10} y={20} fontSize={16}>{system.icon}</text>
        <text x={35} y={22} fontSize={10} fontWeight="bold" fontFamily="monospace" fill={system.color}>
          {system.shortName}
        </text>
        <text x={10} y={40} fontSize={8} fontFamily="monospace" fill="#64748b">
          {assetCount} assets
        </text>
      </g>
    </g>
  )
}

// =============================================================================
// DETAIL PANEL
// =============================================================================

function StageDetailPanel({ stage, assets, onClose }) {
  if (!stage) return null
  
  const stageConfig = [...PRODUCTION_STAGES, ...SUPPORT_SYSTEMS].find(s => s.id === stage)
  if (!stageConfig) return null
  
  // Group assets by type
  const assetsByType = assets.reduce((acc, asset) => {
    const type = asset.type || asset.device_type || 'Unknown'
    if (!acc[type]) acc[type] = []
    acc[type].push(asset)
    return acc
  }, {})
  
  return (
    <div style={{
      position: 'absolute',
      top: '1rem',
      right: '1rem',
      width: '320px',
      maxHeight: 'calc(100% - 2rem)',
      background: 'rgba(15, 23, 42, 0.98)',
      border: `2px solid ${stageConfig.color}`,
      borderRadius: '0.5rem',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        background: stageConfig.color,
        padding: '1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: '1.5rem' }}>{stageConfig.icon}</div>
          <div style={{ 
            fontWeight: '700', 
            color: 'white', 
            fontSize: '1rem',
            fontFamily: 'monospace',
            marginTop: '0.25rem'
          }}>
            {stageConfig.name}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(0,0,0,0.2)',
            border: 'none',
            color: 'white',
            borderRadius: '4px',
            width: '28px',
            height: '28px',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          ×
        </button>
      </div>
      
      {/* Content */}
      <div style={{ padding: '1rem', overflow: 'auto', flex: 1 }}>
        {/* Description */}
        <div style={{
          padding: '0.75rem',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '0.375rem',
          marginBottom: '1rem',
          fontSize: '0.8rem',
          color: '#94a3b8'
        }}>
          {stageConfig.description}
        </div>
        
        {/* Inputs/Outputs for production stages */}
        {stageConfig.inputs && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ 
              fontSize: '0.7rem', 
              color: '#64748b', 
              marginBottom: '0.5rem',
              fontFamily: 'monospace'
            }}>
              MATERIAL FLOW
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.75rem'
            }}>
              <div style={{ 
                padding: '0.25rem 0.5rem', 
                background: '#1e293b', 
                borderRadius: '4px',
                color: '#94a3b8'
              }}>
                {stageConfig.inputs[0]}
              </div>
              <span style={{ color: '#22c55e' }}>→</span>
              <div style={{ 
                padding: '0.25rem 0.5rem', 
                background: stageConfig.color,
                borderRadius: '4px',
                color: 'white',
                fontWeight: '600'
              }}>
                {stageConfig.outputs[0]}
              </div>
            </div>
          </div>
        )}
        
        {/* Equipment types */}
        {stageConfig.equipment && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ 
              fontSize: '0.7rem', 
              color: '#64748b', 
              marginBottom: '0.5rem',
              fontFamily: 'monospace'
            }}>
              EQUIPMENT TYPES
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
              {stageConfig.equipment.map((eq, i) => (
                <span key={i} style={{
                  padding: '0.2rem 0.5rem',
                  background: `${stageConfig.color}30`,
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  color: stageConfig.color
                }}>
                  {eq}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Asset breakdown */}
        <div>
          <div style={{ 
            fontSize: '0.7rem', 
            color: '#64748b', 
            marginBottom: '0.5rem',
            fontFamily: 'monospace'
          }}>
            DETECTED ASSETS ({assets.length})
          </div>
          {Object.entries(assetsByType).slice(0, 8).map(([type, typeAssets]) => (
            <div key={type} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.5rem',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '4px',
              marginBottom: '0.25rem',
              fontSize: '0.75rem'
            }}>
              <span style={{ color: '#94a3b8' }}>{type}</span>
              <span style={{ 
                color: stageConfig.color,
                fontWeight: '600',
                fontFamily: 'monospace'
              }}>
                {typeAssets.length}
              </span>
            </div>
          ))}
          {Object.keys(assetsByType).length > 8 && (
            <div style={{ 
              textAlign: 'center', 
              color: '#64748b', 
              fontSize: '0.7rem',
              marginTop: '0.5rem'
            }}>
              + {Object.keys(assetsByType).length - 8} more types
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ProductionFlow({ result }) {
  const containerRef = useRef(null)
  const [selectedStage, setSelectedStage] = useState(null)
  const [selectedPlant, setSelectedPlant] = useState('all')
  const [dimensions, setDimensions] = useState({ width: 1200, height: 600 })
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  
  // Responsive sizing
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({
          width: Math.max(rect.width, 800),
          height: Math.max(rect.height, 500)
        })
      }
    }
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])
  
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
  
  // Filter assets by plant
  const filteredAssets = useMemo(() => {
    const assets = result?.assets || []
    if (selectedPlant === 'all') return assets
    return assets.filter(a => {
      const plantName = a.plant || a.plant_code || a.facility
      return plantName === selectedPlant
    })
  }, [result, selectedPlant])
  
  // Classify assets to stages
  const stageAssets = useMemo(() => {
    const classification = {}
    
    // Initialize all stages
    PRODUCTION_STAGES.forEach(s => classification[s.id] = [])
    SUPPORT_SYSTEMS.forEach(s => classification[s.id] = [])
    classification.unclassified = []
    
    // Classify each asset
    filteredAssets.forEach(asset => {
      const { stage } = classifyAssetToStage(asset)
      if (classification[stage]) {
        classification[stage].push(asset)
      } else {
        classification.unclassified.push(asset)
      }
    })
    
    return classification
  }, [filteredAssets])
  
  // Calculate layout positions
  const layout = useMemo(() => {
    const stageWidth = 120
    const stageHeight = 140
    const spacing = 30
    const startX = 50
    const mainY = 180
    
    // Main production flow (horizontal)
    const stages = PRODUCTION_STAGES.map((stage, i) => ({
      ...stage,
      x: startX + i * (stageWidth + spacing),
      y: mainY,
      width: stageWidth,
      height: stageHeight,
      assetCount: stageAssets[stage.id]?.length || 0
    }))
    
    // Support systems (below assembly)
    const assemblyIndex = PRODUCTION_STAGES.findIndex(s => s.id === 'assembly')
    const assemblyX = startX + assemblyIndex * (stageWidth + spacing)
    
    const supports = SUPPORT_SYSTEMS.map((system, i) => {
      const feedStage = stages.find(s => s.id === system.feedsInto) || stages[assemblyIndex]
      return {
        ...system,
        x: assemblyX - 100 + i * 100,
        y: mainY + stageHeight + 80,
        assetCount: stageAssets[system.id]?.length || 0,
        feedPoint: {
          x: feedStage.x + stageWidth / 2,
          y: feedStage.y + stageHeight
        }
      }
    })
    
    // Flow connections between main stages
    const connections = []
    for (let i = 0; i < stages.length - 1; i++) {
      connections.push({
        from: { x: stages[i].x + stageWidth, y: stages[i].y + stageHeight / 2 },
        to: { x: stages[i + 1].x, y: stages[i + 1].y + stageHeight / 2 },
        label: stages[i].outputs[0]
      })
    }
    
    return { stages, supports, connections }
  }, [stageAssets])
  
  // Pan and zoom handlers
  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.5, Math.min(2, prev.scale * delta))
    }))
  }, [])
  
  const handleMouseDown = useCallback((e) => {
    if (e.target.tagName === 'svg' || e.target.tagName === 'rect') {
      setIsDragging(true)
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y })
    }
  }, [transform])
  
  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      }))
    }
  }, [isDragging, dragStart])
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])
  
  // Reset view
  const resetView = () => {
    setTransform({ x: 0, y: 0, scale: 1 })
  }
  
  if (filteredAssets.length === 0) {
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
        <div>Upload plant data to visualize production flow</div>
      </div>
    )
  }
  
  const selectedStageAssets = selectedStage ? stageAssets[selectedStage] || [] : []

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
              fontSize: '0.95rem', 
              fontWeight: '600',
              fontFamily: "'JetBrains Mono', monospace",
              display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}>
              <span style={{ color: '#334155' }}>[</span>
              PRODUCTION FLOW
              <span style={{ color: '#334155' }}>]</span>
            </h3>
            <p style={{ 
              margin: '0.2rem 0 0', 
              color: '#64748b', 
              fontSize: '0.7rem',
              fontFamily: 'monospace'
            }}>
              RAW MATERIAL → FINISHED VEHICLE
              <span style={{ color: '#334155' }}> | </span>
              {filteredAssets.length.toLocaleString()} ASSETS MAPPED
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
            {Math.round(transform.scale * 100)}%
          </div>
          
          <button
            onClick={resetView}
            style={{
              padding: '0.5rem 1rem',
              background: '#1e293b',
              color: 'white',
              border: '2px solid #334155',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontFamily: 'monospace'
            }}
          >
            ⟲ RESET
          </button>
        </div>
      </div>
      
      {/* Flow Canvas */}
      <div 
        ref={containerRef}
        style={{ 
          height: '550px', 
          position: 'relative',
          overflow: 'hidden',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg 
          width="100%" 
          height="100%"
          style={{ background: '#0f172a' }}
        >
          {/* Defs for arrows */}
          <defs>
            <marker
              id="arrow-main"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,6 L9,3 z" fill="#22c55e" />
            </marker>
            <marker
              id="arrow-support"
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,6 L7,3 z" fill="#64748b" />
            </marker>
            
            {/* Grid pattern */}
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="1"/>
            </pattern>
          </defs>
          
          {/* Grid background */}
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Transformed content */}
          <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
            {/* Title */}
            <text x={50} y={40} fontSize={24} fontWeight="bold" fontFamily="monospace" fill="white">
              AUTOMOTIVE MANUFACTURING FLOW
            </text>
            <text x={50} y={60} fontSize={12} fontFamily="monospace" fill="#64748b">
              Steel Coils → Body Panels → Body-in-White → Painted Body → Complete Vehicle
            </text>
            
            {/* Raw material input arrow */}
            <g transform="translate(10, 250)">
              <path d="M 0 0 L 30 0" stroke="#64748b" strokeWidth={3} markerEnd="url(#arrow-support)" />
              <text x={0} y={-10} fontSize={9} fontFamily="monospace" fill="#64748b">
                RAW STEEL
              </text>
            </g>
            
            {/* Flow connections */}
            {layout.connections.map((conn, i) => (
              <FlowArrow
                key={i}
                from={conn.from}
                to={conn.to}
                label={conn.label}
                isMain={true}
              />
            ))}
            
            {/* Support system nodes */}
            {layout.supports.map(system => (
              <SupportSystemNode
                key={system.id}
                system={system}
                x={system.x}
                y={system.y}
                assetCount={system.assetCount}
                feedPoint={system.feedPoint}
                isSelected={selectedStage === system.id}
                onClick={() => setSelectedStage(selectedStage === system.id ? null : system.id)}
              />
            ))}
            
            {/* Main production stages */}
            {layout.stages.map(stage => (
              <ProductionStageNode
                key={stage.id}
                stage={stage}
                x={stage.x}
                y={stage.y}
                width={stage.width}
                height={stage.height}
                assetCount={stage.assetCount}
                isSelected={selectedStage === stage.id}
                onClick={() => setSelectedStage(selectedStage === stage.id ? null : stage.id)}
                scale={transform.scale}
              />
            ))}
            
            {/* Output arrow */}
            <g transform={`translate(${layout.stages[layout.stages.length - 1].x + 120 + 10}, 250)`}>
              <path d="M 0 0 L 40 0" stroke="#22c55e" strokeWidth={3} markerEnd="url(#arrow-main)" />
              <text x={50} y={5} fontSize={11} fontFamily="monospace" fill="#22c55e" fontWeight="bold">
                🚗 FINISHED
              </text>
              <text x={50} y={18} fontSize={11} fontFamily="monospace" fill="#22c55e" fontWeight="bold">
                VEHICLE
              </text>
            </g>
            
            {/* Unclassified assets indicator */}
            {stageAssets.unclassified.length > 0 && (
              <g transform={`translate(${layout.stages[0].x}, ${layout.stages[0].y + layout.stages[0].height + 150})`}>
                <rect
                  width={200}
                  height={40}
                  rx={6}
                  fill="#1e293b"
                  stroke="#475569"
                  strokeWidth={1}
                  strokeDasharray="4,4"
                />
                <text x={10} y={25} fontSize={10} fontFamily="monospace" fill="#64748b">
                  ⚠️ {stageAssets.unclassified.length} assets unclassified
                </text>
              </g>
            )}
          </g>
        </svg>
        
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
          <div>🖱️ DRAG: Pan • SCROLL: Zoom • CLICK: Select Stage</div>
        </div>
        
        {/* Stage detail panel */}
        <StageDetailPanel
          stage={selectedStage}
          assets={selectedStageAssets}
          onClose={() => setSelectedStage(null)}
        />
      </div>
      
      {/* Footer stats */}
      <div style={{
        padding: '0.75rem 1rem',
        borderTop: '2px solid #1e293b',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.7rem',
        color: '#475569',
        fontFamily: 'monospace',
        background: '#0f172a',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {layout.stages.slice(0, 5).map(stage => (
            <span key={stage.id} style={{ color: stage.color }}>
              {stage.icon} {stage.shortName}: {stage.assetCount}
            </span>
          ))}
        </div>
        <div>
          {stageAssets.unclassified.length > 0 && (
            <span style={{ color: '#f59e0b' }}>
              ⚠️ {stageAssets.unclassified.length} UNMAPPED
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
