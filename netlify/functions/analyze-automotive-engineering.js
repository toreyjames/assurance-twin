import dayjs from 'dayjs'
import { createHash } from 'crypto'
import Papa from 'papaparse'

const parseCsv = (csvString) => {
  const { data, errors } = Papa.parse(csvString, { header: true, skipEmptyLines: true })
  if (errors.length) {
    console.error('CSV parsing errors:', errors)
    throw new Error('Failed to parse CSV data')
  }
  return data
}

// Automotive Engineering Canonizer - Step 1
// Combines multiple engineering data sources into a unified baseline
export const handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return resp(405, { error: 'POST only' })
    const body = JSON.parse(event.body || '{}')

    // Parse input data from multiple engineering sources
    const productionLine = body.productionLineCsv ? parseCsv(body.productionLineCsv) : []
    const robotSystems = body.robotSystemsCsv ? parseCsv(body.robotSystemsCsv) : []
    const qualitySystems = body.qualitySystemsCsv ? parseCsv(body.qualitySystemsCsv) : []
    const supplyChain = body.supplyChainCsv ? parseCsv(body.supplyChainCsv) : []

    // Automotive Process Units Model
    const automotiveProcessUnits = {
      'Body Shop': {
        function: 'Vehicle body assembly and welding',
        criticality: 'Critical',
        safetySystems: ['Welding Safety', 'Robot Safety', 'Fire Protection'],
        materialFlows: {
          inputs: ['Steel Panels', 'Welding Wire', 'Adhesives'],
          outputs: ['Body Shell']
        },
        criticalPath: true,
        crownJewel: true,
        iso26262Level: 'ASIL-D',
        iatf16949Critical: true
      },
      'Paint Shop': {
        function: 'Vehicle painting and coating',
        criticality: 'Critical',
        safetySystems: ['Paint Booth Safety', 'VOC Control', 'Fire Suppression'],
        materialFlows: {
          inputs: ['Body Shell', 'Paint', 'Primer', 'Clear Coat'],
          outputs: ['Painted Body']
        },
        criticalPath: true,
        crownJewel: true,
        iso26262Level: 'ASIL-C',
        iatf16949Critical: true
      },
      'Assembly Line': {
        function: 'Final vehicle assembly',
        criticality: 'Critical',
        safetySystems: ['Conveyor Safety', 'Worker Safety', 'Quality Gates'],
        materialFlows: {
          inputs: ['Painted Body', 'Engine', 'Interior', 'Electronics'],
          outputs: ['Complete Vehicle']
        },
        criticalPath: true,
        crownJewel: true,
        iso26262Level: 'ASIL-D',
        iatf16949Critical: true
      },
      'Powertrain': {
        function: 'Engine and transmission assembly',
        criticality: 'High',
        safetySystems: ['Engine Test Safety', 'Quality Control'],
        materialFlows: {
          inputs: ['Engine Blocks', 'Transmissions', 'Components'],
          outputs: ['Complete Powertrain']
        },
        iso26262Level: 'ASIL-B',
        iatf16949Critical: false
      },
      'Quality Control': {
        function: 'Vehicle inspection and testing',
        criticality: 'High',
        safetySystems: ['Test Safety', 'Data Integrity'],
        materialFlows: {
          inputs: ['Complete Vehicle'],
          outputs: ['Quality-Certified Vehicle']
        },
        iso26262Level: 'ASIL-A',
        iatf16949Critical: true
      }
    }

    // Automotive Control System Hierarchy
    const automotiveControlHierarchy = {
      'Safety PLC': { level: 'Safety_Level', asilLevel: 'ASIL-D', iso26262: true },
      'Robot Controller': { level: 'Control_Level', asilLevel: 'ASIL-C', iso26262: true },
      'Vision System': { level: 'Field_Level', asilLevel: 'ASIL-B', iso26262: true },
      'Quality System': { level: 'Control_Level', asilLevel: 'ASIL-A', iso26262: true },
      'PLC': { level: 'Field_Level', asilLevel: 'QM', iso26262: false },
      'HMI': { level: 'Supervisory_Level', asilLevel: 'QM', iso26262: false },
      'SCADA': { level: 'Supervisory_Level', asilLevel: 'QM', iso26262: false }
    }

    // Combine all engineering data sources
    const allAssets = []
    const dataSources = []
    let conflictsResolved = 0

    // Process Production Line Data
    if (productionLine.length > 0) {
      dataSources.push('Production Line')
      productionLine.forEach(asset => {
        allAssets.push({
          ...asset,
          dataSource: 'Production Line',
          sourcePriority: 1 // Highest priority
        })
      })
    }

    // Process Robot Systems Data
    if (robotSystems.length > 0) {
      dataSources.push('Robot Systems')
      robotSystems.forEach(asset => {
        // Check for conflicts with existing assets
        const existingIndex = allAssets.findIndex(a => a.tag_id === asset.tag_id)
        if (existingIndex >= 0) {
          // Resolve conflict - robot systems have higher priority for robot-specific data
          if (asset.instrument_type?.includes('Robot') || asset.instrument_type?.includes('Controller')) {
            allAssets[existingIndex] = {
              ...allAssets[existingIndex],
              ...asset,
              dataSource: 'Robot Systems (Primary)',
              sourcePriority: 2,
              conflictResolved: true
            }
            conflictsResolved++
          } else {
            // Merge data
            allAssets[existingIndex] = {
              ...allAssets[existingIndex],
              ...asset,
              dataSource: `${allAssets[existingIndex].dataSource} + Robot Systems`,
              conflictResolved: true
            }
            conflictsResolved++
          }
        } else {
          allAssets.push({
            ...asset,
            dataSource: 'Robot Systems',
            sourcePriority: 2
          })
        }
      })
    }

    // Process Quality Systems Data
    if (qualitySystems.length > 0) {
      dataSources.push('Quality Systems')
      qualitySystems.forEach(asset => {
        const existingIndex = allAssets.findIndex(a => a.tag_id === asset.tag_id)
        if (existingIndex >= 0) {
          // Merge quality-specific data
          allAssets[existingIndex] = {
            ...allAssets[existingIndex],
            ...asset,
            dataSource: `${allAssets[existingIndex].dataSource} + Quality Systems`,
            conflictResolved: true
          }
          conflictsResolved++
        } else {
          allAssets.push({
            ...asset,
            dataSource: 'Quality Systems',
            sourcePriority: 3
          })
        }
      })
    }

    // Process Supply Chain Data
    if (supplyChain.length > 0) {
      dataSources.push('Supply Chain')
      supplyChain.forEach(asset => {
        const existingIndex = allAssets.findIndex(a => a.tag_id === asset.tag_id)
        if (existingIndex >= 0) {
          // Merge supply chain data
          allAssets[existingIndex] = {
            ...allAssets[existingIndex],
            ...asset,
            dataSource: `${allAssets[existingIndex].dataSource} + Supply Chain`,
            conflictResolved: true
          }
          conflictsResolved++
        } else {
          allAssets.push({
            ...asset,
            dataSource: 'Supply Chain',
            sourcePriority: 4
          })
        }
      })
    }

    // Generate unified engineering baseline
    const unifiedBaseline = allAssets.map(asset => {
      const unitInfo = automotiveProcessUnits[asset.unit] || {}
      const controlInfo = automotiveControlHierarchy[asset.instrument_type] || { 
        level: 'Unknown', 
        asilLevel: 'QM', 
        iso26262: false 
      }

      return {
        tag_id: asset.tag_id,
        plant: asset.plant || 'Unknown',
        unit: asset.unit || 'Unknown',
        instrument_type: asset.instrument_type || asset.device_type || 'Unknown',
        criticality: asset.criticality || 'Medium',
        manufacturer: asset.manufacturer || asset.oem || 'Unknown',
        model: asset.model || 'Unknown',
        location: asset.location || 'Unknown',
        description: asset.description || `${asset.instrument_type} for ${asset.unit}`,
        installation_date: asset.installation_date || dayjs().subtract(Math.random() * 24, 'month').toISOString(),
        expected_ip: asset.expected_ip || asset.ip_address || null,
        expected_protocol: asset.expected_protocol || asset.protocol || 'Unknown',

        // Engineering-specific attributes
        data_source: asset.dataSource,
        source_priority: asset.sourcePriority,
        conflict_resolved: asset.conflictResolved || false,
        control_level: controlInfo.level,
        asil_level: controlInfo.asilLevel,
        iso26262_compliant: controlInfo.iso26262,
        iatf16949_critical: unitInfo.iatf16949Critical || false,
        process_function: unitInfo.function,
        safety_systems: unitInfo.safetySystems || [],
        material_flows: unitInfo.materialFlows || {},
        crown_jewel: unitInfo.crownJewel || false,
        critical_path: unitInfo.criticalPath || false,

        // Risk assessment
        risk_score: calculateRiskScore(unitInfo, controlInfo, asset),
        security_level: determineSecurityLevel(controlInfo, asset),
        is_sis: unitInfo.safetySystems?.includes(asset.description) || controlInfo.level === 'Safety_Level'
      }
    })

    // Generate baseline hash for audit trail
    const baselineData = {
      timestamp: dayjs().toISOString(),
      dataSources: dataSources,
      totalAssets: unifiedBaseline.length,
      conflictsResolved: conflictsResolved,
      assets: unifiedBaseline.map(a => a.tag_id)
    }
    const baselineHash = createHash('sha256').update(JSON.stringify(baselineData)).digest('hex')

    return resp(200, {
      success: true,
      industry: 'Automotive',
      totalAssets: unifiedBaseline.length,
      dataSources: dataSources.length,
      conflictsResolved: conflictsResolved,
      baselineHash: baselineHash,
      baseline: unifiedBaseline,
      processUnits: automotiveProcessUnits,
      controlHierarchy: automotiveControlHierarchy,
      standards: ['ISO 26262', 'IEC 61508', 'ISO 13849', 'ISO 21434'],
      governance: ['IATF 16949', 'ISO 14001', 'ISO 27001'],
      timestamp: dayjs().toISOString()
    })

  } catch (error) {
    console.error('Engineering Canonizer Error:', error)
    return resp(500, { 
      error: 'Engineering Canonizer failed', 
      detail: error.message 
    })
  }
}

function calculateRiskScore(unitInfo, controlInfo, asset) {
  let score = 0
  
  // Base risk from unit criticality
  if (unitInfo.criticality === 'Critical') score += 40
  if (unitInfo.crownJewel) score += 20
  if (unitInfo.criticalPath) score += 15
  
  // ASIL level risk
  if (controlInfo.asilLevel === 'ASIL-D') score += 30
  if (controlInfo.asilLevel === 'ASIL-C') score += 20
  if (controlInfo.asilLevel === 'ASIL-B') score += 10
  
  // Asset criticality
  if (asset.criticality === 'Critical') score += 25
  if (asset.criticality === 'High') score += 15
  
  // Data source conflicts
  if (asset.conflictResolved) score += 5
  
  return Math.min(score, 100)
}

function determineSecurityLevel(controlInfo, asset) {
  if (controlInfo.asilLevel === 'ASIL-D') return 'High'
  if (controlInfo.asilLevel === 'ASIL-C') return 'High'
  if (controlInfo.asilLevel === 'ASIL-B') return 'Medium'
  if (asset.criticality === 'Critical') return 'High'
  if (asset.criticality === 'High') return 'Medium'
  return 'Low'
}

const resp = (code, body) => ({
  statusCode: code,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
})










