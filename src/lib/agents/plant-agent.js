/**
 * PLANT AGENT
 * Orchestrates sub-agents for a single plant/facility
 * 
 * The Plant Agent:
 * - Spawns and manages specialized sub-agents (Security, Lifecycle, Gap, Risk, Dependency)
 * - Aggregates findings from sub-agents
 * - Provides plant-level health and status
 * - Exposes MCP tools for external communication
 */

import { BaseAgent } from './base-agent.js'
import {
  AgentRole,
  AgentState,
  MessageType,
  MessageTopic,
  ObservationType,
  ObservationSeverity,
  createAgentConfig,
  PLANT_AGENT_TOOLS
} from './types.js'

// =============================================================================
// PLANT AGENT CLASS
// =============================================================================

export class PlantAgent extends BaseAgent {
  constructor(config) {
    super({
      ...config,
      role: AgentRole.PLANT,
      description: config.description || `Plant-level orchestrator for ${config.plant}`,
      capabilities: ['orchestration', 'aggregation', 'reporting', ...(config.capabilities || [])]
    })
    
    // Sub-agents
    this.subAgents = new Map()
    this.subAgentClasses = new Map()
    
    // Aggregated data
    this.aggregatedObservations = []
    this.plantHealth = null
    this.lastAggregation = null
    
    // Plant-specific context
    this.assets = []
    this.matchResults = null
    this.gapAnalysis = null
    this.riskAnalysis = null
    this.industry = config.industry || null
  }
  
  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================
  
  /**
   * Initialize with sub-agent classes
   */
  registerSubAgentClass(role, AgentClass) {
    this.subAgentClasses.set(role, AgentClass)
  }
  
  /**
   * Initialize all sub-agents
   */
  async initialize({ breakRoom, context = {}, llmClient = null }) {
    await super.initialize({ breakRoom, context, llmClient })
    
    // Store plant data
    this.assets = context.assets || []
    this.matchResults = context.matchResults || null
    this.gapAnalysis = context.gapAnalysis || null
    this.riskAnalysis = context.riskAnalysis || null
    this.industry = context.industry || this.industry
    
    // Spawn sub-agents
    await this.spawnSubAgents({ breakRoom, llmClient })
    
    return this
  }
  
  /**
   * Spawn all registered sub-agent types
   */
  async spawnSubAgents({ breakRoom, llmClient }) {
    for (const [role, AgentClass] of this.subAgentClasses) {
      const subConfig = createAgentConfig({
        id: `${this.id}-${role}`,
        name: `${this.plant} ${this.capitalizeRole(role)} Agent`,
        role,
        plant: this.plant,
        plantCode: this.plantCode,
        description: `${role} analysis for ${this.plant}`
      })
      
      const subAgent = new AgentClass(subConfig)
      await subAgent.initialize({
        breakRoom,
        context: this.buildSubAgentContext(role),
        llmClient
      })
      
      this.subAgents.set(role, subAgent)
      console.log(`[${this.name}] Spawned ${role} sub-agent`)
    }
  }
  
  /**
   * Build context specific to sub-agent role
   */
  buildSubAgentContext(role) {
    const baseContext = {
      assets: this.assets,
      matchResults: this.matchResults,
      industry: this.industry,
      plant: this.plant,
      plantCode: this.plantCode
    }
    
    switch (role) {
      case AgentRole.GAP:
        return { ...baseContext, gapAnalysis: this.gapAnalysis }
      case AgentRole.RISK:
        return { ...baseContext, riskAnalysis: this.riskAnalysis }
      case AgentRole.LIFECYCLE:
        return { ...baseContext }
      case AgentRole.SECURITY:
        return { ...baseContext, riskAnalysis: this.riskAnalysis }
      case AgentRole.DEPENDENCY:
        return { ...baseContext }
      default:
        return baseContext
    }
  }
  
  // ===========================================================================
  // OBSERVATION
  // ===========================================================================
  
  /**
   * Orchestrate observation across all sub-agents
   */
  async observe() {
    this.state = AgentState.OBSERVING
    
    // Trigger all sub-agents to observe
    const observationPromises = []
    for (const [role, agent] of this.subAgents) {
      observationPromises.push(
        agent.observe().catch(err => {
          console.error(`[${this.name}] ${role} observation failed:`, err)
          return []
        })
      )
    }
    
    await Promise.all(observationPromises)
    
    // Aggregate observations
    await this.aggregateFindings()
    
    // Generate plant-level observations
    await this.generatePlantObservations()
    
    this.state = AgentState.IDLE
    this.lastObservation = Date.now()
    
    return this.observations
  }
  
  /**
   * Aggregate findings from all sub-agents
   */
  async aggregateFindings() {
    this.aggregatedObservations = []
    
    for (const [role, agent] of this.subAgents) {
      for (const obs of agent.observations) {
        this.aggregatedObservations.push({
          ...obs,
          sourceAgent: role,
          sourceAgentId: agent.id
        })
      }
    }
    
    // Sort by severity and time
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, positive: 4, info: 5 }
    this.aggregatedObservations.sort((a, b) => {
      const severityDiff = (severityOrder[a.severity] || 5) - (severityOrder[b.severity] || 5)
      if (severityDiff !== 0) return severityDiff
      return b.timestamp - a.timestamp
    })
    
    // Calculate plant health
    this.calculatePlantHealth()
    
    this.lastAggregation = Date.now()
  }
  
  /**
   * Generate plant-level observations from aggregated data
   */
  async generatePlantObservations() {
    const weaknesses = this.aggregatedObservations.filter(o => 
      o.type === ObservationType.WEAKNESS || o.type === ObservationType.ANOMALY
    )
    const strengths = this.aggregatedObservations.filter(o => 
      o.type === ObservationType.STRENGTH
    )
    
    // Cross-agent patterns
    const criticalCount = weaknesses.filter(o => o.severity === ObservationSeverity.CRITICAL).length
    
    if (criticalCount > 3) {
      this.recordObservation({
        type: ObservationType.PATTERN,
        severity: ObservationSeverity.CRITICAL,
        subject: { plant: this.plant },
        description: `Multiple critical issues detected across ${this.plant}: ${criticalCount} critical findings from multiple domains`,
        recommendations: [
          'Conduct immediate cross-functional review',
          'Prioritize critical findings by blast radius',
          'Consider temporary compensating controls'
        ]
      })
    }
    
    // Check for concentration of issues in specific units
    const unitIssues = {}
    for (const obs of weaknesses) {
      const unit = obs.subject?.unit || 'Unknown'
      if (!unitIssues[unit]) unitIssues[unit] = []
      unitIssues[unit].push(obs)
    }
    
    for (const [unit, issues] of Object.entries(unitIssues)) {
      if (issues.length > 5) {
        this.recordObservation({
          type: ObservationType.PATTERN,
          severity: issues.some(i => i.severity === ObservationSeverity.CRITICAL) 
            ? ObservationSeverity.HIGH 
            : ObservationSeverity.MEDIUM,
          subject: { plant: this.plant, unit },
          description: `${unit} has concentrated issues: ${issues.length} findings`,
          recommendations: [
            `Focus improvement efforts on ${unit}`,
            'Review unit-specific root causes'
          ]
        })
      }
    }
    
    // Good news
    if (strengths.length > weaknesses.length) {
      this.recordObservation({
        type: ObservationType.STRENGTH,
        severity: ObservationSeverity.POSITIVE,
        subject: { plant: this.plant },
        description: `${this.plant} is doing well overall: ${strengths.length} positive findings vs ${weaknesses.length} issues`,
        confidence: 0.9
      })
    }
    
    // Share summary to break room
    if (this.breakRoom) {
      this.speak({
        type: MessageType.SUMMARY,
        topic: MessageTopic.GENERAL,
        content: this.buildSummaryContent(),
        metadata: {
          criticalCount,
          totalWeaknesses: weaknesses.length,
          totalStrengths: strengths.length,
          healthScore: this.plantHealth?.score
        }
      })
    }
  }
  
  /**
   * Calculate overall plant health score
   */
  calculatePlantHealth() {
    const weaknesses = this.aggregatedObservations.filter(o => 
      o.type === ObservationType.WEAKNESS || o.type === ObservationType.ANOMALY
    )
    
    const criticalCount = weaknesses.filter(o => o.severity === ObservationSeverity.CRITICAL).length
    const highCount = weaknesses.filter(o => o.severity === ObservationSeverity.HIGH).length
    const mediumCount = weaknesses.filter(o => o.severity === ObservationSeverity.MEDIUM).length
    
    // Score calculation
    let score = 100
    score -= criticalCount * 15
    score -= highCount * 7
    score -= mediumCount * 2
    score = Math.max(0, Math.min(100, score))
    
    this.plantHealth = {
      score,
      status: score >= 80 ? 'healthy' : score >= 60 ? 'needs_attention' : score >= 40 ? 'degraded' : 'critical',
      breakdown: {
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: weaknesses.length - criticalCount - highCount - mediumCount
      },
      byDomain: this.getHealthByDomain()
    }
  }
  
  /**
   * Get health breakdown by agent domain
   */
  getHealthByDomain() {
    const domains = {}
    
    for (const [role, agent] of this.subAgents) {
      const health = agent.getPlantHealth()
      domains[role] = {
        score: health.healthScore,
        status: health.status,
        issues: health.summary.weaknesses
      }
    }
    
    return domains
  }
  
  // ===========================================================================
  // COMMUNICATION
  // ===========================================================================
  
  /**
   * Build summary content for break room
   */
  buildSummaryContent() {
    if (!this.plantHealth) return `${this.plant}: Awaiting analysis`
    
    const { score, status, breakdown } = this.plantHealth
    
    let content = `${this.plant} Health: ${score}/100 (${status})\n`
    
    if (breakdown.critical > 0) {
      content += `- ${breakdown.critical} CRITICAL issues require immediate attention\n`
    }
    if (breakdown.high > 0) {
      content += `- ${breakdown.high} high-priority items\n`
    }
    
    // Top finding
    const topIssue = this.aggregatedObservations.find(o => 
      o.severity === ObservationSeverity.CRITICAL || o.severity === ObservationSeverity.HIGH
    )
    if (topIssue) {
      content += `Top concern: ${topIssue.description}`
    }
    
    return content
  }
  
  /**
   * Handle questions by routing to appropriate sub-agent
   */
  async generateAnswer(question) {
    const questionLower = question.toLowerCase()
    
    // Route to specific sub-agent based on question content
    if (questionLower.includes('security') || questionLower.includes('vulnerability') || questionLower.includes('cve')) {
      const agent = this.subAgents.get(AgentRole.SECURITY)
      if (agent) return agent.generateAnswer(question)
    }
    
    if (questionLower.includes('lifecycle') || questionLower.includes('eol') || questionLower.includes('obsolete')) {
      const agent = this.subAgents.get(AgentRole.LIFECYCLE)
      if (agent) return agent.generateAnswer(question)
    }
    
    if (questionLower.includes('gap') || questionLower.includes('blind spot') || questionLower.includes('orphan')) {
      const agent = this.subAgents.get(AgentRole.GAP)
      if (agent) return agent.generateAnswer(question)
    }
    
    if (questionLower.includes('risk')) {
      const agent = this.subAgents.get(AgentRole.RISK)
      if (agent) return agent.generateAnswer(question)
    }
    
    if (questionLower.includes('dependency') || questionLower.includes('impact')) {
      const agent = this.subAgents.get(AgentRole.DEPENDENCY)
      if (agent) return agent.generateAnswer(question)
    }
    
    // General plant questions
    if (questionLower.includes('health') || questionLower.includes('status') || questionLower.includes('overview')) {
      return this.buildSummaryContent()
    }
    
    // Try LLM if available
    return super.generateAnswer(question)
  }
  
  // ===========================================================================
  // MCP TOOLS
  // ===========================================================================
  
  /**
   * Get MCP tool definitions for this plant agent
   */
  getMcpTools() {
    return PLANT_AGENT_TOOLS.map(tool => ({
      ...tool,
      name: `${this.plantCode || this.plant.toLowerCase().replace(/\s+/g, '_')}_${tool.name}`
    }))
  }
  
  /**
   * Handle MCP tool call
   */
  async handleMcpToolCall(toolName, args = {}) {
    // Strip plant prefix if present
    const baseName = toolName.replace(/^[a-z_]+_/, '')
    
    switch (baseName) {
      case 'get_plant_health':
        return this.getPlantHealth(args)
      
      case 'get_weaknesses':
        return this.getAggregatedWeaknesses(args)
      
      case 'get_strengths':
        return this.getAggregatedStrengths(args)
      
      case 'get_recommendations':
        return this.getRecommendations(args)
      
      case 'ask_agent':
        return { answer: await this.generateAnswer(args.question) }
      
      case 'get_observations':
        return this.getAggregatedObservations(args)
      
      default:
        throw new Error(`Unknown tool: ${toolName}`)
    }
  }
  
  /**
   * Override getPlantHealth to include aggregated data
   */
  getPlantHealth({ includeDetails = false } = {}) {
    const base = super.getPlantHealth({ includeDetails })
    
    return {
      ...base,
      plantHealth: this.plantHealth,
      subAgentStatus: Object.fromEntries(
        Array.from(this.subAgents.entries()).map(([role, agent]) => [
          role,
          { state: agent.state, observations: agent.observations.length }
        ])
      ),
      lastAggregation: this.lastAggregation
    }
  }
  
  /**
   * Get aggregated weaknesses from all sub-agents
   */
  getAggregatedWeaknesses({ severity = 'all', topic = null, limit = 10 } = {}) {
    let weaknesses = this.aggregatedObservations.filter(o => 
      o.type === ObservationType.WEAKNESS || o.type === ObservationType.ANOMALY
    )
    
    if (severity !== 'all') {
      weaknesses = weaknesses.filter(o => o.severity === severity)
    }
    
    return weaknesses.slice(0, limit).map(o => ({
      ...o,
      agentSource: o.sourceAgent
    }))
  }
  
  /**
   * Get aggregated strengths from all sub-agents
   */
  getAggregatedStrengths({ limit = 10 } = {}) {
    return this.aggregatedObservations
      .filter(o => o.type === ObservationType.STRENGTH)
      .slice(0, limit)
  }
  
  /**
   * Get recommendations from all sub-agents
   */
  async getRecommendations({ priority = 'all', limit = 10 } = {}) {
    const allSuggestions = []
    
    for (const [role, agent] of this.subAgents) {
      const suggestions = await agent.suggest()
      for (const s of suggestions) {
        allSuggestions.push({ ...s, source: role })
      }
    }
    
    // Filter by priority
    let filtered = allSuggestions
    if (priority !== 'all') {
      filtered = allSuggestions.filter(s => s.priority === priority)
    }
    
    // Sort and limit
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    filtered.sort((a, b) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3))
    
    return filtered.slice(0, limit)
  }
  
  /**
   * Get all aggregated observations
   */
  getAggregatedObservations({ since = null, type = null, limit = 20 } = {}) {
    let obs = [...this.aggregatedObservations]
    
    if (since) {
      obs = obs.filter(o => o.timestamp >= since)
    }
    
    if (type) {
      obs = obs.filter(o => o.type === type)
    }
    
    return obs.slice(0, limit)
  }
  
  // ===========================================================================
  // UTILITIES
  // ===========================================================================
  
  /**
   * Get a sub-agent by role
   */
  getSubAgent(role) {
    return this.subAgents.get(role)
  }
  
  /**
   * Capitalize role name for display
   */
  capitalizeRole(role) {
    return role.charAt(0).toUpperCase() + role.slice(1)
  }
  
  /**
   * Update context for all sub-agents
   */
  updateContext(newContext) {
    super.updateContext(newContext)
    
    // Update plant data
    if (newContext.assets) this.assets = newContext.assets
    if (newContext.matchResults) this.matchResults = newContext.matchResults
    if (newContext.gapAnalysis) this.gapAnalysis = newContext.gapAnalysis
    if (newContext.riskAnalysis) this.riskAnalysis = newContext.riskAnalysis
    if (newContext.industry) this.industry = newContext.industry
    
    // Propagate to sub-agents
    for (const [role, agent] of this.subAgents) {
      agent.updateContext(this.buildSubAgentContext(role))
    }
  }
  
  /**
   * Export state including sub-agents
   */
  toJSON() {
    return {
      ...super.toJSON(),
      aggregatedObservations: this.aggregatedObservations,
      plantHealth: this.plantHealth,
      lastAggregation: this.lastAggregation,
      subAgents: Object.fromEntries(
        Array.from(this.subAgents.entries()).map(([role, agent]) => [role, agent.toJSON()])
      )
    }
  }
}

export default PlantAgent
