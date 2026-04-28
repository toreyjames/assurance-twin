/**
 * REFINERY MAP - Realistic Industrial Plant Visualization
 * Shows actual process flow with proper equipment and connections
 */

import React, { useMemo, useRef, useState, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Sky, Environment, Html, Line, Text } from '@react-three/drei'
import html2canvas from 'html2canvas'
import {
  DistillationColumn,
  Reactor,
  StorageTank,
  HeatExchanger,
  FlareStack,
  ControlRoom,
  Furnace,
  Pump,
  Pipe
} from './PlantEquipment'
import { buildPlantMapModel } from '../lib/core/plant-map-model.js'

// Industry-specific process layouts
const INDUSTRY_LAYOUTS = {
  'oil-gas': {
    // Crude intake section
    'Tank Farm': { position: [-25, 0, 15], equipment: 'tanks', section: 'intake', flowOrder: 1 },
    // Primary processing
    'Crude Distillation Unit': { position: [-10, 0, 0], equipment: 'column', height: 10, section: 'primary', flowOrder: 2 },
    'CDU': { position: [-10, 0, 0], equipment: 'column', height: 10, section: 'primary', flowOrder: 2 },
    'Vacuum Distillation': { position: [-5, 0, 6], equipment: 'column', height: 8, section: 'primary', flowOrder: 2 },
    'VDU': { position: [-5, 0, 6], equipment: 'column', height: 8, section: 'primary', flowOrder: 2 },
    // Secondary processing
    'Fluid Catalytic Cracker': { position: [5, 0, -8], equipment: 'reactor', section: 'conversion', flowOrder: 3 },
    'Fluid Catalytic Cracking': { position: [5, 0, -8], equipment: 'reactor', section: 'conversion', flowOrder: 3 },
    'FCC': { position: [5, 0, -8], equipment: 'reactor', section: 'conversion', flowOrder: 3 },
    'Reformer': { position: [5, 0, 8], equipment: 'column', height: 7, section: 'conversion', flowOrder: 3 },
    'Alkylation': { position: [10, 0, 14], equipment: 'reactor', section: 'conversion', flowOrder: 3 },
    'Isomerization': { position: [0, 0, 14], equipment: 'column', height: 6, section: 'conversion', flowOrder: 3 },
    'Hydrocracker': { position: [15, 0, -8], equipment: 'reactor', section: 'conversion', flowOrder: 4 },
    'Coker Unit': { position: [15, 0, 8], equipment: 'column', height: 9, section: 'conversion', flowOrder: 4 },
    'Coker': { position: [15, 0, 8], equipment: 'column', height: 9, section: 'conversion', flowOrder: 4 },
    // Treatment
    'Hydrotreater': { position: [25, 0, 0], equipment: 'exchanger', section: 'treating', flowOrder: 5 },
    'Sulfur Recovery': { position: [25, 0, -10], equipment: 'furnace', section: 'treating', flowOrder: 5 },
    // Utilities & support
    'Utilities': { position: [-20, 0, -15], equipment: 'furnace', section: 'utilities', flowOrder: 0 },
    'Control Room': { position: [-25, 0, -10], equipment: 'controlroom', section: 'control', flowOrder: 0 },
    'Flare System': { position: [30, 0, -15], equipment: 'flare', section: 'safety', flowOrder: 0 },
    // Output
    'Loading Rack': { position: [35, 0, 10], equipment: 'tanks', section: 'output', flowOrder: 6 },
    'Loading': { position: [35, 0, 10], equipment: 'tanks', section: 'output', flowOrder: 6 },
    'Wastewater Treatment': { position: [30, 0, 20], equipment: 'tank', section: 'environmental', flowOrder: 7 }
  },
  
  'pharma': {
    // Reaction suites
    'Reactor Suite A': { position: [-20, 0, 0], equipment: 'reactor', section: 'reaction', flowOrder: 1 },
    'Reactor Suite B': { position: [-20, 0, 10], equipment: 'reactor', section: 'reaction', flowOrder: 1 },
    // Processing
    'Purification': { position: [-5, 0, 5], equipment: 'column', height: 6, section: 'purification', flowOrder: 2 },
    'Drying': { position: [5, 0, 0], equipment: 'exchanger', section: 'processing', flowOrder: 3 },
    // Formulation
    'Granulation': { position: [15, 0, -5], equipment: 'tank', section: 'formulation', flowOrder: 4 },
    'Tablet Press': { position: [15, 0, 5], equipment: 'exchanger', section: 'formulation', flowOrder: 4 },
    'Coating': { position: [25, 0, 0], equipment: 'tank', section: 'formulation', flowOrder: 5 },
    // Packaging
    'Blister Pack': { position: [35, 0, -5], equipment: 'exchanger', section: 'packaging', flowOrder: 6 },
    'Serialization': { position: [35, 0, 5], equipment: 'exchanger', section: 'packaging', flowOrder: 6 },
    // Utilities
    'Clean Utilities': { position: [-25, 0, -15], equipment: 'tank', section: 'utilities', flowOrder: 0 },
    'HVAC': { position: [-15, 0, -15], equipment: 'furnace', section: 'utilities', flowOrder: 0 },
    'QC Lab': { position: [0, 0, -15], equipment: 'controlroom', section: 'quality', flowOrder: 0 }
  },
  
  'utilities': {
    // Generation
    'Turbine Hall': { position: [-20, 0, 0], equipment: 'column', height: 8, section: 'generation', flowOrder: 1 },
    'Generator': { position: [-10, 0, 0], equipment: 'reactor', section: 'generation', flowOrder: 2 },
    // Transmission
    'Transformer Yard': { position: [5, 0, -8], equipment: 'tanks', section: 'transmission', flowOrder: 3 },
    'Switchyard': { position: [5, 0, 8], equipment: 'tanks', section: 'transmission', flowOrder: 3 },
    // Support
    'Cooling Tower': { position: [-25, 0, 15], equipment: 'column', height: 6, section: 'cooling', flowOrder: 0 },
    'Fuel Handling': { position: [-25, 0, -10], equipment: 'tanks', section: 'fuel', flowOrder: 0 },
    'Water Treatment': { position: [20, 0, 15], equipment: 'tank', section: 'treatment', flowOrder: 5 },
    'Emissions Control': { position: [25, 0, 0], equipment: 'column', height: 7, section: 'environmental', flowOrder: 4 },
    'Battery Storage': { position: [20, 0, -10], equipment: 'tanks', section: 'storage', flowOrder: 4 },
    'Protection': { position: [15, 0, -15], equipment: 'controlroom', section: 'control', flowOrder: 0 }
  }
}

// Default refinery layout for backwards compatibility
const REFINERY_LAYOUT = INDUSTRY_LAYOUTS['oil-gas']

/**
 * Simple hash function for plant names
 * Returns a consistent value for the same input
 */
function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

/**
 * Seeded random number generator
 * Returns consistent "random" values for the same seed
 */
function seededRandom(seed) {
  let value = seed
  return function() {
    value = (value * 16807) % 2147483647
    return (value - 1) / 2147483646
  }
}

/**
 * Guess equipment type from unit name
 */
function guessEquipmentType(unitName) {
  const name = (unitName || '').toLowerCase()
  
  if (name.includes('tank') || name.includes('storage')) return 'tanks'
  if (name.includes('column') || name.includes('distill') || name.includes('tower')) return 'column'
  if (name.includes('reactor') || name.includes('crack') || name.includes('convert')) return 'reactor'
  if (name.includes('control') || name.includes('room') || name.includes('center')) return 'controlroom'
  if (name.includes('flare') || name.includes('burn')) return 'flare'
  if (name.includes('boiler') || name.includes('furnace') || name.includes('heater')) return 'furnace'
  if (name.includes('heat') || name.includes('exchange') || name.includes('cool')) return 'exchanger'
  if (name.includes('load') || name.includes('ship') || name.includes('terminal')) return 'tanks'
  
  return 'reactor' // Default
}

function normalizeUnitName(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function unitNameMatches(unitName, targetName) {
  const unit = normalizeUnitName(unitName)
  const target = normalizeUnitName(targetName)
  return unit === target || unit.includes(target) || target.includes(unit)
}

function findTemplateLayout(unitName, baseTemplate) {
  const direct = baseTemplate[unitName]
  if (direct) return direct

  const unit = normalizeUnitName(unitName)
  const entry = Object.entries(baseTemplate).find(([name]) => {
    const templateName = normalizeUnitName(name)
    return unit.includes(templateName) || templateName.includes(unit)
  })
  return entry?.[1] || null
}

/**
 * Generate a plant-specific layout based on actual units in the data
 * Each plant gets a unique but consistent layout based on its name
 */
function generatePlantLayout(plantName, units, baseTemplate, industry) {
  const seed = hashString(plantName || 'default')
  const rng = seededRandom(seed)
  
  const layout = {}
  const usedPositions = new Set()
  
  // Track positions used to avoid overlap
  const positionKey = (x, z) => `${Math.round(x/5)*5}_${Math.round(z/5)*5}`
  
  // Different layout patterns for variety
  const layoutPattern = seed % 4
  const xMultiplier = layoutPattern < 2 ? 1 : -1
  const zMultiplier = layoutPattern % 2 === 0 ? 1 : -1
  
  // Scale factor based on number of units
  const scaleFactor = Math.max(0.8, Math.min(1.3, units.length / 10))
  
  let autoIndex = 0
  
  units.forEach((unit) => {
    const templateLayout = findTemplateLayout(unit.name, baseTemplate)
    
    if (templateLayout) {
      // Use template position but add plant-specific offset
      const offsetX = (rng() - 0.5) * 6 * xMultiplier
      const offsetZ = (rng() - 0.5) * 6 * zMultiplier
      
      const newPosition = [
        templateLayout.position[0] * scaleFactor + offsetX,
        templateLayout.position[1],
        templateLayout.position[2] * scaleFactor + offsetZ
      ]
      
      // Adjust height based on asset count (more assets = slightly larger)
      const heightMultiplier = Math.min(1.4, Math.max(0.9, unit.count / 15))
      
      layout[unit.name] = {
        ...templateLayout,
        position: newPosition,
        height: templateLayout.height ? templateLayout.height * heightMultiplier : undefined,
        isDynamic: true
      }
      
      usedPositions.add(positionKey(newPosition[0], newPosition[2]))
    } else {
      // Auto-position unknown units in a spiral pattern
      const angle = autoIndex * 0.7 // Spiral angle
      const radius = 40 + autoIndex * 3 // Increasing radius
      
      let x = Math.cos(angle) * radius
      let z = Math.sin(angle) * radius
      
      // Apply plant-specific rotation
      const rotation = (seed % 360) * Math.PI / 180
      const rotX = x * Math.cos(rotation) - z * Math.sin(rotation)
      const rotZ = x * Math.sin(rotation) + z * Math.cos(rotation)
      
      // Ensure no overlap
      while (usedPositions.has(positionKey(rotX, rotZ))) {
        autoIndex++
        const newAngle = autoIndex * 0.7
        const newRadius = 40 + autoIndex * 3
        x = Math.cos(newAngle) * newRadius
        z = Math.sin(newAngle) * newRadius
      }
      
      layout[unit.name] = {
        position: [rotX, 0, rotZ],
        equipment: guessEquipmentType(unit.name),
        section: 'other',
        flowOrder: 99,
        isDynamic: true,
        isAutoPositioned: true
      }
      
      usedPositions.add(positionKey(rotX, rotZ))
      autoIndex++
    }
  })
  
  return layout
}

// Industry-specific process flows
const INDUSTRY_FLOWS = {
  'oil-gas': [
    { from: 'Tank Farm', to: 'Crude Distillation Unit', material: 'crude', critical: true },
    { from: 'Crude Distillation Unit', to: 'Fluid Catalytic Cracker', material: 'gas_oil', critical: true },
    { from: 'Crude Distillation Unit', to: 'Reformer', material: 'naphtha', critical: false },
    { from: 'Crude Distillation Unit', to: 'Coker Unit', material: 'residue', critical: true },
    { from: 'Fluid Catalytic Cracker', to: 'Hydrotreater', material: 'gasoline', critical: false },
    { from: 'Hydrocracker', to: 'Hydrotreater', material: 'diesel', critical: false },
    { from: 'Hydrotreater', to: 'Loading Rack', material: 'product', critical: false },
    { from: 'Utilities', to: 'Crude Distillation Unit', material: 'steam', critical: false },
  ],
  'pharma': [
    { from: 'Reactor Suite A', to: 'Purification', material: 'api', critical: true },
    { from: 'Reactor Suite B', to: 'Purification', material: 'api', critical: true },
    { from: 'Purification', to: 'Drying', material: 'purified', critical: true },
    { from: 'Drying', to: 'Granulation', material: 'powder', critical: false },
    { from: 'Granulation', to: 'Tablet Press', material: 'granules', critical: false },
    { from: 'Tablet Press', to: 'Coating', material: 'tablets', critical: false },
    { from: 'Coating', to: 'Blister Pack', material: 'coated', critical: false },
    { from: 'Blister Pack', to: 'Serialization', material: 'packed', critical: true },
    { from: 'Clean Utilities', to: 'Reactor Suite A', material: 'wfi', critical: true },
  ],
  'utilities': [
    { from: 'Fuel Handling', to: 'Turbine Hall', material: 'fuel', critical: true },
    { from: 'Turbine Hall', to: 'Generator', material: 'steam', critical: true },
    { from: 'Generator', to: 'Transformer Yard', material: 'power', critical: true },
    { from: 'Transformer Yard', to: 'Switchyard', material: 'power', critical: true },
    { from: 'Cooling Tower', to: 'Turbine Hall', material: 'cooling', critical: false },
    { from: 'Water Treatment', to: 'Cooling Tower', material: 'water', critical: false },
    { from: 'Emissions Control', to: 'Turbine Hall', material: 'exhaust', critical: false },
  ]
}

const PROCESS_FLOWS = INDUSTRY_FLOWS['oil-gas'] // Default for backwards compatibility

// Material colors for pipes
const MATERIAL_COLORS = {
  crude: '#1a1a1a',
  gas_oil: '#8b5a2b',
  naphtha: '#ffd700',
  residue: '#3d3d3d',
  gasoline: '#90ee90',
  diesel: '#4169e1',
  product: '#32cd32',
  steam: '#e0e0e0',
  default: '#708090'
}

// Section colors for ground areas
const SECTION_COLORS = {
  intake: '#1e3a5f',
  primary: '#2d4a3e',
  conversion: '#4a3d2d',
  treating: '#3d2d4a',
  utilities: '#4a4a2d',
  control: '#2d4a4a',
  safety: '#4a2d2d',
  output: '#2d3d4a',
  environmental: '#2d4a3d'
}

/**
 * Ground with section markings
 */
function Ground({ units, layout }) {
  const sections = useMemo(() => {
    const sectionMap = {}
    units.forEach(unit => {
      const unitLayout = layout[unit.name]
      if (unitLayout && unitLayout.section) {
        if (!sectionMap[unitLayout.section]) {
          sectionMap[unitLayout.section] = {
            positions: [],
            color: SECTION_COLORS[unitLayout.section] || '#1e293b'
          }
        }
        sectionMap[unitLayout.section].positions.push(unitLayout.position)
      }
    })
    return sectionMap
  }, [units, layout])
  
  return (
    <group>
      {/* Main ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5, -0.5, 0]} receiveShadow>
        <planeGeometry args={[100, 80]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      
      {/* Grid */}
      <gridHelper args={[100, 50, '#334155', '#1e293b']} position={[5, -0.49, 0]} />
      
      {/* Roads */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5, -0.48, -20]} receiveShadow>
        <planeGeometry args={[80, 4]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5, -0.48, 25]} receiveShadow>
        <planeGeometry args={[80, 4]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
    </group>
  )
}

/**
 * Process Flow Pipes
 */
function ProcessPipes({ units, showFlow, layout, flows }) {
  const pipes = useMemo(() => {
    const result = []
    
    flows.forEach((flow, idx) => {
      const fromUnit = units.find(u => unitNameMatches(u.name, flow.from))
      const toUnit = units.find(u => unitNameMatches(u.name, flow.to))
      const fromLayout = fromUnit ? layout[fromUnit.name] : null
      const toLayout = toUnit ? layout[toUnit.name] : null
      
      if (fromLayout && toLayout && fromUnit && toUnit) {
        const start = [...fromLayout.position]
        const end = [...toLayout.position]
        
        // Elevate pipes
        start[1] = 2
        end[1] = 2
        
        result.push({
          id: idx,
          start,
          end,
          color: MATERIAL_COLORS[flow.material] || MATERIAL_COLORS.default,
          critical: flow.critical,
          material: flow.material
        })
      }
    })
    
    return result
  }, [units, layout, flows])
  
  if (!showFlow) return null
  
  return (
    <group>
      {pipes.map(pipe => (
        <group key={pipe.id}>
          <Line
            points={[pipe.start, pipe.end]}
            color={pipe.critical ? '#ef4444' : pipe.color}
            lineWidth={pipe.critical ? 4 : 2}
            transparent
            opacity={0.8}
          />
          {/* Pipe supports */}
          {pipe.start[0] !== pipe.end[0] && (
            <>
              <mesh position={[pipe.start[0], 1, pipe.start[2]]}>
                <cylinderGeometry args={[0.05, 0.08, 2, 8]} />
                <meshStandardMaterial color="#4a5568" metalness={0.5} roughness={0.5} />
              </mesh>
              <mesh position={[pipe.end[0], 1, pipe.end[2]]}>
                <cylinderGeometry args={[0.05, 0.08, 2, 8]} />
                <meshStandardMaterial color="#4a5568" metalness={0.5} roughness={0.5} />
              </mesh>
            </>
          )}
        </group>
      ))}
    </group>
  )
}

function NetworkConduits({ conduits, layout, showNetwork }) {
  if (!showNetwork || !conduits?.length) return null

  return (
    <group>
      {conduits.slice(0, 40).map((conduit, idx) => {
        const fromLayout = layout[conduit.from]
        const toLayout = layout[conduit.to]
        if (!fromLayout || !toLayout) return null

        const start = [fromLayout.position[0], 4, fromLayout.position[2]]
        const end = [toLayout.position[0], 4, toLayout.position[2]]
        const lineWidth = conduit.critical ? 3 : 1.5

        return (
          <group key={`${conduit.from}-${conduit.to}-${idx}`}>
            <Line
              points={[start, end]}
              color={conduit.critical ? '#f59e0b' : '#38bdf8'}
              lineWidth={lineWidth}
              transparent
              opacity={conduit.critical ? 0.7 : 0.45}
              dashed
              dashSize={1.2}
              gapSize={0.6}
            />
          </group>
        )
      })}
    </group>
  )
}

function MapEvidenceStrip({ model, showNetwork }) {
  const items = [
    { label: 'Asset Denominator', value: model.summary.totalAssets.toLocaleString(), tone: '#f8fafc' },
    { label: 'Matched', value: model.summary.matched.toLocaleString(), tone: '#22c55e' },
    { label: 'Blind Spots', value: model.summary.blindSpots.toLocaleString(), tone: '#f59e0b' },
    { label: 'Orphans', value: model.summary.orphans.toLocaleString(), tone: '#a855f7' },
    { label: 'Network Conduits', value: model.network.conduits.length.toLocaleString(), tone: '#38bdf8' }
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: '1px',
      background: '#334155',
      borderBottom: '1px solid #334155'
    }}>
      {items.map(item => (
        <div key={item.label} style={{
          padding: '0.65rem 0.85rem',
          background: '#0f172a',
          minHeight: '4rem'
        }}>
          <div style={{
            fontSize: '0.58rem',
            color: '#64748b',
            fontFamily: "'JetBrains Mono', monospace",
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '0.35rem',
            fontWeight: 700
          }}>
            {item.label}
          </div>
          <div style={{
            fontSize: '1.35rem',
            lineHeight: 1,
            color: item.tone,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 800
          }}>
            {item.value}
          </div>
        </div>
      ))}
      <div style={{
        padding: '0.65rem 0.85rem',
        background: '#0f172a',
        color: '#94a3b8',
        fontSize: '0.72rem',
        lineHeight: 1.45,
        gridColumn: '1 / -1'
      }}>
        Network overlay: {showNetwork ? 'cyan dashed lines show inferred ISA/IEC 62443-style conduits from shared subnet and protocol evidence.' : 'disabled.'}
        {' '}Coverage is calculated as matched assets over matched plus blind spots, using uploaded engineering and discovery sources.
      </div>
    </div>
  )
}

/**
 * Gap indicator ring that pulses around equipment with gaps
 */
function GapIndicator({ position, severity, height = 0 }) {
  const meshRef = useRef()
  
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const pulse = Math.sin(clock.elapsedTime * 2) * 0.1 + 1
      meshRef.current.scale.set(pulse, 1, pulse)
    }
  })
  
  const color = severity === 'critical' ? '#ef4444' : '#f59e0b'
  
  return (
    <group position={[position[0], height + 0.1, position[2]]}>
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3, 3.3, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>
      {/* Warning icon floating above */}
      <Html position={[0, height + 4, 0]} center>
        <div style={{
          background: severity === 'critical' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(245, 158, 11, 0.9)',
          color: 'white',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap'
        }}>
          {severity === 'critical' ? 'GAP' : 'CHECK'}
        </div>
      </Html>
    </group>
  )
}

/**
 * Equipment renderer based on unit type
 */
function EquipmentUnit({ unit, layout, onClick, selected, gapInfo }) {
  const data = {
    name: unit.name,
    assetCount: unit.count,
    tier1: unit.tier1,
    tier2: unit.tier2,
    tier3: unit.tier3,
    hasGap: gapInfo?.total > 0,
    gapSeverity: gapInfo?.critical > 0 ? 'critical' : gapInfo?.warning > 0 ? 'warning' : null
  }
  
  const position = layout?.position || [0, 0, 0]
  const showGapIndicator = gapInfo?.total > 0
  
  // Wrap equipment with gap indicator if needed
  const wrapWithGap = (equipment, equipmentHeight = 0) => (
    <group>
      {equipment}
      {showGapIndicator && (
        <GapIndicator 
          position={position} 
          severity={data.gapSeverity} 
          height={equipmentHeight}
        />
      )}
    </group>
  )
  
  switch (layout?.equipment) {
    case 'column':
      return wrapWithGap(
        <DistillationColumn 
          position={position} 
          height={layout.height || 8}
          data={data}
          onClick={onClick}
          selected={selected}
        />,
        layout.height || 8
      )
    case 'reactor':
      return wrapWithGap(
        <Reactor 
          position={position} 
          radius={1.5}
          type="drum"
          data={data}
          onClick={onClick}
          selected={selected}
        />,
        3
      )
    case 'tanks':
      return wrapWithGap(
        <group>
          <StorageTank 
            position={[position[0] - 3, position[1], position[2]]} 
            radius={2}
            height={3}
            data={data}
            onClick={onClick}
            selected={selected}
          />
          <StorageTank 
            position={[position[0] + 3, position[1], position[2]]} 
            radius={2}
            height={3}
          />
          <StorageTank 
            position={[position[0], position[1], position[2] + 5]} 
            radius={2}
            height={3}
          />
        </group>,
        3
      )
    case 'tank':
      return wrapWithGap(
        <StorageTank 
          position={position} 
          radius={2.5}
          height={2}
          data={data}
          onClick={onClick}
          selected={selected}
        />,
        2
      )
    case 'exchanger':
      return wrapWithGap(
        <HeatExchanger 
          position={position} 
          data={data}
          onClick={onClick}
          selected={selected}
        />,
        1.5
      )
    case 'flare':
      return wrapWithGap(
        <FlareStack 
          position={position} 
          height={15}
          data={data}
          onClick={onClick}
          selected={selected}
        />,
        15
      )
    case 'controlroom':
      return wrapWithGap(
        <ControlRoom 
          position={position} 
          data={data}
          onClick={onClick}
          selected={selected}
        />,
        3
      )
    case 'furnace':
      return wrapWithGap(
        <Furnace 
          position={position} 
          data={data}
          onClick={onClick}
          selected={selected}
        />,
        2
      )
    default:
      // Default to reactor for unknown types
      return wrapWithGap(
        <Reactor 
          position={position} 
          radius={1.2}
          type="sphere"
          data={data}
          onClick={onClick}
          selected={selected}
        />,
        2.4
      )
  }
}

/**
 * Loading indicator
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
      <div>Loading refinery...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

/**
 * Main Refinery Map Component
 */
export default function RefineryMap({ result, selectedPlant = 'all', industry = 'oil-gas', gapMatrix, onUnitSelect }) {
  const containerRef = useRef()
  const [selectedUnit, setSelectedUnit] = useState(null)
  const [showFlow, setShowFlow] = useState(true)
  const [showNetwork, setShowNetwork] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  
  // Base industry-specific layout (template)
  const BASE_LAYOUT = INDUSTRY_LAYOUTS[industry] || INDUSTRY_LAYOUTS['oil-gas']
  const ACTIVE_FLOWS = INDUSTRY_FLOWS[industry] || INDUSTRY_FLOWS['oil-gas']
  
  // Industry display names
  const INDUSTRY_TITLES = {
    'oil-gas': 'Refinery Process Map',
    'pharma': 'Pharmaceutical Plant Map',
    'utilities': 'Power Generation Map'
  }
  
  const [currentPlant, setCurrentPlant] = useState(selectedPlant)
  const mapModel = useMemo(() => buildPlantMapModel(result, { selectedPlant: currentPlant }), [result, currentPlant])
  const allSiteModel = useMemo(() => buildPlantMapModel(result), [result])
  const plants = allSiteModel.plants
  const isMultiSite = plants.length > 1
  
  const filteredAssets = mapModel.assets
  const processUnits = useMemo(() => mapModel.units
    .filter(u => u.name !== 'Unassigned' || u.count > 10)
    .sort((a, b) => {
      const aLayout = findTemplateLayout(a.name, BASE_LAYOUT)
      const bLayout = findTemplateLayout(b.name, BASE_LAYOUT)
      return (aLayout?.flowOrder || 99) - (bLayout?.flowOrder || 99)
    }), [mapModel.units, BASE_LAYOUT])
  
  // Generate plant-specific layout (dynamic based on plant name and actual units)
  const ACTIVE_LAYOUT = useMemo(() => {
    const layoutSeed = currentPlant === 'all' ? 'all-sites' : currentPlant
    return generatePlantLayout(layoutSeed, processUnits, BASE_LAYOUT, industry)
  }, [currentPlant, processUnits, BASE_LAYOUT, industry])
  
  // Get gap data for units (for visual highlighting)
  const unitGaps = useMemo(() => {
    const gaps = {}
    processUnits.forEach(unit => {
      if (unit.blindSpots > 0 || unit.orphans > 0) {
        gaps[unit.name] = {
          critical: unit.tier1 > 0 && unit.blindSpots > 0 ? unit.blindSpots : 0,
          warning: unit.orphans + (unit.tier1 > 0 ? 0 : unit.blindSpots),
          total: unit.blindSpots + unit.orphans
        }
      }
    })
    ;(gapMatrix?.gaps || []).forEach(g => {
      if (!gaps[g.unit]) {
        gaps[g.unit] = { critical: 0, warning: 0, total: 0 }
      }
      gaps[g.unit].total++
      if (g.severity === 'critical') gaps[g.unit].critical++
      if (g.severity === 'warning') gaps[g.unit].warning++
    })
    return gaps
  }, [gapMatrix, processUnits])

  // Export as PNG
  const handleExport = async () => {
    if (!containerRef.current) return
    try {
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: '#0f172a',
        scale: 2
      })
      const link = document.createElement('a')
      link.download = `refinery-map-${new Date().toISOString().split('T')[0]}.png`
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
            {INDUSTRY_TITLES[industry] || 'Plant Map'}
            {isMultiSite && currentPlant !== 'all' && ` — ${currentPlant}`}
          </h3>
          <p style={{ margin: '0.25rem 0 0', color: '#94a3b8', fontSize: '0.8rem' }}>
            Process layout from uploaded assets; network overlay inferred from subnets and protocols.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Site selector */}
          {isMultiSite && (
            <select
              value={currentPlant}
              onChange={(e) => {
                setCurrentPlant(e.target.value)
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
          
          {/* Toggle process flow */}
          <button
            onClick={() => setShowFlow(!showFlow)}
            style={{
              padding: '0.5rem 1rem',
              background: showFlow ? '#3b82f6' : 'rgba(255,255,255,0.1)',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: showFlow ? '600' : '400'
            }}
          >
            {showFlow ? 'Flow On' : 'Flow Off'}
          </button>

          <button
            onClick={() => setShowNetwork(!showNetwork)}
            style={{
              padding: '0.5rem 1rem',
              background: showNetwork ? '#0891b2' : 'rgba(255,255,255,0.1)',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: showNetwork ? '600' : '400'
            }}
          >
            {showNetwork ? 'Network On' : 'Network Off'}
          </button>
          
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
              fontWeight: '600'
            }}
          >
            Export
          </button>
        </div>
      </div>

      <MapEvidenceStrip model={mapModel} showNetwork={showNetwork} />
      
      {/* 3D Canvas */}
      <div ref={containerRef} style={{ height: '600px', position: 'relative' }}>
        {isLoading && <LoadingSpinner />}
        
        <Canvas 
          shadows 
          camera={{ position: [40, 30, 40], fov: 50 }}
          onCreated={() => setIsLoading(false)}
        >
          <Suspense fallback={null}>
            {/* Lighting */}
            <ambientLight intensity={0.4} />
            <directionalLight 
              position={[30, 50, 20]} 
              intensity={1} 
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
            />
            <pointLight position={[-20, 20, -20]} intensity={0.3} color="#3b82f6" />
            
            {/* Sky */}
            <Sky sunPosition={[100, 20, 100]} />
            
            {/* Ground */}
            <Ground units={processUnits} layout={ACTIVE_LAYOUT} />
            
            {/* Process pipes */}
            <ProcessPipes units={processUnits} showFlow={showFlow} layout={ACTIVE_LAYOUT} flows={ACTIVE_FLOWS} />

            {/* Network conduits inferred from uploaded subnets/protocols */}
            <NetworkConduits conduits={mapModel.network.conduits} layout={ACTIVE_LAYOUT} showNetwork={showNetwork} />
            
            {/* Equipment */}
            {processUnits.map((unit) => {
              const unitLayout = ACTIVE_LAYOUT[unit.name]
              const gapInfo = unitGaps[unit.name]
              
              if (!unitLayout) {
                // Auto-position unknown units in a grid (fallback for dynamic layout)
                const unknownUnits = processUnits.filter(u => !ACTIVE_LAYOUT[u.name])
                const idx = unknownUnits.indexOf(unit)
                const autoLayout = {
                  position: [45 + (idx % 4) * 6, 0, -15 + Math.floor(idx / 4) * 6],
                  equipment: guessEquipmentType(unit.name)
                }
                return (
                  <EquipmentUnit
                    key={unit.name}
                    unit={unit}
                    layout={autoLayout}
                    selected={selectedUnit === unit.name}
                    gapInfo={gapInfo}
                    onClick={(e) => {
                      e.stopPropagation()
                      const next = unit.name === selectedUnit ? null : unit.name
                      setSelectedUnit(next)
                      if (onUnitSelect) onUnitSelect(next ? unit : null)
                    }}
                  />
                )
              }
              
              return (
                <EquipmentUnit
                  key={unit.name}
                  unit={unit}
                  layout={unitLayout}
                  selected={selectedUnit === unit.name}
                  gapInfo={gapInfo}
                  onClick={(e) => {
                    e.stopPropagation()
                    const next = unit.name === selectedUnit ? null : unit.name
                    setSelectedUnit(next)
                    if (onUnitSelect) onUnitSelect(next ? unit : null)
                  }}
                />
              )
            })}
            
            {/* Decorative pumps at base of major columns */}
            <Pump position={[-12, 0, 1]} scale={0.5} />
            <Pump position={[-8, 0, -1]} scale={0.5} />
            <Pump position={[3, 0, -6]} scale={0.5} />
            <Pump position={[13, 0, 6]} scale={0.5} />
            <Pump position={[23, 0, 1]} scale={0.5} />
            <Pump position={[33, 0, 12]} scale={0.5} />

            <OrbitControls 
              enablePan 
              enableZoom 
              enableRotate
              maxDistance={80}
              minDistance={15}
              maxPolarAngle={Math.PI / 2.2}
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
            maxWidth: '280px',
            border: '1px solid #334155'
          }}>
            <div style={{ 
              fontWeight: '600', 
              marginBottom: '0.75rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '1rem'
            }}>
              {selectedUnitData.name}
              <button
                onClick={() => setSelectedUnit(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '0 0.25rem',
                  fontSize: '1.2rem'
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '0.75rem',
              marginBottom: '0.75rem'
            }}>
              <div style={{ textAlign: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.25rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{selectedUnitData.count}</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Total Assets</div>
              </div>
              <div style={{ textAlign: 'center', padding: '0.5rem', background: 'rgba(239,68,68,0.1)', borderRadius: '0.25rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ef4444' }}>{selectedUnitData.tier1}</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Critical</div>
              </div>
            </div>
            
            <div style={{ borderTop: '1px solid #334155', paddingTop: '0.75rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.5rem' }}>ASSET BREAKDOWN</div>
              <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ color: '#ef4444' }}>● Tier 1: {selectedUnitData.tier1}</span>
                <span style={{ color: '#f59e0b' }}>● Tier 2: {selectedUnitData.tier2}</span>
                <span style={{ color: '#6366f1' }}>● Tier 3: {selectedUnitData.tier3}</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #334155', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.5rem' }}>EVIDENCE</div>
              <div style={{ display: 'grid', gap: '0.35rem', fontSize: '0.75rem', color: '#e2e8f0' }}>
                <div>{selectedUnitData.matched} matched assets</div>
                <div>{selectedUnitData.blindSpots} blind spots</div>
                <div>{selectedUnitData.orphans} orphan devices</div>
                {selectedUnitData.subnets?.length > 0 && (
                  <div style={{ color: '#38bdf8', fontFamily: 'monospace' }}>
                    Subnets: {selectedUnitData.subnets.slice(0, 4).join(', ')}{selectedUnitData.subnets.length > 4 ? '...' : ''}
                  </div>
                )}
                {selectedUnitData.protocols?.length > 0 && (
                  <div style={{ color: '#94a3b8' }}>
                    Protocols: {selectedUnitData.protocols.slice(0, 4).join(', ')}{selectedUnitData.protocols.length > 4 ? '...' : ''}
                  </div>
                )}
              </div>
            </div>
            
            {/* Gap information if available */}
            {unitGaps[selectedUnitData.name] && (
              <div style={{ 
                borderTop: '1px solid #334155', 
                paddingTop: '0.75rem',
                marginTop: '0.75rem'
              }}>
                <div style={{ 
                  fontSize: '0.7rem', 
                  color: unitGaps[selectedUnitData.name].critical > 0 ? '#ef4444' : '#f59e0b', 
                  marginBottom: '0.5rem',
                  fontWeight: '600'
                }}>
                  GAP ANALYSIS
                </div>
                <div style={{ fontSize: '0.75rem', color: '#e2e8f0' }}>
                  {unitGaps[selectedUnitData.name].critical > 0 && (
                    <div style={{ color: '#ef4444', marginBottom: '0.25rem' }}>
                      {unitGaps[selectedUnitData.name].critical} critical gap(s)
                    </div>
                  )}
                  {unitGaps[selectedUnitData.name].warning > 0 && (
                    <div style={{ color: '#f59e0b' }}>
                      {unitGaps[selectedUnitData.name].warning} warning(s)
                    </div>
                  )}
                  <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#94a3b8' }}>
                    Click "Ask Questions" to learn more
                  </div>
                </div>
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
        <div style={{ display: 'flex', gap: '1rem', color: '#94a3b8', fontSize: '0.75rem', flexWrap: 'wrap' }}>
          <span>Columns</span>
          <span>Reactors</span>
          <span>Tanks</span>
          <span>Flare</span>
          <span>Control</span>
          {showFlow && <span style={{ color: '#ef4444' }}>━ Critical Flow</span>}
          {showNetwork && <span style={{ color: '#38bdf8' }}>- - Network Conduit</span>}
          {Object.keys(unitGaps).length > 0 && (
            <>
              <span style={{ color: '#ef4444' }}>Critical Gap</span>
              <span style={{ color: '#f59e0b' }}>Warning</span>
            </>
          )}
        </div>
        <div style={{ color: '#64748b', fontSize: '0.7rem' }}>
          {processUnits.length} units • {filteredAssets.length.toLocaleString()} assets • {mapModel.network.conduits.length} network conduits
          {Object.keys(unitGaps).length > 0 && ` • ${Object.keys(unitGaps).length} units with exceptions`}
        </div>
      </div>
    </div>
  )
}
