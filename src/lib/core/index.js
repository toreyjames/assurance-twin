/**
 * ASSURANCE TWIN CORE ENGINE
 * 
 * Clean headless API for OT asset canonization, gap analysis,
 * compliance mapping, and report generation.
 * 
 * This module has ZERO UI dependencies — it can run in:
 *   - Browser (via React UI)
 *   - Node.js CLI
 *   - Serverless API endpoint
 *   - CI/CD pipeline
 * 
 * Usage:
 *   import { AssuranceEngine } from './lib/core'
 *   
 *   const engine = new AssuranceEngine({ industry: 'automotive' })
 *   const report = engine.generateReport(result, contextAnalysis)
 *   const csv = engine.exportGapMatrix(report)
 *   const md = engine.exportExecutiveSummary(report)
 */

import { ReportGenerator } from './report-generator.js'

export { ComplianceMapper, IEC_62443, NIST_CSF, GAP_COMPLIANCE_RULES } from './compliance-mapper.js'
export { ReportGenerator } from './report-generator.js'

/**
 * Convenience facade that wires compliance + reporting together
 */
export class AssuranceEngine {
  constructor(options = {}) {
    this.options = options
    this._reportGen = null
  }

  get reportGenerator() {
    if (!this._reportGen) {
      this._reportGen = new ReportGenerator(this.options)
    }
    return this._reportGen
  }

  /**
   * Generate full engagement report
   * @param {Object} result - canonization result (assets, summary, blindSpots, orphans)
   * @param {Object} contextAnalysis - { gaps, risks, dependencies, lifecycle }
   */
  generateReport(result, contextAnalysis) {
    return this.reportGenerator.generateReport(result, contextAnalysis)
  }

  /**
   * Export gap matrix as CSV
   */
  exportGapMatrix(report) {
    return this.reportGenerator.toGapMatrixCSV(report)
  }

  /**
   * Export executive summary as markdown
   */
  exportExecutiveSummary(report) {
    return this.reportGenerator.toExecutiveMarkdown(report)
  }

  /**
   * Export risk heat map as CSV
   */
  exportRiskHeatMap(report) {
    return this.reportGenerator.toRiskHeatMapCSV(report)
  }
}

export default AssuranceEngine
