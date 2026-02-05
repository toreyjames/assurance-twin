/**
 * ENGAGEMENT REPORT GENERATOR
 * Produces audit-ready deliverables from canonization results
 * 
 * Generates structured data for:
 *   1. Executive Summary    — One-page findings for CISO readout
 *   2. Gap Matrix           — Detailed gap-to-control mapping table
 *   3. Risk Heat Map        — Unit × severity matrix
 *   4. Compliance Findings  — IEC 62443 / NIST CSF compliance posture
 *   5. Evidence Package     — Full provenance chain for audit trail
 * 
 * Output formats:
 *   - JSON (structured data for UI rendering)
 *   - CSV (for client Excel consumption)
 *   - Markdown (for report assembly)
 */

import { ComplianceMapper } from './compliance-mapper.js'

// =============================================================================
// REPORT GENERATOR
// =============================================================================

export class ReportGenerator {
  constructor(options = {}) {
    this.industry = options.industry || 'automotive'
    this.clientName = options.clientName || 'Client'
    this.plantName = options.plantName || 'All Sites'
    this.engagementId = options.engagementId || `ENG-${Date.now().toString(36).toUpperCase()}`
    this.assessor = options.assessor || 'OT Assurance Twin'
    this.date = new Date().toISOString().split('T')[0]
    this.complianceMapper = new ComplianceMapper(this.industry)
  }

  /**
   * Generate complete engagement report from canonization results
   * @param {Object} result - canonization result object
   * @param {Object} contextAnalysis - { gaps, risks, dependencies, lifecycle }
   * @returns {Object} structured report data
   */
  generateReport(result, contextAnalysis = {}) {
    const assets = result?.assets || []
    const summary = result?.summary || {}
    const gaps = contextAnalysis.gaps || []
    const risks = contextAnalysis.risks || {}

    // Map gaps to compliance controls
    const complianceFindings = this.complianceMapper.mapGaps(gaps)
    const complianceSummary = this.complianceMapper.generateComplianceSummary(complianceFindings)
    const unitCompliance = this.complianceMapper.generateUnitCompliance(complianceFindings)

    return {
      metadata: this._buildMetadata(assets, summary),
      executiveSummary: this._buildExecutiveSummary(assets, summary, gaps, complianceSummary, risks),
      gapMatrix: this._buildGapMatrix(gaps, complianceFindings),
      riskHeatMap: this._buildRiskHeatMap(assets, gaps, risks),
      compliancePosture: this._buildCompliancePosture(complianceSummary, unitCompliance, complianceFindings),
      evidencePackage: this._buildEvidencePackage(result, contextAnalysis, complianceFindings),
      recommendations: this._buildRecommendations(gaps, complianceFindings, risks),
      // Raw data for custom rendering
      _raw: { complianceFindings, complianceSummary, unitCompliance }
    }
  }

  // ===========================================================================
  // METADATA
  // ===========================================================================

  _buildMetadata(assets, summary) {
    return {
      reportTitle: `OT Asset Assurance Assessment`,
      client: this.clientName,
      plant: this.plantName,
      industry: this.industry,
      engagementId: this.engagementId,
      assessor: this.assessor,
      date: this.date,
      generatedAt: new Date().toISOString(),
      scope: {
        totalAssets: assets.length,
        matchedAssets: summary.matched || 0,
        blindSpots: summary.blindSpots || 0,
        orphans: summary.orphans || 0,
        coverage: summary.coverage || 0
      },
      classification: 'CONFIDENTIAL — CLIENT PROPRIETARY'
    }
  }

  // ===========================================================================
  // EXECUTIVE SUMMARY
  // ===========================================================================

  _buildExecutiveSummary(assets, summary, gaps, complianceSummary, risks) {
    const tier1 = assets.filter(a => a.classification?.tier === 1).length
    const tier2 = assets.filter(a => a.classification?.tier === 2).length
    const tier3 = assets.filter(a => a.classification?.tier === 3).length
    const coverage = summary.coverage || 0

    // =====================================================================
    // THE THREE QUESTIONS — this is what the CISO is paying for
    // =====================================================================
    // Q1: How many assets do we have?
    const totalAssets = assets.length
    const blindSpots = summary.blindSpots || 0
    const orphans = summary.orphans || 0

    // Q2: How do we know that?
    const matchedCount = summary.matched || 0
    const matchRate = totalAssets > 0 ? Math.round((matchedCount / (summary.total || 1)) * 100) : 0
    const evidenceBasis = coverage >= 80 ? 'HIGH CONFIDENCE' :
                          coverage >= 60 ? 'MODERATE CONFIDENCE' :
                          coverage >= 30 ? 'LOW CONFIDENCE' : 'INSUFFICIENT EVIDENCE'

    // Q3: Are the devices that need cyber management actually managed?
    const needsManagement = assets.filter(a => a.classification?.tier === 1 || a.classification?.tier === 2)
    const needsManagementCount = needsManagement.length
    const actuallyManaged = needsManagement.filter(a => a.is_managed === true || a.is_managed === 'true')
    const actuallyManagedCount = actuallyManaged.length
    const unmanagedCritical = needsManagementCount - actuallyManagedCount
    const managementRate = needsManagementCount > 0
      ? Math.round((actuallyManagedCount / needsManagementCount) * 100) : 0

    const threeQuestions = {
      q1_assetCount: {
        question: 'How many OT assets do we have?',
        answer: `${totalAssets} canonical assets identified from ${summary.total || 0} engineering records + ${orphans} discovered-only devices.`,
        total: totalAssets,
        fromEngineering: summary.total || 0,
        orphansFound: orphans,
        blindSpots
      },
      q2_howWeKnow: {
        question: 'How do we know that?',
        answer: `${matchRate}% of engineering baseline verified against network discovery (${matchedCount} matched). ${blindSpots} documented assets were NOT found on the network. ${orphans} undocumented devices were found.`,
        confidence: evidenceBasis,
        coveragePercent: coverage,
        matchRate,
        matchedCount,
        strategies: '6-strategy matching: Tag ID, IP, Hostname, MAC, Fuzzy, Intelligent Pairing'
      },
      q3_areTheyManaged: {
        question: 'Are the devices that need cyber management actually managed?',
        answer: needsManagementCount > 0
          ? `${needsManagementCount} assets require cyber management (Tier 1 + Tier 2). Of those, ${actuallyManagedCount} (${managementRate}%) are confirmed managed. ${unmanagedCritical} are NOT managed.`
          : 'No assets classified as requiring cyber management (Tier 1/2). Review classification criteria.',
        needsManagement: needsManagementCount,
        actuallyManaged: actuallyManagedCount,
        unmanaged: unmanagedCritical,
        managementRate,
        tier1Unmanaged: assets.filter(a => a.classification?.tier === 1 && a.is_managed !== true && a.is_managed !== 'true').length,
        tier2Unmanaged: assets.filter(a => a.classification?.tier === 2 && a.is_managed !== true && a.is_managed !== 'true').length
      }
    }

    // Determine overall posture
    // This must account for: findings severity, coverage gaps, AND data quality.
    // "ACCEPTABLE" should be HARD to achieve — it means we looked thoroughly
    // and found nothing significant. In OT, that's rare.
    let overallPosture = 'NEEDS REVIEW'
    let postureColor = '#f59e0b'

    const hasCritical = complianceSummary.bySeverity.critical > 0
    const hasHigh = complianceSummary.bySeverity.high > 0
    const highCount = complianceSummary.bySeverity.high || 0
    const lowCoverage = coverage < 60
    const veryLowCoverage = coverage < 30
    const manyOrphans = (summary.orphans || 0) > 20
    const manyBlindSpots = (summary.blindSpots || 0) > assets.length * 0.3
    const noFindings = complianceSummary.bySeverity.critical === 0 &&
                       complianceSummary.bySeverity.high === 0 &&
                       complianceSummary.bySeverity.medium === 0

    if (hasCritical || veryLowCoverage) {
      overallPosture = 'CRITICAL — IMMEDIATE ACTION REQUIRED'
      postureColor = '#ef4444'
    } else if (highCount > 3 || (lowCoverage && hasHigh)) {
      overallPosture = 'SIGNIFICANT GAPS IDENTIFIED'
      postureColor = '#f97316'
    } else if (hasHigh || lowCoverage || manyOrphans || manyBlindSpots) {
      overallPosture = 'IMPROVEMENT NEEDED'
      postureColor = '#f59e0b'
    } else if (noFindings && coverage >= 80) {
      // Only "ACCEPTABLE" if we actually have good coverage AND no findings
      overallPosture = 'ACCEPTABLE — MONITOR CONTINUOUSLY'
      postureColor = '#22c55e'
    } else if (noFindings) {
      // No findings but coverage isn't great — suspicious
      overallPosture = 'INSUFFICIENT DATA FOR ASSESSMENT'
      postureColor = '#64748b'
    }

    // Key findings
    const keyFindings = []

    // ALWAYS lead with a coverage finding — it frames the entire assessment
    if (coverage < 30) {
      keyFindings.push({
        severity: 'critical',
        finding: `Discovery coverage is only ${coverage}%. The majority of documented assets are invisible to monitoring.`,
        implication: 'Assessment reliability is LOW. Findings may significantly understate actual risk because most of the plant is not being observed.',
        reference: 'IEC 62443 SR 6.2, NIST CSF DE.CM-1'
      })
    } else if (coverage < 60) {
      keyFindings.push({
        severity: 'high',
        finding: `Discovery coverage is ${coverage}% — over ${100 - coverage}% of documented assets were not found on the network.`,
        implication: 'Significant blind spots exist in network monitoring. Undiscovered assets cannot be protected.',
        reference: 'IEC 62443 SR 6.2, NIST CSF DE.CM-1'
      })
    } else if (coverage < 80) {
      keyFindings.push({
        severity: 'medium',
        finding: `Discovery coverage is ${coverage}%. While above average, ${100 - coverage}% of assets remain unverified.`,
        implication: 'Good baseline coverage but gaps remain. Target >80% for reliable assurance posture.',
        reference: 'IEC 62443 SR 6.2'
      })
    } else {
      keyFindings.push({
        severity: 'info',
        finding: `Discovery coverage is ${coverage}%. Strong alignment between engineering baseline and network reality.`,
        implication: 'High coverage enables reliable gap detection and risk assessment.',
        reference: 'IEC 62443 SR 6.2'
      })
    }

    // If zero compliance findings, flag that as itself a finding
    if (noFindings && gaps.length === 0) {
      keyFindings.push({
        severity: 'medium',
        finding: 'Zero compliance findings generated. This is unusual for any OT environment.',
        implication: 'Either the data lacks sufficient detail for gap detection (e.g., missing unit/area fields), or the environment has been recently remediated. Manual verification recommended.',
        reference: 'Assessment methodology validation'
      })
    }

    if (summary.orphans > 20) {
      keyFindings.push({
        severity: 'high',
        finding: `${summary.orphans} undocumented devices detected on the OT network.`,
        implication: 'Unauthorized or undocumented devices increase attack surface and complicate incident response.',
        reference: 'IEC 62443 SR 1.2, NIST CSF DE.CM-7'
      })
    }

    const criticalGaps = gaps.filter(g => g.severity === 'critical')
    if (criticalGaps.length > 0) {
      const units = [...new Set(criticalGaps.map(g => g.unit).filter(Boolean))]
      keyFindings.push({
        severity: 'critical',
        finding: `${criticalGaps.length} critical gaps identified across ${units.length} process unit(s).`,
        implication: 'Critical control functions may be unmonitored or unprotected. Immediate review recommended.',
        reference: 'IEC 62443 SR 3.3, SR 7.1'
      })
    }

    if (tier1 > 0) {
      keyFindings.push({
        severity: 'info',
        finding: `${tier1} Tier 1 (critical control) assets identified and classified.`,
        implication: 'These assets require priority hardening, monitoring, and incident response coverage.',
        reference: 'IEC 62443 SL-T assignment'
      })
    }

    const noRedundancy = gaps.filter(g => g.type === 'no_redundancy')
    if (noRedundancy.length > 0) {
      keyFindings.push({
        severity: 'high',
        finding: `${noRedundancy.length} critical functions have no redundancy (single point of failure).`,
        implication: 'A single device failure could impact plant safety or production.',
        reference: 'IEC 62443 SR 7.1, NIST CSF RC.RP-1'
      })
    }

    // THE BIG ONE: Unmanaged critical devices
    if (unmanagedCritical > 0) {
      keyFindings.push({
        severity: unmanagedCritical > needsManagementCount * 0.5 ? 'critical' : 'high',
        finding: `${unmanagedCritical} of ${needsManagementCount} devices requiring cyber management are NOT managed (${100 - managementRate}% gap).`,
        implication: `These are Tier 1/2 assets (PLCs, DCS, HMIs, safety systems) that are on the network but lack security management — patching, monitoring, access control. This is the primary risk exposure.`,
        reference: 'IEC 62443 SR 1.1, SR 2.1, NIST CSF PR.AC-1, PR.IP-1'
      })
    }

    return {
      // THE THREE QUESTIONS — front and center
      threeQuestions,
      overallPosture,
      postureColor,
      complianceScore: complianceSummary.complianceScore,
      assetBreakdown: { total: assets.length, tier1, tier2, tier3 },
      managementMetrics: {
        needsManagement: needsManagementCount,
        actuallyManaged: actuallyManagedCount,
        unmanaged: unmanagedCritical,
        managementRate
      },
      coverageMetrics: {
        discoveryRate: coverage,
        blindSpots: summary.blindSpots || 0,
        orphans: summary.orphans || 0,
        matchRate
      },
      gapSummary: complianceSummary.bySeverity,
      keyFindings,
      controlsImpacted: {
        iec62443: `${complianceSummary.iecControlsImpacted} of ${complianceSummary.iecControlsTotal}`,
        nistCsf: `${complianceSummary.nistControlsImpacted} of ${complianceSummary.nistControlsTotal}`
      }
    }
  }

  // ===========================================================================
  // GAP MATRIX
  // ===========================================================================

  _buildGapMatrix(gaps, complianceFindings) {
    // Group by unit
    const byUnit = {}
    gaps.forEach(gap => {
      const unit = gap.unit || 'Unassigned'
      if (!byUnit[unit]) byUnit[unit] = { unit, gaps: [], critical: 0, high: 0, medium: 0, low: 0 }
      byUnit[unit].gaps.push(gap)
      byUnit[unit][gap.severity] = (byUnit[unit][gap.severity] || 0) + 1
    })

    // Group by type
    const byType = {}
    gaps.forEach(gap => {
      const type = gap.type
      if (!byType[type]) byType[type] = { type, count: 0, units: new Set() }
      byType[type].count++
      if (gap.unit) byType[type].units.add(gap.unit)
    })

    // Detailed findings table (for CSV/Excel export)
    const findings = complianceFindings.map((f, i) => ({
      id: `F-${String(i + 1).padStart(3, '0')}`,
      unit: f.unit,
      gapType: f.gapType,
      severity: f.complianceSeverity,
      finding: f.finding,
      iecControls: f.iec62443.map(c => c.id).join(', '),
      nistControls: f.nistCsf.map(c => c.id).join(', '),
      recommendation: f.recommendation
    }))

    return {
      byUnit: Object.values(byUnit).sort((a, b) => (b.critical * 10 + b.high * 5) - (a.critical * 10 + a.high * 5)),
      byType: Object.values(byType).map(t => ({ ...t, units: [...t.units] })),
      findings,
      totalGaps: gaps.length,
      totalFindings: complianceFindings.length
    }
  }

  // ===========================================================================
  // RISK HEAT MAP
  // ===========================================================================

  _buildRiskHeatMap(assets, gaps, risks) {
    const units = {}

    // Aggregate by unit
    assets.forEach(a => {
      const unit = a.unit || a.area || 'Unassigned'
      if (!units[unit]) {
        units[unit] = { unit, assets: 0, tier1: 0, tier2: 0, gaps: 0, criticalGaps: 0, riskScore: 0 }
      }
      units[unit].assets++
      if (a.classification?.tier === 1) units[unit].tier1++
      if (a.classification?.tier === 2) units[unit].tier2++
    })

    // Add gap counts
    gaps.forEach(g => {
      const unit = g.unit || 'Unassigned'
      if (units[unit]) {
        units[unit].gaps++
        if (g.severity === 'critical') units[unit].criticalGaps++
      }
    })

    // Compute risk score per unit
    Object.values(units).forEach(u => {
      u.riskScore = (u.criticalGaps * 25) + (u.gaps * 5) + (u.tier1 * 10) - (u.assets > 0 ? 5 : 0)
      u.riskLevel = u.riskScore >= 50 ? 'critical' : u.riskScore >= 25 ? 'high' : u.riskScore >= 10 ? 'medium' : 'low'
    })

    return {
      units: Object.values(units).sort((a, b) => b.riskScore - a.riskScore),
      // For the heat map grid: rows = units, cols = risk dimensions
      dimensions: ['Asset Count', 'Critical Assets', 'Gap Count', 'Critical Gaps', 'Risk Score']
    }
  }

  // ===========================================================================
  // COMPLIANCE POSTURE
  // ===========================================================================

  _buildCompliancePosture(complianceSummary, unitCompliance, findings) {
    // NIST CSF function breakdown
    const nistFunctions = ['IDENTIFY', 'PROTECT', 'DETECT', 'RESPOND', 'RECOVER'].map(fn => ({
      function: fn,
      findingsCount: complianceSummary.byFunction[fn] || 0,
      status: (complianceSummary.byFunction[fn] || 0) === 0 ? 'passing' :
              (complianceSummary.byFunction[fn] || 0) > 5 ? 'failing' : 'partial'
    }))

    return {
      overallScore: complianceSummary.complianceScore,
      nistFunctions,
      iecZones: complianceSummary.byZone,
      topImpactedControls: complianceSummary.topControls,
      unitPosture: unitCompliance.slice(0, 15), // Top 15 units by risk
      bySeverity: complianceSummary.bySeverity
    }
  }

  // ===========================================================================
  // EVIDENCE PACKAGE
  // ===========================================================================

  _buildEvidencePackage(result, contextAnalysis, complianceFindings) {
    return {
      methodology: {
        framework: 'AIGNE Context Engineering Framework (arXiv:2512.05470)',
        phases: [
          'Context Construction — Multi-source data ingestion and normalization',
          'Context Matching — 6-strategy asset correlation (tag_id, IP, hostname, MAC, fuzzy, intelligent)',
          'Context Evaluation — Security tier classification and cross-validation',
          'Context Analysis — Gap detection, risk scoring, dependency mapping',
          'Compliance Mapping — IEC 62443 and NIST CSF control requirement mapping',
          'Human Review — Checkpoint for low-confidence matches and anomalies'
        ],
        matchingStrategies: [
          'Exact Tag ID match',
          'IP address correlation',
          'Hostname matching',
          'MAC address matching',
          'Fuzzy string matching (Levenshtein distance)',
          'Intelligent pairing (multi-field composite)'
        ]
      },
      dataSources: {
        engineering: {
          description: 'Engineering baseline documentation (P&IDs, instrument index, asset register)',
          recordCount: result?.summary?.total || 0
        },
        discovery: {
          description: 'OT network discovery scan results (Claroty, Nozomi, or equivalent)',
          recordCount: (result?.summary?.total || 0) - (result?.summary?.blindSpots || 0) + (result?.summary?.orphans || 0)
        }
      },
      auditTrail: {
        assessmentDate: this.date,
        assessor: this.assessor,
        engagementId: this.engagementId,
        toolVersion: 'OT Assurance Twin v2.0',
        findingsCount: complianceFindings.length,
        reviewStatus: result?.reviewComplete ? 'REVIEWED' : 'PENDING REVIEW'
      },
      chainOfCustody: 'All data processed client-side. No data transmitted to external servers.',
      disclaimer: 'This assessment is based on data provided. Findings should be validated through physical verification and additional testing.'
    }
  }

  // ===========================================================================
  // RECOMMENDATIONS
  // ===========================================================================

  _buildRecommendations(gaps, complianceFindings, risks) {
    const recommendations = []
    const seen = new Set()

    // Priority 1: Critical compliance findings
    const criticalFindings = complianceFindings.filter(f => f.complianceSeverity === 'critical')
    if (criticalFindings.length > 0) {
      recommendations.push({
        priority: 1,
        category: 'IMMEDIATE ACTION',
        title: 'Address Critical Compliance Gaps',
        description: `${criticalFindings.length} findings require immediate attention to meet IEC 62443 and NIST CSF requirements.`,
        effort: 'High',
        timeline: '0–30 days',
        items: criticalFindings.slice(0, 5).map(f => ({
          finding: f.finding,
          unit: f.unit,
          controls: [...f.iec62443.map(c => c.id), ...f.nistCsf.map(c => c.id)].join(', ')
        }))
      })
    }

    // Priority 2: Discovery coverage
    const blindSpots = gaps.filter(g => g.type === 'blind_spot')
    if (blindSpots.length > 20) {
      recommendations.push({
        priority: 2,
        category: 'DISCOVERY IMPROVEMENT',
        title: 'Expand OT Network Discovery Coverage',
        description: `${blindSpots.length} documented assets not visible on the network. Review discovery tool placement, network architecture, and scanning configuration.`,
        effort: 'Medium',
        timeline: '30–60 days',
        items: [
          { action: 'Review discovery tool placement — ensure all network segments are covered' },
          { action: 'Verify asset connectivity — some devices may be offline or air-gapped' },
          { action: 'Update engineering baseline — remove decommissioned assets' },
          { action: 'Add passive monitoring to previously unmonitored segments' }
        ]
      })
    }

    // Priority 3: Orphan remediation
    const orphans = gaps.filter(g => g.type === 'orphan')
    if (orphans.length > 10) {
      recommendations.push({
        priority: 3,
        category: 'ASSET MANAGEMENT',
        title: 'Investigate and Document Orphan Devices',
        description: `${orphans.length} devices found on the network are not in the engineering baseline. Each requires investigation and documentation.`,
        effort: 'Medium',
        timeline: '30–90 days',
        items: [
          { action: 'Categorize orphans: temporary, contractor, shadow OT, or documentation gap' },
          { action: 'Update engineering baseline with legitimate devices' },
          { action: 'Remove or isolate unauthorized devices' },
          { action: 'Establish change management process for new device deployment' }
        ]
      })
    }

    // Priority 4: Redundancy gaps
    const noRedundancy = gaps.filter(g => g.type === 'no_redundancy')
    if (noRedundancy.length > 0) {
      recommendations.push({
        priority: 4,
        category: 'RESILIENCE',
        title: 'Address Single Points of Failure',
        description: `${noRedundancy.length} critical control functions lack redundancy. A single device failure could impact safety or production.`,
        effort: 'High',
        timeline: '60–180 days',
        items: noRedundancy.slice(0, 5).map(g => ({
          unit: g.unit,
          function: g.functionDescription || g.function,
          device: g.singlePointOfFailure
        }))
      })
    }

    // Priority 5: Continuous monitoring
    recommendations.push({
      priority: 5,
      category: 'PROGRAM MATURITY',
      title: 'Establish Continuous OT Asset Monitoring',
      description: 'Move from point-in-time assessments to continuous assurance through automated asset discovery and gap detection.',
      effort: 'High',
      timeline: '90–365 days',
      items: [
        { action: 'Deploy continuous OT discovery (Claroty/Nozomi/Armis)' },
        { action: 'Integrate with CMDB/asset management for automated baseline updates' },
        { action: 'Establish quarterly re-assessment cadence' },
        { action: 'Define KPIs: coverage %, orphan count, gap closure rate' }
      ]
    })

    return recommendations
  }

  // ===========================================================================
  // EXPORT FORMATTERS
  // ===========================================================================

  /**
   * Export gap matrix as CSV string
   */
  toGapMatrixCSV(report) {
    const findings = report.gapMatrix.findings
    if (findings.length === 0) return 'No findings'

    const headers = ['ID', 'Unit', 'Gap Type', 'Severity', 'Finding', 'IEC 62443 Controls', 'NIST CSF Controls', 'Recommendation']
    const rows = findings.map(f => [
      f.id,
      `"${f.unit}"`,
      f.gapType,
      f.severity,
      `"${f.finding}"`,
      `"${f.iecControls}"`,
      `"${f.nistControls}"`,
      `"${f.recommendation}"`
    ])

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  }

  /**
   * Export executive summary as markdown
   */
  toExecutiveMarkdown(report) {
    const meta = report.metadata
    const exec = report.executiveSummary

    let md = `# OT Asset Assurance Assessment\n\n`
    md += `**Client:** ${meta.client}  \n`
    md += `**Plant:** ${meta.plant}  \n`
    md += `**Date:** ${meta.date}  \n`
    md += `**Engagement:** ${meta.engagementId}  \n`
    md += `**Classification:** ${meta.classification}  \n\n`

    md += `---\n\n`
    md += `## Overall Posture: ${exec.overallPosture}\n\n`

    // THE THREE QUESTIONS
    const q = exec.threeQuestions
    const mm = exec.managementMetrics
    if (q) {
      md += `## Three Core Questions\n\n`
      md += `### 1. How many OT assets do we have?\n\n`
      md += `**${q.q1_assetCount.total.toLocaleString()} canonical assets** — ${q.q1_assetCount.fromEngineering.toLocaleString()} from engineering baseline, ${q.q1_assetCount.orphansFound} discovered-only devices. ${q.q1_assetCount.blindSpots} documented assets were NOT found on the network.\n\n`
      md += `### 2. How do we know?\n\n`
      md += `**${q.q2_howWeKnow.coveragePercent}% discovery coverage** (${q.q2_howWeKnow.confidence}). ${q.q2_howWeKnow.matchedCount.toLocaleString()} assets verified via ${q.q2_howWeKnow.strategies}.\n\n`
      md += `### 3. Are the devices that need cyber management actually managed?\n\n`
      if (mm && mm.needsManagement > 0) {
        md += `**${mm.actuallyManaged} of ${mm.needsManagement}** Tier 1/2 devices are confirmed managed (**${mm.managementRate}%**). **${mm.unmanaged} devices are UNMANAGED** — these are on the network without confirmed security management (patching, monitoring, access control).\n\n`
      } else {
        md += `No assets classified as requiring cyber management (Tier 1/2). Review classification criteria.\n\n`
      }
      md += `---\n\n`
    }

    md += `### Asset Inventory Detail\n\n`
    md += `| Metric | Value |\n|---|---|\n`
    md += `| Total Assets | ${exec.assetBreakdown.total} |\n`
    md += `| Tier 1 (Critical) | ${exec.assetBreakdown.tier1} |\n`
    md += `| Tier 2 (Important) | ${exec.assetBreakdown.tier2} |\n`
    md += `| Tier 3 (Standard) | ${exec.assetBreakdown.tier3} |\n`
    md += `| Discovery Coverage | ${exec.coverageMetrics.discoveryRate}% |\n`
    md += `| Blind Spots | ${exec.coverageMetrics.blindSpots} |\n`
    md += `| Orphan Devices | ${exec.coverageMetrics.orphans} |\n`
    if (mm) {
      md += `| Need Cyber Mgmt | ${mm.needsManagement} |\n`
      md += `| Actually Managed | ${mm.actuallyManaged} (${mm.managementRate}%) |\n`
      md += `| **Unmanaged Gap** | **${mm.unmanaged}** |\n`
    }
    md += `\n`

    md += `### Key Findings\n\n`
    exec.keyFindings.forEach((f, i) => {
      md += `**${i + 1}. [${f.severity.toUpperCase()}]** ${f.finding}\n\n`
      md += `> ${f.implication}\n\n`
      md += `*Reference: ${f.reference}*\n\n`
    })

    md += `### Gap Summary\n\n`
    md += `| Severity | Count |\n|---|---|\n`
    Object.entries(exec.gapSummary).forEach(([sev, count]) => {
      md += `| ${sev.charAt(0).toUpperCase() + sev.slice(1)} | ${count} |\n`
    })
    md += `\n`

    md += `### Controls Impacted\n\n`
    md += `- **IEC 62443:** ${exec.controlsImpacted.iec62443} controls\n`
    md += `- **NIST CSF:** ${exec.controlsImpacted.nistCsf} controls\n\n`

    md += `---\n\n`
    md += `### Recommendations\n\n`
    report.recommendations.forEach(rec => {
      md += `#### P${rec.priority}: ${rec.title} (${rec.timeline})\n\n`
      md += `${rec.description}\n\n`
    })

    md += `---\n\n`
    md += `*Generated by OT Assurance Twin — AIGNE Context Framework*\n`

    return md
  }

  /**
   * Export risk heat map as CSV
   */
  toRiskHeatMapCSV(report) {
    const units = report.riskHeatMap.units
    const headers = ['Unit', 'Assets', 'Critical Assets', 'Gaps', 'Critical Gaps', 'Risk Score', 'Risk Level']
    const rows = units.map(u => [
      `"${u.unit}"`, u.assets, u.tier1, u.gaps, u.criticalGaps, u.riskScore, u.riskLevel
    ])
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  }
}

export default ReportGenerator
