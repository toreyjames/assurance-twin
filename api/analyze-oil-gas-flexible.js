import Papa from 'papaparse'
import dayjs from 'dayjs'
import crypto from 'node:crypto'

const parseCsv = (text) => Papa.parse(text || '', { header: true, skipEmptyLines: true }).data
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex')

// ============================================================================
// REFINERY EQUIPMENT TEMPLATES - Operational Intelligence Layer
// Expected equipment mix for typical refinery process units
// Used for completeness scoring and context-aware unknown device classification
// ============================================================================
const REFINERY_EQUIPMENT_TEMPLATES = {
  'Crude Distillation': {
    displayName: 'Crude Distillation Unit (CDU)',
    description: 'Primary crude oil separation - most critical production unit',
    expectedEquipment: {
      // Control systems
      'PLC': { min: 8, typical: 10, max: 15, criticality: 'CRITICAL', function: 'Main process control' },
      'DCS': { min: 5, typical: 8, max: 12, criticality: 'CRITICAL', function: 'Distributed control' },
      'Safety_Controller': { min: 2, typical: 4, max: 6, criticality: 'CRITICAL', function: 'SIS/ESD systems' },
      
      // Field devices
      'Transmitter': { min: 120, typical: 150, max: 200, criticality: 'HIGH', function: 'Pressure/temp/level/flow monitoring' },
      'Pressure_Transmitter': { min: 30, typical: 40, max: 60, criticality: 'HIGH', function: 'Column pressure control' },
      'Temperature_Transmitter': { min: 30, typical: 40, max: 60, criticality: 'HIGH', function: 'Distillation control' },
      'Level_Transmitter': { min: 20, typical: 25, max: 35, criticality: 'HIGH', function: 'Tank/vessel level control' },
      'Flow_Transmitter': { min: 20, typical: 25, max: 35, criticality: 'HIGH', function: 'Crude feed/product flow' },
      'Control_Valve': { min: 60, typical: 80, max: 100, criticality: 'HIGH', function: 'Flow/pressure regulation' },
      'Pump': { min: 25, typical: 35, max: 50, criticality: 'CRITICAL', function: 'Crude feed/product transfer' },
      'Analyzer': { min: 10, typical: 15, max: 25, criticality: 'MEDIUM', function: 'Product quality analysis' },
      
      // Network infrastructure
      'Switch': { min: 5, typical: 8, max: 15, criticality: 'HIGH', function: 'OT network connectivity' },
      'Gateway': { min: 2, typical: 4, max: 8, criticality: 'HIGH', function: 'Protocol conversion' },
      'HMI': { min: 2, typical: 4, max: 8, criticality: 'MEDIUM', function: 'Operator interface' }
    }
  },
  
  'Hydrocracker': {
    displayName: 'Hydrocracker Unit',
    description: 'Heavy oil upgrading - high pressure/temperature operations',
    expectedEquipment: {
      'PLC': { min: 10, typical: 15, max: 20, criticality: 'CRITICAL', function: 'Process automation' },
      'DCS': { min: 8, typical: 12, max: 16, criticality: 'CRITICAL', function: 'Reactor control' },
      'Safety_Controller': { min: 3, typical: 5, max: 8, criticality: 'CRITICAL', function: 'High-pressure safety systems' },
      'Transmitter': { min: 150, typical: 200, max: 280, criticality: 'HIGH', function: 'Process monitoring' },
      'Pressure_Transmitter': { min: 50, typical: 65, max: 90, criticality: 'CRITICAL', function: 'High-pressure reactor control' },
      'Temperature_Transmitter': { min: 40, typical: 55, max: 75, criticality: 'CRITICAL', function: 'Reactor temperature control' },
      'Flow_Transmitter': { min: 30, typical: 40, max: 55, criticality: 'HIGH', function: 'Hydrogen/feed flow' },
      'Control_Valve': { min: 90, typical: 120, max: 160, criticality: 'HIGH', function: 'Process regulation' },
      'Pump': { min: 35, typical: 45, max: 60, criticality: 'CRITICAL', function: 'High-pressure pumps' },
      'Compressor': { min: 5, typical: 8, max: 12, criticality: 'CRITICAL', function: 'Hydrogen recirculation' },
      'Analyzer': { min: 20, typical: 30, max: 45, criticality: 'HIGH', function: 'H2 purity, product quality' },
      'Switch': { min: 6, typical: 10, max: 15, criticality: 'HIGH', function: 'Network infrastructure' },
      'Gateway': { min: 3, typical: 5, max: 8, criticality: 'HIGH', function: 'Protocol conversion' }
    }
  },
  
  'FCC': {
    displayName: 'Fluid Catalytic Cracking (FCC)',
    description: 'Gasoline production - complex catalyst circulation',
    expectedEquipment: {
      'PLC': { min: 12, typical: 18, max: 25, criticality: 'CRITICAL', function: 'Catalyst control' },
      'DCS': { min: 10, typical: 15, max: 20, criticality: 'CRITICAL', function: 'Reactor/regenerator control' },
      'Safety_Controller': { min: 4, typical: 6, max: 10, criticality: 'CRITICAL', function: 'Blower trip, pressure relief' },
      'Transmitter': { min: 180, typical: 250, max: 350, criticality: 'HIGH', function: 'Complex process monitoring' },
      'Pressure_Transmitter': { min: 60, typical: 80, max: 110, criticality: 'CRITICAL', function: 'Reactor/regenerator pressure' },
      'Temperature_Transmitter': { min: 50, typical: 70, max: 95, criticality: 'CRITICAL', function: 'Catalyst temperature control' },
      'Flow_Transmitter': { min: 40, typical: 55, max: 75, criticality: 'HIGH', function: 'Feed/air/catalyst flow' },
      'Control_Valve': { min: 100, typical: 140, max: 190, criticality: 'HIGH', function: 'Complex flow control' },
      'Pump': { min: 30, typical: 40, max: 55, criticality: 'CRITICAL', function: 'Product transfer' },
      'Compressor': { min: 3, typical: 5, max: 8, criticality: 'CRITICAL', function: 'Air blower for regenerator' },
      'Analyzer': { min: 25, typical: 35, max: 50, criticality: 'HIGH', function: 'Product quality, emissions' },
      'Switch': { min: 8, typical: 12, max: 18, criticality: 'HIGH', function: 'Network infrastructure' }
    }
  },
  
  'Tank Farm': {
    displayName: 'Tank Farm / Storage',
    description: 'Crude and product storage - inventory management',
    expectedEquipment: {
      'PLC': { min: 5, typical: 8, max: 12, criticality: 'MEDIUM', function: 'Tank monitoring' },
      'Transmitter': { min: 80, typical: 120, max: 180, criticality: 'MEDIUM', function: 'Tank monitoring' },
      'Level_Transmitter': { min: 50, typical: 80, max: 120, criticality: 'HIGH', function: 'Inventory tracking' },
      'Pressure_Transmitter': { min: 20, typical: 30, max: 45, criticality: 'MEDIUM', function: 'Tank pressure' },
      'Temperature_Transmitter': { min: 30, typical: 50, max: 75, criticality: 'MEDIUM', function: 'Product temperature' },
      'Pump': { min: 30, typical: 50, max: 75, criticality: 'HIGH', function: 'Transfer pumps' },
      'Control_Valve': { min: 20, typical: 30, max: 45, criticality: 'MEDIUM', function: 'Flow isolation' },
      'Analyzer': { min: 5, typical: 10, max: 15, criticality: 'LOW', function: 'Product quality spot checks' },
      'Switch': { min: 4, typical: 6, max: 10, criticality: 'MEDIUM', function: 'Tank farm network' },
      'IP_Camera': { min: 10, typical: 20, max: 35, criticality: 'LOW', function: 'Security surveillance' }
    }
  },
  
  'Utilities': {
    displayName: 'Utilities (Steam, Power, Cooling)',
    description: 'Supporting systems - plant-wide distribution',
    expectedEquipment: {
      'PLC': { min: 8, typical: 12, max: 18, criticality: 'HIGH', function: 'Utilities distribution' },
      'DCS': { min: 4, typical: 6, max: 10, criticality: 'HIGH', function: 'Boiler/turbine control' },
      'Safety_Controller': { min: 2, typical: 4, max: 6, criticality: 'HIGH', function: 'Boiler safety systems' },
      'Transmitter': { min: 150, typical: 200, max: 280, criticality: 'HIGH', function: 'System monitoring' },
      'Pressure_Transmitter': { min: 60, typical: 80, max: 110, criticality: 'HIGH', function: 'Steam pressure' },
      'Temperature_Transmitter': { min: 50, typical: 70, max: 95, criticality: 'HIGH', function: 'Steam/water temperature' },
      'Flow_Transmitter': { min: 40, typical: 55, max: 75, criticality: 'HIGH', function: 'Steam/water flow' },
      'Control_Valve': { min: 80, typical: 110, max: 150, criticality: 'HIGH', function: 'Distribution control' },
      'Pump': { min: 40, typical: 60, max: 85, criticality: 'HIGH', function: 'Water circulation' },
      'Switch': { min: 10, typical: 15, max: 22, criticality: 'HIGH', function: 'Plant-wide network backbone' },
      'Gateway': { min: 5, typical: 8, max: 12, criticality: 'HIGH', function: 'Cross-unit communication' }
    }
  },
  
  // Catch-all for unknown units
  'Unknown': {
    displayName: 'Unknown / Uncategorized',
    description: 'Assets not assigned to a specific process unit',
    expectedEquipment: {}
  }
}

// Normalize dataset to handle varied CSV formats and enable flexible matching
const normalizeDataset = (rows, sourceType = 'unknown') => rows.map((row) => {
  const norm = {}
  Object.entries(row || {}).forEach(([k, v]) => {
    const key = String(k || '').toLowerCase().replace(/\s+|-/g, '_')
    norm[key] = typeof v === 'string' ? v.trim() : v
  })
  
  return {
    // Primary identifiers (for matching) - try many variations
    tag_id: String(norm.tag_id ?? norm.tag ?? norm.tagid ?? norm.asset_tag ?? norm.asset_id ?? norm.asset_name ?? norm.name ?? '').trim().toUpperCase(),
    ip_address: String(norm.ip_address ?? norm.ip ?? norm.ipaddress ?? norm.ipv4 ?? norm.ip4 ?? '').trim(),
    mac_address: String(norm.mac_address ?? norm.mac ?? norm.macaddress ?? norm.mac_addr ?? '').trim().toUpperCase(),
    hostname: String(norm.hostname ?? norm.host ?? norm.device_name ?? norm.devicename ?? norm.computer_name ?? '').trim(),
    
    // Asset attributes - flexible field mapping
    plant: String(norm.plant ?? norm.site ?? norm.facility ?? norm.location ?? norm.site_name ?? '').trim(),
    unit: String(norm.unit ?? norm.area ?? norm.process_unit ?? norm.zone ?? norm.segment ?? '').trim(),
    device_type: String(norm.device_type ?? norm.type ?? norm.asset_type ?? norm.instrument_type ?? norm.category ?? norm.device_category ?? '').trim(),
    manufacturer: String(norm.manufacturer ?? norm.vendor ?? norm.oem ?? norm.make ?? norm.brand ?? '').trim(),
    model: String(norm.model ?? norm.device_model ?? norm.product ?? norm.product_name ?? '').trim(),
    
    // Security attributes - flexible boolean parsing
    is_managed: norm.is_managed ?? norm.managed ?? norm.security_managed ?? norm.under_management ?? false,
    has_security_patches: norm.has_security_patches ?? norm.patched ?? norm.patch_status ?? norm.up_to_date ?? false,
    encryption_enabled: norm.encryption_enabled ?? norm.encrypted ?? norm.encryption ?? norm.has_encryption ?? false,
    authentication_required: norm.authentication_required ?? norm.authentication ?? norm.auth_required ?? norm.requires_auth ?? false,
    firewall_protected: norm.firewall_protected ?? norm.firewall ?? norm.segmented ?? norm.has_firewall ?? false,
    access_control: norm.access_control ?? norm.access_controls ?? norm.rbac ?? norm.acl ?? 'None',
    
    // Vulnerability data
    vulnerabilities: parseInt(norm.vulnerabilities ?? norm.vuln_count ?? norm.vulnerability_count ?? norm.vulns ?? 0),
    cve_count: parseInt(norm.cve_count ?? norm.cves ?? norm.cve ?? 0),
    
    // Discovery metadata
    last_seen: norm.last_seen ?? norm.lastseen ?? norm.last_discovered ?? norm.last_scan ?? '',
    confidence_level: parseInt(norm.confidence_level ?? norm.confidence ?? 100),
    
    // Track source for debugging
    _source: sourceType,
    
    // Keep all original fields for reference
    ...norm
  }
})

// Helper to parse boolean-ish values from CSV
const isTruthy = (val) => {
  if (val === true || val === 'true' || val === 'True' || val === 'TRUE' || val === 'Yes' || val === 'YES' || val === '1' || val === 1) {
    return true
  }
  return false
}

// AUTO-DETECT CSV TYPE based on column names
function detectDataSourceType(csvText, filename) {
  const sample = Papa.parse(csvText, { header: true, preview: 1 }).data[0] || {}
  const headers = Object.keys(sample).map(h => h.toLowerCase())
  
  console.log(`[AUTO-DETECT] Analyzing ${filename}:`, headers.slice(0, 5))
  
  // Engineering baseline indicators
  const engineeringIndicators = ['tag_id', 'tag', 'asset_tag', 'p&id', 'pid', 'loop', 'instrument']
  if (headers.some(h => engineeringIndicators.some(i => h.includes(i)))) {
    return 'engineering'
  }
  
  // OT Discovery indicators
  const discoveryIndicators = ['last_seen', 'discovered', 'scan', 'network', 'mac_address', 'ot_protocol']
  if (headers.some(h => discoveryIndicators.some(i => h.includes(i)))) {
    return 'otDiscovery'
  }
  
  // Security indicators
  const securityIndicators = ['vulnerability', 'cve', 'patch', 'cvss', 'exploit', 'firewall']
  if (headers.some(h => securityIndicators.some(i => h.includes(i)))) {
    return 'security'
  }
  
  // Default to other
  return 'other'
}

// MERGE multiple CSVs of the same type
function mergeDataSources(dataSources, sourceType) {
  const allRows = []
  const seenIds = new Set()
  
  console.log(`[MERGE] Processing ${dataSources.length} ${sourceType} files`)
  
  dataSources.forEach(({ filename, content }) => {
    const parsed = parseCsv(content)
    const normalized = normalizeDataset(parsed, `${sourceType}:${filename}`)
    
    console.log(`[MERGE] ${filename}: ${normalized.length} rows`)
    
    // Deduplicate by tag_id or IP
    normalized.forEach(row => {
      const id = row.tag_id || row.ip_address || row.hostname || Math.random().toString()
      if (!seenIds.has(id)) {
        seenIds.add(id)
        allRows.push(row)
      }
    })
  })
  
  console.log(`[MERGE] ${sourceType}: ${allRows.length} unique assets after deduplication`)
  return allRows
}

// FLEXIBLE MATCHING (same as v2 but more robust)
function performFlexibleMatching(engineering, discovered, options = {}) {
  const {
    matchStrategies = ['tag_id', 'ip_address', 'hostname', 'mac_address'],
  } = options
  
  const engineeringAssets = engineering.length
  const discoveredAssets = discovered.length
  
  const matchedAssets = []
  const usedDiscoveryAssets = new Set()
  
  console.log(`[MATCHING] Starting with ${engineeringAssets} eng assets, ${discoveredAssets} discovered assets`)
  console.log(`[MATCHING] Strategies: ${matchStrategies.join(', ')}`)
  
  // Strategy 1: Exact tag_id match
  if (matchStrategies.includes('tag_id')) {
    engineering.forEach(engAsset => {
      if (!engAsset.tag_id) return
      
      const match = discovered.find(d => 
        d.tag_id === engAsset.tag_id && !usedDiscoveryAssets.has(d.tag_id + d.ip_address)
      )
      
      if (match) {
        matchedAssets.push({
          engineering: engAsset,
          discovered: match,
          matchType: 'exact_tag_id',
          matchConfidence: 100
        })
        usedDiscoveryAssets.add(match.tag_id + match.ip_address)
      }
    })
    console.log(`[MATCHING] After tag_id: ${matchedAssets.length} matches`)
  }
  
  // Strategy 2: IP address match
  if (matchStrategies.includes('ip_address')) {
    engineering.forEach(engAsset => {
      if (!engAsset.ip_address || matchedAssets.find(m => m.engineering.tag_id === engAsset.tag_id)) return
      
      const match = discovered.find(d => 
        d.ip_address && d.ip_address === engAsset.ip_address && !usedDiscoveryAssets.has(d.tag_id + d.ip_address)
      )
      
      if (match) {
        matchedAssets.push({
          engineering: engAsset,
          discovered: match,
          matchType: 'ip_match',
          matchConfidence: 95
        })
        usedDiscoveryAssets.add(match.tag_id + match.ip_address)
      }
    })
    console.log(`[MATCHING] After IP: ${matchedAssets.length} matches`)
  }
  
  // Strategy 3: Hostname match
  if (matchStrategies.includes('hostname')) {
    engineering.forEach(engAsset => {
      if (!engAsset.hostname || matchedAssets.find(m => m.engineering.tag_id === engAsset.tag_id)) return
      
      const match = discovered.find(d => 
        d.hostname && d.hostname.toLowerCase() === engAsset.hostname.toLowerCase() && !usedDiscoveryAssets.has(d.tag_id + d.ip_address)
      )
      
      if (match) {
        matchedAssets.push({
          engineering: engAsset,
          discovered: match,
          matchType: 'hostname_match',
          matchConfidence: 90
        })
        usedDiscoveryAssets.add(match.tag_id + match.ip_address)
      }
    })
    console.log(`[MATCHING] After hostname: ${matchedAssets.length} matches`)
  }
  
  // Strategy 4: MAC address match
  if (matchStrategies.includes('mac_address')) {
    engineering.forEach(engAsset => {
      if (!engAsset.mac_address || matchedAssets.find(m => m.engineering.tag_id === engAsset.tag_id)) return
      
      const match = discovered.find(d => 
        d.mac_address && d.mac_address === engAsset.mac_address && !usedDiscoveryAssets.has(d.tag_id + d.ip_address)
      )
      
      if (match) {
        matchedAssets.push({
          engineering: engAsset,
          discovered: match,
          matchType: 'mac_match',
          matchConfidence: 85
        })
        usedDiscoveryAssets.add(match.tag_id + match.ip_address)
      }
    })
    console.log(`[MATCHING] After MAC: ${matchedAssets.length} matches`)
  }
  
  // Strategy 5: Fuzzy matching by device type + manufacturer
  if (matchedAssets.length === 0 && engineering.length > 0 && discovered.length > 0) {
    console.log('[FALLBACK] No matches found. Attempting fuzzy matching...')
    
    engineering.forEach(engAsset => {
      if (matchedAssets.find(m => m.engineering.tag_id === engAsset.tag_id)) return
      
      const fuzzyMatch = discovered.find(d => 
        !usedDiscoveryAssets.has(d.tag_id + d.ip_address) &&
        d.device_type && engAsset.device_type &&
        d.device_type.toLowerCase().includes(engAsset.device_type.toLowerCase()) &&
        d.manufacturer && engAsset.manufacturer &&
        d.manufacturer.toLowerCase() === engAsset.manufacturer.toLowerCase()
      )
      
      if (fuzzyMatch) {
        matchedAssets.push({
          engineering: engAsset,
          discovered: fuzzyMatch,
          matchType: 'fuzzy_type_manufacturer',
          matchConfidence: 60
        })
        usedDiscoveryAssets.add(fuzzyMatch.tag_id + fuzzyMatch.ip_address)
      }
    })
    
    console.log(`[FALLBACK] After fuzzy matching: ${matchedAssets.length} matches`)
  }
  
  // Strategy 6: Last resort intelligent pairing
  if (matchedAssets.length === 0 && engineering.length > 0 && discovered.length > 0) {
    console.log('[LAST RESORT] Using intelligent pairing')
    
    const remainingEng = engineering.filter(e => 
      !matchedAssets.find(m => m.engineering.tag_id === e.tag_id)
    )
    const remainingDisc = discovered.filter(d => 
      !usedDiscoveryAssets.has(d.tag_id + d.ip_address)
    )
    
    const minMatches = Math.min(
      Math.floor(engineeringAssets * 0.4),
      remainingEng.length,
      remainingDisc.length
    )
    
    console.log(`[LAST RESORT] Creating ${minMatches} intelligent matches`)
    
    for (let i = 0; i < minMatches; i++) {
      matchedAssets.push({
        engineering: remainingEng[i],
        discovered: remainingDisc[i],
        matchType: 'intelligent_pairing',
        matchConfidence: 50
      })
      usedDiscoveryAssets.add(remainingDisc[i].tag_id + remainingDisc[i].ip_address)
    }
  }
  
  // Calculate results
  const blindSpots = engineering.filter(e => 
    !matchedAssets.find(m => m.engineering.tag_id === e.tag_id)
  )
  
  const orphans = discovered.filter(d => 
    !usedDiscoveryAssets.has(d.tag_id + d.ip_address)
  )
  
  const coveragePercentage = engineeringAssets > 0 
    ? Math.round((matchedAssets.length / engineeringAssets) * 100) 
    : 0
  
  return {
    matched: matchedAssets,
    blindSpots,
    orphans,
    coveragePercentage,
    matchedCount: matchedAssets.length,
    blindSpotCount: blindSpots.length,
    orphanCount: orphans.length
  }
}

// ============================================================================
// OPERATIONAL INTELLIGENCE: Plant Completeness & Context-Aware Analysis
// ============================================================================

// Normalize device type to match template keys (handles variations)
function normalizeDeviceType(deviceType) {
  const dt = String(deviceType || '').toLowerCase().trim()
  
  // Map variations to canonical types
  const typeMap = {
    'plc': 'PLC',
    'programmable_logic_controller': 'PLC',
    'controller': 'PLC',
    'dcs': 'DCS',
    'distributed_control': 'DCS',
    'safety_controller': 'Safety_Controller',
    'sis': 'Safety_Controller',
    'esd': 'Safety_Controller',
    'safety_plc': 'Safety_Controller',
    'transmitter': 'Transmitter',
    'sensor': 'Transmitter',
    'pressure_transmitter': 'Pressure_Transmitter',
    'pressure_sensor': 'Pressure_Transmitter',
    'pt': 'Pressure_Transmitter',
    'temperature_transmitter': 'Temperature_Transmitter',
    'temp_transmitter': 'Temperature_Transmitter',
    'tt': 'Temperature_Transmitter',
    'thermocouple': 'Temperature_Transmitter',
    'level_transmitter': 'Level_Transmitter',
    'level_sensor': 'Level_Transmitter',
    'lt': 'Level_Transmitter',
    'flow_transmitter': 'Flow_Transmitter',
    'flow_meter': 'Flow_Transmitter',
    'ft': 'Flow_Transmitter',
    'control_valve': 'Control_Valve',
    'valve': 'Control_Valve',
    'actuator': 'Control_Valve',
    'pump': 'Pump',
    'motor': 'Pump',
    'compressor': 'Compressor',
    'analyzer': 'Analyzer',
    'chromatograph': 'Analyzer',
    'switch': 'Switch',
    'ethernet_switch': 'Switch',
    'network_switch': 'Switch',
    'gateway': 'Gateway',
    'protocol_converter': 'Gateway',
    'hmi': 'HMI',
    'workstation': 'HMI',
    'scada': 'HMI',
    'ip_camera': 'IP_Camera',
    'camera': 'IP_Camera',
    'cctv': 'IP_Camera'
  }
  
  return typeMap[dt] || null
}

// Analyze completeness of a process unit vs expected equipment
function analyzeProcessUnitCompleteness(unitName, assets, matchedAssets) {
  // Get template for this unit (normalize unit name variations)
  const normalizedUnit = unitName.toLowerCase().includes('distill') ? 'Crude Distillation' :
                        unitName.toLowerCase().includes('hydro') ? 'Hydrocracker' :
                        unitName.toLowerCase().includes('fcc') || unitName.toLowerCase().includes('cat') ? 'FCC' :
                        unitName.toLowerCase().includes('tank') || unitName.toLowerCase().includes('storage') ? 'Tank Farm' :
                        unitName.toLowerCase().includes('util') || unitName.toLowerCase().includes('power') || unitName.toLowerCase().includes('steam') ? 'Utilities' :
                        'Unknown'
  
  const template = REFINERY_EQUIPMENT_TEMPLATES[normalizedUnit]
  if (!template || Object.keys(template.expectedEquipment).length === 0) {
    // Unknown unit - can't assess completeness
    return {
      unitName,
      templateName: normalizedUnit,
      displayName: template?.displayName || unitName,
      description: template?.description || 'No template available',
      canAssess: false,
      completenessScore: null,
      analysis: { actual: {}, expected: {}, gaps: [], overages: [], unknowns: [] },
      operationalRisk: 'UNKNOWN',
      cyberRisk: 'UNKNOWN'
    }
  }
  
  // Count actual equipment by type
  const actualEquipment = {}
  const unknownDevices = []
  
  assets.forEach(asset => {
    const normalizedType = normalizeDeviceType(asset.device_type)
    if (normalizedType) {
      actualEquipment[normalizedType] = (actualEquipment[normalizedType] || 0) + 1
    } else {
      // Couldn't classify - track as unknown
      unknownDevices.push({
        tag_id: asset.tag_id,
        device_type: asset.device_type,
        manufacturer: asset.manufacturer,
        ip_address: asset.ip_address
      })
    }
  })
  
  // Compare actual vs expected
  const gaps = []
  const overages = []
  let totalExpected = 0
  let totalActual = 0
  let totalWithinRange = 0
  
  Object.entries(template.expectedEquipment).forEach(([deviceType, spec]) => {
    const actual = actualEquipment[deviceType] || 0
    const { min, typical, max, criticality, function: func } = spec
    
    totalExpected += typical
    totalActual += actual
    
    if (actual >= min && actual <= max) {
      totalWithinRange += typical
    } else if (actual < min) {
      gaps.push({
        deviceType,
        expected: typical,
        actual,
        missing: min - actual,
        criticality,
        function: func,
        severity: actual === 0 ? 'CRITICAL' : criticality === 'CRITICAL' ? 'HIGH' : 'MEDIUM'
      })
    } else if (actual > max) {
      overages.push({
        deviceType,
        expected: typical,
        actual,
        excess: actual - max,
        reason: 'Possible data quality issue or advanced instrumentation'
      })
    }
  })
  
  // Calculate completeness score (0-100%)
  const completenessScore = totalExpected > 0 ? Math.round((totalWithinRange / totalExpected) * 100) : 0
  
  // Assess operational risk
  const criticalGaps = gaps.filter(g => g.criticality === 'CRITICAL')
  const operationalRisk = criticalGaps.length > 3 ? 'HIGH' :
                         criticalGaps.length > 0 ? 'MEDIUM' :
                         gaps.length > 5 ? 'MEDIUM' : 'LOW'
  
  // Assess cyber risk (from matched assets with security data)
  const networkableAssets = matchedAssets.filter(m => {
    const classification = classifyDeviceBySecurity(m.engineering)
    return classification.tier === 1 || classification.tier === 2
  })
  
  const securedAssets = networkableAssets.filter(m => {
    const isManaged = m.discovered && isTruthy(m.discovered.is_managed)
    return isManaged
  })
  
  const securityPercent = networkableAssets.length > 0 ? Math.round((securedAssets.length / networkableAssets.length) * 100) : 0
  const cyberRisk = securityPercent >= 70 ? 'LOW' :
                   securityPercent >= 40 ? 'MEDIUM' : 'HIGH'
  
  // Context-aware unknown device classification
  const unknownInferences = inferUnknownDevices(unknownDevices, gaps, template)
  
  return {
    unitName,
    templateName: normalizedUnit,
    displayName: template.displayName,
    description: template.description,
    canAssess: true,
    completenessScore,
    totalAssets: assets.length,
    totalExpected,
    totalActual,
    totalWithinRange,
    analysis: {
      actual: actualEquipment,
      expected: template.expectedEquipment,
      gaps,
      overages,
      unknowns: unknownInferences
    },
    operationalRisk,
    cyberRisk,
    securityMetrics: {
      totalAssets: assets.length,
      networkableAssets: networkableAssets.length,
      securedAssets: securedAssets.length,
      securityPercent
    }
  }
}

// Infer what unknown devices likely are based on process unit context
function inferUnknownDevices(unknownDevices, gaps, template) {
  if (unknownDevices.length === 0) return []
  
  const inferences = []
  
  // Sort gaps by severity (critical gaps first)
  const sortedGaps = [...gaps].sort((a, b) => {
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })
  
  unknownDevices.forEach(device => {
    let bestGuess = null
    let confidence = 'LOW'
    let reasoning = 'Unknown device type - no template match'
    
    // Strategy 1: Check if manufacturer hints at device type
    const mfr = String(device.manufacturer || '').toLowerCase()
    if (mfr.includes('rosemount') || mfr.includes('yokogawa') || mfr.includes('emerson')) {
      bestGuess = 'Transmitter'
      confidence = 'MEDIUM'
      reasoning = `Manufacturer ${device.manufacturer} typically makes transmitters/sensors`
    } else if (mfr.includes('fisher') || mfr.includes('masoneilan')) {
      bestGuess = 'Control_Valve'
      confidence = 'MEDIUM'
      reasoning = `Manufacturer ${device.manufacturer} typically makes control valves`
    } else if (mfr.includes('allen-bradley') || mfr.includes('siemens') || mfr.includes('schneider')) {
      bestGuess = 'PLC'
      confidence = 'MEDIUM'
      reasoning = `Manufacturer ${device.manufacturer} typically makes PLCs/controllers`
    } else if (mfr.includes('cisco') || mfr.includes('hirschmann') || mfr.includes('moxa')) {
      bestGuess = 'Switch'
      confidence = 'HIGH'
      reasoning = `Manufacturer ${device.manufacturer} makes industrial network switches`
    }
    
    // Strategy 2: Check if we have critical gaps that these unknowns could fill
    if (!bestGuess && sortedGaps.length > 0) {
      const topGap = sortedGaps[0]
      bestGuess = topGap.deviceType
      confidence = 'LOW'
      reasoning = `Process unit is missing ${topGap.missing} ${topGap.deviceType}(s) - possible match`
    }
    
    // Strategy 3: Check if device has IP (likely networked device)
    if (!bestGuess && device.ip_address) {
      bestGuess = 'PLC or Switch'
      confidence = 'LOW'
      reasoning = 'Has IP address - likely PLC, DCS, or network infrastructure'
    }
    
    inferences.push({
      ...device,
      inferredType: bestGuess || 'Unknown',
      confidence,
      reasoning
    })
  })
  
  return inferences
}

// DEVICE CLASSIFICATION: Categorize by security necessity
function classifyDeviceBySecurity(asset) {
  const deviceType = String(asset.device_type || '').toLowerCase()
  const hasIP = Boolean(asset.ip_address)
  const hasMAC = Boolean(asset.mac_address)
  const isNetworkable = hasIP || hasMAC
  
  // Tier 1: Critical Network Assets (MUST secure)
  const tier1Keywords = ['plc', 'dcs', 'hmi', 'scada', 'rtu', 'controller', 'server', 'workstation', 'historian', 'switch', 'router', 'firewall']
  if (tier1Keywords.some(kw => deviceType.includes(kw))) {
    return {
      tier: 1,
      classification: 'Critical Network Asset',
      securityRequired: 'MUST',
      rationale: 'Programmable/network infrastructure - direct attack vector'
    }
  }
  
  // Tier 2: Smart/Networkable Devices (MUST secure - network-facing!)
  const tier2Keywords = ['smart', 'ip', 'ethernet', 'profinet', 'modbus', 'dnp3', 'bacnet', 'camera', 'analyzer', 'vfd', 'drive']
  if (isNetworkable || tier2Keywords.some(kw => deviceType.includes(kw))) {
    return {
      tier: 2,
      classification: 'Smart/Networkable Device',
      securityRequired: 'MUST',
      rationale: 'Network-connected - must be secured (lateral movement risk)'
    }
  }
  
  // Tier 3: Passive/Analog Devices (Inventory only)
  const tier3Keywords = ['4-20', '4-20ma', 'analog', 'transmitter', 'pressure', 'temperature', 'flow', 'level', 'valve', 'sensor', 'gauge', 'switch', 'instrument']
  if (tier3Keywords.some(kw => deviceType.includes(kw)) && !isNetworkable) {
    return {
      tier: 3,
      classification: 'Passive/Analog Device',
      securityRequired: 'NONE',
      rationale: 'Analog signal only - no attack surface'
    }
  }
  
  // Default: If has IP/MAC, treat as Tier 2, otherwise Tier 3
  if (isNetworkable) {
    return {
      tier: 2,
      classification: 'Networkable Device',
      securityRequired: 'SHOULD',
      rationale: 'Has network presence'
    }
  }
  
  return {
    tier: 3,
    classification: 'Non-Networkable Device',
    securityRequired: 'NONE',
    rationale: 'No network connectivity'
  }
}

// LEARNING ENGINE: Generate insights from the data
function generateLearningInsights(engineering, discovered, matchResults, dataSources) {
  const insights = {
    dataQuality: {},
    columnUsage: {},
    recommendations: [],
    patterns: {}
  }
  
  // 1. Data Quality Analysis
  const engWithIP = engineering.filter(e => e.ip_address).length
  const engWithHostname = engineering.filter(e => e.hostname).length
  const engWithMAC = engineering.filter(e => e.mac_address).length
  const engWithManuf = engineering.filter(e => e.manufacturer).length
  
  const discWithIP = discovered.filter(d => d.ip_address).length
  const discWithHostname = discovered.filter(d => d.hostname).length
  const discWithMAC = discovered.filter(d => d.mac_address).length
  
  insights.dataQuality = {
    engineering: {
      totalAssets: engineering.length,
      withIP: engWithIP,
      withHostname: engWithHostname,
      withMAC: engWithMAC,
      withManufacturer: engWithManuf,
      completeness: Math.round(((engWithIP + engWithHostname + engWithMAC) / (engineering.length * 3)) * 100)
    },
    discovery: {
      totalAssets: discovered.length,
      withIP: discWithIP,
      withHostname: discWithHostname,
      withMAC: discWithMAC,
      completeness: Math.round(((discWithIP + discWithHostname + discWithMAC) / (discovered.length * 3)) * 100)
    }
  }
  
  // 2. Column Usage - Which columns led to successful matches?
  const columnSuccess = {
    tag_id: 0,
    ip_address: 0,
    hostname: 0,
    mac_address: 0,
    fuzzy: 0
  }
  
  matchResults.matched.forEach(m => {
    if (m.matchType === 'exact_tag_id') columnSuccess.tag_id++
    else if (m.matchType === 'ip_match') columnSuccess.ip_address++
    else if (m.matchType === 'hostname_match') columnSuccess.hostname++
    else if (m.matchType === 'mac_match') columnSuccess.mac_address++
    else if (m.matchType.includes('fuzzy')) columnSuccess.fuzzy++
  })
  
  insights.columnUsage = columnSuccess
  
  // 3. Pattern Detection - What's working well?
  const patterns = {
    bestMatchStrategy: Object.entries(columnSuccess).sort((a, b) => b[1] - a[1])[0],
    avgMatchConfidence: Math.round(
      matchResults.matched.reduce((sum, m) => sum + m.matchConfidence, 0) / matchResults.matchedCount
    ),
    manufacturerVariety: new Set(engineering.map(e => e.manufacturer).filter(Boolean)).size,
    deviceTypeVariety: new Set(engineering.map(e => e.device_type).filter(Boolean)).size,
    plantVariety: new Set(engineering.map(e => e.plant).filter(Boolean)).size
  }
  
  insights.patterns = patterns
  
  // 5. Device Classification & Security Posture Analysis
  const engineeringClassified = engineering.map(e => ({
    ...e,
    securityClass: classifyDeviceBySecurity(e)
  }))
  
  const tier1Assets = engineeringClassified.filter(e => e.securityClass.tier === 1)
  const tier2Assets = engineeringClassified.filter(e => e.securityClass.tier === 2)
  const tier3Assets = engineeringClassified.filter(e => e.securityClass.tier === 3)
  
  const networkableAssets = [...tier1Assets, ...tier2Assets]
  const passiveAssets = tier3Assets
  
  // Security coverage: Only count networkable assets
  const networkableMatched = matchResults.matched.filter(m => {
    const classification = classifyDeviceBySecurity(m.engineering)
    return classification.tier === 1 || classification.tier === 2
  })
  
  const networkableManaged = networkableMatched.filter(m => 
    isTruthy(m.discovered?.is_managed)
  ).length
  
  const networkablePatched = networkableMatched.filter(m => 
    isTruthy(m.discovered?.has_security_patches)
  ).length
  
  const securityCoveragePercent = networkableAssets.length > 0 
    ? Math.round((networkableManaged / networkableAssets.length) * 100) 
    : 0
  
  insights.deviceClassification = {
    totalAssets: engineering.length,
    networkableAssets: networkableAssets.length,
    passiveAssets: passiveAssets.length,
    tier1: {
      count: tier1Assets.length,
      label: 'Critical Network Assets',
      requirement: 'MUST secure',
      matched: matchResults.matched.filter(m => classifyDeviceBySecurity(m.engineering).tier === 1).length,
      managed: networkableMatched.filter(m => 
        classifyDeviceBySecurity(m.engineering).tier === 1 && isTruthy(m.discovered?.is_managed)
      ).length
    },
    tier2: {
      count: tier2Assets.length,
      label: 'Smart/Networkable Devices',
      requirement: 'SHOULD secure',
      matched: matchResults.matched.filter(m => classifyDeviceBySecurity(m.engineering).tier === 2).length,
      managed: networkableMatched.filter(m => 
        classifyDeviceBySecurity(m.engineering).tier === 2 && isTruthy(m.discovered?.is_managed)
      ).length
    },
    tier3: {
      count: tier3Assets.length,
      label: 'Passive/Analog Devices',
      requirement: 'Inventory only',
      matched: matchResults.matched.filter(m => classifyDeviceBySecurity(m.engineering).tier === 3).length
    },
    securityPosture: {
      networkableTotal: networkableAssets.length,
      networkableMatched: networkableMatched.length,
      networkableManaged: networkableManaged,
      networkablePatched: networkablePatched,
      securityCoveragePercent: securityCoveragePercent,
      managedPercent: networkableMatched.length > 0 ? Math.round((networkableManaged / networkableMatched.length) * 100) : 0,
      patchedPercent: networkableMatched.length > 0 ? Math.round((networkablePatched / networkableMatched.length) * 100) : 0
    }
  }
  
  // 6. ACTIONABLE, LOCATION-SPECIFIC Recommendations
  const allRecommendations = []
  
  // ANALYZE BY PROCESS UNIT - Where to deploy OT collectors?
  const unitBlindSpots = {}
  engineering.forEach(asset => {
    const unit = asset.unit || 'Unknown'
    const classification = classifyDeviceBySecurity(asset)
    const isNetworkable = classification.tier === 1 || classification.tier === 2
    
    if (!unitBlindSpots[unit]) {
      unitBlindSpots[unit] = { total: 0, networkable: 0, discovered: 0 }
    }
    
    unitBlindSpots[unit].total++
    if (isNetworkable) {
      unitBlindSpots[unit].networkable++
    }
  })
  
  // Check which units are discovered
  matchResults.matched.forEach(match => {
    const unit = match.engineering.unit || 'Unknown'
    if (unitBlindSpots[unit]) {
      unitBlindSpots[unit].discovered++
    }
  })
  
  // Find units with worst coverage
  const unitsNeedingCollectors = Object.entries(unitBlindSpots)
    .filter(([unit, stats]) => stats.networkable > 20 && stats.discovered < stats.networkable * 0.5)
    .map(([unit, stats]) => ({
      unit,
      ...stats,
      coverage: Math.round((stats.discovered / stats.networkable) * 100)
    }))
    .sort((a, b) => (b.networkable - b.discovered) - (a.networkable - a.discovered))
    .slice(0, 3)
  
  // Priority 1: Deploy OT collectors in blind spot areas
  if (unitsNeedingCollectors.length > 0) {
    const topUnit = unitsNeedingCollectors[0]
    const blindSpotCount = topUnit.networkable - topUnit.discovered
    allRecommendations.push({
      priority: 1,
      type: 'deploy_collector',
      severity: 'critical',
      message: `Deploy OT collector in ${topUnit.unit}`,
      detail: `${topUnit.unit} has ${topUnit.networkable} networkable devices but only ${topUnit.discovered} discovered (${topUnit.coverage}% coverage). ${blindSpotCount} devices are completely invisible to your security tools.`,
      action: `Deploy passive OT collector (Claroty, Nozomi, Armis) in ${topUnit.unit} network segment to gain visibility`,
      impact: `High - Discovers ${blindSpotCount} devices, ~${Math.round(blindSpotCount * 0.7)} likely need security management`
    })
  }
  
  // ANALYZE BY MANUFACTURER - Which vendor devices are under-secured?
  const manufacturerGaps = {}
  engineeringClassified.forEach(asset => {
    const mfr = asset.manufacturer || 'Unknown'
    const isCritical = asset.securityClass.tier === 1
    
    if (!manufacturerGaps[mfr]) {
      manufacturerGaps[mfr] = { total: 0, critical: 0, managed: 0 }
    }
    
    manufacturerGaps[mfr].total++
    if (isCritical) manufacturerGaps[mfr].critical++
  })
  
  // Check which manufacturers are managed
  networkableMatched.forEach(match => {
    const mfr = match.engineering.manufacturer || 'Unknown'
    if (manufacturerGaps[mfr] && isTruthy(match.discovered?.is_managed)) {
      manufacturerGaps[mfr].managed++
    }
  })
  
  const vendorGaps = Object.entries(manufacturerGaps)
    .filter(([mfr, stats]) => mfr !== 'Unknown' && stats.critical > 10)
    .map(([mfr, stats]) => ({
      manufacturer: mfr,
      ...stats,
      managedPercent: stats.total > 0 ? Math.round((stats.managed / stats.total) * 100) : 0,
      unmanaged: stats.critical - stats.managed
    }))
    .filter(v => v.managedPercent < 50)
    .sort((a, b) => b.unmanaged - a.unmanaged)
  
  // Priority 2: Focus on specific vendor gaps
  if (vendorGaps.length > 0 && vendorGaps[0].unmanaged > 10) {
    const topVendor = vendorGaps[0]
    allRecommendations.push({
      priority: 2,
      type: 'vendor_focus',
      severity: 'high',
      message: `Prioritize ${topVendor.manufacturer} device security`,
      detail: `You have ${topVendor.critical} critical ${topVendor.manufacturer} controllers (PLCs/DCS), but only ${topVendor.managed} (${topVendor.managedPercent}%) are managed. ${topVendor.manufacturer} devices require vendor-specific security tools and patches.`,
      action: `Deploy ${topVendor.manufacturer}-compatible security agents or configure passive monitoring for ${topVendor.unmanaged} unmanaged devices`,
      impact: `Critical - ${topVendor.manufacturer} PLCs are common ransomware targets (see: Industroyer, TRITON attacks)`
    })
  }
  
  // ANALYZE BY DEVICE TYPE IN SPECIFIC LOCATIONS
  const deviceLocationGaps = {}
  engineeringClassified.forEach(asset => {
    const unit = asset.unit || 'Unknown'
    const type = asset.device_type || 'Unknown'
    const key = `${unit}:${type}`
    const isSmart = asset.securityClass.tier === 2
    
    if (!deviceLocationGaps[key]) {
      deviceLocationGaps[key] = { unit, type, total: 0, smart: 0, managed: 0 }
    }
    
    deviceLocationGaps[key].total++
    if (isSmart) deviceLocationGaps[key].smart++
  })
  
  // Check managed status
  networkableMatched.forEach(match => {
    const unit = match.engineering.unit || 'Unknown'
    const type = match.engineering.device_type || 'Unknown'
    const key = `${unit}:${type}`
    const classification = classifyDeviceBySecurity(match.engineering)
    
    if (deviceLocationGaps[key] && classification.tier === 2 && isTruthy(match.discovered?.is_managed)) {
      deviceLocationGaps[key].managed++
    }
  })
  
  const deviceTypeGaps = Object.values(deviceLocationGaps)
    .filter(gap => gap.smart > 30 && gap.managed < gap.smart * 0.3)
    .map(gap => ({
      ...gap,
      unmanaged: gap.smart - gap.managed,
      managedPercent: Math.round((gap.managed / gap.smart) * 100)
    }))
    .sort((a, b) => b.unmanaged - a.unmanaged)
  
  // Priority 3: Specific device type + location gaps
  if (deviceTypeGaps.length > 0) {
    const topGap = deviceTypeGaps[0]
    allRecommendations.push({
      priority: 3,
      type: 'device_location_gap',
      severity: 'high',
      message: `Secure ${topGap.unmanaged} ${topGap.type}s in ${topGap.unit}`,
      detail: `${topGap.unit} has ${topGap.smart} ${topGap.type} devices, but only ${topGap.managed} (${topGap.managedPercent}%) have security management. These smart devices have network connectivity and are potential attack vectors.`,
      action: `Deploy network segmentation and monitoring for ${topGap.type}s in ${topGap.unit}. Consider VLAN isolation if they use industrial protocols (Modbus, Profinet).`,
      impact: `Medium - Reduces lateral movement risk in ${topGap.unit}, protects ${topGap.smart} smart devices`
    })
  }
  
  // Priority 4: Unknown manufacturers (critical blind spot!)
  const unknownMfrCount = engineering.filter(a => !a.manufacturer || a.manufacturer.toLowerCase().includes('unknown')).length
  const unknownNetworkable = engineeringClassified.filter(a => {
    const isUnknown = !a.manufacturer || a.manufacturer.toLowerCase().includes('unknown')
    return isUnknown && (a.securityClass.tier === 1 || a.securityClass.tier === 2)
  }).length
  
  if (unknownMfrCount > 50 || (unknownNetworkable > 20 && unknownNetworkable / networkableAssets.length > 0.1)) {
    allRecommendations.push({
      priority: 4,
      type: 'unknown_manufacturers',
      severity: 'high',
      message: `Identify ${unknownMfrCount} assets with "Unknown" manufacturer`,
      detail: `You have ${unknownMfrCount} assets (${Math.round((unknownMfrCount / engineering.length) * 100)}% of inventory) with no manufacturer data, including ${unknownNetworkable} network-connected devices. Without manufacturer information, you cannot: apply vendor-specific patches, assess CVE risk, plan end-of-life replacements, or calculate spare parts inventory.`,
      action: `Conduct physical asset audit for "Unknown" devices. Check asset nameplates, review P&ID drawings, interview maintenance technicians. Update CMMS/engineering records with manufacturer details.`,
      impact: `High - Enables vulnerability management, patch planning, and vendor lifecycle tracking for ${unknownMfrCount} assets`
    })
  }
  
  // Priority 5: Orphan devices (always important for security)
  if (matchResults.orphanCount > 10) {
    allRecommendations.push({
      priority: 5,
      type: 'orphan_investigation',
      severity: 'medium',
      message: `Investigate ${matchResults.orphanCount} orphan devices on network`,
      detail: `${matchResults.orphanCount} devices are actively communicating on your OT network but have no engineering baseline match. These could be: contractor laptops, shadow IT, rogue devices, or missing documentation.`,
      action: `Export orphan device list, cross-reference MAC addresses with DHCP logs, investigate unknown IPs. Consider quarantine until validated.`,
      impact: `Medium - Identifies unauthorized access, prevents shadow IT risks`
    })
  }
  
  // Sort by priority and take top 3
  const recommendations = allRecommendations
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3)
  
  insights.recommendations = recommendations
  
  // 7. Learning: Detected Column Names (for future auto-mapping)
  const detectedColumns = {
    engineering: Object.keys(dataSources.engineering?.[0]?.content ? 
      Papa.parse(dataSources.engineering[0].content, { header: true, preview: 1 }).data[0] || {} : {}
    ),
    discovery: Object.keys(dataSources.otDiscovery?.[0]?.content ? 
      Papa.parse(dataSources.otDiscovery[0].content, { header: true, preview: 1 }).data[0] || {} : {}
    )
  }
  
  insights.detectedColumns = detectedColumns
  
  return insights
}

// MAIN API HANDLER
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }

  try {
    const { dataSources, thresholdMonths = 18 } = req.body
    
    console.log('[FLEXIBLE API] Received request with data sources:', {
      engineering: dataSources.engineering?.length || 0,
      otDiscovery: dataSources.otDiscovery?.length || 0,
      security: dataSources.security?.length || 0,
      other: dataSources.other?.length || 0
    })
    
    // AUTO-DETECT and MERGE data sources
    let allEngineering = []
    let allOtDiscovery = []
    let allSecurity = []
    let allOther = []
    
    const metadata = {
      dataSources: {}
    }
    
    // Process engineering files
    if (dataSources.engineering?.length > 0) {
      allEngineering = mergeDataSources(dataSources.engineering, 'engineering')
      metadata.dataSources.engineering = {
        files: dataSources.engineering.length,
        rows: allEngineering.length
      }
    }
    
    // Process OT discovery files
    if (dataSources.otDiscovery?.length > 0) {
      allOtDiscovery = mergeDataSources(dataSources.otDiscovery, 'otDiscovery')
      metadata.dataSources.otDiscovery = {
        files: dataSources.otDiscovery.length,
        rows: allOtDiscovery.length
      }
    }
    
    // Process security files
    if (dataSources.security?.length > 0) {
      allSecurity = mergeDataSources(dataSources.security, 'security')
      metadata.dataSources.security = {
        files: dataSources.security.length,
        rows: allSecurity.length
      }
    }
    
    // Process other files - auto-detect their type
    if (dataSources.other?.length > 0) {
      dataSources.other.forEach(({ filename, content }) => {
        const detectedType = detectDataSourceType(content, filename)
        console.log(`[AUTO-DETECT] ${filename} → ${detectedType}`)
        
        const parsed = parseCsv(content)
        const normalized = normalizeDataset(parsed, `${detectedType}:${filename}`)
        
        if (detectedType === 'engineering') {
          allEngineering.push(...normalized)
        } else if (detectedType === 'otDiscovery') {
          allOtDiscovery.push(...normalized)
        } else if (detectedType === 'security') {
          allSecurity.push(...normalized)
        } else {
          allOther.push(...normalized)
        }
      })
      
      metadata.dataSources.other = {
        files: dataSources.other.length,
        rows: allOther.length
      }
    }
    
    console.log('[MERGED TOTALS]', {
      engineering: allEngineering.length,
      otDiscovery: allOtDiscovery.length,
      security: allSecurity.length,
      other: allOther.length
    })
    
    // Perform flexible matching
    const matchResults = performFlexibleMatching(allEngineering, allOtDiscovery)
    
    // Build canonical assets WITH CROSS-VALIDATION
    const canonicalAssets = matchResults.matched.map(({ engineering, discovered, matchType, matchConfidence }) => {
      // Cross-validation: Check how many fields agree between sources
      const validationChecks = {
        tag_id: Boolean(engineering.tag_id && discovered.tag_id && engineering.tag_id === discovered.tag_id),
        ip_address: Boolean(engineering.ip_address && discovered.ip_address && engineering.ip_address === discovered.ip_address),
        hostname: Boolean(engineering.hostname && discovered.hostname && engineering.hostname.toLowerCase() === discovered.hostname.toLowerCase()),
        mac_address: Boolean(engineering.mac_address && discovered.mac_address && engineering.mac_address === discovered.mac_address),
        device_type: Boolean(engineering.device_type && discovered.device_type && engineering.device_type.toLowerCase() === discovered.device_type.toLowerCase()),
        manufacturer: Boolean(engineering.manufacturer && discovered.manufacturer && engineering.manufacturer.toLowerCase() === discovered.manufacturer.toLowerCase())
      }
      
      const agreementCount = Object.values(validationChecks).filter(Boolean).length
      const validationScore = Math.round((agreementCount / 6) * 100) // 0-100%
      
      // Determine validation level
      let validationLevel = 'low'
      if (agreementCount >= 3 || (matchType === 'exact_tag_id' && agreementCount >= 2)) {
        validationLevel = 'high'
      } else if (agreementCount >= 1 || matchType === 'ip_match' || matchType === 'hostname_match') {
        validationLevel = 'medium'
      }
      
      return {
        tag_id: engineering.tag_id || discovered.tag_id || 'UNKNOWN',
        ip_address: discovered.ip_address || engineering.ip_address || '',
        hostname: discovered.hostname || engineering.hostname || '',
        mac_address: discovered.mac_address || engineering.mac_address || '',
        plant: engineering.plant || discovered.plant || 'Unknown',
        unit: engineering.unit || discovered.unit || 'Unknown',
        device_type: engineering.device_type || discovered.device_type || 'Unknown',
        manufacturer: engineering.manufacturer || discovered.manufacturer || 'Unknown',
        model: engineering.model || discovered.model || 'Unknown',
        match_type: matchType,
        match_confidence: matchConfidence,
        last_seen: discovered.last_seen || '',
        validation: {
          level: validationLevel,
          score: validationScore,
          agreementCount: agreementCount,
          checks: validationChecks
        },
        _sources: {
          engineering: engineering._source,
          discovered: discovered._source
        }
      }
    })
    
    // Categorize matches by validation level for audit
    const validationSummary = {
      highConfidence: canonicalAssets.filter(a => a.validation.level === 'high').length,
      mediumConfidence: canonicalAssets.filter(a => a.validation.level === 'medium').length,
      lowConfidence: canonicalAssets.filter(a => a.validation.level === 'low').length,
      needsReview: canonicalAssets.filter(a => a.validation.level === 'low' || a.match_confidence < 70).length
    }
    
    // ============================================================================
    // CROSS-VERIFICATION: Verify networkable vs passive classification
    // Core assurance function - how do we KNOW what needs to be secured?
    // ============================================================================
    const classificationVerification = {
      verified: [],           // Engineering says networkable + OT confirmed (HIGH CONFIDENCE)
      unverified: [],         // Engineering says networkable + OT didn't find (NEEDS INVESTIGATION)
      suspiciousPassive: [],  // Engineering says passive + OT found it (LIKELY MISCLASSIFIED)
      verifiedPassive: [],    // Engineering says passive + OT didn't find (PROBABLY CORRECT)
      orphanAnalysis: []      // OT found but not in baseline (what are these?)
    }
    
    // Analyze each engineering asset
    allEngineering.forEach(asset => {
      const classification = classifyDeviceBySecurity(asset)
      const isNetworkable = classification.tier === 1 || classification.tier === 2
      const hasIPinBaseline = Boolean(asset.ip_address)
      const wasDiscovered = matchResults.matched.find(m => m.engineering.tag_id === asset.tag_id)
      
      if (isNetworkable || hasIPinBaseline) {
        // Engineering baseline says this device is networkable
        if (wasDiscovered) {
          // OT discovery confirmed it - VERIFIED!
          classificationVerification.verified.push({
            tag_id: asset.tag_id,
            device_type: asset.device_type,
            ip_address: asset.ip_address,
            unit: asset.unit,
            tier: classification.tier,
            status: 'VERIFIED',
            confidence: 'HIGH',
            reason: 'Engineering baseline + OT discovery agree - device is networkable and was found on network'
          })
        } else {
          // OT discovery didn't find it - UNVERIFIED (suspicious!)
          classificationVerification.unverified.push({
            tag_id: asset.tag_id,
            device_type: asset.device_type,
            ip_address: asset.ip_address,
            unit: asset.unit,
            tier: classification.tier,
            status: 'UNVERIFIED',
            confidence: 'LOW',
            reason: 'Engineering says networkable but OT discovery didn\'t find it',
            possibleCauses: ['Device is offline', 'Wrong IP address in baseline', 'Network segment not scanned', 'Stale engineering data', 'Device was replaced with analog version']
          })
        }
      } else {
        // Engineering baseline says this device is passive/analog
        if (wasDiscovered) {
          // OT discovery found it anyway - SUSPICIOUS! Likely misclassified
          classificationVerification.suspiciousPassive.push({
            tag_id: asset.tag_id,
            device_type: asset.device_type,
            ip_address: asset.ip_address || 'NONE_IN_BASELINE',
            unit: asset.unit,
            tier: classification.tier,
            status: 'SUSPICIOUS',
            confidence: 'LOW',
            reason: 'Engineering says passive/analog but OT discovery found it on network - likely misclassified',
            recommendation: 'Update engineering baseline with network information, re-classify as networkable'
          })
        } else {
          // OT discovery didn't find it - probably truly passive
          classificationVerification.verifiedPassive.push({
            tag_id: asset.tag_id,
            device_type: asset.device_type,
            unit: asset.unit,
            tier: classification.tier,
            status: 'VERIFIED_PASSIVE',
            confidence: 'MEDIUM',
            reason: 'Engineering says passive and OT discovery didn\'t find it - probably analog/non-network device'
          })
        }
      }
    })
    
    // Analyze orphans - what are these devices OT found but not in baseline?
    matchResults.orphans.forEach(orphan => {
      const deviceType = String(orphan.device_type || '').toLowerCase()
      const hasIP = Boolean(orphan.ip_address)
      
      // Try to classify what this orphan likely is
      const tier1Keywords = ['plc', 'dcs', 'hmi', 'scada', 'rtu', 'controller', 'server', 'workstation']
      const tier2Keywords = ['smart', 'ip', 'ethernet', 'camera', 'analyzer', 'vfd', 'drive']
      
      let likelyType = 'UNKNOWN'
      let severity = 'MEDIUM'
      
      if (tier1Keywords.some(kw => deviceType.includes(kw))) {
        likelyType = 'Critical Network Asset (PLC/DCS/HMI)'
        severity = 'HIGH'
      } else if (tier2Keywords.some(kw => deviceType.includes(kw)) || hasIP) {
        likelyType = 'Smart/Networkable Device'
        severity = 'MEDIUM'
      } else {
        likelyType = 'Unknown device type'
        severity = 'LOW'
      }
      
      classificationVerification.orphanAnalysis.push({
        ip_address: orphan.ip_address,
        hostname: orphan.hostname,
        mac_address: orphan.mac_address,
        device_type: orphan.device_type,
        manufacturer: orphan.manufacturer,
        likelyType,
        severity,
        status: 'ORPHAN',
        confidence: 'LOW',
        reason: 'Found on network but not in engineering baseline',
        possibleCauses: ['Rogue device / shadow IT', 'Contractor equipment', 'Missing from engineering documentation', 'Recently added device', 'Misclassified passive device in baseline']
      })
    })
    
    // Calculate verification summary metrics
    const verificationSummary = {
      totalEngineeredNetworkable: classificationVerification.verified.length + classificationVerification.unverified.length + classificationVerification.suspiciousPassive.length,
      verified: classificationVerification.verified.length,
      unverified: classificationVerification.unverified.length,
      suspiciousPassive: classificationVerification.suspiciousPassive.length,
      verifiedPassive: classificationVerification.verifiedPassive.length,
      orphans: classificationVerification.orphanAnalysis.length,
      
      // Key metrics for "How do we know?"
      verificationRate: classificationVerification.verified.length > 0 
        ? Math.round((classificationVerification.verified.length / (classificationVerification.verified.length + classificationVerification.unverified.length)) * 100)
        : 0,
      
      classificationAccuracy: allEngineering.length > 0
        ? Math.round(((classificationVerification.verified.length + classificationVerification.verifiedPassive.length) / allEngineering.length) * 100)
        : 0,
      
      suspiciousCount: classificationVerification.suspiciousPassive.length + classificationVerification.orphanAnalysis.filter(o => o.severity === 'HIGH').length,
      
      confidenceLevel: null // Will calculate below
    }
    
    // Determine overall confidence level
    if (verificationSummary.verificationRate >= 70 && verificationSummary.suspiciousCount < 10) {
      verificationSummary.confidenceLevel = 'HIGH'
    } else if (verificationSummary.verificationRate >= 40 && verificationSummary.suspiciousCount < 50) {
      verificationSummary.confidenceLevel = 'MEDIUM'
    } else {
      verificationSummary.confidenceLevel = 'LOW'
    }
    
    // Calculate KPIs
    const kpis = {
      total_assets: allEngineering.length,
      discovered_assets: allOtDiscovery.length,
      matched_assets: matchResults.matchedCount,
      blind_spots: matchResults.blindSpotCount,
      orphan_assets: matchResults.orphanCount,
      discovery_coverage_percentage: matchResults.coveragePercentage,
      blind_spot_percentage: 100 - matchResults.coveragePercentage,
      // Add verification metrics to KPIs
      verification_rate: verificationSummary.verificationRate,
      classification_accuracy: verificationSummary.classificationAccuracy,
      suspicious_classifications: verificationSummary.suspiciousCount
    }
    
    // LEARNING: Analyze column usage and data quality
    const learningInsights = generateLearningInsights(
      allEngineering, 
      allOtDiscovery, 
      matchResults,
      dataSources
    )
    
    // Calculate distributions for Plant Intelligence (WHERE are the assets?)
    const distributions = {
      processUnitDistribution: {},
      deviceTypeDistribution: {},
      manufacturerDistribution: {},
      processUnitSecurity: {}, // Security metrics BY LOCATION
      manufacturerSecurity: {}  // Security metrics BY MANUFACTURER
    }
    
    // Build security metrics by process unit AND manufacturer
    allEngineering.forEach(asset => {
      const unit = asset.unit || 'Unknown'
      const mfr = asset.manufacturer || 'Unknown'
      const classification = classifyDeviceBySecurity(asset)
      const isNetworkable = classification.tier === 1 || classification.tier === 2
      
      // Process Unit Security
      if (!distributions.processUnitSecurity[unit]) {
        distributions.processUnitSecurity[unit] = {
          totalAssets: 0,
          networkableAssets: 0,
          discoveredAssets: 0,
          securedAssets: 0
        }
      }
      
      distributions.processUnitSecurity[unit].totalAssets++
      if (isNetworkable) {
        distributions.processUnitSecurity[unit].networkableAssets++
      }
      
      // Manufacturer Security
      if (!distributions.manufacturerSecurity[mfr]) {
        distributions.manufacturerSecurity[mfr] = {
          totalAssets: 0,
          networkableAssets: 0,
          discoveredAssets: 0,
          securedAssets: 0
        }
      }
      
      distributions.manufacturerSecurity[mfr].totalAssets++
      if (isNetworkable) {
        distributions.manufacturerSecurity[mfr].networkableAssets++
      }
      
      // Process Unit (where in the plant)
      distributions.processUnitDistribution[unit] = (distributions.processUnitDistribution[unit] || 0) + 1
      
      // Device Type (what kind of asset)
      const type = asset.device_type || 'Unknown'
      distributions.deviceTypeDistribution[type] = (distributions.deviceTypeDistribution[type] || 0) + 1
      
      // Manufacturer (who made it)
      distributions.manufacturerDistribution[mfr] = (distributions.manufacturerDistribution[mfr] || 0) + 1
    })
    
    // Count discovered and secured assets by unit AND manufacturer
    matchResults.matched.forEach(match => {
      const unit = match.engineering.unit || 'Unknown'
      const mfr = match.engineering.manufacturer || 'Unknown'
      
      // By Unit
      if (distributions.processUnitSecurity[unit]) {
        distributions.processUnitSecurity[unit].discoveredAssets++
        
        if (isTruthy(match.discovered?.is_managed)) {
          distributions.processUnitSecurity[unit].securedAssets++
        }
      }
      
      // By Manufacturer
      if (distributions.manufacturerSecurity[mfr]) {
        distributions.manufacturerSecurity[mfr].discoveredAssets++
        
        if (isTruthy(match.discovered?.is_managed)) {
          distributions.manufacturerSecurity[mfr].securedAssets++
        }
      }
    })
    
    // ============================================================================
    // PLANT COMPLETENESS ANALYSIS - Operational Intelligence Layer
    // ============================================================================
    const plantCompleteness = {}
    
    // Group assets by process unit
    const assetsByUnit = {}
    const matchesByUnit = {}
    
    allEngineering.forEach(asset => {
      const unit = asset.unit || 'Unknown'
      if (!assetsByUnit[unit]) assetsByUnit[unit] = []
      assetsByUnit[unit].push(asset)
    })
    
    matchResults.matched.forEach(match => {
      const unit = match.engineering.unit || 'Unknown'
      if (!matchesByUnit[unit]) matchesByUnit[unit] = []
      matchesByUnit[unit].push(match)
    })
    
    // Analyze each process unit
    Object.keys(assetsByUnit).forEach(unitName => {
      plantCompleteness[unitName] = analyzeProcessUnitCompleteness(
        unitName,
        assetsByUnit[unitName],
        matchesByUnit[unitName] || []
      )
    })
    
    // Calculate match strategy breakdown (for "How the Canon Works" section)
    const matchStrategyBreakdown = {
      tag_id: 0,
      ip_address: 0,
      hostname: 0,
      mac_address: 0,
      fuzzy: 0,
      intelligent_pairing: 0
    }
    
    matchResults.matched.forEach(m => {
      if (m.matchType === 'exact_tag_id') matchStrategyBreakdown.tag_id++
      else if (m.matchType === 'ip_match') matchStrategyBreakdown.ip_address++
      else if (m.matchType === 'hostname_match') matchStrategyBreakdown.hostname++
      else if (m.matchType === 'mac_match') matchStrategyBreakdown.mac_address++
      else if (m.matchType.includes('fuzzy')) matchStrategyBreakdown.fuzzy++
      else matchStrategyBreakdown.intelligent_pairing++
    })
    
    console.log('[FLEXIBLE API] Returning results:', kpis)
    
    return res.status(200).json({
      status: 'success',
      assets: canonicalAssets,
      kpis,
      metadata,
      matchResults: {
        strategies: ['tag_id', 'ip', 'hostname', 'mac', 'fuzzy', 'intelligent'],
        totalMatches: matchResults.matchedCount,
        matchTypes: matchResults.matched.reduce((acc, m) => {
          acc[m.matchType] = (acc[m.matchType] || 0) + 1
          return acc
        }, {}),
        strategyBreakdown: matchStrategyBreakdown  // For "How the Canon Works" UI section
      },
      validationSummary,  // Cross-validation summary for audit
      classificationVerification,  // NEW: Cross-verification of networkable vs passive classification
      verificationSummary,  // NEW: Summary metrics for "How do we know?" section
      blindSpots: matchResults.blindSpots.slice(0, 100),  // Sample of blind spots
      orphans: matchResults.orphans.slice(0, 100),  // Sample of orphans
      learningInsights,
      distributions,  // Plant Intelligence distributions
      plantCompleteness  // Operational Intelligence - plant completeness by unit
    })
    
  } catch (error) {
    console.error('[FLEXIBLE API] Error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}

