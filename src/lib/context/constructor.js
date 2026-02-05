/**
 * CONTEXT CONSTRUCTOR
 * Unified data ingestion and matching with provenance tracking
 * 
 * Based on AIGNE Framework principles (arXiv:2512.05470):
 * "Context Constructor assembles context under explicit architectural design constraints"
 */

import Papa from 'papaparse'

/**
 * Normalize a dataset to canonical field names
 * Handles variations in CSV column headers
 */
export function normalizeDataset(rows, sourceId = 'unknown') {
  return rows.map((row, rowIndex) => {
    const norm = {}
    
    // Lowercase and normalize all keys
    Object.entries(row || {}).forEach(([k, v]) => {
      const key = String(k || '').toLowerCase().replace(/\s+|-/g, '_')
      norm[key] = typeof v === 'string' ? v.trim() : v
    })

    return {
      // Primary identifiers (for matching)
      tag_id: String(norm.tag_id ?? norm.tag ?? norm.tagid ?? norm.asset_tag ?? norm.asset_id ?? norm.asset_name ?? norm.name ?? '').trim().toUpperCase(),
      ip_address: String(norm.ip_address ?? norm.ip ?? norm.ipaddress ?? norm.ipv4 ?? norm.discovered_ip ?? '').trim(),
      mac_address: String(norm.mac_address ?? norm.mac ?? norm.macaddress ?? '').trim().toUpperCase(),
      hostname: String(norm.hostname ?? norm.host ?? norm.device_name ?? norm.devicename ?? '').trim(),
      
      // Asset attributes - PLANT
      plant: String(norm.plant ?? norm.site ?? norm.facility ?? '').trim(),
      plant_code: String(norm.plant_code ?? norm.plantcode ?? norm.site_code ?? '').trim().toUpperCase(),
      
      // Asset attributes - UNIT
      unit: String(norm.unit ?? norm.area ?? norm.process_unit ?? norm.zone ?? '').trim(),
      unit_code: String(norm.unit_code ?? norm.unitcode ?? '').trim().toUpperCase(),
      
      // Asset attributes - DEVICE
      device_type: String(norm.device_type ?? norm.type ?? norm.asset_type ?? norm.instrument_type ?? norm.category ?? '').trim(),
      manufacturer: String(norm.manufacturer ?? norm.vendor ?? norm.oem ?? norm.make ?? '').trim(),
      model: String(norm.model ?? norm.device_model ?? norm.product ?? '').trim(),
      criticality: String(norm.criticality ?? norm.priority ?? '').trim(),
      security_tier: parseInt(norm.security_tier ?? norm.tier ?? 3) || 3,
      
      // Security attributes - core
      is_managed: parseBoolean(norm.is_managed ?? norm.managed ?? norm.security_managed),
      has_security_patches: parseBoolean(norm.has_security_patches ?? norm.patched ?? norm.patch_status),
      
      // Vulnerability data
      vulnerabilities: parseInt(norm.vulnerabilities ?? norm.vuln_count ?? 0) || 0,
      cve_count: parseInt(norm.cve_count ?? norm.cves ?? 0) || 0,
      cve_ids: String(norm.cve_ids ?? norm.cves_list ?? '').trim(),
      
      // Risk scoring
      risk_score: parseInt(norm.risk_score ?? norm.riskScore ?? norm.risk ?? 0) || 0,
      
      // Patching / lifecycle
      last_patch_date: String(norm.last_patch_date ?? norm.last_patched ?? norm.patched_date ?? '').trim(),
      firmware_version: String(norm.firmware_version ?? norm.firmware ?? norm.fw_version ?? '').trim(),
      
      // Discovery metadata
      last_seen: norm.last_seen ?? norm.lastseen ?? norm.last_discovered ?? '',
      first_seen: norm.first_seen ?? norm.firstseen ?? norm.first_discovered ?? '',
      discovery_method: String(norm.discovery_method ?? norm.scan_type ?? '').trim(),
      
      // Network attributes
      network_segment: String(norm.network_segment ?? norm.segment ?? norm.vlan ?? '').trim(),
      protocol: String(norm.protocol ?? norm.expected_protocol ?? norm.ot_protocol ?? '').trim(),
      
      // Provenance tracking
      _sourceId: sourceId,
      _rowIndex: rowIndex,
      _originalFields: Object.keys(row),
      
      // Keep original data
      _raw: norm
    }
  })
}

/**
 * Parse boolean-ish values from CSV
 */
function parseBoolean(val) {
  if (val === true || val === 'true' || val === 'True' || val === 'TRUE' || 
      val === 'Yes' || val === 'YES' || val === 'yes' || val === '1' || val === 1) {
    return true
  }
  return false
}

/**
 * Detect data source type from headers
 */
export function detectSourceType(headers, filename = '') {
  const lowerHeaders = headers.map(h => h.toLowerCase())
  const lowerFilename = filename.toLowerCase()
  
  // Engineering baseline indicators
  const engineeringIndicators = ['tag_id', 'tag', 'asset_tag', 'p&id', 'pid', 'loop', 'instrument']
  if (lowerHeaders.some(h => engineeringIndicators.some(i => h.includes(i)))) {
    return 'engineering'
  }
  
  // OT Discovery indicators
  const discoveryIndicators = ['last_seen', 'discovered', 'scan', 'mac_address', 'ot_protocol']
  if (lowerHeaders.some(h => discoveryIndicators.some(i => h.includes(i)))) {
    return 'discovery'
  }
  
  // Maintenance indicators
  const maintenanceIndicators = ['work_order', 'wo_', 'maintenance', 'pm_', 'due_date']
  if (lowerHeaders.some(h => maintenanceIndicators.some(i => h.includes(i)))) {
    return 'maintenance'
  }
  
  // Vulnerability indicators
  const vulnIndicators = ['vulnerability', 'cve', 'patch', 'cvss', 'exploit']
  if (lowerHeaders.some(h => vulnIndicators.some(i => h.includes(i)))) {
    return 'vulnerability'
  }
  
  // Filename hints
  if (lowerFilename.includes('engineering') || lowerFilename.includes('baseline')) return 'engineering'
  if (lowerFilename.includes('discovery') || lowerFilename.includes('claroty') || lowerFilename.includes('nozomi')) return 'discovery'
  if (lowerFilename.includes('cmms') || lowerFilename.includes('maintenance')) return 'maintenance'
  if (lowerFilename.includes('vuln') || lowerFilename.includes('security')) return 'vulnerability'
  
  return 'other'
}

/**
 * Parse CSV text and return normalized rows with metadata
 */
export function parseAndNormalize(csvText, sourceId, filename = '') {
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true })
  const headers = parsed.meta.fields || []
  const detectedType = detectSourceType(headers, filename)
  const rows = normalizeDataset(parsed.data, sourceId)
  
  return {
    rows,
    headers,
    detectedType,
    rowCount: rows.length
  }
}

/**
 * Multi-strategy matching engine
 */
export function performMatching(engineering, discovered, provenance = null) {
  const strategies = ['tag_id', 'ip_address', 'hostname', 'mac_address']
  const matched = []
  const usedEngineering = new Set()
  const usedDiscovered = new Set()
  
  // Strategy 1: Exact tag_id match (highest confidence)
  engineering.forEach((eng, engIdx) => {
    if (!eng.tag_id || usedEngineering.has(engIdx)) return
    
    const discIdx = discovered.findIndex((d, i) => 
      d.tag_id === eng.tag_id && !usedDiscovered.has(i)
    )
    
    if (discIdx !== -1) {
      const disc = discovered[discIdx]
      matched.push(createMatch(eng, disc, 'exact_tag_id', 100, engIdx, discIdx))
      usedEngineering.add(engIdx)
      usedDiscovered.add(discIdx)
      
      provenance?.recordMatch(eng.tag_id, 'exact_tag_id', eng._sourceId, disc._sourceId, 100)
    }
  })
  
  // Strategy 2: IP address match
  engineering.forEach((eng, engIdx) => {
    if (!eng.ip_address || usedEngineering.has(engIdx)) return
    
    const discIdx = discovered.findIndex((d, i) => 
      d.ip_address && d.ip_address === eng.ip_address && !usedDiscovered.has(i)
    )
    
    if (discIdx !== -1) {
      const disc = discovered[discIdx]
      matched.push(createMatch(eng, disc, 'ip_match', 95, engIdx, discIdx))
      usedEngineering.add(engIdx)
      usedDiscovered.add(discIdx)
      
      provenance?.recordMatch(eng.tag_id || eng.ip_address, 'ip_match', eng._sourceId, disc._sourceId, 95)
    }
  })
  
  // Strategy 3: Hostname match
  engineering.forEach((eng, engIdx) => {
    if (!eng.hostname || usedEngineering.has(engIdx)) return
    
    const discIdx = discovered.findIndex((d, i) => 
      d.hostname && d.hostname.toLowerCase() === eng.hostname.toLowerCase() && !usedDiscovered.has(i)
    )
    
    if (discIdx !== -1) {
      const disc = discovered[discIdx]
      matched.push(createMatch(eng, disc, 'hostname_match', 90, engIdx, discIdx))
      usedEngineering.add(engIdx)
      usedDiscovered.add(discIdx)
      
      provenance?.recordMatch(eng.tag_id || eng.hostname, 'hostname_match', eng._sourceId, disc._sourceId, 90)
    }
  })
  
  // Strategy 4: MAC address match
  engineering.forEach((eng, engIdx) => {
    if (!eng.mac_address || usedEngineering.has(engIdx)) return
    
    const discIdx = discovered.findIndex((d, i) => 
      d.mac_address && d.mac_address === eng.mac_address && !usedDiscovered.has(i)
    )
    
    if (discIdx !== -1) {
      const disc = discovered[discIdx]
      matched.push(createMatch(eng, disc, 'mac_match', 85, engIdx, discIdx))
      usedEngineering.add(engIdx)
      usedDiscovered.add(discIdx)
      
      provenance?.recordMatch(eng.tag_id || eng.mac_address, 'mac_match', eng._sourceId, disc._sourceId, 85)
    }
  })
  
  // Collect unmatched items
  const blindSpots = engineering.filter((_, i) => !usedEngineering.has(i))
  const orphans = discovered.filter((_, i) => !usedDiscovered.has(i))
  
  return {
    matched,
    blindSpots,
    orphans,
    stats: {
      engineeringTotal: engineering.length,
      discoveredTotal: discovered.length,
      matchedCount: matched.length,
      blindSpotCount: blindSpots.length,
      orphanCount: orphans.length,
      coveragePercent: engineering.length > 0 
        ? Math.round((matched.length / engineering.length) * 100) 
        : 0
    }
  }
}

/**
 * Create a match record with full provenance
 */
function createMatch(engineering, discovered, matchType, confidence, engIdx, discIdx) {
  return {
    engineering,
    discovered,
    matchType,
    confidence,
    provenance: {
      engineeringSourceId: engineering._sourceId,
      engineeringRowIndex: engineering._rowIndex,
      discoveredSourceId: discovered?._sourceId,
      discoveredRowIndex: discovered?._rowIndex,
      matchedOn: matchType.replace('_match', '').replace('exact_', '')
    }
  }
}

export default {
  normalizeDataset,
  detectSourceType,
  parseAndNormalize,
  performMatching
}


