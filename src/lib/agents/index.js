/**
 * Agentic Semantic Layer - Module Index
 * 
 * This module provides an AI agent layer for OT Assurance Twin where agents:
 * - Observe plants and discover weaknesses/strengths
 * - Communicate findings in the "break room"
 * - Generate insights and suggestions
 * - Expose capabilities via MCP
 */

// Types and utilities
export * from './types.js'

// Base agent
export { BaseAgent } from './base-agent.js'

// Plant agent (orchestrator)
export { PlantAgent } from './plant-agent.js'

// Specialized agents
export { SecurityAgent } from './specialized/security-agent.js'
export { LifecycleAgent } from './specialized/lifecycle-agent.js'
export { GapAgent } from './specialized/gap-agent.js'
export { RiskAgent } from './specialized/risk-agent.js'
export { DependencyAgent } from './specialized/dependency-agent.js'

// Intelligence layer
export { BreakRoom } from './break-room.js'
export { CoordinatorAgent } from './coordinator.js'

// MCP server
export { AgentMcpServer } from './mcp-server.js'

// React hook
export { useAgenticLayer, useAgentsFromResults } from './useAgenticLayer.js'

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

import { AgentRole, createAgentConfig } from './types.js'
import { PlantAgent } from './plant-agent.js'
import { SecurityAgent } from './specialized/security-agent.js'
import { LifecycleAgent } from './specialized/lifecycle-agent.js'
import { GapAgent } from './specialized/gap-agent.js'
import { RiskAgent } from './specialized/risk-agent.js'
import { DependencyAgent } from './specialized/dependency-agent.js'
import { BreakRoom } from './break-room.js'
import { CoordinatorAgent } from './coordinator.js'
import { AgentMcpServer } from './mcp-server.js'

/**
 * Create a fully configured plant agent with all sub-agents
 */
export function createPlantAgent({
  plant,
  plantCode,
  industry = null,
  settings = {}
}) {
  const config = createAgentConfig({
    name: `${plant} Plant Agent`,
    role: AgentRole.PLANT,
    plant,
    plantCode,
    description: `Orchestrates all agents for ${plant}`,
    settings
  })
  
  const agent = new PlantAgent({
    ...config,
    industry
  })
  
  // Register sub-agent classes
  agent.registerSubAgentClass(AgentRole.SECURITY, SecurityAgent)
  agent.registerSubAgentClass(AgentRole.LIFECYCLE, LifecycleAgent)
  agent.registerSubAgentClass(AgentRole.GAP, GapAgent)
  agent.registerSubAgentClass(AgentRole.RISK, RiskAgent)
  agent.registerSubAgentClass(AgentRole.DEPENDENCY, DependencyAgent)
  
  return agent
}

/**
 * Create the full agentic layer for an enterprise
 */
export async function createAgenticLayer({
  plants = [],
  llmClient = null,
  persistenceKey = 'ot-assurance-agents'
}) {
  // Create break room
  let breakRoom = BreakRoom.loadFromStorage(persistenceKey)
  if (!breakRoom) {
    breakRoom = new BreakRoom({ name: 'Enterprise Break Room' })
  }
  
  // Create coordinator
  const coordinator = new CoordinatorAgent()
  await coordinator.initialize({ breakRoom, llmClient })
  
  // Create plant agents
  const plantAgents = []
  
  for (const plantConfig of plants) {
    const agent = createPlantAgent(plantConfig)
    await agent.initialize({
      breakRoom,
      context: plantConfig.context || {},
      llmClient
    })
    
    coordinator.registerPlantAgent(agent)
    plantAgents.push(agent)
  }
  
  // Create MCP server
  const mcpServer = new AgentMcpServer()
  mcpServer.initialize({
    breakRoom,
    plantAgents,
    coordinator
  })
  
  return {
    breakRoom,
    coordinator,
    plantAgents,
    mcpServer,
    
    // Convenience methods
    async observe() {
      return coordinator.startObservationRound()
    },
    
    async getSummary(timeRange = 'day') {
      return coordinator.generateExecutiveSummary({ timeRange })
    },
    
    async ask(question, options = {}) {
      return breakRoom.submitQuestion(question, options)
    },
    
    getPlantAgent(plantCode) {
      return plantAgents.find(a => 
        a.plantCode === plantCode || a.plant === plantCode
      )
    },
    
    save() {
      breakRoom.saveToStorage(persistenceKey)
    }
  }
}

import { useAgenticLayer, useAgentsFromResults } from './useAgenticLayer.js'

export default {
  // Types
  AgentRole,
  createAgentConfig,
  
  // Classes
  BaseAgent,
  PlantAgent,
  SecurityAgent,
  LifecycleAgent,
  GapAgent,
  RiskAgent,
  DependencyAgent,
  BreakRoom,
  CoordinatorAgent,
  AgentMcpServer,
  
  // Factory functions
  createPlantAgent,
  createAgenticLayer,
  
  // React hooks
  useAgenticLayer,
  useAgentsFromResults
}
