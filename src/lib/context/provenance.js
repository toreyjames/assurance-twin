/**
 * PROVENANCE TRACKER
 * Full audit trail for every operation in the canonization pipeline
 * 
 * Based on AIGNE Framework principles (arXiv:2512.05470):
 * "context artefacts... must be traceable and accountable"
 */

export class ProvenanceTracker {
  constructor(sessionId = null) {
    this.sessionId = sessionId || crypto.randomUUID()
    this.events = []
    this.startTime = new Date().toISOString()
    this.sources = new Map() // Track all ingested sources
    this.pipelineVersion = 'assurance-twin-v1'
    this.hashAlgorithm = 'SHA-256'
  }

  /**
   * Record a pipeline event
   */
  record(event) {
    this.events.push({
      ...event,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      sequence: this.events.length
    })
    return this
  }

  /**
   * Record source ingestion with checksum
   */
  recordSourceIngestion(sourceId, filename, checksum, rowCount, detectedType) {
    const sourceChecksum = checksum || simpleHash(`${filename}|${rowCount}|${detectedType}|${sourceId}`)
    this.sources.set(sourceId, { filename, checksum: sourceChecksum, rowCount, detectedType })
    return this.record({
      type: 'SOURCE_INGESTED',
      sourceId,
      filename,
      checksum: sourceChecksum,
      rowCount,
      detectedType
    })
  }

  /**
   * Record a match operation
   */
  recordMatch(assetId, strategy, engineeringSource, discoverySource, confidence) {
    return this.record({
      type: 'ASSET_MATCHED',
      assetId,
      strategy,
      engineeringSource,
      discoverySource,
      confidence
    })
  }

  /**
   * Record classification decision
   */
  recordClassification(assetId, tier, reason) {
    return this.record({
      type: 'CLASSIFICATION',
      assetId,
      tier,
      reason
    })
  }

  /**
   * Record human review decision
   */
  recordHumanReview(assetId, decision, reviewer = 'user') {
    return this.record({
      type: 'HUMAN_REVIEW',
      assetId,
      decision,
      reviewer
    })
  }

  /**
   * Generate SHA-256 hash for evidence
   */
  async generateEvidenceHash(data) {
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(JSON.stringify(data))
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Generate full audit package
   */
  async generateAuditPackage(canonicalAssets, kpis) {
    const sourceProfiles = Array.from(this.sources.entries()).map(([sourceId, source]) => ({
      sourceId,
      filename: source.filename,
      checksum: source.checksum,
      rowCount: source.rowCount,
      detectedType: source.detectedType
    }))

    const eventChain = []
    let prevHash = 'ROOT'
    for (const event of this.events) {
      const eventHash = await this.generateEvidenceHash({ prevHash, event })
      eventChain.push({ ...event, prevHash, eventHash })
      prevHash = eventHash
    }

    const evidenceData = {
      sessionId: this.sessionId,
      timestamp: this.startTime,
      sourceCount: this.sources.size,
      sourceChecksums: sourceProfiles.map(s => s.checksum),
      assetCount: canonicalAssets.length,
      kpis,
      pipelineVersion: this.pipelineVersion,
      finalEventHash: prevHash
    }

    const evidenceHash = await this.generateEvidenceHash({
      evidenceData,
      eventChainHash: prevHash
    })
    const pipelinePhases = [...new Set(this.events.map(e => e.type).filter(Boolean))]

    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      endTime: new Date().toISOString(),
      auditVersion: '2026-05',
      hashAlgorithm: this.hashAlgorithm,
      pipelineVersion: this.pipelineVersion,
      evidenceHash,
      finalEventHash: prevHash,
      summary: {
        sourcesIngested: this.sources.size,
        totalEvents: this.events.length,
        matchEvents: this.events.filter(e => e.type === 'ASSET_MATCHED').length,
        classificationEvents: this.events.filter(e => e.type === 'CLASSIFICATION').length,
        humanReviewEvents: this.events.filter(e => e.type === 'HUMAN_REVIEW').length,
        pipelinePhases
      },
      sources: sourceProfiles,
      events: eventChain,
      traceability: {
        chainOfCustody: 'Client-side processing. No external data egress by default pipeline.',
        generatedBy: 'ProvenanceTracker',
        generatedAt: new Date().toISOString()
      }
    }
  }

  /**
   * Get provenance for a specific asset
   */
  getAssetProvenance(assetId) {
    return this.events.filter(e => e.assetId === assetId)
  }
}

/**
 * Simple hash function for browser (fallback if crypto.subtle not available)
 */
export function simpleHash(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}

export default ProvenanceTracker


