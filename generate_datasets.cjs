// Generate realistic industrial-scale datasets for Gulf Coast Refinery
const fs = require('fs');

console.log('Generating industrial-scale datasets...');

// 1. OT Network Discovery Data (2,500+ devices)
const plants = ['CDU', 'FCC', 'HDS', 'CCR', 'ALKYL', 'TANK_FARM', 'UTILITIES'];
const deviceTypes = ['PLC', 'RTU', 'HMI', 'HISTORIAN', 'SAFETY_PLC', 'ANALYZER', 'DRIVE', 'SWITCH', 'ROUTER', 'FIREWALL', 'WIRELESS_AP', 'SENSOR_GATEWAY'];
const manufacturers = ['Schneider', 'Rockwell', 'Siemens', 'Emerson', 'Honeywell', 'ABB', 'Yokogawa', 'GE', 'Foxboro', 'Invensys'];
const protocols = ['Modbus_TCP', 'Ethernet_IP', 'Profinet', 'Foundation_Fieldbus', 'HART', 'DNP3', 'IEC_61850', 'OPC_UA', 'Profibus'];
const criticalities = ['Critical', 'High', 'Medium', 'Low'];
const securityZones = ['Level_0_Process', 'Level_1_Control', 'Level_2_Supervision', 'Level_3_Operations', 'DMZ', 'Corporate'];

let otNetworkData = 'asset_id,device_name,device_type,manufacturer,model,ip_address,mac_address,subnet,vlan,protocol,plant_unit,location,criticality,security_zone,firmware_version,last_seen,network_status,patch_level\n';

for (let i = 1; i <= 2500; i++) {
  const assetId = `OT${String(i).padStart(4, '0')}`;
  const plant = plants[Math.floor(Math.random() * plants.length)];
  const deviceType = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
  const manufacturer = manufacturers[Math.floor(Math.random() * manufacturers.length)];
  const model = `${manufacturer}_${deviceType}_${Math.floor(Math.random() * 999) + 100}`;
  
  // Realistic IP addressing by plant
  const plantSubnets = {
    'CDU': '10.1', 'FCC': '10.2', 'HDS': '10.3', 'CCR': '10.4', 
    'ALKYL': '10.5', 'TANK_FARM': '10.6', 'UTILITIES': '10.7'
  };
  const subnet = plantSubnets[plant];
  const ip = `${subnet}.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}`;
  const mac = Array.from({length: 6}, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(':');
  
  const vlan = Math.floor(Math.random() * 4000) + 100;
  const protocol = protocols[Math.floor(Math.random() * protocols.length)];
  const location = `${plant}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 99) + 1}`;
  const criticality = criticalities[Math.floor(Math.random() * criticalities.length)];
  const securityZone = securityZones[Math.floor(Math.random() * securityZones.length)];
  const firmwareVersion = `v${Math.floor(Math.random() * 9) + 1}.${Math.floor(Math.random() * 9)}.${Math.floor(Math.random() * 99)}`;
  
  const lastSeen = new Date(Date.now() - Math.floor(Math.random() * 86400000)).toISOString();
  const networkStatus = Math.random() > 0.95 ? 'Offline' : (Math.random() > 0.85 ? 'Warning' : 'Online');
  const patchLevel = Math.random() > 0.7 ? 'Current' : (Math.random() > 0.3 ? 'Outdated' : 'Critical');
  
  const deviceName = `${plant}-${deviceType}-${String(i).padStart(3, '0')}`;
  
  otNetworkData += `${assetId},${deviceName},${deviceType},${manufacturer},${model},${ip},${mac},${subnet}.0.0/16,${vlan},${protocol},${plant},${location},${criticality},${securityZone},${firmwareVersion},${lastSeen},${networkStatus},${patchLevel}\n`;
}

fs.writeFileSync('public/data/ot_network_discovery.csv', otNetworkData);
console.log('✅ Generated OT Network Discovery: 2,500 devices');

// 2. CMMS Maintenance Data (5,000+ records)
let cmmsData = 'work_order,asset_id,equipment_tag,description,priority,status,created_date,due_date,completed_date,technician,plant_unit,system,maintenance_type,cost_estimate,parts_required,downtime_hours,failure_mode\n';

const maintenanceTypes = ['Preventive', 'Corrective', 'Predictive', 'Emergency', 'Shutdown', 'Inspection'];
const priorities = ['Critical', 'High', 'Medium', 'Low'];
const statuses = ['Open', 'In_Progress', 'Completed', 'Cancelled', 'On_Hold'];
const systems = ['Rotating_Equipment', 'Static_Equipment', 'Instrumentation', 'Electrical', 'Civil_Structural', 'Piping', 'Safety_Systems'];
const failureModes = ['Wear', 'Corrosion', 'Fatigue', 'Vibration', 'Overheating', 'Electrical_Fault', 'Seal_Failure', 'Bearing_Failure', 'Calibration_Drift'];

for (let i = 1; i <= 5000; i++) {
  const workOrder = `WO-2025-${String(i).padStart(6, '0')}`;
  const assetId = `OT${String(Math.floor(Math.random() * 2500) + 1).padStart(4, '0')}`;
  const plant = plants[Math.floor(Math.random() * plants.length)];
  const equipmentTag = `${plant}-${Math.floor(Math.random() * 999) + 100}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
  
  const maintenanceType = maintenanceTypes[Math.floor(Math.random() * maintenanceTypes.length)];
  const priority = priorities[Math.floor(Math.random() * priorities.length)];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  const system = systems[Math.floor(Math.random() * systems.length)];
  const failureMode = failureModes[Math.floor(Math.random() * failureModes.length)];
  
  const createdDate = new Date(Date.now() - Math.floor(Math.random() * 30 * 86400000)).toISOString().split('T')[0];
  const dueDate = new Date(Date.now() + Math.floor(Math.random() * 60 * 86400000)).toISOString().split('T')[0];
  const completedDate = status === 'Completed' ? new Date(Date.now() - Math.floor(Math.random() * 7 * 86400000)).toISOString().split('T')[0] : '';
  
  const technician = `Tech_${Math.floor(Math.random() * 50) + 1}`;
  const costEstimate = Math.floor(Math.random() * 50000) + 1000;
  const partsRequired = Math.random() > 0.6 ? 'Yes' : 'No';
  const downtimeHours = Math.floor(Math.random() * 48);
  
  const descriptions = [
    'Replace mechanical seal', 'Calibrate pressure transmitter', 'Motor bearing replacement', 'Valve actuator repair',
    'Heat exchanger cleaning', 'Pump impeller inspection', 'Control valve maintenance', 'Compressor overhaul',
    'Analyzer calibration', 'Safety valve testing', 'Electrical panel inspection', 'Piping integrity check'
  ];
  const description = descriptions[Math.floor(Math.random() * descriptions.length)];
  
  cmmsData += `${workOrder},${assetId},${equipmentTag},${description},${priority},${status},${createdDate},${dueDate},${completedDate},${technician},${plant},${system},${maintenanceType},${costEstimate},${partsRequired},${downtimeHours},${failureMode}\n`;
}

fs.writeFileSync('public/data/cmms_maintenance.csv', cmmsData);
console.log('✅ Generated CMMS Maintenance: 5,000 records');

// 3. Process Historian Data (10,000+ time series points)
let historianData = 'timestamp,tag_name,value,quality,plant_unit,measurement_type,unit_of_measure,alarm_status,trend_direction\n';

const tagPrefixes = ['FI', 'PI', 'TI', 'LI', 'AI', 'FIC', 'PIC', 'TIC', 'LIC', 'AIC'];
const measurementTypes = ['Flow', 'Pressure', 'Temperature', 'Level', 'Analyzer', 'Vibration', 'Power', 'Speed'];
const unitsOfMeasure = ['GPM', 'PSI', 'DEG_F', 'PERCENT', 'PPM', 'MW', 'RPM', 'MM/S'];
const qualities = ['Good', 'Bad', 'Uncertain', 'Maintenance'];
const alarmStatuses = ['Normal', 'Low', 'High', 'LoLo', 'HiHi'];
const trends = ['Rising', 'Falling', 'Steady', 'Oscillating'];

// Generate 48 hours of data with 5-minute intervals for 50 critical tags
const now = new Date();
for (let tagIndex = 1; tagIndex <= 50; tagIndex++) {
  const plant = plants[Math.floor(Math.random() * plants.length)];
  const tagPrefix = tagPrefixes[Math.floor(Math.random() * tagPrefixes.length)];
  const tagName = `${plant}-${tagPrefix}-${String(tagIndex).padStart(3, '0')}`;
  const measurementType = measurementTypes[Math.floor(Math.random() * measurementTypes.length)];
  const unit = unitsOfMeasure[Math.floor(Math.random() * unitsOfMeasure.length)];
  
  let baseValue = Math.random() * 1000;
  
  for (let timeIndex = 0; timeIndex < 576; timeIndex++) { // 48 hours * 12 (5-min intervals)
    const timestamp = new Date(now.getTime() - (575 - timeIndex) * 5 * 60 * 1000).toISOString();
    
    // Add realistic variation and trends
    baseValue += (Math.random() - 0.5) * baseValue * 0.1;
    baseValue = Math.max(0, baseValue);
    
    const quality = Math.random() > 0.95 ? qualities[Math.floor(Math.random() * 4)] : 'Good';
    const alarmStatus = Math.random() > 0.9 ? alarmStatuses[Math.floor(Math.random() * 5)] : 'Normal';
    const trend = trends[Math.floor(Math.random() * trends.length)];
    
    historianData += `${timestamp},${tagName},${baseValue.toFixed(2)},${quality},${plant},${measurementType},${unit},${alarmStatus},${trend}\n`;
  }
}

fs.writeFileSync('public/data/process_historian.csv', historianData);
console.log('✅ Generated Process Historian: 28,800 time series points');

console.log('\n🏭 Industrial-scale datasets generated successfully!');
console.log('📊 Total records: ~36,300 across 3 data sources');
console.log('🔷 Ready for Deloitte Canonizer ingestion');
