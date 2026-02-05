/**
 * LAYOUT ENGINE v2 — Engineer-Grade Plant Layout
 * 
 * Deterministic, data-driven layout for industrial plant visualization.
 * No randomness - same data always produces same layout.
 * 
 * Key principles:
 * - Buildings sized proportionally to real-world floor area (from unit knowledge)
 * - ISA-95 / Purdue zone awareness for network segmentation
 * - Orthogonal flow routing (right-angle connections like P&ID)
 * - Collision-free placement with proper spacing
 * - Industry-specific production flow constraints
 * 
 * ISA-95 Functional Hierarchy:
 *   Level 4 — Enterprise (ERP)
 *   Level 3 — Site Operations (MES, Historian)
 *   Level 2 — Area Supervisory (SCADA, HMI)
 *   Level 1 — Basic Control (PLC, DCS)
 *   Level 0 — Process (Sensors, Actuators)
 */

import { UNIT_KNOWLEDGE, detectUnit, getUnitInfo } from './unit-knowledge.js'

// =============================================================================
// SEEDED DETERMINISTIC RANDOM (Mulberry32)
// Same seed → same output, always
// =============================================================================

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6D2B79F5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(str) {
  let h = 0
  for (let i = 0; i < (str || '').length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return Math.abs(h) || 1
}

// =============================================================================
// AUTOMOTIVE PRODUCTION FLOW ORDER & ZONE MAP
// =============================================================================

const AUTOMOTIVE_FLOW_ORDER = {
  stamping: 1,
  body_shop: 2,
  paint_shop: 3,
  plastics: 3.5,
  assembly: 4,
  powertrain: 3.5,
  battery: 3.5,
  quality: 5,
  logistics: 0,
  plant_utilities: 0
}

/**
 * ISA-95 / Purdue zone assignments per unit type.
 * zone: visual placement zone
 * row: primary (1=main flow) or secondary (2/3=feeders)
 * purdueLevel: dominant Purdue model level for this area
 * buildingAspect: width:depth ratio representing typical floor plan
 * typicalArea_m2: approximate real floor area in m² (for proportional sizing)
 */
const AUTOMOTIVE_ZONES = {
  stamping:        { zone: 'west',        row: 1, col: 0, purdueLevel: 1, buildingAspect: 2.5, typicalArea_m2: 30000, roofProfile: 'sawtooth' },
  body_shop:       { zone: 'center-west', row: 1, col: 1, purdueLevel: 1, buildingAspect: 1.3, typicalArea_m2: 50000, roofProfile: 'flat' },
  paint_shop:      { zone: 'center',      row: 1, col: 2, purdueLevel: 2, buildingAspect: 2.0, typicalArea_m2: 40000, roofProfile: 'peaked' },
  plastics:        { zone: 'north',       row: 2, col: 2, purdueLevel: 1, buildingAspect: 1.5, typicalArea_m2: 12000, roofProfile: 'flat' },
  assembly:        { zone: 'center-east', row: 1, col: 3, purdueLevel: 1, buildingAspect: 3.0, typicalArea_m2: 55000, roofProfile: 'flat' },
  powertrain:      { zone: 'south',       row: 2, col: 2, purdueLevel: 1, buildingAspect: 1.8, typicalArea_m2: 25000, roofProfile: 'flat' },
  battery:         { zone: 'south-east',  row: 3, col: 3, purdueLevel: 2, buildingAspect: 1.4, typicalArea_m2: 18000, roofProfile: 'flat' },
  quality:         { zone: 'east',        row: 1, col: 4, purdueLevel: 2, buildingAspect: 1.6, typicalArea_m2: 15000, roofProfile: 'flat' },
  logistics:       { zone: 'perimeter-n', row: 0, col: 0, purdueLevel: 3, buildingAspect: 3.5, typicalArea_m2: 20000, roofProfile: 'flat' },
  plant_utilities: { zone: 'perimeter-s', row: 0, col: 4, purdueLevel: 2, buildingAspect: 1.2, typicalArea_m2: 8000,  roofProfile: 'peaked' }
}

// Production flow connections (from → to, with strength and Purdue path)
const AUTOMOTIVE_PRODUCTION_FLOW = [
  { from: 'stamping',    to: 'body_shop',  strength: 1.0, material: 'Body Panels',    critical: true },
  { from: 'body_shop',   to: 'paint_shop', strength: 1.0, material: 'Body-in-White',  critical: true },
  { from: 'paint_shop',  to: 'assembly',   strength: 1.0, material: 'Painted Body',   critical: true },
  { from: 'assembly',    to: 'quality',    strength: 0.8, material: 'Vehicle',         critical: true },
  { from: 'powertrain',  to: 'assembly',   strength: 0.9, material: 'Engine/Trans',    critical: true },
  { from: 'battery',     to: 'assembly',   strength: 0.9, material: 'Battery Pack',    critical: true },
  { from: 'plastics',    to: 'paint_shop', strength: 0.5, material: 'Fascias',         critical: false },
  { from: 'plastics',    to: 'assembly',   strength: 0.6, material: 'Trim Parts',      critical: false },
  { from: 'logistics',   to: 'assembly',   strength: 0.4, material: 'JIT Parts',       critical: false },
  { from: 'logistics',   to: 'stamping',   strength: 0.3, material: 'Steel Coils',     critical: false }
]

// ISA-95 zone definitions for visualization boundaries
const ISA95_ZONES = [
  { id: 'enterprise',  level: 4, label: 'ENTERPRISE (L4)',       color: '#475569', description: 'ERP, Business Systems' },
  { id: 'operations',  level: 3, label: 'SITE OPERATIONS (L3)',  color: '#3b82f6', description: 'MES, Historian, Scheduling' },
  { id: 'supervisory', level: 2, label: 'SUPERVISORY (L2)',      color: '#22c55e', description: 'SCADA, HMI, Engineering WS' },
  { id: 'control',     level: 1, label: 'BASIC CONTROL (L1)',    color: '#f59e0b', description: 'PLC, DCS, Safety PLC' },
  { id: 'process',     level: 0, label: 'PROCESS (L0)',          color: '#ef4444', description: 'Sensors, Actuators, Drives' }
]

// =============================================================================
// RELATIONSHIP INFERENCE
// =============================================================================

function getSubnet(ip) {
  if (!ip) return null
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  return `${parts[0]}.${parts[1]}.${parts[2]}`
}

function getTagPrefix(tagId) {
  if (!tagId) return null
  const match = tagId.match(/^([A-Z]{2,6}[-_]?\d{0,2})/i)
  return match ? match[1].toUpperCase() : null
}

function normalizeUnitName(name) {
  if (!name) return 'unknown'
  return name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
}

/**
 * Detect what type of unit this is based on name
 */
function detectUnitType(unitName, industry) {
  if (!unitName) return null
  const normalized = normalizeUnitName(unitName)
  const industryUnits = UNIT_KNOWLEDGE[industry]
  if (!industryUnits) return null

  for (const [unitType, unitInfo] of Object.entries(industryUnits)) {
    if (normalized.includes(normalizeUnitName(unitType))) return unitType
    if (unitInfo.aliases) {
      for (const alias of unitInfo.aliases) {
        if (normalized.includes(normalizeUnitName(alias))) return unitType
      }
    }
  }
  return null
}

function matchesUnitType(unitName, unitType) {
  const normalized = normalizeUnitName(unitName)
  const typeNormalized = normalizeUnitName(unitType)
  if (normalized.includes(typeNormalized)) return true
  const unitInfo = UNIT_KNOWLEDGE.automotive?.[unitType]
  if (unitInfo?.aliases) {
    return unitInfo.aliases.some(a => normalized.includes(normalizeUnitName(a)))
  }
  return false
}

/**
 * Infer relationships between units based on asset data
 */
export function inferUnitRelationships(assets, industry = 'automotive') {
  const relationships = []
  const unitAssets = {}

  assets.forEach(asset => {
    const unitName = normalizeUnitName(asset.unit || asset.area || asset.location || 'unknown')
    if (!unitAssets[unitName]) {
      unitAssets[unitName] = {
        name: unitName,
        assets: [],
        subnets: new Set(),
        tagPrefixes: new Set(),
        deviceTypes: new Set(),
        purdueDevices: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 }
      }
    }
    const ua = unitAssets[unitName]
    ua.assets.push(asset)
    if (asset.ip_address) {
      const subnet = getSubnet(asset.ip_address)
      if (subnet) ua.subnets.add(subnet)
    }
    const prefix = getTagPrefix(asset.tag_id)
    if (prefix) ua.tagPrefixes.add(prefix)
    if (asset.device_type) {
      const dt = asset.device_type.toLowerCase()
      ua.deviceTypes.add(dt)
      // Classify device into Purdue level
      if (/sensor|transmitter|actuator|valve|drive|vfd|motor|servo/i.test(dt)) ua.purdueDevices[0]++
      else if (/plc|dcs|safety|controller|rtu/i.test(dt)) ua.purdueDevices[1]++
      else if (/hmi|scada|workstation|ews|camera|vision/i.test(dt)) ua.purdueDevices[2]++
      else if (/historian|mes|server|database/i.test(dt)) ua.purdueDevices[3]++
      else if (/erp|email|domain/i.test(dt)) ua.purdueDevices[4]++
      else ua.purdueDevices[0]++ // default to L0
    }
  })

  const units = Object.values(unitAssets)

  // 1. Network adjacency
  for (let i = 0; i < units.length; i++) {
    for (let j = i + 1; j < units.length; j++) {
      const shared = [...units[i].subnets].filter(s => units[j].subnets.has(s))
      if (shared.length > 0) {
        relationships.push({
          from: units[i].name, to: units[j].name,
          type: 'network', strength: Math.min(shared.length * 0.3, 1),
          evidence: `Shared subnets: ${shared.join(', ')}`
        })
      }
    }
  }

  // 2. Tag naming patterns
  for (let i = 0; i < units.length; i++) {
    for (let j = i + 1; j < units.length; j++) {
      const shared = [...units[i].tagPrefixes].filter(p => units[j].tagPrefixes.has(p))
      if (shared.length > 0) {
        relationships.push({
          from: units[i].name, to: units[j].name,
          type: 'naming', strength: Math.min(shared.length * 0.2, 0.6),
          evidence: `Shared tag prefixes: ${shared.join(', ')}`
        })
      }
    }
  }

  // 3. Industry-specific production flow
  if (industry === 'automotive') {
    AUTOMOTIVE_PRODUCTION_FLOW.forEach(({ from, to, strength, material, critical }) => {
      const fromUnit = units.find(u => matchesUnitType(u.name, from))
      const toUnit = units.find(u => matchesUnitType(u.name, to))
      if (fromUnit && toUnit) {
        relationships.push({
          from: fromUnit.name, to: toUnit.name,
          type: 'production_flow', strength, material, critical,
          evidence: `Automotive production flow: ${from} → ${to}`
        })
      }
    })
  }

  return {
    units: units.map(u => ({
      name: u.name,
      assetCount: u.assets.length,
      subnets: [...u.subnets],
      tagPrefixes: [...u.tagPrefixes],
      deviceTypes: [...u.deviceTypes],
      purdueDevices: u.purdueDevices,
      dominantPurdueLevel: Object.entries(u.purdueDevices)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 0
    })),
    relationships
  }
}

// =============================================================================
// DETERMINISTIC GRID-BASED LAYOUT ALGORITHM
// =============================================================================

/**
 * Compute building dimensions from unit type and asset count.
 * Returns { width, height } in SVG units, proportional to real floor area.
 */
function computeBuildingDimensions(unitType, assetCount, canvasWidth, canvasHeight) {
  const zone = AUTOMOTIVE_ZONES[unitType]
  if (!zone) {
    // Unknown type: size by asset count only
    const s = Math.max(60, Math.min(140, 40 + Math.sqrt(assetCount) * 4))
    return { width: s * 1.3, height: s * 0.8 }
  }

  // Base size from real floor area, scaled to canvas
  const scaleFactor = Math.min(canvasWidth, canvasHeight) / 900
  const baseArea = Math.sqrt(zone.typicalArea_m2) * scaleFactor * 0.25
  const aspect = zone.buildingAspect

  // Adjust by asset density (more assets = bigger, clamped)
  const unitInfo = UNIT_KNOWLEDGE.automotive?.[unitType]
  const typical = unitInfo?.typicalAssetCount?.typical || 200
  const densityFactor = Math.max(0.7, Math.min(1.4, Math.sqrt(assetCount / typical)))

  const w = baseArea * Math.sqrt(aspect) * densityFactor
  const h = baseArea / Math.sqrt(aspect) * densityFactor

  return {
    width: Math.max(70, Math.min(200, w)),
    height: Math.max(50, Math.min(150, h))
  }
}

/**
 * Deterministic grid-based layout with production-flow ordering.
 * Places buildings on a grid that follows automotive manufacturing flow:
 *   Logistics (top) → Stamping → Body → Paint → Assembly → Quality (left to right)
 *   Powertrain/Plastics/Battery (below main flow)
 *   Utilities (bottom-right)
 */
export function computeLayout(units, relationships, options = {}) {
  const { width = 900, height = 550, industry = 'automotive' } = options

  const margin = { top: 60, right: 40, bottom: 40, left: 40 }
  const innerW = width - margin.left - margin.right
  const innerH = height - margin.top - margin.bottom

  // Classify units
  const classified = units.map(unit => {
    const unitType = detectUnitType(unit.name, industry)
    const zone = unitType ? AUTOMOTIVE_ZONES[unitType] : null
    return { ...unit, detectedType: unitType, zone }
  })

  // Separate main-flow (row 1), feeder (row 2/3), and perimeter (row 0)
  const mainFlow = classified.filter(u => u.zone?.row === 1)
    .sort((a, b) => (a.zone?.col ?? 99) - (b.zone?.col ?? 99))
  const feeders = classified.filter(u => u.zone && u.zone.row >= 2)
    .sort((a, b) => (a.zone?.col ?? 99) - (b.zone?.col ?? 99))
  const perimeter = classified.filter(u => u.zone?.row === 0)
  const unknown = classified.filter(u => !u.zone)

  // ---- MAIN FLOW ROW (horizontal, centered vertically) ----
  const mainY = margin.top + innerH * 0.38
  const mainCount = mainFlow.length || 1
  const mainSpacing = innerW / (mainCount + 1)

  const positioned = []

  mainFlow.forEach((unit, i) => {
    const dim = computeBuildingDimensions(unit.detectedType, unit.assetCount, width, height)
    const x = margin.left + mainSpacing * (i + 1)
    const y = mainY
    positioned.push({ ...unit, x, y, buildingWidth: dim.width, buildingHeight: dim.height })
  })

  // ---- FEEDER ROW (below main flow) ----
  const feederY = margin.top + innerH * 0.72
  const feederCount = feeders.length || 1
  const feederSpacing = innerW / (feederCount + 2)

  feeders.forEach((unit, i) => {
    const dim = computeBuildingDimensions(unit.detectedType, unit.assetCount, width, height)
    // Position feeders below their connected main-flow building
    const targetCol = unit.zone?.col ?? (i + 1)
    const mainPartner = mainFlow.find(m => m.zone?.col === targetCol)
    const x = mainPartner ? mainPartner.x + positioned.find(p => p.name === mainPartner.name)?.x * 0 : margin.left + feederSpacing * (i + 1)
    positioned.push({
      ...unit,
      x: mainPartner ? positioned.find(p => p.name === mainPartner.name)?.x || (margin.left + feederSpacing * (i + 1)) : margin.left + feederSpacing * (i + 1),
      y: feederY,
      buildingWidth: dim.width,
      buildingHeight: dim.height
    })
  })

  // ---- PERIMETER (logistics top-left, utilities bottom-right) ----
  perimeter.forEach((unit, i) => {
    const dim = computeBuildingDimensions(unit.detectedType, unit.assetCount, width, height)
    const isLogistics = unit.detectedType === 'logistics'
    positioned.push({
      ...unit,
      x: isLogistics ? margin.left + innerW * 0.15 : margin.left + innerW * 0.88,
      y: isLogistics ? margin.top + innerH * 0.08 : margin.top + innerH * 0.88,
      buildingWidth: dim.width,
      buildingHeight: dim.height
    })
  })

  // ---- UNKNOWN UNITS (auto-grid at bottom) ----
  const unknownStartX = margin.left + innerW * 0.05
  const unknownStartY = margin.top + innerH * 0.92
  unknown.forEach((unit, i) => {
    const dim = computeBuildingDimensions(null, unit.assetCount, width, height)
    positioned.push({
      ...unit,
      x: unknownStartX + (i % 6) * (dim.width + 20),
      y: unknownStartY,
      buildingWidth: dim.width,
      buildingHeight: dim.height
    })
  })

  // ---- COLLISION RESOLUTION ----
  resolveCollisions(positioned, width, height, margin)

  // Calculate radius for backwards compatibility
  const maxAssets = Math.max(...units.map(u => u.assetCount), 1)
  return positioned.map(unit => ({
    ...unit,
    radius: 20 + (unit.assetCount / maxAssets) * 40,
    roofProfile: unit.zone?.roofProfile || 'flat',
    purdueLevel: unit.zone?.purdueLevel ?? (unit.dominantPurdueLevel || 0)
  }))
}

/**
 * Simple iterative collision resolution.
 * Pushes overlapping buildings apart.
 */
function resolveCollisions(nodes, canvasW, canvasH, margin) {
  const minGap = 15 // Minimum pixels between buildings
  const iterations = 50

  for (let iter = 0; iter < iterations; iter++) {
    let moved = false
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]
        const b = nodes[j]
        const minDistX = (a.buildingWidth + b.buildingWidth) / 2 + minGap
        const minDistY = (a.buildingHeight + b.buildingHeight) / 2 + minGap
        const dx = b.x - a.x
        const dy = b.y - a.y
        const overlapX = minDistX - Math.abs(dx)
        const overlapY = minDistY - Math.abs(dy)

        if (overlapX > 0 && overlapY > 0) {
          // Push apart on the axis with less overlap
          if (overlapX < overlapY) {
            const push = overlapX / 2 + 1
            a.x -= Math.sign(dx || 1) * push
            b.x += Math.sign(dx || 1) * push
          } else {
            const push = overlapY / 2 + 1
            a.y -= Math.sign(dy || 1) * push
            b.y += Math.sign(dy || 1) * push
          }
          moved = true
        }
      }
    }

    // Clamp to canvas bounds
    nodes.forEach(n => {
      n.x = Math.max(margin.left + n.buildingWidth / 2, Math.min(canvasW - margin.right - n.buildingWidth / 2, n.x))
      n.y = Math.max(margin.top + n.buildingHeight / 2, Math.min(canvasH - margin.bottom - n.buildingHeight / 2, n.y))
    })

    if (!moved) break
  }
}

// =============================================================================
// ORTHOGONAL FLOW ROUTING
// =============================================================================

/**
 * Generate orthogonal (right-angle) path between two points.
 * Returns SVG path data string.
 */
export function computeOrthogonalPath(fromX, fromY, toX, toY, offset = 0) {
  const dx = toX - fromX
  const dy = toY - fromY

  // Primarily horizontal connections (main flow)
  if (Math.abs(dx) > Math.abs(dy)) {
    const midX = fromX + dx / 2
    return `M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX} ${toY}`
  }
  // Primarily vertical connections (feeders)
  const midY = fromY + dy / 2
  return `M ${fromX} ${fromY} L ${fromX} ${midY} L ${toX} ${midY} L ${toX} ${toY}`
}

// =============================================================================
// LAYOUT ENRICHMENT
// =============================================================================

export function enrichLayout(layout, industry = 'automotive') {
  return layout.map(node => {
    const unitInfo = node.detectedType
      ? UNIT_KNOWLEDGE[industry]?.[node.detectedType]
      : null

    // Coverage analysis
    const typical = unitInfo?.typicalAssetCount?.typical || null
    let coverageRatio = null
    if (typical) {
      coverageRatio = Math.min(2.0, node.assetCount / typical)
    }

    return {
      ...node,
      color: getUnitColor(node.detectedType),
      icon: getUnitIcon(node.detectedType),
      shape: getUnitShape(node.detectedType),
      criticality: unitInfo?.criticality || 'medium',
      expectedAssetRange: unitInfo?.typicalAssetCount || null,
      coverageRatio,
      isOverstaffed: unitInfo?.typicalAssetCount ? node.assetCount > unitInfo.typicalAssetCount.max : false,
      isUnderstaffed: unitInfo?.typicalAssetCount ? node.assetCount < unitInfo.typicalAssetCount.min : false,
      regulations: unitInfo?.regulations || [],
      safetyNotes: unitInfo?.safetyNotes || null
    }
  })
}

function getUnitColor(unitType) {
  const colors = {
    stamping: '#f59e0b', body_shop: '#3b82f6', paint_shop: '#a855f7',
    plastics: '#06b6d4', assembly: '#22c55e', powertrain: '#ef4444',
    battery: '#f97316', quality: '#6366f1', logistics: '#64748b',
    plant_utilities: '#84cc16'
  }
  return colors[unitType] || '#94a3b8'
}

function getUnitIcon(unitType) {
  const icons = {
    stamping: 'S', body_shop: 'B', paint_shop: 'P',
    plastics: 'PL', assembly: 'A', powertrain: 'PT',
    battery: 'BT', quality: 'Q', logistics: 'L',
    plant_utilities: 'U'
  }
  return icons[unitType] || '?'
}

function getUnitShape(unitType) {
  const shapes = {
    stamping: 'rectangle', body_shop: 'rectangle', paint_shop: 'rectangle',
    assembly: 'rectangle', quality: 'diamond', logistics: 'hexagon',
    plant_utilities: 'circle'
  }
  return shapes[unitType] || 'rectangle'
}

// =============================================================================
// MAIN LAYOUT FUNCTION
// =============================================================================

/**
 * Generate complete layout from assets.
 * Returns nodes, connections, ISA-95 zone boundaries, and summary stats.
 */
export function generatePlantLayout(assets, options = {}) {
  const { industry = 'automotive', width = 900, height = 550 } = options

  // 1. Infer relationships from data
  const { units, relationships } = inferUnitRelationships(assets, industry)

  // 2. Compute grid-based layout
  const layout = computeLayout(units, relationships, { width, height, industry })

  // 3. Enrich with visual & engineering metadata
  const enrichedLayout = enrichLayout(layout, industry)

  // 4. Generate orthogonal connections for visualization
  const connections = relationships
    .filter(r => r.strength > 0.25)
    .map(r => ({
      from: r.from,
      to: r.to,
      type: r.type,
      strength: r.strength,
      material: r.material || null,
      critical: r.critical || false,
      isProductionFlow: r.type === 'production_flow'
    }))

  // 5. Compute ISA-95 zone boundaries from node positions
  const isa95Boundaries = computeISA95Boundaries(enrichedLayout)

  // 6. Compute coverage stats
  const coverageStats = computeCoverageStats(enrichedLayout)

  // 7. Compute Purdue level distribution
  const purdueDistribution = computePurdueDistribution(units)

  return {
    nodes: enrichedLayout,
    connections,
    relationships,
    isa95Boundaries,
    coverageStats,
    purdueDistribution,
    summary: {
      totalUnits: units.length,
      totalAssets: assets.length,
      productionFlowConnections: connections.filter(c => c.isProductionFlow).length,
      networkConnections: connections.filter(c => c.type === 'network').length,
      detectedTypes: [...new Set(enrichedLayout.map(n => n.detectedType).filter(Boolean))],
      recognizedAssets: enrichedLayout.filter(n => n.detectedType).reduce((s, n) => s + n.assetCount, 0),
      unrecognizedAssets: enrichedLayout.filter(n => !n.detectedType).reduce((s, n) => s + n.assetCount, 0)
    }
  }
}

/**
 * Compute ISA-95 zone visual boundaries from node Purdue levels
 */
function computeISA95Boundaries(nodes) {
  const zones = {}
  nodes.forEach(node => {
    const level = node.purdueLevel ?? 0
    if (!zones[level]) {
      zones[level] = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, nodes: [] }
    }
    const hw = (node.buildingWidth || 80) / 2
    const hh = (node.buildingHeight || 60) / 2
    zones[level].minX = Math.min(zones[level].minX, node.x - hw - 20)
    zones[level].maxX = Math.max(zones[level].maxX, node.x + hw + 20)
    zones[level].minY = Math.min(zones[level].minY, node.y - hh - 20)
    zones[level].maxY = Math.max(zones[level].maxY, node.y + hh + 20)
    zones[level].nodes.push(node.name)
  })

  return Object.entries(zones).map(([level, bounds]) => {
    const zoneInfo = ISA95_ZONES.find(z => z.level === parseInt(level)) || ISA95_ZONES[4]
    return {
      level: parseInt(level),
      label: zoneInfo.label,
      color: zoneInfo.color,
      description: zoneInfo.description,
      bounds,
      nodeCount: bounds.nodes.length
    }
  })
}

/**
 * Coverage statistics per unit
 */
function computeCoverageStats(nodes) {
  return nodes.map(node => {
    const expected = node.expectedAssetRange
    if (!expected) return { name: node.name, status: 'unknown', ratio: null }
    const ratio = node.assetCount / expected.typical
    let status = 'normal'
    if (node.assetCount < expected.min) status = 'under-covered'
    else if (node.assetCount > expected.max) status = 'over-covered'
    return { name: node.name, status, ratio: Math.round(ratio * 100), expected }
  })
}

/**
 * Purdue level distribution across all units
 */
function computePurdueDistribution(units) {
  const totals = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 }
  units.forEach(u => {
    if (u.purdueDevices) {
      Object.entries(u.purdueDevices).forEach(([level, count]) => {
        totals[level] = (totals[level] || 0) + count
      })
    }
  })
  return totals
}

// =============================================================================
// EXPORTS
// =============================================================================

export { AUTOMOTIVE_FLOW_ORDER, AUTOMOTIVE_ZONES, ISA95_ZONES, AUTOMOTIVE_PRODUCTION_FLOW }

export default {
  inferUnitRelationships,
  computeLayout,
  enrichLayout,
  generatePlantLayout,
  computeOrthogonalPath,
  AUTOMOTIVE_FLOW_ORDER,
  AUTOMOTIVE_ZONES,
  ISA95_ZONES
}
