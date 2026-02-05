/**
 * COORDINATOR AGENT
 * Orchestrates break room discussions, generates summaries, and facilitates communication
 * 
 * The Coordinator:
 * - Prompts agents to share findings
 * - Facilitates cross-agent discussions
 * - Resolves conflicting observations
 * - Generates periodic summaries
 * - Escalates urgent findings
 */

import { BaseAgent } from './base-agent.js'
import {
  AgentRole,
  AgentState,
  MessageType,
  MessageTopic,
  Sentiment,
  ObservationType,
  ObservationSeverity,
  createMessage
} from './types.js'

export class CoordinatorAgent extends BaseAgent {
  constructor(config = {}) {
    super({
      id: config.id || 'coordinator',
      name: config.name || 'Break Room Coordinator',
      role: AgentRole.COORDINATOR,
      description: 'Orchestrates break room discussions and generates summaries',
      capabilities: ['orchestration', 'summarization', 'escalation', 'facilitation']
    })
    
    // Coordinator state
    this.plantAgents = new Map()
    this.lastRound = null
    this.roundInterval = config.roundInterval || 60000 // 1 minute
    this.summaryInterval = config.summaryInterval || 300000 // 5 minutes
    this.lastSummary = null
    
    // Escalation settings
    this.escalationThreshold = config.escalationThreshold || ObservationSeverity.CRITICAL
    this.escalationCallbacks = []
  }
  
  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================
  
  /**
   * Initialize coordinator with break room
   */
  async initialize({ breakRoom, llmClient = null }) {
    await super.initialize({ breakRoom, context: {}, llmClient })
    
    // Subscribe to break room messages
    if (this.breakRoom) {
      this.breakRoom.subscribe(msg => this.handleMessage(msg))
    }
    
    return this
  }
  
  /**
   * Register a plant agent with the coordinator
   */
  registerPlantAgent(plantAgent) {
    this.plantAgents.set(plantAgent.id, plantAgent)
  }
  
  /**
   * Unregister a plant agent
   */
  unregisterPlantAgent(plantAgentId) {
    this.plantAgents.delete(plantAgentId)
  }
  
  // ===========================================================================
  // ORCHESTRATION
  // ===========================================================================
  
  /**
   * Start an observation round - prompt all agents to observe
   */
  async startObservationRound() {
    this.state = AgentState.OBSERVING
    
    // Announce round start
    this.speak({
      type: MessageType.OBSERVATION,
      topic: MessageTopic.GENERAL,
      content: `Starting observation round. All agents, please share your findings.`,
      sentiment: Sentiment.NEUTRAL
    })
    
    // Trigger observations for all plant agents
    const observationPromises = []
    for (const [id, agent] of this.plantAgents) {
      observationPromises.push(
        agent.observe().catch(err => {
          console.error(`[Coordinator] Observation failed for ${agent.name}:`, err)
          return []
        })
      )
    }
    
    await Promise.all(observationPromises)
    
    this.lastRound = Date.now()
    this.state = AgentState.IDLE
    
    // Check for escalations
    await this.checkEscalations()
    
    // Generate round summary
    return this.generateRoundSummary()
  }
  
  /**
   * Generate summary of observation round
   */
  generateRoundSummary() {
    const allObservations = []
    
    for (const agent of this.plantAgents.values()) {
      for (const obs of agent.aggregatedObservations || agent.observations || []) {
        allObservations.push({
          ...obs,
          plantAgent: agent.name,
          plant: agent.plant
        })
      }
    }
    
    // Categorize
    const critical = allObservations.filter(o => o.severity === ObservationSeverity.CRITICAL)
    const high = allObservations.filter(o => o.severity === ObservationSeverity.HIGH)
    const strengths = allObservations.filter(o => o.type === ObservationType.STRENGTH)
    
    // Build summary
    const summary = {
      timestamp: Date.now(),
      plantsAnalyzed: this.plantAgents.size,
      totalObservations: allObservations.length,
      critical: critical.length,
      high: high.length,
      strengths: strengths.length,
      topIssues: [...critical, ...high].slice(0, 5),
      topStrengths: strengths.slice(0, 3)
    }
    
    // Share summary
    let content = `Observation Round Complete: ${this.plantAgents.size} plants analyzed.\n`
    content += `Found ${allObservations.length} observations: ${critical.length} critical, ${high.length} high, ${strengths.length} strengths.\n`
    
    if (critical.length > 0) {
      content += `\nCRITICAL ISSUES:\n`
      for (const issue of critical.slice(0, 3)) {
        content += `- [${issue.plant}] ${issue.description}\n`
      }
    }
    
    if (strengths.length > 0) {
      content += `\nGOOD NEWS:\n`
      for (const strength of strengths.slice(0, 2)) {
        content += `- [${strength.plant}] ${strength.description}\n`
      }
    }
    
    this.speak({
      type: MessageType.SUMMARY,
      topic: MessageTopic.GENERAL,
      content,
      sentiment: critical.length > 0 ? Sentiment.URGENT : 
                 strengths.length > high.length ? Sentiment.POSITIVE : Sentiment.NEUTRAL,
      metadata: { summary }
    })
    
    return summary
  }
  
  // ===========================================================================
  // FACILITATION
  // ===========================================================================
  
  /**
   * Handle incoming messages and facilitate discussion
   */
  async handleMessage(message) {
    // Skip system and own messages
    if (message.agentId === 'system' || message.agentId === this.id) {
      return
    }
    
    // Check for critical observations that need acknowledgment
    if (message.type === MessageType.CRITIQUE && 
        message.metadata?.severity === ObservationSeverity.CRITICAL) {
      await this.acknowledgeCritical(message)
    }
    
    // Check for questions that need routing
    if (message.type === MessageType.QUESTION) {
      await this.facilitateQuestion(message)
    }
    
    // Check for conflicting observations
    await this.checkConflicts(message)
  }
  
  /**
   * Acknowledge critical findings
   */
  async acknowledgeCritical(message) {
    this.speak({
      type: MessageType.RESPONSE,
      topic: message.topic,
      content: `Acknowledged critical finding from ${message.agentName}. Escalating for immediate attention.`,
      replyTo: message.id,
      threadId: message.threadId,
      sentiment: Sentiment.URGENT
    })
    
    // Trigger escalation
    await this.escalate(message)
  }
  
  /**
   * Facilitate cross-agent questions
   */
  async facilitateQuestion(message) {
    const targetAgent = message.metadata?.targetAgent
    
    if (targetAgent === 'all') {
      // Encourage agents to respond
      this.speak({
        type: MessageType.OBSERVATION,
        topic: message.topic,
        content: `${message.agentName} has asked: "${message.content.slice(0, 100)}..." - relevant agents please respond.`,
        replyTo: message.id,
        threadId: message.threadId
      })
    }
  }
  
  /**
   * Check for conflicting observations
   */
  async checkConflicts(newMessage) {
    if (!this.breakRoom) return
    
    // Get recent observations on same topic
    const recentObs = this.breakRoom.getMessages({
      topic: newMessage.topic,
      since: Date.now() - 3600000, // Last hour
      limit: 20
    }).filter(m => 
      m.id !== newMessage.id &&
      m.type === newMessage.type &&
      m.metadata?.plant === newMessage.metadata?.plant
    )
    
    // Check for potential conflicts (opposite sentiments on same topic)
    for (const obs of recentObs) {
      if ((obs.sentiment === Sentiment.POSITIVE && newMessage.sentiment === Sentiment.NEGATIVE) ||
          (obs.sentiment === Sentiment.NEGATIVE && newMessage.sentiment === Sentiment.POSITIVE)) {
        // Potential conflict detected
        this.speak({
          type: MessageType.QUESTION,
          topic: newMessage.topic,
          content: `I notice ${obs.agentName} and ${newMessage.agentName} have different perspectives on ${newMessage.topic} in ${newMessage.metadata?.plant}. Could you both elaborate on your findings?`,
          metadata: {
            conflictingMessages: [obs.id, newMessage.id]
          }
        })
        break
      }
    }
  }
  
  // ===========================================================================
  // ESCALATION
  // ===========================================================================
  
  /**
   * Register escalation callback
   */
  onEscalation(callback) {
    this.escalationCallbacks.push(callback)
    return () => {
      const idx = this.escalationCallbacks.indexOf(callback)
      if (idx >= 0) this.escalationCallbacks.splice(idx, 1)
    }
  }
  
  /**
   * Escalate urgent findings
   */
  async escalate(finding) {
    const escalation = {
      type: 'critical_finding',
      finding,
      timestamp: Date.now(),
      source: finding.agentName || finding.agentId,
      plant: finding.metadata?.plant,
      description: finding.content
    }
    
    // Notify callbacks
    for (const callback of this.escalationCallbacks) {
      try {
        await callback(escalation)
      } catch (error) {
        console.error('[Coordinator] Escalation callback error:', error)
      }
    }
    
    return escalation
  }
  
  /**
   * Check all plants for escalations
   */
  async checkEscalations() {
    for (const agent of this.plantAgents.values()) {
      const criticalObs = (agent.aggregatedObservations || agent.observations || [])
        .filter(o => o.severity === ObservationSeverity.CRITICAL)
      
      for (const obs of criticalObs) {
        // Check if already escalated (within last hour)
        const recentEscalations = this.messages.filter(m => 
          m.type === MessageType.ALERT &&
          m.metadata?.observationId === obs.id &&
          m.timestamp > Date.now() - 3600000
        )
        
        if (recentEscalations.length === 0) {
          await this.escalate({
            ...obs,
            agentName: agent.name,
            metadata: {
              ...obs.metadata,
              plant: agent.plant,
              observationId: obs.id
            }
          })
        }
      }
    }
  }
  
  // ===========================================================================
  // SUMMARIES
  // ===========================================================================
  
  /**
   * Generate executive summary
   */
  async generateExecutiveSummary({ timeRange = 'day' } = {}) {
    if (!this.breakRoom) return null
    
    const summary = this.breakRoom.summarize({ timeRange })
    
    // Enhance with plant-by-plant breakdown
    const plantBreakdown = []
    for (const agent of this.plantAgents.values()) {
      const health = agent.getPlantHealth()
      plantBreakdown.push({
        plant: agent.plant,
        healthScore: health.healthScore,
        status: health.status,
        criticalIssues: health.summary?.criticalIssues || 0,
        topConcern: agent.aggregatedObservations?.find(o => 
          o.severity === ObservationSeverity.CRITICAL
        )?.description || 'None'
      })
    }
    
    // Sort by health score (worst first)
    plantBreakdown.sort((a, b) => a.healthScore - b.healthScore)
    
    const executiveSummary = {
      ...summary,
      plantBreakdown,
      overallHealth: this.calculateOverallHealth(plantBreakdown),
      keyTakeaways: this.generateKeyTakeaways(summary, plantBreakdown)
    }
    
    // Post summary
    let content = `EXECUTIVE SUMMARY (${timeRange})\n`
    content += `Overall Health: ${executiveSummary.overallHealth.score}/100 (${executiveSummary.overallHealth.status})\n\n`
    
    content += `Key Takeaways:\n`
    for (const takeaway of executiveSummary.keyTakeaways) {
      content += `- ${takeaway}\n`
    }
    
    if (plantBreakdown.length > 0) {
      content += `\nPlant Status:\n`
      for (const plant of plantBreakdown.slice(0, 5)) {
        content += `- ${plant.plant}: ${plant.healthScore}/100 (${plant.status})`
        if (plant.criticalIssues > 0) {
          content += ` - ${plant.criticalIssues} critical issues`
        }
        content += '\n'
      }
    }
    
    this.speak({
      type: MessageType.SUMMARY,
      topic: MessageTopic.GENERAL,
      content,
      sentiment: executiveSummary.overallHealth.score < 50 ? Sentiment.URGENT :
                 executiveSummary.overallHealth.score < 70 ? Sentiment.NEGATIVE :
                 Sentiment.NEUTRAL,
      metadata: { executiveSummary }
    })
    
    this.lastSummary = Date.now()
    return executiveSummary
  }
  
  /**
   * Calculate overall health from plant health scores
   */
  calculateOverallHealth(plantBreakdown) {
    if (plantBreakdown.length === 0) {
      return { score: 100, status: 'unknown' }
    }
    
    const avgScore = Math.round(
      plantBreakdown.reduce((sum, p) => sum + p.healthScore, 0) / plantBreakdown.length
    )
    
    const criticalPlants = plantBreakdown.filter(p => p.status === 'critical').length
    const degradedPlants = plantBreakdown.filter(p => p.status === 'degraded').length
    
    let status = 'healthy'
    if (criticalPlants > 0) status = 'critical'
    else if (degradedPlants > 0) status = 'needs_attention'
    else if (avgScore < 70) status = 'needs_attention'
    
    return { score: avgScore, status, criticalPlants, degradedPlants }
  }
  
  /**
   * Generate key takeaways from summary
   */
  generateKeyTakeaways(summary, plantBreakdown) {
    const takeaways = []
    
    // Critical issues
    if (summary.findings.critical > 0) {
      takeaways.push(`${summary.findings.critical} critical issues require immediate attention`)
    }
    
    // Worst performing plant
    if (plantBreakdown.length > 0 && plantBreakdown[0].healthScore < 60) {
      takeaways.push(`${plantBreakdown[0].plant} needs focus (health: ${plantBreakdown[0].healthScore}/100)`)
    }
    
    // Positive notes
    if (summary.findings.strengths > summary.findings.weaknesses) {
      takeaways.push(`More positive findings than issues - strong overall posture`)
    }
    
    // Agent activity
    if (summary.activity.activeAgents > 0) {
      takeaways.push(`${summary.activity.activeAgents} agents actively monitoring operations`)
    }
    
    // Top recommendation
    if (summary.recommendations.length > 0) {
      takeaways.push(`Top action: ${summary.recommendations[0].text}`)
    }
    
    if (takeaways.length === 0) {
      takeaways.push('No significant findings this period')
    }
    
    return takeaways
  }
  
  // ===========================================================================
  // PROMPTING AGENTS
  // ===========================================================================
  
  /**
   * Prompt specific agents to discuss a topic
   */
  promptDiscussion(topic, { plants = [], agents = [] } = {}) {
    let targetAgents = []
    
    if (plants.length > 0) {
      targetAgents = Array.from(this.plantAgents.values())
        .filter(a => plants.includes(a.plant))
    } else if (agents.length > 0) {
      targetAgents = agents.map(id => this.plantAgents.get(id)).filter(Boolean)
    } else {
      targetAgents = Array.from(this.plantAgents.values())
    }
    
    this.speak({
      type: MessageType.QUESTION,
      topic,
      content: `I'd like to discuss ${topic}. ${targetAgents.map(a => a.name).join(', ')}, please share your observations on this topic.`,
      metadata: {
        targetAgents: targetAgents.map(a => a.id)
      }
    })
  }
  
  /**
   * Ask agents to compare findings across plants
   */
  promptComparison(topic) {
    const plants = Array.from(this.plantAgents.values()).map(a => a.plant)
    
    if (plants.length < 2) return
    
    this.speak({
      type: MessageType.QUESTION,
      topic,
      content: `Let's compare ${topic} across plants. How does each plant perform in this area? Are there best practices we can share?`,
      metadata: {
        comparisonRequest: true,
        plants
      }
    })
  }
  
  // ===========================================================================
  // OBSERVATION OVERRIDE
  // ===========================================================================
  
  /**
   * Coordinator doesn't observe like other agents - it orchestrates
   */
  async observe() {
    return this.startObservationRound()
  }
  
  /**
   * Get relevant topics
   */
  getRelevantTopics() {
    return Object.values(MessageTopic)
  }
  
  /**
   * Generate answer
   */
  async generateAnswer(question) {
    const questionLower = question.toLowerCase()
    
    if (questionLower.includes('summary') || questionLower.includes('status')) {
      const summary = await this.generateExecutiveSummary({ timeRange: 'day' })
      return `${summary.plantBreakdown.length} plants monitored. Overall health: ${summary.overallHealth.score}/100. ` +
             `${summary.findings.critical} critical, ${summary.findings.high} high issues.`
    }
    
    if (questionLower.includes('worst') || questionLower.includes('problem')) {
      const plantBreakdown = []
      for (const agent of this.plantAgents.values()) {
        const health = agent.getPlantHealth()
        plantBreakdown.push({ plant: agent.plant, ...health })
      }
      plantBreakdown.sort((a, b) => a.healthScore - b.healthScore)
      
      if (plantBreakdown.length > 0) {
        const worst = plantBreakdown[0]
        return `${worst.plant} has the lowest health score (${worst.healthScore}/100) with ${worst.summary?.criticalIssues || 0} critical issues.`
      }
      return 'No plant health data available.'
    }
    
    if (questionLower.includes('best') || questionLower.includes('good')) {
      const plantBreakdown = []
      for (const agent of this.plantAgents.values()) {
        const health = agent.getPlantHealth()
        plantBreakdown.push({ plant: agent.plant, ...health })
      }
      plantBreakdown.sort((a, b) => b.healthScore - a.healthScore)
      
      if (plantBreakdown.length > 0) {
        const best = plantBreakdown[0]
        return `${best.plant} has the best health score (${best.healthScore}/100).`
      }
      return 'No plant health data available.'
    }
    
    return super.generateAnswer(question)
  }
}

export default CoordinatorAgent
