/**
 * Layered topology models per industry.
 *
 * Different operating environments have different "stacks". Process industries
 * (oil & gas, utilities, pharma, chemicals) read naturally as a Purdue
 * hierarchy. Transportation/DOT is fundamentally distributed: a TMC brain, a
 * communications spine, field operations, safety-critical structures, and a
 * vendor / remote-access perimeter. Forcing a DOT into Purdue makes the model
 * feel alien to operators.
 *
 * This module exposes a single entry point - evaluateLayeredTopology - that
 * returns the right layered model for the supplied industry, with each layer
 * carrying both an evidence count and an epistemic confidence label.
 */

// -----------------------------------------------------------------------------
// Shared helpers
// -----------------------------------------------------------------------------

function deviceText(asset) {
  return String(
    asset?.device_type ||
      asset?.ontology?.deviceClass?.label ||
      asset?.tag_id ||
      ''
  ).toLowerCase()
}

function statusOf(asset) {
  return asset?._status || asset?.match_type || asset?.matchType || 'matched'
}

function bumpCounts(bucket, asset) {
  bucket.assets += 1
  const status = statusOf(asset)
  if (status === 'blind_spot') bucket.blindSpots += 1
  else if (status === 'orphan') bucket.orphans += 1
  else bucket.matched += 1
}

function emptyBucket() {
  return { assets: 0, matched: 0, blindSpots: 0, orphans: 0 }
}

function classifyByPatterns(assets, patterns) {
  const matches = []
  for (const asset of assets) {
    const text = deviceText(asset)
    if (patterns.some(re => re.test(text))) matches.push(asset)
  }
  return matches
}

// -----------------------------------------------------------------------------
// Confidence scoring
// -----------------------------------------------------------------------------

/**
 * Per-layer confidence labels intentionally mirror the vocabulary used in the
 * mission capability layer so the demo carries one consistent epistemology
 * across the product.
 */
function confidenceFor(bucket) {
  const documented = bucket.matched + bucket.blindSpots
  const coveragePct = documented > 0 ? Math.round((bucket.matched / documented) * 100) : 0

  if (bucket.assets === 0) {
    return {
      status: 'absent',
      label: 'No evidence',
      coveragePct: 0,
      note: 'No assets observed for this layer.'
    }
  }

  if (bucket.matched === 0 && bucket.blindSpots > 0 && bucket.orphans === 0) {
    return {
      status: 'expected_missing',
      label: 'Documented but unobserved',
      coveragePct,
      note: 'Documented in baseline but not seen on the network.'
    }
  }

  if (bucket.matched === 0 && bucket.orphans > 0) {
    return {
      status: 'observed_unexpected',
      label: 'Observed but undocumented',
      coveragePct,
      note: 'Discovered on the network but not in engineering baseline.'
    }
  }

  if (bucket.assets <= 2) {
    return {
      status: 'sample',
      label: 'Sample-scale evidence',
      coveragePct,
      note: 'Too few assets to assert layer-wide completeness.'
    }
  }

  if (coveragePct >= 80) {
    return {
      status: 'cross_validated',
      label: 'Cross-validated',
      coveragePct,
      note: 'Engineering and discovery agree across the layer.'
    }
  }
  if (coveragePct >= 50) {
    return {
      status: 'supported',
      label: 'Supported',
      coveragePct,
      note: 'Most documented assets observed; some reconciliation gaps remain.'
    }
  }
  return {
    status: 'limited',
    label: 'Limited evidence',
    coveragePct,
    note: 'Significant reconciliation gap between baseline and discovery.'
  }
}

// -----------------------------------------------------------------------------
// Transportation / DOT layer model
// -----------------------------------------------------------------------------

const DOT_LAYERS = [
  {
    id: 'operations',
    label: 'Operations (TMC)',
    description: 'Traffic Management Center brain — situational awareness, control, telemetry, and identity.',
    queryHint: 'atms historian network management identity',
    missions: [
      'Real-time surveillance',
      'Traveler information',
      'Signal coordination',
      'Incident response',
      'Road weather response'
    ],
    patterns: [
      /atms/i,
      /traffic management/i,
      /historian/i,
      /\bnms\b/i,
      /network management/i,
      /domain controller/i,
      /\bidentity\b/i
    ]
  },
  {
    id: 'communications',
    label: 'Communications',
    description: 'Network spine that links the TMC to field cabinets — fiber backhaul, switches, cellular failover, perimeter firewalls.',
    queryHint: 'router switch cellular firewall',
    missions: [
      'All field-dependent missions',
      'Remote access governance'
    ],
    patterns: [
      /core router/i,
      /distribution switch/i,
      /field ethernet switch/i,
      /field switch/i,
      /\bswitch\b/i,
      /cellular router/i,
      /\brouter\b/i,
      /firewall/i,
      /serial gateway/i
    ]
  },
  {
    id: 'field',
    label: 'Field Operations',
    description: 'Roadside ITS devices that sense the network and act on it — signals, cameras, message signs, weather, detection.',
    queryHint: 'signal controller cctv dms detector ramp meter rwis ups cabinet',
    missions: [
      'Real-time surveillance',
      'Traveler information',
      'Signal coordination',
      'Road weather response',
      'Incident response'
    ],
    patterns: [
      /signal controller/i,
      /ramp meter/i,
      /cctv/i,
      /\bcamera\b/i,
      /dynamic message sign/i,
      /\bdms\b/i,
      /detector/i,
      /radar/i,
      /rwis/i,
      /weather station/i,
      /weigh station/i,
      /cabinet door sensor/i,
      /\bups\b/i
    ]
  },
  {
    id: 'safety',
    label: 'Safety / Structures',
    description: 'High-consequence cyber-physical systems — bridges, tunnels, pump stations and their local HMIs.',
    queryHint: 'bridge pump tunnel hmi',
    missions: [
      'Bridge operations',
      'Pump flood control'
    ],
    patterns: [
      /bridge controller/i,
      /pump station plc/i,
      /pump plc/i,
      /tunnel/i,
      /hmi panel/i
    ]
  },
  {
    id: 'vendor',
    label: 'Vendor / Remote Access',
    description: 'External access surface — vendor jump hosts, VPN concentrators, contractor and local-agency interfaces.',
    queryHint: 'jump vpn remote access concentrator vendor',
    missions: [
      'Remote access governance',
      'Risk surface for all missions'
    ],
    patterns: [
      /jump host/i,
      /\bjump\b/i,
      /\bvpn\b/i,
      /remote access/i,
      /concentrator/i,
      /vendor/i
    ]
  }
]

function evaluateDotTopology(assets) {
  const layers = DOT_LAYERS.map(definition => {
    const matched = classifyByPatterns(assets, definition.patterns)
    const bucket = emptyBucket()
    for (const asset of matched) bumpCounts(bucket, asset)
    return {
      id: definition.id,
      label: definition.label,
      description: definition.description,
      missions: definition.missions,
      queryHint: definition.queryHint,
      ...bucket,
      confidence: confidenceFor(bucket)
    }
  })

  return {
    industry: 'transportation',
    model: 'dot-operational',
    assetsTotal: assets.length,
    layers
  }
}

// -----------------------------------------------------------------------------
// Default Purdue model (process industries)
// -----------------------------------------------------------------------------

const PURDUE_LAYERS = [
  {
    id: 'L3_5',
    label: 'Level 3.5 DMZ / Boundary',
    description: 'OT/IT boundary — firewalls, gateways, jump hosts at the DMZ.',
    queryHint: 'firewall gateway dmz',
    layerKey: 'L3_5',
    fallbackTier: null
  },
  {
    id: 'L3',
    label: 'Level 3 Site Operations',
    description: 'Site operations — historian, MES, engineering workstations.',
    queryHint: 'historian mes server',
    layerKey: 'L3',
    fallbackTier: null
  },
  {
    id: 'L2',
    label: 'Level 2 Supervisory',
    description: 'Supervisory control — HMI, SCADA, engineering workstations.',
    queryHint: 'hmi scada workstation',
    layerKey: 'L2',
    fallbackTier: 2
  },
  {
    id: 'L1',
    label: 'Level 1 Basic Control',
    description: 'Basic control — PLC, DCS, controllers.',
    queryHint: 'plc dcs controller',
    layerKey: 'L1',
    fallbackTier: 1
  },
  {
    id: 'L0',
    label: 'Level 0 Process',
    description: 'Process — sensors, actuators, analyzers.',
    queryHint: 'sensor actuator analyzer',
    layerKey: 'L0',
    fallbackTier: 3
  }
]

function purdueLayerFor(asset) {
  if (asset?.ontology?.layer) return asset.ontology.layer
  const tier = asset?.classification?.tier
  if (tier === 1) return 'L1'
  if (tier === 2) return 'L2'
  return 'L0'
}

function evaluatePurdueTopology(assets, industry) {
  const buckets = new Map()
  for (const def of PURDUE_LAYERS) buckets.set(def.layerKey, emptyBucket())

  for (const asset of assets) {
    const key = purdueLayerFor(asset)
    const bucket = buckets.get(key)
    if (!bucket) continue
    bumpCounts(bucket, asset)
  }

  const layers = PURDUE_LAYERS.map(def => {
    const bucket = buckets.get(def.layerKey)
    return {
      id: def.id,
      label: def.label,
      description: def.description,
      missions: [],
      queryHint: def.queryHint,
      ...bucket,
      confidence: confidenceFor(bucket)
    }
  })

  return {
    industry,
    model: 'purdue',
    assetsTotal: assets.length,
    layers
  }
}

// -----------------------------------------------------------------------------
// Public entry point
// -----------------------------------------------------------------------------

export function evaluateLayeredTopology(assets, industry) {
  const safe = Array.isArray(assets) ? assets : []
  if (industry === 'transportation') return evaluateDotTopology(safe)
  return evaluatePurdueTopology(safe, industry)
}
