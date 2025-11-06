import { writeFileSync } from 'fs'
import { join } from 'path'

// Generate Utilities Industry Sample Data
const utilitiesPlants = ['Pacific Power', 'Midwest Electric', 'Southeast Utilities']
const utilitiesUnits = ['Generation Unit', 'Transmission', 'Distribution', 'Control Center', 'Substation', 'Environmental Controls']
const utilitiesDeviceTypes = [
  'SCADA', 'RTU', 'IED', 'HMI', 'Protection Relay', 'Grid Controller',
  'EMS', 'DMS', 'Environmental Monitor', 'Arc Flash Monitor'
]

// Generate Engineering Data
const engineeringData = []
utilitiesPlants.forEach(plant => {
  utilitiesUnits.forEach(unit => {
    const assetCount = Math.floor(Math.random() * 60) + 25
    for (let i = 0; i < assetCount; i++) {
      const deviceType = utilitiesDeviceTypes[Math.floor(Math.random() * utilitiesDeviceTypes.length)]
      engineeringData.push({
        tag_id: `${unit.substring(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
        plant: plant,
        unit: unit,
        instrument_type: deviceType,
        criticality: ['Generation Unit', 'Transmission', 'Control Center'].includes(unit) ? 'Critical' : 
                   ['Distribution', 'Substation'].includes(unit) ? 'High' : 'Medium',
        description: `${deviceType} for ${unit} operations`,
        manufacturer: ['Siemens', 'GE', 'ABB', 'Schneider', 'Honeywell'][Math.floor(Math.random() * 5)],
        model: `${deviceType.replace(/\s+/g, '')}-${Math.floor(Math.random() * 9000) + 1000}`,
        location: `${unit} - Bay ${Math.floor(Math.random() * 20) + 1}`,
        nerc_cip: true,
        ferc_regulated: ['Generation Unit', 'Transmission', 'Distribution', 'Control Center', 'Substation'].includes(unit),
        grid_stability: ['Generation Unit', 'Transmission', 'Control Center'].includes(unit)
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
      criticality: asset.criticality,
      nerc_cip: asset.nerc_cip,
      ferc_regulated: asset.ferc_regulated
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
      protocol: ['DNP3', 'IEC 61850', 'Modbus TCP', 'Ethernet/IP'][Math.floor(Math.random() * 4)],
      last_seen: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      network_status: Math.random() > 0.1 ? 'ON_NETWORK' : 'OFF_NETWORK',
      vlan: `VLAN-${Math.floor(Math.random() * 100) + 1}`,
      nerc_cip: asset.nerc_cip,
      grid_stability: asset.grid_stability
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
      uptime_pct: Math.floor(Math.random() * 10) + 90,
      alarm_count: Math.floor(Math.random() * 5),
      power_output: Math.floor(Math.random() * 1000) + 100,
      voltage: Math.floor(Math.random() * 100) + 100,
      frequency: Math.floor(Math.random() * 2) + 59,
      grid_stability: Math.floor(Math.random() * 20) + 80,
      environmental_compliance: Math.floor(Math.random() * 10) + 90
    })
  }
})

// Write CSV files
const csvHeaders = {
  engineering: 'tag_id,plant,unit,instrument_type,criticality,description,manufacturer,model,location,nerc_cip,ferc_regulated,grid_stability',
  cmms: 'asset_id,plant,unit,instrument_type,oem,model,last_patch_date,maintenance_status,next_maintenance,criticality,nerc_cip,ferc_regulated',
  network: 'tag_id,plant,unit,instrument_type,ip_address,mac_address,protocol,last_seen,network_status,vlan,nerc_cip,grid_stability',
  historian: 'tag_id,plant,unit,instrument_type,timestamp,uptime_pct,alarm_count,power_output,voltage,frequency,grid_stability,environmental_compliance'
}

const writeCsv = (data, filename, headers) => {
  const csvContent = [
    headers,
    ...data.map(row => Object.values(row).map(val => `"${val}"`).join(','))
  ].join('\n')
  
  writeFileSync(join('public', 'samples', 'utilities', filename), csvContent)
  console.log(`Generated ${filename} with ${data.length} records`)
}

// Create directory
import { mkdirSync } from 'fs'
mkdirSync(join('public', 'samples', 'utilities'), { recursive: true })

// Write files
writeCsv(engineeringData, 'engineering_assets.csv', csvHeaders.engineering)
writeCsv(cmmsData, 'cmms_assets.csv', csvHeaders.cmms)
writeCsv(networkData, 'network_assets.csv', csvHeaders.network)
writeCsv(historianData, 'historian_data.csv', csvHeaders.historian)

console.log('✅ Utilities sample data generated successfully!')
console.log(`📊 Generated ${engineeringData.length} engineering assets across ${utilitiesPlants.length} plants`)
console.log(`📊 Generated ${cmmsData.length} CMMS records`)
console.log(`📊 Generated ${networkData.length} network assets`)
console.log(`📊 Generated ${historianData.length} historian records`)







