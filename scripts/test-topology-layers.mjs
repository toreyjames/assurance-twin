import assert from 'node:assert/strict'
import { createServer } from 'vite'

const server = await createServer({
  logLevel: 'silent',
  server: { middlewareMode: true },
  appType: 'custom'
})

try {
  const { evaluateLayeredTopology } = await server.ssrLoadModule(
    '/src/lib/core/topology-layers.js'
  )

  // Mirrors the DOT demo dataset shape so we test the real classification.
  const dotAssets = [
    { device_type: 'ATMS Server', _status: 'matched' },
    { device_type: 'SCADA Historian', _status: 'matched' },
    { device_type: 'Network Management Server', _status: 'matched' },
    { device_type: 'Core Router', _status: 'matched' },
    { device_type: 'Field Ethernet Switch', _status: 'matched' },
    { device_type: 'Cellular Router', _status: 'matched' },
    { device_type: 'Firewall', _status: 'matched' },
    { device_type: 'Traffic Signal Controller', _status: 'matched' },
    { device_type: 'Ramp Meter Controller', _status: 'matched' },
    { device_type: 'CCTV Camera', _status: 'matched' },
    { device_type: 'Dynamic Message Sign', _status: 'matched' },
    { device_type: 'RWIS Weather Station', _status: 'matched' },
    { device_type: 'Vehicle Detector Radar', _status: 'matched' },
    { device_type: 'UPS', _status: 'matched' },
    { device_type: 'Bridge Controller', _status: 'matched' },
    { device_type: 'Pump Station PLC', _status: 'matched' },
    { device_type: 'HMI Panel', _status: 'matched' },
    { device_type: 'Jump Host', _status: 'matched' },
    { device_type: 'Remote Access Concentrator', _status: 'matched' },
    { device_type: 'CCTV Camera', _status: 'orphan' },
    { device_type: 'Cabinet Door Sensor', _status: 'blind_spot' }
  ]

  const dot = evaluateLayeredTopology(dotAssets, 'transportation')

  // DOT model has five operational layers, in operator-friendly order.
  assert.equal(dot.industry, 'transportation')
  assert.equal(dot.layers.length, 5)
  const ids = dot.layers.map(l => l.id)
  assert.deepEqual(ids, ['operations', 'communications', 'field', 'safety', 'vendor'])

  const operations = dot.layers.find(l => l.id === 'operations')
  assert.equal(operations.label, 'Operations (TMC)')
  assert.ok(operations.assets >= 3, 'Operations should include ATMS + Historian + NMS')
  assert.ok(Array.isArray(operations.missions))
  assert.ok(operations.missions.length > 0)

  const field = dot.layers.find(l => l.id === 'field')
  assert.ok(field.assets >= 6, 'Field layer should include signal/cctv/dms/rwis/detector/ramp')
  assert.ok(field.orphans >= 1, 'Field layer should pick up the orphan camera')
  assert.ok(field.blindSpots >= 1, 'Field layer should pick up the blind cabinet sensor')

  const vendor = dot.layers.find(l => l.id === 'vendor')
  assert.ok(vendor.assets >= 2, 'Vendor layer should include jump host and VPN')

  const safety = dot.layers.find(l => l.id === 'safety')
  assert.ok(safety.assets >= 2, 'Safety layer should include bridge controller and pump PLC')

  // Each layer must carry an epistemic confidence label.
  for (const layer of dot.layers) {
    assert.ok(layer.confidence, `Layer ${layer.id} missing confidence`)
    assert.ok(layer.confidence.status, `Layer ${layer.id} missing confidence.status`)
    assert.ok(layer.confidence.label, `Layer ${layer.id} missing confidence.label`)
  }

  // Default (non-transportation) industry falls back to Purdue model.
  const purdue = evaluateLayeredTopology(
    [
      { device_type: 'PLC', _status: 'matched', ontology: { layer: 'L1' } },
      { device_type: 'Historian', _status: 'matched', ontology: { layer: 'L3' } }
    ],
    'oil-gas'
  )
  assert.equal(purdue.industry, 'oil-gas')
  assert.equal(purdue.model, 'purdue')
  assert.ok(purdue.layers.length >= 5, 'Purdue should preserve L0-L3.5 layers')
} finally {
  await server.close()
}
