/**
 * GAP ANALYZER
 * Context-aware gap analysis for OT asset inventories
 * 
 * Three types of gaps:
 * 1. Asset Gaps - Expected devices not found (blind spots, orphans)
 * 2. Functional Gaps - Missing functions for a unit (no safety system, no flow control)
 * 3. Coverage Gaps - Areas with insufficient discovery visibility
 */

import { detectUnit, getExpectedFunctions, getExpectedDeviceTypes, UNIT_KNOWLEDGE } from './unit-knowledge.js'
import { inferDeviceContext } from './device-patterns.js'

// =============================================================================
// GAP TYPES
// =============================================================================

export const GapType = {
  // Asset-level gaps
  BLIND_SPOT: 'blind_spot',       // In engineering but not discovered
  ORPHAN: 'orphan',               // Discovered but not in engineering
  STALE_DATA: 'stale_data',       // Not seen recently
  
  // Functional gaps
  MISSING_FUNCTION: 'missing_function',     // Expected function not present
  INSUFFICIENT_COVERAGE: 'insufficient_coverage', // Not enough devices for function
  NO_REDUNDANCY: 'no_redundancy',           // Single point of failure
  
  // Discovery gaps
  NO_VISIBILITY: 'no_visibility',     // Unit with no discovered devices
  LOW_VISIBILITY: 'low_visibility',   // Unit with few discovered devices
  NETWORK_BLIND_SPOT: 'network_blind_spot' // Subnet with no collector coverage
}

export const GapSeverity = {
  CRITICAL: 'critical',   // Safety/operational impact
  HIGH: 'high',           // Significant risk
  MEDIUM: 'medium',       // Moderate concern
  LOW: 'low',             // Minor issue
  INFO: 'info'            // Informational
}

// =============================================================================
// ASSET GAP ANALYSIS
// =============================================================================

/**
 * Analyze asset-level gaps (blind spots and orphans)
 */
export function analyzeAssetGaps(matchResults, assets) {
  const gaps = []
  
  // Blind spots - engineering assets not discovered
  for (const blindSpot of matchResults.blindSpots || []) {
    const context = inferDeviceContext(blindSpot)
    
    let severity = GapSeverity.MEDIUM
    if (context.criticality === 'critical') severity = GapSeverity.CRITICAL
    else if (context.criticality === 'high') severity = GapSeverity.HIGH
    
    gaps.push({
      type: GapType.BLIND_SPOT,
      severity,
      asset: blindSpot,
      tagId: blindSpot.tag_id || blindSpot.asset_id,
      unit: blindSpot.unit || blindSpot.area,
      deviceType: blindSpot.device_type,
      context,
      reason: 'Asset exists in engineering baseline but was not discovered on the network',
      possibleCauses: [
        'Device is not connected to monitored network',
        'Device is powered off or decommissioned',
        'Discovery tool cannot reach this network segment',
        'Device uses unsupported protocol'
      ],
      recommendation: context.criticality === 'critical' 
        ? 'Verify physical status and network connectivity immediately'
        : 'Include in next scheduled verification'
    })
  }
  
  // Orphans - discovered but not in engineering
  for (const orphan of matchResults.orphans || []) {
    const context = inferDeviceContext(orphan)
    
    // Orphans with network presence are higher concern
    const hasNetwork = orphan.ip_address || orphan.mac_address
    let severity = hasNetwork ? GapSeverity.HIGH : GapSeverity.MEDIUM
    if (context.isSafetyRelated) severity = GapSeverity.CRITICAL
    
    gaps.push({
      type: GapType.ORPHAN,
      severity,
      asset: orphan,
      tagId: orphan.tag_id || orphan.asset_id || orphan.ip_address,
      unit: orphan.unit || orphan.area || 'Unknown',
      deviceType: orphan.device_type,
      ipAddress: orphan.ip_address,
      context,
      reason: 'Device discovered on network but not in engineering baseline',
      possibleCauses: [
        'Recently installed device not yet documented',
        'Temporary/test equipment left in place',
        'Shadow OT/IT device',
        'Contractor equipment',
        'Documentation out of date'
      ],
      recommendation: hasNetwork
        ? 'Investigate immediately - undocumented networked device poses security risk'
        : 'Update engineering documentation to include this device'
    })
  }
  
  // Stale data - devices not seen recently
  const now = new Date()
  for (const asset of assets) {
    if (asset.last_seen) {
      const lastSeen = new Date(asset.last_seen)
      const daysSinceLastSeen = Math.floor((now - lastSeen) / (1000 * 60 * 60 * 24))
      
      if (daysSinceLastSeen > 30) {
        const context = inferDeviceContext(asset)
        
        gaps.push({
          type: GapType.STALE_DATA,
          severity: daysSinceLastSeen > 90 ? GapSeverity.HIGH : GapSeverity.MEDIUM,
          asset,
          tagId: asset.tag_id || asset.asset_id,
          unit: asset.unit,
          lastSeen: asset.last_seen,
          daysSinceLastSeen,
          context,
          reason: `Device has not been seen for ${daysSinceLastSeen} days`,
          recommendation: 'Verify device status and discovery tool connectivity'
        })
      }
    }
  }
  
  return gaps
}

// =============================================================================
// FUNCTIONAL GAP ANALYSIS
// =============================================================================

/**
 * Analyze functional gaps - missing or insufficient functions per unit
 */
export function analyzeFunctionalGaps(assets, industry) {
  const gaps = []
  
  if (!industry || !UNIT_KNOWLEDGE[industry]) {
    return gaps
  }
  
  // Group assets by unit
  const unitAssets = {}
  for (const asset of assets) {
    const unitField = asset.unit || asset.area || asset.location
    if (!unitField) continue
    
    const unitInfo = detectUnit(unitField, industry)
    const unitKey = unitInfo?.id || unitField.toLowerCase().replace(/[^a-z0-9]/g, '_')
    
    if (!unitAssets[unitKey]) {
      unitAssets[unitKey] = {
        unitInfo,
        originalName: unitField,
        assets: []
      }
    }
    unitAssets[unitKey].assets.push({
      ...asset,
      deviceContext: inferDeviceContext(asset)
    })
  }
  
  // Check each unit against expected functions
  for (const [unitKey, unitData] of Object.entries(unitAssets)) {
    const unitInfo = unitData.unitInfo
    if (!unitInfo) continue
    
    const expectedFunctions = unitInfo.expectedFunctions || []
    const expectedDeviceTypes = unitInfo.expectedDeviceTypes || []
    
    // Check expected functions
    for (const expectedFunc of expectedFunctions) {
      const relevantAssets = unitData.assets.filter(a => 
        matchesFunction(a, expectedFunc.function)
      )
      
      if (relevantAssets.length === 0) {
        // Missing function entirely
        gaps.push({
          type: GapType.MISSING_FUNCTION,
          severity: expectedFunc.criticality === 'critical' ? GapSeverity.CRITICAL : 
                   expectedFunc.criticality === 'high' ? GapSeverity.HIGH : GapSeverity.MEDIUM,
          unit: unitData.originalName,
          unitId: unitKey,
          function: expectedFunc.function,
          functionDescription: expectedFunc.description,
          expectedMinDevices: expectedFunc.minDevices,
          actualDevices: 0,
          reason: `No devices found performing ${expectedFunc.description} function in ${unitData.originalName}`,
          recommendation: `Verify ${expectedFunc.description} capability exists in this unit`
        })
      } else if (relevantAssets.length < expectedFunc.minDevices) {
        // Insufficient coverage
        gaps.push({
          type: GapType.INSUFFICIENT_COVERAGE,
          severity: expectedFunc.criticality === 'critical' ? GapSeverity.HIGH : GapSeverity.MEDIUM,
          unit: unitData.originalName,
          unitId: unitKey,
          function: expectedFunc.function,
          functionDescription: expectedFunc.description,
          expectedMinDevices: expectedFunc.minDevices,
          actualDevices: relevantAssets.length,
          foundAssets: relevantAssets.map(a => a.tag_id || a.asset_id),
          reason: `Only ${relevantAssets.length} of ${expectedFunc.minDevices} expected ${expectedFunc.description} devices found`,
          recommendation: 'Review if additional devices exist but were not discovered'
        })
      }
      
      // Check for redundancy on critical functions
      if (expectedFunc.criticality === 'critical' && relevantAssets.length === 1) {
        gaps.push({
          type: GapType.NO_REDUNDANCY,
          severity: GapSeverity.HIGH,
          unit: unitData.originalName,
          unitId: unitKey,
          function: expectedFunc.function,
          functionDescription: expectedFunc.description,
          singlePointOfFailure: relevantAssets[0].tag_id || relevantAssets[0].asset_id,
          reason: `Critical function ${expectedFunc.description} has no redundancy`,
          recommendation: 'Consider adding backup/redundant system for this critical function'
        })
      }
    }
    
    // Check expected device types
    for (const expectedType of expectedDeviceTypes) {
      const matchingDevices = unitData.assets.filter(a => 
        matchesDeviceType(a, expectedType.type)
      )
      
      if (matchingDevices.length < expectedType.minCount) {
        const isCriticalType = ['plc', 'dcs', 'sis', 'safety'].some(t => expectedType.type.includes(t))
        
        gaps.push({
          type: matchingDevices.length === 0 ? GapType.MISSING_FUNCTION : GapType.INSUFFICIENT_COVERAGE,
          severity: isCriticalType ? GapSeverity.HIGH : GapSeverity.MEDIUM,
          unit: unitData.originalName,
          unitId: unitKey,
          deviceType: expectedType.type,
          deviceDescription: expectedType.description,
          expectedMinCount: expectedType.minCount,
          actualCount: matchingDevices.length,
          reason: `Expected at least ${expectedType.minCount} ${expectedType.type} device(s), found ${matchingDevices.length}`,
          recommendation: matchingDevices.length === 0 
            ? `Verify ${expectedType.description} exists in this unit`
            : 'Review if additional devices were missed by discovery'
        })
      }
    }
  }
  
  return gaps
}

// =============================================================================
// COVERAGE GAP ANALYSIS
// =============================================================================

/**
 * Analyze discovery coverage gaps
 */
export function analyzeCoverageGaps(assets, matchResults, industry) {
  const gaps = []
  
  // Build unit statistics
  const unitStats = {}
  
  // Count engineering assets per unit
  for (const asset of [...(matchResults.matched || []).map(m => m.engineering), ...(matchResults.blindSpots || [])]) {
    if (!asset) continue
    const unit = asset.unit || asset.area || 'Unknown'
    if (!unitStats[unit]) unitStats[unit] = { engineering: 0, discovered: 0 }
    unitStats[unit].engineering++
  }
  
  // Count discovered assets per unit
  for (const asset of assets) {
    if (!asset.last_seen && !asset.discovered) continue // Not from discovery
    const unit = asset.unit || asset.area || 'Unknown'
    if (!unitStats[unit]) unitStats[unit] = { engineering: 0, discovered: 0 }
    unitStats[unit].discovered++
  }
  
  // Check for visibility gaps
  for (const [unit, stats] of Object.entries(unitStats)) {
    const coveragePercent = stats.engineering > 0 
      ? Math.round((stats.discovered / stats.engineering) * 100)
      : 100
    
    if (stats.discovered === 0 && stats.engineering > 0) {
      // No visibility at all
      const unitInfo = detectUnit(unit, industry)
      
      gaps.push({
        type: GapType.NO_VISIBILITY,
        severity: unitInfo?.criticality === 'critical' ? GapSeverity.CRITICAL : GapSeverity.HIGH,
        unit,
        engineeringCount: stats.engineering,
        discoveredCount: 0,
        coveragePercent: 0,
        unitInfo,
        reason: `No devices discovered in ${unit} despite ${stats.engineering} documented assets`,
        possibleCauses: [
          'Discovery tool not deployed in this area',
          'Network isolated from discovery infrastructure',
          'All devices use non-IP protocols',
          'Unit offline or decommissioned'
        ],
        recommendation: 'Deploy discovery capability or verify unit status'
      })
    } else if (coveragePercent < 30 && stats.engineering > 5) {
      // Low visibility
      gaps.push({
        type: GapType.LOW_VISIBILITY,
        severity: GapSeverity.MEDIUM,
        unit,
        engineeringCount: stats.engineering,
        discoveredCount: stats.discovered,
        coveragePercent,
        reason: `Only ${coveragePercent}% of documented assets discovered in ${unit}`,
        recommendation: 'Review discovery tool deployment and network architecture'
      })
    }
  }
  
  // Check for network blind spots (subnets with engineering assets but no discovery)
  const subnetEngineering = {}
  const subnetDiscovery = {}
  
  for (const asset of [...(matchResults.matched || []).map(m => m.engineering), ...(matchResults.blindSpots || [])]) {
    if (!asset?.ip_address) continue
    const subnet = asset.ip_address.split('.').slice(0, 3).join('.')
    if (!subnetEngineering[subnet]) subnetEngineering[subnet] = []
    subnetEngineering[subnet].push(asset)
  }
  
  for (const asset of assets) {
    if (!asset.ip_address || !asset.last_seen) continue
    const subnet = asset.ip_address.split('.').slice(0, 3).join('.')
    subnetDiscovery[subnet] = true
  }
  
  for (const [subnet, engAssets] of Object.entries(subnetEngineering)) {
    if (!subnetDiscovery[subnet] && engAssets.length > 2) {
      gaps.push({
        type: GapType.NETWORK_BLIND_SPOT,
        severity: GapSeverity.HIGH,
        subnet: `${subnet}.0/24`,
        assetCount: engAssets.length,
        sampleAssets: engAssets.slice(0, 5).map(a => a.tag_id || a.asset_id),
        reason: `Subnet ${subnet}.0/24 has ${engAssets.length} documented assets but no discovery data`,
        recommendation: 'Verify discovery tool can reach this network segment'
      })
    }
  }
  
  return gaps
}

// =============================================================================
// COMPREHENSIVE GAP ANALYSIS
// =============================================================================

/**
 * Run full gap analysis
 */
export function analyzeAllGaps(assets, matchResults, industry) {
  const assetGaps = analyzeAssetGaps(matchResults, assets)
  const functionalGaps = analyzeFunctionalGaps(assets, industry)
  const coverageGaps = analyzeCoverageGaps(assets, matchResults, industry)
  
  const allGaps = [...assetGaps, ...functionalGaps, ...coverageGaps]
  
  // Sort by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }
  allGaps.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
  
  // Generate summary
  const summary = {
    total: allGaps.length,
    critical: allGaps.filter(g => g.severity === GapSeverity.CRITICAL).length,
    high: allGaps.filter(g => g.severity === GapSeverity.HIGH).length,
    medium: allGaps.filter(g => g.severity === GapSeverity.MEDIUM).length,
    low: allGaps.filter(g => g.severity === GapSeverity.LOW).length,
    
    byType: {
      blindSpots: allGaps.filter(g => g.type === GapType.BLIND_SPOT).length,
      orphans: allGaps.filter(g => g.type === GapType.ORPHAN).length,
      staleData: allGaps.filter(g => g.type === GapType.STALE_DATA).length,
      missingFunctions: allGaps.filter(g => g.type === GapType.MISSING_FUNCTION).length,
      insufficientCoverage: allGaps.filter(g => g.type === GapType.INSUFFICIENT_COVERAGE).length,
      noVisibility: allGaps.filter(g => g.type === GapType.NO_VISIBILITY).length
    },
    
    affectedUnits: [...new Set(allGaps.map(g => g.unit).filter(Boolean))],
    
    topRecommendations: generateTopRecommendations(allGaps)
  }
  
  return {
    gaps: allGaps,
    assetGaps,
    functionalGaps,
    coverageGaps,
    summary
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function matchesFunction(asset, functionName) {
  const tagId = (asset.tag_id || '').toLowerCase()
  const deviceType = (asset.device_type || '').toLowerCase()
  const deviceContext = asset.deviceContext || {}
  
  const functionPatterns = {
    'feed_flow_control': /flow|fic|fc|feed/i,
    'column_pressure': /pressure|pic|pc|column/i,
    'column_temperature': /temp|tic|tc|column/i,
    'reactor_temperature': /reactor|temp|tic|tc/i,
    'safety': /safety|sis|esd|psh|tsh|lsh/i,
    'overhead_pressure_safety': /overhead|psh|psv/i,
    'bottoms_level': /level|lic|lc|bottom/i,
    'heater_control': /heater|furnace|fic/i,
    'reflux_control': /reflux|fc|fic/i,
    'boiler_control': /boiler|steam|bms/i,
    'cooling_water': /cooling|cw|ct/i,
    'instrument_air': /air|ia|instrument/i,
    'robot_control': /robot|plc|cell/i,
    'conveyor_control': /conveyor|line|transfer/i
  }
  
  const pattern = functionPatterns[functionName]
  if (!pattern) return false
  
  return pattern.test(tagId) || pattern.test(deviceType) || 
         (deviceContext.function && pattern.test(deviceContext.function))
}

function matchesDeviceType(asset, expectedType) {
  const deviceType = (asset.device_type || '').toLowerCase()
  const tagId = (asset.tag_id || '').toLowerCase()
  const deviceContext = asset.deviceContext || {}
  
  const typePatterns = {
    'plc': /plc|pac|programmable/i,
    'dcs': /dcs|distributed/i,
    'sis': /sis|safety|esd/i,
    'hmi': /hmi|human.?machine|panel/i,
    'transmitter': /transmitter|xmtr|tt|pt|ft|lt/i,
    'analyzer': /analyzer|analyser/i,
    'robot': /robot|arm/i
  }
  
  const pattern = typePatterns[expectedType]
  if (!pattern) return deviceType.includes(expectedType)
  
  return pattern.test(deviceType) || pattern.test(tagId) ||
         (deviceContext.type && pattern.test(deviceContext.type))
}

function generateTopRecommendations(gaps) {
  const recommendations = []
  
  const criticalGaps = gaps.filter(g => g.severity === GapSeverity.CRITICAL)
  if (criticalGaps.length > 0) {
    recommendations.push({
      priority: 'critical',
      title: `Address ${criticalGaps.length} critical gaps immediately`,
      description: 'Critical gaps include missing safety functions and undocumented critical devices',
      gaps: criticalGaps.slice(0, 5)
    })
  }
  
  const orphans = gaps.filter(g => g.type === GapType.ORPHAN)
  if (orphans.length > 10) {
    recommendations.push({
      priority: 'high',
      title: `Investigate ${orphans.length} undocumented devices`,
      description: 'Large number of orphan devices may indicate documentation or shadow IT issues',
      gaps: orphans.slice(0, 5)
    })
  }
  
  const noVisibility = gaps.filter(g => g.type === GapType.NO_VISIBILITY)
  if (noVisibility.length > 0) {
    recommendations.push({
      priority: 'high',
      title: `Extend discovery to ${noVisibility.length} blind areas`,
      description: 'Some units have no discovery visibility',
      gaps: noVisibility
    })
  }
  
  return recommendations
}

export default {
  GapType,
  GapSeverity,
  analyzeAssetGaps,
  analyzeFunctionalGaps,
  analyzeCoverageGaps,
  analyzeAllGaps
}
