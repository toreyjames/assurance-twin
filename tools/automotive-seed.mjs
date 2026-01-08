import { writeFileSync } from 'fs'
import { join } from 'path'

// Generate Automotive Industry Sample Data
const automotivePlants = ['Detroit Assembly', 'Kentucky Assembly', 'Texas Assembly']
const automotiveUnits = ['Body Shop', 'Paint Shop', 'Assembly Line', 'Powertrain', 'Quality Control', 'Stamping']
const automotiveDeviceTypes = [
  'Robot Controller', 'Welding Robot', 'Paint Robot', 'Assembly Robot',
  'Vision System', 'Quality Scanner', 'Conveyor Controller', 'Safety PLC',
  'HMI Station', 'SCADA System', 'Paint Controller', 'Welding Controller'
]

// Generate Engineering Data
const engineeringData = []
automotivePlants.forEach(plant => {
  automotiveUnits.forEach(unit => {
    const assetCount = Math.floor(Math.random() * 50) + 20
    for (let i = 0; i < assetCount; i++) {
      const deviceType = automotiveDeviceTypes[Math.floor(Math.random() * automotiveDeviceTypes.length)]
      engineeringData.push({
        tag_id: `${unit.substring(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
        plant: plant,
        unit: unit,
        instrument_type: deviceType,
        criticality: unit === 'Quality Control' ? 'High' : 
                   ['Body Shop', 'Paint Shop', 'Assembly Line'].includes(unit) ? 'Critical' : 'Medium',
        description: `${deviceType} for ${unit} operations`,
        manufacturer: ['ABB', 'KUKA', 'Fanuc', 'Siemens', 'Rockwell'][Math.floor(Math.random() * 5)],
        model: `${deviceType.replace(/\s+/g, '')}-${Math.floor(Math.random() * 9000) + 1000}`,
        location: `${unit} - Station ${i + 1}`
      })
    }
  })
})

// Generate CMMS Data
const cmmsData = []
engineeringData.forEach(asset => {
  if (Math.random() > 0.2) {
    cmmsData.push({
      asset_id: asset.tag_id,
      plant: asset.plant,
      unit: asset.unit,
      instrument_type: asset.instrument_type,
      oem: asset.manufacturer,
      model: asset.model,
      last_patch_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      maintenance_status: Math.random() > 0.3 ? 'Current' : 'Overdue',
      next_maintenance: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      criticality: asset.criticality
    })
  }
})

// Generate Network Data
const networkData = []
engineeringData.forEach(asset => {
  if (Math.random() > 0.25) {
    networkData.push({
      tag_id: asset.tag_id,
      plant: asset.plant,
      unit: asset.unit,
      instrument_type: asset.instrument_type,
      ip_address: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      mac_address: Array.from({length: 6}, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(':'),
      protocol: ['Modbus TCP', 'Ethernet/IP', 'Profinet', 'OPC UA'][Math.floor(Math.random() * 4)],
      last_seen: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      network_status: Math.random() > 0.15 ? 'ON_NETWORK' : 'OFF_NETWORK',
      vlan: `VLAN-${Math.floor(Math.random() * 100) + 1}`
    })
  }
})

// Generate Historian Data
const historianData = []
engineeringData.forEach(asset => {
  if (Math.random() > 0.3) {
    historianData.push({
      tag_id: asset.tag_id,
      plant: asset.plant,
      unit: asset.unit,
      instrument_type: asset.instrument_type,
      timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
      uptime_pct: Math.floor(Math.random() * 20) + 80,
      alarm_count: Math.floor(Math.random() * 10),
      cycle_time: Math.floor(Math.random() * 30) + 10,
      quality_rate: Math.floor(Math.random() * 10) + 90,
      oee: Math.floor(Math.random() * 20) + 80
    })
  }
})

// Write CSV files
const csvHeaders = {
  engineering: 'tag_id,plant,unit,instrument_type,criticality,description,manufacturer,model,location',
  cmms: 'asset_id,plant,unit,instrument_type,oem,model,last_patch_date,maintenance_status,next_maintenance,criticality',
  network: 'tag_id,plant,unit,instrument_type,ip_address,mac_address,protocol,last_seen,network_status,vlan',
  historian: 'tag_id,plant,unit,instrument_type,timestamp,uptime_pct,alarm_count,cycle_time,quality_rate,oee'
}

const writeCsv = (data, filename, headers) => {
  const csvContent = [
    headers,
    ...data.map(row => Object.values(row).map(val => `"${val}"`).join(','))
  ].join('\n')
  
  writeFileSync(join('public', 'samples', 'automotive', filename), csvContent)
  console.log(`Generated ${filename} with ${data.length} records`)
}

// Create directory
import { mkdirSync } from 'fs'
mkdirSync(join('public', 'samples', 'automotive'), { recursive: true })

// Write files
writeCsv(engineeringData, 'engineering_assets.csv', csvHeaders.engineering)
writeCsv(cmmsData, 'cmms_assets.csv', csvHeaders.cmms)
writeCsv(networkData, 'network_assets.csv', csvHeaders.network)
writeCsv(historianData, 'historian_data.csv', csvHeaders.historian)

console.log('✅ Automotive sample data generated successfully!')
console.log(`📊 Generated ${engineeringData.length} engineering assets across ${automotivePlants.length} plants`)
console.log(`📊 Generated ${cmmsData.length} CMMS records`)
console.log(`📊 Generated ${networkData.length} network assets`)
console.log(`📊 Generated ${historianData.length} historian records`)














