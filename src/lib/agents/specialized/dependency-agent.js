/**
 * DEPENDENCY AGENT
 * Specialized agent for process dependency and blast radius analysis
 * 
 * Observes: Process dependencies, single points of failure, blast radius, critical paths
 * Leverages: dependency-mapper.js
 */

import { BaseAgent } from '../base-agent.js'
import {
  AgentRole,
  MessageTopic,
  ObservationType,
  ObservationSeverity
} from '../types.js'

export class DependencyAgent extends BaseAgent {
  constructor(config) {
    super({
      ...config,
      role: AgentRole.DEPENDENCY,
      description: config.description || 'Analyzes process dependencies and blast radius',
      capabilities: ['dependency_mapping', 'impact_analysis', 'critical_path_identification']
    })
  }
  
  /**
   * Relevant topics for dependency agent
   */
  getRelevantTopics() {
    return [MessageTopic.DEPENDENCY, MessageTopic.RISK]
  }
  
  /**
   * Map observations to topics
   */
  getTopicFromObservation(observation) {
    return MessageTopic.DEPENDENCY
  }
  
  /**
   * Main observation logic for dependency domain
   */
  async observe() {
    this.state = 'observing'
    const assets = this.context.assets || []
    const industry = this.context.industry
    
    // Clear old observations
    this.observations = []
    
    // Analyze dependencies
    this.analyzeControllerDependencies(assets)
    this.analyzeNetworkDependencies(assets)
    this.analyzeProcessDependencies(assets, industry)
    this.analyzeSinglePointsOfFailure(assets)
    this.analyzeBlastRadius(assets)
    
    // Find strengths
    this.findDependencyStrengths(assets)
    
    // Share significant findings
    this.shareTopFindings()
    
    this.state = 'idle'
    this.lastObservation = Date.now()
    return this.observations
  }
  
  /**
   * Analyze controller-to-device dependencies
   */
  analyzeControllerDependencies(assets) {
    // Find controllers (PLC, DCS, RTU)
    const controllers = assets.filter(a => 
      /plc|dcs|rtu|pac|controller/i.test(a.device_type || '')
    )
    
    // Find field devices
    const fieldDevices = assets.filter(a => 
      /transmitter|valve|sensor|actuator|drive/i.test(a.device_type || '')
    )
    
    // Map dependencies by unit/area
    const unitDeps = {}
    for (const controller of controllers) {
      const unit = controller.unit || controller.area || 'Unknown'
      if (!unitDeps[unit]) unitDeps[unit] = { controllers: [], devices: [] }
      unitDeps[unit].controllers.push(controller)
    }
    
    for (const device of fieldDevices) {
      const unit = device.unit || device.area || 'Unknown'
      if (!unitDeps[unit]) unitDeps[unit] = { controllers: [], devices: [] }
      unitDeps[unit].devices.push(device)
    }
    
    // Check for imbalanced ratios
    for (const [unit, deps] of Object.entries(unitDeps)) {
      if (deps.controllers.length === 1 && deps.devices.length > 20) {
        this.recordObservation({
          type: ObservationType.WEAKNESS,
          severity: ObservationSeverity.HIGH,
          subject: { plant: this.plant, unit },
          description: `${unit} has single controller managing ${deps.devices.length} field devices - high dependency concentration`,
          evidence: [this.assetEvidence(deps.controllers[0])],
          recommendations: [
            'Consider controller redundancy',
            'Review backup/failover procedures',
            'Ensure adequate spare parts availability'
          ]
        })
      }
      
      if (deps.controllers.length === 0 && deps.devices.length > 5) {
        this.recordObservation({
          type: ObservationType.ANOMALY,
          severity: ObservationSeverity.MEDIUM,
          subject: { plant: this.plant, unit },
          description: `${unit} has ${deps.devices.length} field devices but no visible controller`,
          recommendations: [
            'Verify controller exists but was not discovered',
            'Check if devices are controlled from another unit'
          ]
        })
      }
    }
    
    // Overall controller coverage
    if (controllers.length > 0 && fieldDevices.length > 0) {
      const ratio = Math.round(fieldDevices.length / controllers.length)
      if (ratio > 50) {
        this.recordObservation({
          type: ObservationType.PATTERN,
          severity: ObservationSeverity.MEDIUM,
          subject: { plant: this.plant },
          description: `High device-to-controller ratio: ${ratio}:1 on average`,
          recommendations: [
            'Review controller capacity utilization',
            'Plan for controller redundancy where critical'
          ]
        })
      }
    }
  }
  
  /**
   * Analyze network-level dependencies
   */
  analyzeNetworkDependencies(assets) {
    const networkedAssets = assets.filter(a => a.ip_address)
    
    // Group by subnet
    const subnets = {}
    for (const asset of networkedAssets) {
      const subnet = asset.ip_address.split('.').slice(0, 3).join('.')
      if (!subnets[subnet]) subnets[subnet] = []
      subnets[subnet].push(asset)
    }
    
    // Check for overly concentrated subnets
    for (const [subnet, subnetAssets] of Object.entries(subnets)) {
      const criticalInSubnet = subnetAssets.filter(a => 
        a.criticality === 'critical' || 
        /plc|dcs|sis|safety/i.test(a.device_type || '')
      )
      
      if (criticalInSubnet.length > 10) {
        this.recordObservation({
          type: ObservationType.WEAKNESS,
          severity: ObservationSeverity.MEDIUM,
          subject: { plant: this.plant },
          description: `${criticalInSubnet.length} critical assets on subnet ${subnet}.0/24 - network failure would have broad impact`,
          recommendations: [
            'Consider network segmentation for critical assets',
            'Implement network redundancy',
            'Review switch/router redundancy'
          ]
        })
      }
    }
    
    // Check for single VLAN concentration
    const vlans = {}
    for (const asset of networkedAssets) {
      const vlan = asset.vlan || asset.network_segment || 'default'
      if (!vlans[vlan]) vlans[vlan] = []
      vlans[vlan].push(asset)
    }
    
    for (const [vlan, vlanAssets] of Object.entries(vlans)) {
      if (vlanAssets.length > 50) {
        this.recordObservation({
          type: ObservationType.PATTERN,
          severity: ObservationSeverity.LOW,
          subject: { plant: this.plant },
          description: `Large network segment (${vlan}): ${vlanAssets.length} assets`,
          recommendations: [
            'Consider micro-segmentation for large segments'
          ]
        })
      }
    }
  }
  
  /**
   * Analyze process flow dependencies
   */
  analyzeProcessDependencies(assets, industry) {
    // Group assets by unit
    const unitAssets = {}
    for (const asset of assets) {
      const unit = asset.unit || asset.area || 'Unknown'
      if (!unitAssets[unit]) unitAssets[unit] = []
      unitAssets[unit].push(asset)
    }
    
    const units = Object.keys(unitAssets)
    
    // Check for utility dependencies
    const utilityUnits = units.filter(u => 
      /utility|utilities|power|steam|air|water|cooling|electrical/i.test(u)
    )
    
    if (utilityUnits.length > 0) {
      const processUnits = units.filter(u => !utilityUnits.includes(u))
      this.recordObservation({
        type: ObservationType.PATTERN,
        severity: ObservationSeverity.INFO,
        subject: { plant: this.plant },
        description: `Utility dependencies: ${utilityUnits.length} utility units support ${processUnits.length} process units`,
        metadata: { utilityUnits, processUnits }
      })
      
      // Utilities are critical dependencies
      for (const utilUnit of utilityUnits) {
        const utilAssets = unitAssets[utilUnit]
        const criticalUtil = utilAssets.filter(a => 
          a.criticality === 'critical' || 
          /plc|controller/i.test(a.device_type || '')
        )
        
        if (criticalUtil.length > 0) {
          this.recordObservation({
            type: ObservationType.WEAKNESS,
            severity: ObservationSeverity.HIGH,
            subject: { plant: this.plant, unit: utilUnit },
            description: `${utilUnit} is a critical dependency: ${criticalUtil.length} control assets support entire plant`,
            evidence: criticalUtil.slice(0, 3).map(a => this.assetEvidence(a)),
            recommendations: [
              'Ensure utility systems have redundancy',
              'Prioritize utility system protection',
              'Review utility backup procedures'
            ]
          })
        }
      }
    }
    
    // Crown jewel identification
    if (industry) {
      const crownJewels = this.identifyCrownJewels(assets, industry)
      if (crownJewels.length > 0) {
        this.recordObservation({
          type: ObservationType.PATTERN,
          severity: ObservationSeverity.HIGH,
          subject: { plant: this.plant },
          description: `Identified ${crownJewels.length} crown jewel assets critical to plant operations`,
          evidence: crownJewels.slice(0, 5).map(a => this.assetEvidence(a)),
          recommendations: [
            'Apply highest security controls to crown jewels',
            'Implement dedicated monitoring',
            'Ensure backup/recovery procedures are tested'
          ]
        })
      }
    }
  }
  
  /**
   * Analyze single points of failure
   */
  analyzeSinglePointsOfFailure(assets) {
    // Group similar devices by unit
    const unitDeviceGroups = {}
    
    for (const asset of assets) {
      const unit = asset.unit || 'Unknown'
      const type = this.normalizeDeviceType(asset.device_type)
      const key = `${unit}:${type}`
      
      if (!unitDeviceGroups[key]) {
        unitDeviceGroups[key] = { unit, type, assets: [] }
      }
      unitDeviceGroups[key].assets.push(asset)
    }
    
    // Find critical SPOFs
    const spofs = []
    for (const [key, group] of Object.entries(unitDeviceGroups)) {
      if (group.assets.length === 1) {
        const asset = group.assets[0]
        const isCritical = 
          asset.criticality === 'critical' ||
          /plc|dcs|sis|safety|controller/i.test(asset.device_type || '')
        
        if (isCritical) {
          spofs.push({ ...group, asset })
        }
      }
    }
    
    if (spofs.length > 0) {
      this.recordObservation({
        type: ObservationType.WEAKNESS,
        severity: ObservationSeverity.HIGH,
        subject: { plant: this.plant },
        description: `${spofs.length} single points of failure identified - critical devices with no redundancy`,
        evidence: spofs.slice(0, 5).map(s => this.assetEvidence(s.asset, 
          `Single ${s.type} in ${s.unit}`
        )),
        recommendations: [
          'Assess risk and impact of each SPOF',
          'Implement redundancy where feasible',
          'Ensure hot spares are available',
          'Document manual backup procedures'
        ]
      })
      
      // Detail critical SPOFs
      for (const spof of spofs.slice(0, 3)) {
        if (/safety|sis/i.test(spof.type)) {
          this.recordObservation({
            type: ObservationType.WEAKNESS,
            severity: ObservationSeverity.CRITICAL,
            subject: { 
              plant: this.plant, 
              unit: spof.unit,
              asset: spof.asset.tag_id 
            },
            description: `SAFETY CRITICAL SPOF: Single ${spof.type} in ${spof.unit}`,
            evidence: [this.assetEvidence(spof.asset)],
            recommendations: [
              'Safety systems typically require redundancy per IEC 61511',
              'Review SIL requirements and current architecture'
            ]
          })
        }
      }
    }
  }
  
  /**
   * Analyze blast radius of potential failures
   */
  analyzeBlastRadius(assets) {
    // Identify high-impact devices
    const controllers = assets.filter(a => 
      /plc|dcs|rtu|controller/i.test(a.device_type || '')
    )
    
    // Estimate blast radius based on unit coverage
    const unitAssets = {}
    for (const asset of assets) {
      const unit = asset.unit || 'Unknown'
      if (!unitAssets[unit]) unitAssets[unit] = []
      unitAssets[unit].push(asset)
    }
    
    for (const controller of controllers) {
      const unit = controller.unit || 'Unknown'
      const unitDeviceCount = unitAssets[unit]?.length || 0
      
      if (unitDeviceCount > 30) {
        this.recordObservation({
          type: ObservationType.PATTERN,
          severity: ObservationSeverity.MEDIUM,
          subject: { 
            plant: this.plant, 
            unit,
            asset: controller.tag_id 
          },
          description: `High blast radius: ${controller.tag_id || controller.device_type} failure could impact ${unitDeviceCount} devices in ${unit}`,
          evidence: [this.assetEvidence(controller)],
          recommendations: [
            'Ensure this controller has redundancy or hot standby',
            'Verify backup/failover procedures',
            'Test failover scenarios regularly'
          ]
        })
      }
    }
    
    // Network infrastructure blast radius
    const networkDevices = assets.filter(a => 
      /switch|router|firewall/i.test(a.device_type || '')
    )
    
    for (const netDevice of networkDevices) {
      // Estimate devices on same subnet
      if (netDevice.ip_address) {
        const subnet = netDevice.ip_address.split('.').slice(0, 3).join('.')
        const subnetDevices = assets.filter(a => 
          a.ip_address?.startsWith(subnet)
        )
        
        if (subnetDevices.length > 20) {
          this.recordObservation({
            type: ObservationType.PATTERN,
            severity: ObservationSeverity.MEDIUM,
            subject: { plant: this.plant, asset: netDevice.tag_id },
            description: `Network infrastructure blast radius: ${netDevice.device_type} serves ~${subnetDevices.length} devices`,
            evidence: [this.assetEvidence(netDevice)],
            recommendations: [
              'Verify network redundancy',
              'Test network failover'
            ]
          })
        }
      }
    }
  }
  
  /**
   * Find positive dependency findings
   */
  findDependencyStrengths(assets) {
    // Check for redundant controllers
    const unitControllers = {}
    for (const asset of assets) {
      if (/plc|dcs|controller/i.test(asset.device_type || '')) {
        const unit = asset.unit || 'Unknown'
        if (!unitControllers[unit]) unitControllers[unit] = []
        unitControllers[unit].push(asset)
      }
    }
    
    const redundantUnits = Object.entries(unitControllers)
      .filter(([unit, controllers]) => controllers.length >= 2)
    
    if (redundantUnits.length > 0) {
      this.recordObservation({
        type: ObservationType.STRENGTH,
        severity: ObservationSeverity.POSITIVE,
        subject: { plant: this.plant },
        description: `Good redundancy: ${redundantUnits.length} units have multiple controllers`,
        confidence: 0.85
      })
    }
    
    // Check for distributed architecture
    const unitsWithControllers = Object.keys(unitControllers).length
    const totalUnits = new Set(assets.map(a => a.unit || 'Unknown')).size
    
    if (unitsWithControllers > 5 && unitsWithControllers >= totalUnits * 0.7) {
      this.recordObservation({
        type: ObservationType.STRENGTH,
        severity: ObservationSeverity.POSITIVE,
        subject: { plant: this.plant },
        description: 'Distributed control architecture: Control systems spread across units reduces single point of failure risk',
        confidence: 0.8
      })
    }
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
   * Identify crown jewel assets
   */
  identifyCrownJewels(assets, industry) {
    const crownJewels = []
    
    for (const asset of assets) {
      let score = 0
      
      // Criticality
      if (asset.criticality === 'critical') score += 3
      
      // Safety systems
      if (/sis|safety|esd/i.test(asset.device_type || '')) score += 4
      
      // Primary controllers
      if (/dcs|plc/i.test(asset.device_type || '') && asset.criticality === 'critical') score += 3
      
      // SCADA/historian
      if (/scada|historian|server/i.test(asset.device_type || '')) score += 2
      
      // Network infrastructure
      if (/firewall/i.test(asset.device_type || '')) score += 2
      
      if (score >= 4) {
        crownJewels.push(asset)
      }
    }
    
    return crownJewels.sort((a, b) => (b.criticality === 'critical' ? 1 : 0) - (a.criticality === 'critical' ? 1 : 0))
  }
  
  /**
   * Normalize device type for comparison
   */
  normalizeDeviceType(deviceType) {
    if (!deviceType) return 'unknown'
    
    const type = deviceType.toLowerCase()
    
    if (/plc|programmable/i.test(type)) return 'plc'
    if (/dcs|distributed/i.test(type)) return 'dcs'
    if (/sis|safety/i.test(type)) return 'safety_controller'
    if (/hmi|panel/i.test(type)) return 'hmi'
    if (/switch/i.test(type)) return 'switch'
    if (/router/i.test(type)) return 'router'
    if (/firewall/i.test(type)) return 'firewall'
    
    return type
  }
  
  /**
   * Generate answer for dependency questions
   */
  async generateAnswer(question) {
    const questionLower = question.toLowerCase()
    
    if (questionLower.includes('single point') || questionLower.includes('spof')) {
      const obs = this.observations.filter(o => 
        o.description.toLowerCase().includes('single point') ||
        o.description.toLowerCase().includes('spof')
      )
      
      if (obs.length > 0) {
        return obs.map(o => o.description).join('\n\n')
      }
      return 'No significant single points of failure identified.'
    }
    
    if (questionLower.includes('blast') || questionLower.includes('impact')) {
      const obs = this.observations.filter(o => 
        o.description.toLowerCase().includes('blast') ||
        o.description.toLowerCase().includes('impact')
      )
      
      if (obs.length > 0) {
        return obs.map(o => o.description).join('\n\n')
      }
      return 'Blast radius analysis shows no major concerns.'
    }
    
    if (questionLower.includes('crown jewel') || questionLower.includes('critical asset')) {
      const obs = this.observations.filter(o => 
        o.description.toLowerCase().includes('crown jewel')
      )
      
      if (obs.length > 0) {
        return obs.map(o => o.description).join('\n\n')
      }
      return 'Crown jewel identification not yet completed.'
    }
    
    return super.generateAnswer(question)
  }
}

export default DependencyAgent
