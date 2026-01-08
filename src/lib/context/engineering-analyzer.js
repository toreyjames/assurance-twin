/**
 * ENGINEERING ANALYZER
 * LLM-powered sanity checking and gap analysis for OT asset data
 * 
 * Based on AIGNE Framework principles:
 * "Context Evaluator validates context under explicit architectural design constraints"
 * 
 * This module provides engineering intelligence by comparing actual asset data
 * against industry norms and process engineering best practices.
 */

import { ProvenanceTracker } from './provenance.js'

/**
 * Industry context for prompt construction
 */
const INDUSTRY_CONTEXT = {
  'oil-gas': {
    name: 'Oil & Gas Refinery',
    processDescription: 'petroleum refining with distillation, cracking, and treating processes',
    typicalUnits: ['Crude Distillation Unit (CDU)', 'Fluid Catalytic Cracker (FCC)', 'Hydrocracker', 'Reformer', 'Coker', 'Hydrotreater', 'Tank Farm', 'Utilities'],
    criticalSystems: ['Safety Instrumented Systems (SIS)', 'Emergency Shutdown (ESD)', 'Fire & Gas Detection', 'Burner Management Systems (BMS)'],
    standards: ['ISA/IEC 62443', 'IEC 61511 (SIS)', 'API 1164', 'NIST CSF', 'TSA Pipeline Security'],
    typicalInstrumentation: {
      CDU: { PLCs: '8-15', DCS: '5-12', transmitters: '120-200', controlValves: '60-100' },
      FCC: { PLCs: '12-25', DCS: '10-20', transmitters: '180-350', safetyControllers: '3-8' },
      utilities: { PLCs: '8-18', boilerControls: '5-10', compressorControls: '3-8' }
    }
  },
  'pharma': {
    name: 'Pharmaceutical Manufacturing',
    processDescription: 'batch processing for API synthesis, formulation, and packaging with strict GMP requirements',
    typicalUnits: ['API Manufacturing', 'Formulation', 'Granulation', 'Tablet Press', 'Coating', 'Packaging', 'Clean Utilities', 'QC Laboratory'],
    criticalSystems: ['Environmental Monitoring', 'Clean-in-Place (CIP)', 'Sterilization-in-Place (SIP)', 'Building Management (BMS)'],
    standards: ['FDA 21 CFR Part 11', 'GAMP 5', 'EU Annex 11', 'ICH Q9', 'ISO 27001'],
    typicalInstrumentation: {
      API: { batchControllers: '5-12', PLCs: '10-20', environmentalMonitors: '20-50' },
      formulation: { batchControllers: '8-18', temperatureControllers: '15-40' },
      packaging: { serializationSystems: '3-10', visionSystems: '5-20' }
    }
  },
  'utilities': {
    name: 'Power Generation & Utilities',
    processDescription: 'electricity generation and distribution with turbines, generators, and grid interconnection',
    typicalUnits: ['Turbine Hall', 'Generator', 'Transformer Yard', 'Switchyard', 'Cooling Tower', 'Fuel Handling', 'Emissions Control', 'Control Center'],
    criticalSystems: ['Protection Relays', 'Automatic Generation Control (AGC)', 'SCADA/EMS', 'Cybersecurity Monitoring'],
    standards: ['NERC CIP', 'IEC 62351', 'IEEE 1686', 'NIST CSF'],
    typicalInstrumentation: {
      turbine: { controllers: '10-20', protectionRelays: '15-30', vibrationMonitors: '8-15' },
      generator: { excitationControllers: '2-5', protectionRelays: '20-40' },
      switchyard: { IEDs: '30-80', protectionRelays: '50-150' }
    }
  }
}

/**
 * Build a comprehensive summary of the asset data for LLM analysis
 */
export function buildDataSummary(result, industry) {
  const assets = result?.assets || []
  const blindSpots = result?.blindSpots || []
  const orphans = result?.orphans || []
  
  // Group assets by unit
  const byUnit = {}
  assets.forEach(a => {
    const unit = a.unit || 'Unassigned'
    if (!byUnit[unit]) {
      byUnit[unit] = { total: 0, tier1: 0, tier2: 0, tier3: 0, deviceTypes: {} }
    }
    byUnit[unit].total++
    if (a.classification?.tier === 1) byUnit[unit].tier1++
    if (a.classification?.tier === 2) byUnit[unit].tier2++
    if (a.classification?.tier === 3) byUnit[unit].tier3++
    
    const dtype = a.device_type || 'Unknown'
    byUnit[unit].deviceTypes[dtype] = (byUnit[unit].deviceTypes[dtype] || 0) + 1
  })
  
  // Group by device type overall
  const byDeviceType = {}
  assets.forEach(a => {
    const dtype = a.device_type || 'Unknown'
    byDeviceType[dtype] = (byDeviceType[dtype] || 0) + 1
  })
  
  // Identify plants/sites
  const plants = [...new Set(assets.map(a => a.plant || a.plant_code || a.facility).filter(Boolean))]
  
  // Blind spots by criticality
  const criticalBlindSpots = blindSpots.filter(b => {
    const dtype = (b.device_type || '').toLowerCase()
    return ['plc', 'dcs', 'controller', 'safety', 'scada', 'hmi'].some(kw => dtype.includes(kw))
  })
  
  // Orphans by criticality  
  const criticalOrphans = orphans.filter(o => {
    const dtype = (o.device_type || '').toLowerCase()
    return ['plc', 'dcs', 'controller', 'safety', 'scada', 'hmi'].some(kw => dtype.includes(kw))
  })
  
  return {
    overview: {
      totalAssets: assets.length,
      totalBlindSpots: blindSpots.length,
      totalOrphans: orphans.length,
      matchRate: assets.length > 0 ? Math.round((assets.length / (assets.length + blindSpots.length)) * 100) : 0,
      plantCount: plants.length,
      plants: plants.slice(0, 5) // First 5
    },
    byUnit,
    byDeviceType,
    criticalAssets: {
      tier1Count: assets.filter(a => a.classification?.tier === 1).length,
      tier2Count: assets.filter(a => a.classification?.tier === 2).length,
      tier3Count: assets.filter(a => a.classification?.tier === 3).length
    },
    concerns: {
      criticalBlindSpots: criticalBlindSpots.length,
      criticalOrphans: criticalOrphans.length,
      blindSpotExamples: blindSpots.slice(0, 5).map(b => ({
        tag: b.tag_id,
        type: b.device_type,
        unit: b.unit
      })),
      orphanExamples: orphans.slice(0, 5).map(o => ({
        tag: o.tag_id || o.hostname,
        type: o.device_type,
        ip: o.ip_address
      }))
    },
    industry
  }
}

/**
 * Format the data summary for the LLM prompt
 */
function formatSummaryForPrompt(summary) {
  const { overview, byUnit, byDeviceType, criticalAssets, concerns } = summary
  
  let text = `## Asset Inventory Overview
- Total matched assets: ${overview.totalAssets.toLocaleString()}
- Blind spots (in engineering, not discovered): ${overview.totalBlindSpots.toLocaleString()}
- Orphans (discovered, not in engineering): ${overview.totalOrphans.toLocaleString()}
- Match rate: ${overview.matchRate}%
- Sites/Plants: ${overview.plantCount} (${overview.plants.join(', ') || 'not specified'})

## Security Classification
- Tier 1 (Critical Control Systems): ${criticalAssets.tier1Count.toLocaleString()}
- Tier 2 (Networkable Devices): ${criticalAssets.tier2Count.toLocaleString()}
- Tier 3 (Passive/Analog): ${criticalAssets.tier3Count.toLocaleString()}

## Assets by Process Unit
`
  
  Object.entries(byUnit).forEach(([unit, data]) => {
    text += `\n### ${unit}
- Total: ${data.total} assets (${data.tier1} critical, ${data.tier2} networkable, ${data.tier3} passive)
- Device types: ${Object.entries(data.deviceTypes).slice(0, 8).map(([t, c]) => `${t}: ${c}`).join(', ')}`
  })
  
  text += `\n\n## Top Device Types
`
  Object.entries(byDeviceType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([dtype, count]) => {
      text += `- ${dtype}: ${count}\n`
    })
  
  text += `\n## Data Quality Concerns
- Critical blind spots (documented but not found on network): ${concerns.criticalBlindSpots}
- Critical orphans (on network but not documented): ${concerns.criticalOrphans}
`
  
  if (concerns.blindSpotExamples.length > 0) {
    text += `\nBlind spot examples:\n`
    concerns.blindSpotExamples.forEach(b => {
      text += `  - ${b.tag || 'Unknown'} (${b.type || 'Unknown type'}) in ${b.unit || 'Unknown unit'}\n`
    })
  }
  
  if (concerns.orphanExamples.length > 0) {
    text += `\nOrphan examples:\n`
    concerns.orphanExamples.forEach(o => {
      text += `  - ${o.tag || 'Unknown'} (${o.type || 'Unknown type'}) at ${o.ip || 'Unknown IP'}\n`
    })
  }
  
  return text
}

/**
 * Build the complete prompt for engineering analysis
 */
export function buildAnalysisPrompt(summary, template = null) {
  const industryCtx = INDUSTRY_CONTEXT[summary.industry] || INDUSTRY_CONTEXT['oil-gas']
  
  const prompt = `You are a senior OT/ICS engineer conducting an asset inventory assessment for a ${industryCtx.name} facility. Your role is to provide expert analysis on data completeness, instrumentation gaps, and recommendations.

## Facility Context
- Industry: ${industryCtx.name}
- Process: ${industryCtx.processDescription}
- Typical process units: ${industryCtx.typicalUnits.join(', ')}
- Critical safety systems: ${industryCtx.criticalSystems.join(', ')}
- Applicable standards: ${industryCtx.standards.join(', ')}

## Industry Instrumentation Norms
${Object.entries(industryCtx.typicalInstrumentation).map(([unit, devices]) => 
  `- ${unit}: ${Object.entries(devices).map(([d, r]) => `${d} (${r})`).join(', ')}`
).join('\n')}

## Client Data Summary
${formatSummaryForPrompt(summary)}

---

Based on your expertise in ${industryCtx.name} process control and instrumentation, provide a structured assessment covering:

### 1. BASELINE COMPLETENESS ASSESSMENT
Evaluate whether this engineering baseline appears complete for a facility of this type and size. Consider:
- Are expected process units present?
- Do device counts align with industry norms?
- Are there obvious gaps in the control system architecture?

### 2. INSTRUMENTATION GAP ANALYSIS
Based on typical P&ID patterns and control loop requirements for ${industryCtx.name}:
- Which process units appear under-instrumented?
- What device types seem to be missing?
- Are safety systems adequately represented?

### 3. DATA QUALITY OBSERVATIONS
Analyze the blind spots and orphans:
- What do the ${summary.concerns.criticalBlindSpots} critical blind spots suggest?
- What do the ${summary.concerns.criticalOrphans} critical orphans indicate?
- Is the ${summary.overview.matchRate}% match rate acceptable for this industry?

### 4. RISK INDICATORS
Flag any patterns that suggest:
- Incomplete data collection
- Potential undocumented systems
- Areas requiring further investigation

### 5. RECOMMENDATIONS
Provide 3-5 specific, actionable recommendations for the client to improve their asset inventory completeness.

Format your response with clear section headers. Be specific and cite industry norms where relevant. If data is insufficient to make a determination, state what additional information would be needed.`

  return prompt
}

/**
 * Call the engineering analysis API
 */
export async function analyzeEngineering(result, industry, options = {}) {
  const summary = buildDataSummary(result, industry)
  const prompt = buildAnalysisPrompt(summary)
  
  // Track provenance
  const provenance = options.provenance || new ProvenanceTracker()
  provenance.record({
    type: 'ENGINEERING_ANALYSIS_REQUESTED',
    industry,
    assetCount: summary.overview.totalAssets,
    blindSpotCount: summary.overview.totalBlindSpots,
    orphanCount: summary.overview.totalOrphans
  })
  
  try {
    const response = await fetch('/api/analyze-engineering', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt,
        summary: {
          industry: summary.industry,
          totalAssets: summary.overview.totalAssets,
          matchRate: summary.overview.matchRate
        }
      })
    })
    
    if (!response.ok) {
      throw new Error(`Analysis API returned ${response.status}`)
    }
    
    const data = await response.json()
    
    provenance.record({
      type: 'ENGINEERING_ANALYSIS_COMPLETE',
      model: data.model,
      analysisLength: data.analysis?.length || 0
    })
    
    return {
      success: true,
      analysis: data.analysis,
      model: data.model,
      timestamp: data.timestamp,
      summary,
      provenance: provenance.events
    }
    
  } catch (error) {
    provenance.record({
      type: 'ENGINEERING_ANALYSIS_ERROR',
      error: error.message
    })
    
    return {
      success: false,
      error: error.message,
      summary,
      provenance: provenance.events
    }
  }
}

/**
 * Generate a fallback analysis when API is unavailable
 * Uses rule-based checks against templates
 */
export function generateFallbackAnalysis(result, industry, template) {
  const summary = buildDataSummary(result, industry)
  const industryCtx = INDUSTRY_CONTEXT[industry] || INDUSTRY_CONTEXT['oil-gas']
  
  let analysis = `## Engineering Assessment (Automated)

*Note: This is an automated assessment based on template comparisons. For detailed engineering analysis, ensure the analysis API is configured.*

### 1. BASELINE COMPLETENESS

**Facility Profile:**
- ${summary.overview.totalAssets.toLocaleString()} assets documented across ${summary.overview.plantCount} site(s)
- ${Object.keys(summary.byUnit).length} process units identified
- Match rate with discovery: ${summary.overview.matchRate}%

**Assessment:** `

  if (summary.overview.matchRate >= 80) {
    analysis += `✅ Good coverage - ${summary.overview.matchRate}% of engineering baseline validated by discovery.`
  } else if (summary.overview.matchRate >= 60) {
    analysis += `⚠️ Moderate coverage - ${summary.overview.matchRate}% match rate suggests some assets may be offline or not network-connected.`
  } else {
    analysis += `🚨 Low coverage - ${summary.overview.matchRate}% match rate indicates significant gaps between documentation and actual network presence.`
  }

  analysis += `

### 2. INSTRUMENTATION OVERVIEW

| Process Unit | Total Assets | Critical (Tier 1) | Networkable (Tier 2) |
|--------------|--------------|-------------------|---------------------|
`

  Object.entries(summary.byUnit).slice(0, 10).forEach(([unit, data]) => {
    analysis += `| ${unit} | ${data.total} | ${data.tier1} | ${data.tier2} |\n`
  })

  analysis += `
### 3. DATA QUALITY FLAGS

`

  if (summary.concerns.criticalBlindSpots > 0) {
    analysis += `⚠️ **${summary.concerns.criticalBlindSpots} critical assets** documented but not discovered on network. These may be:
- Offline or disconnected
- On isolated network segments not scanned
- Incorrectly documented

`
  }

  if (summary.concerns.criticalOrphans > 0) {
    analysis += `🚨 **${summary.concerns.criticalOrphans} critical devices** discovered but not in engineering baseline. These may be:
- Recently added systems not yet documented
- Undocumented test or development systems
- Potential unauthorized devices requiring investigation

`
  }

  analysis += `### 4. RECOMMENDATIONS

1. **Validate blind spots** - Investigate the ${summary.overview.totalBlindSpots} assets in engineering baseline that weren't discovered. Determine if they're offline, on separate networks, or documentation errors.

2. **Document orphans** - Review the ${summary.overview.totalOrphans} discovered devices not in baseline. Add legitimate devices to engineering documentation.

3. **Expand discovery scope** - If match rate is below 80%, consider running discovery tools on additional network segments.

4. **Review process unit coverage** - Ensure all ${industryCtx.typicalUnits.length} typical ${industryCtx.name} process units are represented.

---
*Assessment generated: ${new Date().toISOString()}*
*Industry template: ${industryCtx.name}*
*Standards reference: ${industryCtx.standards.slice(0, 3).join(', ')}*
`

  return {
    success: true,
    analysis,
    model: 'template-fallback',
    timestamp: new Date().toISOString(),
    summary,
    isFallback: true
  }
}
