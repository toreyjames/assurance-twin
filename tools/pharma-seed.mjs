import { writeFileSync } from 'fs'
import { join } from 'path'

// Generate Pharmaceutical Industry Sample Data
const pharmaPlants = ['Boston Pharma', 'San Diego Biotech', 'New Jersey Labs']
const pharmaUnits = ['API Manufacturing', 'Formulation', 'Packaging', 'Quality Control Lab', 'Utilities', 'Warehouse']
const pharmaDeviceTypes = [
  'Batch Controller', 'SCADA', 'HMI', 'PLC', 'Safety PLC',
  'Environmental Monitor', 'LIMS', 'MES', 'Serialization System', 'Temperature Controller'
]

// Generate Engineering Data
const engineeringData = []
pharmaPlants.forEach(plant => {
  pharmaUnits.forEach(unit => {
    const assetCount = Math.floor(Math.random() * 40) + 15
    for (let i = 0; i < assetCount; i++) {
      const deviceType = pharmaDeviceTypes[Math.floor(Math.random() * pharmaDeviceTypes.length)]
      engineeringData.push({
        tag_id: `${unit.substring(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
        plant: plant,
        unit: unit,
        instrument_type: deviceType,
        criticality: ['API Manufacturing', 'Formulation', 'Quality Control Lab'].includes(unit) ? 'Critical' : 
                   ['Packaging', 'Utilities'].includes(unit) ? 'High' : 'Medium',
        description: `${deviceType} for ${unit} operations`,
        manufacturer: ['Siemens', 'Rockwell', 'Emerson', 'Honeywell', 'Schneider'][Math.floor(Math.random() * 5)],
        model: `${deviceType.replace(/\s+/g, '')}-${Math.floor(Math.random() * 9000) + 1000}`,
        location: `${unit} - Batch ${Math.floor(Math.random() * 10) + 1}`,
        gmp_critical: ['API Manufacturing', 'Formulation', 'Quality Control Lab'].includes(unit),
        fda21cfr11: true,
        batch_tracking: ['API Manufacturing', 'Formulation', 'Packaging'].includes(unit)
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
      gmp_critical: asset.gmp_critical,
      validation_status: Math.random() > 0.4 ? 'Validated' : 'Pending'
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
      protocol: ['Modbus TCP', 'Ethernet/IP', 'OPC UA', 'DNP3'][Math.floor(Math.random() * 4)],
      last_seen: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      network_status: Math.random() > 0.15 ? 'ON_NETWORK' : 'OFF_NETWORK',
      vlan: `VLAN-${Math.floor(Math.random() * 100) + 1}`,
      data_integrity: true,
      audit_trail: true
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
      uptime_pct: Math.floor(Math.random() * 15) + 85,
      alarm_count: Math.floor(Math.random() * 8),
      batch_id: `BATCH-${Math.floor(Math.random() * 10000) + 1000}`,
      quality_metrics: Math.floor(Math.random() * 10) + 90,
      temperature: Math.floor(Math.random() * 20) + 20,
      humidity: Math.floor(Math.random() * 20) + 40,
      contamination_level: Math.floor(Math.random() * 5)
    })
  }
})

// Write CSV files
const csvHeaders = {
  engineering: 'tag_id,plant,unit,instrument_type,criticality,description,manufacturer,model,location,gmp_critical,fda21cfr11,batch_tracking',
  cmms: 'asset_id,plant,unit,instrument_type,oem,model,last_patch_date,maintenance_status,next_maintenance,criticality,gmp_critical,validation_status',
  network: 'tag_id,plant,unit,instrument_type,ip_address,mac_address,protocol,last_seen,network_status,vlan,data_integrity,audit_trail',
  historian: 'tag_id,plant,unit,instrument_type,timestamp,uptime_pct,alarm_count,batch_id,quality_metrics,temperature,humidity,contamination_level'
}

const writeCsv = (data, filename, headers) => {
  const csvContent = [
    headers,
    ...data.map(row => Object.values(row).map(val => `"${val}"`).join(','))
  ].join('\n')
  
  writeFileSync(join('public', 'samples', 'pharma', filename), csvContent)
  console.log(`Generated ${filename} with ${data.length} records`)
}

// Create directory
import { mkdirSync } from 'fs'
mkdirSync(join('public', 'samples', 'pharma'), { recursive: true })

// Write files
writeCsv(engineeringData, 'engineering_assets.csv', csvHeaders.engineering)
writeCsv(cmmsData, 'cmms_assets.csv', csvHeaders.cmms)
writeCsv(networkData, 'network_assets.csv', csvHeaders.network)
writeCsv(historianData, 'historian_data.csv', csvHeaders.historian)

console.log('✅ Pharmaceutical sample data generated successfully!')
console.log(`📊 Generated ${engineeringData.length} engineering assets across ${pharmaPlants.length} plants`)
console.log(`📊 Generated ${cmmsData.length} CMMS records`)
console.log(`📊 Generated ${networkData.length} network assets`)
console.log(`📊 Generated ${historianData.length} historian records`)









