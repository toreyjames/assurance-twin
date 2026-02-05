/**
 * BREAK ROOM COMPONENT
 * Dashboard for observing agent conversations and insights
 * 
 * Features:
 * - Live feed of agent conversations
 * - Filter by plant/agent/topic/severity
 * - Sentiment indicators
 * - Thread view for discussions
 * - Summary panel
 */

import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  MessageType,
  MessageTopic,
  Sentiment,
  ObservationType,
  ObservationSeverity
} from '../lib/agents/types.js'

// =============================================================================
// STYLING
// =============================================================================

const SENTIMENT_STYLES = {
  [Sentiment.POSITIVE]: { bg: '#dcfce7', border: '#22c55e', text: '#16a34a', icon: '👍' },
  [Sentiment.NEGATIVE]: { bg: '#fee2e2', border: '#ef4444', text: '#dc2626', icon: '⚠️' },
  [Sentiment.URGENT]: { bg: '#fef2f2', border: '#dc2626', text: '#b91c1c', icon: '🚨' },
  [Sentiment.NEUTRAL]: { bg: '#f8fafc', border: '#94a3b8', text: '#475569', icon: '💬' }
}

const MESSAGE_TYPE_STYLES = {
  [MessageType.OBSERVATION]: { icon: '👁️', label: 'Observation' },
  [MessageType.COMPLIMENT]: { icon: '👍', label: 'Compliment' },
  [MessageType.CRITIQUE]: { icon: '⚠️', label: 'Critique' },
  [MessageType.SUGGESTION]: { icon: '💡', label: 'Suggestion' },
  [MessageType.QUESTION]: { icon: '❓', label: 'Question' },
  [MessageType.RESPONSE]: { icon: '💬', label: 'Response' },
  [MessageType.ALERT]: { icon: '🚨', label: 'Alert' },
  [MessageType.SUMMARY]: { icon: '📊', label: 'Summary' }
}

const TOPIC_LABELS = {
  [MessageTopic.VULNERABILITY]: { icon: '🛡️', label: 'Security' },
  [MessageTopic.LIFECYCLE]: { icon: '⏰', label: 'Lifecycle' },
  [MessageTopic.GAP]: { icon: '🔍', label: 'Gaps' },
  [MessageTopic.RISK]: { icon: '⚡', label: 'Risk' },
  [MessageTopic.DEPENDENCY]: { icon: '🔗', label: 'Dependencies' },
  [MessageTopic.COVERAGE]: { icon: '📡', label: 'Coverage' },
  [MessageTopic.COMPLIANCE]: { icon: '📋', label: 'Compliance' },
  [MessageTopic.GENERAL]: { icon: '💬', label: 'General' }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function formatTimestamp(ts) {
  const date = new Date(ts)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function getAgentColor(agentId) {
  const colors = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6',
    '#06b6d4', '#6366f1', '#84cc16', '#f43f5e', '#10b981'
  ]
  let hash = 0
  for (let i = 0; i < (agentId || '').length; i++) {
    hash = agentId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// =============================================================================
// MESSAGE CARD COMPONENT
// =============================================================================

function MessageCard({ message, onClick, isSelected }) {
  const sentimentStyle = SENTIMENT_STYLES[message.sentiment] || SENTIMENT_STYLES[Sentiment.NEUTRAL]
  const messageTypeInfo = MESSAGE_TYPE_STYLES[message.type] || MESSAGE_TYPE_STYLES[MessageType.OBSERVATION]
  const topicInfo = TOPIC_LABELS[message.topic] || TOPIC_LABELS[MessageTopic.GENERAL]
  const agentColor = getAgentColor(message.agentId)
  
  return (
    <div
      onClick={onClick}
      style={{
        padding: '0.875rem',
        background: isSelected ? '#eff6ff' : sentimentStyle.bg,
        borderRadius: '0.5rem',
        border: `1px solid ${isSelected ? '#3b82f6' : sentimentStyle.border}`,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: isSelected ? '0 0 0 2px #3b82f640' : 'none'
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Agent badge */}
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: agentColor
          }} />
          <span style={{ fontWeight: '600', fontSize: '0.8rem', color: '#0f172a' }}>
            {message.agentName}
          </span>
          {message.metadata?.plant && (
            <span style={{
              fontSize: '0.7rem',
              padding: '0.125rem 0.375rem',
              background: '#e2e8f0',
              borderRadius: '0.25rem',
              color: '#64748b'
            }}>
              {message.metadata.plant}
            </span>
          )}
        </div>
        
        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
          {formatTimestamp(message.timestamp)}
        </span>
      </div>
      
      {/* Type and Topic badges */}
      <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
        <span style={{
          fontSize: '0.7rem',
          padding: '0.125rem 0.375rem',
          background: sentimentStyle.border + '20',
          color: sentimentStyle.text,
          borderRadius: '0.25rem',
          fontWeight: '500'
        }}>
          {messageTypeInfo.icon} {messageTypeInfo.label}
        </span>
        <span style={{
          fontSize: '0.7rem',
          padding: '0.125rem 0.375rem',
          background: '#f1f5f9',
          color: '#64748b',
          borderRadius: '0.25rem'
        }}>
          {topicInfo.icon} {topicInfo.label}
        </span>
        {message.metadata?.severity && (
          <span style={{
            fontSize: '0.7rem',
            padding: '0.125rem 0.375rem',
            background: message.metadata.severity === 'critical' ? '#fef2f2' : '#fff7ed',
            color: message.metadata.severity === 'critical' ? '#dc2626' : '#ea580c',
            borderRadius: '0.25rem',
            fontWeight: '600'
          }}>
            {message.metadata.severity.toUpperCase()}
          </span>
        )}
      </div>
      
      {/* Content */}
      <p style={{
        margin: 0,
        fontSize: '0.85rem',
        lineHeight: '1.4',
        color: '#334155',
        whiteSpace: 'pre-wrap'
      }}>
        {message.content.length > 200 ? message.content.slice(0, 200) + '...' : message.content}
      </p>
      
      {/* Thread indicator */}
      {message.replyTo && (
        <div style={{
          marginTop: '0.5rem',
          fontSize: '0.7rem',
          color: '#94a3b8',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem'
        }}>
          ↳ Reply in thread
        </div>
      )}
    </div>
  )
}

// =============================================================================
// FILTER BAR COMPONENT
// =============================================================================

function FilterBar({ filters, onFilterChange, agents, plants }) {
  return (
    <div style={{
      display: 'flex',
      gap: '0.75rem',
      padding: '0.75rem',
      background: '#f8fafc',
      borderRadius: '0.5rem',
      flexWrap: 'wrap'
    }}>
      {/* Plant filter */}
      <select
        value={filters.plant || ''}
        onChange={(e) => onFilterChange({ ...filters, plant: e.target.value || null })}
        style={{
          padding: '0.375rem 0.75rem',
          borderRadius: '0.375rem',
          border: '1px solid #e2e8f0',
          fontSize: '0.8rem',
          background: 'white'
        }}
      >
        <option value="">All Plants</option>
        {plants.map(p => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
      
      {/* Topic filter */}
      <select
        value={filters.topic || ''}
        onChange={(e) => onFilterChange({ ...filters, topic: e.target.value || null })}
        style={{
          padding: '0.375rem 0.75rem',
          borderRadius: '0.375rem',
          border: '1px solid #e2e8f0',
          fontSize: '0.8rem',
          background: 'white'
        }}
      >
        <option value="">All Topics</option>
        {Object.entries(TOPIC_LABELS).map(([key, val]) => (
          <option key={key} value={key}>{val.icon} {val.label}</option>
        ))}
      </select>
      
      {/* Sentiment filter */}
      <select
        value={filters.sentiment || ''}
        onChange={(e) => onFilterChange({ ...filters, sentiment: e.target.value || null })}
        style={{
          padding: '0.375rem 0.75rem',
          borderRadius: '0.375rem',
          border: '1px solid #e2e8f0',
          fontSize: '0.8rem',
          background: 'white'
        }}
      >
        <option value="">All Sentiment</option>
        <option value={Sentiment.URGENT}>🚨 Urgent</option>
        <option value={Sentiment.NEGATIVE}>⚠️ Negative</option>
        <option value={Sentiment.POSITIVE}>👍 Positive</option>
        <option value={Sentiment.NEUTRAL}>💬 Neutral</option>
      </select>
      
      {/* Message type filter */}
      <select
        value={filters.type || ''}
        onChange={(e) => onFilterChange({ ...filters, type: e.target.value || null })}
        style={{
          padding: '0.375rem 0.75rem',
          borderRadius: '0.375rem',
          border: '1px solid #e2e8f0',
          fontSize: '0.8rem',
          background: 'white'
        }}
      >
        <option value="">All Types</option>
        {Object.entries(MESSAGE_TYPE_STYLES).map(([key, val]) => (
          <option key={key} value={key}>{val.icon} {val.label}</option>
        ))}
      </select>
      
      {/* Clear filters */}
      {(filters.plant || filters.topic || filters.sentiment || filters.type) && (
        <button
          onClick={() => onFilterChange({})}
          style={{
            padding: '0.375rem 0.75rem',
            borderRadius: '0.375rem',
            border: '1px solid #e2e8f0',
            fontSize: '0.8rem',
            background: 'white',
            cursor: 'pointer',
            color: '#64748b'
          }}
        >
          Clear
        </button>
      )}
    </div>
  )
}

// =============================================================================
// SUMMARY PANEL COMPONENT
// =============================================================================

function SummaryPanel({ summary }) {
  if (!summary) return null
  
  return (
    <div style={{
      padding: '1rem',
      background: 'white',
      borderRadius: '0.75rem',
      border: '1px solid #e2e8f0'
    }}>
      <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: '600', color: '#0f172a' }}>
        📊 Summary ({summary.timeRange})
      </h4>
      
      {/* Health indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '0.75rem',
        padding: '0.75rem',
        background: summary.sentiment?.label === 'critical' ? '#fef2f2' :
                    summary.sentiment?.label === 'concerning' ? '#fff7ed' :
                    summary.sentiment?.label === 'positive' ? '#f0fdf4' : '#f8fafc',
        borderRadius: '0.5rem'
      }}>
        <div style={{
          width: '3rem',
          height: '3rem',
          borderRadius: '50%',
          background: summary.sentiment?.label === 'critical' ? '#dc2626' :
                      summary.sentiment?.label === 'concerning' ? '#f97316' :
                      summary.sentiment?.label === 'positive' ? '#22c55e' : '#64748b',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.25rem'
        }}>
          {summary.sentiment?.label === 'critical' ? '🚨' :
           summary.sentiment?.label === 'concerning' ? '⚠️' :
           summary.sentiment?.label === 'positive' ? '✓' : '—'}
        </div>
        <div>
          <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#0f172a' }}>
            {summary.plant}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            {summary.activity?.messages || 0} messages, {summary.findings?.total || 0} findings
          </div>
        </div>
      </div>
      
      {/* Findings breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <div style={{ textAlign: 'center', padding: '0.5rem', background: '#fef2f2', borderRadius: '0.375rem' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#dc2626' }}>
            {summary.findings?.critical || 0}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Critical</div>
        </div>
        <div style={{ textAlign: 'center', padding: '0.5rem', background: '#fff7ed', borderRadius: '0.375rem' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#ea580c' }}>
            {summary.findings?.high || 0}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>High</div>
        </div>
        <div style={{ textAlign: 'center', padding: '0.5rem', background: '#fefce8', borderRadius: '0.375rem' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#ca8a04' }}>
            {summary.findings?.weaknesses || 0}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Weaknesses</div>
        </div>
        <div style={{ textAlign: 'center', padding: '0.5rem', background: '#f0fdf4', borderRadius: '0.375rem' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#16a34a' }}>
            {summary.findings?.strengths || 0}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Strengths</div>
        </div>
      </div>
      
      {/* Top recommendations */}
      {summary.recommendations?.length > 0 && (
        <div>
          <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', fontWeight: '600', color: '#475569' }}>
            Top Recommendations
          </h5>
          <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.8rem', color: '#64748b' }}>
            {summary.recommendations.slice(0, 3).map((rec, i) => (
              <li key={i} style={{ marginBottom: '0.25rem' }}>{rec.text}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// AGENT STATUS PANEL
// =============================================================================

function AgentStatusPanel({ agents }) {
  if (!agents || agents.length === 0) return null
  
  return (
    <div style={{
      padding: '1rem',
      background: 'white',
      borderRadius: '0.75rem',
      border: '1px solid #e2e8f0'
    }}>
      <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: '600', color: '#0f172a' }}>
        🤖 Active Agents ({agents.length})
      </h4>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {agents.map(agent => (
          <div
            key={agent.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem',
              background: '#f8fafc',
              borderRadius: '0.375rem'
            }}
          >
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: agent.state === 'observing' ? '#22c55e' :
                          agent.state === 'analyzing' ? '#3b82f6' :
                          agent.state === 'communicating' ? '#8b5cf6' : '#94a3b8'
            }} />
            <span style={{ fontSize: '0.8rem', fontWeight: '500', color: '#334155', flex: 1 }}>
              {agent.name}
            </span>
            <span style={{
              fontSize: '0.7rem',
              padding: '0.125rem 0.375rem',
              background: '#e2e8f0',
              borderRadius: '0.25rem',
              color: '#64748b'
            }}>
              {agent.observations?.length || 0} obs
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// MESSAGE DETAIL PANEL
// =============================================================================

function MessageDetail({ message, onClose }) {
  if (!message) return null
  
  const sentimentStyle = SENTIMENT_STYLES[message.sentiment] || SENTIMENT_STYLES[Sentiment.NEUTRAL]
  const messageTypeInfo = MESSAGE_TYPE_STYLES[message.type] || MESSAGE_TYPE_STYLES[MessageType.OBSERVATION]
  
  return (
    <div style={{
      padding: '1rem',
      background: 'white',
      borderRadius: '0.75rem',
      border: '1px solid #e2e8f0'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600', color: '#0f172a' }}>
          {messageTypeInfo.icon} Message Details
        </h4>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.25rem',
            cursor: 'pointer',
            color: '#94a3b8',
            padding: 0,
            lineHeight: 1
          }}
        >
          ×
        </button>
      </div>
      
      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>From</div>
        <div style={{ fontSize: '0.9rem', fontWeight: '500', color: '#0f172a' }}>
          {message.agentName} {message.metadata?.plant && `(${message.metadata.plant})`}
        </div>
      </div>
      
      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Content</div>
        <div style={{
          fontSize: '0.85rem',
          lineHeight: '1.5',
          color: '#334155',
          padding: '0.75rem',
          background: '#f8fafc',
          borderRadius: '0.375rem',
          whiteSpace: 'pre-wrap'
        }}>
          {message.content}
        </div>
      </div>
      
      {message.evidence?.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Evidence</div>
          <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.8rem', color: '#475569' }}>
            {message.evidence.map((ev, i) => (
              <li key={i}>{ev.description || ev.id}</li>
            ))}
          </ul>
        </div>
      )}
      
      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
        {new Date(message.timestamp).toLocaleString()}
      </div>
    </div>
  )
}

// =============================================================================
// MAIN BREAK ROOM COMPONENT
// =============================================================================

export function BreakRoom({ breakRoom, agents = [], onStartObservation }) {
  const [filters, setFilters] = useState({})
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [messages, setMessages] = useState([])
  const [summary, setSummary] = useState(null)
  const messagesEndRef = useRef(null)
  
  // Subscribe to break room messages
  useEffect(() => {
    if (!breakRoom) return
    
    // Initial load
    setMessages(breakRoom.getRecentMessages(100))
    setSummary(breakRoom.summarize({ timeRange: 'day' }))
    
    // Subscribe to new messages
    const unsubscribe = breakRoom.subscribe((message) => {
      setMessages(prev => [...prev.slice(-99), message])
    })
    
    return unsubscribe
  }, [breakRoom])
  
  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  // Filter messages
  const filteredMessages = useMemo(() => {
    let result = [...messages]
    
    if (filters.plant) {
      result = result.filter(m => m.metadata?.plant === filters.plant)
    }
    if (filters.topic) {
      result = result.filter(m => m.topic === filters.topic)
    }
    if (filters.sentiment) {
      result = result.filter(m => m.sentiment === filters.sentiment)
    }
    if (filters.type) {
      result = result.filter(m => m.type === filters.type)
    }
    
    return result
  }, [messages, filters])
  
  // Extract unique plants from messages
  const plants = useMemo(() => {
    const plantSet = new Set()
    for (const agent of agents) {
      if (agent.plant) plantSet.add(agent.plant)
    }
    return Array.from(plantSet)
  }, [agents])
  
  if (!breakRoom) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#64748b'
      }}>
        <p>Break Room not initialized. Start an observation round to activate agents.</p>
        {onStartObservation && (
          <button
            onClick={onStartObservation}
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1.5rem',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Start Observation Round
          </button>
        )}
      </div>
    )
  }
  
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 300px',
      gap: '1rem',
      height: '100%',
      minHeight: '400px'
    }}>
      {/* Main feed */}
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#0f172a' }}>
            🏢 Break Room - Agent Conversations
          </h3>
          {onStartObservation && (
            <button
              onClick={onStartObservation}
              style={{
                padding: '0.5rem 1rem',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontWeight: '500',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem'
              }}
            >
              🔄 Run Observation
            </button>
          )}
        </div>
        
        {/* Filters */}
        <FilterBar
          filters={filters}
          onFilterChange={setFilters}
          agents={agents}
          plants={plants}
        />
        
        {/* Messages feed */}
        <div style={{
          flex: 1,
          marginTop: '0.75rem',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          paddingRight: '0.5rem'
        }}>
          {filteredMessages.length === 0 ? (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: '#94a3b8'
            }}>
              {messages.length === 0 
                ? 'No messages yet. Start an observation round to see agent conversations.'
                : 'No messages match the current filters.'}
            </div>
          ) : (
            filteredMessages.map(message => (
              <MessageCard
                key={message.id}
                message={message}
                onClick={() => setSelectedMessage(message)}
                isSelected={selectedMessage?.id === message.id}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Side panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: 0 }}>
        {/* Message detail or summary */}
        {selectedMessage ? (
          <MessageDetail
            message={selectedMessage}
            onClose={() => setSelectedMessage(null)}
          />
        ) : (
          <SummaryPanel summary={summary} />
        )}
        
        {/* Agent status */}
        <AgentStatusPanel agents={agents} />
        
        {/* Stats */}
        <div style={{
          padding: '0.75rem',
          background: '#f8fafc',
          borderRadius: '0.5rem',
          fontSize: '0.8rem',
          color: '#64748b'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span>Total messages:</span>
            <span style={{ fontWeight: '500', color: '#334155' }}>{messages.length}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span>Filtered:</span>
            <span style={{ fontWeight: '500', color: '#334155' }}>{filteredMessages.length}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Active threads:</span>
            <span style={{ fontWeight: '500', color: '#334155' }}>{breakRoom.threads?.size || 0}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BreakRoom
