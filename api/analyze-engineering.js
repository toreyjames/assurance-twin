/**
 * ENGINEERING ANALYSIS API
 * LLM-powered assessment of OT asset inventory completeness
 * 
 * This endpoint calls Claude to provide engineering expertise on:
 * - Baseline completeness assessment
 * - Instrumentation gap analysis
 * - Data quality observations
 * - Risk indicators and recommendations
 */

// Note: For Vercel deployment, we use the edge-compatible fetch approach
// For local development, you can use the @anthropic-ai/sdk package

export default async function handler(req, res) {
  // CORS headers for local development
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST method required' })
  }
  
  const { prompt, summary } = req.body
  
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' })
  }
  
  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY
  
  if (!apiKey) {
    // Return a helpful message if not configured
    console.warn('[ENGINEERING-ANALYSIS] ANTHROPIC_API_KEY not configured')
    return res.status(200).json({
      analysis: generateFallbackResponse(summary),
      model: 'fallback-no-api-key',
      timestamp: new Date().toISOString(),
      note: 'API key not configured. Using template-based fallback analysis.'
    })
  }
  
  try {
    console.log('[ENGINEERING-ANALYSIS] Calling Claude API...')
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2500,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    })
    
    if (!response.ok) {
      const errorData = await response.text()
      console.error('[ENGINEERING-ANALYSIS] API error:', response.status, errorData)
      throw new Error(`Claude API returned ${response.status}: ${errorData}`)
    }
    
    const data = await response.json()
    
    console.log('[ENGINEERING-ANALYSIS] Analysis complete, model:', data.model)
    
    return res.status(200).json({
      analysis: data.content[0].text,
      model: data.model,
      timestamp: new Date().toISOString(),
      usage: {
        inputTokens: data.usage?.input_tokens,
        outputTokens: data.usage?.output_tokens
      }
    })
    
  } catch (error) {
    console.error('[ENGINEERING-ANALYSIS] Error:', error.message)
    
    // Return fallback analysis on error
    return res.status(200).json({
      analysis: generateFallbackResponse(summary),
      model: 'fallback-error',
      timestamp: new Date().toISOString(),
      error: error.message,
      note: 'Using template-based fallback due to API error.'
    })
  }
}

/**
 * Generate fallback response when API is unavailable
 */
function generateFallbackResponse(summary) {
  const industry = summary?.industry || 'industrial'
  const totalAssets = summary?.totalAssets || 0
  const matchRate = summary?.matchRate || 0
  
  return `## Engineering Assessment

*This is an automated assessment. For detailed AI-powered analysis, configure the ANTHROPIC_API_KEY environment variable.*

### Overview

Your ${industry} facility data shows **${totalAssets.toLocaleString()} assets** with a **${matchRate}% match rate** between engineering baseline and network discovery.

### Key Observations

${matchRate >= 80 
  ? '✅ **Good coverage** - Your match rate indicates solid alignment between documented and discovered assets.'
  : matchRate >= 60
  ? '⚠️ **Moderate coverage** - Some assets in your baseline were not found on the network. This could indicate offline systems, isolated networks, or documentation issues.'
  : '🚨 **Low coverage** - Significant gap between documentation and network presence. Recommend investigating data sources and expanding discovery scope.'
}

### Recommendations

1. **Review blind spots** - Assets documented but not discovered may be offline, on isolated networks, or incorrectly recorded.

2. **Investigate orphans** - Devices found on the network but not in engineering records need to be assessed and documented.

3. **Validate critical systems** - Ensure all Tier 1 control systems (PLCs, DCS, HMI, SCADA) are accounted for.

4. **Consider compliance** - Review against applicable standards (ISA/IEC 62443, NIST CSF) for completeness requirements.

---
*To enable full AI-powered engineering analysis, set the ANTHROPIC_API_KEY in your environment variables.*
*Generated: ${new Date().toISOString()}*
`
}
