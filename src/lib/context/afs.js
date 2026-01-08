/**
 * AGENTIC FILE SYSTEM (AFS)
 * 
 * Based on AIGNE Framework principles (arXiv:2512.05470):
 * "The Agentic File System... treats all context sources as files in a 
 * governed, persistent, and hierarchical file system for enhanced 
 * traceability and accountability."
 * 
 * Key concepts:
 * - Files are first-class citizens with identity that persists
 * - All context (sources, outputs, intermediate states) are "files"
 * - Hierarchical organization (sources → canonical → outputs)
 * - Full lineage tracking between files
 */

const AFS_STORAGE_KEY = 'ot_afs_registry'

/**
 * File types in the AFS
 */
export const FileType = {
  SOURCE_ENGINEERING: 'source/engineering',
  SOURCE_DISCOVERY: 'source/discovery', 
  SOURCE_OTHER: 'source/other',
  CANONICAL_ASSETS: 'canonical/assets',
  CANONICAL_BLIND_SPOTS: 'canonical/blind_spots',
  CANONICAL_ORPHANS: 'canonical/orphans',
  OUTPUT_CSV: 'output/csv',
  OUTPUT_AUDIT: 'output/audit',
  REVIEW_DECISIONS: 'review/decisions'
}

/**
 * File processing status
 */
export const FileStatus = {
  REGISTERED: 'registered',    // File known to system
  INGESTED: 'ingested',        // Content parsed
  NORMALIZED: 'normalized',    // Data normalized
  MATCHED: 'matched',          // Participated in matching
  CLASSIFIED: 'classified',    // Assets classified
  EXPORTED: 'exported'         // Output generated
}

/**
 * Agentic File System Registry
 * Manages all files in the canonization context
 */
export class AgenticFileSystem {
  constructor(sessionId = null) {
    this.sessionId = sessionId || crypto.randomUUID()
    this.files = new Map()
    this.relationships = [] // Track file lineage
    this.createdAt = new Date().toISOString()
    
    // Try to restore from storage
    this._restore()
  }

  /**
   * Register a new file in the AFS
   */
  registerFile(options) {
    const {
      name,
      type,
      content = null,
      contentHash = null,
      metadata = {}
    } = options

    const fileId = `${this.sessionId}:${type}:${crypto.randomUUID().slice(0, 8)}`
    
    const file = {
      id: fileId,
      name,
      type,
      status: FileStatus.REGISTERED,
      contentHash: contentHash || (content ? this._hashContent(content) : null),
      
      // Metadata
      metadata: {
        ...metadata,
        registeredAt: new Date().toISOString(),
        size: content?.length || 0
      },
      
      // Data (can be null if not loaded)
      rowCount: null,
      schema: null,
      detectedType: null,
      
      // Lineage
      derivedFrom: [], // Parent file IDs
      derivedTo: [],   // Child file IDs
      
      // Processing history
      history: [{
        status: FileStatus.REGISTERED,
        timestamp: new Date().toISOString()
      }]
    }

    this.files.set(fileId, file)
    this._persist()
    
    console.log(`[AFS] Registered file: ${name} (${fileId})`)
    return fileId
  }

  /**
   * Update file after ingestion
   */
  markIngested(fileId, { rowCount, schema, detectedType }) {
    const file = this.files.get(fileId)
    if (!file) throw new Error(`File not found: ${fileId}`)
    
    file.status = FileStatus.INGESTED
    file.rowCount = rowCount
    file.schema = schema
    file.detectedType = detectedType
    file.metadata.ingestedAt = new Date().toISOString()
    file.history.push({
      status: FileStatus.INGESTED,
      timestamp: new Date().toISOString(),
      rowCount
    })
    
    this._persist()
    console.log(`[AFS] Ingested: ${file.name} - ${rowCount} rows, type: ${detectedType}`)
    return this
  }

  /**
   * Record file derivation (lineage)
   */
  recordDerivation(parentIds, childId, operation) {
    const child = this.files.get(childId)
    if (!child) throw new Error(`Child file not found: ${childId}`)
    
    // Update child's derivedFrom
    child.derivedFrom = [...new Set([...child.derivedFrom, ...parentIds])]
    
    // Update parents' derivedTo
    parentIds.forEach(parentId => {
      const parent = this.files.get(parentId)
      if (parent) {
        parent.derivedTo = [...new Set([...parent.derivedTo, childId])]
      }
    })
    
    // Record relationship
    this.relationships.push({
      parentIds,
      childId,
      operation,
      timestamp: new Date().toISOString()
    })
    
    this._persist()
    console.log(`[AFS] Derivation: ${parentIds.length} sources → ${childId} via ${operation}`)
    return this
  }

  /**
   * Get file by ID
   */
  getFile(fileId) {
    return this.files.get(fileId)
  }

  /**
   * Get all files of a type
   */
  getFilesByType(type) {
    return Array.from(this.files.values()).filter(f => f.type === type)
  }

  /**
   * Get all source files
   */
  getSources() {
    return Array.from(this.files.values()).filter(f => 
      f.type.startsWith('source/')
    )
  }

  /**
   * Get file lineage (ancestors)
   */
  getLineage(fileId) {
    const file = this.files.get(fileId)
    if (!file) return []
    
    const lineage = []
    const visited = new Set()
    
    const traverse = (id) => {
      if (visited.has(id)) return
      visited.add(id)
      
      const f = this.files.get(id)
      if (!f) return
      
      lineage.push({
        id: f.id,
        name: f.name,
        type: f.type,
        status: f.status
      })
      
      f.derivedFrom.forEach(traverse)
    }
    
    file.derivedFrom.forEach(traverse)
    return lineage
  }

  /**
   * Get full catalog (for display)
   */
  getCatalog() {
    return {
      sessionId: this.sessionId,
      createdAt: this.createdAt,
      fileCount: this.files.size,
      files: Array.from(this.files.values()).map(f => ({
        id: f.id,
        name: f.name,
        type: f.type,
        status: f.status,
        rowCount: f.rowCount,
        detectedType: f.detectedType,
        registeredAt: f.metadata.registeredAt
      })),
      relationships: this.relationships
    }
  }

  /**
   * Export file catalog as JSON
   */
  exportCatalog() {
    return JSON.stringify(this.getCatalog(), null, 2)
  }

  /**
   * Clear all files (reset)
   */
  clear() {
    this.files.clear()
    this.relationships = []
    this._persist()
    console.log('[AFS] Cleared all files')
  }

  // ===== Internal Methods =====

  _hashContent(content) {
    // Simple hash for content fingerprinting
    let hash = 0
    const str = typeof content === 'string' ? content : JSON.stringify(content)
    for (let i = 0; i < Math.min(str.length, 10000); i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16).padStart(8, '0')
  }

  _persist() {
    try {
      const data = {
        sessionId: this.sessionId,
        createdAt: this.createdAt,
        files: Array.from(this.files.entries()),
        relationships: this.relationships
      }
      localStorage.setItem(AFS_STORAGE_KEY, JSON.stringify(data))
    } catch (err) {
      console.warn('[AFS] Failed to persist:', err)
    }
  }

  _restore() {
    try {
      const stored = localStorage.getItem(AFS_STORAGE_KEY)
      if (!stored) return
      
      const data = JSON.parse(stored)
      
      // Only restore if same session or recent
      const hoursSince = (Date.now() - new Date(data.createdAt).getTime()) / (1000 * 60 * 60)
      if (hoursSince > 24) {
        console.log('[AFS] Session expired, starting fresh')
        localStorage.removeItem(AFS_STORAGE_KEY)
        return
      }
      
      this.sessionId = data.sessionId
      this.createdAt = data.createdAt
      this.files = new Map(data.files)
      this.relationships = data.relationships || []
      
      console.log(`[AFS] Restored session with ${this.files.size} files`)
    } catch (err) {
      console.warn('[AFS] Failed to restore:', err)
    }
  }
}

/**
 * Singleton AFS instance for the application
 */
let _afsInstance = null

export function getAFS() {
  if (!_afsInstance) {
    _afsInstance = new AgenticFileSystem()
  }
  return _afsInstance
}

export function resetAFS() {
  if (_afsInstance) {
    _afsInstance.clear()
  }
  _afsInstance = new AgenticFileSystem()
  return _afsInstance
}

export default AgenticFileSystem


