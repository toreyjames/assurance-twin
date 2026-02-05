/**
 * UNIT KNOWLEDGE BASE
 * Industry templates defining what each process unit should contain
 * 
 * Used for contextual gap analysis - comparing expected vs actual
 * Enables functional gap detection, not just asset gap detection
 */

// =============================================================================
// OIL & GAS REFINERY UNITS
// =============================================================================

const OIL_GAS_UNITS = {
  'cdu': {
    name: 'Crude Distillation Unit',
    aliases: ['crude', 'distillation', 'atmospheric', 'adu', 'topping'],
    criticality: 'critical',
    description: 'Primary separation of crude oil into fractions. Plant cannot operate without it.',
    
    expectedFunctions: [
      { function: 'feed_flow_control', criticality: 'high', minDevices: 1, description: 'Crude feed rate control' },
      { function: 'column_pressure', criticality: 'high', minDevices: 1, description: 'Atmospheric column pressure' },
      { function: 'column_temperature', criticality: 'high', minDevices: 5, description: 'Column temperature profile' },
      { function: 'overhead_pressure_safety', criticality: 'critical', minDevices: 1, description: 'Overhead safety systems' },
      { function: 'bottoms_level', criticality: 'high', minDevices: 1, description: 'Column bottoms level' },
      { function: 'heater_control', criticality: 'critical', minDevices: 1, description: 'Crude heater firing control' },
      { function: 'reflux_control', criticality: 'medium', minDevices: 1, description: 'Overhead reflux' }
    ],
    
    expectedDeviceTypes: [
      { type: 'plc', minCount: 1, description: 'Process control' },
      { type: 'dcs', minCount: 1, description: 'Distributed control' },
      { type: 'sis', minCount: 1, description: 'Safety instrumented system' },
      { type: 'hmi', minCount: 1, description: 'Operator interface' }
    ],
    
    typicalAssetCount: { min: 40, max: 120, typical: 70 },
    regulations: ['OSHA_PSM', 'EPA_RMP', 'API_RP_584'],
    safetyNotes: 'High temperature, high pressure, flammable materials'
  },
  
  'fcc': {
    name: 'Fluid Catalytic Cracker',
    aliases: ['cat cracker', 'cracker', 'fccu'],
    criticality: 'critical',
    description: 'Converts heavy oils to lighter products. Major margin driver.',
    
    expectedFunctions: [
      { function: 'reactor_temperature', criticality: 'critical', minDevices: 5, description: 'Reactor temperature profile' },
      { function: 'regenerator_temperature', criticality: 'critical', minDevices: 5, description: 'Regenerator temperature' },
      { function: 'catalyst_circulation', criticality: 'critical', minDevices: 2, description: 'Catalyst flow control' },
      { function: 'air_blower_control', criticality: 'high', minDevices: 1, description: 'Main air blower' },
      { function: 'reactor_pressure', criticality: 'high', minDevices: 1, description: 'Reactor pressure control' },
      { function: 'slide_valve_control', criticality: 'critical', minDevices: 2, description: 'Catalyst slide valves' },
      { function: 'feed_preheat', criticality: 'medium', minDevices: 1, description: 'Feed preheat control' }
    ],
    
    expectedDeviceTypes: [
      { type: 'plc', minCount: 2, description: 'Process and safety control' },
      { type: 'sis', minCount: 1, description: 'Safety system' },
      { type: 'analyzer', minCount: 2, description: 'Process analyzers' },
      { type: 'hmi', minCount: 2, description: 'Operator interfaces' }
    ],
    
    typicalAssetCount: { min: 60, max: 150, typical: 100 },
    regulations: ['OSHA_PSM', 'EPA_RMP', 'API_RP_584'],
    safetyNotes: 'Very high temperature, catalyst handling, potential for thermal runaway'
  },
  
  'hydrotreater': {
    name: 'Hydrotreater',
    aliases: ['hds', 'hdn', 'nht', 'dht', 'hydrotreating'],
    criticality: 'high',
    description: 'Removes sulfur and nitrogen from hydrocarbon streams.',
    
    expectedFunctions: [
      { function: 'reactor_temperature', criticality: 'high', minDevices: 3, description: 'Reactor bed temperatures' },
      { function: 'hydrogen_flow', criticality: 'high', minDevices: 1, description: 'Hydrogen makeup flow' },
      { function: 'reactor_pressure', criticality: 'high', minDevices: 1, description: 'Reactor pressure control' },
      { function: 'recycle_gas', criticality: 'medium', minDevices: 1, description: 'Recycle gas compressor' },
      { function: 'product_sulfur', criticality: 'high', minDevices: 1, description: 'Product sulfur monitoring' }
    ],
    
    expectedDeviceTypes: [
      { type: 'plc', minCount: 1, description: 'Process control' },
      { type: 'analyzer', minCount: 1, description: 'Sulfur analyzer' }
    ],
    
    typicalAssetCount: { min: 30, max: 80, typical: 50 },
    regulations: ['OSHA_PSM', 'EPA_RMP'],
    safetyNotes: 'High pressure hydrogen, catalyst handling'
  },
  
  'tank_farm': {
    name: 'Tank Farm',
    aliases: ['storage', 'tankage', 'terminals'],
    criticality: 'medium',
    description: 'Storage for crude and products. Less time-critical but large asset count.',
    
    expectedFunctions: [
      { function: 'tank_level', criticality: 'high', minDevices: 10, description: 'Tank level measurement' },
      { function: 'tank_temperature', criticality: 'medium', minDevices: 5, description: 'Tank temperature' },
      { function: 'transfer_control', criticality: 'medium', minDevices: 3, description: 'Product transfer' },
      { function: 'overfill_protection', criticality: 'critical', minDevices: 5, description: 'High level alarms' }
    ],
    
    expectedDeviceTypes: [
      { type: 'plc', minCount: 1, description: 'Tank gauging control' },
      { type: 'transmitter', minCount: 10, description: 'Level transmitters' }
    ],
    
    typicalAssetCount: { min: 50, max: 200, typical: 100 },
    regulations: ['EPA_SPCC', 'API_2350'],
    safetyNotes: 'Flammable storage, environmental containment'
  },
  
  'utilities': {
    name: 'Utilities',
    aliases: ['utility', 'steam', 'power', 'cooling', 'air'],
    criticality: 'high',
    description: 'Steam, power, cooling water, instrument air systems.',
    
    expectedFunctions: [
      { function: 'boiler_control', criticality: 'high', minDevices: 2, description: 'Steam generation' },
      { function: 'cooling_water', criticality: 'high', minDevices: 2, description: 'Cooling water system' },
      { function: 'instrument_air', criticality: 'high', minDevices: 1, description: 'Instrument air supply' },
      { function: 'power_distribution', criticality: 'high', minDevices: 1, description: 'Electrical distribution' }
    ],
    
    expectedDeviceTypes: [
      { type: 'plc', minCount: 1, description: 'Utilities control' },
      { type: 'bms', minCount: 1, description: 'Burner management' }
    ],
    
    typicalAssetCount: { min: 30, max: 100, typical: 60 },
    regulations: ['OSHA_PSM', 'EPA_CAA'],
    safetyNotes: 'High pressure steam, rotating equipment'
  }
}

// =============================================================================
// PHARMACEUTICAL MANUFACTURING UNITS
// =============================================================================

const PHARMA_UNITS = {
  'api_synthesis': {
    name: 'API Synthesis',
    aliases: ['api', 'synthesis', 'chemical', 'reaction'],
    criticality: 'critical',
    description: 'Active Pharmaceutical Ingredient production. Core manufacturing.',
    
    expectedFunctions: [
      { function: 'reactor_temperature', criticality: 'critical', minDevices: 3, description: 'Reaction temperature control' },
      { function: 'reactor_pressure', criticality: 'high', minDevices: 1, description: 'Reactor pressure' },
      { function: 'agitation_control', criticality: 'high', minDevices: 1, description: 'Agitator speed' },
      { function: 'batch_charging', criticality: 'high', minDevices: 2, description: 'Material charging' },
      { function: 'inerting_system', criticality: 'critical', minDevices: 1, description: 'Nitrogen blanketing' }
    ],
    
    expectedDeviceTypes: [
      { type: 'plc', minCount: 1, description: 'Batch control' },
      { type: 'hmi', minCount: 1, description: 'Operator interface' },
      { type: 'analyzer', minCount: 1, description: 'In-process analysis' }
    ],
    
    typicalAssetCount: { min: 30, max: 100, typical: 60 },
    regulations: ['FDA_21CFR', 'GMP', 'ICH_Q7'],
    safetyNotes: 'Potent compounds, solvent handling, batch integrity'
  },
  
  'formulation': {
    name: 'Formulation',
    aliases: ['form', 'dosage', 'drug_product', 'dp'],
    criticality: 'critical',
    description: 'Drug product formulation and mixing.',
    
    expectedFunctions: [
      { function: 'blending_control', criticality: 'high', minDevices: 1, description: 'Powder blending' },
      { function: 'granulation', criticality: 'high', minDevices: 1, description: 'Wet/dry granulation' },
      { function: 'drying_control', criticality: 'high', minDevices: 2, description: 'Drying operations' },
      { function: 'weight_control', criticality: 'high', minDevices: 2, description: 'Material weighing' }
    ],
    
    expectedDeviceTypes: [
      { type: 'plc', minCount: 1, description: 'Process control' },
      { type: 'hmi', minCount: 1, description: 'Batch interface' }
    ],
    
    typicalAssetCount: { min: 20, max: 80, typical: 45 },
    regulations: ['FDA_21CFR', 'GMP'],
    safetyNotes: 'Dust explosion potential, containment requirements'
  },
  
  'clean_room': {
    name: 'Clean Room / HVAC',
    aliases: ['hvac', 'cleanroom', 'environmental', 'ahu'],
    criticality: 'high',
    description: 'Environmental control for GMP manufacturing.',
    
    expectedFunctions: [
      { function: 'temperature_control', criticality: 'high', minDevices: 5, description: 'Room temperature' },
      { function: 'humidity_control', criticality: 'high', minDevices: 3, description: 'Relative humidity' },
      { function: 'pressure_differential', criticality: 'critical', minDevices: 5, description: 'Room pressurization' },
      { function: 'particle_monitoring', criticality: 'high', minDevices: 2, description: 'Particle counts' }
    ],
    
    expectedDeviceTypes: [
      { type: 'plc', minCount: 1, description: 'BMS/HVAC control' },
      { type: 'transmitter', minCount: 10, description: 'Environmental sensors' }
    ],
    
    typicalAssetCount: { min: 30, max: 100, typical: 50 },
    regulations: ['FDA_21CFR', 'GMP', 'ISO_14644'],
    safetyNotes: 'Critical environmental control, product quality impact'
  },
  
  'wfi_system': {
    name: 'Water for Injection',
    aliases: ['wfi', 'pure_water', 'purified_water', 'pw'],
    criticality: 'critical',
    description: 'Pharmaceutical grade water production.',
    
    expectedFunctions: [
      { function: 'conductivity', criticality: 'critical', minDevices: 3, description: 'Water conductivity' },
      { function: 'toc_monitoring', criticality: 'critical', minDevices: 1, description: 'Total organic carbon' },
      { function: 'temperature_control', criticality: 'high', minDevices: 2, description: 'Storage temperature' },
      { function: 'flow_control', criticality: 'high', minDevices: 2, description: 'Distribution flow' }
    ],
    
    expectedDeviceTypes: [
      { type: 'plc', minCount: 1, description: 'Water system control' },
      { type: 'analyzer', minCount: 2, description: 'Quality analyzers' }
    ],
    
    typicalAssetCount: { min: 15, max: 50, typical: 30 },
    regulations: ['FDA_21CFR', 'USP', 'GMP'],
    safetyNotes: 'Microbial control, endotoxin monitoring'
  }
}

// =============================================================================
// POWER & UTILITIES UNITS
// =============================================================================

const UTILITIES_UNITS = {
  'generation': {
    name: 'Power Generation',
    aliases: ['gen', 'turbine', 'generator', 'powerhouse'],
    criticality: 'critical',
    description: 'Electricity generation from turbines/generators.',
    
    expectedFunctions: [
      { function: 'turbine_control', criticality: 'critical', minDevices: 3, description: 'Turbine speed/load' },
      { function: 'generator_protection', criticality: 'critical', minDevices: 2, description: 'Generator protection' },
      { function: 'excitation_control', criticality: 'high', minDevices: 1, description: 'AVR control' },
      { function: 'vibration_monitoring', criticality: 'high', minDevices: 4, description: 'Machine vibration' },
      { function: 'lube_oil_system', criticality: 'high', minDevices: 2, description: 'Lubrication system' }
    ],
    
    expectedDeviceTypes: [
      { type: 'plc', minCount: 1, description: 'Turbine control' },
      { type: 'dcs', minCount: 1, description: 'Plant control' },
      { type: 'sis', minCount: 1, description: 'Turbine protection' }
    ],
    
    typicalAssetCount: { min: 50, max: 150, typical: 80 },
    regulations: ['NERC_CIP', 'IEEE_C37'],
    safetyNotes: 'High speed rotating equipment, high voltage'
  },
  
  'substation': {
    name: 'Electrical Substation',
    aliases: ['sub', 'switchyard', 'transformer', 'electrical'],
    criticality: 'critical',
    description: 'Power transformation and distribution.',
    
    expectedFunctions: [
      { function: 'transformer_monitoring', criticality: 'high', minDevices: 2, description: 'Transformer health' },
      { function: 'breaker_control', criticality: 'critical', minDevices: 5, description: 'Circuit breaker control' },
      { function: 'protection_relay', criticality: 'critical', minDevices: 10, description: 'Protective relaying' },
      { function: 'metering', criticality: 'high', minDevices: 3, description: 'Power metering' }
    ],
    
    expectedDeviceTypes: [
      { type: 'rtu', minCount: 1, description: 'Substation automation' },
      { type: 'relay', minCount: 5, description: 'Protection relays' },
      { type: 'switch', minCount: 1, description: 'Substation network' }
    ],
    
    typicalAssetCount: { min: 30, max: 100, typical: 50 },
    regulations: ['NERC_CIP', 'IEEE_C37', 'IEC_61850'],
    safetyNotes: 'High voltage, arc flash hazard'
  },
  
  'water_treatment': {
    name: 'Water/Wastewater Treatment',
    aliases: ['water', 'wastewater', 'wwtp', 'wtp', 'treatment'],
    criticality: 'high',
    description: 'Water treatment and distribution.',
    
    expectedFunctions: [
      { function: 'chemical_dosing', criticality: 'high', minDevices: 3, description: 'Chemical treatment' },
      { function: 'flow_measurement', criticality: 'high', minDevices: 5, description: 'Plant flow' },
      { function: 'quality_monitoring', criticality: 'critical', minDevices: 4, description: 'Water quality' },
      { function: 'pump_control', criticality: 'high', minDevices: 5, description: 'Pumping stations' }
    ],
    
    expectedDeviceTypes: [
      { type: 'plc', minCount: 2, description: 'Process control' },
      { type: 'analyzer', minCount: 3, description: 'Quality analyzers' },
      { type: 'rtu', minCount: 1, description: 'Remote monitoring' }
    ],
    
    typicalAssetCount: { min: 40, max: 120, typical: 70 },
    regulations: ['EPA_SDWA', 'EPA_CWA', 'AWIA'],
    safetyNotes: 'Chemical handling, public health critical'
  }
}

// =============================================================================
// AUTOMOTIVE MANUFACTURING UNITS (TMNA-STYLE)
// =============================================================================

const AUTOMOTIVE_UNITS = {
  // STAMPING SHOP
  'stamping': {
    name: 'Stamping Shop',
    aliases: ['stamp', 'press', 'blanking', 'metal_forming'],
    criticality: 'critical',
    description: 'High-tonnage presses forming body panels from steel/aluminum coils.',
    
    expectedFunctions: [
      { function: 'press_control', criticality: 'critical', minDevices: 8, description: 'Press stroke control' },
      { function: 'die_monitoring', criticality: 'high', minDevices: 10, description: 'Die position and force' },
      { function: 'coil_feed', criticality: 'high', minDevices: 4, description: 'Coil feed systems' },
      { function: 'transfer_automation', criticality: 'critical', minDevices: 6, description: 'Part transfer robots' },
      { function: 'quality_vision', criticality: 'high', minDevices: 8, description: 'Defect detection cameras' },
      { function: 'safety_curtains', criticality: 'critical', minDevices: 20, description: 'Light curtains and guards' },
      { function: 'tonnage_monitoring', criticality: 'high', minDevices: 8, description: 'Press force sensors' }
    ],
    
    expectedDeviceTypes: [
      { type: 'plc', minCount: 15, description: 'Press line controllers' },
      { type: 'servo', minCount: 30, description: 'Servo drives' },
      { type: 'hmi', minCount: 8, description: 'Operator panels' },
      { type: 'robot', minCount: 12, description: 'Transfer robots' },
      { type: 'camera', minCount: 8, description: 'Vision systems' },
      { type: 'safety_plc', minCount: 4, description: 'Safety controllers' }
    ],
    
    typicalAssetCount: { min: 150, max: 400, typical: 280 },
    regulations: ['OSHA_1910', 'ANSI_B11', 'ISO_13849'],
    safetyNotes: 'High-tonnage presses, pinch points, noise exposure'
  },

  // BODY SHOP (Body-in-White)
  'body_shop': {
    name: 'Body Shop (BIW)',
    aliases: ['body', 'welding', 'biw', 'body_in_white', 'weld'],
    criticality: 'critical',
    description: 'Robotic welding cells assembling body structure. 400-600 robots typical.',
    
    expectedFunctions: [
      { function: 'spot_welding', criticality: 'critical', minDevices: 200, description: 'Spot weld robots' },
      { function: 'arc_welding', criticality: 'high', minDevices: 40, description: 'MIG/MAG weld robots' },
      { function: 'weld_quality', criticality: 'critical', minDevices: 50, description: 'Weld monitoring' },
      { function: 'geometry_station', criticality: 'critical', minDevices: 20, description: 'Body geometry check' },
      { function: 'conveyor_control', criticality: 'high', minDevices: 30, description: 'Body transfer' },
      { function: 'fixture_clamp', criticality: 'high', minDevices: 100, description: 'Welding fixtures' },
      { function: 'adhesive_apply', criticality: 'medium', minDevices: 15, description: 'Structural adhesive' },
      { function: 'safety_zone', criticality: 'critical', minDevices: 80, description: 'Cell safety systems' }
    ],
    
    expectedDeviceTypes: [
      { type: 'robot', minCount: 300, description: 'Welding robots (Fanuc/Kawasaki)' },
      { type: 'plc', minCount: 50, description: 'Cell controllers' },
      { type: 'weld_controller', minCount: 200, description: 'Weld controllers' },
      { type: 'hmi', minCount: 30, description: 'Cell interfaces' },
      { type: 'camera', minCount: 40, description: 'Vision systems' },
      { type: 'safety_plc', minCount: 25, description: 'Safety controllers' },
      { type: 'servo', minCount: 150, description: 'Servo actuators' }
    ],
    
    typicalAssetCount: { min: 600, max: 1500, typical: 950 },
    regulations: ['OSHA_1910', 'ISO_45001', 'RIA_TR_R15.306'],
    safetyNotes: 'High-speed robots, weld fume extraction, arc flash'
  },

  // PAINT SHOP
  'paint_shop': {
    name: 'Paint Shop',
    aliases: ['paint', 'coating', 'finish', 'ecoat', 'topcoat', 'clearcoat'],
    criticality: 'critical',
    description: 'Multi-stage coating: E-coat, primer, basecoat, clearcoat with cure ovens.',
    
    expectedFunctions: [
      { function: 'pretreatment', criticality: 'high', minDevices: 20, description: 'Phosphate/E-coat prep' },
      { function: 'ecoat_control', criticality: 'critical', minDevices: 15, description: 'Electrocoat bath' },
      { function: 'booth_hvac', criticality: 'critical', minDevices: 40, description: 'Booth temperature/humidity' },
      { function: 'paint_robots', criticality: 'critical', minDevices: 60, description: 'Paint application' },
      { function: 'oven_control', criticality: 'high', minDevices: 25, description: 'Cure oven zones' },
      { function: 'color_change', criticality: 'high', minDevices: 20, description: 'Color change systems' },
      { function: 'voc_monitoring', criticality: 'high', minDevices: 15, description: 'VOC/RTO emissions' },
      { function: 'sealer_apply', criticality: 'medium', minDevices: 10, description: 'Sealer robots' },
      { function: 'quality_inspection', criticality: 'high', minDevices: 12, description: 'Paint defect detection' }
    ],
    
    expectedDeviceTypes: [
      { type: 'robot', minCount: 80, description: 'Paint robots (Fanuc)' },
      { type: 'plc', minCount: 35, description: 'Process controllers' },
      { type: 'hvac_controller', minCount: 20, description: 'Booth HVAC' },
      { type: 'analyzer', minCount: 15, description: 'Environment/VOC analyzers' },
      { type: 'hmi', minCount: 20, description: 'Operator stations' },
      { type: 'vfd', minCount: 60, description: 'Fan/pump drives' },
      { type: 'temperature_controller', minCount: 40, description: 'Oven controllers' }
    ],
    
    typicalAssetCount: { min: 300, max: 800, typical: 520 },
    regulations: ['EPA_CAA', 'OSHA_1910', 'NFPA_33'],
    safetyNotes: 'Flammable solvents, VOC exposure, fire hazard'
  },

  // PLASTICS SHOP
  'plastics': {
    name: 'Plastics Shop',
    aliases: ['injection', 'molding', 'bumper', 'fascia', 'interior_trim'],
    criticality: 'high',
    description: 'Injection molding for bumpers, fascias, interior trim parts.',
    
    expectedFunctions: [
      { function: 'injection_control', criticality: 'high', minDevices: 20, description: 'Molding machines' },
      { function: 'material_drying', criticality: 'high', minDevices: 10, description: 'Resin dryers' },
      { function: 'mold_temperature', criticality: 'high', minDevices: 15, description: 'Mold heating/cooling' },
      { function: 'robot_extract', criticality: 'medium', minDevices: 15, description: 'Part extraction' },
      { function: 'paint_prep', criticality: 'medium', minDevices: 8, description: 'Flame treatment' }
    ],
    
    expectedDeviceTypes: [
      { type: 'plc', minCount: 15, description: 'Machine controllers' },
      { type: 'robot', minCount: 20, description: 'Extraction robots' },
      { type: 'hmi', minCount: 10, description: 'Operator panels' },
      { type: 'temperature_controller', minCount: 25, description: 'TCUs' }
    ],
    
    typicalAssetCount: { min: 80, max: 200, typical: 140 },
    regulations: ['OSHA_1910', 'ISO_45001'],
    safetyNotes: 'Hot surfaces, high pressure hydraulics'
  },

  // FINAL ASSEMBLY (Trim-Chassis-Final)
  'assembly': {
    name: 'Final Assembly',
    aliases: ['final', 'trim', 'chassis', 'tcf', 'general_assembly', 'ga'],
    criticality: 'critical',
    description: 'Trim-Chassis-Final: Install interior, powertrain, wheels, fluid fill.',
    
    expectedFunctions: [
      { function: 'main_conveyor', criticality: 'critical', minDevices: 25, description: 'Main assembly line' },
      { function: 'torque_tools', criticality: 'critical', minDevices: 200, description: 'DC torque tools' },
      { function: 'agv_delivery', criticality: 'high', minDevices: 40, description: 'AGV material delivery' },
      { function: 'marriage_station', criticality: 'critical', minDevices: 5, description: 'Body-chassis marriage' },
      { function: 'fluid_fill', criticality: 'high', minDevices: 15, description: 'Fluid fill stations' },
      { function: 'andon_system', criticality: 'high', minDevices: 50, description: 'Andon pull cords' },
      { function: 'error_proofing', criticality: 'high', minDevices: 100, description: 'Poka-yoke sensors' },
      { function: 'tracking_system', criticality: 'critical', minDevices: 30, description: 'Vehicle tracking' },
      { function: 'windshield_install', criticality: 'high', minDevices: 4, description: 'Glass installation' },
      { function: 'seat_delivery', criticality: 'high', minDevices: 8, description: 'JIT seat sequencing' }
    ],
    
    expectedDeviceTypes: [
      { type: 'plc', minCount: 60, description: 'Station controllers' },
      { type: 'torque_controller', minCount: 150, description: 'Torque tool controllers' },
      { type: 'agv', minCount: 50, description: 'AGV fleet' },
      { type: 'hmi', minCount: 80, description: 'Station displays' },
      { type: 'scanner', minCount: 200, description: 'Barcode scanners' },
      { type: 'robot', minCount: 30, description: 'Assembly robots' },
      { type: 'andon', minCount: 50, description: 'Andon boards' }
    ],
    
    typicalAssetCount: { min: 500, max: 1200, typical: 850 },
    regulations: ['OSHA_1910', 'ISO_45001'],
    safetyNotes: 'Ergonomics, moving conveyors, overhead cranes'
  },

  // QUALITY & TEST
  'quality': {
    name: 'Quality & Testing',
    aliases: ['test', 'eol', 'quality', 'inspection', 'audit', 'roll_test'],
    criticality: 'critical',
    description: 'End-of-line testing: roll test, water test, alignment, emissions.',
    
    expectedFunctions: [
      { function: 'roll_test', criticality: 'critical', minDevices: 10, description: 'Chassis dyno test' },
      { function: 'alignment_check', criticality: 'high', minDevices: 6, description: 'Wheel alignment' },
      { function: 'water_test', criticality: 'high', minDevices: 4, description: 'Water leak test' },
      { function: 'adas_calibration', criticality: 'high', minDevices: 8, description: 'ADAS sensor calibration' },
      { function: 'ecu_programming', criticality: 'critical', minDevices: 12, description: 'ECU flashing' },
      { function: 'emissions_test', criticality: 'high', minDevices: 4, description: 'Emissions analyzer' },
      { function: 'squeak_rattle', criticality: 'medium', minDevices: 4, description: 'Road simulation' },
      { function: 'headlamp_aim', criticality: 'high', minDevices: 4, description: 'Headlamp alignment' }
    ],
    
    expectedDeviceTypes: [
      { type: 'plc', minCount: 20, description: 'Test equipment controllers' },
      { type: 'dynamometer', minCount: 6, description: 'Chassis dynos' },
      { type: 'camera', minCount: 30, description: 'Vision systems' },
      { type: 'hmi', minCount: 15, description: 'Test stations' },
      { type: 'programmer', minCount: 10, description: 'ECU programmers' },
      { type: 'analyzer', minCount: 8, description: 'Test equipment' }
    ],
    
    typicalAssetCount: { min: 100, max: 300, typical: 180 },
    regulations: ['EPA_FTP', 'FMVSS', 'SAE_J1939'],
    safetyNotes: 'Moving vehicles, high-speed dynos, exhaust fumes'
  },

  // POWERTRAIN
  'powertrain': {
    name: 'Powertrain Assembly',
    aliases: ['engine', 'transmission', 'motor', 'drivetrain', 'axle'],
    criticality: 'critical',
    description: 'Engine/transmission/motor assembly and machining.',
    
    expectedFunctions: [
      { function: 'machining_center', criticality: 'critical', minDevices: 30, description: 'CNC machining' },
      { function: 'engine_assembly', criticality: 'critical', minDevices: 40, description: 'Engine build' },
      { function: 'torque_monitoring', criticality: 'critical', minDevices: 80, description: 'Critical torques' },
      { function: 'hot_test', criticality: 'high', minDevices: 8, description: 'Engine hot test' },
      { function: 'cold_test', criticality: 'high', minDevices: 6, description: 'Engine cold test' },
      { function: 'leak_test', criticality: 'high', minDevices: 12, description: 'Oil/coolant leak' },
      { function: 'vision_inspection', criticality: 'high', minDevices: 20, description: 'Assembly verification' }
    ],
    
    expectedDeviceTypes: [
      { type: 'cnc', minCount: 40, description: 'CNC machines' },
      { type: 'plc', minCount: 35, description: 'Line controllers' },
      { type: 'robot', minCount: 25, description: 'Assembly robots' },
      { type: 'torque_controller', minCount: 60, description: 'DC torque tools' },
      { type: 'hmi', minCount: 25, description: 'Station displays' },
      { type: 'dyno', minCount: 10, description: 'Engine dynos' }
    ],
    
    typicalAssetCount: { min: 250, max: 600, typical: 420 },
    regulations: ['OSHA_1910', 'ISO_45001'],
    safetyNotes: 'Heavy parts, rotating equipment, cutting fluids'
  },

  // BATTERY PLANT (EV)
  'battery': {
    name: 'Battery Pack Assembly',
    aliases: ['battery', 'ev_pack', 'cell', 'module', 'bms'],
    criticality: 'critical',
    description: 'EV battery module and pack assembly for electric vehicles.',
    
    expectedFunctions: [
      { function: 'cell_handling', criticality: 'critical', minDevices: 20, description: 'Cell loading/sorting' },
      { function: 'module_assembly', criticality: 'critical', minDevices: 15, description: 'Module build' },
      { function: 'laser_welding', criticality: 'critical', minDevices: 12, description: 'Cell interconnect' },
      { function: 'thermal_paste', criticality: 'high', minDevices: 8, description: 'TIM application' },
      { function: 'bms_programming', criticality: 'critical', minDevices: 6, description: 'BMS configuration' },
      { function: 'eol_test', criticality: 'critical', minDevices: 10, description: 'Pack testing' },
      { function: 'insulation_test', criticality: 'critical', minDevices: 8, description: 'HiPot testing' },
      { function: 'dry_room', criticality: 'high', minDevices: 15, description: 'Humidity control' }
    ],
    
    expectedDeviceTypes: [
      { type: 'plc', minCount: 25, description: 'Line controllers' },
      { type: 'robot', minCount: 30, description: 'Assembly robots' },
      { type: 'laser', minCount: 10, description: 'Welding lasers' },
      { type: 'tester', minCount: 15, description: 'Battery testers' },
      { type: 'hvac_controller', minCount: 10, description: 'Dry room HVAC' },
      { type: 'safety_plc', minCount: 8, description: 'HV safety systems' }
    ],
    
    typicalAssetCount: { min: 150, max: 400, typical: 280 },
    regulations: ['OSHA_1910', 'UN38.3', 'UL2580', 'NFPA_855'],
    safetyNotes: 'High voltage, thermal runaway risk, lithium fires'
  },

  // LOGISTICS & MATERIAL HANDLING
  'logistics': {
    name: 'Logistics & Material Handling',
    aliases: ['warehouse', 'logistics', 'receiving', 'shipping', 'material'],
    criticality: 'high',
    description: 'Parts receiving, sequencing, JIT delivery, finished vehicle shipping.',
    
    expectedFunctions: [
      { function: 'receiving_dock', criticality: 'high', minDevices: 15, description: 'Dock door control' },
      { function: 'asrs_system', criticality: 'high', minDevices: 20, description: 'Automated storage' },
      { function: 'agv_fleet', criticality: 'high', minDevices: 30, description: 'AGV navigation' },
      { function: 'sequence_tower', criticality: 'high', minDevices: 10, description: 'Parts sequencing' },
      { function: 'shipping_line', criticality: 'medium', minDevices: 12, description: 'Vehicle shipping' },
      { function: 'yard_management', criticality: 'medium', minDevices: 8, description: 'Yard tracking' }
    ],
    
    expectedDeviceTypes: [
      { type: 'plc', minCount: 20, description: 'Conveyor controllers' },
      { type: 'agv', minCount: 40, description: 'AGV fleet' },
      { type: 'asrs', minCount: 15, description: 'Storage systems' },
      { type: 'scanner', minCount: 50, description: 'Barcode readers' },
      { type: 'hmi', minCount: 15, description: 'Operator stations' }
    ],
    
    typicalAssetCount: { min: 100, max: 300, typical: 180 },
    regulations: ['OSHA_1910', 'ISO_45001'],
    safetyNotes: 'Forklift traffic, AGV zones, loading docks'
  },

  // UTILITIES & FACILITIES
  'plant_utilities': {
    name: 'Plant Utilities',
    aliases: ['utilities', 'facilities', 'power', 'hvac', 'compressed_air', 'chiller'],
    criticality: 'high',
    description: 'Power distribution, HVAC, compressed air, chilled water, fire protection.',
    
    expectedFunctions: [
      { function: 'power_distribution', criticality: 'critical', minDevices: 20, description: 'Electrical substations' },
      { function: 'compressed_air', criticality: 'high', minDevices: 15, description: 'Air compressors' },
      { function: 'hvac_control', criticality: 'high', minDevices: 30, description: 'Building HVAC' },
      { function: 'chilled_water', criticality: 'high', minDevices: 10, description: 'Process cooling' },
      { function: 'fire_protection', criticality: 'critical', minDevices: 25, description: 'Fire alarm/suppression' },
      { function: 'wastewater', criticality: 'medium', minDevices: 8, description: 'Wastewater treatment' },
      { function: 'natural_gas', criticality: 'high', minDevices: 6, description: 'Gas distribution' }
    ],
    
    expectedDeviceTypes: [
      { type: 'plc', minCount: 15, description: 'Utility controllers' },
      { type: 'vfd', minCount: 40, description: 'Motor drives' },
      { type: 'bms', minCount: 5, description: 'Building management' },
      { type: 'fire_panel', minCount: 10, description: 'Fire alarm panels' },
      { type: 'meter', minCount: 30, description: 'Energy meters' }
    ],
    
    typicalAssetCount: { min: 100, max: 250, typical: 160 },
    regulations: ['NFPA_70', 'NFPA_72', 'ASHRAE'],
    safetyNotes: 'High voltage, rotating equipment, confined spaces'
  }
}

// =============================================================================
// COMBINED KNOWLEDGE BASE
// =============================================================================

export const UNIT_KNOWLEDGE = {
  'oil-gas': OIL_GAS_UNITS,
  'pharma': PHARMA_UNITS,
  'utilities': UTILITIES_UNITS,
  'automotive': AUTOMOTIVE_UNITS
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get unit information by industry and unit ID
 */
export function getUnitInfo(industry, unitId) {
  const industryUnits = UNIT_KNOWLEDGE[industry]
  if (!industryUnits) return null
  
  // Direct match
  if (industryUnits[unitId]) {
    return { id: unitId, ...industryUnits[unitId] }
  }
  
  // Try alias match
  for (const [id, unit] of Object.entries(industryUnits)) {
    if (unit.aliases?.some(alias => 
      alias.toLowerCase() === unitId.toLowerCase() ||
      unitId.toLowerCase().includes(alias.toLowerCase())
    )) {
      return { id, ...unit }
    }
  }
  
  return null
}

/**
 * Detect unit from asset unit/area field
 */
export function detectUnit(unitField, industry) {
  if (!unitField || !industry) return null
  
  const normalized = unitField.toLowerCase().trim()
  const industryUnits = UNIT_KNOWLEDGE[industry]
  if (!industryUnits) return null
  
  for (const [id, unit] of Object.entries(industryUnits)) {
    // Check unit ID
    if (normalized.includes(id)) {
      return { id, ...unit }
    }
    
    // Check aliases
    if (unit.aliases?.some(alias => normalized.includes(alias.toLowerCase()))) {
      return { id, ...unit }
    }
  }
  
  return null
}

/**
 * Get all units for an industry
 */
export function getIndustryUnits(industry) {
  const units = UNIT_KNOWLEDGE[industry]
  if (!units) return []
  
  return Object.entries(units).map(([id, unit]) => ({
    id,
    ...unit
  }))
}

/**
 * Get expected functions for a unit
 */
export function getExpectedFunctions(industry, unitId) {
  const unit = getUnitInfo(industry, unitId)
  return unit?.expectedFunctions || []
}

/**
 * Get expected device types for a unit
 */
export function getExpectedDeviceTypes(industry, unitId) {
  const unit = getUnitInfo(industry, unitId)
  return unit?.expectedDeviceTypes || []
}

export default {
  UNIT_KNOWLEDGE,
  getUnitInfo,
  detectUnit,
  getIndustryUnits,
  getExpectedFunctions,
  getExpectedDeviceTypes
}
