#!/usr/bin/env node
/**
 * AIGNE-ALIGNED DATA GENERATOR
 * 
 * Creates realistic OT datasets following AIGNE framework principles:
 * - Hierarchical plant topology (plant → unit → area → asset)
 * - Network-aware data with proper subnet organization
 * - Multiple scale options (small → enterprise)
 * - Varied data quality for testing matching algorithms
 * - Rich metadata for provenance tracking
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

// ============================================================================
// CONFIGURATION
// ============================================================================

const SCALES = {
  small: { plants: 1, assetsPerUnit: 50, name: 'small' },
  medium: { plants: 1, assetsPerUnit: 200, name: 'medium' },
  large: { plants: 3, assetsPerUnit: 300, name: 'large' },
  enterprise: { plants: 5, assetsPerUnit: 500, name: 'enterprise' }
}

const INDUSTRIES = {
  'oil-gas': {
    name: 'Gulf Coast Petrochemical Complex',
    plants: [
      { name: 'Baytown Refinery', code: 'BTR', baseSubnet: '10.10' },
      { name: 'Port Arthur Facility', code: 'PAF', baseSubnet: '10.20' },
      { name: 'Houston Chemical Plant', code: 'HCP', baseSubnet: '10.30' },
      { name: 'Beaumont Processing', code: 'BPR', baseSubnet: '10.40' },
      { name: 'Texas City Terminal', code: 'TCT', baseSubnet: '10.50' }
    ],
    units: [
      { name: 'Crude Distillation Unit', code: 'CDU', criticality: 'Critical', vlan: 100, safetySystem: 'SIS-CDU' },
      { name: 'Fluid Catalytic Cracker', code: 'FCC', criticality: 'Critical', vlan: 110, safetySystem: 'SIS-FCC' },
      { name: 'Hydrocracker', code: 'HCK', criticality: 'Critical', vlan: 120, safetySystem: 'SIS-HCK' },
      { name: 'Reformer', code: 'REF', criticality: 'High', vlan: 130, safetySystem: 'SIS-REF' },
      { name: 'Coker Unit', code: 'COK', criticality: 'Critical', vlan: 140, safetySystem: 'SIS-COK' },
      { name: 'Hydrotreater', code: 'HTR', criticality: 'High', vlan: 150, safetySystem: null },
      { name: 'Tank Farm', code: 'TKF', criticality: 'Medium', vlan: 200, safetySystem: 'SIS-TKF' },
      { name: 'Loading Rack', code: 'LDR', criticality: 'Medium', vlan: 210, safetySystem: null },
      { name: 'Utilities', code: 'UTL', criticality: 'High', vlan: 220, safetySystem: 'SIS-UTL' },
      { name: 'Control Room', code: 'CTL', criticality: 'Critical', vlan: 10, safetySystem: 'SIS-MAIN' },
      { name: 'Wastewater Treatment', code: 'WWT', criticality: 'Medium', vlan: 230, safetySystem: null },
      { name: 'Flare System', code: 'FLR', criticality: 'Critical', vlan: 240, safetySystem: 'SIS-FLR' }
    ],
    deviceTypes: [
      { type: 'DCS Controller', tier: 1, weight: 5 },
      { type: 'Safety PLC', tier: 1, weight: 3 },
      { type: 'PLC', tier: 1, weight: 8 },
      { type: 'HMI Station', tier: 1, weight: 4 },
      { type: 'SCADA Server', tier: 1, weight: 2 },
      { type: 'RTU', tier: 1, weight: 3 },
      { type: 'Flow Transmitter', tier: 2, weight: 15 },
      { type: 'Pressure Transmitter', tier: 2, weight: 15 },
      { type: 'Temperature Transmitter', tier: 2, weight: 15 },
      { type: 'Level Transmitter', tier: 2, weight: 10 },
      { type: 'Control Valve', tier: 2, weight: 12 },
      { type: 'Motor Starter', tier: 2, weight: 8 },
      { type: 'VFD', tier: 2, weight: 6 },
      { type: 'Analyzer', tier: 2, weight: 4 },
      { type: 'Gas Detector', tier: 2, weight: 5 },
      { type: 'Flame Detector', tier: 2, weight: 3 },
      { type: 'Network Switch', tier: 2, weight: 3 },
      { type: 'Historian Server', tier: 1, weight: 2 },
      { type: 'Engineering Workstation', tier: 1, weight: 2 },
      { type: 'Gauge', tier: 3, weight: 10 },
      { type: 'Manual Valve', tier: 3, weight: 8 },
      { type: 'Relief Valve', tier: 3, weight: 5 }
    ],
    manufacturers: ['Honeywell', 'Emerson', 'ABB', 'Siemens', 'Yokogawa', 'Schneider', 'Rockwell', 'HIMA', 'Triconex']
  },
  
  'pharma': {
    name: 'BioPharm Manufacturing Campus',
    plants: [
      { name: 'API Production', code: 'API', baseSubnet: '172.16' },
      { name: 'Formulation Building', code: 'FRM', baseSubnet: '172.17' },
      { name: 'Packaging Center', code: 'PKG', baseSubnet: '172.18' },
      { name: 'Quality Labs', code: 'QAL', baseSubnet: '172.19' },
      { name: 'Warehouse & Distribution', code: 'WHD', baseSubnet: '172.20' }
    ],
    units: [
      { name: 'Reactor Suite A', code: 'RSA', criticality: 'Critical', vlan: 100, safetySystem: 'SIS-RSA' },
      { name: 'Reactor Suite B', code: 'RSB', criticality: 'Critical', vlan: 110, safetySystem: 'SIS-RSB' },
      { name: 'Purification', code: 'PUR', criticality: 'Critical', vlan: 120, safetySystem: null },
      { name: 'Drying', code: 'DRY', criticality: 'High', vlan: 130, safetySystem: null },
      { name: 'Granulation', code: 'GRN', criticality: 'High', vlan: 140, safetySystem: null },
      { name: 'Tablet Press', code: 'TBL', criticality: 'High', vlan: 150, safetySystem: null },
      { name: 'Coating', code: 'COT', criticality: 'Medium', vlan: 160, safetySystem: null },
      { name: 'Blister Pack', code: 'BLP', criticality: 'Medium', vlan: 170, safetySystem: null },
      { name: 'Serialization', code: 'SER', criticality: 'High', vlan: 180, safetySystem: null },
      { name: 'Clean Utilities', code: 'CUT', criticality: 'Critical', vlan: 200, safetySystem: 'SIS-CUT' },
      { name: 'HVAC', code: 'HVC', criticality: 'High', vlan: 210, safetySystem: null },
      { name: 'QC Lab', code: 'QCL', criticality: 'High', vlan: 220, safetySystem: null }
    ],
    deviceTypes: [
      { type: 'Batch Controller', tier: 1, weight: 5 },
      { type: 'PLC', tier: 1, weight: 8 },
      { type: 'HMI', tier: 1, weight: 4 },
      { type: 'SCADA', tier: 1, weight: 2 },
      { type: 'MES Terminal', tier: 1, weight: 3 },
      { type: 'Temperature Controller', tier: 2, weight: 12 },
      { type: 'Pressure Sensor', tier: 2, weight: 10 },
      { type: 'Flow Meter', tier: 2, weight: 8 },
      { type: 'pH Sensor', tier: 2, weight: 6 },
      { type: 'Conductivity Sensor', tier: 2, weight: 5 },
      { type: 'Weight Scale', tier: 2, weight: 8 },
      { type: 'Particle Counter', tier: 2, weight: 4 },
      { type: 'Environmental Monitor', tier: 2, weight: 6 },
      { type: 'Differential Pressure', tier: 2, weight: 8 },
      { type: 'LIMS Terminal', tier: 1, weight: 3 },
      { type: 'Serialization Camera', tier: 2, weight: 4 },
      { type: 'Label Printer', tier: 2, weight: 5 },
      { type: 'Manual Gauge', tier: 3, weight: 10 }
    ],
    manufacturers: ['Siemens', 'Rockwell', 'Emerson', 'ABB', 'Endress+Hauser', 'Mettler Toledo', 'Sartorius', 'Bürkert']
  },
  
  'utilities': {
    name: 'Regional Power Grid',
    plants: [
      { name: 'Central Generation', code: 'CGN', baseSubnet: '192.168' },
      { name: 'North Substation', code: 'NSS', baseSubnet: '192.169' },
      { name: 'South Substation', code: 'SSS', baseSubnet: '192.170' },
      { name: 'East Substation', code: 'ESS', baseSubnet: '192.171' },
      { name: 'Control Center', code: 'ECC', baseSubnet: '192.172' }
    ],
    units: [
      { name: 'Turbine Hall', code: 'TRB', criticality: 'Critical', vlan: 100, safetySystem: 'SIS-TRB' },
      { name: 'Generator', code: 'GEN', criticality: 'Critical', vlan: 110, safetySystem: 'SIS-GEN' },
      { name: 'Transformer Yard', code: 'TFY', criticality: 'Critical', vlan: 120, safetySystem: null },
      { name: 'Switchyard', code: 'SWY', criticality: 'Critical', vlan: 130, safetySystem: null },
      { name: 'Cooling Tower', code: 'CLT', criticality: 'High', vlan: 140, safetySystem: null },
      { name: 'Fuel Handling', code: 'FHL', criticality: 'High', vlan: 150, safetySystem: 'SIS-FHL' },
      { name: 'Water Treatment', code: 'WTR', criticality: 'Medium', vlan: 160, safetySystem: null },
      { name: 'Emissions Control', code: 'EMC', criticality: 'High', vlan: 170, safetySystem: null },
      { name: 'Battery Storage', code: 'BES', criticality: 'High', vlan: 180, safetySystem: 'SIS-BES' },
      { name: 'Protection', code: 'PRO', criticality: 'Critical', vlan: 10, safetySystem: 'SIS-PRO' }
    ],
    deviceTypes: [
      { type: 'SCADA RTU', tier: 1, weight: 8 },
      { type: 'Protection Relay', tier: 1, weight: 10 },
      { type: 'IED', tier: 1, weight: 8 },
      { type: 'HMI', tier: 1, weight: 4 },
      { type: 'EMS Server', tier: 1, weight: 2 },
      { type: 'Phasor Measurement Unit', tier: 1, weight: 3 },
      { type: 'Metering Unit', tier: 2, weight: 12 },
      { type: 'Current Transformer', tier: 2, weight: 10 },
      { type: 'Voltage Transformer', tier: 2, weight: 10 },
      { type: 'Circuit Breaker', tier: 2, weight: 8 },
      { type: 'Disconnect Switch', tier: 2, weight: 6 },
      { type: 'Capacitor Bank Controller', tier: 2, weight: 4 },
      { type: 'Tap Changer Controller', tier: 2, weight: 4 },
      { type: 'DFR', tier: 2, weight: 3 },
      { type: 'Battery Monitor', tier: 2, weight: 5 },
      { type: 'Environmental Sensor', tier: 2, weight: 6 },
      { type: 'Manual Indicator', tier: 3, weight: 8 }
    ],
    manufacturers: ['SEL', 'ABB', 'Siemens', 'GE', 'Schneider', 'Hitachi', 'Toshiba', 'Eaton']
  }
}

// ============================================================================
// GENERATOR FUNCTIONS
// ============================================================================

function weightedRandom(items) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0)
  let random = Math.random() * totalWeight
  
  for (const item of items) {
    random -= item.weight
    if (random <= 0) return item
  }
  return items[items.length - 1]
}

function generateMacAddress() {
  return Array.from({ length: 6 }, () => 
    Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
  ).join(':')
}

function generateTagId(plantCode, unitCode, assetNum) {
  return `${plantCode}-${unitCode}-${String(assetNum).padStart(4, '0')}`
}

function generateIPAddress(baseSubnet, vlan, hostNum) {
  const thirdOctet = Math.floor(vlan / 10) + Math.floor(hostNum / 254)
  const fourthOctet = (hostNum % 254) + 1
  return `${baseSubnet}.${thirdOctet}.${fourthOctet}`
}

function generateEngineeringData(industry, scale) {
  const config = INDUSTRIES[industry]
  const scaleConfig = SCALES[scale]
  const assets = []
  let globalAssetNum = 0
  
  const plantsToUse = config.plants.slice(0, scaleConfig.plants)
  
  for (const plant of plantsToUse) {
    for (const unit of config.units) {
      // Vary asset count by unit criticality
      const baseCount = scaleConfig.assetsPerUnit
      const multiplier = unit.criticality === 'Critical' ? 1.3 : 
                        unit.criticality === 'High' ? 1.0 : 0.7
      const assetCount = Math.floor(baseCount * multiplier * (0.8 + Math.random() * 0.4))
      
      for (let i = 0; i < assetCount; i++) {
        globalAssetNum++
        const deviceInfo = weightedRandom(config.deviceTypes)
        const manufacturer = config.manufacturers[Math.floor(Math.random() * config.manufacturers.length)]
        
        assets.push({
          tag_id: generateTagId(plant.code, unit.code, globalAssetNum),
          plant: plant.name,
          plant_code: plant.code,
          unit: unit.name,
          unit_code: unit.code,
          area: `${unit.name} - Zone ${Math.floor(i / 20) + 1}`,
          device_type: deviceInfo.type,
          security_tier: deviceInfo.tier,
          criticality: unit.criticality,
          manufacturer: manufacturer,
          model: `${manufacturer.substring(0, 3).toUpperCase()}-${deviceInfo.type.replace(/\s+/g, '')}-${Math.floor(Math.random() * 9000) + 1000}`,
          serial_number: `SN-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          description: `${deviceInfo.type} for ${unit.name} operations`,
          location: `${unit.name}, Station ${(i % 20) + 1}`,
          installation_date: new Date(Date.now() - Math.random() * 365 * 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          expected_ip: deviceInfo.tier <= 2 ? generateIPAddress(plant.baseSubnet, unit.vlan, i) : '',
          expected_protocol: deviceInfo.tier === 1 ? 
            ['Modbus TCP', 'Ethernet/IP', 'OPC UA', 'DNP3', 'IEC 61850'][Math.floor(Math.random() * 5)] :
            deviceInfo.tier === 2 ? ['HART', 'Modbus', 'Profibus', 'Foundation Fieldbus'][Math.floor(Math.random() * 4)] : '',
          vlan: unit.vlan,
          safety_system: unit.safetySystem || '',
          last_maintenance: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          warranty_expires: new Date(Date.now() + Math.random() * 365 * 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        })
      }
    }
  }
  
  return assets
}

function generateDiscoveryData(engineeringAssets, scale) {
  const discovered = []
  const scaleConfig = SCALES[scale]
  
  // Discovery rate varies by tier - Tier 1 more likely to be found
  const discoveryRates = {
    1: 0.92 + Math.random() * 0.05,  // 92-97% for critical control systems
    2: 0.75 + Math.random() * 0.10,  // 75-85% for networkable devices
    3: 0.20 + Math.random() * 0.15   // 20-35% for passive devices
  }
  
  // Process engineering assets
  for (const asset of engineeringAssets) {
    const discoveryRate = discoveryRates[asset.security_tier] || 0.5
    
    if (Math.random() < discoveryRate && asset.expected_ip) {
      // Asset was discovered
      const dataQuality = Math.random()
      
      discovered.push({
        tag_id: dataQuality > 0.1 ? asset.tag_id : '', // 10% missing tag
        discovered_ip: asset.expected_ip,
        mac_address: generateMacAddress(),
        hostname: dataQuality > 0.2 ? `${asset.plant_code}-${asset.unit_code}-${asset.device_type.replace(/\s+/g, '-').toLowerCase()}` : '',
        device_type: dataQuality > 0.05 ? asset.device_type : 'Unknown',
        vendor: dataQuality > 0.15 ? asset.manufacturer : 'Unknown',
        model: dataQuality > 0.25 ? asset.model : '',
        firmware_version: `${Math.floor(Math.random() * 5) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 100)}`,
        protocol: asset.expected_protocol || 'Unknown',
        network_segment: `VLAN-${asset.vlan}`,
        first_seen: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(),
        last_seen: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        discovery_method: ['Network Scan', 'SNMP', 'Protocol Analysis', 'Passive Monitoring', 'Active Probe'][Math.floor(Math.random() * 5)],
        confidence: Math.floor(70 + Math.random() * 30),
        open_ports: generateOpenPorts(asset.security_tier),
        vulnerabilities: Math.floor(Math.random() * (asset.security_tier === 1 ? 3 : 8)),
        cve_ids: generateCVEs(Math.floor(Math.random() * 3)),
        os_family: asset.security_tier === 1 ? ['VxWorks', 'QNX', 'Windows Embedded', 'Linux RT'][Math.floor(Math.random() * 4)] : '',
        is_managed: Math.random() > 0.3,
        last_patch_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        risk_score: calculateRiskScore(asset, dataQuality)
      })
    }
  }
  
  // Add orphan devices (discovered but not in engineering baseline)
  const orphanRate = scaleConfig.plants > 2 ? 0.08 : 0.12 // Fewer orphans in larger, better-managed facilities
  const orphanCount = Math.floor(engineeringAssets.length * orphanRate)
  
  for (let i = 0; i < orphanCount; i++) {
    const randomPlant = INDUSTRIES['oil-gas'].plants[Math.floor(Math.random() * Math.min(scaleConfig.plants, INDUSTRIES['oil-gas'].plants.length))]
    const randomUnit = INDUSTRIES['oil-gas'].units[Math.floor(Math.random() * INDUSTRIES['oil-gas'].units.length)]
    
    discovered.push({
      tag_id: '', // Orphans typically don't have proper tag IDs
      discovered_ip: generateIPAddress(randomPlant.baseSubnet, randomUnit.vlan, 200 + i),
      mac_address: generateMacAddress(),
      hostname: Math.random() > 0.5 ? `unknown-device-${i}` : '',
      device_type: Math.random() > 0.3 ? ['Legacy PLC', 'Unknown Controller', 'Rogue Device', 'Test Equipment', 'Contractor Laptop'][Math.floor(Math.random() * 5)] : 'Unknown',
      vendor: 'Unknown',
      model: '',
      firmware_version: 'Unknown',
      protocol: ['Modbus TCP', 'HTTP', 'Unknown'][Math.floor(Math.random() * 3)],
      network_segment: `VLAN-${randomUnit.vlan}`,
      first_seen: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      last_seen: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString(),
      discovery_method: 'Network Scan',
      confidence: Math.floor(30 + Math.random() * 40),
      open_ports: '22,80,502',
      vulnerabilities: Math.floor(3 + Math.random() * 10),
      cve_ids: generateCVEs(Math.floor(1 + Math.random() * 4)),
      os_family: 'Unknown',
      is_managed: false,
      last_patch_date: '',
      risk_score: Math.floor(70 + Math.random() * 30) // High risk for orphans
    })
  }
  
  return discovered
}

function generateOpenPorts(tier) {
  const ports = {
    1: ['502', '102', '44818', '2222', '20000'],  // OT protocols
    2: ['80', '443', '22', '161', '502'],
    3: []
  }
  const tierPorts = ports[tier] || []
  return tierPorts.slice(0, Math.floor(Math.random() * tierPorts.length) + 1).join(',')
}

function generateCVEs(count) {
  const cves = []
  for (let i = 0; i < count; i++) {
    const year = 2020 + Math.floor(Math.random() * 5)
    const id = Math.floor(Math.random() * 50000)
    cves.push(`CVE-${year}-${id}`)
  }
  return cves.join(';')
}

function calculateRiskScore(asset, dataQuality) {
  let score = 20 // Base score
  
  // Tier impact
  if (asset.security_tier === 1) score += 30
  else if (asset.security_tier === 2) score += 15
  
  // Criticality impact
  if (asset.criticality === 'Critical') score += 20
  else if (asset.criticality === 'High') score += 10
  
  // Data quality impact (poor data = higher risk)
  score += Math.floor((1 - dataQuality) * 20)
  
  // Random variation
  score += Math.floor(Math.random() * 15)
  
  return Math.min(100, Math.max(1, score))
}

function writeCsvFile(data, filepath, headers) {
  const csvRows = [headers]
  
  for (const row of data) {
    const values = headers.split(',').map(header => {
      const val = row[header] ?? ''
      // Escape quotes and wrap in quotes if contains comma
      const strVal = String(val)
      if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
        return `"${strVal.replace(/"/g, '""')}"`
      }
      return strVal
    })
    csvRows.push(values.join(','))
  }
  
  writeFileSync(filepath, csvRows.join('\n'))
  console.log(`  ✅ Generated ${filepath} with ${data.length} records`)
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

const args = process.argv.slice(2)
const requestedScale = args[0] || 'large'
const requestedIndustry = args[1] || 'oil-gas'

console.log(`\n🏭 AIGNE Data Generator`)
console.log(`   Scale: ${requestedScale.toUpperCase()}`)
console.log(`   Industry: ${requestedIndustry}`)
console.log('━'.repeat(50))

if (!SCALES[requestedScale]) {
  console.error(`❌ Unknown scale: ${requestedScale}`)
  console.log(`   Available scales: ${Object.keys(SCALES).join(', ')}`)
  process.exit(1)
}

if (!INDUSTRIES[requestedIndustry]) {
  console.error(`❌ Unknown industry: ${requestedIndustry}`)
  console.log(`   Available industries: ${Object.keys(INDUSTRIES).join(', ')}`)
  process.exit(1)
}

// Create output directory (industry-specific)
const outputDir = join('public', 'samples', 'aigne', requestedIndustry, requestedScale)
mkdirSync(outputDir, { recursive: true })

// Generate engineering baseline
console.log(`\n📋 Generating engineering baseline...`)
const engineeringAssets = generateEngineeringData(requestedIndustry, requestedScale)

const engineeringHeaders = 'tag_id,plant,plant_code,unit,unit_code,area,device_type,security_tier,criticality,manufacturer,model,serial_number,description,location,installation_date,expected_ip,expected_protocol,vlan,safety_system,last_maintenance,warranty_expires'
writeCsvFile(engineeringAssets, join(outputDir, `engineering_baseline_${requestedScale}.csv`), engineeringHeaders)

// Generate discovery data
console.log(`\n🔍 Generating discovery data...`)
const discoveryData = generateDiscoveryData(engineeringAssets, requestedScale)

const discoveryHeaders = 'tag_id,discovered_ip,mac_address,hostname,device_type,vendor,model,firmware_version,protocol,network_segment,first_seen,last_seen,discovery_method,confidence,open_ports,vulnerabilities,cve_ids,os_family,is_managed,last_patch_date,risk_score'
writeCsvFile(discoveryData, join(outputDir, `ot_discovery_${requestedScale}.csv`), discoveryHeaders)

// Calculate and display metrics
console.log(`\n📊 Dataset Metrics:`)
console.log('━'.repeat(50))

const tier1Assets = engineeringAssets.filter(a => a.security_tier === 1).length
const tier2Assets = engineeringAssets.filter(a => a.security_tier === 2).length
const tier3Assets = engineeringAssets.filter(a => a.security_tier === 3).length

const discoveredWithTag = discoveryData.filter(d => d.tag_id).length
const orphans = discoveryData.filter(d => !d.tag_id || d.tag_id === '').length
const blindSpots = engineeringAssets.filter(e => 
  e.expected_ip && !discoveryData.some(d => d.discovered_ip === e.expected_ip)
).length

const coverage = ((discoveredWithTag / engineeringAssets.length) * 100).toFixed(1)

console.log(`   Total Engineering Assets: ${engineeringAssets.length.toLocaleString()}`)
console.log(`   ├─ Tier 1 (Critical):     ${tier1Assets.toLocaleString()}`)
console.log(`   ├─ Tier 2 (Networkable):  ${tier2Assets.toLocaleString()}`)
console.log(`   └─ Tier 3 (Passive):      ${tier3Assets.toLocaleString()}`)
console.log(``)
console.log(`   Discovery Results:`)
console.log(`   ├─ Matched Assets:        ${discoveredWithTag.toLocaleString()} (${coverage}% coverage)`)
console.log(`   ├─ Blind Spots:           ${blindSpots.toLocaleString()}`)
console.log(`   └─ Orphan Devices:        ${orphans.toLocaleString()}`)
console.log(``)
console.log(`   Unique Plants:            ${new Set(engineeringAssets.map(a => a.plant)).size}`)
console.log(`   Unique Process Units:     ${new Set(engineeringAssets.map(a => a.unit)).size}`)

console.log(`\n✅ Data generation complete!`)
console.log(`📁 Files saved to: ${outputDir}`)
console.log(`\n💡 Usage tips:`)
console.log(`   - Load these files in the Canonizer to test The Map visualization`)
console.log(`   - Larger datasets will show more process units in the 3D view`)
console.log(`   - Try different view modes (physical, network, security)`)
