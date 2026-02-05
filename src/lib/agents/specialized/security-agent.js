/**
 * SECURITY AGENT
 * Specialized agent for vulnerability and security analysis
 * 
 * Observes: CVEs, unpatched devices, network exposure, security misconfigurations
 * Leverages: risk-engine.js
 */

import { BaseAgent } from '../base-agent.js'
import {
  AgentRole,
  MessageTopic,
  ObservationType,
  ObservationSeverity
} from '../types.js'
import { RiskFactor, calculateAssetRisk } from '../../context/risk-engine.js'

export class SecurityAgent extends BaseAgent {
  constructor(config) {
    super({
      ...config,
      role: AgentRole.SECURITY,
      description: config.description || 'Analyzes vulnerabilities, network exposure, and security posture',
      capabilities: ['vulnerability_analysis', 'exposure_detection', 'patch_tracking']
    })
  }
  
  /**
   * Relevant topics for security agent
   */
  getRelevantTopics() {
    return [MessageTopic.VULNERABILITY, MessageTopic.RISK, MessageTopic.COMPLIANCE]
  }
  
  /**
   * Map observations to topics
   */
  getTopicFromObservation(observation) {
    return MessageTopic.VULNERABILITY
  }
  
  /**
   * Main observation logic for security domain
   */
  async observe() {
    this.state = 'observing'
    const assets = this.context.assets || []
    const riskAnalysis = this.context.riskAnalysis
    
    // Clear old observations for fresh analysis
    this.observations = []
    
    // Analyze vulnerabilities
    this.analyzeVulnerabilities(assets)
    
    // Analyze network exposure
    this.analyzeNetworkExposure(assets)
    
    // Analyze patch status
    this.analyzePatchStatus(assets)
    
    // Analyze security configuration
    this.analyzeSecurityConfig(assets)
    
    // Check for positive security findings
    this.findSecurityStrengths(assets)
    
    // Share significant findings
    this.shareTopFindings()
    
    this.state = 'idle'
    this.lastObservation = Date.now()
    return this.observations
  }
  
  /**
   * Analyze assets for vulnerabilities
   */
  analyzeVulnerabilities(assets) {
    const vulnerableAssets = assets.filter(a => 
      a.cve_count > 0 || a.vulnerabilities?.length > 0
    )
    
    // Critical vulnerabilities
    const criticalVuln = vulnerableAssets.filter(a => 
      a.cve_severity === 'critical' || 
      a.vulnerabilities?.some(v => v.severity === 'critical')
    )
    
    if (criticalVuln.length > 0) {
      for (const asset of criticalVuln.slice(0, 5)) {
        this.recordObservation({
          type: ObservationType.WEAKNESS,
          severity: ObservationSeverity.CRITICAL,
          subject: {
            unit: asset.unit,
            asset: asset.tag_id || asset.asset_id,
            assetId: asset.tag_id
          },
          description: `Critical vulnerability on ${asset.device_type || 'device'} ${asset.tag_id || asset.ip_address}: ${asset.cve_count || asset.vulnerabilities?.length || 'multiple'} CVEs including critical severity`,
          evidence: [this.assetEvidence(asset)],
          recommendations: [
            'Apply security patches immediately if available',
            'Implement network segmentation to isolate vulnerable device',
            'Enable additional monitoring for exploitation attempts',
            'Contact vendor for mitigation guidance'
          ]
        })
      }
    }
    
    // High vulnerability count
    const highVulnCount = vulnerableAssets.filter(a => (a.cve_count || 0) > 10)
    if (highVulnCount.length > 0) {
      this.recordObservation({
        type: ObservationType.WEAKNESS,
        severity: ObservationSeverity.HIGH,
        subject: { plant: this.plant },
        description: `${highVulnCount.length} assets have more than 10 known vulnerabilities each`,
        evidence: highVulnCount.slice(0, 5).map(a => this.assetEvidence(a)),
        recommendations: [
          'Prioritize patching based on criticality and exposure',
          'Conduct vulnerability assessment for patch planning',
          'Consider virtual patching via network controls'
        ]
      })
    }
    
    // Summary of vulnerability landscape
    if (vulnerableAssets.length > 0) {
      const totalVulns = vulnerableAssets.reduce((sum, a) => sum + (a.cve_count || 0), 0)
      this.recordObservation({
        type: ObservationType.PATTERN,
        severity: totalVulns > 50 ? ObservationSeverity.HIGH : ObservationSeverity.MEDIUM,
        subject: { plant: this.plant },
        description: `Vulnerability landscape: ${vulnerableAssets.length} assets with ${totalVulns} total known vulnerabilities`,
        confidence: 0.9
      })
    }
  }
  
  /**
   * Analyze network exposure
   */
  analyzeNetworkExposure(assets) {
    const networkedAssets = assets.filter(a => a.ip_address)
    const exposedCritical = []
    
    for (const asset of networkedAssets) {
      const riskResult = calculateAssetRisk(asset, this.context)
      const exposureFactor = riskResult.factors.find(f => 
        f.factor === RiskFactor.NETWORK_EXPOSURE || 
        f.factor === RiskFactor.INTERNET_REACHABLE
      )
      
      if (exposureFactor && riskResult.context?.deviceContext?.criticality === 'critical') {
        exposedCritical.push({ asset, riskResult })
      }
    }
    
    if (exposedCritical.length > 0) {
      this.recordObservation({
        type: ObservationType.WEAKNESS,
        severity: ObservationSeverity.HIGH,
        subject: { plant: this.plant },
        description: `${exposedCritical.length} critical assets have network exposure`,
        evidence: exposedCritical.slice(0, 5).map(({ asset }) => this.assetEvidence(asset)),
        recommendations: [
          'Review network segmentation architecture',
          'Implement defense-in-depth controls',
          'Enable deep packet inspection for OT protocols',
          'Consider deploying industrial DMZ'
        ]
      })
    }
    
    // Check for potential internet exposure
    const publicIPs = networkedAssets.filter(a => !this.isPrivateIP(a.ip_address))
    if (publicIPs.length > 0) {
      this.recordObservation({
        type: ObservationType.WEAKNESS,
        severity: ObservationSeverity.CRITICAL,
        subject: { plant: this.plant },
        description: `${publicIPs.length} OT assets may have internet-routable IP addresses`,
        evidence: publicIPs.slice(0, 3).map(a => this.assetEvidence(a)),
        recommendations: [
          'Verify these are not directly internet-accessible',
          'Implement firewall rules to block external access',
          'Enable VPN for any required remote access'
        ]
      })
    }
  }
  
  /**
   * Analyze patch status
   */
  analyzePatchStatus(assets) {
    const now = new Date()
    const stalePatched = []
    const unpatched = []
    
    for (const asset of assets) {
      if (asset.has_security_patches === false || asset.is_managed === false) {
        unpatched.push(asset)
      } else if (asset.last_patch_date) {
        const patchDate = new Date(asset.last_patch_date)
        const daysSincePatch = Math.floor((now - patchDate) / (1000 * 60 * 60 * 24))
        
        if (daysSincePatch > 365) {
          stalePatched.push({ asset, daysSincePatch })
        }
      }
    }
    
    if (unpatched.length > 0) {
      const unmanagedPercent = Math.round((unpatched.length / assets.length) * 100)
      this.recordObservation({
        type: ObservationType.WEAKNESS,
        severity: unmanagedPercent > 30 ? ObservationSeverity.HIGH : ObservationSeverity.MEDIUM,
        subject: { plant: this.plant },
        description: `${unpatched.length} assets (${unmanagedPercent}%) are not security-managed or have no patches`,
        evidence: unpatched.slice(0, 5).map(a => this.assetEvidence(a)),
        recommendations: [
          'Establish patch management program for OT assets',
          'Work with vendors on patch qualification',
          'Implement compensating controls for unpatchable systems'
        ]
      })
    }
    
    if (stalePatched.length > 0) {
      this.recordObservation({
        type: ObservationType.WEAKNESS,
        severity: ObservationSeverity.MEDIUM,
        subject: { plant: this.plant },
        description: `${stalePatched.length} assets haven't been patched in over a year`,
        recommendations: [
          'Review patch schedule and vendor release cycles',
          'Validate patches in test environment before deployment'
        ]
      })
    }
  }
  
  /**
   * Analyze security configuration
   */
  analyzeSecurityConfig(assets) {
    // Check for assets missing authentication
    const noAuth = assets.filter(a => 
      a.authentication_required === false || 
      a.password_protected === false
    )
    
    if (noAuth.length > 0) {
      this.recordObservation({
        type: ObservationType.WEAKNESS,
        severity: ObservationSeverity.HIGH,
        subject: { plant: this.plant },
        description: `${noAuth.length} assets have authentication disabled or unprotected`,
        evidence: noAuth.slice(0, 5).map(a => this.assetEvidence(a)),
        recommendations: [
          'Enable authentication on all networkable devices',
          'Implement least-privilege access controls',
          'Deploy centralized authentication where supported'
        ]
      })
    }
    
    // Check for default credentials indicators
    const defaultCreds = assets.filter(a => 
      a.default_credentials === true || 
      a.password_changed === false
    )
    
    if (defaultCreds.length > 0) {
      this.recordObservation({
        type: ObservationType.WEAKNESS,
        severity: ObservationSeverity.HIGH,
        subject: { plant: this.plant },
        description: `${defaultCreds.length} assets may be using default credentials`,
        recommendations: [
          'Change default passwords on all devices',
          'Implement password policy for OT assets',
          'Use unique credentials per device where possible'
        ]
      })
    }
  }
  
  /**
   * Find positive security findings
   */
  findSecurityStrengths(assets) {
    const networkedAssets = assets.filter(a => a.ip_address)
    
    // Good patch coverage
    const patchedAssets = assets.filter(a => a.has_security_patches === true)
    const patchPercent = Math.round((patchedAssets.length / assets.length) * 100)
    
    if (patchPercent >= 80) {
      this.recordObservation({
        type: ObservationType.STRENGTH,
        severity: ObservationSeverity.POSITIVE,
        subject: { plant: this.plant },
        description: `Strong patch coverage: ${patchPercent}% of assets have security patches applied`,
        confidence: 0.9
      })
    }
    
    // Low vulnerability count
    const vulnAssets = assets.filter(a => a.cve_count > 0)
    const vulnPercent = Math.round((vulnAssets.length / assets.length) * 100)
    
    if (vulnPercent < 10 && assets.length > 10) {
      this.recordObservation({
        type: ObservationType.STRENGTH,
        severity: ObservationSeverity.POSITIVE,
        subject: { plant: this.plant },
        description: `Low vulnerability exposure: Only ${vulnPercent}% of assets have known CVEs`,
        confidence: 0.85
      })
    }
    
    // Good network segmentation (all private IPs)
    const allPrivate = networkedAssets.every(a => this.isPrivateIP(a.ip_address))
    if (allPrivate && networkedAssets.length > 0) {
      this.recordObservation({
        type: ObservationType.STRENGTH,
        severity: ObservationSeverity.POSITIVE,
        subject: { plant: this.plant },
        description: 'All networked OT assets use private IP addresses - good network isolation',
        confidence: 0.9
      })
    }
  }
  
  /**
   * Share top findings to break room
   */
  shareTopFindings() {
    const criticalObs = this.observations.filter(o => 
      o.severity === ObservationSeverity.CRITICAL
    )
    
    // Share critical findings
    for (const obs of criticalObs.slice(0, 3)) {
      this.shareObservation(obs)
    }
    
    // Share one positive finding if we have any
    const positive = this.observations.find(o => o.type === ObservationType.STRENGTH)
    if (positive) {
      this.shareObservation(positive)
    }
  }
  
  /**
   * Check if IP is private
   */
  isPrivateIP(ip) {
    if (!ip) return true
    const parts = ip.split('.').map(Number)
    if (parts.length !== 4) return true
    
    if (parts[0] === 10) return true
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
    if (parts[0] === 192 && parts[1] === 168) return true
    if (parts[0] === 127) return true
    
    return false
  }
  
  /**
   * Generate answer for security questions
   */
  async generateAnswer(question) {
    const questionLower = question.toLowerCase()
    
    if (questionLower.includes('vulnerable') || questionLower.includes('cve')) {
      const vulnObs = this.observations.filter(o => 
        o.description.toLowerCase().includes('vulnerab') ||
        o.description.toLowerCase().includes('cve')
      )
      
      if (vulnObs.length > 0) {
        return vulnObs.map(o => o.description).join('\n\n')
      }
      return 'No significant vulnerability findings at this time.'
    }
    
    if (questionLower.includes('patch')) {
      const patchObs = this.observations.filter(o => 
        o.description.toLowerCase().includes('patch')
      )
      
      if (patchObs.length > 0) {
        return patchObs.map(o => o.description).join('\n\n')
      }
      return 'No patch-related findings at this time.'
    }
    
    if (questionLower.includes('exposure') || questionLower.includes('network')) {
      const networkObs = this.observations.filter(o => 
        o.description.toLowerCase().includes('network') ||
        o.description.toLowerCase().includes('exposure') ||
        o.description.toLowerCase().includes('ip')
      )
      
      if (networkObs.length > 0) {
        return networkObs.map(o => o.description).join('\n\n')
      }
      return 'Network exposure analysis shows no significant concerns.'
    }
    
    return super.generateAnswer(question)
  }
}

export default SecurityAgent
