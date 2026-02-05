/**
 * LIFECYCLE TRACKER
 * Tracks equipment lifecycle status, EOL dates, and support status
 * 
 * Context dimension: "How long do we have?"
 * - Installation dates
 * - Expected lifespan
 * - EOL/EOS announcements
 * - Firmware/software versions
 */

// =============================================================================
// VENDOR EOL/EOS DATABASE
// =============================================================================

// Known end-of-life dates for common OT equipment
// Format: vendor -> product family -> { eol, eos, replacement }
export const VENDOR_EOL_DATABASE = {
  'rockwell': {
    'controllogix_l55': { 
      eol: '2018-06-01', 
      eos: '2023-06-01', 
      replacement: 'ControlLogix 5580',
      severity: 'critical'
    },
    'controllogix_l61': { 
      eol: '2020-12-01', 
      eos: '2025-12-01', 
      replacement: 'ControlLogix 5580',
      severity: 'high'
    },
    'slc_500': { 
      eol: '2015-01-01', 
      eos: '2020-01-01', 
      replacement: 'CompactLogix',
      severity: 'critical'
    },
    'plc_5': { 
      eol: '2012-01-01', 
      eos: '2017-01-01', 
      replacement: 'ControlLogix',
      severity: 'critical'
    },
    'rslogix_5000_v20': { 
      eol: '2019-01-01', 
      eos: '2024-01-01', 
      replacement: 'Studio 5000 v32+',
      severity: 'high'
    },
    'panelview_plus_6': { 
      eol: '2021-01-01', 
      eos: '2026-01-01', 
      replacement: 'PanelView Plus 7',
      severity: 'medium'
    }
  },
  
  'siemens': {
    's7_300': { 
      eol: '2020-10-01', 
      eos: '2023-10-01', 
      replacement: 'S7-1500',
      severity: 'critical'
    },
    's7_400': { 
      eol: '2020-10-01', 
      eos: '2025-10-01', 
      replacement: 'S7-1500',
      severity: 'critical'
    },
    'wincc_v7': { 
      eol: '2022-01-01', 
      eos: '2027-01-01', 
      replacement: 'WinCC Unified',
      severity: 'medium'
    },
    'step7_classic': { 
      eol: '2017-01-01', 
      eos: '2022-01-01', 
      replacement: 'TIA Portal',
      severity: 'high'
    }
  },
  
  'schneider': {
    'modicon_m340': { 
      eol: null, 
      eos: null, 
      replacement: null,
      severity: 'low',
      notes: 'Still actively supported'
    },
    'modicon_premium': { 
      eol: '2020-12-01', 
      eos: '2025-12-01', 
      replacement: 'Modicon M580',
      severity: 'high'
    },
    'quantum': { 
      eol: '2020-12-01', 
      eos: '2028-12-01', 
      replacement: 'Modicon M580',
      severity: 'medium'
    }
  },
  
  'honeywell': {
    'experion_r400': { 
      eol: '2019-01-01', 
      eos: '2024-01-01', 
      replacement: 'Experion PKS R500+',
      severity: 'high'
    },
    'c300_controller': { 
      eol: null, 
      eos: null, 
      replacement: null,
      severity: 'low',
      notes: 'Current generation'
    }
  },
  
  'emerson': {
    'deltav_v11': { 
      eol: '2020-01-01', 
      eos: '2025-01-01', 
      replacement: 'DeltaV v14+',
      severity: 'high'
    },
    'ovation': { 
      eol: null, 
      eos: null, 
      replacement: null,
      severity: 'low',
      notes: 'Current generation'
    }
  },
  
  'abb': {
    'ac800m': { 
      eol: null, 
      eos: null, 
      replacement: null,
      severity: 'low',
      notes: 'Current generation'
    },
    'ac450': { 
      eol: '2018-01-01', 
      eos: '2023-01-01', 
      replacement: 'AC800M',
      severity: 'critical'
    }
  },
  
  'yokogawa': {
    'centum_vp_r5': { 
      eol: '2020-01-01', 
      eos: '2025-01-01', 
      replacement: 'CENTUM VP R6+',
      severity: 'high'
    },
    'prosafe_rs': { 
      eol: null, 
      eos: null, 
      replacement: null,
      severity: 'low',
      notes: 'Current generation'
    }
  },
  
  'ge': {
    'mark_vie': { 
      eol: null, 
      eos: null, 
      replacement: null,
      severity: 'low',
      notes: 'Current generation'
    },
    'mark_v': { 
      eol: '2015-01-01', 
      eos: '2020-01-01', 
      replacement: 'Mark VIe',
      severity: 'critical'
    }
  },
  
  // Network equipment
  'cisco': {
    'ie_2000': { 
      eol: '2020-01-01', 
      eos: '2025-01-01', 
      replacement: 'IE 3x00 series',
      severity: 'high'
    },
    'ie_3000': { 
      eol: '2022-01-01', 
      eos: '2027-01-01', 
      replacement: 'IE 3x00 series',
      severity: 'medium'
    }
  },
  
  'hirschmann': {
    'rs20': { 
      eol: '2019-01-01', 
      eos: '2024-01-01', 
      replacement: 'RSP series',
      severity: 'high'
    }
  },
  
  // Operating Systems
  'microsoft': {
    'windows_xp': { 
      eol: '2014-04-08', 
      eos: '2014-04-08', 
      replacement: 'Windows 10/11',
      severity: 'critical'
    },
    'windows_7': { 
      eol: '2020-01-14', 
      eos: '2023-01-10', 
      replacement: 'Windows 10/11',
      severity: 'critical'
    },
    'windows_server_2008': { 
      eol: '2020-01-14', 
      eos: '2023-01-10', 
      replacement: 'Windows Server 2019+',
      severity: 'critical'
    },
    'windows_server_2012': { 
      eol: '2023-10-10', 
      eos: '2026-10-13', 
      replacement: 'Windows Server 2022',
      severity: 'high'
    }
  }
}

// =============================================================================
// TYPICAL EQUIPMENT LIFESPANS
// =============================================================================

export const TYPICAL_LIFESPANS = {
  // Controllers
  'plc': { yearsMin: 10, yearsTypical: 15, yearsMax: 20 },
  'dcs': { yearsMin: 15, yearsTypical: 20, yearsMax: 25 },
  'rtu': { yearsMin: 10, yearsTypical: 15, yearsMax: 20 },
  'sis': { yearsMin: 10, yearsTypical: 15, yearsMax: 20 },
  
  // Interfaces
  'hmi': { yearsMin: 5, yearsTypical: 8, yearsMax: 12 },
  'workstation': { yearsMin: 4, yearsTypical: 6, yearsMax: 10 },
  'server': { yearsMin: 4, yearsTypical: 6, yearsMax: 8 },
  
  // Network
  'switch': { yearsMin: 5, yearsTypical: 8, yearsMax: 12 },
  'firewall': { yearsMin: 4, yearsTypical: 6, yearsMax: 8 },
  'router': { yearsMin: 5, yearsTypical: 8, yearsMax: 12 },
  
  // Field devices
  'transmitter': { yearsMin: 10, yearsTypical: 15, yearsMax: 25 },
  'analyzer': { yearsMin: 8, yearsTypical: 12, yearsMax: 18 },
  'valve': { yearsMin: 15, yearsTypical: 20, yearsMax: 30 },
  'drive': { yearsMin: 10, yearsTypical: 15, yearsMax: 20 }
}

// =============================================================================
// LIFECYCLE STATUS ENUM
// =============================================================================

export const LifecycleStatus = {
  CURRENT: 'current',           // Fully supported
  MATURE: 'mature',             // Supported but not latest
  APPROACHING_EOL: 'approaching_eol',  // EOL within 2 years
  EOL: 'eol',                   // End of life, limited support
  EOS: 'eos',                   // End of support, no patches
  OBSOLETE: 'obsolete',         // Long past EOS
  UNKNOWN: 'unknown'            // Cannot determine
}

// =============================================================================
// LIFECYCLE ANALYSIS FUNCTIONS
// =============================================================================

/**
 * Normalize vendor name for database lookup
 */
function normalizeVendor(vendor) {
  if (!vendor) return null
  
  const normalized = vendor.toLowerCase().trim()
  
  // Common aliases
  const aliases = {
    'allen-bradley': 'rockwell',
    'ab': 'rockwell',
    'allen bradley': 'rockwell',
    'rockwell automation': 'rockwell',
    'siemens ag': 'siemens',
    'schneider electric': 'schneider',
    'modicon': 'schneider',
    'honeywell process': 'honeywell',
    'emerson process': 'emerson',
    'fisher': 'emerson',
    'rosemount': 'emerson',
    'abb ltd': 'abb',
    'yokogawa electric': 'yokogawa',
    'general electric': 'ge',
    'hirschmann automation': 'hirschmann',
    'belden': 'hirschmann'
  }
  
  return aliases[normalized] || normalized
}

/**
 * Try to identify product family from model string
 */
function identifyProductFamily(vendor, model) {
  if (!model) return null
  
  const modelLower = model.toLowerCase()
  
  const patterns = {
    rockwell: [
      { pattern: /1756-l55/i, family: 'controllogix_l55' },
      { pattern: /1756-l6[1-4]/i, family: 'controllogix_l61' },
      { pattern: /1747/i, family: 'slc_500' },
      { pattern: /plc.?5/i, family: 'plc_5' },
      { pattern: /panelview.*plus.*6/i, family: 'panelview_plus_6' }
    ],
    siemens: [
      { pattern: /s7.?300/i, family: 's7_300' },
      { pattern: /s7.?400/i, family: 's7_400' },
      { pattern: /6es7.?3/i, family: 's7_300' },
      { pattern: /6es7.?4/i, family: 's7_400' }
    ],
    schneider: [
      { pattern: /m340/i, family: 'modicon_m340' },
      { pattern: /premium/i, family: 'modicon_premium' },
      { pattern: /quantum/i, family: 'quantum' },
      { pattern: /tsx.?p/i, family: 'modicon_premium' }
    ],
    microsoft: [
      { pattern: /xp/i, family: 'windows_xp' },
      { pattern: /windows.?7/i, family: 'windows_7' },
      { pattern: /2008/i, family: 'windows_server_2008' },
      { pattern: /2012/i, family: 'windows_server_2012' }
    ]
  }
  
  const vendorPatterns = patterns[vendor]
  if (!vendorPatterns) return null
  
  for (const { pattern, family } of vendorPatterns) {
    if (pattern.test(modelLower)) {
      return family
    }
  }
  
  return null
}

/**
 * Calculate lifecycle status for a single asset
 */
export function calculateLifecycleStatus(asset, referenceDate = new Date()) {
  const result = {
    status: LifecycleStatus.UNKNOWN,
    eolDate: null,
    eosDate: null,
    daysUntilEol: null,
    daysUntilEos: null,
    replacement: null,
    severity: 'unknown',
    source: null,
    estimatedAge: null,
    estimatedRemainingLife: null,
    notes: []
  }
  
  const vendor = normalizeVendor(asset.manufacturer || asset.vendor)
  const model = asset.model || asset.product || ''
  const installDate = asset.install_date || asset.installation_date || asset.commissioned
  
  // Try to find in EOL database
  if (vendor && VENDOR_EOL_DATABASE[vendor]) {
    const productFamily = identifyProductFamily(vendor, model)
    
    if (productFamily && VENDOR_EOL_DATABASE[vendor][productFamily]) {
      const eolInfo = VENDOR_EOL_DATABASE[vendor][productFamily]
      result.source = 'vendor_database'
      result.replacement = eolInfo.replacement
      result.severity = eolInfo.severity
      
      if (eolInfo.notes) {
        result.notes.push(eolInfo.notes)
      }
      
      if (eolInfo.eol) {
        result.eolDate = new Date(eolInfo.eol)
        result.daysUntilEol = Math.floor((result.eolDate - referenceDate) / (1000 * 60 * 60 * 24))
      }
      
      if (eolInfo.eos) {
        result.eosDate = new Date(eolInfo.eos)
        result.daysUntilEos = Math.floor((result.eosDate - referenceDate) / (1000 * 60 * 60 * 24))
      }
    }
  }
  
  // Calculate estimated age if install date available
  if (installDate) {
    const installDateObj = new Date(installDate)
    if (!isNaN(installDateObj)) {
      const ageMs = referenceDate - installDateObj
      result.estimatedAge = Math.floor(ageMs / (1000 * 60 * 60 * 24 * 365))
      
      // Estimate remaining life based on device type
      const deviceType = (asset.device_type || asset.type || '').toLowerCase()
      for (const [type, lifespan] of Object.entries(TYPICAL_LIFESPANS)) {
        if (deviceType.includes(type)) {
          result.estimatedRemainingLife = lifespan.yearsTypical - result.estimatedAge
          result.notes.push(`Typical lifespan for ${type}: ${lifespan.yearsTypical} years`)
          break
        }
      }
    }
  }
  
  // Determine overall status
  if (result.daysUntilEos !== null) {
    if (result.daysUntilEos < -365 * 3) {
      result.status = LifecycleStatus.OBSOLETE
    } else if (result.daysUntilEos < 0) {
      result.status = LifecycleStatus.EOS
    } else if (result.daysUntilEol !== null && result.daysUntilEol < 0) {
      result.status = LifecycleStatus.EOL
    } else if (result.daysUntilEol !== null && result.daysUntilEol < 730) {
      result.status = LifecycleStatus.APPROACHING_EOL
    } else if (result.daysUntilEol !== null) {
      result.status = LifecycleStatus.MATURE
    }
  } else if (result.estimatedAge !== null && result.estimatedRemainingLife !== null) {
    // Estimate from age
    if (result.estimatedRemainingLife < -5) {
      result.status = LifecycleStatus.OBSOLETE
      result.severity = 'high'
    } else if (result.estimatedRemainingLife < 0) {
      result.status = LifecycleStatus.EOL
      result.severity = 'high'
    } else if (result.estimatedRemainingLife < 3) {
      result.status = LifecycleStatus.APPROACHING_EOL
      result.severity = 'medium'
    } else {
      result.status = LifecycleStatus.CURRENT
      result.severity = 'low'
    }
    result.source = 'estimated'
  }
  
  return result
}

/**
 * Process all assets and add lifecycle status
 */
export function addLifecycleStatus(assets) {
  const now = new Date()
  
  return assets.map(asset => ({
    ...asset,
    lifecycleStatus: calculateLifecycleStatus(asset, now)
  }))
}

/**
 * Generate lifecycle summary for a set of assets
 */
export function generateLifecycleSummary(assets) {
  const summary = {
    total: assets.length,
    current: 0,
    mature: 0,
    approachingEol: 0,
    eol: 0,
    eos: 0,
    obsolete: 0,
    unknown: 0,
    criticalItems: [],
    recommendations: []
  }
  
  for (const asset of assets) {
    const lifecycle = asset.lifecycleStatus || calculateLifecycleStatus(asset)
    
    switch (lifecycle.status) {
      case LifecycleStatus.CURRENT: summary.current++; break
      case LifecycleStatus.MATURE: summary.mature++; break
      case LifecycleStatus.APPROACHING_EOL: summary.approachingEol++; break
      case LifecycleStatus.EOL: summary.eol++; break
      case LifecycleStatus.EOS: summary.eos++; break
      case LifecycleStatus.OBSOLETE: summary.obsolete++; break
      default: summary.unknown++
    }
    
    // Track critical items
    if (lifecycle.status === LifecycleStatus.EOS || lifecycle.status === LifecycleStatus.OBSOLETE) {
      summary.criticalItems.push({
        tagId: asset.tag_id || asset.asset_id,
        manufacturer: asset.manufacturer,
        model: asset.model,
        status: lifecycle.status,
        replacement: lifecycle.replacement
      })
    }
  }
  
  // Generate recommendations
  if (summary.obsolete > 0) {
    summary.recommendations.push({
      priority: 'critical',
      message: `${summary.obsolete} obsolete assets require immediate replacement planning`,
      action: 'Create migration project for obsolete equipment'
    })
  }
  
  if (summary.eos > 0) {
    summary.recommendations.push({
      priority: 'high',
      message: `${summary.eos} assets are past end-of-support with no security patches`,
      action: 'Implement compensating controls and plan upgrades'
    })
  }
  
  if (summary.approachingEol > 0) {
    summary.recommendations.push({
      priority: 'medium',
      message: `${summary.approachingEol} assets approaching end-of-life within 2 years`,
      action: 'Budget for replacements in next fiscal cycle'
    })
  }
  
  return summary
}

export default {
  VENDOR_EOL_DATABASE,
  TYPICAL_LIFESPANS,
  LifecycleStatus,
  calculateLifecycleStatus,
  addLifecycleStatus,
  generateLifecycleSummary
}
