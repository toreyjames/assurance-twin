/**
 * MCP SERVER
 * Exposes agent capabilities as MCP (Model Context Protocol) tools
 * 
 * This allows external systems, LLMs, and other MCP clients to:
 * - Query plant agents for health, weaknesses, strengths
 * - Submit questions to the break room
 * - Get summaries and observations
 * - Interact with the agentic layer
 */

import {
  PLANT_AGENT_TOOLS,
  BREAK_ROOM_TOOLS
} from './types.js'

// =============================================================================
// MCP SERVER CLASS
// =============================================================================

export class AgentMcpServer {
  constructor(config = {}) {
    this.name = config.name || 'ot-assurance-agents'
    this.version = config.version || '1.0.0'
    this.description = config.description || 'OT Assurance Twin Agentic Layer'
    
    // References
    this.breakRoom = null
    this.plantAgents = new Map()
    this.coordinator = null
    
    // Tool registry
    this.tools = new Map()
    
    // Register built-in tools
    this.registerBuiltInTools()
  }
  
  // ===========================================================================
  // SETUP
  // ===========================================================================
  
  /**
   * Initialize the MCP server with break room and agents
   */
  initialize({ breakRoom, plantAgents = [], coordinator = null }) {
    this.breakRoom = breakRoom
    this.coordinator = coordinator
    
    // Register plant agents
    for (const agent of plantAgents) {
      this.registerPlantAgent(agent)
    }
    
    return this
  }
  
  /**
   * Register a plant agent
   */
  registerPlantAgent(agent) {
    this.plantAgents.set(agent.id, agent)
    
    // Register agent-specific tools
    const prefix = agent.plantCode || agent.plant?.toLowerCase().replace(/\s+/g, '_') || agent.id
    
    for (const tool of PLANT_AGENT_TOOLS) {
      const toolName = `${prefix}_${tool.name}`
      this.tools.set(toolName, {
        ...tool,
        name: toolName,
        agentId: agent.id,
        handler: async (args) => this.handlePlantAgentTool(agent.id, tool.name, args)
      })
    }
  }
  
  /**
   * Unregister a plant agent
   */
  unregisterPlantAgent(agentId) {
    const agent = this.plantAgents.get(agentId)
    if (agent) {
      const prefix = agent.plantCode || agent.plant?.toLowerCase().replace(/\s+/g, '_') || agent.id
      
      for (const tool of PLANT_AGENT_TOOLS) {
        this.tools.delete(`${prefix}_${tool.name}`)
      }
      
      this.plantAgents.delete(agentId)
    }
  }
  
  /**
   * Register built-in tools
   */
  registerBuiltInTools() {
    // Global tools
    this.tools.set('list_plants', {
      name: 'list_plants',
      description: 'List all monitored plants and their agents',
      inputSchema: {
        type: 'object',
        properties: {}
      },
      handler: async () => this.listPlants()
    })
    
    this.tools.set('get_enterprise_health', {
      name: 'get_enterprise_health',
      description: 'Get enterprise-wide health summary across all plants',
      inputSchema: {
        type: 'object',
        properties: {
          includeBreakdown: { type: 'boolean', default: true }
        }
      },
      handler: async (args) => this.getEnterpriseHealth(args)
    })
    
    this.tools.set('compare_plants', {
      name: 'compare_plants',
      description: 'Compare health and findings across multiple plants',
      inputSchema: {
        type: 'object',
        properties: {
          plants: { 
            type: 'array', 
            items: { type: 'string' },
            description: 'Plant codes to compare (empty for all)'
          },
          metric: {
            type: 'string',
            enum: ['health', 'risk', 'lifecycle', 'coverage'],
            default: 'health'
          }
        }
      },
      handler: async (args) => this.comparePlants(args)
    })
    
    // Break room tools
    for (const tool of BREAK_ROOM_TOOLS) {
      this.tools.set(tool.name, {
        ...tool,
        handler: async (args) => this.handleBreakRoomTool(tool.name, args)
      })
    }
    
    // Coordinator tools
    this.tools.set('start_observation_round', {
      name: 'start_observation_round',
      description: 'Trigger all agents to observe and share findings',
      inputSchema: {
        type: 'object',
        properties: {}
      },
      handler: async () => this.startObservationRound()
    })
    
    this.tools.set('get_executive_summary', {
      name: 'get_executive_summary',
      description: 'Generate executive summary of all plant operations',
      inputSchema: {
        type: 'object',
        properties: {
          timeRange: {
            type: 'string',
            enum: ['hour', 'day', 'week'],
            default: 'day'
          }
        }
      },
      handler: async (args) => this.getExecutiveSummary(args)
    })
    
    this.tools.set('ask_agents', {
      name: 'ask_agents',
      description: 'Ask a question to agents and get aggregated responses',
      inputSchema: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          targetPlants: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific plants to ask (empty for all)'
          }
        },
        required: ['question']
      },
      handler: async (args) => this.askAgents(args)
    })
  }
  
  // ===========================================================================
  // TOOL EXECUTION
  // ===========================================================================
  
  /**
   * Get list of all available tools (MCP protocol)
   */
  getTools() {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }))
  }
  
  /**
   * Call a tool by name (MCP protocol)
   */
  async callTool(name, args = {}) {
    const tool = this.tools.get(name)
    
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`)
    }
    
    try {
      const result = await tool.handler(args)
      return {
        success: true,
        result
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }
  
  /**
   * Handle plant agent tool calls
   */
  async handlePlantAgentTool(agentId, toolName, args) {
    const agent = this.plantAgents.get(agentId)
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`)
    }
    
    return agent.handleMcpToolCall(toolName, args)
  }
  
  /**
   * Handle break room tool calls
   */
  async handleBreakRoomTool(toolName, args) {
    if (!this.breakRoom) {
      throw new Error('Break room not initialized')
    }
    
    return this.breakRoom.handleMcpToolCall(toolName, args)
  }
  
  // ===========================================================================
  // GLOBAL TOOL IMPLEMENTATIONS
  // ===========================================================================
  
  /**
   * List all plants and their agents
   */
  listPlants() {
    const plants = []
    
    for (const agent of this.plantAgents.values()) {
      const health = agent.getPlantHealth()
      
      plants.push({
        id: agent.id,
        plant: agent.plant,
        plantCode: agent.plantCode,
        name: agent.name,
        healthScore: health.healthScore,
        status: health.status,
        subAgents: agent.subAgents 
          ? Array.from(agent.subAgents.keys())
          : [],
        lastObservation: agent.lastObservation
      })
    }
    
    return {
      count: plants.length,
      plants
    }
  }
  
  /**
   * Get enterprise-wide health
   */
  getEnterpriseHealth({ includeBreakdown = true } = {}) {
    const plantHealth = []
    
    for (const agent of this.plantAgents.values()) {
      const health = agent.getPlantHealth({ includeDetails: true })
      plantHealth.push({
        plant: agent.plant,
        plantCode: agent.plantCode,
        ...health
      })
    }
    
    if (plantHealth.length === 0) {
      return {
        overallScore: 0,
        status: 'no_data',
        plantsMonitored: 0
      }
    }
    
    // Calculate enterprise metrics
    const avgScore = Math.round(
      plantHealth.reduce((sum, p) => sum + p.healthScore, 0) / plantHealth.length
    )
    
    const totalCritical = plantHealth.reduce(
      (sum, p) => sum + (p.summary?.criticalIssues || 0), 0
    )
    const totalHigh = plantHealth.reduce(
      (sum, p) => sum + (p.summary?.highIssues || 0), 0
    )
    
    const result = {
      overallScore: avgScore,
      status: avgScore >= 80 ? 'healthy' : avgScore >= 60 ? 'needs_attention' : 'critical',
      plantsMonitored: plantHealth.length,
      criticalPlants: plantHealth.filter(p => p.status === 'critical').length,
      totalCriticalIssues: totalCritical,
      totalHighIssues: totalHigh
    }
    
    if (includeBreakdown) {
      result.breakdown = plantHealth.map(p => ({
        plant: p.plant,
        plantCode: p.plantCode,
        healthScore: p.healthScore,
        status: p.status,
        criticalIssues: p.summary?.criticalIssues || 0
      })).sort((a, b) => a.healthScore - b.healthScore)
    }
    
    return result
  }
  
  /**
   * Compare plants by metric
   */
  comparePlants({ plants = [], metric = 'health' } = {}) {
    let targetAgents = Array.from(this.plantAgents.values())
    
    if (plants.length > 0) {
      targetAgents = targetAgents.filter(a => 
        plants.includes(a.plantCode) || plants.includes(a.plant)
      )
    }
    
    const comparison = targetAgents.map(agent => {
      const base = {
        plant: agent.plant,
        plantCode: agent.plantCode
      }
      
      switch (metric) {
        case 'health': {
          const health = agent.getPlantHealth()
          return {
            ...base,
            healthScore: health.healthScore,
            status: health.status,
            weaknesses: health.summary?.weaknesses || 0,
            strengths: health.summary?.strengths || 0
          }
        }
        
        case 'risk': {
          const health = agent.getPlantHealth({ includeDetails: true })
          return {
            ...base,
            criticalIssues: health.summary?.criticalIssues || 0,
            highIssues: health.summary?.highIssues || 0,
            avgRiskScore: health.healthScore ? 100 - health.healthScore : null
          }
        }
        
        case 'lifecycle': {
          const lifecycleObs = (agent.aggregatedObservations || [])
            .filter(o => o.sourceAgent === 'lifecycle')
          return {
            ...base,
            lifecycleIssues: lifecycleObs.filter(o => 
              o.severity === 'critical' || o.severity === 'high'
            ).length,
            obsoleteCount: lifecycleObs.filter(o => 
              o.description?.toLowerCase().includes('obsolete')
            ).length
          }
        }
        
        case 'coverage': {
          const gapObs = (agent.aggregatedObservations || [])
            .filter(o => o.sourceAgent === 'gap')
          return {
            ...base,
            blindSpots: gapObs.filter(o => 
              o.description?.toLowerCase().includes('blind spot')
            ).length,
            orphans: gapObs.filter(o => 
              o.description?.toLowerCase().includes('orphan') ||
              o.description?.toLowerCase().includes('undocumented')
            ).length
          }
        }
        
        default:
          return base
      }
    })
    
    // Sort appropriately
    switch (metric) {
      case 'health':
        comparison.sort((a, b) => (b.healthScore || 0) - (a.healthScore || 0))
        break
      case 'risk':
        comparison.sort((a, b) => (b.criticalIssues || 0) - (a.criticalIssues || 0))
        break
      default:
        break
    }
    
    return {
      metric,
      plantsCompared: comparison.length,
      comparison
    }
  }
  
  /**
   * Start observation round via coordinator
   */
  async startObservationRound() {
    if (this.coordinator) {
      return this.coordinator.startObservationRound()
    }
    
    // Fallback: trigger observations directly
    const results = []
    for (const agent of this.plantAgents.values()) {
      try {
        await agent.observe()
        results.push({
          plant: agent.plant,
          success: true,
          observations: agent.aggregatedObservations?.length || agent.observations?.length
        })
      } catch (error) {
        results.push({
          plant: agent.plant,
          success: false,
          error: error.message
        })
      }
    }
    
    return { results }
  }
  
  /**
   * Get executive summary via coordinator
   */
  async getExecutiveSummary({ timeRange = 'day' } = {}) {
    if (this.coordinator) {
      return this.coordinator.generateExecutiveSummary({ timeRange })
    }
    
    // Fallback: use break room summary
    if (this.breakRoom) {
      return this.breakRoom.summarize({ timeRange })
    }
    
    throw new Error('No coordinator or break room available')
  }
  
  /**
   * Ask question to multiple agents
   */
  async askAgents({ question, targetPlants = [] } = {}) {
    const responses = []
    
    let targetAgents = Array.from(this.plantAgents.values())
    
    if (targetPlants.length > 0) {
      targetAgents = targetAgents.filter(a => 
        targetPlants.includes(a.plantCode) || targetPlants.includes(a.plant)
      )
    }
    
    for (const agent of targetAgents) {
      try {
        const answer = await agent.generateAnswer(question)
        responses.push({
          plant: agent.plant,
          agentId: agent.id,
          answer
        })
      } catch (error) {
        responses.push({
          plant: agent.plant,
          agentId: agent.id,
          error: error.message
        })
      }
    }
    
    return {
      question,
      respondents: responses.length,
      responses
    }
  }
  
  // ===========================================================================
  // MCP PROTOCOL
  // ===========================================================================
  
  /**
   * Get server info (MCP protocol)
   */
  getServerInfo() {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      capabilities: {
        tools: true,
        resources: false,
        prompts: false
      }
    }
  }
  
  /**
   * Handle MCP request
   */
  async handleRequest(request) {
    const { method, params } = request
    
    switch (method) {
      case 'initialize':
        return {
          protocolVersion: '2024-11-05',
          serverInfo: this.getServerInfo(),
          capabilities: { tools: {} }
        }
      
      case 'tools/list':
        return { tools: this.getTools() }
      
      case 'tools/call':
        return this.callTool(params.name, params.arguments || {})
      
      default:
        throw new Error(`Unsupported method: ${method}`)
    }
  }
  
  // ===========================================================================
  // SERIALIZATION
  // ===========================================================================
  
  /**
   * Export server state
   */
  toJSON() {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      registeredAgents: Array.from(this.plantAgents.keys()),
      toolCount: this.tools.size
    }
  }
}

export default AgentMcpServer
