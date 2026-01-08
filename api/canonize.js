/**
 * UNIFIED CANONIZATION API
 * Single endpoint replacing 7 industry-specific APIs
 * 
 * Based on AIGNE Framework principles (arXiv:2512.05470):
 * - Context Constructor: Ingest and match data sources
 * - Context Evaluator: Classify and validate assets
 * - Context Loader: Assemble output by tier level
 * - Full provenance tracking for audit trails
 */

import Papa from 'papaparse'

// =============================================================================
// PROVENANCE TRACKER (inline for serverless)
// =============================================================================

class ProvenanceTracker {
  constructor() {
    this.sessionId = crypto.randomUUID()
    this.events = []
    this.startTime = new Date().toISOString()
    this.sources = new Map()
  }

  record(event) {
    this.events.push({
      ...event,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      sequence: this.events.length
    })
  }

  recordSource(sourceId, filename, rowCount, detectedType) {
    this.sources.set(sourceId, { filename, rowCount, detectedType })
    this.record({ type: 'SOURCE_INGESTED', sourceId, filename, rowCount, detectedType })
  }

  generateAuditPackage(assets, summary) {
    const sha256 = (str) => {
      // Simple hash for demo - in production use crypto
      let hash = 0
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i)
        hash = hash & hash
      }
      return Math.abs(hash).toString(16).padStart(16, '0')
    }

    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      endTime: new Date().toISOString(),
      evidenceHash: sha256(JSON.stringify({ assets: assets.length, summary })),
      summary: {
        sourcesIngested: this.sources.size,
        totalEvents: this.events.length
      },
      sources: Object.fromEntries(this.sources),
      events: this.events
    }
  }
}

// =============================================================================
// CONTEXT CONSTRUCTOR
// =============================================================================

function normalizeDataset(rows, sourceId) {
  return rows.map((row, rowIndex) => {
    const norm = {}
    Object.entries(row || {}).forEach(([k, v]) => {
      const key = String(k || '').toLowerCase().replace(/\s+|-/g, '_')
      norm[key] = typeof v === 'string' ? v.trim() : v
    })

    return {
      tag_id: String(norm.tag_id ?? norm.tag ?? norm.asset_tag ?? norm.asset_id ?? '').trim().toUpperCase(),
      ip_address: String(norm.ip_address ?? norm.ip ?? '').trim(),
      mac_address: String(norm.mac_address ?? norm.mac ?? '').trim().toUpperCase(),
      hostname: String(norm.hostname ?? norm.host ?? norm.device_name ?? '').trim(),
      plant: String(norm.plant ?? norm.site ?? norm.facility ?? '').trim(),
      unit: String(norm.unit ?? norm.area ?? norm.process_unit ?? '').trim(),
      device_type: String(norm.device_type ?? norm.type ?? norm.instrument_type ?? '').trim(),
      manufacturer: String(norm.manufacturer ?? norm.vendor ?? '').trim(),
      model: String(norm.model ?? norm.device_model ?? '').trim(),
      is_managed: parseBoolean(norm.is_managed ?? norm.managed),
      vulnerabilities: parseInt(norm.vulnerabilities ?? norm.vuln_count ?? 0) || 0,
      last_seen: norm.last_seen ?? '',
      _sourceId: sourceId,
      _rowIndex: rowIndex
    }
  })
}

function parseBoolean(val) {
  return val === true || val === 'true' || val === 'True' || val === 'Yes' || val === '1'
}

function detectSourceType(headers, filename = '') {
  const lowerHeaders = headers.map(h => h.toLowerCase())
  const lowerFilename = filename.toLowerCase()
  
  if (lowerHeaders.some(h => ['tag_id', 'tag', 'asset_tag', 'instrument'].some(i => h.includes(i)))) return 'engineering'
  if (lowerHeaders.some(h => ['last_seen', 'discovered', 'mac_address'].some(i => h.includes(i)))) return 'discovery'
  if (lowerFilename.includes('engineering') || lowerFilename.includes('baseline')) return 'engineering'
  if (lowerFilename.includes('discovery') || lowerFilename.includes('claroty')) return 'discovery'
  
  return 'other'
}

function performMatching(engineering, discovered, provenance) {
  const matched = []
  const usedEng = new Set()
  const usedDisc = new Set()

  // Strategy 1: tag_id
  engineering.forEach((eng, i) => {
    if (!eng.tag_id || usedEng.has(i)) return
    const j = discovered.findIndex((d, idx) => d.tag_id === eng.tag_id && !usedDisc.has(idx))
    if (j !== -1) {
      matched.push({ engineering: eng, discovered: discovered[j], matchType: 'exact_tag_id', confidence: 100 })
      usedEng.add(i)
      usedDisc.add(j)
      provenance.record({ type: 'MATCH', assetId: eng.tag_id, strategy: 'tag_id', confidence: 100 })
    }
  })

  // Strategy 2: ip_address
  engineering.forEach((eng, i) => {
    if (!eng.ip_address || usedEng.has(i)) return
    const j = discovered.findIndex((d, idx) => d.ip_address === eng.ip_address && !usedDisc.has(idx))
    if (j !== -1) {
      matched.push({ engineering: eng, discovered: discovered[j], matchType: 'ip_match', confidence: 95 })
      usedEng.add(i)
      usedDisc.add(j)
      provenance.record({ type: 'MATCH', assetId: eng.tag_id || eng.ip_address, strategy: 'ip', confidence: 95 })
    }
  })

  // Strategy 3: hostname
  engineering.forEach((eng, i) => {
    if (!eng.hostname || usedEng.has(i)) return
    const j = discovered.findIndex((d, idx) => 
      d.hostname?.toLowerCase() === eng.hostname.toLowerCase() && !usedDisc.has(idx)
    )
    if (j !== -1) {
      matched.push({ engineering: eng, discovered: discovered[j], matchType: 'hostname_match', confidence: 90 })
      usedEng.add(i)
      usedDisc.add(j)
      provenance.record({ type: 'MATCH', assetId: eng.tag_id || eng.hostname, strategy: 'hostname', confidence: 90 })
    }
  })

  const blindSpots = engineering.filter((_, i) => !usedEng.has(i))
  const orphans = discovered.filter((_, i) => !usedDisc.has(i))

  return {
    matched,
    blindSpots,
    orphans,
    stats: {
      total: engineering.length,
      matched: matched.length,
      blindSpots: blindSpots.length,
      orphans: orphans.length,
      coverage: engineering.length > 0 ? Math.round((matched.length / engineering.length) * 100) : 0
    }
  }
}

// =============================================================================
// CONTEXT EVALUATOR
// =============================================================================

function classifySecurityTier(asset) {
  const deviceType = String(asset.device_type || '').toLowerCase()
  const hasNetwork = Boolean(asset.ip_address || asset.mac_address)

  const tier1 = ['plc', 'dcs', 'hmi', 'scada', 'rtu', 'controller', 'safety', 'server', 'switch', 'firewall']
  if (tier1.some(kw => deviceType.includes(kw))) {
    return { tier: 1, label: 'Critical Network Asset', color: '#ef4444', reason: `"${asset.device_type}" is a critical control system` }
  }

  const tier2 = ['smart', 'ethernet', 'camera', 'analyzer', 'vfd', 'drive']
  if (hasNetwork || tier2.some(kw => deviceType.includes(kw))) {
    return { tier: 2, label: 'Networkable Device', color: '#f59e0b', reason: hasNetwork ? 'Has IP/MAC address' : 'Typically networkable' }
  }

  return { tier: 3, label: 'Passive/Analog', color: '#6366f1', reason: 'No network connectivity' }
}

function crossValidate(match) {
  const eng = match.engineering
  const disc = match.discovered
  if (!disc) return { status: 'UNVALIDATED', confidence: 'LOW', agreementCount: 0 }

  const checks = {
    tag_id: eng.tag_id && disc.tag_id && eng.tag_id === disc.tag_id,
    ip: eng.ip_address && disc.ip_address && eng.ip_address === disc.ip_address,
    type: eng.device_type && disc.device_type && eng.device_type.toLowerCase().includes(disc.device_type.toLowerCase().slice(0, 4))
  }

  const agreementCount = Object.values(checks).filter(Boolean).length
  return {
    status: agreementCount >= 2 ? 'VERIFIED' : agreementCount >= 1 ? 'PARTIAL' : 'SUSPICIOUS',
    confidence: agreementCount >= 2 ? 'HIGH' : agreementCount >= 1 ? 'MEDIUM' : 'LOW',
    agreementCount,
    checks
  }
}

// =============================================================================
// CONTEXT LOADER (Output Assembly by Tier)
// =============================================================================

function assembleOutput(canonicalAssets, blindSpots, orphans, matchStats, provenance, outputLevel = 'standard') {
  const summary = {
    total: matchStats.total,
    matched: matchStats.matched,
    blindSpots: matchStats.blindSpots,
    orphans: matchStats.orphans,
    coverage: matchStats.coverage,
    tier1: canonicalAssets.filter(a => a.classification?.tier === 1).length,
    tier2: canonicalAssets.filter(a => a.classification?.tier === 2).length,
    tier3: canonicalAssets.filter(a => a.classification?.tier === 3).length
  }

  // Identify items requiring human review
  const reviewItems = {
    lowConfidence: canonicalAssets.filter(a => a.validation?.confidence === 'LOW').slice(0, 30),
    suspiciousClassifications: canonicalAssets.filter(a => 
      a.classification?.tier === 3 && a.discovered?.ip_address
    ).slice(0, 20),
    criticalOrphans: orphans.filter(o => classifySecurityTier(o).tier <= 2).slice(0, 20),
    count: 0
  }
  reviewItems.count = reviewItems.lowConfidence.length + reviewItems.suspiciousClassifications.length + reviewItems.criticalOrphans.length

  // Base response
  const response = {
    status: reviewItems.count > 0 ? 'PENDING_REVIEW' : 'COMPLETE',
    summary,
    reviewRequired: reviewItems
  }

  // BASIC: Just the list
  if (outputLevel === 'basic') {
    response.assets = canonicalAssets.map(a => ({
      tag_id: a.tag_id,
      unit: a.unit,
      device_type: a.device_type,
      manufacturer: a.manufacturer,
      model: a.model,
      ip_address: a.ip_address,
      hostname: a.hostname,
      mac_address: a.mac_address,
      plant: a.plant,
      last_seen: a.last_seen
    }))
    return response
  }

  // STANDARD: List + prioritization
  if (outputLevel === 'standard') {
    response.assets = canonicalAssets.map(a => ({
      tag_id: a.tag_id,
      unit: a.unit,
      device_type: a.device_type,
      manufacturer: a.manufacturer,
      model: a.model,
      ip_address: a.ip_address,
      hostname: a.hostname,
      plant: a.plant,
      // Prioritization fields
      security_tier: a.classification?.tier,
      tier_label: a.classification?.label,
      is_managed: a.is_managed,
      match_confidence: a.matchConfidence,
      validation_status: a.validation?.status
    }))
    response.blindSpots = blindSpots.slice(0, 100).map(b => ({
      tag_id: b.tag_id, unit: b.unit, device_type: b.device_type, ip_address: b.ip_address
    }))
    response.orphans = orphans.slice(0, 100).map(o => ({
      ip_address: o.ip_address, hostname: o.hostname, device_type: o.device_type, mac_address: o.mac_address
    }))
    return response
  }

  // PREMIUM: Full audit package
  response.assets = canonicalAssets
  response.blindSpots = blindSpots.slice(0, 500)
  response.orphans = orphans.slice(0, 500)
  response.audit = provenance.generateAuditPackage(canonicalAssets, summary)
  
  return response
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }

  const provenance = new ProvenanceTracker()

  try {
    const { sources, industry = 'oil-gas', outputLevel = 'standard' } = req.body

    provenance.record({ type: 'PIPELINE_START', industry, outputLevel })

    // 1. INGEST SOURCES
    let allEngineering = []
    let allDiscovery = []

    // Process engineering sources
    if (sources.engineering?.length > 0) {
      for (const file of sources.engineering) {
        const sourceId = crypto.randomUUID()
        const parsed = Papa.parse(file.content, { header: true, skipEmptyLines: true })
        const rows = normalizeDataset(parsed.data, sourceId)
        allEngineering.push(...rows)
        provenance.recordSource(sourceId, file.filename, rows.length, 'engineering')
      }
    }

    // Process discovery sources (OT tool exports)
    if (sources.discovery?.length > 0) {
      for (const file of sources.discovery) {
        const sourceId = crypto.randomUUID()
        const parsed = Papa.parse(file.content, { header: true, skipEmptyLines: true })
        const rows = normalizeDataset(parsed.data, sourceId)
        allDiscovery.push(...rows)
        provenance.recordSource(sourceId, file.filename, rows.length, 'discovery')
      }
    }

    // Auto-detect and route "other" sources
    if (sources.other?.length > 0) {
      for (const file of sources.other) {
        const sourceId = crypto.randomUUID()
        const parsed = Papa.parse(file.content, { header: true, skipEmptyLines: true })
        const headers = parsed.meta.fields || []
        const detectedType = detectSourceType(headers, file.filename)
        const rows = normalizeDataset(parsed.data, sourceId)
        
        if (detectedType === 'engineering') {
          allEngineering.push(...rows)
        } else if (detectedType === 'discovery') {
          allDiscovery.push(...rows)
        }
        provenance.recordSource(sourceId, file.filename, rows.length, detectedType)
      }
    }

    provenance.record({ 
      type: 'INGESTION_COMPLETE', 
      engineering: allEngineering.length, 
      discovery: allDiscovery.length 
    })

    // 2. PERFORM MATCHING
    const matchResults = performMatching(allEngineering, allDiscovery, provenance)
    
    provenance.record({ 
      type: 'MATCHING_COMPLETE', 
      ...matchResults.stats 
    })

    // 3. CLASSIFY AND VALIDATE
    const canonicalAssets = matchResults.matched.map(match => {
      const classification = classifySecurityTier(match.engineering)
      const validation = crossValidate(match)

      provenance.record({ 
        type: 'CLASSIFICATION', 
        assetId: match.engineering.tag_id, 
        tier: classification.tier 
      })

      return {
        // Core fields
        tag_id: match.engineering.tag_id || match.discovered?.tag_id || 'UNKNOWN',
        ip_address: match.discovered?.ip_address || match.engineering.ip_address || '',
        hostname: match.discovered?.hostname || match.engineering.hostname || '',
        mac_address: match.discovered?.mac_address || match.engineering.mac_address || '',
        plant: match.engineering.plant,
        unit: match.engineering.unit,
        device_type: match.engineering.device_type,
        manufacturer: match.engineering.manufacturer,
        model: match.engineering.model,
        last_seen: match.discovered?.last_seen || '',
        is_managed: match.discovered?.is_managed || false,
        vulnerabilities: match.discovered?.vulnerabilities || 0,
        
        // Classification
        classification,
        
        // Validation
        validation,
        matchType: match.matchType,
        matchConfidence: match.confidence,
        
        // Discovery data (for premium)
        discovered: match.discovered,
        
        // Provenance (for premium)
        provenance: {
          engineeringSource: match.engineering._sourceId,
          engineeringRow: match.engineering._rowIndex,
          discoverySource: match.discovered?._sourceId,
          discoveryRow: match.discovered?._rowIndex
        }
      }
    })

    // 4. ASSEMBLE OUTPUT BY LEVEL
    const response = assembleOutput(
      canonicalAssets,
      matchResults.blindSpots,
      matchResults.orphans,
      matchResults.stats,
      provenance,
      outputLevel
    )

    provenance.record({ type: 'PIPELINE_COMPLETE', outputLevel, assetCount: canonicalAssets.length })

    return res.status(200).json(response)

  } catch (error) {
    console.error('[CANONIZE API] Error:', error)
    provenance.record({ type: 'ERROR', message: error.message })
    
    return res.status(500).json({
      error: error.message,
      audit: provenance.generateAuditPackage([], {})
    })
  }
}


