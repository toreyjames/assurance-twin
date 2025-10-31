import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

// Generate OT Discovery Tool Data for Multi-Industry Comparison
const industries = {
  'oil-gas': {
    plants: ['Gulf Coast Refinery', 'Baytown Refinery', 'Port Arthur Refinery'],
    units: ['Crude Distillation Unit (CDU)', 'Fluid Catalytic Cracking (FCC)', 'Hydrocracking Unit (HCU)', 'Reformer Unit', 'Alkylation Unit'],
    deviceTypes: ['DCS', 'PLC', 'HMI', 'RTU', 'Safety PLC', 'Flow Transmitter', 'Pressure Transmitter', 'Temperature Transmitter', 'Control Valve', 'Motor Starter']
  },
  'automotive': {
    plants: ['Detroit Assembly', 'Kentucky Assembly', 'Texas Assembly'],
    units: ['Body Shop', 'Paint Shop', 'Assembly Line', 'Powertrain', 'Quality Control', 'Stamping'],
    deviceTypes: ['Robot Controller', 'Welding Robot', 'Paint Robot', 'Assembly Robot', 'Vision System', 'Quality Scanner', 'Conveyor Controller', 'Safety PLC', 'HMI Station', 'SCADA System']
  },
  'pharma': {
    plants: ['Boston Pharma', 'San Diego Biotech', 'New Jersey Labs'],
    units: ['API Manufacturing', 'Formulation', 'Packaging', 'Quality Control Lab', 'Utilities', 'Warehouse'],
    deviceTypes: ['Batch Controller', 'SCADA', 'HMI', 'PLC', 'Safety PLC', 'Environmental Monitor', 'LIMS', 'MES', 'Serialization System', 'Temperature Controller']
  },
  'utilities': {
    plants: ['Pacific Power', 'Midwest Electric', 'Southeast Utilities'],
    units: ['Generation Unit', 'Transmission', 'Distribution', 'Control Center', 'Substation', 'Environmental Controls'],
    deviceTypes: ['SCADA', 'RTU', 'IED', 'HMI', 'Protection Relay', 'Grid Controller', 'EMS', 'DMS', 'Environmental Monitor', 'Arc Flash Monitor']
  }
}

// Generate OT Discovery Tool data for each industry
Object.entries(industries).forEach(([industry, config]) => {
  console.log(`\n🔍 Generating OT Discovery Tool data for ${industry.toUpperCase()}...`)
  
  const discoveryData = []
  const networkTopology = []
  const securityAssessment = []
  const complianceData = []
  
  config.plants.forEach(plant => {
    config.units.forEach(unit => {
      const assetCount = Math.floor(Math.random() * 40) + 20 // 20-60 discovered assets per unit
      for (let i = 0; i < assetCount; i++) {
        const deviceType = config.deviceTypes[Math.floor(Math.random() * config.deviceTypes.length)]
        const tagId = `${unit.substring(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`
        
        // OT Discovery Tool Data
        discoveryData.push({
          tag_id: tagId,
          plant: plant,
          unit: unit,
          device_type: deviceType,
          ip_address: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          mac_address: Array.from({length: 6}, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(':'),
          protocol: ['Modbus TCP', 'Ethernet/IP', 'Profinet', 'OPC UA', 'DNP3'][Math.floor(Math.random() * 5)],
          vendor: ['Siemens', 'Rockwell', 'ABB', 'Schneider', 'Honeywell', 'Emerson'][Math.floor(Math.random() * 6)],
          model: `${deviceType.replace(/\s+/g, '')}-${Math.floor(Math.random() * 9000) + 1000}`,
          firmware_version: `${Math.floor(Math.random() * 5) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 100)}`,
          last_seen: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          discovery_method: ['Network Scan', 'SNMP', 'Protocol Analysis', 'Asset Inventory'][Math.floor(Math.random() * 4)],
          confidence_level: Math.floor(Math.random() * 40) + 60, // 60-100%
          network_segment: `VLAN-${Math.floor(Math.random() * 100) + 1}`,
          criticality: ['Critical', 'High', 'Medium', 'Low'][Math.floor(Math.random() * 4)],
          is_managed: Math.random() > 0.3,
          has_security_patches: Math.random() > 0.4
        })
        
        // Network Topology Data
        networkTopology.push({
          tag_id: tagId,
          plant: plant,
          unit: unit,
          device_type: deviceType,
          ip_address: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          mac_address: Array.from({length: 6}, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(':'),
          switch_port: `SW${Math.floor(Math.random() * 48) + 1}`,
          vlan: `VLAN-${Math.floor(Math.random() * 100) + 1}`,
          network_segment: ['DMZ', 'Control Network', 'Safety Network', 'Corporate Network'][Math.floor(Math.random() * 4)],
          communication_peers: Math.floor(Math.random() * 10) + 1,
          bandwidth_usage: Math.floor(Math.random() * 100),
          latency_ms: Math.floor(Math.random() * 50) + 1,
          packet_loss: Math.random() * 5,
          uptime_hours: Math.floor(Math.random() * 8760) + 1
        })
        
        // Security Assessment Data
        securityAssessment.push({
          tag_id: tagId,
          plant: plant,
          unit: unit,
          device_type: deviceType,
          ip_address: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          security_level: Math.floor(Math.random() * 4) + 1, // 1-4
          vulnerabilities: Math.floor(Math.random() * 10),
          cve_count: Math.floor(Math.random() * 5),
          last_security_scan: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          encryption_enabled: Math.random() > 0.4,
          authentication_required: Math.random() > 0.3,
          access_control: ['None', 'Basic', 'Advanced', 'Enterprise'][Math.floor(Math.random() * 4)],
          network_isolation: Math.random() > 0.5,
          firewall_protected: Math.random() > 0.3,
          risk_score: Math.floor(Math.random() * 100) + 1
        })
        
        // Compliance Data
        complianceData.push({
          tag_id: tagId,
          plant: plant,
          unit: unit,
          device_type: deviceType,
          ip_address: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          compliance_status: ['Compliant', 'Non-Compliant', 'Unknown', 'Under Review'][Math.floor(Math.random() * 4)],
          last_audit: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
          audit_findings: Math.floor(Math.random() * 5),
          remediation_required: Math.random() > 0.6,
          policy_violations: Math.floor(Math.random() * 3),
          certification_status: ['Certified', 'Pending', 'Expired', 'Not Required'][Math.floor(Math.random() * 4)],
          documentation_complete: Math.random() > 0.4,
          change_management: Math.random() > 0.5,
          backup_configured: Math.random() > 0.3
        })
      }
    })
  })
  
  // Write CSV files for each industry
  const csvHeaders = {
    discovery: 'tag_id,plant,unit,device_type,ip_address,mac_address,protocol,vendor,model,firmware_version,last_seen,discovery_method,confidence_level,network_segment,criticality,is_managed,has_security_patches',
    topology: 'tag_id,plant,unit,device_type,ip_address,mac_address,switch_port,vlan,network_segment,communication_peers,bandwidth_usage,latency_ms,packet_loss,uptime_hours',
    security: 'tag_id,plant,unit,device_type,ip_address,security_level,vulnerabilities,cve_count,last_security_scan,encryption_enabled,authentication_required,access_control,network_isolation,firewall_protected,risk_score',
    compliance: 'tag_id,plant,unit,device_type,ip_address,compliance_status,last_audit,audit_findings,remediation_required,policy_violations,certification_status,documentation_complete,change_management,backup_configured'
  }
  
  const writeCsv = (data, filename, headers) => {
    const csvContent = [
      headers,
      ...data.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n')
    
    writeFileSync(join('public', 'samples', industry, filename), csvContent)
    console.log(`  ✅ Generated ${filename} with ${data.length} records`)
  }
  
  // Create directory
  mkdirSync(join('public', 'samples', industry), { recursive: true })
  
  // Write OT Discovery Tool files
  writeCsv(discoveryData, 'ot_discovery_data.csv', csvHeaders.discovery)
  writeCsv(networkTopology, 'network_topology.csv', csvHeaders.topology)
  writeCsv(securityAssessment, 'security_assessment.csv', csvHeaders.security)
  writeCsv(complianceData, 'compliance_data.csv', csvHeaders.compliance)
  
  console.log(`  📊 Total OT Discovery records: ${discoveryData.length}`)
  console.log(`  📊 Network topology records: ${networkTopology.length}`)
  console.log(`  📊 Security assessment records: ${securityAssessment.length}`)
  console.log(`  📊 Compliance records: ${complianceData.length}`)
})

console.log('\n🎯 OT Discovery Tool data generation complete!')
console.log('📁 Files generated in public/samples/[industry]/ot_discovery_data.csv')
console.log('📁 Additional files: network_topology.csv, security_assessment.csv, compliance_data.csv')
console.log('\n💡 This data represents what the OT Discovery Tool can actually find on the network')
console.log('💡 Compare this against engineering baseline to identify blind spots and gaps')
