#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

// Utility functions
const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = (arr) => arr[random(0, arr.length - 1)];
const randomBoolean = (truePercent = 50) => Math.random() * 100 < truePercent;

// Data pools
const manufacturers = {
  tier1: ['Siemens', 'Allen-Bradley', 'Schneider', 'Honeywell', 'Emerson', 'ABB', 'Yokogawa', 'GE', 'Unknown'],
  tier2: ['Rosemount', 'Emerson', 'Endress+Hauser', 'Yokogawa', 'ABB', 'Siemens', 'Schneider', 'Unknown'],
  tier3: ['Rosemount', 'Emerson', 'Fisher', 'Yokogawa', 'Unknown', 'Generic']
};

const deviceTypes = {
  tier1: ['PLC', 'DCS', 'HMI', 'SCADA', 'RTU', 'Controller', 'Historian', 'Engineering_Workstation', 'Server'],
  tier2: ['Smart_Transmitter', 'Analyzer', 'VFD', 'IP_Camera', 'Switch', 'Gateway', 'Protocol_Converter', 'Safety_Controller'],
  tier3: ['Pressure_Transmitter', 'Temperature_Transmitter', 'Flow_Transmitter', 'Level_Transmitter', '4-20mA', 'Analog_Valve', 'Control_Valve', 'Thermocouple', 'Pressure_Sensor']
};

const processUnits = [
  'Crude Distillation Unit',
  'Fluid Catalytic Cracking',
  'Hydrocracker',
  'Reformer',
  'Alkylation',
  'Coker Unit',
  'Hydrotreater',
  'Isomerization',
  'Utilities',
  'Tank Farm',
  'Loading',
  'Control Room'
];

const plants = ['Gulf Coast Refinery', 'Midwest Refinery', 'West Coast Refinery'];

const firmwareVersions = [
  'v1.2.3', 'v2.8.1', 'v2.8.3', 'v3.1.0', 'v4.5.2', 'v5.0', 'R4.03', 'R511.5', 
  'v20.19', 'v21.11', 'v14.3', 'v16.0', 'Unknown'
];

// Generate engineering baseline
function generateEngineering(count, siteCount = 1) {
  const assets = [];
  const plantsToUse = plants.slice(0, siteCount);
  
  // Calculate tier distribution (5% Tier 1, 30% Tier 2, 65% Tier 3)
  const tier1Count = Math.floor(count * 0.05);
  const tier2Count = Math.floor(count * 0.30);
  const tier3Count = count - tier1Count - tier2Count;
  
  let id = 1;
  
  // Generate Tier 1 (Critical Network Assets)
  for (let i = 0; i < tier1Count; i++) {
    const plant = randomChoice(plantsToUse);
    const unit = randomChoice(processUnits);
    const deviceType = randomChoice(deviceTypes.tier1);
    const manufacturer = randomChoice(manufacturers.tier1);
    const hasIP = randomBoolean(75); // 75% have IP (more realistic for modern control systems)
    const hasHostname = randomBoolean(60); // 60% have hostname
    
    const tagPrefix = deviceType === 'PLC' ? 'PLC' :
                     deviceType === 'DCS' ? 'DCS' :
                     deviceType === 'HMI' ? 'HMI' :
                     deviceType === 'RTU' ? 'RTU' : 'DEV';
    
    assets.push({
      tag_id: `${tagPrefix}-${unit.substring(0, 3).toUpperCase()}-${String(id).padStart(3, '0')}`,
      plant,
      unit,
      device_type: deviceType,
      manufacturer: manufacturer === 'Unknown' ? '' : manufacturer,
      model: manufacturer === 'Unknown' ? '' : `Model-${random(1000, 9999)}`,
      ip_address: hasIP ? `192.168.${random(10, 250)}.${random(10, 250)}` : '',
      hostname: hasHostname ? `${tagPrefix}-${String(id).padStart(3, '0')}` : ''
    });
    id++;
  }
  
  // Generate Tier 2 (Smart/Networkable)
  for (let i = 0; i < tier2Count; i++) {
    const plant = randomChoice(plantsToUse);
    const unit = randomChoice(processUnits);
    const deviceType = randomChoice(deviceTypes.tier2);
    const manufacturer = randomChoice(manufacturers.tier2);
    const hasIP = randomBoolean(55); // 55% have IP (smart devices are increasingly IP-enabled)
    const hasHostname = randomBoolean(45); // 45% have hostname
    
    assets.push({
      tag_id: `${deviceType.substring(0, 4).toUpperCase()}-${String(id).padStart(4, '0')}`,
      plant,
      unit,
      device_type: deviceType,
      manufacturer: manufacturer === 'Unknown' ? '' : manufacturer,
      model: manufacturer === 'Unknown' ? '' : `${deviceType}-${random(100, 999)}`,
      ip_address: hasIP ? `192.168.${random(10, 250)}.${random(10, 250)}` : '',
      hostname: hasHostname ? `${deviceType.substring(0, 4)}-${String(id).padStart(4, '0')}` : ''
    });
    id++;
  }
  
  // Generate Tier 3 (Passive/Analog)
  for (let i = 0; i < tier3Count; i++) {
    const plant = randomChoice(plantsToUse);
    const unit = randomChoice(processUnits);
    const deviceType = randomChoice(deviceTypes.tier3);
    const manufacturer = randomChoice(manufacturers.tier3);
    
    assets.push({
      tag_id: `XMTR-${String(id).padStart(5, '0')}`,
      plant,
      unit,
      device_type: deviceType,
      manufacturer: manufacturer === 'Unknown' || manufacturer === 'Generic' ? '' : manufacturer,
      model: '',
      ip_address: '',
      hostname: ''
    });
    id++;
  }
  
  return assets;
}

// Generate OT discovery data
function generateDiscovery(engineeringAssets, coveragePercent = 0.67) {
  const discovered = [];
  
  // Get all networkable assets (Tier 1 + Tier 2)
  const networkableAssets = engineeringAssets.filter(a => 
    deviceTypes.tier1.includes(a.device_type) || 
    deviceTypes.tier2.includes(a.device_type)
  ).filter(a => a.ip_address); // Only those with IPs can be discovered
  
  // Calculate how many to discover
  const discoverCount = Math.floor(networkableAssets.length * coveragePercent);
  
  // Shuffle and take subset
  const shuffled = networkableAssets.sort(() => Math.random() - 0.5);
  const toDiscover = shuffled.slice(0, discoverCount);
  
  // Generate discovery records
  toDiscover.forEach((asset, idx) => {
    const isTier1 = deviceTypes.tier1.includes(asset.device_type);
    const isManaged = isTier1 ? randomBoolean(95) : randomBoolean(75); // VERY high for mature OT program (40-45% overall)
    const hasPatches = isManaged ? randomBoolean(92) : false;
    const vulnCount = isManaged ? random(0, 3) : random(2, 12);
    const cveCount = vulnCount > 0 ? random(0, Math.floor(vulnCount * 0.6)) : 0;
    
    const daysAgo = random(0, 7);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    
    discovered.push({
      ip_address: asset.ip_address,
      hostname: asset.hostname || (randomBoolean(60) ? `DEVICE-${asset.ip_address.replace(/\./g, '-')}` : ''),
      mac_address: `${random(10, 99).toString(16)}:${random(10, 99).toString(16)}:${random(10, 99).toString(16)}:${random(10, 99).toString(16)}:${random(10, 99).toString(16)}:${random(10, 99).toString(16)}`.toUpperCase(),
      device_type: asset.device_type === 'Unknown' ? 'Unknown' : asset.device_type,
      manufacturer: asset.manufacturer || (randomBoolean(30) ? 'Unknown' : 'Generic'),
      model: asset.model || 'Unknown',
      is_managed: isManaged,
      has_security_patches: hasPatches,
      encryption_enabled: isTier1 ? randomBoolean(40) : randomBoolean(10),
      authentication_required: isTier1 ? randomBoolean(80) : randomBoolean(30),
      firewall_protected: randomBoolean(70),
      access_control: isManaged ? (randomBoolean(60) ? 'Role-Based' : 'Basic') : 'None',
      vulnerabilities: vulnCount,
      cve_count: cveCount,
      last_seen: date.toISOString().split('T')[0],
      confidence_level: random(60, 100),
      firmware_version: randomChoice(firmwareVersions),
      protocol: isTier1 ? randomChoice(['Profinet', 'EtherNet/IP', 'Modbus TCP', 'Proprietary']) : 
                           randomChoice(['Modbus TCP', 'HART-IP', 'BACnet', 'Unknown'])
    });
  });
  
  // Add some orphan devices (discovered but not in engineering)
  const orphanCount = Math.floor(discovered.length * 0.08); // 8% orphans
  for (let i = 0; i < orphanCount; i++) {
    const ip = `192.168.${random(50, 99)}.${random(10, 250)}`;
    const isContractor = randomBoolean(30);
    
    discovered.push({
      ip_address: ip,
      hostname: isContractor ? `CONTRACTOR-${random(1, 99)}` : '',
      mac_address: `${random(10, 99).toString(16)}:${random(10, 99).toString(16)}:${random(10, 99).toString(16)}:${random(10, 99).toString(16)}:${random(10, 99).toString(16)}:${random(10, 99).toString(16)}`.toUpperCase(),
      device_type: 'Unknown',
      manufacturer: 'Unknown',
      model: 'Unknown',
      is_managed: false,
      has_security_patches: false,
      encryption_enabled: false,
      authentication_required: false,
      firewall_protected: false,
      access_control: 'None',
      vulnerabilities: isContractor ? random(10, 25) : random(0, 5),
      cve_count: isContractor ? random(5, 15) : random(0, 3),
      last_seen: new Date(Date.now() - random(1, 60) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      confidence_level: random(25, 50),
      firmware_version: 'Unknown',
      protocol: 'Unknown'
    });
  }
  
  return discovered;
}

// Convert to CSV
function toCSV(data, headers) {
  const rows = [headers.join(',')];
  data.forEach(obj => {
    const values = headers.map(h => {
      const val = obj[h];
      if (val === undefined || val === null || val === '') return '';
      if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
      return val;
    });
    rows.push(values.join(','));
  });
  return rows.join('\n');
}

// Main generation function
function generateDataset(name, engineeringCount, siteCount = 1) {
  console.log(`Generating ${name}...`);
  console.log(`  Engineering assets: ${engineeringCount}`);
  
  const engineering = generateEngineering(engineeringCount, siteCount);
  const discovery = generateDiscovery(engineering);
  
  console.log(`  Discovered devices: ${discovery.length}`);
  console.log(`  Coverage: ${Math.round((discovery.length / engineering.filter(a => a.ip_address).length) * 100)}%`);
  
  const dir = path.join(process.cwd(), '..', 'public', 'samples', 'demo', 'oil-gas');
  
  // Write engineering baseline
  const engHeaders = ['tag_id', 'plant', 'unit', 'device_type', 'manufacturer', 'model', 'ip_address', 'hostname'];
  const engCSV = toCSV(engineering, engHeaders);
  fs.writeFileSync(path.join(dir, `engineering_baseline_${name}.csv`), engCSV);
  
  // Write OT discovery
  const discHeaders = ['ip_address', 'hostname', 'mac_address', 'device_type', 'manufacturer', 'model', 
                       'is_managed', 'has_security_patches', 'encryption_enabled', 'authentication_required', 
                       'firewall_protected', 'access_control', 'vulnerabilities', 'cve_count', 'last_seen', 
                       'confidence_level', 'firmware_version', 'protocol'];
  const discCSV = toCSV(discovery, discHeaders);
  fs.writeFileSync(path.join(dir, `ot_discovery_${name}.csv`), discCSV);
  
  console.log(`✓ Generated ${name}\n`);
}

// Generate all three datasets with custom coverage
console.log('Generating realistic OT datasets...\n');

// Demo - small for testing
const demoEngineering = generateEngineering(500, 1);
const demoDiscovery = generateDiscovery(demoEngineering, 0.35); // 35% discovery coverage
console.log('Generating demo...');
console.log(`  Engineering assets: 500`);
console.log(`  Discovered devices: ${demoDiscovery.length}`);
console.log(`  Coverage: ${Math.round((demoDiscovery.length / demoEngineering.filter(a => a.ip_address).length) * 100)}%\n`);

const dir = path.join(process.cwd(), '..', 'public', 'samples', 'demo', 'oil-gas');
const engHeaders = ['tag_id', 'plant', 'unit', 'device_type', 'manufacturer', 'model', 'ip_address', 'hostname'];
const discHeaders = ['ip_address', 'hostname', 'mac_address', 'device_type', 'manufacturer', 'model', 
                     'is_managed', 'has_security_patches', 'encryption_enabled', 'authentication_required', 
                     'firewall_protected', 'access_control', 'vulnerabilities', 'cve_count', 'last_seen', 
                     'confidence_level', 'firmware_version', 'protocol'];

fs.writeFileSync(path.join(dir, `engineering_baseline_demo.csv`), toCSV(demoEngineering, engHeaders));
fs.writeFileSync(path.join(dir, `ot_discovery_demo.csv`), toCSV(demoDiscovery, discHeaders));
console.log(`✓ Generated demo\n`);

// Medium - REALISTIC for Vercel Pro (12,000 assets)
const mediumEngineering = generateEngineering(12000, 1);
const mediumDiscovery = generateDiscovery(mediumEngineering, 0.42); // 42% discovery coverage = realistic
console.log('Generating medium...');
console.log(`  Engineering assets: 12000`);
console.log(`  Discovered devices: ${mediumDiscovery.length}`);
console.log(`  Coverage: ${Math.round((mediumDiscovery.length / mediumEngineering.filter(a => a.ip_address).length) * 100)}%\n`);

fs.writeFileSync(path.join(dir, `engineering_baseline_medium.csv`), toCSV(mediumEngineering, engHeaders));
fs.writeFileSync(path.join(dir, `ot_discovery_medium.csv`), toCSV(mediumDiscovery, discHeaders));
console.log(`✓ Generated medium\n`);

// Enterprise - Large multi-site (local only, too big for Vercel)
const enterpriseEngineering = generateEngineering(25000, 3);
const enterpriseDiscovery = generateDiscovery(enterpriseEngineering, 0.45); // 45% discovery coverage
console.log('Generating enterprise...');
console.log(`  Engineering assets: 25000`);
console.log(`  Discovered devices: ${enterpriseDiscovery.length}`);
console.log(`  Coverage: ${Math.round((enterpriseDiscovery.length / enterpriseEngineering.filter(a => a.ip_address).length) * 100)}%\n`);

fs.writeFileSync(path.join(dir, `engineering_baseline_enterprise.csv`), toCSV(enterpriseEngineering, engHeaders));
fs.writeFileSync(path.join(dir, `ot_discovery_enterprise.csv`), toCSV(enterpriseDiscovery, discHeaders));
console.log(`✓ Generated enterprise\n`);

console.log('✓ All datasets generated successfully!');

