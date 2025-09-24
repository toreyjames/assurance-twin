// Create realistic client datasets for AI plant understanding
const fs = require('fs');

console.log('Creating client datasets for AI plant understanding...');

// 1. Asset Hierarchy & Context (What AI needs to understand plant structure)
let assetHierarchy = 'asset_id,asset_name,asset_type,parent_unit,process_function,criticality,business_impact,failure_consequence,location,manufacturer,model\n';

const processUnits = [
  { name: 'CDU', function: 'Crude_Distillation', critical_assets: 120 },
  { name: 'FCC', function: 'Catalytic_Cracking', critical_assets: 95 },
  { name: 'HDS', function: 'Hydrodesulfurization', critical_assets: 80 },
  { name: 'CCR', function: 'Continuous_Catalyst_Regeneration', critical_assets: 65 },
  { name: 'ALKYL', function: 'Alkylation', critical_assets: 55 },
  { name: 'UTILITIES', function: 'Steam_Power_Generation', critical_assets: 85 }
];

const assetTypes = [
  { type: 'PUMP', function: 'Fluid_Transport', criticality: 'High', impact: 'Production_Loss' },
  { type: 'COMPRESSOR', function: 'Gas_Compression', criticality: 'Critical', impact: 'Unit_Shutdown' },
  { type: 'HEAT_EXCHANGER', function: 'Heat_Transfer', criticality: 'Medium', impact: 'Efficiency_Loss' },
  { type: 'REACTOR', function: 'Chemical_Conversion', criticality: 'Critical', impact: 'Product_Quality' },
  { type: 'COLUMN', function: 'Separation', criticality: 'Critical', impact: 'Product_Purity' },
  { type: 'FURNACE', function: 'Heat_Generation', criticality: 'Critical', impact: 'Process_Temperature' },
  { type: 'VALVE_CONTROL', function: 'Flow_Control', criticality: 'High', impact: 'Process_Control' },
  { type: 'ANALYZER', function: 'Quality_Measurement', criticality: 'Medium', impact: 'Product_Specification' }
];

const manufacturers = ['Flowserve', 'Sulzer', 'KSB', 'Grundfos', 'Siemens', 'GE', 'Honeywell', 'Emerson'];

let assetId = 1;
processUnits.forEach(unit => {
  assetTypes.forEach(assetType => {
    const count = Math.floor((unit.critical_assets / assetTypes.length) * (0.8 + Math.random() * 0.4));
    for (let i = 1; i <= count; i++) {
      const manufacturer = manufacturers[Math.floor(Math.random() * manufacturers.length)];
      const model = `${manufacturer}_${assetType.type}_${Math.floor(Math.random() * 999) + 100}`;
      const location = `${unit.name}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 99) + 1}`;
      
      // Business impact based on asset type and unit
      let businessImpact = 'Low';
      let failureConsequence = 'Maintenance_Required';
      
      if (assetType.criticality === 'Critical') {
        businessImpact = Math.random() > 0.5 ? 'Very_High' : 'High';
        failureConsequence = Math.random() > 0.5 ? 'Unit_Shutdown' : 'Production_Impact';
      } else if (assetType.criticality === 'High') {
        businessImpact = Math.random() > 0.3 ? 'High' : 'Medium';
        failureConsequence = Math.random() > 0.4 ? 'Production_Impact' : 'Quality_Impact';
      } else {
        businessImpact = Math.random() > 0.6 ? 'Medium' : 'Low';
        failureConsequence = Math.random() > 0.7 ? 'Quality_Impact' : 'Maintenance_Required';
      }
      
      assetHierarchy += `A${String(assetId).padStart(4, '0')},${unit.name}-${assetType.type}-${String(i).padStart(3, '0')},${assetType.type},${unit.name},${assetType.function},${assetType.criticality},${businessImpact},${failureConsequence},${location},${manufacturer},${model}\n`;
      assetId++;
    }
  });
});

fs.writeFileSync('public/data/asset_hierarchy.csv', assetHierarchy);
console.log(`✅ Generated Asset Hierarchy: ${assetId - 1} assets with business context`);

// 2. Process Connections & Dependencies (How assets relate to each other)
let processConnections = 'upstream_asset,downstream_asset,connection_type,flow_medium,criticality,bypass_available,failure_impact_propagation\n';

// Create realistic process connections
const assets = assetHierarchy.split('\n').slice(1, -1).map(line => {
  const parts = line.split(',');
  return { id: parts[0], name: parts[1], type: parts[2], unit: parts[3] };
});

// Group assets by unit for connections
const assetsByUnit = {};
assets.forEach(asset => {
  if (!assetsByUnit[asset.unit]) assetsByUnit[asset.unit] = [];
  assetsByUnit[asset.unit].push(asset);
});

Object.values(assetsByUnit).forEach(unitAssets => {
  // Create process flow connections within each unit
  for (let i = 0; i < unitAssets.length - 1; i++) {
    const upstream = unitAssets[i];
    const downstream = unitAssets[Math.min(i + 1 + Math.floor(Math.random() * 3), unitAssets.length - 1)];
    
    if (upstream.id !== downstream.id) {
      const connectionTypes = ['Process_Flow', 'Utility_Supply', 'Control_Signal', 'Safety_Interlock'];
      const flowMediums = ['Crude_Oil', 'Refined_Product', 'Steam', 'Cooling_Water', 'Instrument_Air', 'Control_Signal'];
      const connectionType = connectionTypes[Math.floor(Math.random() * connectionTypes.length)];
      const flowMedium = flowMediums[Math.floor(Math.random() * flowMediums.length)];
      const criticality = Math.random() > 0.7 ? 'Critical' : (Math.random() > 0.4 ? 'High' : 'Medium');
      const bypassAvailable = Math.random() > 0.6 ? 'Yes' : 'No';
      const failureImpact = Math.random() > 0.5 ? 'Immediate' : 'Delayed';
      
      processConnections += `${upstream.id},${downstream.id},${connectionType},${flowMedium},${criticality},${bypassAvailable},${failureImpact}\n`;
    }
  }
});

fs.writeFileSync('public/data/process_connections.csv', processConnections);
console.log('✅ Generated Process Connections: Asset interdependencies mapped');

// 3. Operational Context & Performance (What makes assets critical)
let operationalContext = 'asset_id,normal_operating_range,alarm_thresholds,performance_indicators,maintenance_strategy,run_time_hours,last_major_service,next_service_due,operating_efficiency,degradation_rate\n';

assets.forEach(asset => {
  // Generate realistic operational parameters based on asset type
  let normalRange = '';
  let alarmThresholds = '';
  let performanceIndicators = '';
  let maintenanceStrategy = '';
  let efficiency = 85 + Math.random() * 10; // 85-95%
  let degradationRate = 'Normal';
  
  switch (asset.type) {
    case 'PUMP':
      normalRange = `Flow: ${Math.floor(500 + Math.random() * 1000)} GPM, Pressure: ${Math.floor(100 + Math.random() * 200)} PSI`;
      alarmThresholds = 'Flow <400 GPM (Low), Vibration >3.0 mm/s (High)';
      performanceIndicators = 'Flow Rate, Discharge Pressure, Vibration, Bearing Temperature';
      maintenanceStrategy = 'Condition_Based';
      break;
    case 'COMPRESSOR':
      normalRange = `Suction: ${Math.floor(50 + Math.random() * 100)} PSI, Discharge: ${Math.floor(200 + Math.random() * 300)} PSI`;
      alarmThresholds = 'Discharge Pressure >450 PSI (High), Vibration >4.0 mm/s (Critical)';
      performanceIndicators = 'Compression Ratio, Vibration, Temperature, Power Consumption';
      maintenanceStrategy = 'Predictive';
      break;
    case 'HEAT_EXCHANGER':
      normalRange = `Approach Temp: ${Math.floor(10 + Math.random() * 20)}°F, Fouling Factor: <0.002`;
      alarmThresholds = 'Approach Temp >35°F (High), Pressure Drop >50 PSI (High)';
      performanceIndicators = 'Heat Transfer Coefficient, Pressure Drop, Fouling Rate';
      maintenanceStrategy = 'Time_Based';
      break;
    default:
      normalRange = 'Operating within design parameters';
      alarmThresholds = 'Process specific alarms configured';
      performanceIndicators = 'Process Variables, Equipment Health';
      maintenanceStrategy = 'Risk_Based';
  }
  
  const runTimeHours = Math.floor(Math.random() * 50000) + 10000;
  const lastService = new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
  const nextServiceDue = new Date(Date.now() + Math.floor(Math.random() * 180 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
  
  if (runTimeHours > 40000) degradationRate = 'Accelerated';
  else if (runTimeHours > 25000) degradationRate = 'Moderate';
  
  operationalContext += `${asset.id},"${normalRange}","${alarmThresholds}","${performanceIndicators}",${maintenanceStrategy},${runTimeHours},${lastService},${nextServiceDue},${efficiency.toFixed(1)},${degradationRate}\n`;
});

fs.writeFileSync('public/data/operational_context.csv', operationalContext);
console.log('✅ Generated Operational Context: Performance and maintenance intelligence');

console.log('\n🎯 Client datasets created for AI plant understanding:');
console.log('📊 Asset Hierarchy: Business context and criticality');
console.log('🔗 Process Connections: Asset interdependencies');
console.log('⚙️ Operational Context: Performance and maintenance intelligence');
console.log('\nThese datasets enable the canonizer to build a context-aware world model of the plant.');
