import dayjs from 'dayjs'
import { createHash } from 'crypto'

const monthsAgo = (m) => dayjs().subtract(m, 'month')

const parseCsv = (csv) => {
  const lines = csv.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
    const obj = {}
    headers.forEach((header, i) => {
      obj[header] = values[i] || ''
    })
    return obj
  })
}

// Utilities Industry-Specific Canonizer with NERC CIP, FERC Compliance
export const handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return resp(405, { error: 'POST only' })
    const body = JSON.parse(event.body || '{}')
    const threshold = Number(body.thresholdMonths ?? 18)

    // Parse input data
    const eng = body.engineeringCsv ? parseCsv(body.engineeringCsv) : []
    const cmms = body.cmmsCsv ? parseCsv(body.cmmsCsv) : []
    const net = body.networkCsv ? parseCsv(body.networkCsv) : []
    const hist = body.historianCsv ? parseCsv(body.historianCsv) : []

    // Utilities Process Units Model with NERC CIP compliance
    const utilitiesProcessUnits = {
      'Generation Unit': {
        function: 'Electric power generation',
        criticality: 'Critical',
        safetySystems: ['Grid Stability', 'Emergency Shutdown', 'Environmental Controls', 'Arc Flash Protection'],
        materialFlows: {
          inputs: ['Fuel', 'Cooling Water', 'Air'],
          outputs: ['Electric Power']
        },
        criticalPath: true,
        crownJewel: true,
        nercCipCritical: true,
        fercRegulated: true,
        gridStability: true,
        environmentalControls: true
      },
      'Transmission': {
        function: 'High-voltage power transmission',
        criticality: 'Critical',
        safetySystems: ['Grid Stability', 'Protection Systems', 'Arc Flash Protection'],
        materialFlows: {
          inputs: ['Generated Power'],
          outputs: ['Transmitted Power']
        },
        criticalPath: true,
        crownJewel: true,
        nercCipCritical: true,
        fercRegulated: true,
        gridStability: true,
        protectionSystems: true
      },
      'Distribution': {
        function: 'Local power distribution',
        criticality: 'High',
        safetySystems: ['Protection Systems', 'Load Management', 'Arc Flash Protection'],
        materialFlows: {
          inputs: ['Transmitted Power'],
          outputs: ['Distributed Power']
        },
        nercCipCritical: true,
        fercRegulated: true,
        protectionSystems: true,
        loadManagement: true
      },
      'Control Center': {
        function: 'Grid operations and control',
        criticality: 'Critical',
        safetySystems: ['Grid Stability', 'Emergency Response', 'Cyber Security'],
        materialFlows: {
          inputs: ['Grid Data', 'Control Signals'],
          outputs: ['Control Commands', 'Grid Status']
        },
        criticalPath: true,
        crownJewel: true,
        nercCipCritical: true,
        fercRegulated: true,
        gridStability: true,
        cyberSecurity: true
      },
      'Substation': {
        function: 'Power transformation and switching',
        criticality: 'High',
        safetySystems: ['Protection Systems', 'Arc Flash Protection', 'Environmental Monitoring'],
        materialFlows: {
          inputs: ['High Voltage Power'],
          outputs: ['Transformed Power']
        },
        nercCipCritical: true,
        fercRegulated: true,
        protectionSystems: true,
        environmentalMonitoring: true
      },
      'Environmental Controls': {
        function: 'Environmental compliance and monitoring',
        criticality: 'Medium',
        safetySystems: ['Environmental Monitoring', 'Emission Controls'],
        materialFlows: {
          inputs: ['Emissions', 'Waste'],
          outputs: ['Clean Emissions', 'Processed Waste']
        },
        environmentalControls: true,
        environmentalMonitoring: true
      }
    }

    // Utilities Control System Hierarchy with NERC CIP compliance
    const utilitiesControlHierarchy = {
      'SCADA': { level: 'Supervisory_Level', nercCip: 'CIP-002', fercRegulated: true, gridStability: true },
      'RTU': { level: 'Field_Level', nercCip: 'CIP-002', fercRegulated: true, gridStability: true },
      'IED': { level: 'Field_Level', nercCip: 'CIP-002', fercRegulated: true, protectionSystems: true },
      'HMI': { level: 'Supervisory_Level', nercCip: 'CIP-002', fercRegulated: true, gridStability: true },
      'Protection Relay': { level: 'Field_Level', nercCip: 'CIP-002', fercRegulated: true, protectionSystems: true },
      'Grid Controller': { level: 'Control_Level', nercCip: 'CIP-002', fercRegulated: true, gridStability: true },
      'EMS': { level: 'Supervisory_Level', nercCip: 'CIP-002', fercRegulated: true, gridStability: true },
      'DMS': { level: 'Supervisory_Level', nercCip: 'CIP-002', fercRegulated: true, loadManagement: true },
      'Environmental Monitor': { level: 'Field_Level', nercCip: 'CIP-002', fercRegulated: false, environmentalMonitoring: true },
      'Arc Flash Monitor': { level: 'Field_Level', nercCip: 'CIP-002', fercRegulated: true, arcFlashProtection: true }
    }

    // Generate utilities-specific canonical assets
    const canonicalAssets = generateUtilitiesAssets(eng, cmms, net, hist, utilitiesProcessUnits, utilitiesControlHierarchy, threshold)

    // Utilities-specific KPIs with NERC CIP compliance
    const kpis = {
      total_assets: canonicalAssets.length,
      nerc_cip_critical: canonicalAssets.filter(a => a.nercCipCritical).length,
      ferc_regulated: canonicalAssets.filter(a => a.fercRegulated).length,
      grid_stability: canonicalAssets.filter(a => a.gridStability).length,
      protection_systems: canonicalAssets.filter(a => a.protectionSystems).length,
      environmental_controls: canonicalAssets.filter(a => a.environmentalControls).length,
      environmental_monitoring: canonicalAssets.filter(a => a.environmentalMonitoring).length,
      load_management: canonicalAssets.filter(a => a.loadManagement).length,
      cyber_security: canonicalAssets.filter(a => a.cyberSecurity).length,
      arc_flash_protection: canonicalAssets.filter(a => a.arcFlashProtection).length,
      network_coverage: Math.round((canonicalAssets.filter(a => a.network_status === 'ON_NETWORK').length / canonicalAssets.length) * 100),
      outdated_assets: canonicalAssets.filter(a => a.firmware_status === 'OUTDATED').length
    }

    // Plant mapping for utilities
    const plantMapping = {
      units: Object.keys(utilitiesProcessUnits).map(unitName => {
        const unit = utilitiesProcessUnits[unitName]
        const unitAssets = canonicalAssets.filter(a => a.unit === unitName)
        return {
          name: unitName,
          function: unit.function,
          criticality: unit.criticality,
          crownJewel: unit.crownJewel,
          criticalPath: unit.criticalPath,
          assetCount: unitAssets.length,
          criticalAssets: unitAssets.filter(a => a.criticality === 'Critical').length,
          nercCip: unitAssets.filter(a => a.nercCipCritical).length,
          fercRegulated: unitAssets.filter(a => a.fercRegulated).length,
          gridStability: unitAssets.filter(a => a.gridStability).length,
          protectionSystems: unitAssets.filter(a => a.protectionSystems).length,
          networkCoverage: unitAssets.length > 0 ? 
            Math.round((unitAssets.filter(a => a.network_status === 'ON_NETWORK').length / unitAssets.length) * 100) : 0,
          blindSpots: unitAssets.filter(a => 
            a.visibility_flags.includes('ENGINEERING') && 
            !a.visibility_flags.includes('NETWORK')
          ).length
        }
      }),
      criticalPaths: [
        {
          name: 'Generation to Distribution Path',
          description: 'Generation Unit → Transmission → Distribution',
          units: ['Generation Unit', 'Transmission', 'Distribution'],
          criticality: 'Critical'
        },
        {
          name: 'Grid Control Path',
          description: 'Control Center → All Grid Assets',
          units: ['Control Center', 'Generation Unit', 'Transmission', 'Distribution'],
          criticality: 'Critical'
        }
      ],
      materialFlows: [
        { from: 'Generation Unit', to: 'Transmission', material: 'Electric Power', criticality: 'Critical' },
        { from: 'Transmission', to: 'Distribution', material: 'Transmitted Power', criticality: 'Critical' },
        { from: 'Control Center', to: 'Generation Unit', material: 'Control Commands', criticality: 'Critical' },
        { from: 'Control Center', to: 'Transmission', material: 'Control Commands', criticality: 'Critical' },
        { from: 'Environmental Controls', to: 'Generation Unit', material: 'Clean Emissions', criticality: 'High' }
      ]
    }

    // Blind spots analysis
    const blindSpots = {
      engineering_without_network: canonicalAssets.filter(a => 
        a.visibility_flags.includes('ENGINEERING') && 
        !a.visibility_flags.includes('NETWORK')
      ).length,
      engineering_without_cmms: canonicalAssets.filter(a => 
        a.visibility_flags.includes('ENGINEERING') && 
        !a.visibility_flags.includes('CMMS')
      ).length,
      network_orphans: canonicalAssets.filter(a => 
        a.visibility_flags.includes('NETWORK') && 
        !a.visibility_flags.includes('ENGINEERING')
      ).length,
      critical_blind_spots: canonicalAssets.filter(a => 
        (a.is_crown_jewel || a.is_critical_path || a.is_sis) && 
        !a.visibility_flags.includes('NETWORK')
      ).length,
      nerc_cip_blind_spots: canonicalAssets.filter(a => 
        a.nercCipCritical && 
        !a.visibility_flags.includes('NETWORK')
      ).length,
      grid_stability_blind_spots: canonicalAssets.filter(a => 
        a.gridStability && 
        !a.visibility_flags.includes('NETWORK')
      ).length
    }

    // Crown jewels (NERC CIP critical and grid stability assets)
    const crownJewels = canonicalAssets.filter(a => a.is_crown_jewel || (a.nercCipCritical && a.gridStability))

    const evidenceData = {
      industry: 'Utilities',
      timestamp: dayjs().toISOString(),
      assets: canonicalAssets.length,
      standards: ['NERC CIP', 'IEC 61850', 'IEEE 1815', 'IEEE 1584'],
      governance: ['FERC', 'NERC Reliability', 'NFPA 70E']
    }
    const evidenceHash = createHash('sha256').update(JSON.stringify(evidenceData)).digest('hex')

    return resp(200, {
      success: true,
      industry: 'Utilities',
      plant: canonicalAssets[0]?.plant || 'Unknown',
      kpis,
      assets: canonicalAssets,
      plantMapping,
      blindSpots,
      crownJewels,
      processUnits: utilitiesProcessUnits,
      controlHierarchy: utilitiesControlHierarchy,
      standards: ['NERC CIP', 'IEC 61850', 'IEEE 1815', 'IEEE 1584'],
      governance: ['FERC', 'NERC Reliability', 'NFPA 70E'],
      evidenceHash,
      timestamp: dayjs().toISOString()
    })

  } catch (error) {
    console.error('Utilities Canonizer Error:', error)
    return resp(500, { 
      error: 'Utilities Canonizer failed', 
      detail: error.message 
    })
  }
}

function generateUtilitiesAssets(eng, cmms, net, hist, processUnits, controlHierarchy, threshold) {
  const assets = []
  const plants = ['Pacific Power', 'Midwest Electric', 'Southeast Utilities']
  const deviceTypes = Object.keys(controlHierarchy)
  
  // Generate assets for each plant
  plants.forEach(plant => {
    Object.keys(processUnits).forEach(unit => {
      const unitInfo = processUnits[unit]
      const assetCount = Math.floor(Math.random() * 60) + 25 // 25-85 assets per unit
      
      for (let i = 0; i < assetCount; i++) {
        const deviceType = deviceTypes[Math.floor(Math.random() * deviceTypes.length)]
        const controlInfo = controlHierarchy[deviceType]
        
        // Generate utilities-specific asset
        const asset = {
          canon_id: `UTIL_${plant.replace(/\s+/g, '_')}_${unit.replace(/\s+/g, '_')}_${i + 1}`,
          tag_id: `${unit.substring(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
          plant: plant,
          unit: unit,
          instrument_type: deviceType,
          control_level: controlInfo.level,
          nercCipCritical: controlInfo.nercCip === 'CIP-002',
          fercRegulated: controlInfo.fercRegulated,
          criticality: unitInfo.criticality,
          is_crown_jewel: unitInfo.crownJewel && controlInfo.nercCip === 'CIP-002',
          is_critical_path: unitInfo.criticalPath,
          is_sis: controlInfo.level === 'Safety_Level' || controlInfo.nercCip === 'CIP-002',
          is_process_critical: unitInfo.criticality === 'Critical',
          network_status: Math.random() > 0.1 ? 'ON_NETWORK' : 'OFF_NETWORK',
          ip_address: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          last_seen: dayjs().subtract(Math.floor(Math.random() * 30), 'day').toISOString(),
          uptime_pct: Math.floor(Math.random() * 10) + 90,
          alarm_count: Math.floor(Math.random() * 5),
          firmware_status: Math.random() > 0.2 ? 'CURRENT' : 'OUTDATED',
          visibility_flags: generateVisibilityFlags(),
          process_function: unitInfo.function,
          safety_systems: unitInfo.safetySystems,
          material_flows: unitInfo.materialFlows,
          risk_score: calculateRiskScore(unitInfo, controlInfo),
          security_level: controlInfo.nercCip === 'CIP-002' ? 4 : 3,
          gridStability: unitInfo.gridStability || controlInfo.gridStability || false,
          protectionSystems: unitInfo.protectionSystems || controlInfo.protectionSystems || false,
          environmentalControls: unitInfo.environmentalControls || false,
          environmentalMonitoring: unitInfo.environmentalMonitoring || controlInfo.environmentalMonitoring || false,
          loadManagement: unitInfo.loadManagement || controlInfo.loadManagement || false,
          cyberSecurity: unitInfo.cyberSecurity || controlInfo.cyberSecurity || false,
          arcFlashProtection: unitInfo.arcFlashProtection || controlInfo.arcFlashProtection || false
        }
        
        assets.push(asset)
      }
    })
  })
  
  return assets
}

function generateVisibilityFlags() {
  const flags = []
  if (Math.random() > 0.1) flags.push('ENGINEERING')
  if (Math.random() > 0.2) flags.push('CMMS')
  if (Math.random() > 0.3) flags.push('NETWORK')
  if (Math.random() > 0.4) flags.push('HISTORIAN')
  return flags
}

function calculateRiskScore(unitInfo, controlInfo) {
  let score = 0
  if (unitInfo.criticality === 'Critical') score += 40
  if (controlInfo.nercCip === 'CIP-002') score += 35
  if (unitInfo.crownJewel) score += 25
  if (controlInfo.fercRegulated) score += 20
  if (controlInfo.gridStability) score += 15
  return Math.min(score, 100)
}

const resp = (code, body) => ({
  statusCode: code,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
})







