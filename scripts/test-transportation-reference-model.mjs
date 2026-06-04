import assert from 'node:assert/strict'
import { createServer } from 'vite'

const server = await createServer({
  logLevel: 'silent',
  server: { middlewareMode: true },
  appType: 'custom'
})

try {
  const { evaluateReferenceModel } = await server.ssrLoadModule(
    '/src/lib/core/transportation-reference-model.js'
  )

  // Mirrors the MDOT demo dataset shape so we test against real fields the
  // ingest pipeline produces.
  const assets = [
    { plant: 'Statewide Traffic Operations', unit: 'Traffic Management Center', area: 'TMC Core', device_type: 'ATMS Server' },
    { plant: 'Statewide Traffic Operations', unit: 'Traffic Management Center', area: 'TMC Core', device_type: 'SCADA Historian' },
    { plant: 'Statewide Traffic Operations', unit: 'DMZ / Remote Access', area: 'Remote Access', device_type: 'Firewall' },
    { plant: 'Statewide Traffic Operations', unit: 'DMZ / Remote Access', area: 'Remote Access', device_type: 'Jump Host' },
    { plant: 'Statewide Traffic Operations', unit: 'Fiber Backhaul', area: 'Backhaul Core', device_type: 'Core Router' },
    { plant: 'Statewide Traffic Operations', unit: 'Fiber Backhaul', area: 'Backhaul Core', device_type: 'Network Management Server' },
    { plant: 'Southeast District', unit: 'I-96 Corridor', area: 'Intersection 14', device_type: 'Traffic Signal Controller' },
    { plant: 'Southeast District', unit: 'Roadside Cabinets', area: 'Intersection 14', device_type: 'Field Ethernet Switch' },
    { plant: 'Southeast District', unit: 'I-96 Corridor', area: 'MM 145', device_type: 'CCTV Camera' },
    { plant: 'Southeast District', unit: 'I-96 Corridor', area: 'MM 146', device_type: 'Dynamic Message Sign' },
    { plant: 'Southeast District', unit: 'I-96 Corridor', area: 'Ramp Meter 12', device_type: 'Ramp Meter Controller' },
    { plant: 'Southeast District', unit: 'I-96 Corridor', area: 'MM 148', device_type: 'Vehicle Detector Radar' },
    { plant: 'Southeast District', unit: 'Weather / RWIS', area: 'I-96 Weather Site', device_type: 'RWIS Weather Station' },
    { plant: 'North District', unit: 'US-23 Corridor', area: 'Intersection 08', device_type: 'Traffic Signal Controller' },
    { plant: 'North District', unit: 'Roadside Cabinets', area: 'Intersection 08', device_type: 'Cellular Router' },
    { plant: 'North District', unit: 'US-23 Corridor', area: 'MM 66', device_type: 'CCTV Camera' },
    { plant: 'North District', unit: 'US-23 Corridor', area: 'MM 68', device_type: 'Dynamic Message Sign' },
    { plant: 'North District', unit: 'Weigh Stations', area: 'US-23 Weigh Station', device_type: 'Weigh Station Controller' },
    { plant: 'Central District', unit: 'Bridge Systems', area: 'River Bridge', device_type: 'Bridge Controller' },
    { plant: 'Central District', unit: 'Bridge Systems', area: 'River Bridge', device_type: 'CCTV Camera' },
    { plant: 'Central District', unit: 'Pump Stations', area: 'Underpass Pump Station', device_type: 'Pump Station PLC' },
    { plant: 'Central District', unit: 'Pump Stations', area: 'Underpass Pump Station', device_type: 'HMI Panel' },
    { plant: 'Southeast District', unit: 'Roadside Cabinets', area: 'Intersection 14', device_type: 'Cabinet Door Sensor' },
    { plant: 'Southeast District', unit: 'Roadside Cabinets', area: 'Intersection 14', device_type: 'UPS' },
    { plant: 'Statewide Traffic Operations', unit: 'DMZ / Remote Access', area: 'Vendor Access', device_type: 'Remote Access Concentrator' },
    { plant: 'Southeast District', unit: 'I-96 Corridor', area: 'Unknown', device_type: 'CCTV Camera', _status: 'orphan' }
  ]

  const model = evaluateReferenceModel(assets)

  // Declared scope should be derived from observed unit/area structure
  assert.equal(model.declaredScope.tmc, 1, 'should derive 1 TMC')
  assert.equal(model.declaredScope.corridor, 2, 'should derive 2 corridors (I-96, US-23)')
  assert.ok(model.declaredScope.cabinet_zone >= 2, 'should derive at least 2 cabinet zones')
  assert.equal(model.declaredScope.bridge, 1, 'should derive 1 bridge')
  assert.equal(model.declaredScope.pump_station, 1, 'should derive 1 pump station')
  assert.equal(model.declaredScope.rwis_site, 1, 'should derive 1 RWIS site')
  assert.equal(model.declaredScope.weigh_station, 1, 'should derive 1 weigh station')

  // Expected ranges should be meaningfully larger than observed
  assert.ok(model.expected.typical >= 40, `typical expected should be >=40, got ${model.expected.typical}`)
  assert.ok(model.expected.typical <= 200, `typical expected should be <=200, got ${model.expected.typical}`)
  assert.ok(model.expected.low <= model.expected.typical)
  assert.ok(model.expected.high >= model.expected.typical)

  // Observed comparable should reflect demo's ~26 modeled-class assets
  assert.ok(model.observed.comparable >= 20, `observed >= 20, got ${model.observed.comparable}`)
  assert.ok(model.observed.comparable <= 30, `observed <= 30, got ${model.observed.comparable}`)

  // Shadow estimate
  assert.ok(model.shadow.typical >= 15, `shadow typical >= 15, got ${model.shadow.typical}`)
  assert.ok(['material', 'modest', 'minimal'].includes(model.shadow.severity))
  assert.ok(model.shadow.statement && typeof model.shadow.statement === 'string')

  // Per-class gap entries must exist for the device classes we expect short
  const gapByClass = Object.fromEntries(model.perClass.map(g => [g.id, g]))
  assert.ok(gapByClass.cctv, 'CCTV should appear in per-class gap')
  assert.ok(gapByClass.signal_controller, 'signal controller should appear in per-class gap')
  assert.ok(gapByClass.field_switch, 'field switch should appear in per-class gap')

  // Each per-class entry carries an evidence basis (hard/mission/statistical/etc)
  for (const entry of model.perClass) {
    assert.ok(entry.basis, `entry ${entry.id} missing basis`)
    assert.ok(['hard', 'mission', 'statistical', 'programmatic', 'regulatory'].includes(entry.basis))
    assert.ok(typeof entry.observed === 'number')
    assert.ok(typeof entry.expectedTypical === 'number')
  }

  // Confidence statement should be a defensible plain-English sentence
  assert.ok(model.confidence.statement.length > 30)
  assert.match(model.confidence.statement, /declared scope/i)

  // Empty input should not crash and should return a 'no scope' signal
  const empty = evaluateReferenceModel([])
  assert.equal(empty.declaredScope.tmc, 0)
  assert.equal(empty.expected.typical, 0)
  assert.equal(empty.shadow.severity, 'unknown')
} finally {
  await server.close()
}
