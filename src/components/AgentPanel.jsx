/**
 * AGENT PANEL COMPONENT
 * Combined panel showing Break Room conversations and Analyst Chat
 * 
 * This is a convenience component that combines:
 * - Agent activity overview
 * - Break Room conversations
 * - Analyst Chat interface
 */

import React, { useState } from 'react'
import BreakRoom from './BreakRoom.jsx'
import AnalystChat from './AnalystChat.jsx'

// =============================================================================
// TAB COMPONENT
// =============================================================================

function TabButton({ active, onClick, children, icon }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.625rem 1rem',
        background: active ? '#3b82f6' : 'transparent',
        color: active ? 'white' : '#64748b',
        border: 'none',
        borderRadius: '0.5rem',
        cursor: 'pointer',
        fontWeight: '500',
        fontSize: '0.85rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem',
        transition: 'all 0.15s ease'
      }}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  )
}

// =============================================================================
// AGENT STATUS BADGE
// =============================================================================

function AgentStatusBadge({ agents, isObserving }) {
  const activeCount = agents?.length || 0
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.375rem 0.75rem',
      background: '#f1f5f9',
      borderRadius: '1rem',
      fontSize: '0.8rem'
    }}>
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: isObserving ? '#22c55e' : activeCount > 0 ? '#3b82f6' : '#94a3b8',
        animation: isObserving ? 'pulse 1s infinite' : 'none'
      }} />
      <span style={{ color: '#475569' }}>
        {isObserving ? 'Observing...' : `${activeCount} agent${activeCount !== 1 ? 's' : ''} active`}
      </span>
    </div>
  )
}

// =============================================================================
// QUICK STATS
// =============================================================================

function QuickStats({ breakRoom }) {
  if (!breakRoom) return null
  
  const messages = breakRoom.messages?.length || 0
  const observations = breakRoom.observations?.length || 0
  const threads = breakRoom.threads?.size || 0
  
  const criticalObs = breakRoom.observations?.filter(o => 
    o.severity === 'critical'
  ).length || 0
  
  return (
    <div style={{
      display: 'flex',
      gap: '1rem',
      padding: '0.75rem',
      background: '#f8fafc',
      borderRadius: '0.5rem',
      marginBottom: '0.75rem'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>{messages}</div>
        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Messages</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>{observations}</div>
        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Observations</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.25rem', fontWeight: '700', color: criticalObs > 0 ? '#dc2626' : '#0f172a' }}>
          {criticalObs}
        </div>
        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Critical</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>{threads}</div>
        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Threads</div>
      </div>
    </div>
  )
}

// =============================================================================
// MAIN AGENT PANEL COMPONENT
// =============================================================================

export function AgentPanel({
  breakRoom,
  agents = [],
  isObserving = false,
  onStartObservation,
  onAskQuestion,
  collapsed = false,
  onToggleCollapse
}) {
  const [activeTab, setActiveTab] = useState('conversations')
  
  if (collapsed) {
    return (
      <div style={{
        padding: '0.75rem',
        background: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e2e8f0',
        cursor: 'pointer'
      }}
      onClick={onToggleCollapse}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🤖</span>
            <span style={{ fontWeight: '600', color: '#0f172a' }}>Agent Intelligence</span>
          </div>
          <AgentStatusBadge agents={agents} isObserving={isObserving} />
        </div>
      </div>
    )
  }
  
  return (
    <div style={{
      background: 'white',
      borderRadius: '0.75rem',
      border: '1px solid #e2e8f0',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: '500px'
    }}>
      {/* Header */}
      <div style={{
        padding: '0.75rem 1rem',
        borderBottom: '1px solid #e2e8f0',
        background: '#f8fafc'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🤖</span>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#0f172a' }}>
              Agent Intelligence
            </h3>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AgentStatusBadge agents={agents} isObserving={isObserving} />
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '0.25rem'
                }}
              >
                −
              </button>
            )}
          </div>
        </div>
        
        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.25rem',
          background: '#e2e8f0',
          padding: '0.25rem',
          borderRadius: '0.5rem'
        }}>
          <TabButton
            active={activeTab === 'conversations'}
            onClick={() => setActiveTab('conversations')}
            icon="💬"
          >
            Conversations
          </TabButton>
          <TabButton
            active={activeTab === 'chat'}
            onClick={() => setActiveTab('chat')}
            icon="❓"
          >
            Ask Agents
          </TabButton>
        </div>
      </div>
      
      {/* Quick Stats */}
      <div style={{ padding: '0.75rem 1rem 0' }}>
        <QuickStats breakRoom={breakRoom} />
      </div>
      
      {/* Tab Content */}
      <div style={{ flex: 1, padding: '0 1rem 1rem', overflow: 'hidden' }}>
        {activeTab === 'conversations' ? (
          <BreakRoom
            breakRoom={breakRoom}
            agents={agents}
            onStartObservation={onStartObservation}
          />
        ) : (
          <AnalystChat
            breakRoom={breakRoom}
            agents={agents}
            onAskQuestion={onAskQuestion}
          />
        )}
      </div>
    </div>
  )
}

export default AgentPanel
