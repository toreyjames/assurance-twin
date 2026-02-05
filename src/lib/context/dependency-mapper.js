/**
 * DEPENDENCY MAPPER
 * Maps process dependencies between devices and units
 * 
 * Context dimension: "What else fails when this fails?"
 * - Process flow dependencies
 * - Safety system dependencies
 * - Utility dependencies
 * - Network dependencies
 */

// =============================================================================
// DEPENDENCY TYPES
// =============================================================================

export const DependencyType = {
  PROCESS_FLOW: 'process_flow',       // Upstream/downstream in process
  CONTROL: 'control',                 // Controller to field device
  SAFETY: 'safety',                   // Safety system dependencies
  POWER: 'power',                     // Electrical power feed
  UTILITY: 'utility',                 // Steam, air, water dependencies
  NETWORK: 'network',                 // Network communication path
  DATA: 'data'                        // Data/historian dependency
}

export const DependencyDirection = {
  UPSTREAM: 'upstream',     // Feeds into this asset
  DOWNSTREAM: 'downstream', // This asset feeds into
  BIDIRECTIONAL: 'bidirectional', // Two-way dependency
  SUPPLIES: 'supplies',     // Provides utility/power
  RECEIVES: 'receives'      // Receives utility/power
}

// =============================================================================
// INDUSTRY-SPECIFIC DEPENDENCY PATTERNS
// =============================================================================

const DEPENDENCY_PATTERNS = {
  'oil-gas': {
    processFlow: [
      // CDU downstream pattern
      { from: 'cdu', to: 'hydrotreater', type: 'process_flow', direction: 'downstream' },
      { from: 'cdu', to: 'fcc', type: 'process_flow', direction: 'downstream' },
      { from: 'cdu', to: 'coker', type: 'process_flow', direction: 'downstream' },
      
      // FCC downstream
      { from: 'fcc', to: 'alky', type: 'process_flow', direction: 'downstream' },
      { from: 'fcc', to: 'hydrotreater', type: 'process_flow', direction: 'downstream' },
      
      // Tank farm connections
      { from: 'tank_farm', to: 'cdu', type: 'process_flow', direction: 'upstream' },
      { from: 'hydrotreater', to: 'tank_farm', type: 'process_flow', direction: 'downstream' }
    ],
    
    utilityDependencies: [
      { utility: 'steam', consumers: ['cdu', 'fcc', 'hydrotreater', 'coker'] },
      { utility: 'cooling_water', consumers: ['cdu', 'fcc', 'hydrotreater'] },
      { utility: 'instrument_air', consumers: ['cdu', 'fcc', 'hydrotreater', 'tank_farm'] },
      { utility: 'hydrogen', consumers: ['hydrotreater', 'hydrocracker'] },
      { utility: 'fuel_gas', consumers: ['cdu', 'fcc'] }
    ],
    
    safetyDependencies: [
      { safetySystem: 'esd', protects: ['cdu', 'fcc', 'hydrotreater'] },
      { safetySystem: 'fire_gas', protects: ['cdu', 'fcc', 'hydrotreater', 'tank_farm'] },
      { safetySystem: 'bms', protects: ['cdu'] }
    ]
  },
  
  'pharma': {
    processFlow: [
      { from: 'api_synthesis', to: 'formulation', type: 'process_flow', direction: 'downstream' },
      { from: 'formulation', to: 'packaging', type: 'process_flow', direction: 'downstream' },
      { from: 'wfi_system', to: 'api_synthesis', type: 'utility', direction: 'supplies' },
      { from: 'wfi_system', to: 'formulation', type: 'utility', direction: 'supplies' }
    ],
    
    utilityDependencies: [
      { utility: 'wfi', consumers: ['api_synthesis', 'formulation', 'cip'] },
      { utility: 'clean_steam', consumers: ['api_synthesis', 'formulation'] },
      { utility: 'hvac', consumers: ['clean_room', 'api_synthesis', 'formulation'] },
      { utility: 'nitrogen', consumers: ['api_synthesis'] }
    ],
    
    safetyDependencies: [
      { safetySystem: 'ems', protects: ['clean_room'] },
      { safetySystem: 'containment', protects: ['api_synthesis'] }
    ]
  },
  
  'utilities': {
    processFlow: [
      { from: 'generation', to: 'substation', type: 'process_flow', direction: 'downstream' },
      { from: 'substation', to: 'distribution', type: 'process_flow', direction: 'downstream' },
      { from: 'intake', to: 'water_treatment', type: 'process_flow', direction: 'upstream' },
      { from: 'water_treatment', to: 'distribution', type: 'process_flow', direction: 'downstream' }
    ],
    
    utilityDependencies: [
      { utility: 'fuel', consumers: ['generation'] },
      { utility: 'cooling_water', consumers: ['generation'] },
      { utility: 'auxiliary_power', consumers: ['generation', 'substation'] }
    ],
    
    safetyDependencies: [
      { safetySystem: 'protection_relay', protects: ['substation', 'generation'] },
      { safetySystem: 'turbine_protection', protects: ['generation'] }
    ]
  },
  
  'automotive': {
    processFlow: [
      { from: 'stamping', to: 'body_shop', type: 'process_flow', direction: 'downstream' },
      { from: 'body_shop', to: 'paint_shop', type: 'process_flow', direction: 'downstream' },
      { from: 'paint_shop', to: 'assembly', type: 'process_flow', direction: 'downstream' },
      { from: 'assembly', to: 'test', type: 'process_flow', direction: 'downstream' }
    ],
    
    utilityDependencies: [
      { utility: 'compressed_air', consumers: ['body_shop', 'paint_shop', 'assembly'] },
      { utility: 'power', consumers: ['body_shop', 'paint_shop', 'assembly', 'stamping'] },
      { utility: 'paint_supply', consumers: ['paint_shop'] },
      { utility: 'cooling', consumers: ['body_shop'] }
    ],
    
    safetyDependencies: [
      { safetySystem: 'robot_safety', protects: ['body_shop', 'paint_shop'] },
      { safetySystem: 'fire_suppression', protects: ['paint_shop'] }
    ]
  }
}

// =============================================================================
// DEPENDENCY INFERENCE FUNCTIONS
// =============================================================================

/**
 * Infer controller-device dependencies from tag patterns
 */
export function inferControlDependencies(assets) {
  const dependencies = []
  
  // Group assets by unit
  const unitAssets = {}
  for (const asset of assets) {
    const unit = asset.unit || asset.area || 'unknown'
    if (!unitAssets[unit]) unitAssets[unit] = []
    unitAssets[unit].push(asset)
  }
  
  // Find controllers and their dependent devices within each unit
  for (const [unit, assetList] of Object.entries(unitAssets)) {
    const controllers = assetList.filter(a => 
      /plc|dcs|controller|rtu/i.test(a.device_type || '') ||
      /plc|dcs/i.test(a.tag_id || '')
    )
    
    const fieldDevices = assetList.filter(a => 
      /transmitter|valve|actuator|analyzer|drive/i.test(a.device_type || '')
    )
    
    // Each controller controls field devices in same unit
    for (const controller of controllers) {
      for (const device of fieldDevices) {
        // Check for matching loop numbers or IP subnets
        const sameLoop = extractLoopNumber(controller.tag_id) === extractLoopNumber(device.tag_id)
        const sameSubnet = areSameSubnet(controller.ip_address, device.ip_address)
        
        if (sameLoop || sameSubnet) {
          dependencies.push({
            from: controller.tag_id || controller.asset_id,
            to: device.tag_id || device.asset_id,
            type: DependencyType.CONTROL,
            direction: DependencyDirection.DOWNSTREAM,
            confidence: sameLoop && sameSubnet ? 'high' : 'medium',
            unit
          })
        }
      }
    }
  }
  
  return dependencies
}

/**
 * Infer network dependencies from IP addresses
 */
export function inferNetworkDependencies(assets) {
  const dependencies = []
  
  // Find network devices (switches, routers)
  const networkDevices = assets.filter(a => 
    /switch|router|gateway|firewall/i.test(a.device_type || '')
  )
  
  // Find devices with IP addresses
  const ipDevices = assets.filter(a => a.ip_address && !networkDevices.includes(a))
  
  // Group IP devices by subnet
  const subnets = {}
  for (const device of ipDevices) {
    const subnet = getSubnet(device.ip_address)
    if (subnet) {
      if (!subnets[subnet]) subnets[subnet] = []
      subnets[subnet].push(device)
    }
  }
  
  // Map network devices to subnets they likely serve
  for (const netDevice of networkDevices) {
    const deviceSubnet = getSubnet(netDevice.ip_address)
    if (deviceSubnet && subnets[deviceSubnet]) {
      for (const dependentDevice of subnets[deviceSubnet]) {
        dependencies.push({
          from: netDevice.tag_id || netDevice.asset_id || netDevice.ip_address,
          to: dependentDevice.tag_id || dependentDevice.asset_id,
          type: DependencyType.NETWORK,
          direction: DependencyDirection.SUPPLIES,
          confidence: 'medium',
          subnet: deviceSubnet
        })
      }
    }
  }
  
  return dependencies
}

/**
 * Apply industry-specific dependency patterns
 */
export function applyIndustryDependencies(assets, industry) {
  const dependencies = []
  const patterns = DEPENDENCY_PATTERNS[industry]
  
  if (!patterns) return dependencies
  
  // Build unit lookup
  const unitAssets = {}
  for (const asset of assets) {
    const unit = normalizeUnitName(asset.unit || asset.area || 'unknown')
    if (!unitAssets[unit]) unitAssets[unit] = []
    unitAssets[unit].push(asset)
  }
  
  // Apply process flow patterns
  for (const pattern of patterns.processFlow || []) {
    const fromUnit = normalizeUnitName(pattern.from)
    const toUnit = normalizeUnitName(pattern.to)
    
    if (unitAssets[fromUnit] && unitAssets[toUnit]) {
      dependencies.push({
        from: pattern.from,
        to: pattern.to,
        type: pattern.type,
        direction: pattern.direction,
        confidence: 'industry_pattern',
        isUnitLevel: true
      })
    }
  }
  
  // Apply utility dependencies
  for (const utilityDep of patterns.utilityDependencies || []) {
    for (const consumer of utilityDep.consumers) {
      if (unitAssets[normalizeUnitName(consumer)]) {
        dependencies.push({
          from: utilityDep.utility,
          to: consumer,
          type: DependencyType.UTILITY,
          direction: DependencyDirection.SUPPLIES,
          confidence: 'industry_pattern',
          isUnitLevel: true
        })
      }
    }
  }
  
  // Apply safety dependencies
  for (const safetyDep of patterns.safetyDependencies || []) {
    for (const protected_ of safetyDep.protects) {
      if (unitAssets[normalizeUnitName(protected_)]) {
        dependencies.push({
          from: safetyDep.safetySystem,
          to: protected_,
          type: DependencyType.SAFETY,
          direction: DependencyDirection.SUPPLIES,
          confidence: 'industry_pattern',
          isUnitLevel: true,
          criticality: 'critical'
        })
      }
    }
  }
  
  return dependencies
}

// =============================================================================
// IMPACT ANALYSIS
// =============================================================================

/**
 * Calculate blast radius - what fails if this asset fails
 */
export function calculateBlastRadius(assetId, dependencies, assets) {
  const affected = new Set()
  const visited = new Set()
  const queue = [assetId]
  
  while (queue.length > 0) {
    const current = queue.shift()
    if (visited.has(current)) continue
    visited.add(current)
    
    // Find all downstream dependencies
    for (const dep of dependencies) {
      if (dep.from === current && !visited.has(dep.to)) {
        affected.add(dep.to)
        queue.push(dep.to)
      }
    }
  }
  
  // Enrich with asset details
  const impactedAssets = []
  for (const affectedId of affected) {
    const asset = assets.find(a => 
      (a.tag_id || a.asset_id) === affectedId
    )
    if (asset) {
      impactedAssets.push({
        id: affectedId,
        asset,
        distance: 1 // Could calculate actual distance
      })
    }
  }
  
  return {
    sourceAsset: assetId,
    directlyAffected: impactedAssets.filter(a => a.distance === 1).length,
    totalAffected: impactedAssets.length,
    impactedAssets,
    impactedUnits: [...new Set(impactedAssets.map(a => a.asset?.unit).filter(Boolean))]
  }
}

/**
 * Find critical path - which assets have most downstream dependencies
 */
export function findCriticalPath(dependencies, assets) {
  const impactScores = {}
  
  for (const asset of assets) {
    const id = asset.tag_id || asset.asset_id
    if (!id) continue
    
    const blastRadius = calculateBlastRadius(id, dependencies, assets)
    impactScores[id] = {
      asset,
      downstreamCount: blastRadius.totalAffected,
      impactedUnits: blastRadius.impactedUnits.length,
      score: blastRadius.totalAffected + (blastRadius.impactedUnits.length * 5) // Units weighted more
    }
  }
  
  // Sort by impact score
  return Object.values(impactScores)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20) // Top 20 critical assets
}

/**
 * Generate dependency map for visualization
 */
export function generateDependencyMap(assets, industry) {
  // Collect all dependencies
  const controlDeps = inferControlDependencies(assets)
  const networkDeps = inferNetworkDependencies(assets)
  const industryDeps = applyIndustryDependencies(assets, industry)
  
  const allDependencies = [...controlDeps, ...networkDeps, ...industryDeps]
  
  // Build graph structure
  const nodes = {}
  const edges = []
  
  for (const asset of assets) {
    const id = asset.tag_id || asset.asset_id
    if (!id) continue
    
    nodes[id] = {
      id,
      label: id,
      unit: asset.unit,
      type: asset.device_type,
      criticality: asset.classification?.tier || 3
    }
  }
  
  for (const dep of allDependencies) {
    edges.push({
      from: dep.from,
      to: dep.to,
      type: dep.type,
      label: dep.type,
      style: dep.type === DependencyType.SAFETY ? 'critical' : 'normal'
    })
  }
  
  // Find critical path
  const criticalPath = findCriticalPath(allDependencies, assets)
  
  return {
    nodes: Object.values(nodes),
    edges,
    dependencies: allDependencies,
    criticalPath,
    summary: {
      totalDependencies: allDependencies.length,
      controlDependencies: controlDeps.length,
      networkDependencies: networkDeps.length,
      industryDependencies: industryDeps.length
    }
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function extractLoopNumber(tagId) {
  if (!tagId) return null
  const match = tagId.match(/\d{3,4}/)
  return match ? match[0] : null
}

function getSubnet(ip) {
  if (!ip) return null
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  return `${parts[0]}.${parts[1]}.${parts[2]}`
}

function areSameSubnet(ip1, ip2) {
  if (!ip1 || !ip2) return false
  return getSubnet(ip1) === getSubnet(ip2)
}

function normalizeUnitName(unit) {
  if (!unit) return 'unknown'
  return unit.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_')
}

export default {
  DependencyType,
  DependencyDirection,
  inferControlDependencies,
  inferNetworkDependencies,
  applyIndustryDependencies,
  calculateBlastRadius,
  findCriticalPath,
  generateDependencyMap
}
