/**
 * RISK ENGINE
 * Context-aware risk scoring for OT assets
 * 
 * Risk = f(Device Context, Location Context, Lifecycle Context, Gap Context)
 * 
 * The key insight: Risk cannot be assessed without context
 * - A PLC is not inherently risky
 * - A PLC controlling safety systems in a critical unit with EOL firmware and network exposure IS risky
 */

import { inferDeviceContext } from './device-patterns.js'
import { calculateLifecycleStatus, LifecycleStatus } from './lifecycle-tracker.js'
import { detectUnit } from './unit-knowledge.js'

// =============================================================================
// RISK COMPONENTS
// =============================================================================

export const RiskFactor = {
  // Device Context
  DEVICE_CRITICALITY: 'device_criticality',
  DEVICE_FUNCTION: 'device_function',
  SAFETY_RELATED: 'safety_related',
  
  // Location Context
  UNIT_CRITICALITY: 'unit_criticality',
  PROCESS_DEPENDENCY: 'process_dependency',
  
  // Lifecycle Context
  EOL_STATUS: 'eol_status',
  FIRMWARE_AGE: 'firmware_age',
  PATCH_STATUS: 'patch_status',
  
  // Exposure Context
  NETWORK_EXPOSURE: 'network_exposure',
  INTERNET_REACHABLE: 'internet_reachable',
  REMOTE_ACCESS: 'remote_access',
  
  // Gap Context
  UNDOCUMENTED: 'undocumented',
  NO_DISCOVERY: 'no_discovery',
  STALE_DATA: 'stale_data',
  
  // Dependency Context
  SINGLE_POINT_OF_FAILURE: 'single_point_of_failure',
  HIGH_DOWNSTREAM_IMPACT: 'high_downstream_impact'
}

export const RiskLevel = {
  CRITICAL: { value: 4, label: 'Critical', color: '#dc2626' },
  HIGH: { value: 3, label: 'High', color: '#f97316' },
  MEDIUM: { value: 2, label: 'Medium', color: '#eab308' },
  LOW: { value: 1, label: 'Low', color: '#22c55e' },
  INFO: { value: 0, label: 'Info', color: '#6b7280' }
}

// =============================================================================
// RISK SCORING WEIGHTS
// =============================================================================

const RISK_WEIGHTS = {
  // Device factors (inherent)
  [RiskFactor.DEVICE_CRITICALITY]: {
    critical: 25,
    high: 15,
    medium: 8,
    low: 2
  },
  [RiskFactor.SAFETY_RELATED]: 20,
  
  // Location factors
  [RiskFactor.UNIT_CRITICALITY]: {
    critical: 15,
    high: 10,
    medium: 5,
    low: 2
  },
  
  // Lifecycle factors
  [RiskFactor.EOL_STATUS]: {
    obsolete: 25,
    eos: 20,
    eol: 15,
    approaching_eol: 10,
    mature: 3,
    current: 0,
    unknown: 5
  },
  
  // Exposure factors
  [RiskFactor.NETWORK_EXPOSURE]: 15,
  [RiskFactor.INTERNET_REACHABLE]: 30,
  [RiskFactor.REMOTE_ACCESS]: 10,
  
  // Gap factors
  [RiskFactor.UNDOCUMENTED]: 15,
  [RiskFactor.NO_DISCOVERY]: 10,
  [RiskFactor.STALE_DATA]: 8,
  
  // Dependency factors
  [RiskFactor.SINGLE_POINT_OF_FAILURE]: 12,
  [RiskFactor.HIGH_DOWNSTREAM_IMPACT]: 10
}

// =============================================================================
// RISK CALCULATION
// =============================================================================

/**
 * Calculate comprehensive risk score for an asset
 */
export function calculateAssetRisk(asset, context = {}) {
  const riskFactors = []
  let totalScore = 0
  let maxPossibleScore = 0
  
  const { 
    industry,
    dependencies = [],
    gapInfo,
    discoveryData
  } = context
  
  // Get device context
  const deviceContext = asset.deviceContext || inferDeviceContext(asset)
  
  // Get lifecycle status
  const lifecycleStatus = asset.lifecycleStatus || calculateLifecycleStatus(asset)
  
  // Get unit info
  const unitInfo = industry ? detectUnit(asset.unit || asset.area, industry) : null
  
  // ===== DEVICE CRITICALITY =====
  const deviceCriticalityScore = RISK_WEIGHTS[RiskFactor.DEVICE_CRITICALITY][deviceContext.criticality] || 0
  if (deviceCriticalityScore > 0) {
    totalScore += deviceCriticalityScore
    riskFactors.push({
      factor: RiskFactor.DEVICE_CRITICALITY,
      score: deviceCriticalityScore,
      description: `Device criticality: ${deviceContext.criticality}`,
      details: `${deviceContext.type || asset.device_type} is classified as ${deviceContext.criticality} criticality`
    })
  }
  maxPossibleScore += 25
  
  // ===== SAFETY RELATED =====
  if (deviceContext.isSafetyRelated) {
    totalScore += RISK_WEIGHTS[RiskFactor.SAFETY_RELATED]
    riskFactors.push({
      factor: RiskFactor.SAFETY_RELATED,
      score: RISK_WEIGHTS[RiskFactor.SAFETY_RELATED],
      description: 'Safety-related device',
      details: 'This device is involved in safety functions (SIS, ESD, F&G, BMS)'
    })
  }
  maxPossibleScore += 20
  
  // ===== UNIT CRITICALITY =====
  if (unitInfo?.criticality) {
    const unitScore = RISK_WEIGHTS[RiskFactor.UNIT_CRITICALITY][unitInfo.criticality] || 0
    if (unitScore > 0) {
      totalScore += unitScore
      riskFactors.push({
        factor: RiskFactor.UNIT_CRITICALITY,
        score: unitScore,
        description: `Located in ${unitInfo.criticality} criticality unit`,
        details: `${unitInfo.name} is a ${unitInfo.criticality} criticality process unit`
      })
    }
  }
  maxPossibleScore += 15
  
  // ===== LIFECYCLE STATUS =====
  const eolScore = RISK_WEIGHTS[RiskFactor.EOL_STATUS][lifecycleStatus.status] || 
                   RISK_WEIGHTS[RiskFactor.EOL_STATUS]['unknown']
  if (eolScore > 0) {
    totalScore += eolScore
    riskFactors.push({
      factor: RiskFactor.EOL_STATUS,
      score: eolScore,
      description: `Lifecycle status: ${lifecycleStatus.status}`,
      details: lifecycleStatus.eosDate 
        ? `End of support: ${lifecycleStatus.eosDate.toLocaleDateString()}`
        : lifecycleStatus.notes?.[0] || 'Lifecycle status based on typical equipment lifespan'
    })
  }
  maxPossibleScore += 25
  
  // ===== NETWORK EXPOSURE =====
  if (asset.ip_address) {
    totalScore += RISK_WEIGHTS[RiskFactor.NETWORK_EXPOSURE]
    riskFactors.push({
      factor: RiskFactor.NETWORK_EXPOSURE,
      score: RISK_WEIGHTS[RiskFactor.NETWORK_EXPOSURE],
      description: 'Network-connected device',
      details: `IP address: ${asset.ip_address}`
    })
    
    // Check for internet-routable IPs (simplified check)
    if (!isPrivateIP(asset.ip_address)) {
      totalScore += RISK_WEIGHTS[RiskFactor.INTERNET_REACHABLE]
      riskFactors.push({
        factor: RiskFactor.INTERNET_REACHABLE,
        score: RISK_WEIGHTS[RiskFactor.INTERNET_REACHABLE],
        description: 'Potentially internet-reachable',
        details: `IP ${asset.ip_address} appears to be a public IP address`
      })
    }
  }
  maxPossibleScore += 45 // network + internet
  
  // ===== REMOTE ACCESS =====
  const hasRemoteAccess = asset.remote_access || 
    /vpn|remote|jump|bastion/i.test(JSON.stringify(asset))
  if (hasRemoteAccess) {
    totalScore += RISK_WEIGHTS[RiskFactor.REMOTE_ACCESS]
    riskFactors.push({
      factor: RiskFactor.REMOTE_ACCESS,
      score: RISK_WEIGHTS[RiskFactor.REMOTE_ACCESS],
      description: 'Remote access enabled',
      details: 'This device may be accessible remotely'
    })
  }
  maxPossibleScore += 10
  
  // ===== GAP CONTEXT =====
  if (gapInfo) {
    if (gapInfo.isOrphan) {
      totalScore += RISK_WEIGHTS[RiskFactor.UNDOCUMENTED]
      riskFactors.push({
        factor: RiskFactor.UNDOCUMENTED,
        score: RISK_WEIGHTS[RiskFactor.UNDOCUMENTED],
        description: 'Undocumented device',
        details: 'Device was discovered but is not in engineering documentation'
      })
    }
    
    if (gapInfo.isBlindSpot) {
      totalScore += RISK_WEIGHTS[RiskFactor.NO_DISCOVERY]
      riskFactors.push({
        factor: RiskFactor.NO_DISCOVERY,
        score: RISK_WEIGHTS[RiskFactor.NO_DISCOVERY],
        description: 'No discovery data',
        details: 'Device is documented but was not found by discovery tools'
      })
    }
    
    if (gapInfo.isStale) {
      totalScore += RISK_WEIGHTS[RiskFactor.STALE_DATA]
      riskFactors.push({
        factor: RiskFactor.STALE_DATA,
        score: RISK_WEIGHTS[RiskFactor.STALE_DATA],
        description: 'Stale discovery data',
        details: `Last seen: ${gapInfo.lastSeen || 'unknown'}`
      })
    }
  }
  maxPossibleScore += 33 // all gap factors
  
  // ===== DEPENDENCY CONTEXT =====
  const assetId = asset.tag_id || asset.asset_id
  const downstreamDeps = dependencies.filter(d => d.from === assetId)
  
  if (downstreamDeps.length > 5) {
    totalScore += RISK_WEIGHTS[RiskFactor.HIGH_DOWNSTREAM_IMPACT]
    riskFactors.push({
      factor: RiskFactor.HIGH_DOWNSTREAM_IMPACT,
      score: RISK_WEIGHTS[RiskFactor.HIGH_DOWNSTREAM_IMPACT],
      description: 'High downstream impact',
      details: `This device has ${downstreamDeps.length} dependent downstream devices`
    })
  }
  
  // Check if this is a single point of failure (no redundancy for critical function)
  if (deviceContext.isSafetyRelated || deviceContext.criticality === 'critical') {
    // Simplified SPOF check - in reality would check for redundant devices
    const similarDevicesInUnit = dependencies.filter(d => 
      d.unit === asset.unit && d.type === asset.device_type
    ).length
    
    if (similarDevicesInUnit === 0) {
      totalScore += RISK_WEIGHTS[RiskFactor.SINGLE_POINT_OF_FAILURE]
      riskFactors.push({
        factor: RiskFactor.SINGLE_POINT_OF_FAILURE,
        score: RISK_WEIGHTS[RiskFactor.SINGLE_POINT_OF_FAILURE],
        description: 'Single point of failure',
        details: 'No redundant device found for this critical function'
      })
    }
  }
  maxPossibleScore += 22 // dependency factors
  
  // ===== CALCULATE FINAL SCORE =====
  const normalizedScore = maxPossibleScore > 0 
    ? Math.round((totalScore / maxPossibleScore) * 100)
    : 0
  
  // Determine risk level
  let riskLevel
  if (normalizedScore >= 70) riskLevel = RiskLevel.CRITICAL
  else if (normalizedScore >= 50) riskLevel = RiskLevel.HIGH
  else if (normalizedScore >= 30) riskLevel = RiskLevel.MEDIUM
  else if (normalizedScore >= 10) riskLevel = RiskLevel.LOW
  else riskLevel = RiskLevel.INFO
  
  return {
    assetId,
    rawScore: totalScore,
    maxPossibleScore,
    normalizedScore,
    riskLevel,
    factors: riskFactors.sort((a, b) => b.score - a.score),
    topFactors: riskFactors.slice(0, 3),
    context: {
      deviceContext,
      lifecycleStatus,
      unitInfo
    }
  }
}

/**
 * Calculate risk for all assets and generate summary
 */
export function analyzePortfolioRisk(assets, context = {}) {
  const assetRisks = assets.map(asset => ({
    asset,
    risk: calculateAssetRisk(asset, context)
  }))
  
  // Sort by risk score
  assetRisks.sort((a, b) => b.risk.normalizedScore - a.risk.normalizedScore)
  
  // Generate summary statistics
  const summary = {
    totalAssets: assets.length,
    riskDistribution: {
      critical: assetRisks.filter(a => a.risk.riskLevel.value === 4).length,
      high: assetRisks.filter(a => a.risk.riskLevel.value === 3).length,
      medium: assetRisks.filter(a => a.risk.riskLevel.value === 2).length,
      low: assetRisks.filter(a => a.risk.riskLevel.value === 1).length,
      info: assetRisks.filter(a => a.risk.riskLevel.value === 0).length
    },
    averageRiskScore: Math.round(
      assetRisks.reduce((sum, a) => sum + a.risk.normalizedScore, 0) / assets.length
    ),
    topRisks: assetRisks.slice(0, 10),
    
    // Factor frequency analysis
    factorFrequency: calculateFactorFrequency(assetRisks),
    
    // Unit-level risk
    unitRisks: calculateUnitRisks(assetRisks),
    
    // Recommendations
    recommendations: generateRiskRecommendations(assetRisks)
  }
  
  return {
    assetRisks,
    summary
  }
}

// =============================================================================
// RISK AGGREGATION
// =============================================================================

/**
 * Calculate risk scores at unit level
 */
function calculateUnitRisks(assetRisks) {
  const unitScores = {}
  
  for (const { asset, risk } of assetRisks) {
    const unit = asset.unit || asset.area || 'Unknown'
    
    if (!unitScores[unit]) {
      unitScores[unit] = {
        unit,
        assets: 0,
        totalScore: 0,
        maxScore: 0,
        criticalCount: 0,
        highCount: 0
      }
    }
    
    unitScores[unit].assets++
    unitScores[unit].totalScore += risk.normalizedScore
    unitScores[unit].maxScore = Math.max(unitScores[unit].maxScore, risk.normalizedScore)
    
    if (risk.riskLevel.value === 4) unitScores[unit].criticalCount++
    if (risk.riskLevel.value === 3) unitScores[unit].highCount++
  }
  
  // Calculate averages and sort
  return Object.values(unitScores)
    .map(u => ({
      ...u,
      averageScore: Math.round(u.totalScore / u.assets),
      riskLevel: u.criticalCount > 0 ? RiskLevel.CRITICAL :
                 u.highCount > 0 ? RiskLevel.HIGH :
                 u.averageScore > 50 ? RiskLevel.MEDIUM : RiskLevel.LOW
    }))
    .sort((a, b) => b.maxScore - a.maxScore)
}

/**
 * Calculate how frequently each risk factor appears
 */
function calculateFactorFrequency(assetRisks) {
  const frequency = {}
  
  for (const { risk } of assetRisks) {
    for (const factor of risk.factors) {
      if (!frequency[factor.factor]) {
        frequency[factor.factor] = { count: 0, totalScore: 0 }
      }
      frequency[factor.factor].count++
      frequency[factor.factor].totalScore += factor.score
    }
  }
  
  return Object.entries(frequency)
    .map(([factor, data]) => ({
      factor,
      ...data,
      averageContribution: Math.round(data.totalScore / data.count)
    }))
    .sort((a, b) => b.totalScore - a.totalScore)
}

/**
 * Generate risk-based recommendations
 */
function generateRiskRecommendations(assetRisks) {
  const recommendations = []
  
  const criticalAssets = assetRisks.filter(a => a.risk.riskLevel.value === 4)
  if (criticalAssets.length > 0) {
    recommendations.push({
      priority: 'critical',
      title: `${criticalAssets.length} assets require immediate attention`,
      description: 'These assets have critical risk scores due to combination of high criticality, exposure, and lifecycle concerns',
      action: 'Conduct detailed risk assessment and implement compensating controls',
      assets: criticalAssets.slice(0, 5).map(a => a.asset.tag_id || a.asset.asset_id)
    })
  }
  
  // EOL-driven risk
  const eolAssets = assetRisks.filter(a => 
    a.risk.factors.some(f => f.factor === RiskFactor.EOL_STATUS && f.score >= 15)
  )
  if (eolAssets.length > 5) {
    recommendations.push({
      priority: 'high',
      title: `${eolAssets.length} assets have lifecycle concerns`,
      description: 'Significant portion of assets are EOL or approaching EOL',
      action: 'Develop technology refresh roadmap for obsolete equipment',
      assets: eolAssets.slice(0, 5).map(a => a.asset.tag_id || a.asset.asset_id)
    })
  }
  
  // Undocumented devices
  const undocumented = assetRisks.filter(a => 
    a.risk.factors.some(f => f.factor === RiskFactor.UNDOCUMENTED)
  )
  if (undocumented.length > 0) {
    recommendations.push({
      priority: 'high',
      title: `${undocumented.length} undocumented devices found`,
      description: 'Devices discovered on network without engineering documentation',
      action: 'Investigate and document or remove unauthorized devices',
      assets: undocumented.slice(0, 5).map(a => a.asset.tag_id || a.asset.asset_id)
    })
  }
  
  // Network exposure on critical devices
  const exposedCritical = assetRisks.filter(a => 
    a.risk.context.deviceContext?.criticality === 'critical' &&
    a.risk.factors.some(f => f.factor === RiskFactor.NETWORK_EXPOSURE)
  )
  if (exposedCritical.length > 0) {
    recommendations.push({
      priority: 'high',
      title: `${exposedCritical.length} critical assets are network-connected`,
      description: 'Critical control systems with network exposure require additional hardening',
      action: 'Review network segmentation and implement defense-in-depth controls',
      assets: exposedCritical.slice(0, 5).map(a => a.asset.tag_id || a.asset.asset_id)
    })
  }
  
  return recommendations
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function isPrivateIP(ip) {
  if (!ip) return true
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4) return true
  
  // 10.x.x.x
  if (parts[0] === 10) return true
  // 172.16.x.x - 172.31.x.x
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
  // 192.168.x.x
  if (parts[0] === 192 && parts[1] === 168) return true
  // 127.x.x.x
  if (parts[0] === 127) return true
  
  return false
}

export default {
  RiskFactor,
  RiskLevel,
  calculateAssetRisk,
  analyzePortfolioRisk
}
