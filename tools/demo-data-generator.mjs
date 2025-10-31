import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

// Generate Realistic Demo Data for OT Discovery Comparison
const industries = {
  'automotive': {
    plants: ['Toyota Georgetown', 'Honda Marysville', 'BMW Spartanburg'],
    units: ['Body Shop', 'Paint Shop', 'Assembly Line', 'Powertrain', 'Quality Control'],
    deviceTypes: ['Robot Controller', 'Welding Robot', 'Paint Robot', 'Assembly Robot', 'Vision System', 'Quality Scanner', 'Conveyor Controller', 'Safety PLC', 'HMI Station', 'SCADA System']
  },
  'oil-gas': {
    plants: ['Gulf Coast Refinery', 'Baytown Refinery', 'Port Arthur Refinery'],
    units: ['Crude Distillation Unit (CDU)', 'Fluid Catalytic Cracking (FCC)', 'Hydrocracking Unit (HCU)', 'Reformer Unit', 'Alkylation Unit'],
    deviceTypes: ['DCS', 'PLC', 'HMI', 'RTU', 'Safety PLC', 'Flow Transmitter', 'Pressure Transmitter', 'Temperature Transmitter', 'Control Valve', 'Motor Starter']
  },
  'pharma': {
    plants: ['Boston Pharma', 'San Diego Biotech', 'New Jersey Labs'],
    units: ['API Manufacturing', 'Formulation', 'Packaging', 'Quality Control Lab', 'Utilities'],
    deviceTypes: ['Batch Controller', 'SCADA', 'HMI', 'PLC', 'Safety PLC', 'Environmental Monitor', 'LIMS', 'MES', 'Serialization System', 'Temperature Controller']
  },
  'utilities': {
    plants: ['Pacific Power', 'Midwest Electric', 'Southeast Utilities'],
    units: ['Generation Unit', 'Transmission', 'Distribution', 'Control Center', 'Substation'],
    deviceTypes: ['SCADA', 'RTU', 'IED', 'HMI', 'Protection Relay', 'Grid Controller', 'EMS', 'DMS', 'Environmental Monitor', 'Arc Flash Monitor']
  }
}

// Generate realistic demo data for each industry
Object.entries(industries).forEach(([industry, config]) => {
  console.log(`\n🏭 Generating realistic demo data for ${industry.toUpperCase()}...`)
  
  // Engineering Baseline - What should be there
  const engineeringBaseline = []
  let globalAssetCounter = 0
  config.plants.forEach((plant, plantIdx) => {
    config.units.forEach(unit => {
      const assetCount = Math.floor(Math.random() * 30) + 20 // 20-50 assets per unit
      for (let i = 0; i < assetCount; i++) {
        globalAssetCounter++
        const deviceType = config.deviceTypes[Math.floor(Math.random() * config.deviceTypes.length)]
        engineeringBaseline.push({
          tag_id: `${unit.substring(0, 3).toUpperCase()}-${String(globalAssetCounter).padStart(4, '0')}`,
          plant: plant,
          unit: unit,
          device_type: deviceType,
          criticality: ['Critical', 'High', 'Medium', 'Low'][Math.floor(Math.random() * 4)],
          manufacturer: ['Siemens', 'Rockwell', 'ABB', 'Schneider', 'Honeywell', 'Emerson'][Math.floor(Math.random() * 6)],
          model: `${deviceType.replace(/\s+/g, '')}-${Math.floor(Math.random() * 9000) + 1000}`,
          location: `${unit} - Station ${i + 1}`,
          description: `${deviceType} for ${unit} operations`,
          installation_date: new Date(Date.now() - Math.random() * 365 * 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          expected_ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          expected_protocol: ['Modbus TCP', 'Ethernet/IP', 'Profinet', 'OPC UA', 'DNP3'][Math.floor(Math.random() * 5)]
        })
      }
    })
  })

  // OT Discovery Tool Data - What was actually found (with realistic gaps)
  const otDiscoveryData = []
  const discoveryRate = 0.60 + Math.random() * 0.15 // 60-75% discovery rate (industry realistic)
  
  engineeringBaseline.forEach(asset => {
    if (Math.random() < discoveryRate) {
      // Asset was discovered
      const confidenceLevel = Math.floor(Math.random() * 30) + 70 // 70-100%
      const isManaged = Math.random() > 0.3
      const hasPatches = Math.random() > 0.4
      
      otDiscoveryData.push({
        tag_id: asset.tag_id,
        plant: asset.plant,
        unit: asset.unit,
        device_type: asset.device_type,
        ip_address: asset.expected_ip,
        mac_address: Array.from({length: 6}, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(':'),
        protocol: asset.expected_protocol,
        vendor: asset.manufacturer,
        model: asset.model,
        firmware_version: `${Math.floor(Math.random() * 5) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 100)}`,
        last_seen: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        discovery_method: ['Network Scan', 'SNMP', 'Protocol Analysis', 'Asset Inventory'][Math.floor(Math.random() * 4)],
        confidence_level: confidenceLevel,
        network_segment: `VLAN-${Math.floor(Math.random() * 100) + 1}`,
        criticality: asset.criticality,
        is_managed: isManaged,
        has_security_patches: hasPatches,
        vulnerabilities: Math.floor(Math.random() * 5),
        cve_count: Math.floor(Math.random() * 3),
        last_security_scan: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        encryption_enabled: Math.random() > 0.4,
        authentication_required: Math.random() > 0.3,
        access_control: ['None', 'Basic', 'Advanced', 'Enterprise'][Math.floor(Math.random() * 4)],
        network_isolation: Math.random() > 0.5,
        firewall_protected: Math.random() > 0.3,
        risk_score: Math.floor(Math.random() * 100) + 1
      })
    }
  })

  // Add some orphan assets (discovered but not in engineering)
  const orphanCount = Math.floor(engineeringBaseline.length * 0.1) // 10% orphan rate
  for (let i = 0; i < orphanCount; i++) {
    const plant = config.plants[Math.floor(Math.random() * config.plants.length)]
    const unit = config.units[Math.floor(Math.random() * config.units.length)]
    const deviceType = config.deviceTypes[Math.floor(Math.random() * config.deviceTypes.length)]
    
    otDiscoveryData.push({
      tag_id: `ORPHAN-${industry.toUpperCase()}-${String(i + 1).padStart(4, '0')}`,
      plant: plant,
      unit: unit,
      device_type: deviceType,
      ip_address: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      mac_address: Array.from({length: 6}, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(':'),
      protocol: ['Modbus TCP', 'Ethernet/IP', 'Profinet', 'OPC UA', 'DNP3'][Math.floor(Math.random() * 5)],
      vendor: ['Unknown', 'Generic', 'Legacy'][Math.floor(Math.random() * 3)],
      model: 'Unknown',
      firmware_version: 'Unknown',
      last_seen: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      discovery_method: 'Network Scan',
      confidence_level: Math.floor(Math.random() * 40) + 40, // 40-80% for orphans
      network_segment: `VLAN-${Math.floor(Math.random() * 100) + 1}`,
      criticality: 'Unknown',
      is_managed: false,
      has_security_patches: false,
      vulnerabilities: Math.floor(Math.random() * 8) + 2,
      cve_count: Math.floor(Math.random() * 5) + 1,
      last_security_scan: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      encryption_enabled: false,
      authentication_required: false,
      access_control: 'None',
      network_isolation: false,
      firewall_protected: false,
      risk_score: Math.floor(Math.random() * 50) + 50 // High risk for orphans
    })
  }

  // Write demo data files
  const writeCsv = (data, filename, headers) => {
    const csvContent = [
      headers,
      ...data.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n')
    
    writeFileSync(join('public', 'samples', 'demo', industry, filename), csvContent)
    console.log(`  ✅ Generated ${filename} with ${data.length} records`)
  }

  // Create directory
  mkdirSync(join('public', 'samples', 'demo', industry), { recursive: true })

  // Engineering Baseline
  const engineeringHeaders = 'tag_id,plant,unit,device_type,criticality,manufacturer,model,location,description,installation_date,expected_ip,expected_protocol'
  writeCsv(engineeringBaseline, 'engineering_baseline.csv', engineeringHeaders)

  // OT Discovery Tool Data
  const discoveryHeaders = 'tag_id,plant,unit,device_type,ip_address,mac_address,protocol,vendor,model,firmware_version,last_seen,discovery_method,confidence_level,network_segment,criticality,is_managed,has_security_patches,vulnerabilities,cve_count,last_security_scan,encryption_enabled,authentication_required,access_control,network_isolation,firewall_protected,risk_score'
  writeCsv(otDiscoveryData, 'ot_discovery_data.csv', discoveryHeaders)

  // Calculate realistic metrics
  const totalAssets = engineeringBaseline.length
  const discoveredAssets = otDiscoveryData.filter(a => !a.tag_id.startsWith('ORPHAN-')).length
  const orphanAssets = otDiscoveryData.filter(a => a.tag_id.startsWith('ORPHAN-')).length
  const blindSpots = totalAssets - discoveredAssets
  const coveragePercentage = Math.round((discoveredAssets / totalAssets) * 100)
  const securityManaged = otDiscoveryData.filter(a => a.is_managed && a.has_security_patches).length
  const securityManagedPercentage = discoveredAssets > 0 ? Math.round((securityManaged / discoveredAssets) * 100) : 0

  console.log(`  📊 Total Engineering Assets: ${totalAssets}`)
  console.log(`  📊 Discovered Assets: ${discoveredAssets} (${coveragePercentage}% coverage)`)
  console.log(`  📊 Blind Spots: ${blindSpots}`)
  console.log(`  📊 Orphan Assets: ${orphanAssets}`)
  console.log(`  📊 Security Managed: ${securityManaged} (${securityManagedPercentage}%)`)
})

console.log('\n🎯 Realistic demo data generation complete!')
console.log('📁 Files generated in public/samples/demo/[industry]/')
console.log('💡 These datasets show realistic OT discovery gaps and compliance issues')
console.log('💡 Perfect for demonstrating the cross-verification approach')
