/**
 * BREAK ROOM
 * The Intelligence Layer where agents gather, communicate, and share findings
 * 
 * The Break Room is where agents:
 * - Post messages and observations
 * - Participate in threaded discussions
 * - Build collective knowledge
 * - Generate summaries and insights
 */

import {
  MessageType,
  MessageTopic,
  Sentiment,
  ObservationType,
  ObservationSeverity,
  createMessage,
  createThread,
  createKnowledgeEntry,
  BREAK_ROOM_TOOLS
} from './types.js'

// =============================================================================
// BREAK ROOM CLASS
// =============================================================================

export class BreakRoom {
  constructor(config = {}) {
    // Configuration
    this.id = config.id || `breakroom-${Date.now()}`
    this.name = config.name || 'OT Assurance Break Room'
    
    // Message storage
    this.messages = []
    this.threads = new Map()
    
    // Observations aggregation
    this.observations = []
    
    // Knowledge base
    this.knowledge = []
    
    // Registered agents
    this.agents = new Map()
    
    // Subscribers
    this.subscribers = new Set()
    
    // Settings
    this.maxMessages = config.maxMessages || 10000
    this.maxKnowledge = config.maxKnowledge || 1000
    
    // Statistics
    this.stats = {
      messagesPosted: 0,
      threadsCreated: 0,
      observationsShared: 0,
      questionsAsked: 0,
      questionsAnswered: 0
    }
  }
  
  // ===========================================================================
  // AGENT REGISTRATION
  // ===========================================================================
  
  /**
   * Register an agent with the break room
   */
  registerAgent(agent) {
    this.agents.set(agent.id, agent)
    
    // Welcome message
    this.post(createMessage({
      agentId: 'system',
      agentName: 'Break Room',
      role: 'system',
      type: MessageType.OBSERVATION,
      topic: MessageTopic.GENERAL,
      content: `${agent.name} has joined the break room`,
      metadata: { 
        plant: agent.plant,
        role: agent.role,
        event: 'agent_joined'
      }
    }))
    
    return this
  }
  
  /**
   * Unregister an agent
   */
  unregisterAgent(agentId) {
    const agent = this.agents.get(agentId)
    if (agent) {
      this.agents.delete(agentId)
      
      this.post(createMessage({
        agentId: 'system',
        agentName: 'Break Room',
        role: 'system',
        type: MessageType.OBSERVATION,
        topic: MessageTopic.GENERAL,
        content: `${agent.name} has left the break room`,
        metadata: { event: 'agent_left' }
      }))
    }
    
    return this
  }
  
  /**
   * Get all registered agents
   */
  getAgents() {
    return Array.from(this.agents.values())
  }
  
  /**
   * Get agents by plant
   */
  getAgentsByPlant(plant) {
    return this.getAgents().filter(a => a.plant === plant)
  }
  
  /**
   * Get agents by role
   */
  getAgentsByRole(role) {
    return this.getAgents().filter(a => a.role === role)
  }
  
  // ===========================================================================
  // MESSAGE HANDLING
  // ===========================================================================
  
  /**
   * Post a message to the break room
   */
  post(message) {
    // Add to messages
    this.messages.push(message)
    this.stats.messagesPosted++
    
    // Handle thread
    if (message.threadId) {
      let thread = this.threads.get(message.threadId)
      
      if (!thread) {
        // Create new thread
        thread = createThread({
          topic: message.topic,
          startedBy: message.agentId,
          subject: message.content.slice(0, 100)
        })
        thread.id = message.threadId
        this.threads.set(message.threadId, thread)
        this.stats.threadsCreated++
      }
      
      thread.messages.push(message)
      thread.updatedAt = Date.now()
      
      // Track participants
      if (!thread.participants.includes(message.agentId)) {
        thread.participants.push(message.agentId)
      }
    }
    
    // Track observations
    if (message.type === MessageType.OBSERVATION || 
        message.type === MessageType.CRITIQUE ||
        message.type === MessageType.COMPLIMENT) {
      this.stats.observationsShared++
      
      // Extract observation from message metadata if present
      if (message.metadata?.observationId) {
        const agent = this.agents.get(message.agentId)
        if (agent) {
          const obs = agent.observations?.find(o => o.id === message.metadata.observationId)
          if (obs && !this.observations.some(o => o.id === obs.id)) {
            this.observations.push(obs)
          }
        }
      }
    }
    
    // Track questions
    if (message.type === MessageType.QUESTION) {
      this.stats.questionsAsked++
    }
    if (message.type === MessageType.RESPONSE) {
      this.stats.questionsAnswered++
    }
    
    // Dispatch to subscribers
    this.notifySubscribers(message)
    
    // Dispatch to agents for listening
    this.dispatchToAgents(message)
    
    // Trim messages if over limit
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages)
    }
    
    return message
  }
  
  /**
   * Dispatch message to all agents for listening
   */
  async dispatchToAgents(message) {
    for (const agent of this.agents.values()) {
      if (agent.id !== message.agentId) {
        try {
          await agent.listen(message)
        } catch (error) {
          console.error(`[BreakRoom] Error dispatching to ${agent.name}:`, error)
        }
      }
    }
  }
  
  /**
   * Subscribe to break room messages
   */
  subscribe(callback) {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }
  
  /**
   * Notify all subscribers of new message
   */
  notifySubscribers(message) {
    for (const callback of this.subscribers) {
      try {
        callback(message)
      } catch (error) {
        console.error('[BreakRoom] Subscriber error:', error)
      }
    }
  }
  
  // ===========================================================================
  // MESSAGE RETRIEVAL
  // ===========================================================================
  
  /**
   * Get messages with optional filters
   */
  getMessages({
    since = null,
    plant = null,
    topic = null,
    type = null,
    agentId = null,
    sentiment = null,
    limit = 100
  } = {}) {
    let filtered = [...this.messages]
    
    if (since) {
      filtered = filtered.filter(m => m.timestamp >= since)
    }
    
    if (plant) {
      filtered = filtered.filter(m => m.metadata?.plant === plant)
    }
    
    if (topic) {
      filtered = filtered.filter(m => m.topic === topic)
    }
    
    if (type) {
      filtered = filtered.filter(m => m.type === type)
    }
    
    if (agentId) {
      filtered = filtered.filter(m => m.agentId === agentId)
    }
    
    if (sentiment) {
      filtered = filtered.filter(m => m.sentiment === sentiment)
    }
    
    return filtered.slice(-limit)
  }
  
  /**
   * Get recent messages
   */
  getRecentMessages(limit = 50) {
    return this.messages.slice(-limit)
  }
  
  /**
   * Get messages by thread
   */
  getThread(threadId) {
    return this.threads.get(threadId)
  }
  
  /**
   * Get active threads
   */
  getActiveThreads({ 
    plant = null, 
    resolved = null, 
    limit = 10 
  } = {}) {
    let threads = Array.from(this.threads.values())
    
    if (plant) {
      threads = threads.filter(t => {
        const starter = this.agents.get(t.startedBy)
        return starter?.plant === plant
      })
    }
    
    if (resolved !== null) {
      threads = threads.filter(t => t.resolved === resolved)
    }
    
    // Sort by most recent activity
    threads.sort((a, b) => b.updatedAt - a.updatedAt)
    
    return threads.slice(0, limit)
  }
  
  /**
   * Search messages by content
   */
  searchMessages(query, { limit = 20 } = {}) {
    const queryLower = query.toLowerCase()
    
    return this.messages
      .filter(m => m.content.toLowerCase().includes(queryLower))
      .slice(-limit)
  }
  
  // ===========================================================================
  // OBSERVATIONS
  // ===========================================================================
  
  /**
   * Get all observations
   */
  getObservations({
    plant = null,
    type = null,
    severity = null,
    since = null,
    limit = 50
  } = {}) {
    let filtered = [...this.observations]
    
    if (plant) {
      filtered = filtered.filter(o => o.subject?.plant === plant)
    }
    
    if (type) {
      filtered = filtered.filter(o => o.type === type)
    }
    
    if (severity) {
      filtered = filtered.filter(o => o.severity === severity)
    }
    
    if (since) {
      filtered = filtered.filter(o => o.timestamp >= since)
    }
    
    // Sort by severity and time
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, positive: 4, info: 5 }
    filtered.sort((a, b) => {
      const sevDiff = (severityOrder[a.severity] || 5) - (severityOrder[b.severity] || 5)
      if (sevDiff !== 0) return sevDiff
      return b.timestamp - a.timestamp
    })
    
    return filtered.slice(0, limit)
  }
  
  /**
   * Get weaknesses (negative observations)
   */
  getWeaknesses({ plant = null, limit = 20 } = {}) {
    return this.getObservations({
      plant,
      type: ObservationType.WEAKNESS,
      limit
    })
  }
  
  /**
   * Get strengths (positive observations)
   */
  getStrengths({ plant = null, limit = 20 } = {}) {
    return this.getObservations({
      plant,
      type: ObservationType.STRENGTH,
      limit
    })
  }
  
  // ===========================================================================
  // KNOWLEDGE BASE
  // ===========================================================================
  
  /**
   * Add knowledge entry
   */
  addKnowledge(entry) {
    const knowledgeEntry = createKnowledgeEntry(entry)
    this.knowledge.push(knowledgeEntry)
    
    // Trim if over limit
    if (this.knowledge.length > this.maxKnowledge) {
      this.knowledge = this.knowledge.slice(-this.maxKnowledge)
    }
    
    return knowledgeEntry
  }
  
  /**
   * Query knowledge base
   */
  queryKnowledge({ 
    type = null, 
    subject = null, 
    tags = [], 
    limit = 20 
  } = {}) {
    let filtered = [...this.knowledge]
    
    if (type) {
      filtered = filtered.filter(k => k.type === type)
    }
    
    if (subject) {
      filtered = filtered.filter(k => 
        k.subject?.toLowerCase().includes(subject.toLowerCase())
      )
    }
    
    if (tags.length > 0) {
      filtered = filtered.filter(k => 
        tags.some(t => k.tags.includes(t))
      )
    }
    
    // Sort by recency and references
    filtered.sort((a, b) => {
      const refDiff = b.references - a.references
      if (refDiff !== 0) return refDiff
      return b.updatedAt - a.updatedAt
    })
    
    return filtered.slice(0, limit)
  }
  
  // ===========================================================================
  // SUMMARIES
  // ===========================================================================
  
  /**
   * Generate summary of recent activity
   */
  summarize({ timeRange = 'day', plant = null } = {}) {
    const now = Date.now()
    let since
    
    switch (timeRange) {
      case 'hour':
        since = now - (60 * 60 * 1000)
        break
      case 'day':
        since = now - (24 * 60 * 60 * 1000)
        break
      case 'week':
        since = now - (7 * 24 * 60 * 60 * 1000)
        break
      default:
        since = now - (24 * 60 * 60 * 1000)
    }
    
    const recentMessages = this.getMessages({ since, plant })
    const recentObservations = this.getObservations({ since, plant, limit: 100 })
    
    // Categorize observations
    const weaknesses = recentObservations.filter(o => 
      o.type === ObservationType.WEAKNESS || o.type === ObservationType.ANOMALY
    )
    const strengths = recentObservations.filter(o => 
      o.type === ObservationType.STRENGTH
    )
    const patterns = recentObservations.filter(o => 
      o.type === ObservationType.PATTERN
    )
    
    const criticalCount = weaknesses.filter(o => o.severity === ObservationSeverity.CRITICAL).length
    const highCount = weaknesses.filter(o => o.severity === ObservationSeverity.HIGH).length
    
    // Build summary
    const summary = {
      timeRange,
      plant: plant || 'All Plants',
      period: {
        from: new Date(since).toISOString(),
        to: new Date(now).toISOString()
      },
      activity: {
        messages: recentMessages.length,
        observations: recentObservations.length,
        activeAgents: new Set(recentMessages.map(m => m.agentId)).size,
        threads: this.getActiveThreads({ plant }).filter(t => t.updatedAt >= since).length
      },
      findings: {
        total: recentObservations.length,
        weaknesses: weaknesses.length,
        strengths: strengths.length,
        patterns: patterns.length,
        critical: criticalCount,
        high: highCount
      },
      topWeaknesses: weaknesses.slice(0, 5).map(o => ({
        severity: o.severity,
        description: o.description,
        agent: this.agents.get(o.agentId)?.name || 'Unknown'
      })),
      topStrengths: strengths.slice(0, 3).map(o => ({
        description: o.description,
        agent: this.agents.get(o.agentId)?.name || 'Unknown'
      })),
      sentiment: this.calculateSentiment(recentMessages),
      recommendations: this.extractRecommendations(weaknesses)
    }
    
    return summary
  }
  
  /**
   * Calculate overall sentiment from messages
   */
  calculateSentiment(messages) {
    if (messages.length === 0) return { score: 0, label: 'neutral' }
    
    let score = 0
    for (const msg of messages) {
      switch (msg.sentiment) {
        case Sentiment.POSITIVE:
          score += 1
          break
        case Sentiment.NEGATIVE:
          score -= 1
          break
        case Sentiment.URGENT:
          score -= 2
          break
      }
    }
    
    const normalizedScore = score / messages.length
    let label = 'neutral'
    if (normalizedScore > 0.3) label = 'positive'
    else if (normalizedScore < -0.3) label = 'concerning'
    else if (normalizedScore < -0.5) label = 'critical'
    
    return { score: normalizedScore, label }
  }
  
  /**
   * Extract unique recommendations from observations
   */
  extractRecommendations(observations) {
    const recommendations = new Map()
    
    for (const obs of observations) {
      for (const rec of (obs.recommendations || [])) {
        if (!recommendations.has(rec)) {
          recommendations.set(rec, {
            text: rec,
            count: 1,
            priority: obs.severity
          })
        } else {
          recommendations.get(rec).count++
        }
      }
    }
    
    // Sort by priority and frequency
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    return Array.from(recommendations.values())
      .sort((a, b) => {
        const prioDiff = (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3)
        if (prioDiff !== 0) return prioDiff
        return b.count - a.count
      })
      .slice(0, 10)
  }
  
  // ===========================================================================
  // QUERYING (FOR HUMANS/EXTERNAL SYSTEMS)
  // ===========================================================================
  
  /**
   * Submit a question to agents in the break room
   */
  async submitQuestion(question, { targetAgent = 'all', topic = MessageTopic.GENERAL } = {}) {
    // Create question message
    const questionMessage = createMessage({
      agentId: 'human',
      agentName: 'Analyst',
      role: 'human',
      type: MessageType.QUESTION,
      topic,
      content: question,
      metadata: { targetAgent }
    })
    
    this.post(questionMessage)
    
    // Collect responses
    const responses = []
    
    for (const agent of this.agents.values()) {
      if (targetAgent === 'all' || targetAgent === agent.id) {
        try {
          const answer = await agent.generateAnswer(question)
          if (answer) {
            responses.push({
              agent: agent.name,
              agentId: agent.id,
              plant: agent.plant,
              answer
            })
          }
        } catch (error) {
          console.error(`[BreakRoom] Error getting answer from ${agent.name}:`, error)
        }
      }
    }
    
    return {
      question,
      responses,
      timestamp: Date.now()
    }
  }
  
  // ===========================================================================
  // MCP TOOLS
  // ===========================================================================
  
  /**
   * Get MCP tool definitions
   */
  getMcpTools() {
    return BREAK_ROOM_TOOLS
  }
  
  /**
   * Handle MCP tool call
   */
  async handleMcpToolCall(toolName, args = {}) {
    switch (toolName) {
      case 'query_break_room':
        return this.searchMessages(args.query || '', {
          limit: args.limit || 20
        })
      
      case 'get_active_threads':
        return this.getActiveThreads(args)
      
      case 'submit_question':
        return this.submitQuestion(args.question, {
          targetAgent: args.targetAgent,
          topic: args.topic
        })
      
      case 'get_summary':
        return this.summarize({
          timeRange: args.timeRange || 'day',
          plant: args.plant
        })
      
      default:
        throw new Error(`Unknown tool: ${toolName}`)
    }
  }
  
  // ===========================================================================
  // PERSISTENCE
  // ===========================================================================
  
  /**
   * Export break room state
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      messages: this.messages,
      threads: Object.fromEntries(this.threads),
      observations: this.observations,
      knowledge: this.knowledge,
      stats: this.stats,
      agents: Array.from(this.agents.keys()),
      exportedAt: Date.now()
    }
  }
  
  /**
   * Restore from JSON
   */
  static fromJSON(json) {
    const breakRoom = new BreakRoom({
      id: json.id,
      name: json.name
    })
    
    breakRoom.messages = json.messages || []
    breakRoom.threads = new Map(Object.entries(json.threads || {}))
    breakRoom.observations = json.observations || []
    breakRoom.knowledge = json.knowledge || []
    breakRoom.stats = json.stats || breakRoom.stats
    
    return breakRoom
  }
  
  /**
   * Save to localStorage (for browser use)
   */
  saveToStorage(key = 'ot-assurance-breakroom') {
    try {
      const data = this.toJSON()
      localStorage.setItem(key, JSON.stringify(data))
      return true
    } catch (error) {
      console.error('[BreakRoom] Failed to save:', error)
      return false
    }
  }
  
  /**
   * Load from localStorage
   */
  static loadFromStorage(key = 'ot-assurance-breakroom') {
    try {
      const data = localStorage.getItem(key)
      if (data) {
        return BreakRoom.fromJSON(JSON.parse(data))
      }
    } catch (error) {
      console.error('[BreakRoom] Failed to load:', error)
    }
    return null
  }
  
  /**
   * Clear the break room
   */
  clear() {
    this.messages = []
    this.threads.clear()
    this.observations = []
    this.knowledge = []
    this.stats = {
      messagesPosted: 0,
      threadsCreated: 0,
      observationsShared: 0,
      questionsAsked: 0,
      questionsAnswered: 0
    }
  }
}

export default BreakRoom
