import assert from 'node:assert/strict'
import { createServer } from 'vite'

const server = await createServer({
  logLevel: 'silent',
  server: { middlewareMode: true },
  appType: 'custom'
})

try {
  const { evaluateTransportationMissions } = await server.ssrLoadModule(
    '/src/lib/core/transportation-mission-capability.js'
  )

  const assets = [
    { device_type: 'ATMS Server', unit: 'Traffic Management Center', _status: 'matched' },
    { device_type: 'Historian', unit: 'Traffic Management Center', _status: 'matched' },
    { device_type: 'CCTV Camera', unit: 'I-96 Corridor', _status: 'matched' },
    { device_type: 'Vehicle Detector', unit: 'I-96 Corridor', _status: 'matched' },
    { device_type: 'Field Ethernet Switch', unit: 'Roadside Cabinets', _status: 'matched' },
    { device_type: 'Cellular Router', unit: 'Roadside Cabinets', _status: 'matched' },
    { device_type: 'Bridge Controller', unit: 'Bridge Systems', _status: 'matched' }
  ]

  const model = evaluateTransportationMissions(assets)

  assert.equal(model.summary.total, 8)
  assert.equal(model.confidence.inventory.label, 'Sample-scale evidence')
  assert.equal(model.confidence.inventory.status, 'sample')
  assert.equal(model.confidence.mission.status, 'limited')
  assert.match(model.confidence.statement, /sample evidence/i)
  assert.match(model.confidence.statement, /mission/i)
} finally {
  await server.close()
}

