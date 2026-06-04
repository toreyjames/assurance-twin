import assert from 'node:assert/strict'
import { createServer } from 'vite'

const server = await createServer({
  logLevel: 'silent',
  server: { middlewareMode: true },
  appType: 'custom'
})

try {
  const { evaluateDoctrine, DOCTRINE_CLAIMS } = await server.ssrLoadModule(
    '/src/lib/core/transportation-doctrine.js'
  )
  const { evaluateReferenceModel } = await server.ssrLoadModule(
    '/src/lib/core/transportation-reference-model.js'
  )
  const { evaluateTransportationMissions } = await server.ssrLoadModule(
    '/src/lib/core/transportation-mission-capability.js'
  )

  // MDOT demo dataset shape
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
    { plant: 'Central District', unit: 'Bridge Systems', area: 'River Bridge', device_type: 'Bridge Controller' },
    { plant: 'Central District', unit: 'Pump Stations', area: 'Underpass Pump Station', device_type: 'Pump Station PLC' },
    { plant: 'Central District', unit: 'Pump Stations', area: 'Underpass Pump Station', device_type: 'HMI Panel' },
    { plant: 'Statewide Traffic Operations', unit: 'DMZ / Remote Access', area: 'Vendor Access', device_type: 'Remote Access Concentrator' }
  ]

  const reference = evaluateReferenceModel(assets)
  const missions = evaluateTransportationMissions(assets)

  const result = evaluateDoctrine({ reference, missions })

  // Should return a non-empty list of crosswalk claims
  assert.ok(Array.isArray(result.claims))
  assert.ok(result.claims.length >= 6, `expected at least 6 claims, got ${result.claims.length}`)
  assert.equal(result.claims.length, DOCTRINE_CLAIMS.length)

  // Every claim has the required surface
  for (const claim of result.claims) {
    assert.ok(claim.id)
    assert.ok(claim.source)
    assert.ok(claim.sourceType)
    assert.ok(['programmatic', 'regulatory', 'engineering', 'cybersecurity'].includes(claim.sourceType))
    assert.ok(claim.declared)
    assert.ok(['confirmed', 'partial', 'unobserved', 'contradicted', 'unknown'].includes(claim.status))
    assert.ok(claim.evidence)
    assert.ok(claim.gap)
  }

  // Summary rollup
  assert.ok(result.summary)
  assert.equal(
    result.summary.confirmed + result.summary.partial + result.summary.unobserved +
    result.summary.contradicted + result.summary.unknown,
    result.claims.length
  )

  // For the MDOT demo we expect mostly partial / confirmed and at least
  // one claim that's confirmed (bridge ops or pump ops, which are hard-anchored).
  const safetyOps = result.claims.find(c => c.id === 'bridge_safety_ops' || c.id === 'pump_flood_monitoring')
  assert.ok(safetyOps)
  assert.equal(safetyOps.status, 'confirmed', `expected ${safetyOps.id} to be confirmed`)

  // FHWA reliability reporting should be partial in the demo (limited detector coverage)
  const reliability = result.claims.find(c => c.id === 'fhwa_pm3_reliability_reporting')
  assert.ok(reliability)
  assert.ok(['partial', 'unobserved'].includes(reliability.status))

  // Statement should be a single defensible sentence
  assert.ok(result.summary.statement.length > 30)
  assert.match(result.summary.statement, /doctrine/i)

  // Empty input must not crash
  const empty = evaluateDoctrine({ reference: evaluateReferenceModel([]), missions: evaluateTransportationMissions([]) })
  assert.ok(Array.isArray(empty.claims))
} finally {
  await server.close()
}
