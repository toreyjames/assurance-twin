/**
 * BASE AGENT
 * Foundation class for all agents in the Agentic Semantic Layer
 * 
 * Agents:
 * - Observe their domain and generate observations
 * - Communicate findings to the break room
 * - Listen and respond to other agents
 * - Reason about complex situations (LLM-powered when available)
 * - Suggest improvements based on their expertise
 */

import {
  MessageType,
  MessageTopic,
  Sentiment,
  ObservationType,
  ObservationSeverity,
  AgentState,
  createMessage,
  createObservation,
  createEvidence,
  determineSentiment,
  observationToContent,
  EvidenceType
} from './types.js'

// =============================================================================
// BASE AGENT CLASS
// =============================================================================

export class BaseAgent {
  constructor(config) {
    this.id = config.id
    this.name = config.name
    this.role = config.role
    this.plant = config.plant
    this.plantCode = config.plantCode
    this.description = config.description || ''
    this.capabilities = config.capabilities || []
    this.settings = config.settings || {}
    
    // State
    this.state = AgentState.IDLE
    this.observations = []
    this.messages = []
    this.lastObservation = null
    this.context = {} // Current analysis context
    
    // Communication
    this.breakRoom = null
    this.listeners = new Set()
    this.messageQueue = []
    
    // LLM integration
    this.llmEnabled = false
    this.llmClient = null
  }
  
  // ===========================================================================
  // CORE METHODS
  // ===========================================================================
  
  /**
   * Initialize the agent with context and break room reference
   */
  async initialize({ breakRoom, context = {}, llmClient = null }) {
    this.breakRoom = breakRoom
    this.context = context
    this.llmClient = llmClient
    this.llmEnabled = !!llmClient
    
    if (this.breakRoom) {
      this.breakRoom.registerAgent(this)
    }
    
    console.log(`[${this.name}] Initialized${this.llmEnabled ? ' with LLM' : ''}`)
    return this
  }
  
  /**
   * Update the agent's context with new data
   */
  updateContext(newContext) {
    this.context = { ...this.context, ...newContext }
  }
  
  /**
   * Main observation cycle - override in specialized agents
   */
  async observe() {
    this.state = AgentState.OBSERVING
    const observations = []
    
    // Base implementation - specialized agents override this
    // to analyze their specific domain
    
    this.state = AgentState.IDLE
    this.lastObservation = Date.now()
    return observations
  }
  
  /**
   * Emit a message to the break room
   */
  speak({
    type,
    topic = MessageTopic.GENERAL,
    content,
    sentiment = Sentiment.NEUTRAL,
    evidence = [],
    replyTo = null,
    threadId = null,
    metadata = {}
  }) {
    this.state = AgentState.COMMUNICATING
    
    const message = createMessage({
      agentId: this.id,
      agentName: this.name,
      role: this.role,
      type,
      topic,
      sentiment,
      content,
      evidence,
      replyTo,
      threadId,
      metadata: {
        plant: this.plant,
        plantCode: this.plantCode,
        ...metadata
      }
    })
    
    this.messages.push(message)
    
    // Send to break room if connected
    if (this.breakRoom) {
      this.breakRoom.post(message)
    }
    
    // Notify local listeners
    this.notifyListeners(message)
    
    this.state = AgentState.IDLE
    return message
  }
  
  /**
   * Share an observation as a message
   */
  shareObservation(observation) {
    const sentiment = determineSentiment(observation)
    const content = observationToContent(observation)
    
    let messageType = MessageType.OBSERVATION
    if (observation.type === ObservationType.STRENGTH) {
      messageType = MessageType.COMPLIMENT
    } else if (observation.type === ObservationType.WEAKNESS) {
      messageType = MessageType.CRITIQUE
    } else if (observation.type === ObservationType.IMPROVEMENT) {
      messageType = MessageType.SUGGESTION
    }
    
    return this.speak({
      type: messageType,
      topic: this.getTopicFromObservation(observation),
      content,
      sentiment,
      evidence: observation.evidence,
      metadata: {
        observationId: observation.id,
        severity: observation.severity,
        confidence: observation.confidence
      }
    })
  }
  
  /**
   * React to a message from another agent
   */
  async listen(message) {
    this.state = AgentState.LISTENING
    
    // Skip own messages
    if (message.agentId === this.id) {
      this.state = AgentState.IDLE
      return null
    }
    
    // Check if this is a question directed at us or all
    if (message.type === MessageType.QUESTION) {
      const isForMe = message.metadata?.targetAgent === this.id ||
                      message.metadata?.targetAgent === 'all' ||
                      message.metadata?.targetRole === this.role
      
      if (isForMe && this.settings.autoRespond) {
        const response = await this.respondToQuestion(message)
        this.state = AgentState.IDLE
        return response
      }
    }
    
    // Check if message is relevant to our domain
    if (this.isRelevantMessage(message)) {
      // Could trigger additional analysis or commentary
      await this.processRelevantMessage(message)
    }
    
    this.state = AgentState.IDLE
    return null
  }
  
  /**
   * Use LLM to reason about complex situations
   */
  async reason(prompt, context = {}) {
    this.state = AgentState.REASONING
    
    if (!this.llmEnabled || !this.llmClient) {
      // Fallback to rule-based reasoning
      this.state = AgentState.IDLE
      return this.ruleBasedReason(prompt, context)
    }
    
    try {
      const systemPrompt = this.buildSystemPrompt()
      const response = await this.llmClient.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: this.buildReasoningPrompt(prompt, context) }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
      
      this.state = AgentState.IDLE
      return {
        content: response.content,
        reasoning: response.reasoning || null,
        confidence: 0.9,
        source: 'llm'
      }
    } catch (error) {
      console.warn(`[${this.name}] LLM reasoning failed, using rules:`, error.message)
      this.state = AgentState.IDLE
      return this.ruleBasedReason(prompt, context)
    }
  }
  
  /**
   * Generate improvement suggestions
   */
  async suggest(topic, context = {}) {
    const observations = this.observations.filter(o => 
      o.type === ObservationType.WEAKNESS || 
      o.type === ObservationType.ANOMALY
    )
    
    const suggestions = []
    
    for (const obs of observations) {
      if (obs.recommendations?.length > 0) {
        for (const rec of obs.recommendations) {
          suggestions.push({
            observation: obs,
            recommendation: rec,
            priority: this.calculatePriority(obs)
          })
        }
      }
    }
    
    // If LLM available, enhance suggestions
    if (this.llmEnabled && suggestions.length > 0) {
      const enhanced = await this.reason(
        `Given these issues and recommendations, what additional suggestions would you make?`,
        { suggestions, topic }
      )
      
      if (enhanced.content) {
        suggestions.push({
          observation: null,
          recommendation: enhanced.content,
          priority: 'medium',
          source: 'llm_enhanced'
        })
      }
    }
    
    return suggestions.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      return (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3)
    })
  }
  
  // ===========================================================================
  // OBSERVATION HELPERS
  // ===========================================================================
  
  /**
   * Create and record an observation
   */
  recordObservation({
    type,
    severity,
    subject,
    description,
    evidence = [],
    confidence = 0.8,
    recommendations = []
  }) {
    const observation = createObservation({
      agentId: this.id,
      type,
      severity,
      subject: {
        plant: this.plant,
        plantCode: this.plantCode,
        ...subject
      },
      description,
      evidence,
      confidence,
      recommendations
    })
    
    this.observations.push(observation)
    return observation
  }
  
  /**
   * Create evidence from an asset
   */
  assetEvidence(asset, description = null) {
    return createEvidence({
      type: EvidenceType.ASSET,
      id: asset.tag_id || asset.asset_id || asset.ip_address,
      description: description || `Asset: ${asset.tag_id || asset.asset_id}`,
      data: {
        tagId: asset.tag_id,
        assetId: asset.asset_id,
        deviceType: asset.device_type,
        unit: asset.unit,
        manufacturer: asset.manufacturer,
        model: asset.model
      }
    })
  }
  
  /**
   * Create evidence from a gap
   */
  gapEvidence(gap, description = null) {
    return createEvidence({
      type: EvidenceType.GAP,
      id: gap.tagId || gap.unit || gap.subnet,
      description: description || gap.reason,
      data: {
        gapType: gap.type,
        severity: gap.severity,
        unit: gap.unit
      }
    })
  }
  
  /**
   * Create evidence from risk analysis
   */
  riskEvidence(riskResult, description = null) {
    return createEvidence({
      type: EvidenceType.RISK_SCORE,
      id: riskResult.assetId,
      description: description || `Risk score: ${riskResult.normalizedScore}`,
      data: {
        score: riskResult.normalizedScore,
        level: riskResult.riskLevel?.label,
        topFactors: riskResult.topFactors?.map(f => f.factor)
      }
    })
  }
  
  // ===========================================================================
  // COMMUNICATION HELPERS
  // ===========================================================================
  
  /**
   * Ask another agent a question
   */
  askQuestion(question, { targetAgent = 'all', topic = MessageTopic.GENERAL } = {}) {
    return this.speak({
      type: MessageType.QUESTION,
      topic,
      content: question,
      metadata: { targetAgent }
    })
  }
  
  /**
   * Respond to a question
   */
  async respondToQuestion(questionMessage) {
    const answer = await this.generateAnswer(questionMessage.content)
    
    return this.speak({
      type: MessageType.RESPONSE,
      topic: questionMessage.topic,
      content: answer,
      replyTo: questionMessage.id,
      threadId: questionMessage.threadId
    })
  }
  
  /**
   * Generate answer to a question - override in specialized agents
   */
  async generateAnswer(question) {
    if (this.llmEnabled) {
      const response = await this.reason(question, {
        context: this.context,
        observations: this.observations.slice(-10)
      })
      return response.content
    }
    
    return `I don't have enough information to answer: "${question}"`
  }
  
  /**
   * Subscribe to agent messages
   */
  subscribe(callback) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }
  
  /**
   * Notify listeners of new message
   */
  notifyListeners(message) {
    for (const listener of this.listeners) {
      try {
        listener(message)
      } catch (error) {
        console.error(`[${this.name}] Listener error:`, error)
      }
    }
  }
  
  // ===========================================================================
  // INTERNAL HELPERS
  // ===========================================================================
  
  /**
   * Check if message is relevant to this agent's domain
   */
  isRelevantMessage(message) {
    // Same plant
    if (message.metadata?.plant && message.metadata.plant !== this.plant) {
      return false
    }
    
    // Relevant topic
    const relevantTopics = this.getRelevantTopics()
    return relevantTopics.includes(message.topic)
  }
  
  /**
   * Get topics relevant to this agent's role
   */
  getRelevantTopics() {
    // Override in specialized agents
    return [MessageTopic.GENERAL]
  }
  
  /**
   * Get topic from observation
   */
  getTopicFromObservation(observation) {
    // Override in specialized agents
    return MessageTopic.GENERAL
  }
  
  /**
   * Process a relevant message from another agent
   */
  async processRelevantMessage(message) {
    // Override in specialized agents to add commentary or trigger analysis
  }
  
  /**
   * Calculate priority from observation
   */
  calculatePriority(observation) {
    if (observation.severity === ObservationSeverity.CRITICAL) return 'critical'
    if (observation.severity === ObservationSeverity.HIGH) return 'high'
    if (observation.severity === ObservationSeverity.MEDIUM) return 'medium'
    return 'low'
  }
  
  /**
   * Rule-based reasoning fallback
   */
  ruleBasedReason(prompt, context) {
    // Basic pattern matching for common questions
    const promptLower = prompt.toLowerCase()
    
    if (promptLower.includes('status') || promptLower.includes('health')) {
      return {
        content: this.getStatusSummary(),
        confidence: 0.7,
        source: 'rules'
      }
    }
    
    if (promptLower.includes('weakness') || promptLower.includes('problem')) {
      const weaknesses = this.observations.filter(o => o.type === ObservationType.WEAKNESS)
      return {
        content: weaknesses.length > 0 
          ? `Found ${weaknesses.length} weaknesses. Top issue: ${weaknesses[0].description}`
          : 'No significant weaknesses detected.',
        confidence: 0.7,
        source: 'rules'
      }
    }
    
    return {
      content: 'I need more context to provide a detailed answer.',
      confidence: 0.5,
      source: 'rules'
    }
  }
  
  /**
   * Build system prompt for LLM
   */
  buildSystemPrompt() {
    return `You are ${this.name}, an AI agent specialized in ${this.role} analysis for OT (Operational Technology) environments.
Your focus is ${this.plant || 'enterprise-wide'} operations.
Role: ${this.description}

You analyze industrial control systems, identify risks, and provide actionable recommendations.
Be concise, specific, and technical. Focus on security, reliability, and operational continuity.`
  }
  
  /**
   * Build reasoning prompt with context
   */
  buildReasoningPrompt(prompt, context) {
    let fullPrompt = prompt
    
    if (context.observations?.length > 0) {
      fullPrompt += '\n\nRecent observations:\n' + 
        context.observations.map(o => `- ${o.description}`).join('\n')
    }
    
    if (context.assets?.length > 0) {
      fullPrompt += `\n\nAnalyzing ${context.assets.length} assets.`
    }
    
    return fullPrompt
  }
  
  /**
   * Get status summary
   */
  getStatusSummary() {
    const weaknesses = this.observations.filter(o => o.type === ObservationType.WEAKNESS)
    const strengths = this.observations.filter(o => o.type === ObservationType.STRENGTH)
    const critical = weaknesses.filter(o => o.severity === ObservationSeverity.CRITICAL)
    
    return `${this.name} Status: ${this.observations.length} observations, ` +
           `${weaknesses.length} weaknesses (${critical.length} critical), ` +
           `${strengths.length} strengths.`
  }
  
  // ===========================================================================
  // MCP TOOL HANDLERS
  // ===========================================================================
  
  /**
   * Get plant health summary for MCP tool
   */
  getPlantHealth({ includeDetails = false } = {}) {
    const weaknesses = this.observations.filter(o => 
      o.type === ObservationType.WEAKNESS || o.type === ObservationType.ANOMALY
    )
    const strengths = this.observations.filter(o => o.type === ObservationType.STRENGTH)
    
    const criticalCount = weaknesses.filter(o => o.severity === ObservationSeverity.CRITICAL).length
    const highCount = weaknesses.filter(o => o.severity === ObservationSeverity.HIGH).length
    
    // Calculate health score (100 = perfect, 0 = critical issues)
    let healthScore = 100
    healthScore -= criticalCount * 20
    healthScore -= highCount * 10
    healthScore -= (weaknesses.length - criticalCount - highCount) * 3
    healthScore = Math.max(0, Math.min(100, healthScore))
    
    const result = {
      plant: this.plant,
      healthScore,
      status: healthScore >= 80 ? 'healthy' : healthScore >= 50 ? 'degraded' : 'critical',
      summary: {
        totalObservations: this.observations.length,
        weaknesses: weaknesses.length,
        criticalIssues: criticalCount,
        highIssues: highCount,
        strengths: strengths.length
      },
      lastUpdated: this.lastObservation
    }
    
    if (includeDetails) {
      result.recentWeaknesses = weaknesses.slice(0, 5).map(o => ({
        description: o.description,
        severity: o.severity,
        timestamp: o.timestamp
      }))
      result.recentStrengths = strengths.slice(0, 5).map(o => ({
        description: o.description,
        timestamp: o.timestamp
      }))
    }
    
    return result
  }
  
  /**
   * Get weaknesses for MCP tool
   */
  getWeaknesses({ severity = 'all', topic = null, limit = 10 } = {}) {
    let weaknesses = this.observations.filter(o => 
      o.type === ObservationType.WEAKNESS || o.type === ObservationType.ANOMALY
    )
    
    if (severity !== 'all') {
      weaknesses = weaknesses.filter(o => o.severity === severity)
    }
    
    // Sort by severity and recency
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    weaknesses.sort((a, b) => {
      const severityDiff = (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4)
      if (severityDiff !== 0) return severityDiff
      return b.timestamp - a.timestamp
    })
    
    return weaknesses.slice(0, limit).map(o => ({
      id: o.id,
      description: o.description,
      severity: o.severity,
      subject: o.subject,
      recommendations: o.recommendations,
      timestamp: o.timestamp
    }))
  }
  
  /**
   * Get strengths for MCP tool
   */
  getStrengths({ limit = 10 } = {}) {
    const strengths = this.observations
      .filter(o => o.type === ObservationType.STRENGTH)
      .slice(0, limit)
      .map(o => ({
        id: o.id,
        description: o.description,
        subject: o.subject,
        timestamp: o.timestamp
      }))
    
    return strengths
  }
  
  /**
   * Get recent observations for MCP tool
   */
  getRecentObservations({ since = null, type = null, limit = 20 } = {}) {
    let obs = [...this.observations]
    
    if (since) {
      obs = obs.filter(o => o.timestamp >= since)
    }
    
    if (type) {
      obs = obs.filter(o => o.type === type)
    }
    
    return obs
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }
  
  // ===========================================================================
  // SERIALIZATION
  // ===========================================================================
  
  /**
   * Export agent state for persistence
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      plant: this.plant,
      plantCode: this.plantCode,
      description: this.description,
      state: this.state,
      observations: this.observations,
      messages: this.messages,
      lastObservation: this.lastObservation,
      settings: this.settings
    }
  }
  
  /**
   * Restore agent state
   */
  static fromJSON(json, config = {}) {
    const agent = new this({
      ...json,
      ...config
    })
    
    agent.observations = json.observations || []
    agent.messages = json.messages || []
    agent.lastObservation = json.lastObservation
    agent.state = json.state || AgentState.IDLE
    
    return agent
  }
}

export default BaseAgent
