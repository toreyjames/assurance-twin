/**
 * Industry Templates
 * Configuration-driven industry knowledge that can be "mounted" as context
 */

import oilGas from './oil-gas.json'
import pharma from './pharma.json'
import utilities from './utilities.json'

export const templates = {
  'oil-gas': oilGas,
  'pharma': pharma,
  'utilities': utilities
}

export const industries = [
  { id: 'oil-gas', name: 'Oil & Gas Refineries', icon: '⛽' },
  { id: 'pharma', name: 'Pharmaceutical Plants', icon: '💊' },
  { id: 'utilities', name: 'Power & Utilities', icon: '⚡' }
]

export function getTemplate(industryId) {
  return templates[industryId] || null
}

export function applyTemplate(asset, template) {
  if (!template) return asset
  
  const unitConfig = template.processUnits?.[asset.unit]
  
  return {
    ...asset,
    industryContext: {
      industry: template.name,
      standards: template.standards,
      governance: template.governance,
      unitCriticality: unitConfig?.criticality || 'Unknown',
      safetySystems: unitConfig?.safetySystems || [],
      compliance: unitConfig?.compliance || []
    }
  }
}

export default templates


