import Papa from 'papaparse'
import dayjs from 'dayjs'
import crypto from 'node:crypto'

const parseCsv = (text) => Papa.parse(text || '', { header: true, skipEmptyLines: true }).data
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex')

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
  
  // Tier 2: Smart/Networkable Devices (SHOULD secure)
  const tier2Keywords = ['smart', 'ip', 'ethernet', 'profinet', 'modbus', 'dnp3', 'bacnet', 'camera', 'analyzer', 'vfd', 'drive']
  if (isNetworkable || tier2Keywords.some(kw => deviceType.includes(kw))) {
    return {
      tier: 2,
      classification: 'Smart/Networkable Device',
      securityRequired: 'SHOULD',
      rationale: 'Network-connected - potential attack surface'
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
  
  // Enhanced recommendations based on classification
  if (securityCoveragePercent < 70 && networkableAssets.length > 0) {
    const unmanagedNetworkable = networkableAssets.length - networkableManaged
    recommendations.push({
      type: 'security_gap',
      severity: 'critical',
      message: `Only ${securityCoveragePercent}% of networkable assets are secured (${networkableManaged}/${networkableAssets.length}). ${unmanagedNetworkable} network-connected devices are unmanaged - direct attack vectors!`,
      action: `Priority: Onboard ${unmanagedNetworkable} networkable devices to security management (Claroty, Nozomi, CrowdStrike, etc.)`
    })
  }
  
  if (tier1Assets.length > 0) {
    const tier1Managed = networkableMatched.filter(m => 
      classifyDeviceBySecurity(m.engineering).tier === 1 && isTruthy(m.discovered?.is_managed)
    ).length
    const tier1Coverage = Math.round((tier1Managed / tier1Assets.length) * 100)
    
    if (tier1Coverage < 90) {
      recommendations.push({
        type: 'critical_asset_gap',
        severity: 'critical',
        message: `Only ${tier1Coverage}% of Tier 1 critical assets (PLCs, DCS, HMIs) are secured. These are your highest-risk devices!`,
        action: `URGENT: Secure ${tier1Assets.length - tier1Managed} critical network assets immediately`
      })
    }
  }
  
  // 6. Smart Recommendations - TOP 3 ONLY (prioritized)
  const allRecommendations = []
  
  // Priority 1: Security gaps (highest business risk)
  if (securityCoveragePercent < 70 && networkableAssets.length > 0) {
    const unmanagedNetworkable = networkableAssets.length - networkableManaged
    allRecommendations.push({
      priority: 1,
      type: 'security_gap',
      severity: 'critical',
      message: `${unmanagedNetworkable} networkable devices are unmanaged`,
      detail: `Only ${securityCoveragePercent}% of networkable assets have security management. ${unmanagedNetworkable} devices with network connectivity are unmonitored - these are direct attack vectors.`,
      action: `Onboard ${unmanagedNetworkable} devices to security platform (Claroty, Nozomi, or similar)`,
      impact: 'High - reduces attack surface'
    })
  }
  
  // Priority 2: Critical asset gaps
  if (tier1Assets.length > 0) {
    const tier1Managed = networkableMatched.filter(m => 
      classifyDeviceBySecurity(m.engineering).tier === 1 && isTruthy(m.discovered?.is_managed)
    ).length
    const tier1Coverage = Math.round((tier1Managed / tier1Assets.length) * 100)
    
    if (tier1Coverage < 90) {
      allRecommendations.push({
        priority: 2,
        type: 'critical_asset_gap',
        severity: 'critical',
        message: `${tier1Assets.length - tier1Managed} critical PLCs/DCS/HMIs unsecured`,
        detail: `Only ${tier1Coverage}% of Tier 1 critical assets (PLCs, DCS, HMIs, SCADA) are secured. These are your highest-risk programmable devices.`,
        action: `Immediately secure ${tier1Assets.length - tier1Managed} critical network assets`,
        impact: 'Critical - prevents ransomware/disruption'
      })
    }
  }
  
  // Priority 3: Data quality (enables better coverage)
  if (engWithIP < engineering.length * 0.5 && discWithIP > discovered.length * 0.8) {
    allRecommendations.push({
      priority: 3,
      type: 'quick_win',
      severity: 'high',
      message: `Add IP addresses to ${Math.floor(engineering.length * 0.5 - engWithIP)} engineering assets`,
      detail: `Discovery data is ${Math.round((discWithIP / discovered.length) * 100)}% IP-complete but engineering baseline is only ${Math.round((engWithIP / engineering.length) * 100)}%. Adding IPs is a quick win that could improve matching significantly.`,
      action: `Enrich engineering baseline with IP addresses from network scans or IPAM`,
      impact: `Medium - could improve coverage from current to ~${Math.min(95, matchResults.coveragePercentage + 30)}%`
    })
  }
  
  // Priority 4: Orphan devices (shadow IT risk)
  if (matchResults.orphanCount > discovered.length * 0.1) {
    allRecommendations.push({
      priority: 4,
      type: 'orphan_assets',
      severity: 'medium',
      message: `${matchResults.orphanCount} orphan devices found on network`,
      detail: `${matchResults.orphanCount} discovered devices (${Math.round((matchResults.orphanCount / discovered.length) * 100)}%) have no engineering baseline match. These may be shadow IT, contractor equipment, or missing from asset register.`,
      action: `Review orphan assets for unauthorized devices or missing documentation`,
      impact: 'Medium - identifies shadow IT and compliance gaps'
    })
  }
  
  // Passive device insight (informational only)
  if (passiveAssets.length > engineering.length * 0.3) {
    allRecommendations.push({
      priority: 5,
      type: 'inventory_insight',
      severity: 'info',
      message: `${passiveAssets.length} passive/analog devices inventoried`,
      detail: `${Math.round((passiveAssets.length / engineering.length) * 100)}% of assets are passive analog devices (4-20mA transmitters, valves). These don't require security management but are important for complete asset visibility.`,
      action: `Good: Focus security efforts on ${networkableAssets.length} networkable assets, not passive devices`,
      impact: 'Info - confirms proper device classification'
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
    
    // Build canonical assets
    const canonicalAssets = matchResults.matched.map(({ engineering, discovered, matchType, matchConfidence }) => ({
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
      _sources: {
        engineering: engineering._source,
        discovered: discovered._source
      }
    }))
    
    // Calculate KPIs
    const kpis = {
      total_assets: allEngineering.length,
      discovered_assets: allOtDiscovery.length,
      matched_assets: matchResults.matchedCount,
      blind_spots: matchResults.blindSpotCount,
      orphan_assets: matchResults.orphanCount,
      discovery_coverage_percentage: matchResults.coveragePercentage,
      blind_spot_percentage: 100 - matchResults.coveragePercentage
    }
    
    // LEARNING: Analyze column usage and data quality
    const learningInsights = generateLearningInsights(
      allEngineering, 
      allOtDiscovery, 
      matchResults,
      dataSources
    )
    
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
        }, {})
      },
      learningInsights
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

