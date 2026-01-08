/**
 * CONTEXT EVALUATOR
 * Security classification and cross-validation
 * 
 * Based on AIGNE Framework principles (arXiv:2512.05470):
 * "Context Evaluator validates context under explicit architectural design constraints"
 */

/**
 * Classify asset by security tier (industry-agnostic)
 * 
 * Tier 1: Critical Network Assets - MUST secure (PLCs, DCS, HMI, SCADA)
 * Tier 2: Smart/Networkable Devices - SHOULD secure (has IP/MAC)
 * Tier 3: Passive/Analog Devices - Inventory only (no network)
 */
export function classifySecurityTier(asset) {
  const deviceType = String(asset.device_type || '').toLowerCase()
  const hasIP = Boolean(asset.ip_address)
  const hasMAC = Boolean(asset.mac_address)
  const isNetworkable = hasIP || hasMAC
  
  // Tier 1: Critical control systems
  const tier1Keywords = [
    'plc', 'dcs', 'hmi', 'scada', 'rtu', 'controller', 
    'server', 'workstation', 'historian', 'safety',
    'switch', 'router', 'firewall', 'gateway'
  ]
  
  if (tier1Keywords.some(kw => deviceType.includes(kw))) {
    return {
      tier: 1,
      label: 'Critical Network Asset',
      securityRequired: 'MUST',
      reason: `Device type "${asset.device_type}" is a critical control system`,
      color: '#ef4444' // red
    }
  }
  
  // Tier 2: Smart/Networkable devices
  const tier2Keywords = [
    'smart', 'ip', 'ethernet', 'profinet', 'modbus/tcp',
    'camera', 'analyzer', 'vfd', 'drive', 'inverter'
  ]
  
  if (isNetworkable || tier2Keywords.some(kw => deviceType.includes(kw))) {
    return {
      tier: 2,
      label: 'Networkable Device',
      securityRequired: 'SHOULD',
      reason: isNetworkable 
        ? 'Has IP/MAC address - network attack surface' 
        : `Device type "${asset.device_type}" typically has network connectivity`,
      color: '#f59e0b' // amber
    }
  }
  
  // Tier 3: Passive/Analog devices
  return {
    tier: 3,
    label: 'Passive/Analog Device',
    securityRequired: 'NONE',
    reason: 'No network connectivity - inventory only',
    color: '#6366f1' // indigo
  }
}

/**
 * Cross-validate a single match between engineering and discovery
 * (Helper for single-item validation)
 */
export function crossValidate(match) {
  const eng = match.engineering
  const disc = match.discovered
  
  if (!disc) {
    return {
      status: 'UNVALIDATED',
      confidence: 'LOW',
      checks: {},
      agreementCount: 0,
      reason: 'No discovery data to validate against'
    }
  }
  
  // Run validation checks
  const checks = {
    tag_id: Boolean(eng.tag_id && disc.tag_id && eng.tag_id === disc.tag_id),
    ip_address: Boolean(eng.ip_address && disc.ip_address && eng.ip_address === disc.ip_address),
    hostname: Boolean(eng.hostname && disc.hostname && 
      eng.hostname.toLowerCase() === disc.hostname.toLowerCase()),
    device_type: Boolean(eng.device_type && disc.device_type && 
      eng.device_type.toLowerCase().includes(disc.device_type.toLowerCase().substring(0, 4))),
    manufacturer: Boolean(eng.manufacturer && disc.manufacturer && 
      eng.manufacturer.toLowerCase() === disc.manufacturer.toLowerCase())
  }
  
  const agreementCount = Object.values(checks).filter(Boolean).length
  
  let confidence, status
  if (agreementCount >= 3) {
    confidence = 'HIGH'
    status = 'VERIFIED'
  } else if (agreementCount >= 1) {
    confidence = 'MEDIUM'
    status = 'PARTIAL'
  } else {
    confidence = 'LOW'
    status = 'SUSPICIOUS'
  }
  
  return {
    status,
    confidence,
    agreementCount,
    checks,
    reason: `${agreementCount} of 5 fields agree between engineering and discovery`
  }
}

/**
 * Cross-validate an array of matched assets (batch processing)
 */
export function crossValidateAll(matched) {
  return matched.map(match => ({
    ...match,
    validation: crossValidate(match)
  }))
}

/**
 * Identify items requiring human review
 */
export function identifyReviewItems(results, blindSpots, orphans) {
  return {
    // Low confidence matches need review
    lowConfidenceMatches: results.filter(r => 
      r.validation?.confidence === 'LOW' || r.matchConfidence < 70
    ).slice(0, 50),
    
    // Suspicious: classified as passive but found on network
    suspiciousClassifications: results.filter(r => 
      r.classification?.tier === 3 && r.discovered?.ip_address
    ).slice(0, 30),
    
    // High-value orphans (discovered but not in baseline)
    criticalOrphans: orphans.filter(o => {
      const classification = classifySecurityTier(o)
      return classification.tier <= 2
    }).slice(0, 30),
    
    // Blind spots that should have been discovered
    unexpectedBlindSpots: blindSpots.filter(b => {
      const classification = classifySecurityTier(b)
      return classification.tier === 1 && b.ip_address
    }).slice(0, 30),
    
    // Summary counts
    summary: {
      lowConfidenceCount: results.filter(r => r.validation?.confidence === 'LOW').length,
      suspiciousCount: results.filter(r => 
        r.classification?.tier === 3 && r.discovered?.ip_address
      ).length,
      criticalOrphanCount: orphans.filter(o => classifySecurityTier(o).tier <= 2).length
    }
  }
}

/**
 * Check data freshness and warn about stale data
 */
export function checkDataFreshness(sources) {
  const warnings = []
  const now = new Date()
  
  // This would check last_seen dates, file timestamps, etc.
  // For now, return empty - can be enhanced later
  
  return warnings
}

/**
 * Generate summary statistics
 */
export function generateSummary(results, matchStats) {
  const tierCounts = { 1: 0, 2: 0, 3: 0 }
  const validationCounts = { HIGH: 0, MEDIUM: 0, LOW: 0 }
  
  results.forEach(r => {
    if (r.classification?.tier) tierCounts[r.classification.tier]++
    if (r.validation?.confidence) validationCounts[r.validation.confidence]++
  })
  
  return {
    total: matchStats.engineeringTotal,
    matched: matchStats.matchedCount,
    blindSpots: matchStats.blindSpotCount,
    orphans: matchStats.orphanCount,
    coveragePercent: matchStats.coveragePercent,
    
    byTier: {
      tier1: tierCounts[1],
      tier2: tierCounts[2],
      tier3: tierCounts[3],
      networkable: tierCounts[1] + tierCounts[2]
    },
    
    byConfidence: validationCounts,
    
    // Security posture
    securityPosture: {
      criticalAssets: tierCounts[1],
      networkableAssets: tierCounts[1] + tierCounts[2],
      passiveAssets: tierCounts[3],
      highConfidencePercent: results.length > 0 
        ? Math.round((validationCounts.HIGH / results.length) * 100)
        : 0
    }
  }
}

export default {
  classifySecurityTier,
  crossValidate,
  identifyReviewItems,
  checkDataFreshness,
  generateSummary
}

