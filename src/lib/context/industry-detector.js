/**
 * INDUSTRY AUTO-DETECTOR
 * 
 * Based on AIGNE Framework principles:
 * "Context Constructor should detect and adapt to data patterns
 * rather than requiring upfront configuration"
 * 
 * Analyzes ingested data to determine the most likely industry
 */

/**
 * Industry patterns for detection
 */
const INDUSTRY_PATTERNS = {
  'oil-gas': {
    name: 'Oil & Gas',
    icon: '⛽',
    // Unit/area names typical in refineries
    unitPatterns: [
      /\b(cdu|fcc|hds|hcu|nht|reformer|alkylation|coker|visbreaker)\b/i,
      /\b(crude|distillation|hydrocracker|hydrotreater)\b/i,
      /\b(flare|tank.?farm|loading|offsite)\b/i,
      /\b(refiner|upstream|downstream|midstream)\b/i
    ],
    // Equipment types
    equipmentPatterns: [
      /\b(compressor|pump|turbine|exchanger|vessel|reactor|column|tower)\b/i,
      /\b(valve|transmitter|analyzer|flowmeter)\b/i,
      /\b(burner|furnace|heater|boiler)\b/i
    ],
    // Terminology
    termPatterns: [
      /\b(bpd|barrel|crude|refin|petro|hydrocarbon|sulfur|h2s)\b/i,
      /\b(flammable|explosive|hazardous.?area|atex|iecex)\b/i
    ],
    weight: 0
  },
  
  'pharma': {
    name: 'Pharmaceutical',
    icon: '💊',
    // Unit/area names typical in pharma
    unitPatterns: [
      /\b(api|formulation|granulation|coating|packaging)\b/i,
      /\b(ferment|bioreactor|chromatograph|centrifuge)\b/i,
      /\b(clean.?room|sterile|aseptic|containment)\b/i,
      /\b(qc|qa|quality|validation)\b/i
    ],
    // Equipment types
    equipmentPatterns: [
      /\b(reactor|mixer|dryer|mill|tablet.?press)\b/i,
      /\b(autoclave|lyophilizer|freeze.?dry)\b/i,
      /\b(hvac|ahu|ffu|laminar)\b/i
    ],
    // Terminology
    termPatterns: [
      /\b(gmp|fda|21.?cfr|batch|lot|campaign)\b/i,
      /\b(cip|sip|wfi|purified.?water)\b/i,
      /\b(deviation|capa|change.?control)\b/i
    ],
    weight: 0
  },
  
  'utilities': {
    name: 'Power & Utilities',
    icon: '⚡',
    // Unit/area names typical in utilities
    unitPatterns: [
      /\b(generator|turbine|substation|switchyard)\b/i,
      /\b(boiler|hrsg|condenser|cooling.?tower)\b/i,
      /\b(transmission|distribution|grid|feeder)\b/i,
      /\b(water.?treatment|wastewater|desal)\b/i
    ],
    // Equipment types
    equipmentPatterns: [
      /\b(transformer|breaker|relay|capacitor|reactor)\b/i,
      /\b(inverter|rectifier|ups|battery)\b/i,
      /\b(meter|ied|rtu|bay.?controller)\b/i
    ],
    // Terminology
    termPatterns: [
      /\b(mw|kv|kva|mvar|frequency|voltage)\b/i,
      /\b(nerc|cip|ferc|ieee|iec.?61850)\b/i,
      /\b(scada|ems|dms|oms|agc)\b/i
    ],
    weight: 0
  },
  
  'automotive': {
    name: 'Automotive Manufacturing',
    icon: '🚗',
    unitPatterns: [
      /\b(body.?shop|paint|assembly|stamping|weld)\b/i,
      /\b(trim|chassis|final|engine|transmission)\b/i,
      /\b(agv|conveyor|robot|cell)\b/i
    ],
    equipmentPatterns: [
      /\b(robot|plc|drive|servo|motor)\b/i,
      /\b(vision|sensor|barcode|rfid)\b/i,
      /\b(press|cnc|lathe|mill)\b/i
    ],
    termPatterns: [
      /\b(oem|tier.?[123]|jit|kanban|andon)\b/i,
      /\b(vin|sku|bom|takt|cycle.?time)\b/i
    ],
    weight: 0
  }
}

/**
 * Detect industry from dataset
 * @param {Array} rows - Normalized data rows
 * @param {Object} options - Detection options
 * @returns {Object} Detection result with confidence
 */
export function detectIndustry(rows, options = {}) {
  const { minConfidence = 30 } = options
  
  // Reset weights
  Object.values(INDUSTRY_PATTERNS).forEach(p => p.weight = 0)
  
  // Sample rows for performance (max 500)
  const sampleSize = Math.min(rows.length, 500)
  const sample = rows.slice(0, sampleSize)
  
  // Build searchable text from all fields
  const searchTexts = sample.map(row => {
    const values = Object.values(row)
      .filter(v => typeof v === 'string')
      .join(' ')
    return values.toLowerCase()
  })
  const combinedText = searchTexts.join(' ')
  
  // Score each industry
  for (const [industryId, patterns] of Object.entries(INDUSTRY_PATTERNS)) {
    let score = 0
    
    // Check unit patterns (high weight)
    patterns.unitPatterns.forEach(regex => {
      const matches = (combinedText.match(regex) || []).length
      score += matches * 3
    })
    
    // Check equipment patterns (medium weight)
    patterns.equipmentPatterns.forEach(regex => {
      const matches = (combinedText.match(regex) || []).length
      score += matches * 2
    })
    
    // Check terminology (lower weight)
    patterns.termPatterns.forEach(regex => {
      const matches = (combinedText.match(regex) || []).length
      score += matches * 1
    })
    
    patterns.weight = score
  }
  
  // Find best match
  const sorted = Object.entries(INDUSTRY_PATTERNS)
    .map(([id, p]) => ({ id, ...p }))
    .sort((a, b) => b.weight - a.weight)
  
  const best = sorted[0]
  const second = sorted[1]
  
  // Calculate confidence (0-100)
  const totalWeight = sorted.reduce((sum, p) => sum + p.weight, 0)
  const confidence = totalWeight > 0 
    ? Math.round((best.weight / totalWeight) * 100)
    : 0
  
  // Determine if detection is reliable
  const isReliable = confidence >= minConfidence && best.weight > 10
  
  return {
    detected: isReliable ? best.id : null,
    industry: isReliable ? {
      id: best.id,
      name: best.name,
      icon: best.icon
    } : null,
    confidence,
    isReliable,
    scores: sorted.map(p => ({
      id: p.id,
      name: p.name,
      icon: p.icon,
      score: p.weight,
      percentage: totalWeight > 0 ? Math.round((p.weight / totalWeight) * 100) : 0
    })),
    sampleSize,
    reason: isReliable 
      ? `Detected ${best.name} with ${confidence}% confidence based on terminology patterns`
      : totalWeight === 0
        ? 'No industry-specific patterns found in data'
        : `Low confidence (${confidence}%) - manual selection recommended`
  }
}

/**
 * Quick industry check from filename
 */
export function detectIndustryFromFilename(filename) {
  const lower = filename.toLowerCase()
  
  if (/refiner|oil|gas|petro|crude/i.test(lower)) return 'oil-gas'
  if (/pharma|drug|gmp|fda|batch/i.test(lower)) return 'pharma'
  if (/power|util|grid|generat|substation/i.test(lower)) return 'utilities'
  if (/auto|vehicle|assembly|robot/i.test(lower)) return 'automotive'
  
  return null
}

/**
 * Get industry info by ID
 */
export function getIndustryInfo(industryId) {
  const pattern = INDUSTRY_PATTERNS[industryId]
  if (!pattern) return null
  
  return {
    id: industryId,
    name: pattern.name,
    icon: pattern.icon
  }
}

/**
 * Get all available industries
 */
export function getAvailableIndustries() {
  return Object.entries(INDUSTRY_PATTERNS).map(([id, p]) => ({
    id,
    name: p.name,
    icon: p.icon
  }))
}

export default {
  detectIndustry,
  detectIndustryFromFilename,
  getIndustryInfo,
  getAvailableIndustries
}


