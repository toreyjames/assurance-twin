/**
 * AGENT TYPES
 * Core data structures for the Agentic Semantic Layer
 * 
 * Agents observe plants, communicate findings, debate weaknesses/strengths,
 * and aggregate intelligence in the "break room"
 */

// =============================================================================
// MESSAGE TYPES
// =============================================================================

export const MessageType = {
  OBSERVATION: 'observation',     // Agent reports what it found
  COMPLIMENT: 'compliment',       // Agent praises something good
  CRITIQUE: 'critique',           // Agent criticizes a weakness
  SUGGESTION: 'suggestion',       // Agent proposes improvement
  QUESTION: 'question',           // Agent asks another agent
  RESPONSE: 'response',           // Agent responds to question
  ALERT: 'alert',                 // Urgent notification
  SUMMARY: 'summary'              // Aggregated findings
}

export const MessageTopic = {
  VULNERABILITY: 'vulnerability',
  LIFECYCLE: 'lifecycle',
  GAP: 'gap',
  RISK: 'risk',
  DEPENDENCY: 'dependency',
  COVERAGE: 'coverage',
  COMPLIANCE: 'compliance',
  GENERAL: 'general'
}

export const Sentiment = {
  POSITIVE: 'positive',
  NEGATIVE: 'negative',
  NEUTRAL: 'neutral',
  URGENT: 'urgent'
}

// =============================================================================
// OBSERVATION TYPES
// =============================================================================

export const ObservationType = {
  WEAKNESS: 'weakness',
  STRENGTH: 'strength',
  ANOMALY: 'anomaly',
  IMPROVEMENT: 'improvement',
  PATTERN: 'pattern',
  TREND: 'trend'
}

export const ObservationSeverity = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  POSITIVE: 'positive',   // For good things
  INFO: 'info'
}

// =============================================================================
// AGENT TYPES
// =============================================================================

export const AgentRole = {
  PLANT: 'plant',                // Plant-level orchestrator
  SECURITY: 'security',          // Vulnerabilities, network exposure
  LIFECYCLE: 'lifecycle',        // EOL/EOS, aging equipment
  GAP: 'gap',                    // Blind spots, orphans, coverage
  RISK: 'risk',                  // Holistic risk scoring
  DEPENDENCY: 'dependency',      // Process dependencies, blast radius
  COORDINATOR: 'coordinator'     // Break room orchestrator
}

export const AgentState = {
  IDLE: 'idle',
  OBSERVING: 'observing',
  ANALYZING: 'analyzing',
  COMMUNICATING: 'communicating',
  LISTENING: 'listening',
  REASONING: 'reasoning'
}

// =============================================================================
// DATA STRUCTURES
// =============================================================================

/**
 * Create a new agent message
 */
export function createMessage({
  agentId,
  agentName,
  role,
  type,
  topic = MessageTopic.GENERAL,
  sentiment = Sentiment.NEUTRAL,
  content,
  evidence = [],
  replyTo = null,
  threadId = null,
  metadata = {}
}) {
  return {
    id: generateId(),
    agentId,
    agentName,
    role,
    type,
    topic,
    sentiment,
    content,
    evidence,
    replyTo,
    threadId: threadId || (replyTo ? null : generateId()),
    timestamp: Date.now(),
    metadata
  }
}

/**
 * Create a new observation
 */
export function createObservation({
  agentId,
  type,
  severity,
  subject,
  description,
  evidence = [],
  confidence = 0.8,
  recommendations = [],
  metadata = {}
}) {
  return {
    id: generateId(),
    agentId,
    type,
    severity,
    subject: {
      plant: subject.plant || null,
      plantCode: subject.plantCode || null,
      unit: subject.unit || null,
      unitCode: subject.unitCode || null,
      asset: subject.asset || null,
      assetId: subject.assetId || null,
      function: subject.function || null
    },
    description,
    evidence,
    confidence,
    recommendations,
    timestamp: Date.now(),
    acknowledged: false,
    resolved: false,
    metadata
  }
}

/**
 * Create a conversation thread
 */
export function createThread({
  topic,
  startedBy,
  subject,
  priority = 'normal'
}) {
  return {
    id: generateId(),
    topic,
    startedBy,
    subject,
    priority,
    messages: [],
    participants: [startedBy],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    resolved: false,
    summary: null
  }
}

/**
 * Agent configuration
 */
export function createAgentConfig({
  id,
  name,
  role,
  plant = null,
  plantCode = null,
  description = '',
  capabilities = [],
  settings = {}
}) {
  return {
    id: id || `${role}-${plant?.toLowerCase().replace(/\s+/g, '-') || 'global'}-${generateId().slice(0, 8)}`,
    name,
    role,
    plant,
    plantCode,
    description,
    capabilities,
    settings: {
      observationInterval: settings.observationInterval || 60000, // 1 minute default
      alertThreshold: settings.alertThreshold || 'high',
      verbosity: settings.verbosity || 'normal',
      autoRespond: settings.autoRespond !== false,
      ...settings
    },
    createdAt: Date.now()
  }
}

/**
 * Knowledge entry for persistent memory
 */
export function createKnowledgeEntry({
  type,
  subject,
  content,
  source,
  confidence = 0.8,
  tags = [],
  expiresAt = null
}) {
  return {
    id: generateId(),
    type, // 'fact', 'pattern', 'resolution', 'learning'
    subject,
    content,
    source,
    confidence,
    tags,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    expiresAt,
    references: 0
  }
}

// =============================================================================
// EVIDENCE TYPES
// =============================================================================

export const EvidenceType = {
  ASSET: 'asset',
  GAP: 'gap',
  RISK_SCORE: 'risk_score',
  LIFECYCLE: 'lifecycle',
  DEPENDENCY: 'dependency',
  METRIC: 'metric',
  DOCUMENT: 'document'
}

/**
 * Create evidence reference
 */
export function createEvidence({
  type,
  id,
  description,
  data = {},
  link = null
}) {
  return {
    type,
    id,
    description,
    data,
    link,
    capturedAt: Date.now()
  }
}

// =============================================================================
// MCP TOOL DEFINITIONS
// =============================================================================

/**
 * Standard MCP tools exposed by plant agents
 */
export const PLANT_AGENT_TOOLS = [
  {
    name: 'get_plant_health',
    description: 'Get overall plant health score and status summary',
    inputSchema: {
      type: 'object',
      properties: {
        includeDetails: { type: 'boolean', default: false }
      }
    }
  },
  {
    name: 'get_weaknesses',
    description: 'Get current identified weaknesses in the plant',
    inputSchema: {
      type: 'object',
      properties: {
        severity: { type: 'string', enum: ['all', 'critical', 'high', 'medium', 'low'] },
        topic: { type: 'string', enum: Object.values(MessageTopic) },
        limit: { type: 'number', default: 10 }
      }
    }
  },
  {
    name: 'get_strengths',
    description: 'Get things working well in the plant',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', default: 10 }
      }
    }
  },
  {
    name: 'get_recommendations',
    description: 'Get improvement suggestions for the plant',
    inputSchema: {
      type: 'object',
      properties: {
        priority: { type: 'string', enum: ['all', 'high', 'medium', 'low'] },
        limit: { type: 'number', default: 10 }
      }
    }
  },
  {
    name: 'ask_agent',
    description: 'Ask the agent a question about its domain',
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string' }
      },
      required: ['question']
    }
  },
  {
    name: 'get_observations',
    description: 'Get recent observations from the agent',
    inputSchema: {
      type: 'object',
      properties: {
        since: { type: 'number', description: 'Timestamp to filter from' },
        type: { type: 'string', enum: Object.values(ObservationType) },
        limit: { type: 'number', default: 20 }
      }
    }
  }
]

/**
 * MCP tools for the break room
 */
export const BREAK_ROOM_TOOLS = [
  {
    name: 'query_break_room',
    description: 'Search conversations and observations in the break room',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        topic: { type: 'string' },
        plant: { type: 'string' },
        since: { type: 'number' },
        limit: { type: 'number', default: 20 }
      }
    }
  },
  {
    name: 'get_active_threads',
    description: 'Get currently active discussion threads',
    inputSchema: {
      type: 'object',
      properties: {
        plant: { type: 'string' },
        resolved: { type: 'boolean' },
        limit: { type: 'number', default: 10 }
      }
    }
  },
  {
    name: 'submit_question',
    description: 'Submit a question to agents in the break room',
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string' },
        targetAgent: { type: 'string', description: 'Specific agent ID or "all"' },
        topic: { type: 'string' }
      },
      required: ['question']
    }
  },
  {
    name: 'get_summary',
    description: 'Get a summary of recent break room activity',
    inputSchema: {
      type: 'object',
      properties: {
        timeRange: { type: 'string', enum: ['hour', 'day', 'week'] },
        plant: { type: 'string' }
      }
    }
  }
]

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate unique ID
 */
function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Determine sentiment from observation
 */
export function determineSentiment(observation) {
  if (observation.type === ObservationType.STRENGTH) {
    return Sentiment.POSITIVE
  }
  if (observation.severity === ObservationSeverity.CRITICAL) {
    return Sentiment.URGENT
  }
  if (observation.severity === ObservationSeverity.POSITIVE) {
    return Sentiment.POSITIVE
  }
  if (observation.type === ObservationType.WEAKNESS || observation.type === ObservationType.ANOMALY) {
    return Sentiment.NEGATIVE
  }
  return Sentiment.NEUTRAL
}

/**
 * Convert observation to message content
 */
export function observationToContent(observation) {
  const templates = {
    [ObservationType.WEAKNESS]: {
      [ObservationSeverity.CRITICAL]: `CRITICAL: ${observation.description}`,
      [ObservationSeverity.HIGH]: `Found a significant issue: ${observation.description}`,
      [ObservationSeverity.MEDIUM]: `Noticed something concerning: ${observation.description}`,
      [ObservationSeverity.LOW]: `Minor observation: ${observation.description}`
    },
    [ObservationType.STRENGTH]: {
      default: `Good news! ${observation.description}`
    },
    [ObservationType.ANOMALY]: {
      default: `Something unusual: ${observation.description}`
    },
    [ObservationType.IMPROVEMENT]: {
      default: `Suggestion: ${observation.description}`
    },
    [ObservationType.PATTERN]: {
      default: `I've noticed a pattern: ${observation.description}`
    },
    [ObservationType.TREND]: {
      default: `Trend detected: ${observation.description}`
    }
  }
  
  const typeTemplates = templates[observation.type] || { default: observation.description }
  return typeTemplates[observation.severity] || typeTemplates.default || observation.description
}

export default {
  // Enums
  MessageType,
  MessageTopic,
  Sentiment,
  ObservationType,
  ObservationSeverity,
  AgentRole,
  AgentState,
  EvidenceType,
  
  // Factory functions
  createMessage,
  createObservation,
  createThread,
  createAgentConfig,
  createKnowledgeEntry,
  createEvidence,
  
  // Tools
  PLANT_AGENT_TOOLS,
  BREAK_ROOM_TOOLS,
  
  // Utilities
  determineSentiment,
  observationToContent
}
