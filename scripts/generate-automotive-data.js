/**
 * AUTOMOTIVE DATA GENERATOR
 * Creates TMNA-style automotive manufacturing sample data
 * 
 * Plants modeled after major automotive manufacturing footprint:
 * - Georgetown, KY (Camry, RAV4, Lexus ES) - Largest US auto plant
 * - Princeton, IN (Highlander, Grand Highlander, Sienna)
 * - San Antonio, TX (Tundra, Tacoma, Sequoia)
 * - Blue Springs, MS (Corolla, Corolla Cross)
 * - Huntsville, AL (Engine/Powertrain)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// =============================================================================
// CONFIGURATION
// =============================================================================

const PLANTS = [
  { 
    code: 'TMMK', 
    name: 'Kentucky Manufacturing', 
    city: 'Georgetown, KY',
    products: ['Camry', 'RAV4', 'Lexus ES'],
    capacity: 550000,
    units: ['stamping', 'body_shop', 'paint_shop', 'plastics', 'assembly', 'quality', 'logistics', 'plant_utilities']
  },
  { 
    code: 'TMMI', 
    name: 'Indiana Manufacturing', 
    city: 'Princeton, IN',
    products: ['Highlander', 'Grand Highlander', 'Sienna'],
    capacity: 420000,
    units: ['stamping', 'body_shop', 'paint_shop', 'assembly', 'quality', 'logistics', 'plant_utilities']
  },
  { 
    code: 'TMMTX', 
    name: 'Texas Manufacturing', 
    city: 'San Antonio, TX',
    products: ['Tundra', 'Tacoma', 'Sequoia'],
    capacity: 350000,
    units: ['body_shop', 'paint_shop', 'assembly', 'quality', 'logistics', 'plant_utilities']
  },
  { 
    code: 'TMMMS', 
    name: 'Mississippi Manufacturing', 
    city: 'Blue Springs, MS',
    products: ['Corolla', 'Corolla Cross'],
    capacity: 350000,
    units: ['body_shop', 'paint_shop', 'assembly', 'quality', 'logistics', 'plant_utilities']
  },
  { 
    code: 'TMMAL', 
    name: 'Alabama Engine Plant', 
    city: 'Huntsville, AL',
    products: ['4-Cylinder Engines', 'V6 Engines'],
    capacity: 900000,
    units: ['powertrain', 'quality', 'logistics', 'plant_utilities']
  }
]

const UNIT_CONFIGS = {
  stamping: {
    prefix: 'STM',
    deviceTypes: [
      { type: 'Press Controller', tier: 1, count: [8, 15] },
      { type: 'Servo Drive', tier: 2, count: [20, 40] },
      { type: 'Transfer Robot', tier: 1, count: [10, 20] },
      { type: 'Vision System', tier: 2, count: [6, 12] },
      { type: 'Safety PLC', tier: 1, count: [4, 8] },
      { type: 'HMI Panel', tier: 1, count: [8, 15] },
      { type: 'Die Sensor', tier: 3, count: [30, 60] },
      { type: 'Light Curtain', tier: 2, count: [15, 30] },
      { type: 'Tonnage Monitor', tier: 2, count: [8, 15] }
    ],
    manufacturers: ['Komatsu', 'Schuler', 'Fanuc', 'Siemens', 'Rockwell', 'SICK', 'Cognex', 'Keyence']
  },
  body_shop: {
    prefix: 'BDY',
    deviceTypes: [
      { type: 'Welding Robot', tier: 1, count: [200, 400] },
      { type: 'Weld Controller', tier: 1, count: [150, 300] },
      { type: 'Cell PLC', tier: 1, count: [30, 60] },
      { type: 'Vision System', tier: 2, count: [25, 50] },
      { type: 'Geometry Station', tier: 1, count: [8, 15] },
      { type: 'Safety Controller', tier: 1, count: [20, 40] },
      { type: 'HMI Panel', tier: 1, count: [25, 45] },
      { type: 'Servo Actuator', tier: 2, count: [80, 150] },
      { type: 'Conveyor Drive', tier: 2, count: [20, 40] },
      { type: 'Fixture Clamp', tier: 3, count: [60, 120] },
      { type: 'Adhesive Dispenser', tier: 2, count: [10, 20] }
    ],
    manufacturers: ['Fanuc', 'Kawasaki', 'ABB', 'Bosch Rexroth', 'Lincoln Electric', 'Fronius', 'Siemens', 'Rockwell', 'SICK', 'Pilz']
  },
  paint_shop: {
    prefix: 'PNT',
    deviceTypes: [
      { type: 'Paint Robot', tier: 1, count: [40, 80] },
      { type: 'Booth Controller', tier: 1, count: [15, 30] },
      { type: 'Oven Zone Controller', tier: 1, count: [20, 40] },
      { type: 'HVAC Controller', tier: 2, count: [15, 25] },
      { type: 'VFD', tier: 2, count: [40, 80] },
      { type: 'VOC Analyzer', tier: 2, count: [8, 15] },
      { type: 'Color Change Valve', tier: 2, count: [15, 30] },
      { type: 'HMI Panel', tier: 1, count: [15, 25] },
      { type: 'Temperature Sensor', tier: 3, count: [50, 100] },
      { type: 'Humidity Sensor', tier: 3, count: [25, 50] },
      { type: 'Sealer Robot', tier: 1, count: [8, 15] }
    ],
    manufacturers: ['Fanuc', 'Dürr', 'Geico', 'ABB', 'Siemens', 'Honeywell', 'Yokogawa', 'Graco', 'Nordson']
  },
  plastics: {
    prefix: 'PLS',
    deviceTypes: [
      { type: 'Injection Machine', tier: 1, count: [15, 25] },
      { type: 'Robot Extractor', tier: 1, count: [12, 20] },
      { type: 'Mold TCU', tier: 2, count: [20, 35] },
      { type: 'Material Dryer', tier: 2, count: [8, 15] },
      { type: 'HMI Panel', tier: 1, count: [10, 18] },
      { type: 'Conveyor PLC', tier: 2, count: [6, 12] }
    ],
    manufacturers: ['Engel', 'Arburg', 'Fanuc', 'Wittmann', 'Conair', 'Motan']
  },
  assembly: {
    prefix: 'ASM',
    deviceTypes: [
      { type: 'Line PLC', tier: 1, count: [40, 70] },
      { type: 'DC Torque Tool', tier: 1, count: [150, 250] },
      { type: 'Torque Controller', tier: 1, count: [100, 180] },
      { type: 'AGV', tier: 1, count: [30, 60] },
      { type: 'HMI Display', tier: 1, count: [60, 100] },
      { type: 'Barcode Scanner', tier: 2, count: [150, 250] },
      { type: 'Andon Board', tier: 2, count: [30, 50] },
      { type: 'Andon Pull Cord', tier: 3, count: [40, 70] },
      { type: 'Marriage Lift', tier: 1, count: [3, 6] },
      { type: 'Fluid Fill Station', tier: 2, count: [10, 18] },
      { type: 'Error Proof Sensor', tier: 3, count: [80, 140] },
      { type: 'Assembly Robot', tier: 1, count: [20, 40] },
      { type: 'Conveyor Drive', tier: 2, count: [30, 50] }
    ],
    manufacturers: ['Atlas Copco', 'Stanley', 'Bosch Rexroth', 'Fanuc', 'Daifuku', 'Dematic', 'JBT', 'Siemens', 'Rockwell', 'Cognex', 'Keyence']
  },
  quality: {
    prefix: 'QTY',
    deviceTypes: [
      { type: 'Chassis Dyno', tier: 1, count: [4, 8] },
      { type: 'Alignment Station', tier: 1, count: [4, 6] },
      { type: 'ADAS Calibration', tier: 1, count: [6, 10] },
      { type: 'ECU Programmer', tier: 1, count: [8, 15] },
      { type: 'Emissions Analyzer', tier: 2, count: [3, 6] },
      { type: 'Test PLC', tier: 1, count: [15, 25] },
      { type: 'Vision System', tier: 2, count: [20, 35] },
      { type: 'HMI Panel', tier: 1, count: [12, 20] },
      { type: 'Water Test Booth', tier: 2, count: [3, 5] },
      { type: 'Headlamp Aimer', tier: 2, count: [3, 5] }
    ],
    manufacturers: ['Maha', 'Burke Porter', 'Dürr', 'Bosch', 'AVL', 'Horiba', 'Cognex', 'Rockwell', 'Siemens']
  },
  powertrain: {
    prefix: 'PWR',
    deviceTypes: [
      { type: 'CNC Machine', tier: 1, count: [30, 50] },
      { type: 'Assembly Robot', tier: 1, count: [20, 35] },
      { type: 'DC Torque Tool', tier: 1, count: [50, 90] },
      { type: 'Engine Dyno', tier: 1, count: [6, 12] },
      { type: 'Cold Test Stand', tier: 1, count: [4, 8] },
      { type: 'Line PLC', tier: 1, count: [25, 40] },
      { type: 'HMI Panel', tier: 1, count: [20, 35] },
      { type: 'Leak Tester', tier: 2, count: [10, 18] },
      { type: 'Vision System', tier: 2, count: [15, 25] },
      { type: 'Torque Controller', tier: 1, count: [40, 70] }
    ],
    manufacturers: ['DMG Mori', 'Makino', 'Mazak', 'Fanuc', 'Atlas Copco', 'AVL', 'Horiba', 'Siemens', 'Rockwell']
  },
  logistics: {
    prefix: 'LOG',
    deviceTypes: [
      { type: 'AGV', tier: 1, count: [25, 45] },
      { type: 'ASRS Controller', tier: 1, count: [10, 18] },
      { type: 'Conveyor PLC', tier: 2, count: [15, 25] },
      { type: 'Barcode Scanner', tier: 2, count: [40, 70] },
      { type: 'HMI Panel', tier: 1, count: [12, 20] },
      { type: 'Dock Door Controller', tier: 2, count: [10, 18] },
      { type: 'Yard Tracker', tier: 2, count: [6, 10] }
    ],
    manufacturers: ['Daifuku', 'Dematic', 'JBT', 'Zebra', 'Honeywell', 'Siemens', 'Rockwell']
  },
  plant_utilities: {
    prefix: 'UTL',
    deviceTypes: [
      { type: 'Power Monitor', tier: 1, count: [15, 25] },
      { type: 'Compressor Controller', tier: 2, count: [8, 15] },
      { type: 'Chiller Controller', tier: 2, count: [6, 12] },
      { type: 'BMS Controller', tier: 1, count: [4, 8] },
      { type: 'Fire Panel', tier: 1, count: [8, 15] },
      { type: 'VFD', tier: 2, count: [30, 50] },
      { type: 'Energy Meter', tier: 3, count: [25, 45] },
      { type: 'HVAC Controller', tier: 2, count: [20, 35] }
    ],
    manufacturers: ['Schneider', 'Siemens', 'ABB', 'Johnson Controls', 'Honeywell', 'Trane', 'Atlas Copco', 'Carrier']
  }
}

// =============================================================================
// DATA GENERATION
// =============================================================================

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateSerial() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let serial = 'SN-'
  for (let i = 0; i < 10; i++) {
    serial += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return serial
}

function generateMAC() {
  const hex = '0123456789abcdef'
  let mac = ''
  for (let i = 0; i < 6; i++) {
    if (i > 0) mac += ':'
    mac += hex.charAt(Math.floor(Math.random() * 16))
    mac += hex.charAt(Math.floor(Math.random() * 16))
  }
  return mac
}

function generateIP(plantIdx, unitIdx, deviceIdx) {
  // Create realistic IP ranges per plant
  const plantBase = 10 + plantIdx
  const unitOctet = 10 + (unitIdx * 10)
  const deviceOctet = (deviceIdx % 254) + 1
  return `192.168.${plantBase}.${unitOctet + Math.floor(deviceIdx / 254)}`
}

function generateDate(yearsBack = 5) {
  const now = new Date()
  const pastDate = new Date(now.getTime() - Math.random() * yearsBack * 365 * 24 * 60 * 60 * 1000)
  return pastDate.toISOString().split('T')[0]
}

function generateFirmware() {
  return `${randomInt(1, 5)}.${randomInt(0, 9)}.${randomInt(0, 99)}`
}

// =============================================================================
// MAIN GENERATOR
// =============================================================================

function generateEngineeringBaseline() {
  const rows = []
  let totalDevices = 0
  
  // Header
  const headers = [
    'tag_id', 'plant', 'plant_code', 'unit', 'unit_code', 'area', 'device_type',
    'security_tier', 'criticality', 'manufacturer', 'model', 'serial_number',
    'description', 'location', 'installation_date', 'expected_ip', 'expected_protocol',
    'vlan', 'safety_system', 'last_maintenance', 'warranty_expires'
  ]
  rows.push(headers.join(','))
  
  PLANTS.forEach((plant, plantIdx) => {
    plant.units.forEach((unitKey, unitIdx) => {
      const unitConfig = UNIT_CONFIGS[unitKey]
      if (!unitConfig) return
      
      let deviceCounter = 0
      
      unitConfig.deviceTypes.forEach(deviceType => {
        const count = randomInt(deviceType.count[0], deviceType.count[1])
        
        for (let i = 0; i < count; i++) {
          deviceCounter++
          totalDevices++
          
          const tagId = `${plant.code}-${unitConfig.prefix}-${String(deviceCounter).padStart(4, '0')}`
          const manufacturer = randomItem(unitConfig.manufacturers)
          const model = `${manufacturer.substring(0, 3).toUpperCase()}-${deviceType.type.replace(/\s+/g, '')}-${randomInt(1000, 9999)}`
          const installDate = generateDate(6)
          const protocol = randomItem(['Ethernet/IP', 'Modbus TCP', 'PROFINET', 'OPC UA', 'EtherCAT'])
          const vlan = 100 + unitIdx
          const criticality = deviceType.tier === 1 ? 'Critical' : deviceType.tier === 2 ? 'High' : 'Medium'
          
          const area = `${unitKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} - Zone ${randomInt(1, 4)}`
          const location = `${plant.city}, Building ${String.fromCharCode(65 + unitIdx)}, Area ${randomInt(1, 10)}`
          
          const row = [
            tagId,
            plant.name,
            plant.code,
            unitKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            unitConfig.prefix,
            area,
            deviceType.type,
            deviceType.tier,
            criticality,
            manufacturer,
            model,
            generateSerial(),
            `${deviceType.type} for ${plant.products.join('/')} production`,
            `"${location}"`,
            installDate,
            deviceType.tier < 3 ? generateIP(plantIdx, unitIdx, deviceCounter) : '',
            deviceType.tier < 3 ? protocol : '',
            vlan,
            deviceType.type.includes('Safety') ? 'SIS-' + unitConfig.prefix : '',
            generateDate(1),
            generateDate(-2) // Future date for warranty
          ]
          
          rows.push(row.join(','))
        }
      })
    })
  })
  
  console.log(`Generated ${totalDevices} engineering baseline records`)
  return rows.join('\n')
}

function generateDiscoveryData() {
  const rows = []
  let discovered = 0
  let orphans = 0
  
  // Header
  const headers = [
    'tag_id', 'discovered_ip', 'mac_address', 'hostname', 'device_type',
    'vendor', 'model', 'firmware_version', 'protocol', 'network_segment',
    'first_seen', 'last_seen', 'discovery_method', 'confidence', 'open_ports',
    'vulnerabilities', 'cve_ids', 'os_family', 'is_managed', 'last_patch_date', 'risk_score'
  ]
  rows.push(headers.join(','))
  
  const discoveryMethods = ['Active Probe', 'Passive Monitoring', 'Network Scan', 'Protocol Analysis', 'SNMP']
  const osFamilies = ['VxWorks', 'QNX', 'Linux RT', 'Windows Embedded', 'Proprietary RTOS']
  const cves = [
    'CVE-2024-21893', 'CVE-2023-46604', 'CVE-2024-0012', 'CVE-2023-4966',
    'CVE-2024-3400', 'CVE-2023-20198', 'CVE-2024-20359', 'CVE-2023-22515'
  ]
  
  PLANTS.forEach((plant, plantIdx) => {
    plant.units.forEach((unitKey, unitIdx) => {
      const unitConfig = UNIT_CONFIGS[unitKey]
      if (!unitConfig) return
      
      let deviceCounter = 0
      
      unitConfig.deviceTypes.forEach(deviceType => {
        // Only discover tier 1 and 2 devices (networkable)
        if (deviceType.tier > 2) return
        
        const count = randomInt(deviceType.count[0], deviceType.count[1])
        
        for (let i = 0; i < count; i++) {
          deviceCounter++
          
          // 75% discovery rate (creates blind spots)
          const isDiscovered = Math.random() < 0.75
          if (!isDiscovered) continue
          
          discovered++
          
          const tagId = `${plant.code}-${unitConfig.prefix}-${String(deviceCounter).padStart(4, '0')}`
          const manufacturer = randomItem(unitConfig.manufacturers)
          const ip = generateIP(plantIdx, unitIdx, deviceCounter)
          
          // Some devices are orphans (discovered but not in baseline)
          const isOrphan = Math.random() < 0.08
          const actualTagId = isOrphan ? '' : tagId
          if (isOrphan) orphans++
          
          const hostname = isOrphan ? '' : `${tagId.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
          const confidence = randomInt(70, 99)
          const vulnCount = randomInt(0, 4)
          const cveList = vulnCount > 0 ? Array(vulnCount).fill().map(() => randomItem(cves)).join(';') : ''
          
          const ports = deviceType.tier === 1 
            ? randomItem(['"80,443,502"', '"80,443,44818"', '"102,502"', '"80,443,22,502"'])
            : randomItem(['"80,443"', '"80"', '"443"'])
          
          const row = [
            actualTagId,
            ip,
            generateMAC(),
            hostname,
            deviceType.type,
            manufacturer,
            isOrphan ? '' : `${manufacturer.substring(0, 3).toUpperCase()}-${deviceType.type.replace(/\s+/g, '')}-${randomInt(1000, 9999)}`,
            generateFirmware(),
            randomItem(['Ethernet/IP', 'Modbus TCP', 'PROFINET', 'OPC UA']),
            `VLAN-${100 + unitIdx}`,
            new Date(Date.now() - randomInt(30, 180) * 24 * 60 * 60 * 1000).toISOString(),
            new Date().toISOString(),
            randomItem(discoveryMethods),
            confidence,
            ports,
            vulnCount,
            cveList,
            randomItem(osFamilies),
            Math.random() > 0.3 ? 'true' : 'false',
            generateDate(1),
            randomInt(30, 95)
          ]
          
          rows.push(row.join(','))
        }
      })
    })
  })
  
  console.log(`Generated ${discovered} discovery records (${orphans} orphans)`)
  return rows.join('\n')
}

// =============================================================================
// WRITE FILES
// =============================================================================

const outputDir = path.join(__dirname, '..', 'public', 'samples', 'aigne', 'automotive', 'large')

// Ensure directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

// Generate and write files
const engineeringData = generateEngineeringBaseline()
fs.writeFileSync(path.join(outputDir, 'engineering_baseline_large.csv'), engineeringData)
console.log('Wrote engineering_baseline_large.csv')

const discoveryData = generateDiscoveryData()
fs.writeFileSync(path.join(outputDir, 'ot_discovery_large.csv'), discoveryData)
console.log('Wrote ot_discovery_large.csv')

console.log('\n✅ TMNA-style automotive data generation complete!')
console.log(`Output directory: ${outputDir}`)
