/**
 * Agentic Semantic Layer - Module Index (barrel)
 *
 * Agents observe plants, communicate findings in the "break room", generate
 * insights, and expose capabilities via MCP.
 *
 * NOTE: This barrel is a convenience aggregator and is intentionally NOT on the
 * app's boot path. The app imports the hook from './useAgenticLayer.js' and the
 * factories from './factory.js' directly. Keep value bindings here imported (not
 * just re-exported) so the default export can reference them — a previous version
 * referenced `BaseAgent` via a re-export only, which threw "BaseAgent is not
 * defined" at runtime when the module was evaluated.
 */

// Types and utilities
export * from './types.js'

import { AgentRole, createAgentConfig } from './types.js'
import { BaseAgent } from './base-agent.js'
import { PlantAgent } from './plant-agent.js'
import { SecurityAgent } from './specialized/security-agent.js'
import { LifecycleAgent } from './specialized/lifecycle-agent.js'
import { GapAgent } from './specialized/gap-agent.js'
import { RiskAgent } from './specialized/risk-agent.js'
import { DependencyAgent } from './specialized/dependency-agent.js'
import { BreakRoom } from './break-room.js'
import { CoordinatorAgent } from './coordinator.js'
import { AgentMcpServer } from './mcp-server.js'
import { createPlantAgent, createAgenticLayer } from './factory.js'

// Named re-exports
export {
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
  createPlantAgent,
  createAgenticLayer
}

// React hooks: import from './useAgenticLayer.js' directly. They are intentionally
// NOT re-exported here to keep this barrel off the hook's import path.

export default {
  AgentRole,
  createAgentConfig,
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
  createPlantAgent,
  createAgenticLayer
}
