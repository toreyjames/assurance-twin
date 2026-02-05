/**
 * RISK AGENT
 * Specialized agent for holistic risk analysis
 * 
 * Observes: High-risk assets, blast radius, risk concentration, trends
 * Leverages: risk-engine.js
 */

import { BaseAgent } from '../base-agent.js'
import {
  AgentRole,
  MessageTopic,
  ObservationType,
  ObservationSeverity
} from '../types.js'
import { 
  RiskLevel,
  RiskFactor,
  calculateAssetRisk,
  analyzePortfolioRisk 
} from '../../context/risk-engine.js'

export class RiskAgent extends BaseAgent {
  constructor(config) {
    super({
      ...config,
      role: AgentRole.RISK,
      description: config.description || 'Performs holistic risk analysis and identifies high-risk assets',
      capabilities: ['risk_scoring', 'risk_aggregation', 'trend_analysis']
    })
    
    this.portfolioRisk = null
  }
  
  /**
   * Relevant topics for risk agent
   */
  getRelevantTopics() {
    return [MessageTopic.RISK, MessageTopic.VULNERABILITY, MessageTopic.DEPENDENCY]
  }
  
  /**
   * Map observations to topics
   */
  getTopicFromObservation(observation) {
    return MessageTopic.RISK
  }
  
  /**
   * Main observation logic for risk domain
   */
  async observe() {
    this.state = 'observing'
    const assets = this.context.assets || []
    const industry = this.context.industry
    const riskAnalysis = this.context.riskAnalysis
    
    // Clear old observations
    this.observations = []
    
    // Run or use existing risk analysis
    this.portfolioRisk = riskAnalysis || analyzePortfolioRisk(assets, { industry })
    
    // Analyze risk findings
    this.analyzeCriticalRisks()
    this.analyzeRiskConcentration()
    this.analyzeRiskFactors()
    this.analyzeUnitRisks()
    
    // Find positive findings
    this.findRiskStrengths()
    
    // Generate summary
    this.generateRiskSummary()
    
    // Share significant findings
    this.shareTopFindings()
    
    this.state = 'idle'
    this.lastObservation = Date.now()
    return this.observations
  }
  
  /**
   * Analyze critical risk assets
   */
  analyzeCriticalRisks() {
    const { assetRisks, summary } = this.portfolioRisk
    
    // Critical risk assets
    const criticalRisks = assetRisks.filter(ar => ar.risk.riskLevel.value === 4)
    
    if (criticalRisks.length > 0) {
      this.recordObservation({
        type: ObservationType.WEAKNESS,
        severity: ObservationSeverity.CRITICAL,
        subject: { plant: this.plant },
        description: `${criticalRisks.length} assets have CRITICAL risk scores requiring immediate attention`,
        evidence: criticalRisks.slice(0, 5).map(ar => this.riskEvidence(ar.risk)),
        recommendations: [
          'Conduct detailed risk assessment for each critical asset',
          'Implement compensating controls immediately',
          'Escalate to plant management for resource allocation',
          'Document risk acceptance if remediation is delayed'
        ]
      })
      
      // Detail top critical assets
      for (const ar of criticalRisks.slice(0, 3)) {
        const topFactors = ar.risk.topFactors?.map(f => f.description).join(', ') || 'Multiple factors'
        this.recordObservation({
          type: ObservationType.WEAKNESS,
          severity: ObservationSeverity.CRITICAL,
          subject: { 
            plant: this.plant,
            unit: ar.asset.unit,
            asset: ar.asset.tag_id || ar.asset.asset_id
          },
          description: `Critical risk: ${ar.asset.tag_id || ar.asset.device_type} (score: ${ar.risk.normalizedScore}/100) - ${topFactors}`,
          evidence: [this.assetEvidence(ar.asset)],
          recommendations: ar.risk.factors?.slice(0, 2).map(f => f.description) || []
        })
      }
    }
    
    // High risk assets
    const highRisks = assetRisks.filter(ar => ar.risk.riskLevel.value === 3)
    if (highRisks.length > 5) {
      this.recordObservation({
        type: ObservationType.WEAKNESS,
        severity: ObservationSeverity.HIGH,
        subject: { plant: this.plant },
        description: `${highRisks.length} assets have HIGH risk scores`,
        evidence: highRisks.slice(0, 5).map(ar => this.riskEvidence(ar.risk)),
        recommendations: [
          'Prioritize these assets in risk remediation roadmap',
          'Review for common risk factors that can be addressed systematically'
        ]
      })
    }
  }
  
  /**
   * Analyze risk concentration patterns
   */
  analyzeRiskConcentration() {
    const { assetRisks, summary } = this.portfolioRisk
    
    // High percentage of risky assets
    const criticalHighCount = summary.riskDistribution.critical + summary.riskDistribution.high
    const riskyPercent = Math.round((criticalHighCount / summary.totalAssets) * 100)
    
    if (riskyPercent > 30) {
      this.recordObservation({
        type: ObservationType.PATTERN,
        severity: ObservationSeverity.HIGH,
        subject: { plant: this.plant },
        description: `${riskyPercent}% of assets have high or critical risk - systemic risk concerns`,
        recommendations: [
          'Review plant-wide security architecture',
          'Consider enterprise risk remediation program',
          'Evaluate network segmentation effectiveness'
        ]
      })
    }
    
    // Risk concentration by device type
    const riskByType = {}
    for (const ar of assetRisks) {
      const type = ar.asset.device_type || 'Unknown'
      if (!riskByType[type]) riskByType[type] = { count: 0, totalScore: 0, critical: 0 }
      riskByType[type].count++
      riskByType[type].totalScore += ar.risk.normalizedScore
      if (ar.risk.riskLevel.value >= 4) riskByType[type].critical++
    }
    
    for (const [type, data] of Object.entries(riskByType)) {
      const avgScore = Math.round(data.totalScore / data.count)
      if (avgScore > 60 && data.count >= 3) {
        this.recordObservation({
          type: ObservationType.PATTERN,
          severity: ObservationSeverity.MEDIUM,
          subject: { plant: this.plant },
          description: `${type} devices show elevated average risk (${avgScore}/100) across ${data.count} assets`,
          recommendations: [
            `Review ${type} security configuration`,
            `Check for common vulnerabilities in ${type} devices`
          ]
        })
      }
    }
  }
  
  /**
   * Analyze most common risk factors
   */
  analyzeRiskFactors() {
    const { summary } = this.portfolioRisk
    const factorFrequency = summary.factorFrequency || []
    
    // Top risk contributors
    const topFactors = factorFrequency.slice(0, 5)
    
    for (const factor of topFactors) {
      if (factor.count > 10 && factor.averageContribution > 10) {
        let severity = ObservationSeverity.MEDIUM
        let description = ''
        let recommendations = []
        
        switch (factor.factor) {
          case RiskFactor.EOL_STATUS:
            description = `Lifecycle risk: ${factor.count} assets affected by EOL/EOS concerns`
            recommendations = ['Develop technology refresh roadmap', 'Budget for replacements']
            severity = factor.averageContribution > 15 ? ObservationSeverity.HIGH : ObservationSeverity.MEDIUM
            break
            
          case RiskFactor.NETWORK_EXPOSURE:
            description = `Network exposure: ${factor.count} assets have network connectivity contributing to risk`
            recommendations = ['Review network segmentation', 'Implement micro-segmentation']
            break
            
          case RiskFactor.UNDOCUMENTED:
            description = `Documentation gaps: ${factor.count} undocumented devices increasing risk profile`
            recommendations = ['Update asset documentation', 'Establish documentation process']
            break
            
          case RiskFactor.DEVICE_CRITICALITY:
            description = `Critical devices: ${factor.count} high-criticality devices driving risk scores`
            recommendations = ['Prioritize protection of critical assets', 'Implement defense-in-depth']
            break
            
          case RiskFactor.SAFETY_RELATED:
            description = `Safety systems: ${factor.count} safety-related devices require special attention`
            recommendations = ['Ensure safety system integrity', 'Review SIS cybersecurity']
            severity = ObservationSeverity.HIGH
            break
            
          default:
            description = `Risk factor ${factor.factor} affects ${factor.count} assets`
            recommendations = ['Review and address this risk factor']
        }
        
        this.recordObservation({
          type: ObservationType.PATTERN,
          severity,
          subject: { plant: this.plant },
          description,
          recommendations,
          metadata: { factor: factor.factor, count: factor.count }
        })
      }
    }
  }
  
  /**
   * Analyze risk at unit level
   */
  analyzeUnitRisks() {
    const { summary } = this.portfolioRisk
    const unitRisks = summary.unitRisks || []
    
    // High-risk units
    const criticalUnits = unitRisks.filter(u => 
      u.riskLevel?.value === 4 || u.criticalCount > 0
    )
    
    for (const unit of criticalUnits.slice(0, 3)) {
      this.recordObservation({
        type: ObservationType.WEAKNESS,
        severity: ObservationSeverity.HIGH,
        subject: { plant: this.plant, unit: unit.unit },
        description: `${unit.unit} is a high-risk area: ${unit.criticalCount} critical, ${unit.highCount} high-risk assets (avg score: ${unit.averageScore})`,
        recommendations: [
          `Focus risk remediation on ${unit.unit}`,
          'Review unit-specific security controls'
        ]
      })
    }
    
    // Risk comparison across units
    if (unitRisks.length > 3) {
      const maxRisk = unitRisks[0]
      const minRisk = unitRisks[unitRisks.length - 1]
      
      if (maxRisk.averageScore - minRisk.averageScore > 30) {
        this.recordObservation({
          type: ObservationType.PATTERN,
          severity: ObservationSeverity.MEDIUM,
          subject: { plant: this.plant },
          description: `Significant risk variance across units: ${maxRisk.unit} (${maxRisk.averageScore}) vs ${minRisk.unit} (${minRisk.averageScore})`,
          recommendations: [
            'Apply best practices from lower-risk units',
            'Investigate causes of variance'
          ]
        })
      }
    }
  }
  
  /**
   * Find positive risk findings
   */
  findRiskStrengths() {
    const { summary } = this.portfolioRisk
    
    // Low overall risk
    if (summary.averageRiskScore < 25) {
      this.recordObservation({
        type: ObservationType.STRENGTH,
        severity: ObservationSeverity.POSITIVE,
        subject: { plant: this.plant },
        description: `Strong risk posture: Average risk score of ${summary.averageRiskScore}/100`,
        confidence: 0.9
      })
    }
    
    // No critical risks
    if (summary.riskDistribution.critical === 0) {
      this.recordObservation({
        type: ObservationType.STRENGTH,
        severity: ObservationSeverity.POSITIVE,
        subject: { plant: this.plant },
        description: 'No critical-risk assets identified - good baseline security',
        confidence: 0.85
      })
    }
    
    // Majority low risk
    const lowInfoCount = summary.riskDistribution.low + summary.riskDistribution.info
    const lowPercent = Math.round((lowInfoCount / summary.totalAssets) * 100)
    
    if (lowPercent >= 70) {
      this.recordObservation({
        type: ObservationType.STRENGTH,
        severity: ObservationSeverity.POSITIVE,
        subject: { plant: this.plant },
        description: `${lowPercent}% of assets have low risk scores - well-managed environment`,
        confidence: 0.85
      })
    }
  }
  
  /**
   * Generate risk summary
   */
  generateRiskSummary() {
    const { summary } = this.portfolioRisk
    const dist = summary.riskDistribution
    
    this.recordObservation({
      type: ObservationType.PATTERN,
      severity: ObservationSeverity.INFO,
      subject: { plant: this.plant },
      description: `Risk Summary: ${summary.totalAssets} assets, avg score ${summary.averageRiskScore}/100. ` +
                   `Distribution: ${dist.critical} critical, ${dist.high} high, ${dist.medium} medium, ${dist.low} low`,
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
   * Generate answer for risk questions
   */
  async generateAnswer(question) {
    const questionLower = question.toLowerCase()
    
    if (questionLower.includes('critical') || questionLower.includes('highest risk')) {
      const obs = this.observations.filter(o => 
        o.severity === ObservationSeverity.CRITICAL ||
        o.description.toLowerCase().includes('critical')
      )
      
      if (obs.length > 0) {
        return obs.map(o => o.description).join('\n\n')
      }
      return 'No critical risk assets identified.'
    }
    
    if (questionLower.includes('score') || questionLower.includes('average')) {
      if (this.portfolioRisk) {
        return `Average risk score: ${this.portfolioRisk.summary.averageRiskScore}/100. ` +
               `Total assets: ${this.portfolioRisk.summary.totalAssets}`
      }
      return 'Risk analysis not yet completed.'
    }
    
    if (questionLower.includes('factor') || questionLower.includes('driver')) {
      const factorObs = this.observations.filter(o => 
        o.metadata?.factor || o.description.toLowerCase().includes('factor')
      )
      
      if (factorObs.length > 0) {
        return factorObs.map(o => o.description).join('\n\n')
      }
      return 'No dominant risk factors identified.'
    }
    
    return super.generateAnswer(question)
  }
}

export default RiskAgent
