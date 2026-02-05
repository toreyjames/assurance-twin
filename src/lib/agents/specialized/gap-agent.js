/**
 * GAP AGENT
 * Specialized agent for gap analysis - blind spots, orphans, coverage
 * 
 * Observes: Blind spots (in engineering but not discovered), orphans (discovered but not documented),
 *           coverage gaps, missing functions
 * Leverages: gap-analyzer.js
 */

import { BaseAgent } from '../base-agent.js'
import {
  AgentRole,
  MessageTopic,
  ObservationType,
  ObservationSeverity
} from '../types.js'
import { 
  GapType, 
  GapSeverity,
  analyzeAllGaps 
} from '../../context/gap-analyzer.js'

export class GapAgent extends BaseAgent {
  constructor(config) {
    super({
      ...config,
      role: AgentRole.GAP,
      description: config.description || 'Identifies blind spots, orphan devices, and coverage gaps',
      capabilities: ['gap_analysis', 'coverage_tracking', 'reconciliation']
    })
  }
  
  /**
   * Relevant topics for gap agent
   */
  getRelevantTopics() {
    return [MessageTopic.GAP, MessageTopic.COVERAGE]
  }
  
  /**
   * Map observations to topics
   */
  getTopicFromObservation(observation) {
    return MessageTopic.GAP
  }
  
  /**
   * Main observation logic for gap analysis domain
   */
  async observe() {
    this.state = 'observing'
    const assets = this.context.assets || []
    const matchResults = this.context.matchResults
    const gapAnalysis = this.context.gapAnalysis
    const industry = this.context.industry
    
    // Clear old observations
    this.observations = []
    
    // Run gap analysis if not already done
    const analysis = gapAnalysis || (matchResults 
      ? analyzeAllGaps(assets, matchResults, industry)
      : null)
    
    if (!analysis) {
      this.recordObservation({
        type: ObservationType.ANOMALY,
        severity: ObservationSeverity.LOW,
        subject: { plant: this.plant },
        description: 'Insufficient data for gap analysis - need both engineering baseline and discovery data'
      })
      this.state = 'idle'
      return this.observations
    }
    
    // Analyze different gap types
    this.analyzeBlindSpots(analysis.assetGaps)
    this.analyzeOrphans(analysis.assetGaps)
    this.analyzeFunctionalGaps(analysis.functionalGaps)
    this.analyzeCoverageGaps(analysis.coverageGaps)
    
    // Find strengths
    this.findGapStrengths(analysis, assets)
    
    // Generate summary
    this.generateGapSummary(analysis)
    
    // Share significant findings
    this.shareTopFindings()
    
    this.state = 'idle'
    this.lastObservation = Date.now()
    return this.observations
  }
  
  /**
   * Analyze blind spots - engineering assets not discovered
   */
  analyzeBlindSpots(assetGaps) {
    const blindSpots = assetGaps.filter(g => g.type === GapType.BLIND_SPOT)
    
    if (blindSpots.length === 0) return
    
    // Critical blind spots (safety/critical devices)
    const criticalBlindSpots = blindSpots.filter(g => 
      g.severity === GapSeverity.CRITICAL ||
      g.context?.criticality === 'critical' ||
      g.context?.isSafetyRelated
    )
    
    if (criticalBlindSpots.length > 0) {
      this.recordObservation({
        type: ObservationType.WEAKNESS,
        severity: ObservationSeverity.CRITICAL,
        subject: { plant: this.plant },
        description: `${criticalBlindSpots.length} CRITICAL devices in engineering baseline were NOT discovered on the network`,
        evidence: criticalBlindSpots.slice(0, 5).map(g => this.gapEvidence(g)),
        recommendations: [
          'Verify physical status of missing critical devices immediately',
          'Check if devices are on monitored network segments',
          'Confirm discovery tools can reach these device types'
        ]
      })
    }
    
    // Overall blind spot count
    if (blindSpots.length > 0) {
      const blindSpotPercent = this.context.matchResults 
        ? Math.round((blindSpots.length / (this.context.matchResults.matched?.length + blindSpots.length)) * 100)
        : 0
      
      this.recordObservation({
        type: ObservationType.WEAKNESS,
        severity: blindSpotPercent > 30 ? ObservationSeverity.HIGH : ObservationSeverity.MEDIUM,
        subject: { plant: this.plant },
        description: `${blindSpots.length} assets (${blindSpotPercent}% of baseline) are BLIND SPOTS - documented but not discovered`,
        evidence: blindSpots.slice(0, 5).map(g => this.gapEvidence(g)),
        recommendations: [
          'Expand discovery tool coverage to missing network segments',
          'Verify devices are powered and connected',
          'Review if devices use non-discoverable protocols'
        ]
      })
    }
    
    // Group by unit to identify systematic issues
    const byUnit = {}
    for (const gap of blindSpots) {
      const unit = gap.unit || 'Unknown'
      if (!byUnit[unit]) byUnit[unit] = []
      byUnit[unit].push(gap)
    }
    
    for (const [unit, gaps] of Object.entries(byUnit)) {
      if (gaps.length >= 5) {
        this.recordObservation({
          type: ObservationType.PATTERN,
          severity: ObservationSeverity.HIGH,
          subject: { plant: this.plant, unit },
          description: `${unit} has ${gaps.length} blind spots - possible discovery coverage issue`,
          recommendations: [
            `Deploy or verify discovery tool in ${unit}`,
            'Check network connectivity to this area'
          ]
        })
      }
    }
  }
  
  /**
   * Analyze orphans - discovered but not in engineering baseline
   */
  analyzeOrphans(assetGaps) {
    const orphans = assetGaps.filter(g => g.type === GapType.ORPHAN)
    
    if (orphans.length === 0) return
    
    // Critical orphans (networked devices with no documentation)
    const criticalOrphans = orphans.filter(g => 
      g.severity === GapSeverity.CRITICAL ||
      g.severity === GapSeverity.HIGH ||
      g.ipAddress
    )
    
    if (criticalOrphans.length > 0) {
      this.recordObservation({
        type: ObservationType.WEAKNESS,
        severity: ObservationSeverity.HIGH,
        subject: { plant: this.plant },
        description: `${criticalOrphans.length} UNDOCUMENTED devices found on the network - not in engineering baseline`,
        evidence: criticalOrphans.slice(0, 5).map(g => this.gapEvidence(g)),
        recommendations: [
          'Investigate each orphan device immediately',
          'Determine if authorized equipment or shadow IT',
          'Update engineering documentation or remove unauthorized devices'
        ]
      })
    }
    
    // Overall orphan analysis
    if (orphans.length > criticalOrphans.length) {
      const remaining = orphans.length - criticalOrphans.length
      this.recordObservation({
        type: ObservationType.WEAKNESS,
        severity: ObservationSeverity.MEDIUM,
        subject: { plant: this.plant },
        description: `${remaining} additional orphan devices found - may indicate documentation gaps`,
        recommendations: [
          'Conduct documentation reconciliation',
          'Establish process for registering new devices'
        ]
      })
    }
  }
  
  /**
   * Analyze functional gaps - missing expected functions per unit
   */
  analyzeFunctionalGaps(functionalGaps) {
    if (!functionalGaps || functionalGaps.length === 0) return
    
    // Missing critical functions
    const missingCritical = functionalGaps.filter(g => 
      g.type === GapType.MISSING_FUNCTION &&
      (g.severity === GapSeverity.CRITICAL || g.severity === GapSeverity.HIGH)
    )
    
    if (missingCritical.length > 0) {
      this.recordObservation({
        type: ObservationType.WEAKNESS,
        severity: ObservationSeverity.HIGH,
        subject: { plant: this.plant },
        description: `${missingCritical.length} expected functions are MISSING from process units`,
        evidence: missingCritical.slice(0, 5).map(g => this.gapEvidence(g)),
        recommendations: [
          'Verify if functions exist but were not discovered',
          'Review process hazard analysis for missing safety functions',
          'Update engineering baseline if functions were relocated'
        ]
      })
      
      // Detail missing functions
      for (const gap of missingCritical.slice(0, 3)) {
        this.recordObservation({
          type: ObservationType.ANOMALY,
          severity: gap.severity === GapSeverity.CRITICAL 
            ? ObservationSeverity.CRITICAL 
            : ObservationSeverity.HIGH,
          subject: { plant: this.plant, unit: gap.unit },
          description: `Missing function in ${gap.unit}: ${gap.functionDescription || gap.function}`,
          recommendations: [gap.recommendation]
        })
      }
    }
    
    // No redundancy findings
    const noRedundancy = functionalGaps.filter(g => g.type === GapType.NO_REDUNDANCY)
    if (noRedundancy.length > 0) {
      this.recordObservation({
        type: ObservationType.WEAKNESS,
        severity: ObservationSeverity.MEDIUM,
        subject: { plant: this.plant },
        description: `${noRedundancy.length} critical functions have NO REDUNDANCY - single points of failure`,
        evidence: noRedundancy.slice(0, 3).map(g => this.gapEvidence(g)),
        recommendations: [
          'Assess risk of single point of failure',
          'Consider adding backup systems for critical functions'
        ]
      })
    }
  }
  
  /**
   * Analyze coverage gaps - areas with insufficient discovery
   */
  analyzeCoverageGaps(coverageGaps) {
    if (!coverageGaps || coverageGaps.length === 0) return
    
    // No visibility areas
    const noVisibility = coverageGaps.filter(g => g.type === GapType.NO_VISIBILITY)
    if (noVisibility.length > 0) {
      this.recordObservation({
        type: ObservationType.WEAKNESS,
        severity: ObservationSeverity.HIGH,
        subject: { plant: this.plant },
        description: `${noVisibility.length} areas have NO discovery visibility despite documented assets`,
        evidence: noVisibility.map(g => this.gapEvidence(g)),
        recommendations: [
          'Deploy OT discovery tools (Claroty, Nozomi, etc.) in these areas',
          'Verify network architecture allows discovery access'
        ]
      })
    }
    
    // Network blind spots
    const networkBlindSpots = coverageGaps.filter(g => g.type === GapType.NETWORK_BLIND_SPOT)
    if (networkBlindSpots.length > 0) {
      this.recordObservation({
        type: ObservationType.WEAKNESS,
        severity: ObservationSeverity.HIGH,
        subject: { plant: this.plant },
        description: `${networkBlindSpots.length} network subnets have documented assets but no discovery data`,
        evidence: networkBlindSpots.slice(0, 5).map(g => ({
          ...this.gapEvidence(g),
          data: { subnet: g.subnet, assetCount: g.assetCount }
        })),
        recommendations: [
          'Extend discovery tool SPAN/TAP to these subnets',
          'Verify routing allows discovery traffic'
        ]
      })
    }
    
    // Low visibility areas
    const lowVisibility = coverageGaps.filter(g => g.type === GapType.LOW_VISIBILITY)
    if (lowVisibility.length > 0) {
      this.recordObservation({
        type: ObservationType.WEAKNESS,
        severity: ObservationSeverity.MEDIUM,
        subject: { plant: this.plant },
        description: `${lowVisibility.length} areas have LOW discovery coverage (<30%)`,
        recommendations: [
          'Review discovery tool configuration',
          'Check for protocol support gaps'
        ]
      })
    }
  }
  
  /**
   * Find positive gap-related findings
   */
  findGapStrengths(analysis, assets) {
    const { summary, assetGaps, functionalGaps, coverageGaps } = analysis
    
    // Good match rate
    if (this.context.matchResults) {
      const matchRate = this.context.matchResults.stats?.coveragePercent || 0
      if (matchRate >= 90) {
        this.recordObservation({
          type: ObservationType.STRENGTH,
          severity: ObservationSeverity.POSITIVE,
          subject: { plant: this.plant },
          description: `Excellent asset reconciliation: ${matchRate}% of engineering baseline discovered`,
          confidence: 0.9
        })
      }
    }
    
    // No critical gaps
    if (summary.critical === 0 && summary.total > 0) {
      this.recordObservation({
        type: ObservationType.STRENGTH,
        severity: ObservationSeverity.POSITIVE,
        subject: { plant: this.plant },
        description: 'No critical gaps identified - good visibility and documentation',
        confidence: 0.85
      })
    }
    
    // Low orphan count (good documentation)
    const orphans = assetGaps.filter(g => g.type === GapType.ORPHAN)
    if (orphans.length === 0 && assets.length > 10) {
      this.recordObservation({
        type: ObservationType.STRENGTH,
        severity: ObservationSeverity.POSITIVE,
        subject: { plant: this.plant },
        description: 'Zero undocumented devices - excellent engineering documentation',
        confidence: 0.9
      })
    }
    
    // Full functional coverage
    if (functionalGaps.length === 0 && this.context.industry) {
      this.recordObservation({
        type: ObservationType.STRENGTH,
        severity: ObservationSeverity.POSITIVE,
        subject: { plant: this.plant },
        description: 'All expected functions present across process units',
        confidence: 0.85
      })
    }
  }
  
  /**
   * Generate gap analysis summary
   */
  generateGapSummary(analysis) {
    const { summary } = analysis
    
    this.recordObservation({
      type: ObservationType.PATTERN,
      severity: ObservationSeverity.INFO,
      subject: { plant: this.plant },
      description: `Gap Summary: ${summary.total} total gaps (${summary.critical} critical, ${summary.high} high). ` +
                   `Blind spots: ${summary.byType.blindSpots}, Orphans: ${summary.byType.orphans}`,
      metadata: { summary }
    })
  }
  
  /**
   * Share top findings
   */
  shareTopFindings() {
    const significant = this.observations.filter(o => 
      o.severity === ObservationSeverity.CRITICAL ||
      o.severity === ObservationSeverity.HIGH
    )
    
    for (const obs of significant.slice(0, 3)) {
      this.shareObservation(obs)
    }
    
    const strength = this.observations.find(o => o.type === ObservationType.STRENGTH)
    if (strength) {
      this.shareObservation(strength)
    }
  }
  
  /**
   * Generate answer for gap-related questions
   */
  async generateAnswer(question) {
    const questionLower = question.toLowerCase()
    
    if (questionLower.includes('blind spot') || questionLower.includes('missing')) {
      const obs = this.observations.filter(o => 
        o.description.toLowerCase().includes('blind spot') ||
        o.description.toLowerCase().includes('missing') ||
        o.description.toLowerCase().includes('not discovered')
      )
      
      if (obs.length > 0) {
        return obs.map(o => o.description).join('\n\n')
      }
      return 'No significant blind spots identified.'
    }
    
    if (questionLower.includes('orphan') || questionLower.includes('undocumented')) {
      const obs = this.observations.filter(o => 
        o.description.toLowerCase().includes('orphan') ||
        o.description.toLowerCase().includes('undocumented')
      )
      
      if (obs.length > 0) {
        return obs.map(o => o.description).join('\n\n')
      }
      return 'No orphan devices found on the network.'
    }
    
    if (questionLower.includes('coverage') || questionLower.includes('visibility')) {
      const obs = this.observations.filter(o => 
        o.description.toLowerCase().includes('coverage') ||
        o.description.toLowerCase().includes('visibility')
      )
      
      if (obs.length > 0) {
        return obs.map(o => o.description).join('\n\n')
      }
      return 'Discovery coverage appears adequate.'
    }
    
    return super.generateAnswer(question)
  }
}

export default GapAgent
