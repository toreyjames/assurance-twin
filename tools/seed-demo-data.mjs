import fs from 'node:fs'
import path from 'node:path'

const outDir = path.join(process.cwd(), 'public', 'samples', 'large')
fs.mkdirSync(outDir, { recursive: true })

const plants = ['Plant1','Plant2','Plant3']
const units = ['U1','U2','U3','U4','U5','U6']
const types = ['PLC','SCADA','HMI','RTU','Historian','Drive','Switch']
const critDist = (t) => (t==='PLC' || t==='SCADA') ? pickWeighted(['High','Medium','Low'], [0.5,0.35,0.15])
                                                   : pickWeighted(['High','Medium','Low'], [0.2,0.5,0.3])

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

// 1) engineering.csv (120)
const eng = []
for(let i=0;i<120;i++){
  const plant = plants[i % plants.length]
  const unit = units[i % units.length]
  const loop = `L${1000+i}`
  const tag = `T${2000+i}`
  const type = types[i % types.length]
  eng.push({
    tag_id: tag,
    loop_id: loop,
    unit,
    plant,
    instrument_type: type,
    criticality: critDist(type)
  })
}
const engHeader = 'tag_id,loop_id,unit,plant,instrument_type,criticality\n'
fs.writeFileSync(path.join(outDir,'engineering.csv'), engHeader + fmtCSV(eng))

// 2) cmms.csv (~85% coverage with last_patch; some outdated)
const cmmsIdx = new Set()
while(cmmsIdx.size < Math.round(0.85*eng.length)) cmmsIdx.add(randInt(0,eng.length-1))
const cmms = []
for(const i of cmmsIdx){
  const e = eng[i]
  const months = (e.criticality==='High' && (e.instrument_type==='PLC'||e.instrument_type==='SCADA') && Math.random()<0.45)
    ? randInt(16,36) : randInt(2,28)
  cmms.push({
    asset_id: `A${3000+i}`,
    tag_id: e.tag_id,
    oem: pickWeighted(['Siemens','Rockwell','Schneider','Honeywell','Emerson'], [0.25,0.25,0.2,0.15,0.15]),
    model: pickWeighted(['A100','S7-300','CompactLogix','Quantum','DeltaV','Iconics'], [0.1,0.25,0.25,0.15,0.15,0.1]),
    serial: `S${randInt(100000,999999)}`,
    last_patch: dateFromMonthsAgo(months)
  })
}
const cmmsHeader = 'asset_id,tag_id,oem,model,serial,last_patch\n'
fs.writeFileSync(path.join(outDir,'cmms.csv'), cmmsHeader + fmtCSV(cmms))

// 3) network.csv (~63% of engineering + 8 orphans)
const netIdxSet = new Set()
while(netIdxSet.size < Math.round(0.63*eng.length)) netIdxSet.add(randInt(0,eng.length-1))
const cmmsByTag = new Map(cmms.map(r=>[r.tag_id,r]))
const net = []
for(const i of netIdxSet){
  const e = eng[i]
  const cm = cmmsByTag.get(e.tag_id)
  const assetId = cm ? cm.asset_id : `N${4000+i}`
  net.push({
    asset_id: assetId,
    ip: `10.${(i%20)+1}.${(i%250)+1}.${(i%200)+10}`,
    mac: randMac(),
    proto: pickWeighted(['TCP','UDP','ICMP'], [0.6,0.35,0.05]),
    last_seen: dateFromMonthsAgo(randInt(0,2)),
    unit: e.unit,
    plant: e.plant
  })
}
// add 8 orphans
for(let j=0;j<8;j++){
  net.push({
    asset_id: `ORPH${8000+j}`,
    ip: `10.${(j%20)+5}.${(j%250)+5}.${(j%200)+50}`,
    mac: randMac(),
    proto: pickWeighted(['TCP','UDP','ICMP'], [0.6,0.35,0.05]),
    last_seen: dateFromMonthsAgo(randInt(0,1)),
    unit: units[j%units.length],
    plant: plants[j%plants.length]
  })
}
const netHeader = 'asset_id,ip,mac,proto,last_seen,unit,plant\n'
fs.writeFileSync(path.join(outDir,'network.csv'), netHeader + fmtCSV(net))

// 4) historian.csv (optional performance signals)
const hist = eng.map((e,i) => ({
  tag_id: e.tag_id,
  plant: e.plant,
  unit: e.unit,
  uptime_pct_30d: (98 + Math.max(-2, Math.min(2, (Math.random()*4-2)))).toFixed(1), // around 98%
  alarm_count_30d: Math.max(0, Math.round((e.criticality==='High'? 8:5) + (Math.random()*10-5))),
  bad_quality_count_30d: Math.max(0, Math.round(Math.random()*6))
}))
const histHeader = 'tag_id,plant,unit,uptime_pct_30d,alarm_count_30d,bad_quality_count_30d\n'
fs.writeFileSync(path.join(outDir,'historian.csv'), histHeader + fmtCSV(hist))

console.log('Seeded large demo CSVs into public/samples/large/')
