/**
 * ANALYST CHAT COMPONENT
 * Interface for humans to interact with agents
 * 
 * Features:
 * - Ask questions to specific agents or all agents
 * - View aggregated responses
 * - Submit feedback/corrections
 * - Approve/reject suggestions
 */

import React, { useState, useRef, useEffect } from 'react'

// =============================================================================
// CHAT MESSAGE COMPONENT
// =============================================================================

function ChatMessage({ message, isUser }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: '0.75rem'
    }}>
      <div style={{
        maxWidth: '80%',
        padding: '0.75rem 1rem',
        borderRadius: isUser ? '1rem 1rem 0.25rem 1rem' : '1rem 1rem 1rem 0.25rem',
        background: isUser ? '#3b82f6' : '#f1f5f9',
        color: isUser ? 'white' : '#334155',
        fontSize: '0.9rem',
        lineHeight: '1.4'
      }}>
        {!isUser && message.agentName && (
          <div style={{
            fontSize: '0.75rem',
            fontWeight: '600',
            marginBottom: '0.25rem',
            color: '#64748b'
          }}>
            {message.agentName} {message.plant && `(${message.plant})`}
          </div>
        )}
        <div style={{ whiteSpace: 'pre-wrap' }}>
          {message.content}
        </div>
        <div style={{
          fontSize: '0.7rem',
          marginTop: '0.375rem',
          opacity: 0.7,
          textAlign: isUser ? 'right' : 'left'
        }}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// AGENT RESPONSE CARD
// =============================================================================

function AgentResponseCard({ response, onFeedback }) {
  const [expanded, setExpanded] = useState(false)
  
  return (
    <div style={{
      padding: '0.75rem',
      background: '#f8fafc',
      borderRadius: '0.5rem',
      border: '1px solid #e2e8f0',
      marginBottom: '0.5rem'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }}>
        <div>
          <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#0f172a' }}>
            {response.plant || 'Unknown Plant'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {response.agentId}
          </div>
        </div>
        
        {/* Feedback buttons */}
        {onFeedback && (
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button
              onClick={() => onFeedback(response, 'helpful')}
              style={{
                padding: '0.25rem 0.5rem',
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontSize: '0.75rem'
              }}
              title="Mark as helpful"
            >
              👍
            </button>
            <button
              onClick={() => onFeedback(response, 'not_helpful')}
              style={{
                padding: '0.25rem 0.5rem',
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontSize: '0.75rem'
              }}
              title="Mark as not helpful"
            >
              👎
            </button>
          </div>
        )}
      </div>
      
      <div style={{
        marginTop: '0.5rem',
        fontSize: '0.85rem',
        lineHeight: '1.4',
        color: '#334155',
        whiteSpace: 'pre-wrap'
      }}>
        {expanded ? response.answer : (
          response.answer?.length > 200 
            ? response.answer.slice(0, 200) + '...'
            : response.answer
        )}
      </div>
      
      {response.answer?.length > 200 && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            marginTop: '0.5rem',
            padding: 0,
            background: 'none',
            border: 'none',
            color: '#3b82f6',
            fontSize: '0.8rem',
            cursor: 'pointer'
          }}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
      
      {response.error && (
        <div style={{
          marginTop: '0.5rem',
          padding: '0.5rem',
          background: '#fef2f2',
          borderRadius: '0.25rem',
          fontSize: '0.8rem',
          color: '#dc2626'
        }}>
          Error: {response.error}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// QUICK QUESTIONS
// =============================================================================

function QuickQuestions({ onSelect }) {
  const questions = [
    { label: 'Overall health?', question: 'What is the overall health status across all plants?' },
    { label: 'Critical issues?', question: 'What are the most critical issues that need immediate attention?' },
    { label: 'Top weaknesses?', question: 'What are the top weaknesses identified?' },
    { label: 'What\'s working well?', question: 'What areas are performing well and should be maintained?' },
    { label: 'EOL concerns?', question: 'Are there any equipment lifecycle or end-of-life concerns?' },
    { label: 'Security posture?', question: 'What is the current security posture and vulnerability status?' }
  ]
  
  return (
    <div style={{
      padding: '0.75rem',
      background: '#f8fafc',
      borderRadius: '0.5rem',
      marginBottom: '0.75rem'
    }}>
      <div style={{
        fontSize: '0.75rem',
        fontWeight: '600',
        color: '#64748b',
        marginBottom: '0.5rem'
      }}>
        Quick Questions
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
        {questions.map((q, i) => (
          <button
            key={i}
            onClick={() => onSelect(q.question)}
            style={{
              padding: '0.375rem 0.75rem',
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '1rem',
              fontSize: '0.8rem',
              cursor: 'pointer',
              color: '#475569',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#3b82f6'
              e.target.style.color = 'white'
              e.target.style.borderColor = '#3b82f6'
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'white'
              e.target.style.color = '#475569'
              e.target.style.borderColor = '#e2e8f0'
            }}
          >
            {q.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// TARGET SELECTOR
// =============================================================================

function TargetSelector({ value, onChange, agents }) {
  const plants = [...new Set(agents.map(a => a.plant).filter(Boolean))]
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      marginBottom: '0.5rem'
    }}>
      <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Ask:</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '0.375rem 0.75rem',
          borderRadius: '0.375rem',
          border: '1px solid #e2e8f0',
          fontSize: '0.8rem',
          background: 'white'
        }}
      >
        <option value="all">All Agents</option>
        <optgroup label="By Plant">
          {plants.map(p => (
            <option key={p} value={`plant:${p}`}>{p}</option>
          ))}
        </optgroup>
        <optgroup label="By Agent">
          {agents.map(a => (
            <option key={a.id} value={`agent:${a.id}`}>{a.name}</option>
          ))}
        </optgroup>
      </select>
    </div>
  )
}

// =============================================================================
// MAIN ANALYST CHAT COMPONENT
// =============================================================================

export function AnalystChat({ breakRoom, agents = [], onAskQuestion }) {
  const [input, setInput] = useState('')
  const [target, setTarget] = useState('all')
  const [chatHistory, setChatHistory] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const chatEndRef = useRef(null)
  
  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])
  
  // Submit question
  const handleSubmit = async (e) => {
    e?.preventDefault()
    
    const question = input.trim()
    if (!question || isLoading) return
    
    // Add user message to chat
    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: question,
      timestamp: Date.now()
    }
    setChatHistory(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    
    try {
      let responses
      
      if (onAskQuestion) {
        // Use provided callback
        const targetOptions = {}
        if (target.startsWith('plant:')) {
          targetOptions.targetPlants = [target.replace('plant:', '')]
        } else if (target.startsWith('agent:')) {
          targetOptions.targetAgent = target.replace('agent:', '')
        }
        
        const result = await onAskQuestion(question, targetOptions)
        responses = result.responses
      } else if (breakRoom) {
        // Use break room directly
        const result = await breakRoom.submitQuestion(question, {
          targetAgent: target === 'all' ? 'all' : target.replace(/^(plant|agent):/, '')
        })
        responses = result.responses
      }
      
      // Add responses to chat
      if (responses?.length > 0) {
        const responseMessage = {
          id: `${Date.now()}-response`,
          type: 'response',
          responses,
          timestamp: Date.now()
        }
        setChatHistory(prev => [...prev, responseMessage])
      } else {
        const noResponse = {
          id: `${Date.now()}-no-response`,
          type: 'response',
          content: 'No agents responded to your question.',
          timestamp: Date.now()
        }
        setChatHistory(prev => [...prev, noResponse])
      }
    } catch (error) {
      console.error('Failed to ask question:', error)
      const errorMessage = {
        id: `${Date.now()}-error`,
        type: 'error',
        content: `Error: ${error.message}`,
        timestamp: Date.now()
      }
      setChatHistory(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }
  
  // Handle quick question selection
  const handleQuickQuestion = (question) => {
    setInput(question)
  }
  
  // Handle feedback on responses
  const handleFeedback = (response, feedback) => {
    console.log('Feedback:', { response, feedback })
    // TODO: Store feedback for agent improvement
  }
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: '400px',
      background: 'white',
      borderRadius: '0.75rem',
      border: '1px solid #e2e8f0',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '0.75rem 1rem',
        borderBottom: '1px solid #e2e8f0',
        background: '#f8fafc'
      }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#0f172a' }}>
          💬 Ask the Agents
        </h3>
        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
          Query plant agents for insights and information
        </p>
      </div>
      
      {/* Quick questions */}
      <div style={{ padding: '0.75rem 1rem 0' }}>
        <QuickQuestions onSelect={handleQuickQuestion} />
      </div>
      
      {/* Chat history */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {chatHistory.length === 0 ? (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            fontSize: '0.9rem'
          }}>
            Ask a question to get started
          </div>
        ) : (
          chatHistory.map(item => {
            if (item.type === 'user') {
              return (
                <ChatMessage
                  key={item.id}
                  message={item}
                  isUser={true}
                />
              )
            }
            
            if (item.type === 'response' && item.responses) {
              return (
                <div key={item.id} style={{ marginBottom: '0.75rem' }}>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    marginBottom: '0.5rem'
                  }}>
                    {item.responses.length} agent{item.responses.length !== 1 ? 's' : ''} responded:
                  </div>
                  {item.responses.map((response, i) => (
                    <AgentResponseCard
                      key={i}
                      response={response}
                      onFeedback={handleFeedback}
                    />
                  ))}
                </div>
              )
            }
            
            if (item.type === 'error') {
              return (
                <div
                  key={item.id}
                  style={{
                    padding: '0.75rem',
                    background: '#fef2f2',
                    borderRadius: '0.5rem',
                    color: '#dc2626',
                    fontSize: '0.85rem',
                    marginBottom: '0.75rem'
                  }}
                >
                  {item.content}
                </div>
              )
            }
            
            return (
              <ChatMessage
                key={item.id}
                message={item}
                isUser={false}
              />
            )
          })
        )}
        
        {isLoading && (
          <div style={{
            padding: '0.75rem',
            background: '#f1f5f9',
            borderRadius: '0.5rem',
            color: '#64748b',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ animation: 'pulse 1s infinite' }}>⏳</span>
            Agents are thinking...
          </div>
        )}
        
        <div ref={chatEndRef} />
      </div>
      
      {/* Input area */}
      <div style={{
        padding: '0.75rem 1rem',
        borderTop: '1px solid #e2e8f0',
        background: '#f8fafc'
      }}>
        <TargetSelector
          value={target}
          onChange={setTarget}
          agents={agents}
        />
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about plant operations..."
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '0.625rem 0.875rem',
              borderRadius: '0.5rem',
              border: '1px solid #e2e8f0',
              fontSize: '0.9rem',
              outline: 'none',
              transition: 'border-color 0.15s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            style={{
              padding: '0.625rem 1.25rem',
              background: !input.trim() || isLoading ? '#94a3b8' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: '500',
              fontSize: '0.9rem',
              cursor: !input.trim() || isLoading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s ease'
            }}
          >
            {isLoading ? '...' : 'Ask'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default AnalystChat
