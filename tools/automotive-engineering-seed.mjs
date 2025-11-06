import { writeFileSync } from 'fs'
import { join } from 'path'

// Generate Automotive Engineering Data Sources
const automotivePlants = ['Toyota Georgetown', 'Honda Marysville', 'Ford Dearborn']
const automotiveUnits = ['Body Shop', 'Paint Shop', 'Assembly Line', 'Powertrain', 'Quality Control', 'Stamping']

// Production Line Data (P&IDs, Asset Registers)
const productionLineData = []
automotivePlants.forEach(plant => {
  automotiveUnits.forEach(unit => {
    const assetCount = Math.floor(Math.random() * 30) + 15
    for (let i = 0; i < assetCount; i++) {
      const deviceTypes = [
        'Assembly Robot', 'Conveyor Controller', 'Safety PLC', 'HMI Station',
        'SCADA System', 'Paint Controller', 'Welding Controller', 'Vision System'
      ]
      const deviceType = deviceTypes[Math.floor(Math.random() * deviceTypes.length)]
      
      productionLineData.push({
        tag_id: `${unit.substring(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
        plant: plant,
        unit: unit,
        instrument_type: deviceType,
        criticality: unit === 'Quality Control' ? 'High' : 
                   ['Body Shop', 'Paint Shop', 'Assembly Line'].includes(unit) ? 'Critical' : 'Medium',
        description: `${deviceType} for ${unit} operations`,
        manufacturer: ['ABB', 'KUKA', 'Fanuc', 'Siemens', 'Rockwell'][Math.floor(Math.random() * 5)],
        model: `${deviceType.replace(/\s+/g, '')}-${Math.floor(Math.random() * 9000) + 1000}`,
        location: `${unit} - Station ${i + 1}`,
        installation_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        expected_ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        expected_protocol: ['OPC UA', 'Profinet', 'Ethernet/IP', 'Modbus TCP'][Math.floor(Math.random() * 4)]
      })
    }
  })
})

// Robot Systems Data (Robot Programming, Safety Systems)
const robotSystemsData = []
automotivePlants.forEach(plant => {
  automotiveUnits.forEach(unit => {
    if (['Body Shop', 'Paint Shop', 'Assembly Line'].includes(unit)) {
      const robotCount = Math.floor(Math.random() * 15) + 5
      for (let i = 0; i < robotCount; i++) {
        const robotTypes = [
          'Welding Robot', 'Paint Robot', 'Assembly Robot', 'Material Handling Robot',
          'Quality Inspection Robot', 'Packaging Robot'
        ]
        const robotType = robotTypes[Math.floor(Math.random() * robotTypes.length)]
        
        robotSystemsData.push({
          tag_id: `ROB-${unit.substring(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
          plant: plant,
          unit: unit,
          instrument_type: robotType,
          criticality: 'Critical',
          description: `${robotType} for ${unit} operations`,
          manufacturer: ['ABB', 'KUKA', 'Fanuc', 'Kawasaki', 'Yaskawa'][Math.floor(Math.random() * 5)],
          model: `${robotType.replace(/\s+/g, '')}-${Math.floor(Math.random() * 9000) + 1000}`,
          location: `${unit} - Robot Station ${i + 1}`,
          robot_controller: `RC-${unit.substring(0, 3).toUpperCase()}-${i + 1}`,
          safety_system: 'Safety PLC',
          programming_language: ['KRL', 'RAPID', 'KAREL', 'Python'][Math.floor(Math.random() * 4)],
          payload_capacity: `${Math.floor(Math.random() * 50) + 10}kg`,
          reach: `${Math.floor(Math.random() * 2000) + 1000}mm`,
          safety_rated: Math.random() > 0.3 ? 'Yes' : 'No',
          iso26262_level: ['ASIL-D', 'ASIL-C', 'ASIL-B'][Math.floor(Math.random() * 3)]
        })
      }
    }
  })
})

// Quality Systems Data (Inspection, Measurement, Test Equipment)
const qualitySystemsData = []
automotivePlants.forEach(plant => {
  automotiveUnits.forEach(unit => {
    const qualityCount = Math.floor(Math.random() * 10) + 5
    for (let i = 0; i < qualityCount; i++) {
      const qualityTypes = [
        'Vision System', 'Coordinate Measuring Machine', 'Laser Scanner',
        'Force Gauge', 'Torque Wrench', 'Calibration System', 'Test Fixture'
      ]
      const qualityType = qualityTypes[Math.floor(Math.random() * qualityTypes.length)]
      
      qualitySystemsData.push({
        tag_id: `QC-${unit.substring(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
        plant: plant,
        unit: unit,
        instrument_type: qualityType,
        criticality: 'High',
        description: `${qualityType} for ${unit} quality control`,
        manufacturer: ['Keyence', 'Cognex', 'Zeiss', 'Hexagon', 'Mitutoyo'][Math.floor(Math.random() * 5)],
        model: `${qualityType.replace(/\s+/g, '')}-${Math.floor(Math.random() * 9000) + 1000}`,
        location: `${unit} - Quality Station ${i + 1}`,
        measurement_accuracy: `${(Math.random() * 0.1 + 0.01).toFixed(3)}mm`,
        calibration_date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        next_calibration: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        iatf16949_compliant: Math.random() > 0.2 ? 'Yes' : 'No',
        measurement_type: ['Dimensional', 'Surface Finish', 'Hardness', 'Color', 'Force'][Math.floor(Math.random() * 5)]
      })
    }
  })
})

// Supply Chain Data (JIT, Inventory, Supplier Integration)
const supplyChainData = []
automotivePlants.forEach(plant => {
  automotiveUnits.forEach(unit => {
    const supplyCount = Math.floor(Math.random() * 8) + 3
    for (let i = 0; i < supplyCount; i++) {
      const supplyTypes = [
        'JIT Controller', 'Inventory Management System', 'Supplier Portal',
        'Material Tracking System', 'Kanban Controller', 'Supplier Quality System'
      ]
      const supplyType = supplyTypes[Math.floor(Math.random() * supplyTypes.length)]
      
      supplyChainData.push({
        tag_id: `SC-${unit.substring(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
        plant: plant,
        unit: unit,
        instrument_type: supplyType,
        criticality: 'Medium',
        description: `${supplyType} for ${unit} supply chain management`,
        manufacturer: ['SAP', 'Oracle', 'Microsoft', 'IBM', 'Custom'][Math.floor(Math.random() * 5)],
        model: `${supplyType.replace(/\s+/g, '')}-${Math.floor(Math.random() * 9000) + 1000}`,
        location: `${unit} - Supply Chain Station ${i + 1}`,
        supplier_integration: Math.random() > 0.3 ? 'Yes' : 'No',
        jit_enabled: Math.random() > 0.4 ? 'Yes' : 'No',
        inventory_level: `${Math.floor(Math.random() * 1000) + 100} units`,
        lead_time: `${Math.floor(Math.random() * 14) + 1} days`,
        supplier_count: Math.floor(Math.random() * 20) + 5,
        kanban_cards: Math.floor(Math.random() * 50) + 10
      })
    }
  })
})

// Write files
writeFileSync(join('public', 'samples', 'demo', 'automotive', 'production_line_data.csv'), 
  'tag_id,plant,unit,instrument_type,criticality,description,manufacturer,model,location,installation_date,expected_ip,expected_protocol\n' +
  productionLineData.map(asset => 
    `"${asset.tag_id}","${asset.plant}","${asset.unit}","${asset.instrument_type}","${asset.criticality}","${asset.description}","${asset.manufacturer}","${asset.model}","${asset.location}","${asset.installation_date}","${asset.expected_ip}","${asset.expected_protocol}"`
  ).join('\n')
)

writeFileSync(join('public', 'samples', 'demo', 'automotive', 'robot_systems_data.csv'), 
  'tag_id,plant,unit,instrument_type,criticality,description,manufacturer,model,location,robot_controller,safety_system,programming_language,payload_capacity,reach,safety_rated,iso26262_level\n' +
  robotSystemsData.map(asset => 
    `"${asset.tag_id}","${asset.plant}","${asset.unit}","${asset.instrument_type}","${asset.criticality}","${asset.description}","${asset.manufacturer}","${asset.model}","${asset.location}","${asset.robot_controller}","${asset.safety_system}","${asset.programming_language}","${asset.payload_capacity}","${asset.reach}","${asset.safety_rated}","${asset.iso26262_level}"`
  ).join('\n')
)

writeFileSync(join('public', 'samples', 'demo', 'automotive', 'quality_systems_data.csv'), 
  'tag_id,plant,unit,instrument_type,criticality,description,manufacturer,model,location,measurement_accuracy,calibration_date,next_calibration,iatf16949_compliant,measurement_type\n' +
  qualitySystemsData.map(asset => 
    `"${asset.tag_id}","${asset.plant}","${asset.unit}","${asset.instrument_type}","${asset.criticality}","${asset.description}","${asset.manufacturer}","${asset.model}","${asset.location}","${asset.measurement_accuracy}","${asset.calibration_date}","${asset.next_calibration}","${asset.iatf16949_compliant}","${asset.measurement_type}"`
  ).join('\n')
)

writeFileSync(join('public', 'samples', 'demo', 'automotive', 'supply_chain_data.csv'), 
  'tag_id,plant,unit,instrument_type,criticality,description,manufacturer,model,location,supplier_integration,jit_enabled,inventory_level,lead_time,supplier_count,kanban_cards\n' +
  supplyChainData.map(asset => 
    `"${asset.tag_id}","${asset.plant}","${asset.unit}","${asset.instrument_type}","${asset.criticality}","${asset.description}","${asset.manufacturer}","${asset.model}","${asset.location}","${asset.supplier_integration}","${asset.jit_enabled}","${asset.inventory_level}","${asset.lead_time}","${asset.supplier_count}","${asset.kanban_cards}"`
  ).join('\n')
)

console.log('✅ Generated Automotive Engineering Data Sources:')
console.log(`📊 Production Line Data: ${productionLineData.length} assets`)
console.log(`🤖 Robot Systems Data: ${robotSystemsData.length} assets`)
console.log(`🔍 Quality Systems Data: ${qualitySystemsData.length} assets`)
console.log(`📦 Supply Chain Data: ${supplyChainData.length} assets`)
console.log(`📁 Files saved to: public/samples/demo/automotive/`)








