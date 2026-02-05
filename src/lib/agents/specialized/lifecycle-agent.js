/**
 * LIFECYCLE AGENT
 * Specialized agent for equipment lifecycle and EOL/EOS tracking
 * 
 * Observes: Obsolete devices, EOL approaching, replacement needs, aging equipment
 * Leverages: lifecycle-tracker.js
 */

import { BaseAgent } from '../base-agent.js'
import {
  AgentRole,
  MessageTopic,
  ObservationType,
  ObservationSeverity
} from '../types.js'
import { 
  calculateLifecycleStatus, 
  LifecycleStatus,
  generateLifecycleSummary 
} from '../../context/lifecycle-tracker.js'

export class LifecycleAgent extends BaseAgent {
  constructor(config) {
    super({
      ...config,
      role: AgentRole.LIFECYCLE,
      description: config.description || 'Tracks equipment lifecycle, EOL dates, and replacement planning',
      capabilities: ['lifecycle_tracking', 'eol_monitoring', 'replacement_planning']
    })
  }
  
  /**
   * Relevant topics for lifecycle agent
   */
  getRelevantTopics() {
    return [MessageTopic.LIFECYCLE, MessageTopic.RISK]
  }
  
  /**
   * Map observations to topics
   */
  getTopicFromObservation(observation) {
    return MessageTopic.LIFECYCLE
  }
  
  /**
   * Main observation logic for lifecycle domain
   */
  async observe() {
    this.state = 'observing'
    const assets = this.context.assets || []
    
    // Clear old observations
    this.observations = []
    
    // Add lifecycle status to assets
    const assetsWithLifecycle = assets.map(asset => ({
      ...asset,
      lifecycleStatus: asset.lifecycleStatus || calculateLifecycleStatus(asset)
    }))
    
    // Analyze lifecycle concerns
    this.analyzeObsoleteEquipment(assetsWithLifecycle)
    this.analyzeEOSEquipment(assetsWithLifecycle)
    this.analyzeApproachingEOL(assetsWithLifecycle)
    this.analyzeAgingEquipment(assetsWithLifecycle)
    
    // Find lifecycle strengths
    this.findLifecycleStrengths(assetsWithLifecycle)
    
    // Generate summary
    this.generateLifecycleSummary(assetsWithLifecycle)
    
    // Share significant findings
    this.shareTopFindings()
    
    this.state = 'idle'
    this.lastObservation = Date.now()
    return this.observations
  }
  
  /**
   * Analyze obsolete equipment
   */
  analyzeObsoleteEquipment(assets) {
    const obsolete = assets.filter(a => 
      a.lifecycleStatus?.status === LifecycleStatus.OBSOLETE
    )
    
    if (obsolete.length === 0) return
    
    // Group by vendor for replacement planning
    const byVendor = {}
    for (const asset of obsolete) {
      const vendor = asset.manufacturer || asset.vendor || 'Unknown'
      if (!byVendor[vendor]) byVendor[vendor] = []
      byVendor[vendor].push(asset)
    }
    
    // Critical observation for obsolete equipment
    this.recordObservation({
      type: ObservationType.WEAKNESS,
      severity: ObservationSeverity.CRITICAL,
      subject: { plant: this.plant },
      description: `${obsolete.length} assets are OBSOLETE - well past end of support with no security updates available`,
      evidence: obsolete.slice(0, 5).map(a => this.assetEvidence(a, 
        `${a.manufacturer} ${a.model} - ${a.lifecycleStatus?.replacement ? `Replace with ${a.lifecycleStatus.replacement}` : 'No replacement identified'}`
      )),
      recommendations: [
        'Create urgent replacement project for obsolete equipment',
        'Implement compensating controls (network isolation, monitoring)',
        'Document risk acceptance if replacement is delayed',
        'Budget for emergency replacement if equipment fails'
      ]
    })
    
    // Detail by vendor
    for (const [vendor, vendorAssets] of Object.entries(byVendor)) {
      if (vendorAssets.length >= 3) {
        const replacements = [...new Set(
          vendorAssets
            .map(a => a.lifecycleStatus?.replacement)
            .filter(Boolean)
        )]
        
        this.recordObservation({
          type: ObservationType.PATTERN,
          severity: ObservationSeverity.HIGH,
          subject: { plant: this.plant },
          description: `${vendorAssets.length} obsolete ${vendor} devices identified`,
          evidence: vendorAssets.slice(0, 3).map(a => this.assetEvidence(a)),
          recommendations: replacements.length > 0
            ? [`Contact ${vendor} for migration path to ${replacements.join(', ')}`]
            : [`Contact ${vendor} for replacement options`]
        })
      }
    }
  }
  
  /**
   * Analyze end-of-support equipment
   */
  analyzeEOSEquipment(assets) {
    const eos = assets.filter(a => 
      a.lifecycleStatus?.status === LifecycleStatus.EOS
    )
    
    if (eos.length === 0) return
    
    this.recordObservation({
      type: ObservationType.WEAKNESS,
      severity: ObservationSeverity.HIGH,
      subject: { plant: this.plant },
      description: `${eos.length} assets are past End of Support - no longer receiving security patches`,
      evidence: eos.slice(0, 5).map(a => this.assetEvidence(a)),
      recommendations: [
        'Plan replacement within 12-18 months',
        'Implement network segmentation for EOS devices',
        'Consider extended support contracts if available',
        'Increase monitoring for these devices'
      ]
    })
    
    // Check for safety-related EOS equipment
    const safetyEOS = eos.filter(a => 
      a.device_type?.toLowerCase().includes('sis') ||
      a.device_type?.toLowerCase().includes('safety') ||
      a.criticality === 'critical'
    )
    
    if (safetyEOS.length > 0) {
      this.recordObservation({
        type: ObservationType.WEAKNESS,
        severity: ObservationSeverity.CRITICAL,
        subject: { plant: this.plant },
        description: `${safetyEOS.length} SAFETY-CRITICAL devices are past end of support`,
        evidence: safetyEOS.map(a => this.assetEvidence(a)),
        recommendations: [
          'URGENT: Safety systems require immediate upgrade planning',
          'Review SIL certification validity with obsolete hardware',
          'Engage safety consultant for migration planning'
        ]
      })
    }
  }
  
  /**
   * Analyze equipment approaching EOL
   */
  analyzeApproachingEOL(assets) {
    const approaching = assets.filter(a => 
      a.lifecycleStatus?.status === LifecycleStatus.APPROACHING_EOL
    )
    
    if (approaching.length === 0) return
    
    // Group by time until EOL
    const within6months = approaching.filter(a => 
      a.lifecycleStatus?.daysUntilEol < 180
    )
    const within1year = approaching.filter(a => 
      a.lifecycleStatus?.daysUntilEol >= 180 && 
      a.lifecycleStatus?.daysUntilEol < 365
    )
    const within2years = approaching.filter(a => 
      a.lifecycleStatus?.daysUntilEol >= 365
    )
    
    if (within6months.length > 0) {
      this.recordObservation({
        type: ObservationType.WEAKNESS,
        severity: ObservationSeverity.HIGH,
        subject: { plant: this.plant },
        description: `${within6months.length} assets reach End of Life within 6 months`,
        evidence: within6months.slice(0, 5).map(a => this.assetEvidence(a)),
        recommendations: [
          'Finalize replacement procurement immediately',
          'Schedule migration during next maintenance window',
          'Confirm spare parts availability'
        ]
      })
    }
    
    if (within1year.length > 0) {
      this.recordObservation({
        type: ObservationType.WEAKNESS,
        severity: ObservationSeverity.MEDIUM,
        subject: { plant: this.plant },
        description: `${within1year.length} assets reach End of Life within 6-12 months`,
        evidence: within1year.slice(0, 5).map(a => this.assetEvidence(a)),
        recommendations: [
          'Begin procurement process for replacements',
          'Budget for next fiscal year',
          'Evaluate vendor upgrade programs'
        ]
      })
    }
    
    if (within2years.length > 0) {
      this.recordObservation({
        type: ObservationType.PATTERN,
        severity: ObservationSeverity.LOW,
        subject: { plant: this.plant },
        description: `${within2years.length} assets reach End of Life within 1-2 years - plan ahead`,
        recommendations: [
          'Include in technology refresh roadmap',
          'Evaluate modern alternatives'
        ]
      })
    }
  }
  
  /**
   * Analyze aging equipment based on typical lifespans
   */
  analyzeAgingEquipment(assets) {
    const aged = assets.filter(a => {
      const ls = a.lifecycleStatus
      return ls?.estimatedAge && ls?.estimatedRemainingLife !== null && 
             ls?.estimatedRemainingLife < 0 &&
             ls?.status !== LifecycleStatus.OBSOLETE &&
             ls?.status !== LifecycleStatus.EOS
    })
    
    if (aged.length > 0) {
      this.recordObservation({
        type: ObservationType.WEAKNESS,
        severity: ObservationSeverity.MEDIUM,
        subject: { plant: this.plant },
        description: `${aged.length} assets have exceeded their typical equipment lifespan`,
        evidence: aged.slice(0, 5).map(a => this.assetEvidence(a, 
          `Age: ${a.lifecycleStatus?.estimatedAge} years`
        )),
        recommendations: [
          'Conduct condition assessment for aged equipment',
          'Increase preventive maintenance frequency',
          'Stock critical spare parts'
        ]
      })
    }
    
    // Very old equipment
    const veryOld = assets.filter(a => 
      a.lifecycleStatus?.estimatedAge && a.lifecycleStatus.estimatedAge > 20
    )
    
    if (veryOld.length > 0) {
      this.recordObservation({
        type: ObservationType.ANOMALY,
        severity: ObservationSeverity.HIGH,
        subject: { plant: this.plant },
        description: `${veryOld.length} assets are over 20 years old - potential reliability concerns`,
        evidence: veryOld.slice(0, 3).map(a => this.assetEvidence(a)),
        recommendations: [
          'Conduct obsolescence risk assessment',
          'Verify spare parts availability',
          'Consider proactive replacement'
        ]
      })
    }
  }
  
  /**
   * Find positive lifecycle findings
   */
  findLifecycleStrengths(assets) {
    const summary = generateLifecycleSummary(assets)
    
    // Good modern equipment
    const currentPercent = Math.round((summary.current / assets.length) * 100)
    if (currentPercent >= 70) {
      this.recordObservation({
        type: ObservationType.STRENGTH,
        severity: ObservationSeverity.POSITIVE,
        subject: { plant: this.plant },
        description: `Strong lifecycle position: ${currentPercent}% of assets are current generation with full support`,
        confidence: 0.9
      })
    }
    
    // Low obsolete count
    if (summary.obsolete === 0 && summary.eos === 0 && assets.length > 10) {
      this.recordObservation({
        type: ObservationType.STRENGTH,
        severity: ObservationSeverity.POSITIVE,
        subject: { plant: this.plant },
        description: 'Excellent lifecycle management: No obsolete or end-of-support equipment',
        confidence: 0.95
      })
    }
    
    // Active replacement planning (presence of replacement fields)
    const withReplacement = assets.filter(a => 
      a.lifecycleStatus?.replacement
    ).length
    
    if (withReplacement > 0 && (summary.eol + summary.eos + summary.obsolete) > 0) {
      const hasPlanning = Math.round((withReplacement / (summary.eol + summary.eos + summary.obsolete + summary.approachingEol)) * 100)
      if (hasPlanning >= 80) {
        this.recordObservation({
          type: ObservationType.STRENGTH,
          severity: ObservationSeverity.POSITIVE,
          subject: { plant: this.plant },
          description: `Proactive planning: ${hasPlanning}% of aging equipment has identified replacement paths`,
          confidence: 0.85
        })
      }
    }
  }
  
  /**
   * Generate lifecycle summary
   */
  generateLifecycleSummary(assets) {
    const summary = generateLifecycleSummary(assets)
    
    this.recordObservation({
      type: ObservationType.PATTERN,
      severity: ObservationSeverity.INFO,
      subject: { plant: this.plant },
      description: `Lifecycle Summary: ${summary.current} current, ${summary.mature} mature, ${summary.approachingEol} approaching EOL, ${summary.eol} EOL, ${summary.eos} EOS, ${summary.obsolete} obsolete`,
      metadata: { summary }
    })
  }
  
  /**
   * Share top findings to break room
   */
  shareTopFindings() {
    // Share critical and high findings
    const significant = this.observations.filter(o => 
      o.severity === ObservationSeverity.CRITICAL ||
      o.severity === ObservationSeverity.HIGH
    )
    
    for (const obs of significant.slice(0, 3)) {
      this.shareObservation(obs)
    }
    
    // Share a strength if available
    const strength = this.observations.find(o => o.type === ObservationType.STRENGTH)
    if (strength) {
      this.shareObservation(strength)
    }
  }
  
  /**
   * Generate answer for lifecycle questions
   */
  async generateAnswer(question) {
    const questionLower = question.toLowerCase()
    
    if (questionLower.includes('obsolete') || questionLower.includes('old')) {
      const obs = this.observations.filter(o => 
        o.description.toLowerCase().includes('obsolete') ||
        o.description.toLowerCase().includes('old') ||
        o.description.toLowerCase().includes('aged')
      )
      
      if (obs.length > 0) {
        return obs.map(o => o.description).join('\n\n')
      }
      return 'No significant obsolescence concerns at this time.'
    }
    
    if (questionLower.includes('eol') || questionLower.includes('end of life')) {
      const obs = this.observations.filter(o => 
        o.description.toLowerCase().includes('eol') ||
        o.description.toLowerCase().includes('end of life') ||
        o.description.toLowerCase().includes('end of support')
      )
      
      if (obs.length > 0) {
        return obs.map(o => o.description).join('\n\n')
      }
      return 'No imminent end-of-life concerns identified.'
    }
    
    if (questionLower.includes('replace') || questionLower.includes('upgrade')) {
      const obs = this.observations.filter(o => 
        o.recommendations?.some(r => 
          r.toLowerCase().includes('replace') || 
          r.toLowerCase().includes('upgrade')
        )
      )
      
      if (obs.length > 0) {
        return `Replacement recommendations:\n\n${obs.map(o => 
          `${o.description}\nAction: ${o.recommendations?.join(', ')}`
        ).join('\n\n')}`
      }
      return 'No immediate replacement needs identified.'
    }
    
    return super.generateAnswer(question)
  }
}

export default LifecycleAgent
