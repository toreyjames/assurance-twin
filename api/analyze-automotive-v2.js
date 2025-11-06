import Papa from 'papaparse'
import dayjs from 'dayjs'
import crypto from 'node:crypto'

const parseCsv = (text) => Papa.parse(text || '', { header: true, skipEmptyLines: true }).data
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex')

// Normalize dataset to handle varied CSV formats and enable flexible matching
const normalizeDataset = (rows) => rows.map((row) => {
  const norm = {}
  Object.entries(row || {}).forEach(([k, v]) => {
    const key = String(k || '').toLowerCase().replace(/\s+|-/g, '_')
    norm[key] = typeof v === 'string' ? v.trim() : v
  })
  
  return {
    // Primary identifiers (for matching)
    tag_id: String(norm.tag_id ?? norm.tag ?? norm.tagid ?? norm.asset_tag ?? norm.asset_id ?? norm.name ?? '').trim().toUpperCase(),
    ip_address: String(norm.ip_address ?? norm.ip ?? norm.ipaddress ?? norm.ipv4 ?? '').trim(),
    mac_address: String(norm.mac_address ?? norm.mac ?? norm.macaddress ?? '').trim().toUpperCase(),
    hostname: String(norm.hostname ?? norm.host ?? norm.device_name ?? '').trim(),
    
    // Asset attributes
    plant: String(norm.plant ?? norm.site ?? norm.facility ?? '').trim(),
    unit: String(norm.unit ?? norm.area ?? norm.line ?? norm.production_line ?? '').trim(),
    device_type: String(norm.device_type ?? norm.type ?? norm.asset_type ?? '').trim(),
    manufacturer: String(norm.manufacturer ?? norm.vendor ?? norm.oem ?? '').trim(),
    model: String(norm.model ?? norm.device_model ?? '').trim(),
    
    // Automotive-specific (ISO 26262 ASIL levels are OBJECTIVE, not subjective)
    asil_level: String(norm.asil_level ?? norm.asil ?? norm.iso_26262 ?? '').trim(),
    
    // Security attributes
    is_managed: norm.is_managed ?? norm.managed ?? norm.security_managed ?? false,
    has_security_patches: norm.has_security_patches ?? norm.patched ?? norm.patch_status ?? false,
    encryption_enabled: norm.encryption_enabled ?? norm.encrypted ?? norm.encryption ?? false,
    authentication_required: norm.authentication_required ?? norm.authentication ?? norm.auth_required ?? false,
    firewall_protected: norm.firewall_protected ?? norm.firewall ?? norm.segmented ?? false,
    access_control: norm.access_control ?? norm.access_controls ?? norm.rbac ?? 'None',
    
    // Vulnerability data
    vulnerabilities: parseInt(norm.vulnerabilities ?? norm.vuln_count ?? 0),
    cve_count: parseInt(norm.cve_count ?? norm.cves ?? 0),
    
    // Discovery metadata
    last_seen: norm.last_seen ?? norm.lastseen ?? norm.last_discovered ?? '',
    confidence_level: parseInt(norm.confidence_level ?? norm.confidence ?? 100),
    
    // Keep all original fields for reference
    ...norm
  }
})

// Helper to parse boolean-ish values from CSV
const isTruthy = (val) => {
  if (val === true || val === 'true' || val === 'True' || val === 'TRUE' || val === '1' || val === 1) {
    return true
  }
  return false
}

// PRODUCTION-READY: Flexible matching strategies for real-world OT discovery data
function performFlexibleMatching(engineering, discovered, options = {}) {
  const {
    demoMode = false,
    matchStrategies = ['tag_id', 'ip_address', 'hostname', 'mac_address'],
    minCoverage = null,
    maxCoverage = null
  } = options
  
  const engineeringAssets = engineering.length
  const discoveredAssets = discovered.length
  
  const matchedAssets = []
  const usedDiscoveryAssets = new Set()
  
  console.log(`[AUTOMOTIVE] Starting with ${engineeringAssets} eng assets, ${discoveredAssets} discovered assets`)
  console.log(`[AUTOMOTIVE] Strategies: ${matchStrategies.join(', ')}`)
  
  // Strategy 1: Exact tag_id match (if both have it)
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
    console.log(`[AUTOMOTIVE] After tag_id: ${matchedAssets.length} matches`)
  }
  
  // Strategy 2: IP address match (most common in real OT discovery)
  if (matchStrategies.includes('ip_address')) {
    engineering.forEach(engAsset => {
      if (!engAsset.ip_address || matchedAssets.find(m => m.engineering.tag_id === engAsset.tag_id)) return
      
      const match = discovered.find(d => 
        d.ip_address && 
        d.ip_address === engAsset.ip_address && 
        !usedDiscoveryAssets.has(d.tag_id + d.ip_address)
      )
      
      if (match) {
        matchedAssets.push({
          engineering: engAsset,
          discovered: match,
          matchType: 'ip_address',
          matchConfidence: 95
        })
        usedDiscoveryAssets.add(match.tag_id + match.ip_address)
      }
    })
    console.log(`[AUTOMOTIVE] After IP: ${matchedAssets.length} matches`)
  }
  
  // Strategy 3: Hostname/device name match
  if (matchStrategies.includes('hostname')) {
    engineering.forEach(engAsset => {
      if (!engAsset.hostname || matchedAssets.find(m => m.engineering.tag_id === engAsset.tag_id)) return
      
      const match = discovered.find(d => 
        d.hostname && 
        (d.hostname === engAsset.hostname || 
         d.hostname.includes(engAsset.tag_id) || 
         engAsset.hostname.includes(d.hostname)) &&
        !usedDiscoveryAssets.has(d.tag_id + d.ip_address)
      )
      
      if (match) {
        matchedAssets.push({
          engineering: engAsset,
          discovered: match,
          matchType: 'hostname',
          matchConfidence: 85
        })
        usedDiscoveryAssets.add(match.tag_id + match.ip_address)
      }
    })
    console.log(`[AUTOMOTIVE] After hostname: ${matchedAssets.length} matches`)
  }
  
  // Strategy 4: MAC address match (for network equipment)
  if (matchStrategies.includes('mac_address')) {
    engineering.forEach(engAsset => {
      if (!engAsset.mac_address || matchedAssets.find(m => m.engineering.tag_id === engAsset.tag_id)) return
      
      const match = discovered.find(d => 
        d.mac_address && 
        d.mac_address === engAsset.mac_address && 
        !usedDiscoveryAssets.has(d.tag_id + d.ip_address)
      )
      
      if (match) {
        matchedAssets.push({
          engineering: engAsset,
          discovered: match,
          matchType: 'mac_address',
          matchConfidence: 90
        })
        usedDiscoveryAssets.add(match.tag_id + match.ip_address)
      }
    })
    console.log(`[AUTOMOTIVE] After MAC: ${matchedAssets.length} matches`)
  }
  
  // DEMO MODE ONLY: Force realistic coverage if requested
  if (demoMode && minCoverage !== null) {
    const remainingEng = engineering.filter(e => 
      !matchedAssets.find(m => m.engineering.tag_id === e.tag_id)
    )
    const remainingDisc = discovered.filter(d => 
      !usedDiscoveryAssets.has(d.tag_id + d.ip_address)
    )
    
    const targetCov = minCoverage + Math.random() * (maxCoverage - minCoverage)
    const targetMatches = Math.floor(engineeringAssets * targetCov) - matchedAssets.length
    const additionalMatches = Math.min(targetMatches, remainingEng.length, remainingDisc.length)
    
    console.log(`[DEMO MODE] Forcing ${additionalMatches} additional matches for ${Math.round(targetCov * 100)}% coverage`)
    
    for (let i = 0; i < additionalMatches; i++) {
      matchedAssets.push({
        engineering: remainingEng[i],
        discovered: remainingDisc[i],
        matchType: 'demo_forced',
        matchConfidence: 70
      })
      usedDiscoveryAssets.add(remainingDisc[i].tag_id + remainingDisc[i].ip_address)
    }
  }
  
  // Calculate blind spots and orphans
  const blindSpots = engineering.filter(e => 
    !matchedAssets.find(m => m.engineering.tag_id === e.tag_id)
  )
  
  const orphanAssets = discovered.filter(d => 
    !usedDiscoveryAssets.has(d.tag_id + d.ip_address)
  )
  
  const coveragePercentage = engineeringAssets > 0 ? 
    Math.round((matchedAssets.length / engineeringAssets) * 100) : 0
  
  console.log(`[AUTOMOTIVE] Final: ${matchedAssets.length}/${engineeringAssets} matched (${coveragePercentage}%)`)
  console.log(`[AUTOMOTIVE] Blind spots: ${blindSpots.length}, Orphans: ${orphanAssets.length}`)
  
  // Security Management Analysis (ONLY for discovered assets)
  const discoveredData = matchedAssets.map(m => m.discovered).filter(d => d)
  
  const securityManaged = discoveredData.filter(d => isTruthy(d.is_managed)).length
  const securityPatched = discoveredData.filter(d => isTruthy(d.has_security_patches)).length
  const withEncryption = discoveredData.filter(d => isTruthy(d.encryption_enabled)).length
  const withAuthentication = discoveredData.filter(d => isTruthy(d.authentication_required)).length
  const withFirewall = discoveredData.filter(d => isTruthy(d.firewall_protected)).length
  const withAccessControl = discoveredData.filter(d => 
    d.access_control && d.access_control !== 'None' && d.access_control !== 'none' && d.access_control !== ''
  ).length
  
  const withVulnerabilities = discoveredData.filter(d => 
    parseInt(d.vulnerabilities || 0) > 0 || parseInt(d.cve_count || 0) > 0
  ).length
  
  const totalVulnerabilities = discoveredData.reduce((sum, d) => 
    sum + parseInt(d.vulnerabilities || 0), 0
  )
  
  const totalCVEs = discoveredData.reduce((sum, d) => 
    sum + parseInt(d.cve_count || 0), 0
  )
  
  // Calculate percentages
  const managedPercentage = discoveredData.length > 0 ? 
    Math.round((securityManaged / discoveredData.length) * 100) : 0
  
  const patchedPercentage = discoveredData.length > 0 ? 
    Math.round((securityPatched / discoveredData.length) * 100) : 0
  
  const encryptionPercentage = discoveredData.length > 0 ? 
    Math.round((withEncryption / discoveredData.length) * 100) : 0
  
  const authenticationPercentage = discoveredData.length > 0 ? 
    Math.round((withAuthentication / discoveredData.length) * 100) : 0
  
  const firewallPercentage = discoveredData.length > 0 ? 
    Math.round((withFirewall / discoveredData.length) * 100) : 0
  
  const accessControlPercentage = discoveredData.length > 0 ? 
    Math.round((withAccessControl / discoveredData.length) * 100) : 0
  
  return {
    // Step 1: Asset Inventory
    engineeringAssets,
    discoveredAssets,
    
    // Step 2: Discovery Coverage
    matchedAssets: matchedAssets.length,
    coveragePercentage,
    blindSpots: blindSpots.length,
    blindSpotDetails: blindSpots.slice(0, 20),
    orphanAssets: orphanAssets.length,
    orphanDetails: orphanAssets.slice(0, 20),
    
    // Step 3: Security Management
    securityManaged,
    managedPercentage,
    securityPatched,
    patchedPercentage,
    withEncryption,
    encryptionPercentage,
    withAuthentication,
    authenticationPercentage,
    withFirewall,
    firewallPercentage,
    withAccessControl,
    accessControlPercentage,
    
    // Step 4: Vulnerability Posture
    withVulnerabilities,
    totalVulnerabilities,
    totalCVEs,
    vulnerabilityPercentage: discoveredData.length > 0 ? 
      Math.round((withVulnerabilities / discoveredData.length) * 100) : 0,
    
    // Detailed match data (for manual enrichment)
    matches: matchedAssets,
    unmatchedEngineering: blindSpots,
    unmatchedDiscovered: orphanAssets,
    
    summary: `OT Discovery: ${discoveredAssets} assets found, ${matchedAssets.length} matched (${coveragePercentage}%). ${blindSpots.length} blind spots identified.`
  }
}

// Automotive Industry-Specific Canonizer - PRODUCTION VERSION (Objective Metrics Only)
export default async function handler(req, res) {
  try {
    console.log('Analyze Automotive V2 (Production) called with method:', req.method)
    
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'POST only' })
    }
    
    const body = req.body || {}
    const demoMode = body.demoMode === true || body.demoMode === 'true'
    
    // Parse input data
    let eng = body.engineeringCsv ? parseCsv(body.engineeringCsv) : []
    let otDiscovery = body.otDiscoveryCsv ? parseCsv(body.otDiscoveryCsv) : []

    // Normalize datasets for flexible matching
    eng = normalizeDataset(eng)
    otDiscovery = normalizeDataset(otDiscovery)

    console.log(`Parsed ${eng.length} engineering assets, ${otDiscovery.length} discovered assets`)

    if (eng.length === 0) {
      return res.status(400).json({ error: 'No engineering baseline data provided' })
    }

    // Perform flexible matching (production: real matches only, demo: can force coverage)
    const matchingOptions = demoMode ? {
      demoMode: true,
      matchStrategies: ['tag_id', 'ip_address', 'hostname', 'mac_address'],
      minCoverage: 0.5,
      maxCoverage: 0.75
    } : {
      demoMode: false,
      matchStrategies: ['ip_address', 'hostname', 'mac_address', 'tag_id']
    }
    
    const otDiscoveryAnalysis = performFlexibleMatching(eng, otDiscovery, matchingOptions)

    // Calculate objective KPIs
    const totalAssets = eng.length
    const discoveredAssets = otDiscovery.length
    const matchedAssets = otDiscoveryAnalysis.matchedAssets
    const coveragePercentage = otDiscoveryAnalysis.coveragePercentage
    const blindSpots = otDiscoveryAnalysis.blindSpots
    
    // Production Line Distribution (objective counts only)
    const productionLineDistribution = eng.reduce((acc, asset) => {
      const line = asset.unit || 'Unknown'
      acc[line] = (acc[line] || 0) + 1
      return acc
    }, {})
    
    // Device Type Distribution
    const deviceTypeDistribution = eng.reduce((acc, asset) => {
      const type = asset.device_type || 'Unknown'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {})
    
    // Manufacturer Distribution
    const manufacturerDistribution = eng.reduce((acc, asset) => {
      const mfr = asset.manufacturer || 'Unknown'
      acc[mfr] = (acc[mfr] || 0) + 1
      return acc
    }, {})
    
    // ASIL Distribution (OBJECTIVE - from ISO 26262 standard)
    const asilDistribution = eng.reduce((acc, asset) => {
      const asil = asset.asil_level || 'Not Specified'
      acc[asil] = (acc[asil] || 0) + 1
      return acc
    }, {})

    const kpis = {
      total_assets: totalAssets,
      discovered_assets: discoveredAssets,
      matched_assets: matchedAssets,
      coverage_percentage: coveragePercentage,
      blind_spots: blindSpots,
      orphan_assets: otDiscoveryAnalysis.orphanAssets,
      
      // Security metrics (objective, data-driven)
      security_managed: otDiscoveryAnalysis.securityManaged,
      managed_percentage: otDiscoveryAnalysis.managedPercentage,
      security_patched: otDiscoveryAnalysis.securityPatched,
      patched_percentage: otDiscoveryAnalysis.patchedPercentage,
      with_encryption: otDiscoveryAnalysis.withEncryption,
      encryption_percentage: otDiscoveryAnalysis.encryptionPercentage,
      with_authentication: otDiscoveryAnalysis.withAuthentication,
      authentication_percentage: otDiscoveryAnalysis.authenticationPercentage,
      with_firewall: otDiscoveryAnalysis.withFirewall,
      firewall_percentage: otDiscoveryAnalysis.firewallPercentage,
      
      // Vulnerability metrics
      with_vulnerabilities: otDiscoveryAnalysis.withVulnerabilities,
      total_vulnerabilities: otDiscoveryAnalysis.totalVulnerabilities,
      total_cves: otDiscoveryAnalysis.totalCVEs,
      vulnerability_percentage: otDiscoveryAnalysis.vulnerabilityPercentage
    }

    // Generate evidence hash
    const evidenceData = {
      timestamp: dayjs().toISOString(),
      totalAssets,
      discoveredAssets,
      matchedAssets,
      coveragePercentage,
      productionLineDistribution,
      deviceTypeDistribution,
      manufacturerDistribution,
      asilDistribution
    }
    const evidenceHash = sha256(JSON.stringify(evidenceData))

    return res.status(200).json({
      success: true,
      industry: 'Automotive',
      mode: demoMode ? 'demo' : 'production',
      kpis,
      otDiscoveryAnalysis,
      productionLineDistribution,
      deviceTypeDistribution,
      manufacturerDistribution,
      asilDistribution,
      evidenceHash,
      timestamp: dayjs().toISOString(),
      
      // For manual enrichment UI
      suggestedMatches: otDiscoveryAnalysis.unmatchedEngineering.slice(0, 10).map(engAsset => {
        const potentialMatches = otDiscoveryAnalysis.unmatchedDiscovered.filter(disc => {
          let score = 0
          if (disc.device_type === engAsset.device_type) score += 30
          if (disc.manufacturer === engAsset.manufacturer) score += 25
          if (disc.unit === engAsset.unit) score += 20
          return score >= 50
        }).map(disc => ({
          discovered: disc,
          confidence: 60,
          reason: 'Similar device type and location'
        }))
        
        return {
          engineering: engAsset,
          potentialMatches: potentialMatches.slice(0, 3)
        }
      }).filter(s => s.potentialMatches.length > 0)
    })

  } catch (error) {
    console.error('Automotive Canonizer Error:', error)
    return res.status(500).json({ 
      error: 'Automotive Canonizer failed', 
      detail: error.message 
    })
  }
}

