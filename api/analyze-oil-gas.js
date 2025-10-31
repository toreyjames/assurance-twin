import Papa from 'papaparse'
import dayjs from 'dayjs'
import crypto from 'node:crypto'

const parseCsv = (text) => Papa.parse(text || '', { header: true, skipEmptyLines: true }).data
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex')
const monthsAgo = (m) => dayjs().subtract(m, 'month')

// Oil & Gas Industry-Specific Canonizer
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'POST only' })
    }
    
    const body = req.body || {}
    const threshold = Number(body.thresholdMonths ?? 18)

    // Parse input data
    const eng = body.engineeringCsv ? parseCsv(body.engineeringCsv) : []
    const cmms = body.cmmsCsv ? parseCsv(body.cmmsCsv) : []
    const net = body.networkCsv ? parseCsv(body.networkCsv) : []
    const hist = body.historianCsv ? parseCsv(body.historianCsv) : []

    // Oil & Gas Process Units Model
    const refineryProcessUnits = {
      'Crude Distillation Unit (CDU)': {
        function: 'Primary crude oil separation',
        criticality: 'Critical',
        safetySystems: ['Fire Protection', 'Emergency Shutdown'],
        materialFlows: {
          inputs: ['Crude Oil'],
          outputs: ['Naphtha', 'Kerosene', 'Diesel', 'Residue']
        }
      },
      'Fluid Catalytic Cracking (FCC)': {
        function: 'Heavy oil conversion to lighter products',
        criticality: 'Critical',
        safetySystems: ['Catalyst Regeneration Safety', 'Emergency Shutdown'],
        materialFlows: {
          inputs: ['Heavy Gas Oil'],
          outputs: ['Gasoline', 'LPG', 'Coke']
        }
      },
      'Hydrocracking Unit (HCU)': {
        function: 'High-pressure hydrogenation',
        criticality: 'Critical',
        safetySystems: ['High Pressure Safety', 'Hydrogen Safety'],
        materialFlows: {
          inputs: ['Vacuum Gas Oil', 'Hydrogen'],
          outputs: ['Jet Fuel', 'Diesel']
        }
      },
      'Reformer Unit': {
        function: 'Naphtha reforming for high-octane gasoline',
        criticality: 'High',
        safetySystems: ['Catalyst Regeneration Safety'],
        materialFlows: {
          inputs: ['Naphtha'],
          outputs: ['High-Octane Gasoline', 'Hydrogen']
        }
      },
      'Alkylation Unit': {
        function: 'High-octane alkylate production',
        criticality: 'High',
        safetySystems: ['Acid Safety', 'Emergency Shutdown'],
        materialFlows: {
          inputs: ['Isobutane', 'Olefins'],
          outputs: ['Alkylate']
        }
      },
      'Coker Unit': {
        function: 'Heavy residue conversion',
        criticality: 'High',
        safetySystems: ['Coke Handling Safety'],
        materialFlows: {
          inputs: ['Residue'],
          outputs: ['Gasoline', 'Diesel', 'Petroleum Coke']
        }
      },
      'Hydrotreater': {
        function: 'Sulfur and nitrogen removal',
        criticality: 'Medium',
        safetySystems: ['Hydrogen Safety'],
        materialFlows: {
          inputs: ['Distillates', 'Hydrogen'],
          outputs: ['Clean Products']
        }
      },
      'Isomerization Unit': {
        function: 'Branched hydrocarbon production',
        criticality: 'Medium',
        safetySystems: ['Catalyst Safety'],
        materialFlows: {
          inputs: ['N-Pentane', 'N-Hexane'],
          outputs: ['Iso-Pentane', 'Iso-Hexane']
        }
      }
    }

    // Control System Hierarchy (OT Standards)
    const controlSystemHierarchy = {
      'Field_Level': {
        devices: ['Smart_Transmitter', 'Control_Valve', 'VFD', 'Tank_Gauging'],
        standards: ['ISA/IEC 62443-3-3', 'IEC 61511'],
        criticality: 'High'
      },
      'Control_Level': {
        devices: ['Field_PLC', 'DCS_Controller', 'Safety_PLC'],
        standards: ['ISA/IEC 62443-2-1', 'IEC 61511'],
        criticality: 'Critical'
      },
      'Supervisory_Level': {
        devices: ['HMI_Station', 'Historian_Server'],
        standards: ['ISA/IEC 62443-2-1', 'NIST CSF'],
        criticality: 'High'
      },
      'Safety_Level': {
        devices: ['Safety_System', 'Fire_Gas_System'],
        standards: ['IEC 61511', 'ISA/IEC 62443-3-3'],
        criticality: 'Critical'
      }
    }

    // Asset Criticality Assessment (Oil & Gas Specific)
    const assessAssetCriticality = (asset) => {
      let criticality = 'Low'
      let riskScore = 0
      
      // Process Safety Impact
      if (asset.unit && refineryProcessUnits[asset.unit]) {
        const unitCriticality = refineryProcessUnits[asset.unit].criticality
        if (unitCriticality === 'Critical') riskScore += 40
        else if (unitCriticality === 'High') riskScore += 30
        else if (unitCriticality === 'Medium') riskScore += 20
      }
      
      // Safety Instrumented Systems
      if (asset.instrument_type && asset.instrument_type.includes('Safety')) {
        riskScore += 30
      }
      
      // Control System Level
      if (asset.instrument_type) {
        Object.entries(controlSystemHierarchy).forEach(([level, config]) => {
          if (config.devices.includes(asset.instrument_type)) {
            if (config.criticality === 'Critical') riskScore += 25
            else if (config.criticality === 'High') riskScore += 15
          }
        })
      }
      
      // Network Visibility
      const hasNetwork = Array.isArray(asset.visibility_flags) && asset.visibility_flags.includes('NETWORK')
      if (!hasNetwork) riskScore += 20
      
      // Firmware Status
      if (asset.firmware_status === 'OUTDATED') riskScore += 15
      else if (asset.firmware_status === 'MISSING_ON_NETWORK') riskScore += 25
      
      // Determine final criticality
      if (riskScore >= 70) criticality = 'Critical'
      else if (riskScore >= 50) criticality = 'High'
      else if (riskScore >= 30) criticality = 'Medium'
      
      return { criticality, riskScore }
    }

    // ISA/IEC 62443 Security Level Assessment
    const assessSecurityLevel = (asset) => {
      let sl = 1 // Default SL-1
      
      if (asset.criticality === 'Critical') sl = 4
      else if (asset.criticality === 'High') sl = 3
      else if (asset.criticality === 'Medium') sl = 2
      
      // Adjust based on network visibility
      const hasNetwork = Array.isArray(asset.visibility_flags) && asset.visibility_flags.includes('NETWORK')
      if (!hasNetwork) sl = Math.max(1, sl - 1)
      
      return sl
    }

    // Canonical Asset Model
    const canonicalAssets = []
    const cutoff = monthsAgo(threshold)
    
    // Process engineering data as baseline
    for (const engAsset of eng) {
      const cmmsAsset = cmms.find(c => c.tag_id === engAsset.tag_id)
      const netAsset = cmmsAsset ? net.find(n => n.asset_id === cmmsAsset.asset_id) : null
      const histAsset = hist.find(h => h.tag_id === engAsset.tag_id)
      
      // Assess criticality and risk
      const { criticality, riskScore } = assessAssetCriticality(engAsset)
      const securityLevel = assessSecurityLevel(engAsset)
      
      // Determine control system level
      let controlLevel = 'Unknown'
      Object.entries(controlSystemHierarchy).forEach(([level, config]) => {
        if (config.devices.includes(engAsset.instrument_type)) {
          controlLevel = level
        }
      })
      
      // Safety Instrumented System assessment
      const isSIS = engAsset.instrument_type && (
        engAsset.instrument_type.includes('Safety') || 
        engAsset.instrument_type.includes('SIS') ||
        controlLevel === 'Safety_Level'
      )
      
      // Process safety assessment
      const processUnit = refineryProcessUnits[engAsset.unit]
      const isProcessCritical = processUnit && processUnit.criticality === 'Critical'
      
      canonicalAssets.push({
        canon_id: `OG_${crypto.createHash('md5').update(engAsset.tag_id).digest('hex').substring(0,8)}`,
        tag_id: engAsset.tag_id,
        asset_id: cmmsAsset?.asset_id || `ENG_${engAsset.tag_id}`,
        unit: engAsset.unit,
        plant: engAsset.plant,
        instrument_type: engAsset.instrument_type,
        control_level: controlLevel,
        criticality: criticality,
        risk_score: riskScore,
        security_level: securityLevel,
        is_sis: isSIS,
        is_process_critical: isProcessCritical,
        firmware_status: cmmsAsset?.last_patch ? 
          (dayjs(cmmsAsset.last_patch).isAfter(cutoff) ? 'CURRENT' : 'OUTDATED') : 'UNKNOWN',
        network_status: netAsset ? 'ON_NETWORK' : 'OFF_NETWORK',
        ip_address: netAsset?.ip || null,
        last_seen: netAsset?.last_seen || null,
        uptime_pct: histAsset?.uptime_pct_30d || null,
        alarm_count: histAsset?.alarm_count_30d || 0,
        visibility_flags: [
          engAsset.tag_id ? 'ENGINEERING' : null,
          cmmsAsset ? 'CMMS' : null,
          netAsset ? 'NETWORK' : null,
          histAsset ? 'HISTORIAN' : null
        ].filter(Boolean),
        process_function: processUnit?.function || 'Unknown',
        safety_systems: processUnit?.safetySystems || [],
        material_flows: processUnit?.materialFlows || null
      })
    }

    // Calculate Oil & Gas specific KPIs
    const totalAssets = canonicalAssets.length
    const criticalAssets = canonicalAssets.filter(a => a.criticality === 'Critical').length
    const sisAssets = canonicalAssets.filter(a => a.is_sis).length
    const processCriticalAssets = canonicalAssets.filter(a => a.is_process_critical).length
    const onNetworkAssets = canonicalAssets.filter(a => a.network_status === 'ON_NETWORK').length
    const outdatedAssets = canonicalAssets.filter(a => a.firmware_status === 'OUTDATED').length
    
    // Security Level distribution
    const slDistribution = {
      'SL-1': canonicalAssets.filter(a => a.security_level === 1).length,
      'SL-2': canonicalAssets.filter(a => a.security_level === 2).length,
      'SL-3': canonicalAssets.filter(a => a.security_level === 3).length,
      'SL-4': canonicalAssets.filter(a => a.security_level === 4).length
    }
    
    // Control Level distribution
    const controlLevelDistribution = canonicalAssets.reduce((acc, asset) => {
      acc[asset.control_level] = (acc[asset.control_level] || 0) + 1
      return acc
    }, {})
    
    // Process Unit distribution
    const processUnitDistribution = canonicalAssets.reduce((acc, asset) => {
      acc[asset.unit] = (acc[asset.unit] || 0) + 1
      return acc
    }, {})

    // Oil & Gas Performance Metrics
    const kpis = {
      total_assets: totalAssets,
      critical_assets: criticalAssets,
      sis_assets: sisAssets,
      process_critical_assets: processCriticalAssets,
      network_coverage: Math.round((onNetworkAssets / totalAssets) * 100),
      outdated_assets: outdatedAssets,
      security_level_4: slDistribution['SL-4'],
      security_level_3: slDistribution['SL-3'],
      security_level_2: slDistribution['SL-2'],
      security_level_1: slDistribution['SL-1'],
      field_level_assets: controlLevelDistribution['Field_Level'] || 0,
      control_level_assets: controlLevelDistribution['Control_Level'] || 0,
      supervisory_level_assets: controlLevelDistribution['Supervisory_Level'] || 0,
      safety_level_assets: controlLevelDistribution['Safety_Level'] || 0
    }

    // Generate evidence hash
    const evidenceData = {
      timestamp: dayjs().toISOString(),
      totalAssets,
      criticalAssets,
      sisAssets,
      processUnitDistribution,
      controlLevelDistribution,
      slDistribution
    }
    const evidenceHash = sha256(JSON.stringify(evidenceData))

    return res.status(200).json({
      success: true,
      industry: 'Oil & Gas',
      refinery: canonicalAssets[0]?.plant || 'Unknown',
      kpis,
      assets: canonicalAssets,
      processUnits: refineryProcessUnits,
      controlHierarchy: controlSystemHierarchy,
      evidenceHash,
      timestamp: dayjs().toISOString()
    })

  } catch (error) {
    console.error('Oil & Gas Canonizer Error:', error)
    return res.status(500).json({ 
      error: 'Oil & Gas Canonizer failed', 
      detail: error.message 
    })
  }
}
