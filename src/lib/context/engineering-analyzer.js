/**
 * ENGINEERING ANALYZER
 * LLM-powered sanity checking and gap analysis for OT asset data
 * 
 * Based on AIGNE Framework principles:
 * "Context Evaluator validates context under explicit architectural design constraints"
 * 
 * This module provides engineering intelligence by comparing actual asset data
 * against industry norms and process engineering best practices.
 */

import { ProvenanceTracker } from './provenance.js'

/**
 * Industry context for prompt construction
 */
const INDUSTRY_CONTEXT = {
  'oil-gas': {
    name: 'Oil & Gas Refinery',
    processDescription: 'petroleum refining with distillation, cracking, and treating processes',
    typicalUnits: ['Crude Distillation Unit (CDU)', 'Fluid Catalytic Cracker (FCC)', 'Hydrocracker', 'Reformer', 'Coker', 'Hydrotreater', 'Tank Farm', 'Utilities'],
    criticalSystems: ['Safety Instrumented Systems (SIS)', 'Emergency Shutdown (ESD)', 'Fire & Gas Detection', 'Burner Management Systems (BMS)'],
    standards: ['ISA/IEC 62443', 'IEC 61511 (SIS)', 'API 1164', 'NIST CSF', 'TSA Pipeline Security'],
    typicalInstrumentation: {
      CDU: { PLCs: '8-15', DCS: '5-12', transmitters: '120-200', controlValves: '60-100' },
      FCC: { PLCs: '12-25', DCS: '10-20', transmitters: '180-350', safetyControllers: '3-8' },
      utilities: { PLCs: '8-18', boilerControls: '5-10', compressorControls: '3-8' }
    }
  },
  'pharma': {
    name: 'Pharmaceutical Manufacturing',
    processDescription: 'batch processing for API synthesis, formulation, and packaging with strict GMP requirements',
    typicalUnits: ['API Manufacturing', 'Formulation', 'Granulation', 'Tablet Press', 'Coating', 'Packaging', 'Clean Utilities', 'QC Laboratory'],
    criticalSystems: ['Environmental Monitoring', 'Clean-in-Place (CIP)', 'Sterilization-in-Place (SIP)', 'Building Management (BMS)'],
    standards: ['FDA 21 CFR Part 11', 'GAMP 5', 'EU Annex 11', 'ICH Q9', 'ISO 27001'],
    typicalInstrumentation: {
      API: { batchControllers: '5-12', PLCs: '10-20', environmentalMonitors: '20-50' },
      formulation: { batchControllers: '8-18', temperatureControllers: '15-40' },
      packaging: { serializationSystems: '3-10', visionSystems: '5-20' }
    }
  },
  'utilities': {
    name: 'Power Generation & Utilities',
    processDescription: 'electricity generation and distribution with turbines, generators, and grid interconnection',
    typicalUnits: ['Turbine Hall', 'Generator', 'Transformer Yard', 'Switchyard', 'Cooling Tower', 'Fuel Handling', 'Emissions Control', 'Control Center'],
    criticalSystems: ['Protection Relays', 'Automatic Generation Control (AGC)', 'SCADA/EMS', 'Cybersecurity Monitoring'],
    standards: ['NERC CIP', 'IEC 62351', 'IEEE 1686', 'NIST CSF'],
    typicalInstrumentation: {
      turbine: { controllers: '10-20', protectionRelays: '15-30', vibrationMonitors: '8-15' },
      generator: { excitationControllers: '2-5', protectionRelays: '20-40' },
      switchyard: { IEDs: '30-80', protectionRelays: '50-150' }
    }
  }
}

/**
 * UNIT TEMPLATES - Detailed per-unit device expectations
 * Used for gap analysis comparing actual inventory against industry norms
 * 
 * Each unit has:
 * - minDevices: Minimum expected count for each device type
 * - maxDevices: Maximum typical count (for flagging over-documentation)
 * - required: Device types that MUST exist (at least 1)
 * - processRole: Description of unit's role in the process
 * - aliases: Alternative names that map to this unit
 */
const UNIT_TEMPLATES = {
  'oil-gas': {
    'Crude Distillation Unit': {
      minDevices: { PLC: 6, DCS: 4, HMI: 2, Safety_Controller: 2, Analyzer: 5, RTU: 1 },
      maxDevices: { PLC: 15, DCS: 12, HMI: 6, Safety_Controller: 5, Analyzer: 20, RTU: 4 },
      required: ['PLC', 'DCS', 'Safety_Controller'],
      processRole: 'Primary separation unit - feeds all downstream processes. High temperature/pressure operations require robust safety systems.',
      aliases: ['CDU', 'Atmospheric Distillation', 'Primary Distillation']
    },
    'Fluid Catalytic Cracking': {
      minDevices: { PLC: 8, DCS: 6, HMI: 3, Safety_Controller: 3, Analyzer: 6, Controller: 2 },
      maxDevices: { PLC: 25, DCS: 20, HMI: 8, Safety_Controller: 8, Analyzer: 15, Controller: 8 },
      required: ['PLC', 'DCS', 'Safety_Controller'],
      processRole: 'High-temperature catalytic conversion. Critical safety zone with regenerator, reactor, and fractionator sections.',
      aliases: ['FCC', 'Cat Cracker', 'Catalytic Cracker']
    },
    'Hydrocracker': {
      minDevices: { PLC: 6, DCS: 4, HMI: 2, Safety_Controller: 2, Analyzer: 4 },
      maxDevices: { PLC: 18, DCS: 14, HMI: 6, Safety_Controller: 6, Analyzer: 12 },
      required: ['PLC', 'Safety_Controller'],
      processRole: 'High-pressure hydrogen processing. Requires extensive safety instrumentation due to hydrogen hazards.',
      aliases: ['HCU', 'Hydrocracking Unit']
    },
    'Reformer': {
      minDevices: { PLC: 4, DCS: 3, HMI: 2, Safety_Controller: 2, Analyzer: 3 },
      maxDevices: { PLC: 12, DCS: 10, HMI: 5, Safety_Controller: 4, Analyzer: 10 },
      required: ['PLC', 'Safety_Controller'],
      processRole: 'Catalytic reforming for octane improvement. High temperature operations with precious metal catalysts.',
      aliases: ['Catalytic Reformer', 'Platformer', 'CCR']
    },
    'Coker Unit': {
      minDevices: { PLC: 5, DCS: 4, HMI: 2, Safety_Controller: 2, Analyzer: 3 },
      maxDevices: { PLC: 15, DCS: 12, HMI: 5, Safety_Controller: 5, Analyzer: 10 },
      required: ['PLC', 'Safety_Controller'],
      processRole: 'Delayed coking of heavy residues. Batch/semi-batch operation with high safety requirements.',
      aliases: ['Coker', 'Delayed Coker', 'DCU']
    },
    'Hydrotreater': {
      minDevices: { PLC: 3, DCS: 2, HMI: 1, Safety_Controller: 1, Analyzer: 2 },
      maxDevices: { PLC: 10, DCS: 8, HMI: 4, Safety_Controller: 3, Analyzer: 8 },
      required: ['PLC'],
      processRole: 'Hydrogen treating for sulfur removal. Multiple units typically exist for different feedstocks.',
      aliases: ['HDT', 'Hydrotreating', 'Desulfurization']
    },
    'Tank Farm': {
      minDevices: { PLC: 2, RTU: 3, HMI: 1, Gateway: 2 },
      maxDevices: { PLC: 8, RTU: 15, HMI: 4, Gateway: 10 },
      required: ['RTU'],
      processRole: 'Storage and blending operations. Distributed control with tank gauging and transfer systems.',
      aliases: ['Tank Storage', 'Storage', 'Tankage']
    },
    'Utilities': {
      minDevices: { PLC: 4, DCS: 2, HMI: 2, Controller: 2 },
      maxDevices: { PLC: 18, DCS: 10, HMI: 8, Controller: 12 },
      required: ['PLC'],
      processRole: 'Steam, power, water, air systems. Supports all process units with utilities.',
      aliases: ['Utility', 'Power House', 'Boiler House']
    },
    'Control Room': {
      minDevices: { HMI: 4, SCADA: 1, Engineering_Workstation: 2, Historian: 1 },
      maxDevices: { HMI: 20, SCADA: 4, Engineering_Workstation: 10, Historian: 4 },
      required: ['HMI', 'SCADA'],
      processRole: 'Central operations center. Houses operator workstations and engineering systems.',
      aliases: ['Operations', 'Central Control', 'Main Control']
    },
    'Loading': {
      minDevices: { PLC: 2, RTU: 2, Controller: 1 },
      maxDevices: { PLC: 8, RTU: 10, Controller: 6 },
      required: ['PLC'],
      processRole: 'Product loading for trucks, rail, or marine. Custody transfer metering systems.',
      aliases: ['Loading Rack', 'Truck Loading', 'Marine Terminal']
    },
    'Alkylation': {
      minDevices: { PLC: 4, DCS: 3, HMI: 2, Safety_Controller: 2, Analyzer: 3 },
      maxDevices: { PLC: 12, DCS: 10, HMI: 5, Safety_Controller: 5, Analyzer: 8 },
      required: ['PLC', 'Safety_Controller'],
      processRole: 'Alkylation using HF or H2SO4 acid. Extremely hazardous - requires extensive safety systems.',
      aliases: ['Alky', 'HF Alky', 'Sulfuric Alky']
    },
    'Isomerization': {
      minDevices: { PLC: 3, DCS: 2, HMI: 1, Safety_Controller: 1 },
      maxDevices: { PLC: 8, DCS: 6, HMI: 3, Safety_Controller: 3 },
      required: ['PLC'],
      processRole: 'Isomerization of light naphtha. Improves octane of light gasoline components.',
      aliases: ['Isom', 'Isomer', 'Light Naphtha Isom']
    }
  },
  
  'pharma': {
    'Reactor Suite A': {
      minDevices: { PLC: 4, DCS: 3, HMI: 2, Controller: 2, Analyzer: 3 },
      maxDevices: { PLC: 12, DCS: 10, HMI: 5, Controller: 8, Analyzer: 10 },
      required: ['PLC', 'DCS'],
      processRole: 'Primary API synthesis reactors. Batch control with strict temperature and pressure monitoring.',
      aliases: ['API Reactor', 'Synthesis', 'Reaction']
    },
    'Reactor Suite B': {
      minDevices: { PLC: 4, DCS: 3, HMI: 2, Controller: 2, Analyzer: 3 },
      maxDevices: { PLC: 12, DCS: 10, HMI: 5, Controller: 8, Analyzer: 10 },
      required: ['PLC', 'DCS'],
      processRole: 'Secondary API synthesis. May handle different products or campaign production.',
      aliases: ['Secondary Reactor', 'Campaign Suite']
    },
    'Purification': {
      minDevices: { PLC: 3, DCS: 2, HMI: 1, Analyzer: 4 },
      maxDevices: { PLC: 10, DCS: 8, HMI: 4, Analyzer: 15 },
      required: ['PLC', 'Analyzer'],
      processRole: 'API purification via crystallization, filtration, or chromatography. Critical quality control point.',
      aliases: ['API Purification', 'Crystallization', 'Filtration']
    },
    'Granulation': {
      minDevices: { PLC: 2, HMI: 1, Controller: 2 },
      maxDevices: { PLC: 6, HMI: 3, Controller: 8 },
      required: ['PLC'],
      processRole: 'Wet or dry granulation for tablet manufacturing. Particle size control critical.',
      aliases: ['Wet Granulation', 'Dry Granulation', 'Fluid Bed']
    },
    'Tablet Press': {
      minDevices: { PLC: 2, HMI: 2, Controller: 3 },
      maxDevices: { PLC: 8, HMI: 6, Controller: 15 },
      required: ['PLC', 'Controller'],
      processRole: 'Tablet compression with real-time weight and hardness monitoring.',
      aliases: ['Compression', 'Tableting', 'Press Room']
    },
    'Coating': {
      minDevices: { PLC: 2, HMI: 1, Controller: 2 },
      maxDevices: { PLC: 6, HMI: 4, Controller: 8 },
      required: ['PLC'],
      processRole: 'Film or sugar coating of tablets. Environmental control critical.',
      aliases: ['Film Coating', 'Pan Coating']
    },
    'Packaging': {
      minDevices: { PLC: 3, HMI: 2, Controller: 4 },
      maxDevices: { PLC: 12, HMI: 8, Controller: 20 },
      required: ['PLC'],
      processRole: 'Primary, secondary, and tertiary packaging with serialization.',
      aliases: ['Blister Pack', 'Bottling', 'Serialization']
    },
    'Clean Utilities': {
      minDevices: { PLC: 3, HMI: 2, Analyzer: 4 },
      maxDevices: { PLC: 10, HMI: 6, Analyzer: 15 },
      required: ['PLC', 'Analyzer'],
      processRole: 'WFI, purified water, clean steam generation. Continuous monitoring required.',
      aliases: ['WFI', 'Purified Water', 'Clean Steam']
    },
    'QC Lab': {
      minDevices: { HMI: 2, Analyzer: 5, Engineering_Workstation: 2 },
      maxDevices: { HMI: 8, Analyzer: 30, Engineering_Workstation: 10 },
      required: ['Analyzer'],
      processRole: 'Quality control laboratory with analytical instruments.',
      aliases: ['QC Laboratory', 'Quality Control', 'Analytical Lab']
    },
    'HVAC': {
      minDevices: { PLC: 2, Controller: 4, HMI: 1 },
      maxDevices: { PLC: 8, Controller: 20, HMI: 4 },
      required: ['PLC', 'Controller'],
      processRole: 'Environmental control for cleanrooms. Pressure cascades and air handling.',
      aliases: ['Air Handling', 'Cleanroom Control', 'Environmental']
    }
  },
  
  'utilities': {
    'Turbine Hall': {
      minDevices: { PLC: 6, DCS: 4, HMI: 3, Safety_Controller: 2, Controller: 4 },
      maxDevices: { PLC: 20, DCS: 15, HMI: 10, Safety_Controller: 8, Controller: 15 },
      required: ['PLC', 'DCS', 'Safety_Controller'],
      processRole: 'Steam or gas turbines for power generation. Critical rotating equipment monitoring.',
      aliases: ['Turbine', 'Steam Turbine', 'Gas Turbine', 'Combined Cycle']
    },
    'Generator': {
      minDevices: { PLC: 3, Controller: 3, HMI: 2 },
      maxDevices: { PLC: 10, Controller: 12, HMI: 6 },
      required: ['PLC', 'Controller'],
      processRole: 'Electrical generators with excitation and protection systems.',
      aliases: ['Gen', 'Alternator', 'Generator Hall']
    },
    'Transformer Yard': {
      minDevices: { RTU: 4, Controller: 3, Gateway: 2 },
      maxDevices: { RTU: 15, Controller: 12, Gateway: 8 },
      required: ['RTU'],
      processRole: 'Step-up transformers and grid connection. High voltage monitoring.',
      aliases: ['Transformers', 'HV Yard', 'Grid Connection']
    },
    'Switchyard': {
      minDevices: { RTU: 5, Controller: 4, Gateway: 3 },
      maxDevices: { RTU: 20, Controller: 20, Gateway: 15 },
      required: ['RTU', 'Controller'],
      processRole: 'High voltage switching and protection. IED-based protection systems.',
      aliases: ['Switchgear', 'Substation', 'HV Switchyard']
    },
    'Cooling Tower': {
      minDevices: { PLC: 2, RTU: 2, Controller: 2 },
      maxDevices: { PLC: 8, RTU: 8, Controller: 10 },
      required: ['PLC'],
      processRole: 'Cooling water circulation. Multiple cells with fan and pump control.',
      aliases: ['Cooling', 'CT', 'Circulating Water']
    },
    'Fuel Handling': {
      minDevices: { PLC: 3, RTU: 2, HMI: 1, Safety_Controller: 1 },
      maxDevices: { PLC: 10, RTU: 8, HMI: 4, Safety_Controller: 4 },
      required: ['PLC'],
      processRole: 'Coal, gas, or oil fuel receiving, storage, and feeding systems.',
      aliases: ['Fuel', 'Coal Handling', 'Gas Receiving']
    },
    'Emissions Control': {
      minDevices: { PLC: 3, Analyzer: 4, Controller: 2 },
      maxDevices: { PLC: 10, Analyzer: 15, Controller: 8 },
      required: ['PLC', 'Analyzer'],
      processRole: 'CEMS, scrubbers, filters for environmental compliance.',
      aliases: ['CEMS', 'Scrubber', 'Baghouse', 'ESP']
    },
    'Water Treatment': {
      minDevices: { PLC: 2, Analyzer: 3, Controller: 2 },
      maxDevices: { PLC: 8, Analyzer: 12, Controller: 8 },
      required: ['PLC', 'Analyzer'],
      processRole: 'Boiler feedwater treatment, demineralization, wastewater.',
      aliases: ['Demin', 'Boiler Feedwater', 'Wastewater']
    },
    'Control Center': {
      minDevices: { HMI: 6, SCADA: 2, Engineering_Workstation: 3, Historian: 1 },
      maxDevices: { HMI: 25, SCADA: 6, Engineering_Workstation: 15, Historian: 4 },
      required: ['HMI', 'SCADA'],
      processRole: 'Central control room with EMS/SCADA systems.',
      aliases: ['Control Room', 'Operations', 'EMS']
    },
    'Battery Storage': {
      minDevices: { PLC: 2, Controller: 3, HMI: 1 },
      maxDevices: { PLC: 8, Controller: 15, HMI: 4 },
      required: ['PLC', 'Controller'],
      processRole: 'Battery energy storage system (BESS) for grid stability.',
      aliases: ['BESS', 'Energy Storage', 'Battery']
    }
  }
}

// Export for use in other modules
export { UNIT_TEMPLATES }

/**
 * Normalize unit names to match templates
 * Handles variations like "CDU" -> "Crude Distillation Unit"
 */
function normalizeUnitName(unitName, industry) {
  const templates = UNIT_TEMPLATES[industry] || UNIT_TEMPLATES['oil-gas']
  const lowerUnit = (unitName || '').toLowerCase().trim()
  
  // Direct match
  if (templates[unitName]) return unitName
  
  // Check aliases
  for (const [templateName, config] of Object.entries(templates)) {
    if (templateName.toLowerCase() === lowerUnit) return templateName
    if (config.aliases?.some(a => a.toLowerCase() === lowerUnit)) return templateName
    // Partial match for common abbreviations
    if (config.aliases?.some(a => lowerUnit.includes(a.toLowerCase()) || a.toLowerCase().includes(lowerUnit))) {
      return templateName
    }
  }
  
  // Fuzzy match - check if unit name contains key words
  for (const [templateName, config] of Object.entries(templates)) {
    const keywords = templateName.toLowerCase().split(' ')
    if (keywords.some(kw => kw.length > 3 && lowerUnit.includes(kw))) {
      return templateName
    }
  }
  
  return unitName // Return original if no match
}

/**
 * Normalize device type names for comparison
 */
function normalizeDeviceType(deviceType) {
  const dt = (deviceType || '').toLowerCase().trim()
  
  // Map common variations
  const mappings = {
    'plc': 'PLC',
    'programmable logic controller': 'PLC',
    'dcs': 'DCS',
    'distributed control': 'DCS',
    'hmi': 'HMI',
    'human machine interface': 'HMI',
    'operator interface': 'HMI',
    'scada': 'SCADA',
    'rtu': 'RTU',
    'remote terminal': 'RTU',
    'safety': 'Safety_Controller',
    'safety_controller': 'Safety_Controller',
    'sis': 'Safety_Controller',
    'safety controller': 'Safety_Controller',
    'analyzer': 'Analyzer',
    'analyser': 'Analyzer',
    'controller': 'Controller',
    'gateway': 'Gateway',
    'protocol_converter': 'Gateway',
    'historian': 'Historian',
    'engineering_workstation': 'Engineering_Workstation',
    'engineering workstation': 'Engineering_Workstation',
    'workstation': 'Engineering_Workstation',
    'vfd': 'VFD',
    'variable frequency drive': 'VFD',
    'drive': 'VFD'
  }
  
  return mappings[dt] || deviceType
}

/**
 * Group assets by unit and device type for gap analysis
 */
function groupByUnitAndType(assets, industry) {
  const grouped = {}
  
  assets.forEach(asset => {
    const rawUnit = asset.unit || asset.area || 'Unassigned'
    const unit = normalizeUnitName(rawUnit, industry)
    const deviceType = normalizeDeviceType(asset.device_type)
    
    if (!grouped[unit]) {
      grouped[unit] = { 
        devices: {}, 
        total: 0, 
        rawName: rawUnit,
        assets: []
      }
    }
    
    grouped[unit].devices[deviceType] = (grouped[unit].devices[deviceType] || 0) + 1
    grouped[unit].total++
    grouped[unit].assets.push(asset)
  })
  
  return grouped
}

/**
 * Generate human-readable insight for a gap
 */
function generateInsight(unit, deviceType, actual, expected, processRole) {
  const deficit = expected - actual
  
  if (actual === 0) {
    return `${unit} has no ${deviceType} documented. Industry norm requires at least ${expected}. This unit ${processRole ? `(${processRole})` : ''} should be investigated for missing documentation or discovery gaps.`
  }
  
  if (deficit >= expected * 0.5) {
    return `${unit} has only ${actual} ${deviceType} (expected minimum: ${expected}). This is significantly below industry norms and may indicate incomplete data collection or an unusually small unit.`
  }
  
  return `${unit} has ${actual} ${deviceType}, ${deficit} below the expected minimum of ${expected}. Consider verifying discovery coverage for this area.`
}

/**
 * BUILD GAP MATRIX
 * Compares actual asset inventory against industry templates
 * Returns structured gap analysis with severity ratings
 */
export function buildGapMatrix(assets, industry) {
  const templates = UNIT_TEMPLATES[industry] || UNIT_TEMPLATES['oil-gas']
  const actual = groupByUnitAndType(assets, industry)
  const gaps = []
  const coverage = []
  
  // Check each template unit against actual data
  for (const [templateUnit, config] of Object.entries(templates)) {
    const unitData = actual[templateUnit]
    const unitDevices = unitData?.devices || {}
    
    // Track if this unit exists in the data at all
    const unitExists = !!unitData
    
    // Check minimum device counts
    for (const [deviceType, minCount] of Object.entries(config.minDevices)) {
      const actualCount = unitDevices[deviceType] || 0
      const gap = actualCount - minCount
      
      if (gap < 0) {
        const severity = 
          actualCount === 0 ? 'critical' :
          gap <= -Math.ceil(minCount * 0.5) ? 'critical' :
          gap <= -2 ? 'warning' : 'info'
        
        gaps.push({
          unit: templateUnit,
          deviceType,
          expected: minCount,
          actual: actualCount,
          gap,
          severity,
          unitExists,
          insight: generateInsight(templateUnit, deviceType, actualCount, minCount, config.processRole),
          processRole: config.processRole
        })
      }
    }
    
    // Check required device types (must have at least 1)
    for (const requiredType of config.required || []) {
      if (!unitDevices[requiredType] && !gaps.some(g => g.unit === templateUnit && g.deviceType === requiredType)) {
        gaps.push({
          unit: templateUnit,
          deviceType: requiredType,
          expected: 1,
          actual: 0,
          gap: -1,
          severity: 'critical',
          unitExists,
          insight: `${templateUnit} has no ${requiredType} documented - this is a critical gap for a ${industry === 'oil-gas' ? 'refinery' : 'facility'} process unit`,
          processRole: config.processRole,
          isRequired: true
        })
      }
    }
    
    // Track coverage for units that exist
    if (unitExists) {
      let meetsMin = 0
      let totalChecks = Object.keys(config.minDevices).length
      
      for (const [deviceType, minCount] of Object.entries(config.minDevices)) {
        if ((unitDevices[deviceType] || 0) >= minCount) meetsMin++
      }
      
      coverage.push({
        unit: templateUnit,
        totalAssets: unitData.total,
        coveragePercent: Math.round((meetsMin / totalChecks) * 100),
        meetsMinimums: meetsMin,
        totalChecks
      })
    }
  }
  
  // Sort gaps: critical first, then by gap magnitude
  gaps.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 }
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity]
    }
    return a.gap - b.gap
  })
  
  // Calculate summary statistics
  const summary = {
    totalGaps: gaps.length,
    criticalGaps: gaps.filter(g => g.severity === 'critical').length,
    warningGaps: gaps.filter(g => g.severity === 'warning').length,
    unitsWithGaps: [...new Set(gaps.map(g => g.unit))].length,
    totalTemplateUnits: Object.keys(templates).length,
    unitsInData: Object.keys(actual).length,
    templateCoverage: coverage
  }
  
  return { gaps, summary, actual }
}

/**
 * Build a comprehensive summary of the asset data for LLM analysis
 */
export function buildDataSummary(result, industry) {
  const assets = result?.assets || []
  const blindSpots = result?.blindSpots || []
  const orphans = result?.orphans || []
  
  // Group assets by unit
  const byUnit = {}
  assets.forEach(a => {
    const unit = a.unit || 'Unassigned'
    if (!byUnit[unit]) {
      byUnit[unit] = { total: 0, tier1: 0, tier2: 0, tier3: 0, deviceTypes: {} }
    }
    byUnit[unit].total++
    if (a.classification?.tier === 1) byUnit[unit].tier1++
    if (a.classification?.tier === 2) byUnit[unit].tier2++
    if (a.classification?.tier === 3) byUnit[unit].tier3++
    
    const dtype = a.device_type || 'Unknown'
    byUnit[unit].deviceTypes[dtype] = (byUnit[unit].deviceTypes[dtype] || 0) + 1
  })
  
  // Group by device type overall
  const byDeviceType = {}
  assets.forEach(a => {
    const dtype = a.device_type || 'Unknown'
    byDeviceType[dtype] = (byDeviceType[dtype] || 0) + 1
  })
  
  // Identify plants/sites
  const plants = [...new Set(assets.map(a => a.plant || a.plant_code || a.facility).filter(Boolean))]
  
  // Blind spots by criticality
  const criticalBlindSpots = blindSpots.filter(b => {
    const dtype = (b.device_type || '').toLowerCase()
    return ['plc', 'dcs', 'controller', 'safety', 'scada', 'hmi'].some(kw => dtype.includes(kw))
  })
  
  // Orphans by criticality  
  const criticalOrphans = orphans.filter(o => {
    const dtype = (o.device_type || '').toLowerCase()
    return ['plc', 'dcs', 'controller', 'safety', 'scada', 'hmi'].some(kw => dtype.includes(kw))
  })
  
  return {
    overview: {
      totalAssets: assets.length,
      totalBlindSpots: blindSpots.length,
      totalOrphans: orphans.length,
      matchRate: assets.length > 0 ? Math.round((assets.length / (assets.length + blindSpots.length)) * 100) : 0,
      plantCount: plants.length,
      plants: plants.slice(0, 5) // First 5
    },
    byUnit,
    byDeviceType,
    criticalAssets: {
      tier1Count: assets.filter(a => a.classification?.tier === 1).length,
      tier2Count: assets.filter(a => a.classification?.tier === 2).length,
      tier3Count: assets.filter(a => a.classification?.tier === 3).length
    },
    concerns: {
      criticalBlindSpots: criticalBlindSpots.length,
      criticalOrphans: criticalOrphans.length,
      blindSpotExamples: blindSpots.slice(0, 5).map(b => ({
        tag: b.tag_id,
        type: b.device_type,
        unit: b.unit
      })),
      orphanExamples: orphans.slice(0, 5).map(o => ({
        tag: o.tag_id || o.hostname,
        type: o.device_type,
        ip: o.ip_address
      }))
    },
    industry
  }
}

/**
 * Format the data summary for the LLM prompt
 */
function formatSummaryForPrompt(summary) {
  const { overview, byUnit, byDeviceType, criticalAssets, concerns } = summary
  
  let text = `## Asset Inventory Overview
- Total matched assets: ${overview.totalAssets.toLocaleString()}
- Blind spots (in engineering, not discovered): ${overview.totalBlindSpots.toLocaleString()}
- Orphans (discovered, not in engineering): ${overview.totalOrphans.toLocaleString()}
- Match rate: ${overview.matchRate}%
- Sites/Plants: ${overview.plantCount} (${overview.plants.join(', ') || 'not specified'})

## Security Classification
- Tier 1 (Critical Control Systems): ${criticalAssets.tier1Count.toLocaleString()}
- Tier 2 (Networkable Devices): ${criticalAssets.tier2Count.toLocaleString()}
- Tier 3 (Passive/Analog): ${criticalAssets.tier3Count.toLocaleString()}

## Assets by Process Unit
`
  
  Object.entries(byUnit).forEach(([unit, data]) => {
    text += `\n### ${unit}
- Total: ${data.total} assets (${data.tier1} critical, ${data.tier2} networkable, ${data.tier3} passive)
- Device types: ${Object.entries(data.deviceTypes).slice(0, 8).map(([t, c]) => `${t}: ${c}`).join(', ')}`
  })
  
  text += `\n\n## Top Device Types
`
  Object.entries(byDeviceType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([dtype, count]) => {
      text += `- ${dtype}: ${count}\n`
    })
  
  text += `\n## Data Quality Concerns
- Critical blind spots (documented but not found on network): ${concerns.criticalBlindSpots}
- Critical orphans (on network but not documented): ${concerns.criticalOrphans}
`
  
  if (concerns.blindSpotExamples.length > 0) {
    text += `\nBlind spot examples:\n`
    concerns.blindSpotExamples.forEach(b => {
      text += `  - ${b.tag || 'Unknown'} (${b.type || 'Unknown type'}) in ${b.unit || 'Unknown unit'}\n`
    })
  }
  
  if (concerns.orphanExamples.length > 0) {
    text += `\nOrphan examples:\n`
    concerns.orphanExamples.forEach(o => {
      text += `  - ${o.tag || 'Unknown'} (${o.type || 'Unknown type'}) at ${o.ip || 'Unknown IP'}\n`
    })
  }
  
  return text
}

/**
 * Format gap matrix for prompt inclusion
 */
function formatGapMatrixForPrompt(gapMatrix) {
  const { gaps, summary } = gapMatrix
  
  if (gaps.length === 0) {
    return `\n## Gap Analysis Results\nNo significant gaps detected - asset counts meet or exceed industry minimums for all documented units.\n`
  }
  
  let text = `\n## GAP ANALYSIS MATRIX (Expected vs Actual)

**Summary:** ${summary.criticalGaps} critical gaps, ${summary.warningGaps} warnings across ${summary.unitsWithGaps} units

| Unit | Device Type | Expected | Actual | Gap | Severity |
|------|-------------|----------|--------|-----|----------|
`
  
  // Include top 25 gaps
  gaps.slice(0, 25).forEach(g => {
    text += `| ${g.unit} | ${g.deviceType} | ${g.expected} | ${g.actual} | ${g.gap} | ${g.severity.toUpperCase()} |\n`
  })
  
  // Add critical findings as bullet points
  const criticalGaps = gaps.filter(g => g.severity === 'critical')
  if (criticalGaps.length > 0) {
    text += `\n### Critical Findings Requiring Investigation\n`
    criticalGaps.slice(0, 10).forEach(g => {
      text += `- **${g.unit}**: ${g.insight}\n`
    })
  }
  
  // Add coverage summary
  if (summary.templateCoverage.length > 0) {
    text += `\n### Unit Coverage Summary\n`
    summary.templateCoverage.forEach(c => {
      const status = c.coveragePercent >= 80 ? '✅' : c.coveragePercent >= 50 ? '⚠️' : '🚨'
      text += `- ${status} ${c.unit}: ${c.totalAssets} assets, ${c.coveragePercent}% meets minimums (${c.meetsMinimums}/${c.totalChecks} device types)\n`
    })
  }
  
  return text
}

/**
 * Build the complete prompt for engineering analysis
 */
export function buildAnalysisPrompt(summary, gapMatrix = null) {
  const industryCtx = INDUSTRY_CONTEXT[summary.industry] || INDUSTRY_CONTEXT['oil-gas']
  
  // Build gap matrix if not provided
  const gapData = gapMatrix || { gaps: [], summary: { criticalGaps: 0, warningGaps: 0 } }
  
  const prompt = `You are a senior OT/ICS engineer conducting an asset inventory assessment for a ${industryCtx.name} facility. Your role is to analyze the gap analysis data and provide expert insights on data completeness, instrumentation gaps, and actionable recommendations.

## Facility Context
- Industry: ${industryCtx.name}
- Process: ${industryCtx.processDescription}
- Typical process units: ${industryCtx.typicalUnits.join(', ')}
- Critical safety systems: ${industryCtx.criticalSystems.join(', ')}
- Applicable standards: ${industryCtx.standards.join(', ')}

## Client Data Summary
${formatSummaryForPrompt(summary)}
${formatGapMatrixForPrompt(gapData)}

---

Based on the gap analysis matrix above and your expertise in ${industryCtx.name} process control, provide a focused assessment:

### 1. CRITICAL GAP INTERPRETATION
For each critical gap in the matrix:
- Is this likely a documentation gap, discovery limitation, or architectural difference?
- What are the implications if these devices truly don't exist?
- What specific actions should the client take to investigate?

### 2. PATTERN ANALYSIS
Looking at the gaps collectively:
- Do the gaps suggest a systemic issue (e.g., safety systems under-documented across all units)?
- Are certain process units disproportionately affected?
- Does this pattern match any common scenarios you've seen (e.g., legacy DCS-only architecture, phased modernization)?

### 3. RISK PRIORITIZATION
Rank the top 3-5 gaps by risk:
- Which gaps pose the greatest operational/safety risk if the assets truly don't exist?
- Which gaps are most likely to be documentation issues vs. actual missing equipment?

### 4. ACTIONABLE RECOMMENDATIONS
Provide specific next steps:
1. Immediate actions (verify X, scan Y network segment)
2. Short-term improvements (update baseline with Z)
3. Process improvements (implement A for ongoing accuracy)

Be specific and reference the actual unit names and device types from the gap matrix. If the gap matrix shows few or no critical gaps, focus on validating the data quality and identifying any potential blind spots.`

  return prompt
}

/**
 * Call the engineering analysis API
 */
export async function analyzeEngineering(result, industry, options = {}) {
  const summary = buildDataSummary(result, industry)
  const assets = result?.assets || []
  
  // Build gap matrix from actual data
  const gapMatrix = buildGapMatrix(assets, industry)
  
  // Build prompt with gap matrix included
  const prompt = buildAnalysisPrompt(summary, gapMatrix)
  
  // Track provenance
  const provenance = options.provenance || new ProvenanceTracker()
  provenance.record({
    type: 'ENGINEERING_ANALYSIS_REQUESTED',
    industry,
    assetCount: summary.overview.totalAssets,
    blindSpotCount: summary.overview.totalBlindSpots,
    orphanCount: summary.overview.totalOrphans,
    gapCount: gapMatrix.summary.totalGaps,
    criticalGaps: gapMatrix.summary.criticalGaps
  })
  
  try {
    const response = await fetch('/api/analyze-engineering', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt,
        summary: {
          industry: summary.industry,
          totalAssets: summary.overview.totalAssets,
          matchRate: summary.overview.matchRate
        },
        gapMatrix: {
          gaps: gapMatrix.gaps.slice(0, 30), // Send top 30 gaps for context
          summary: gapMatrix.summary
        }
      })
    })
    
    if (!response.ok) {
      throw new Error(`Analysis API returned ${response.status}`)
    }
    
    const data = await response.json()
    
    provenance.record({
      type: 'ENGINEERING_ANALYSIS_COMPLETE',
      model: data.model,
      analysisLength: data.analysis?.length || 0
    })
    
    return {
      success: true,
      analysis: data.analysis,
      model: data.model,
      timestamp: data.timestamp,
      summary,
      gapMatrix,
      provenance: provenance.events
    }
    
  } catch (error) {
    provenance.record({
      type: 'ENGINEERING_ANALYSIS_ERROR',
      error: error.message
    })
    
    return {
      success: false,
      error: error.message,
      summary,
      gapMatrix,
      provenance: provenance.events
    }
  }
}

/**
 * Generate a fallback analysis when API is unavailable
 * Uses rule-based checks against templates
 */
export function generateFallbackAnalysis(result, industry, template) {
  const summary = buildDataSummary(result, industry)
  const assets = result?.assets || []
  const gapMatrix = buildGapMatrix(assets, industry)
  const industryCtx = INDUSTRY_CONTEXT[industry] || INDUSTRY_CONTEXT['oil-gas']
  
  let analysis = `## Engineering Assessment (Automated)

*Note: This is an automated assessment based on template comparisons. For AI-powered detailed analysis, ensure the API is configured.*

### 1. BASELINE COMPLETENESS

**Facility Profile:**
- ${summary.overview.totalAssets.toLocaleString()} assets documented across ${summary.overview.plantCount} site(s)
- ${Object.keys(summary.byUnit).length} process units identified
- Match rate with discovery: ${summary.overview.matchRate}%

**Assessment:** `

  if (summary.overview.matchRate >= 80) {
    analysis += `✅ Good coverage - ${summary.overview.matchRate}% of engineering baseline validated by discovery.`
  } else if (summary.overview.matchRate >= 60) {
    analysis += `⚠️ Moderate coverage - ${summary.overview.matchRate}% match rate suggests some assets may be offline or not network-connected.`
  } else {
    analysis += `🚨 Low coverage - ${summary.overview.matchRate}% match rate indicates significant gaps between documentation and actual network presence.`
  }

  // Add gap matrix summary
  analysis += `

### 2. GAP ANALYSIS (vs Industry Norms)

**Summary:** ${gapMatrix.summary.criticalGaps} critical gaps, ${gapMatrix.summary.warningGaps} warnings detected

`

  if (gapMatrix.gaps.length > 0) {
    analysis += `| Unit | Device Type | Expected | Actual | Gap | Severity |
|------|-------------|----------|--------|-----|----------|
`
    gapMatrix.gaps.slice(0, 15).forEach(g => {
      const icon = g.severity === 'critical' ? '🚨' : g.severity === 'warning' ? '⚠️' : 'ℹ️'
      analysis += `| ${g.unit} | ${g.deviceType} | ${g.expected} | ${g.actual} | ${g.gap} | ${icon} ${g.severity} |\n`
    })
    
    // Add critical insights
    const criticalGaps = gapMatrix.gaps.filter(g => g.severity === 'critical')
    if (criticalGaps.length > 0) {
      analysis += `\n**Critical Findings:**\n`
      criticalGaps.slice(0, 5).forEach(g => {
        analysis += `- ${g.unit}: ${g.insight}\n`
      })
    }
  } else {
    analysis += `✅ No significant gaps detected - asset counts meet industry minimums.\n`
  }

  analysis += `
### 3. INSTRUMENTATION BY UNIT

| Process Unit | Total Assets | Critical (Tier 1) | Networkable (Tier 2) |
|--------------|--------------|-------------------|---------------------|
`

  Object.entries(summary.byUnit).slice(0, 10).forEach(([unit, data]) => {
    analysis += `| ${unit} | ${data.total} | ${data.tier1} | ${data.tier2} |\n`
  })

  analysis += `
### 4. DATA QUALITY FLAGS

`

  if (summary.concerns.criticalBlindSpots > 0) {
    analysis += `⚠️ **${summary.concerns.criticalBlindSpots} critical assets** documented but not discovered on network.

`
  }

  if (summary.concerns.criticalOrphans > 0) {
    analysis += `🚨 **${summary.concerns.criticalOrphans} critical devices** discovered but not in engineering baseline.

`
  }

  analysis += `### 5. RECOMMENDATIONS

1. **Investigate critical gaps** - ${gapMatrix.summary.criticalGaps} device type gaps require investigation to determine if assets are missing, undocumented, or on unscanned networks.

2. **Validate blind spots** - ${summary.overview.totalBlindSpots} assets in engineering baseline weren't discovered.

3. **Document orphans** - ${summary.overview.totalOrphans} discovered devices not in baseline need review.

4. **Enable AI analysis** - For detailed interpretation of these gaps, configure the Claude API for enhanced insights.

---
*Assessment generated: ${new Date().toISOString()}*
*Industry template: ${industryCtx.name}*
*Standards reference: ${industryCtx.standards.slice(0, 3).join(', ')}*
`

  return {
    success: true,
    analysis,
    model: 'template-fallback',
    timestamp: new Date().toISOString(),
    summary,
    gapMatrix,
    isFallback: true
  }
}
