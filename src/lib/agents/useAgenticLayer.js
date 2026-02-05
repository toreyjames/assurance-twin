/**
 * useAgenticLayer Hook
 * React hook for integrating the agentic layer into components
 * 
 * Provides easy access to:
 * - Break room
 * - Plant agents
 * - Coordinator
 * - MCP server
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPlantAgent, createAgenticLayer } from './index.js'
import { BreakRoom } from './break-room.js'
import { CoordinatorAgent } from './coordinator.js'
import { AgentMcpServer } from './mcp-server.js'
import { AgentRole } from './types.js'
import { SecurityAgent } from './specialized/security-agent.js'
import { LifecycleAgent } from './specialized/lifecycle-agent.js'
import { GapAgent } from './specialized/gap-agent.js'
import { RiskAgent } from './specialized/risk-agent.js'
import { DependencyAgent } from './specialized/dependency-agent.js'

/**
 * Hook to create and manage the agentic layer
 */
export function useAgenticLayer({
  plants = [],
  enabled = true,
  persistenceKey = 'ot-assurance-agents',
  llmClient = null
} = {}) {
  const [breakRoom, setBreakRoom] = useState(null)
  const [coordinator, setCoordinator] = useState(null)
  const [plantAgents, setPlantAgents] = useState([])
  const [mcpServer, setMcpServer] = useState(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isObserving, setIsObserving] = useState(false)
  const [lastObservation, setLastObservation] = useState(null)
  
  const initRef = useRef(false)
  
  // Initialize the agentic layer
  const initialize = useCallback(async () => {
    if (!enabled || initRef.current) return
    initRef.current = true
    
    try {
      console.log('[AgenticLayer] Initializing...')
      
      // Load or create break room
      let br = BreakRoom.loadFromStorage(persistenceKey)
      if (!br) {
        br = new BreakRoom({ name: 'OT Assurance Break Room' })
      }
      setBreakRoom(br)
      
      // Create coordinator
      const coord = new CoordinatorAgent()
      await coord.initialize({ breakRoom: br, llmClient })
      setCoordinator(coord)
      
      // Create MCP server
      const mcp = new AgentMcpServer()
      mcp.initialize({ breakRoom: br, plantAgents: [], coordinator: coord })
      setMcpServer(mcp)
      
      setIsInitialized(true)
      console.log('[AgenticLayer] Initialized successfully')
    } catch (error) {
      console.error('[AgenticLayer] Initialization failed:', error)
      initRef.current = false
    }
  }, [enabled, persistenceKey, llmClient])
  
  // Add a plant agent
  const addPlantAgent = useCallback(async ({
    plant,
    plantCode,
    industry,
    context = {}
  }) => {
    if (!breakRoom || !coordinator) {
      console.warn('[AgenticLayer] Not initialized, cannot add plant agent')
      return null
    }
    
    // Check if already exists
    const existing = plantAgents.find(a => a.plant === plant || a.plantCode === plantCode)
    if (existing) {
      // Update context instead
      existing.updateContext(context)
      console.log(`[AgenticLayer] Updated context for ${plant}`)
      return existing
    }
    
    try {
      const agent = createPlantAgent({ plant, plantCode, industry })
      await agent.initialize({
        breakRoom,
        context,
        llmClient
      })
      
      coordinator.registerPlantAgent(agent)
      mcpServer?.registerPlantAgent(agent)
      
      setPlantAgents(prev => [...prev, agent])
      console.log(`[AgenticLayer] Added plant agent: ${plant}`)
      
      return agent
    } catch (error) {
      console.error(`[AgenticLayer] Failed to add plant agent ${plant}:`, error)
      return null
    }
  }, [breakRoom, coordinator, plantAgents, mcpServer, llmClient])
  
  // Update context for all plant agents
  const updatePlantContext = useCallback((plantCode, context) => {
    const agent = plantAgents.find(a => a.plantCode === plantCode || a.plant === plantCode)
    if (agent) {
      agent.updateContext(context)
      return true
    }
    return false
  }, [plantAgents])
  
  // Start observation round
  const observe = useCallback(async () => {
    if (!coordinator || isObserving) return null
    
    setIsObserving(true)
    try {
      const result = await coordinator.startObservationRound()
      setLastObservation(Date.now())
      
      // Save to storage
      breakRoom?.saveToStorage(persistenceKey)
      
      return result
    } finally {
      setIsObserving(false)
    }
  }, [coordinator, breakRoom, persistenceKey, isObserving])
  
  // Get summary
  const getSummary = useCallback(async (timeRange = 'day') => {
    if (!coordinator) return null
    return coordinator.generateExecutiveSummary({ timeRange })
  }, [coordinator])
  
  // Ask question
  const askQuestion = useCallback(async (question, options = {}) => {
    if (!breakRoom) return null
    return breakRoom.submitQuestion(question, options)
  }, [breakRoom])
  
  // Get plant agent
  const getPlantAgent = useCallback((plantCode) => {
    return plantAgents.find(a => 
      a.plantCode === plantCode || a.plant === plantCode
    )
  }, [plantAgents])
  
  // Save state
  const save = useCallback(() => {
    breakRoom?.saveToStorage(persistenceKey)
  }, [breakRoom, persistenceKey])
  
  // Clear all
  const clear = useCallback(() => {
    breakRoom?.clear()
    localStorage.removeItem(persistenceKey)
    setPlantAgents([])
    setLastObservation(null)
  }, [breakRoom, persistenceKey])
  
  // Auto-initialize on mount
  useEffect(() => {
    if (enabled && !isInitialized) {
      initialize()
    }
  }, [enabled, isInitialized, initialize])
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Save state on unmount
      breakRoom?.saveToStorage(persistenceKey)
    }
  }, [breakRoom, persistenceKey])
  
  return {
    // State
    isInitialized,
    isObserving,
    lastObservation,
    
    // Objects
    breakRoom,
    coordinator,
    plantAgents,
    mcpServer,
    
    // Methods
    initialize,
    addPlantAgent,
    updatePlantContext,
    observe,
    getSummary,
    askQuestion,
    getPlantAgent,
    save,
    clear
  }
}

/**
 * Hook to create plant agents from analysis results
 * Automatically creates agents for each plant found in the data
 */
export function useAgentsFromResults(agenticLayer, result, industry) {
  const [initialized, setInitialized] = useState(false)
  
  useEffect(() => {
    if (!agenticLayer?.isInitialized || !result || initialized) return
    
    const initializeAgents = async () => {
      const contextAnalysis = result.contextAnalysis
      if (!contextAnalysis) return
      
      // Extract unique plants from assets
      const plants = new Set()
      for (const asset of contextAnalysis.assets || []) {
        const plant = asset.plant || asset.plant_code
        if (plant) plants.add(plant)
      }
      
      // Group assets by plant
      const assetsByPlant = {}
      for (const asset of contextAnalysis.assets || []) {
        const plant = asset.plant || asset.plant_code || 'Unknown'
        if (!assetsByPlant[plant]) {
          assetsByPlant[plant] = []
        }
        assetsByPlant[plant].push(asset)
      }
      
      // Create agent for each plant
      for (const plant of plants) {
        const plantAssets = assetsByPlant[plant] || []
        
        // Build plant-specific context
        const plantContext = {
          assets: plantAssets,
          industry: industry || contextAnalysis.industry,
          matchResults: result.matchResults ? {
            matched: result.matchResults?.matched?.filter(m => 
              m.engineering?.plant === plant || m.discovered?.plant === plant
            ) || [],
            blindSpots: (result.blindSpots || []).filter(b => b.plant === plant),
            orphans: (result.orphans || []).filter(o => o.plant === plant)
          } : null,
          gapAnalysis: contextAnalysis.gapAnalysis ? {
            ...contextAnalysis.gapAnalysis,
            gaps: (contextAnalysis.gapAnalysis.gaps || []).filter(g => 
              g.subject?.plant === plant || g.unit?.includes(plant)
            )
          } : null,
          riskAnalysis: contextAnalysis.riskAnalysis ? {
            ...contextAnalysis.riskAnalysis,
            assetRisks: (contextAnalysis.riskAnalysis.assetRisks || []).filter(ar =>
              ar.asset?.plant === plant
            )
          } : null
        }
        
        await agenticLayer.addPlantAgent({
          plant,
          plantCode: plant.toLowerCase().replace(/\s+/g, '-'),
          industry: industry || contextAnalysis.industry,
          context: plantContext
        })
      }
      
      setInitialized(true)
      
      // Trigger initial observation
      await agenticLayer.observe()
    }
    
    initializeAgents()
  }, [agenticLayer, result, industry, initialized])
  
  return initialized
}

export default useAgenticLayer
