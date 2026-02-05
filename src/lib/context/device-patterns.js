/**
 * DEVICE PATTERNS
 * Tag naming conventions and patterns for inferring device context
 * 
 * Based on ISA-5.1 and industry-standard tag naming conventions
 * Used by Context tier to understand what each device IS and what it DOES
 */

// =============================================================================
// ISA TAG PATTERNS - Standard instrument letter codes
// =============================================================================

export const ISA_FIRST_LETTER = {
  // Measured/Initiating Variables
  'A': { variable: 'analysis', description: 'Composition, concentration' },
  'B': { variable: 'burner', description: 'Burner, combustion' },
  'C': { variable: 'conductivity', description: 'User choice (often conductivity)' },
  'D': { variable: 'density', description: 'Density, specific gravity' },
  'E': { variable: 'voltage', description: 'Voltage, EMF' },
  'F': { variable: 'flow', description: 'Flow rate' },
  'G': { variable: 'gauging', description: 'Gaging, position' },
  'H': { variable: 'hand', description: 'Hand, manual' },
  'I': { variable: 'current', description: 'Current, electrical' },
  'J': { variable: 'power', description: 'Power' },
  'K': { variable: 'time', description: 'Time, schedule' },
  'L': { variable: 'level', description: 'Level' },
  'M': { variable: 'moisture', description: 'Moisture, humidity' },
  'N': { variable: 'user', description: 'User defined' },
  'O': { variable: 'user', description: 'User defined' },
  'P': { variable: 'pressure', description: 'Pressure, vacuum' },
  'Q': { variable: 'quantity', description: 'Quantity, event' },
  'R': { variable: 'radiation', description: 'Radiation' },
  'S': { variable: 'speed', description: 'Speed, frequency' },
  'T': { variable: 'temperature', description: 'Temperature' },
  'U': { variable: 'multivariable', description: 'Multivariable' },
  'V': { variable: 'vibration', description: 'Vibration, analysis' },
  'W': { variable: 'weight', description: 'Weight, force' },
  'X': { variable: 'unclassified', description: 'Unclassified' },
  'Y': { variable: 'event', description: 'Event, state' },
  'Z': { variable: 'position', description: 'Position, dimension' }
}

export const ISA_MODIFIER_LETTERS = {
  // Readout/Passive Functions
  'I': { function: 'indicator', type: 'readout' },
  'R': { function: 'recorder', type: 'readout' },
  'G': { function: 'gauge', type: 'readout' },
  
  // Passive Functions
  'T': { function: 'transmitter', type: 'measurement' },
  'E': { function: 'element', type: 'measurement' },
  'S': { function: 'switch', type: 'discrete' },
  
  // Control Functions
  'C': { function: 'controller', type: 'control' },
  'V': { function: 'valve', type: 'final_element' },
  'Y': { function: 'relay', type: 'auxiliary' },
  'K': { function: 'control_station', type: 'control' },
  
  // Alarm Functions
  'A': { function: 'alarm', type: 'safety' },
  'H': { function: 'high', type: 'limit' },
  'L': { function: 'low', type: 'limit' },
  'HH': { function: 'high_high', type: 'safety' },
  'LL': { function: 'low_low', type: 'safety' }
}

// =============================================================================
// DEVICE TYPE PATTERNS - Regex patterns for identifying device types
// =============================================================================

export const DEVICE_TYPE_PATTERNS = [
  // Controllers (highest criticality)
  { 
    pattern: /\b(plc|pac|rtplc|safety.?plc|sil.?plc)\b/i, 
    type: 'plc', 
    category: 'controller',
    criticality: 'critical',
    description: 'Programmable Logic Controller'
  },
  { 
    pattern: /\b(dcs|distributed.?control)\b/i, 
    type: 'dcs', 
    category: 'controller',
    criticality: 'critical',
    description: 'Distributed Control System'
  },
  { 
    pattern: /\b(rtu|remote.?terminal)\b/i, 
    type: 'rtu', 
    category: 'controller',
    criticality: 'high',
    description: 'Remote Terminal Unit'
  },
  
  // Safety Systems (highest criticality)
  { 
    pattern: /\b(sis|safety.?instrumented|esd|emergency.?shutdown)\b/i, 
    type: 'sis', 
    category: 'safety',
    criticality: 'critical',
    description: 'Safety Instrumented System'
  },
  { 
    pattern: /\b(f.?g|fire.?gas|flame|smoke)\b/i, 
    type: 'fire_gas', 
    category: 'safety',
    criticality: 'critical',
    description: 'Fire & Gas Detection'
  },
  { 
    pattern: /\b(bms|burner.?management)\b/i, 
    type: 'bms', 
    category: 'safety',
    criticality: 'critical',
    description: 'Burner Management System'
  },
  { 
    pattern: /\bpsv\b|pressure.?safety.?valve/i, 
    type: 'psv', 
    category: 'safety',
    criticality: 'critical',
    description: 'Pressure Safety Valve'
  },
  
  // HMI/Operator Interfaces
  { 
    pattern: /\b(hmi|human.?machine|operator.?interface)\b/i, 
    type: 'hmi', 
    category: 'interface',
    criticality: 'high',
    description: 'Human-Machine Interface'
  },
  { 
    pattern: /\b(ows|operator.?workstation|console)\b/i, 
    type: 'workstation', 
    category: 'interface',
    criticality: 'high',
    description: 'Operator Workstation'
  },
  { 
    pattern: /\b(ews|engineering.?workstation)\b/i, 
    type: 'engineering_ws', 
    category: 'interface',
    criticality: 'high',
    description: 'Engineering Workstation'
  },
  
  // Network Infrastructure
  { 
    pattern: /\b(switch|ethernet.?switch|network.?switch)\b/i, 
    type: 'switch', 
    category: 'network',
    criticality: 'high',
    description: 'Network Switch'
  },
  { 
    pattern: /\b(router|gateway)\b/i, 
    type: 'router', 
    category: 'network',
    criticality: 'high',
    description: 'Router/Gateway'
  },
  { 
    pattern: /\b(firewall|fw)\b/i, 
    type: 'firewall', 
    category: 'network',
    criticality: 'critical',
    description: 'Firewall'
  },
  
  // Transmitters (measurement)
  { 
    pattern: /\b(transmitter|xmtr|tt|pt|ft|lt|at)\b/i, 
    type: 'transmitter', 
    category: 'measurement',
    criticality: 'medium',
    description: 'Process Transmitter'
  },
  
  // Analyzers
  { 
    pattern: /\b(analyzer|analyser|chromatograph|spectrometer)\b/i, 
    type: 'analyzer', 
    category: 'measurement',
    criticality: 'medium',
    description: 'Process Analyzer'
  },
  
  // Valves
  { 
    pattern: /\b(valve|cv|fv|pv|tv|mov|sov)\b/i, 
    type: 'valve', 
    category: 'final_element',
    criticality: 'medium',
    description: 'Control/Isolation Valve'
  },
  
  // Drives/Motors
  { 
    pattern: /\b(vfd|vsd|drive|inverter)\b/i, 
    type: 'drive', 
    category: 'motor_control',
    criticality: 'medium',
    description: 'Variable Frequency Drive'
  },
  { 
    pattern: /\b(mcc|motor.?control.?center)\b/i, 
    type: 'mcc', 
    category: 'motor_control',
    criticality: 'high',
    description: 'Motor Control Center'
  },
  
  // Servers/Historians
  { 
    pattern: /\b(historian|pi.?server|ip21|aspen)\b/i, 
    type: 'historian', 
    category: 'server',
    criticality: 'high',
    description: 'Data Historian'
  },
  { 
    pattern: /\b(opc|opc.?server|opc.?ua)\b/i, 
    type: 'opc_server', 
    category: 'server',
    criticality: 'high',
    description: 'OPC Server'
  }
]

// =============================================================================
// TAG PARSING FUNCTIONS
// =============================================================================

/**
 * Parse an ISA-style tag to extract device information
 * Examples: TT-101, FIC-201A, PSH-301, LCV-102
 */
export function parseISATag(tag) {
  if (!tag || typeof tag !== 'string') return null
  
  // Common ISA tag patterns: XX-NNN or XXX-NNN or XX-NNNX
  const isaPattern = /^([A-Z]{1,4})-?(\d{2,4})([A-Z])?$/i
  const match = tag.toUpperCase().match(isaPattern)
  
  if (!match) return null
  
  const [, letters, number, suffix] = match
  
  // Parse first letter (measured variable)
  const firstLetter = letters[0]
  const variable = ISA_FIRST_LETTER[firstLetter]
  
  // Parse remaining letters (functions)
  const functions = []
  for (let i = 1; i < letters.length; i++) {
    const modifier = ISA_MODIFIER_LETTERS[letters[i]]
    if (modifier) {
      functions.push(modifier)
    }
  }
  
  // Check for safety indicators (HH, LL, SH, SL, etc.)
  const isSafetyRelated = /[A-Z]*(HH|LL|SH|SL|PSV|PSH|PSL|TSH|TSL|LSH|LSL|ESD)[A-Z]*/i.test(letters)
  
  // Determine device function
  let deviceFunction = 'measurement'
  if (functions.some(f => f.type === 'control')) deviceFunction = 'control'
  if (functions.some(f => f.type === 'final_element')) deviceFunction = 'final_element'
  if (functions.some(f => f.type === 'safety') || isSafetyRelated) deviceFunction = 'safety'
  
  return {
    tag: tag.toUpperCase(),
    variable: variable?.variable || 'unknown',
    variableDescription: variable?.description || 'Unknown',
    functions,
    deviceFunction,
    isSafetyRelated,
    loopNumber: parseInt(number),
    suffix: suffix || null
  }
}

/**
 * Infer device context from tag name and other attributes
 */
export function inferDeviceContext(asset) {
  const context = {
    type: null,
    category: null,
    function: 'unknown',
    criticality: 'low',
    isSafetyRelated: false,
    description: null,
    protocol: null,
    inferenceSource: []
  }
  
  const tagId = asset.tag_id || asset.asset_id || asset.name || ''
  const deviceType = asset.device_type || ''
  const allText = `${tagId} ${deviceType} ${asset.manufacturer || ''} ${asset.model || ''}`.toLowerCase()
  
  // Try ISA tag parsing first
  const isaInfo = parseISATag(tagId)
  if (isaInfo) {
    context.function = isaInfo.deviceFunction
    context.isSafetyRelated = isaInfo.isSafetyRelated
    context.variable = isaInfo.variable
    context.inferenceSource.push('isa_tag')
    
    // Set criticality based on function
    if (isaInfo.isSafetyRelated) {
      context.criticality = 'critical'
    } else if (isaInfo.deviceFunction === 'control') {
      context.criticality = 'high'
    } else {
      context.criticality = 'medium'
    }
  }
  
  // Match against device type patterns
  for (const pattern of DEVICE_TYPE_PATTERNS) {
    if (pattern.pattern.test(allText)) {
      context.type = pattern.type
      context.category = pattern.category
      context.description = pattern.description
      
      // Override criticality if pattern indicates higher
      const criticalityOrder = ['low', 'medium', 'high', 'critical']
      if (criticalityOrder.indexOf(pattern.criticality) > criticalityOrder.indexOf(context.criticality)) {
        context.criticality = pattern.criticality
      }
      
      context.inferenceSource.push('device_pattern')
      break
    }
  }
  
  // Infer from device_type field if still unknown
  if (!context.type && deviceType) {
    const dtLower = deviceType.toLowerCase()
    if (dtLower.includes('transmitter')) {
      context.type = 'transmitter'
      context.category = 'measurement'
    } else if (dtLower.includes('valve')) {
      context.type = 'valve'
      context.category = 'final_element'
    } else if (dtLower.includes('switch')) {
      context.type = 'switch'
      context.category = 'network'
    }
    if (context.type) {
      context.inferenceSource.push('device_type_field')
    }
  }
  
  // Infer protocol from manufacturer/model
  if (allText.includes('hart')) context.protocol = 'HART'
  else if (allText.includes('profibus')) context.protocol = 'PROFIBUS'
  else if (allText.includes('modbus')) context.protocol = 'Modbus'
  else if (allText.includes('ethernet') || allText.includes('ip')) context.protocol = 'Ethernet/IP'
  else if (allText.includes('foundation')) context.protocol = 'FF'
  
  return context
}

/**
 * Batch process assets to add device context
 */
export function addDeviceContext(assets) {
  return assets.map(asset => ({
    ...asset,
    deviceContext: inferDeviceContext(asset)
  }))
}

export default {
  ISA_FIRST_LETTER,
  ISA_MODIFIER_LETTERS,
  DEVICE_TYPE_PATTERNS,
  parseISATag,
  inferDeviceContext,
  addDeviceContext
}
