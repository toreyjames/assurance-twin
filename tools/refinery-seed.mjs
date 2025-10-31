import fs from 'node:fs'
import path from 'node:path'

const outDir = path.join(process.cwd(), 'public', 'samples', 'large')
fs.mkdirSync(outDir, { recursive: true })

// REFINERY-FOCUSED DATA GENERATION
// Realistic oil & gas refinery with proper engineering terminology

const refineries = ['Gulf Coast Refinery', 'Texas City Complex', 'Baytown Refinery']
const processUnits = [
  'Crude Distillation Unit (CDU)',
  'Fluid Catalytic Cracking (FCC)', 
  'Hydrocracking Unit (HCU)',
  'Reformer Unit',
  'Alkylation Unit',
  'Coker Unit',
  'Hydrotreater',
  'Isomerization Unit'
]

const deviceTypes = [
  'DCS_Controller', 'Safety_PLC', 'Field_PLC', 'HMI_Station', 
  'Historian_Server', 'VFD', 'Smart_Transmitter', 'Control_Valve',
  'Flow_Computer', 'Analyzer', 'Safety_System', 'Compressor_Controller',
  'Turbine_Controller', 'Tank_Gauging', 'Fire_Gas_System'
]

const oems = ['Emerson DeltaV', 'Honeywell Experion', 'Yokogawa Centum', 'ABB 800xA', 'Schneider Foxboro']
const models = ['DCS-5000', 'PLC-1500', 'SIS-3000', 'HMI-Pro', 'VFD-AC4000', 'Transmitter-3051']

function pickWeighted(items, weights){
  const s = weights.reduce((a,x)=>a+x,0)
  let r = Math.random()*s, i=0
  for(; i<items.length; i++){ if(r < weights[i]) break; r -= weights[i] }
  return items[i]
}

function fmtCSV(rows){
  return rows.map(r=> Object.values(r).map(v => (v==null?'':String(v))).join(',')).join('\n')
}

function randInt(a,b){ return Math.floor(Math.random()*(b-a+1))+a }
function randMac(){ return Array.from({length:6},()=>randInt(0,255).toString(16).padStart(2,'0')).join(':') }
function dateFromMonthsAgo(m){ const d = new Date(); d.setMonth(d.getMonth()-m); return d.toISOString().slice(0,10) }

// Scale up to 1200 devices for realistic refinery
const totalDevices = 1200
const eng = []

for(let i=0; i<totalDevices; i++){
  const refinery = refineries[i % refineries.length]
  const unit = processUnits[i % processUnits.length]
  const deviceType = deviceTypes[i % deviceTypes.length]
  
  // Realistic tag naming convention
  const unitCode = unit.split(' ')[0].substring(0,3).toUpperCase()
  const deviceCode = deviceType.split('_')[0].substring(0,2).toUpperCase()
  const tag = `${unitCode}_${deviceCode}_${String(i).padStart(4,'0')}`
  const loop = `${unitCode}_LOOP_${String(Math.floor(i/10)).padStart(3,'0')}`
  
  // Criticality based on device type
  const criticality = (deviceType.includes('Safety') || deviceType.includes('DCS')) ? 
    pickWeighted(['High','Medium'], [0.8, 0.2]) :
    pickWeighted(['High','Medium','Low'], [0.3, 0.5, 0.2])
  
  eng.push({
    tag_id: tag,
    loop_id: loop,
    unit: unit,
    plant: refinery,
    instrument_type: deviceType,
    criticality: criticality
  })
}

const engHeader = 'tag_id,loop_id,unit,plant,instrument_type,criticality\n'
fs.writeFileSync(path.join(outDir,'engineering.csv'), engHeader + fmtCSV(eng))

// CMMS data with realistic coverage
const cmmsIdx = new Set()
while(cmmsIdx.size < Math.round(0.85*eng.length)) cmmsIdx.add(randInt(0,eng.length-1))

const cmms = []
for(const i of cmmsIdx){
  const e = eng[i]
  // Safety systems get more frequent patches
  const months = (e.criticality==='High' && e.instrument_type.includes('Safety')) ? 
    randInt(6,18) : randInt(12,36)
    
  cmms.push({
    asset_id: `REF_${String(3000+i).padStart(6,'0')}`,
    tag_id: e.tag_id,
    oem: oems[i % oems.length],
    model: models[i % models.length],
    serial: `SN${randInt(100000,999999)}`,
    last_patch: dateFromMonthsAgo(months)
  })
}

const cmmsHeader = 'asset_id,tag_id,oem,model,serial,last_patch\n'
fs.writeFileSync(path.join(outDir,'cmms.csv'), cmmsHeader + fmtCSV(cmms))

// Network data with realistic IP schemes
const netIdxSet = new Set()
while(netIdxSet.size < Math.round(0.65*eng.length)) netIdxSet.add(randInt(0,eng.length-1))

const cmmsByTag = new Map(cmms.map(r=>[r.tag_id,r]))
const net = []

for(const i of netIdxSet){
  const e = eng[i]
  const cm = cmmsByTag.get(e.tag_id)
  const assetId = cm ? cm.asset_id : `NET_${String(4000+i).padStart(6,'0')}`
  
  // Realistic refinery network subnets
  const subnet = e.unit.includes('CDU') ? '10.1' : 
                 e.unit.includes('FCC') ? '10.2' :
                 e.unit.includes('HCU') ? '10.3' : '10.4'
  
  net.push({
    asset_id: assetId,
    ip: `${subnet}.${(i%250)+1}.${(i%200)+10}`,
    mac: randMac(),
    proto: pickWeighted(['TCP','UDP','Modbus'], [0.6,0.3,0.1]),
    last_seen: dateFromMonthsAgo(randInt(0,2)),
    unit: e.unit,
    plant: e.plant
  })
}

// Add orphan devices (rogue assets)
for(let j=0; j<25; j++){
  net.push({
    asset_id: `ORPH_${String(8000+j).padStart(6,'0')}`,
    ip: `10.99.${(j%250)+1}.${(j%200)+10}`,
    mac: randMac(),
    proto: pickWeighted(['TCP','UDP'], [0.7,0.3]),
    last_seen: dateFromMonthsAgo(randInt(0,1)),
    unit: processUnits[j % processUnits.length],
    plant: refineries[j % refineries.length]
  })
}

const netHeader = 'asset_id,ip,mac,proto,last_seen,unit,plant\n'
fs.writeFileSync(path.join(outDir,'network.csv'), netHeader + fmtCSV(net))

// Historian data with realistic process signals
const hist = eng.map((e,i) => ({
  tag_id: e.tag_id,
  plant: e.plant,
  unit: e.unit,
  uptime_pct_30d: (97 + Math.max(-3, Math.min(3, (Math.random()*6-3)))).toFixed(1),
  alarm_count_30d: Math.max(0, Math.round((e.criticality==='High'? 12:6) + (Math.random()*15-7))),
  bad_quality_count_30d: Math.max(0, Math.round(Math.random()*8))
}))

const histHeader = 'tag_id,plant,unit,uptime_pct_30d,alarm_count_30d,bad_quality_count_30d\n'
fs.writeFileSync(path.join(outDir,'historian.csv'), histHeader + fmtCSV(hist))

console.log(`Generated realistic refinery datasets:`)
console.log(`- ${totalDevices} total devices across ${refineries.length} refineries`)
console.log(`- ${processUnits.length} different process units`)
console.log(`- ${deviceTypes.length} device types with proper OT terminology`)
console.log(`- Realistic IP subnetting and asset naming conventions`)
console.log('Files written to public/samples/large/')

