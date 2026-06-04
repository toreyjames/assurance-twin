/**
 * AGENT FACTORY FUNCTIONS
 *
 * Extracted from index.js so the app's boot path (AssuranceWorkspace →
 * useAgenticLayer → factory) never touches the index.js barrel. The barrel
 * both re-exports and imports the same agent class modules; pulling it onto
 * the boot path made Rollup's scope-hoisting drop the `BaseAgent` binding at
 * runtime ("BaseAgent is not defined"), blanking the app. This module imports
 * each class directly, forming a clean acyclic graph.
 */

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
