const CLASS_FALLBACK = {
  id: 'unclassified',
  label: 'Unclassified Device',
  layerKey: 'L2',
  layerLabel: 'Level 2 Supervisory',
  zoneType: 'unknown',
  tierHint: 3,
  keywords: []
}

export const DEVICE_CLASSES = [
  { id: 'safety_plc', label: 'Safety PLC', layerKey: 'L1', layerLabel: 'Level 1 Basic Control', zoneType: 'safety', tierHint: 1, keywords: ['safety plc', 'sis plc', 'triconex', 'failsafe controller'] },
  { id: 'dcs_controller', label: 'DCS Controller', layerKey: 'L1', layerLabel: 'Level 1 Basic Control', zoneType: 'control', tierHint: 1, keywords: ['dcs controller', 'distributed control', 'controller node'] },
  { id: 'plc', label: 'PLC', layerKey: 'L1', layerLabel: 'Level 1 Basic Control', zoneType: 'control', tierHint: 1, keywords: ['plc', 'programmable logic controller'] },
  { id: 'rtu', label: 'RTU', layerKey: 'L1', layerLabel: 'Level 1 Basic Control', zoneType: 'control', tierHint: 1, keywords: ['rtu', 'remote terminal unit'] },
  { id: 'safety_system', label: 'Safety System', layerKey: 'L1', layerLabel: 'Level 1 Basic Control', zoneType: 'safety', tierHint: 1, keywords: ['sis', 'esd', 'burner management', 'safety instrumented'] },
  { id: 'hmi', label: 'HMI', layerKey: 'L2', layerLabel: 'Level 2 Supervisory', zoneType: 'operations', tierHint: 2, keywords: ['hmi', 'operator station', 'operator panel'] },
  { id: 'scada_server', label: 'SCADA Server', layerKey: 'L2', layerLabel: 'Level 2 Supervisory', zoneType: 'operations', tierHint: 1, keywords: ['scada', 'supervisory server'] },
  { id: 'historian', label: 'Historian', layerKey: 'L3', layerLabel: 'Level 3 Site Operations', zoneType: 'operations', tierHint: 1, keywords: ['historian', 'pi server', 'process historian'] },
  { id: 'engineering_workstation', label: 'Engineering Workstation', layerKey: 'L2', layerLabel: 'Level 2 Supervisory', zoneType: 'operations', tierHint: 2, keywords: ['engineering workstation', 'eng ws', 'engineering station'] },
  { id: 'batch_server', label: 'Batch Server', layerKey: 'L3', layerLabel: 'Level 3 Site Operations', zoneType: 'operations', tierHint: 2, keywords: ['batch server', 'mes batch'] },
  { id: 'mes_server', label: 'MES Server', layerKey: 'L3', layerLabel: 'Level 3 Site Operations', zoneType: 'operations', tierHint: 2, keywords: ['mes', 'manufacturing execution'] },
  { id: 'opc_server', label: 'OPC Server', layerKey: 'L2', layerLabel: 'Level 2 Supervisory', zoneType: 'operations', tierHint: 2, keywords: ['opc ua', 'opc da', 'opc server'] },
  { id: 'opc_gateway', label: 'OPC Gateway', layerKey: 'L3_5', layerLabel: 'Level 3.5 DMZ / Boundary', zoneType: 'dmz', tierHint: 1, keywords: ['opc gateway', 'data diodes', 'ot gateway'] },
  { id: 'switch', label: 'Industrial Switch', layerKey: 'L1', layerLabel: 'Level 1 Basic Control', zoneType: 'network', tierHint: 1, keywords: ['switch', 'industrial ethernet switch'] },
  { id: 'router', label: 'Router', layerKey: 'L3_5', layerLabel: 'Level 3.5 DMZ / Boundary', zoneType: 'network', tierHint: 1, keywords: ['router', 'edge router'] },
  { id: 'firewall', label: 'Firewall', layerKey: 'L3_5', layerLabel: 'Level 3.5 DMZ / Boundary', zoneType: 'dmz', tierHint: 1, keywords: ['firewall', 'next gen firewall', 'ngfw'] },
  { id: 'ids_ips', label: 'IDS/IPS', layerKey: 'L3_5', layerLabel: 'Level 3.5 DMZ / Boundary', zoneType: 'dmz', tierHint: 1, keywords: ['ids', 'ips', 'intrusion detection'] },
  { id: 'jump_host', label: 'Jump Host', layerKey: 'L3_5', layerLabel: 'Level 3.5 DMZ / Boundary', zoneType: 'dmz', tierHint: 1, keywords: ['jump host', 'bastion'] },
  { id: 'domain_controller', label: 'Domain Controller', layerKey: 'L3', layerLabel: 'Level 3 Site Operations', zoneType: 'operations', tierHint: 1, keywords: ['domain controller', 'active directory'] },
  { id: 'backup_server', label: 'Backup Server', layerKey: 'L3', layerLabel: 'Level 3 Site Operations', zoneType: 'operations', tierHint: 2, keywords: ['backup server', 'recovery server'] },
  { id: 'nas_storage', label: 'NAS/Storage', layerKey: 'L3', layerLabel: 'Level 3 Site Operations', zoneType: 'operations', tierHint: 2, keywords: ['nas', 'storage array', 'san'] },
  { id: 'wireless_ap', label: 'Wireless AP', layerKey: 'L2', layerLabel: 'Level 2 Supervisory', zoneType: 'network', tierHint: 2, keywords: ['wireless ap', 'access point', 'wifi'] },
  { id: 'camera', label: 'Camera', layerKey: 'L2', layerLabel: 'Level 2 Supervisory', zoneType: 'operations', tierHint: 2, keywords: ['camera', 'cctv', 'ipcam'] },
  { id: 'analyzer', label: 'Analyzer', layerKey: 'L0', layerLabel: 'Level 0 Process', zoneType: 'process', tierHint: 2, keywords: ['analyzer', 'gas chromatograph', 'spectrometer'] },
  { id: 'sensor', label: 'Sensor', layerKey: 'L0', layerLabel: 'Level 0 Process', zoneType: 'process', tierHint: 3, keywords: ['sensor', 'transmitter', 'temperature probe', 'pressure transmitter'] },
  { id: 'actuator', label: 'Actuator', layerKey: 'L0', layerLabel: 'Level 0 Process', zoneType: 'process', tierHint: 3, keywords: ['actuator', 'valve', 'positioner'] },
  { id: 'vfd_drive', label: 'VFD / Drive', layerKey: 'L1', layerLabel: 'Level 1 Basic Control', zoneType: 'control', tierHint: 2, keywords: ['vfd', 'drive', 'inverter'] },
  { id: 'robot_controller', label: 'Robot Controller', layerKey: 'L1', layerLabel: 'Level 1 Basic Control', zoneType: 'control', tierHint: 1, keywords: ['robot controller', 'cobot controller'] },
  { id: 'compressor_controller', label: 'Compressor Controller', layerKey: 'L1', layerLabel: 'Level 1 Basic Control', zoneType: 'control', tierHint: 1, keywords: ['compressor controller'] },
  { id: 'boiler_controller', label: 'Boiler Controller', layerKey: 'L1', layerLabel: 'Level 1 Basic Control', zoneType: 'control', tierHint: 1, keywords: ['boiler controller', 'furnace controller'] },
  { id: 'package_unit', label: 'Packaged Unit Controller', layerKey: 'L1', layerLabel: 'Level 1 Basic Control', zoneType: 'control', tierHint: 2, keywords: ['package unit', 'skid controller'] },
  { id: 'application_server', label: 'Application Server', layerKey: 'L3', layerLabel: 'Level 3 Site Operations', zoneType: 'operations', tierHint: 2, keywords: ['application server', 'middleware server'] },
  { id: 'remote_access_gateway', label: 'Remote Access Gateway', layerKey: 'L3_5', layerLabel: 'Level 3.5 DMZ / Boundary', zoneType: 'dmz', tierHint: 1, keywords: ['remote access gateway', 'vpn gateway'] }
]

export const EPISTEMIC_STATUS = {
  CROSS_VALIDATED: {
    id: 'cross_validated',
    label: 'Cross-validated',
    explanation: 'Engineering and discovery evidence agree with high confidence.'
  },
  SUPPORTED: {
    id: 'supported',
    label: 'Supported',
    explanation: 'Evidence exists in both domains but confidence is medium or mixed.'
  },
  INFERRED: {
    id: 'inferred',
    label: 'Inferred',
    explanation: 'Evidence is present but weak, conflicting, or partially missing.'
  },
  EXPECTED_MISSING: {
    id: 'expected_missing',
    label: 'Expected but missing',
    explanation: 'Asset is expected from baseline but not observed on network.'
  },
  OBSERVED_UNEXPECTED: {
    id: 'observed_unexpected',
    label: 'Observed but undocumented',
    explanation: 'Asset was discovered on network without a baseline record.'
  },
  UNKNOWN: {
    id: 'unknown',
    label: 'Unknown',
    explanation: 'Insufficient evidence to place confidence.'
  }
}

function searchableText(asset) {
  const parts = [
    asset?.device_type,
    asset?.instrument_type,
    asset?.manufacturer,
    asset?.model,
    asset?.tag_id,
    asset?.hostname,
    asset?.network_segment
  ]
  return parts.filter(Boolean).join(' ').toLowerCase()
}

export function classifyDeviceClass(asset) {
  const text = searchableText(asset)
  for (const deviceClass of DEVICE_CLASSES) {
    if (deviceClass.keywords.some(keyword => text.includes(keyword))) {
      return deviceClass
    }
  }

  const tier = Number(asset?.classification?.tier || asset?.security_tier || asset?.tier || 3)
  if (tier === 1) {
    return {
      ...CLASS_FALLBACK,
      id: 'critical_network_asset',
      label: 'Critical Network Asset',
      layerKey: 'L1',
      layerLabel: 'Level 1 Basic Control',
      zoneType: 'control',
      tierHint: 1
    }
  }
  if (tier === 2) {
    return {
      ...CLASS_FALLBACK,
      id: 'networkable_device',
      label: 'Networkable Device',
      layerKey: 'L2',
      layerLabel: 'Level 2 Supervisory',
      zoneType: 'operations',
      tierHint: 2
    }
  }
  return CLASS_FALLBACK
}

export function epistemicStateFromAsset(asset, status) {
  if (status === 'blind_spot') return EPISTEMIC_STATUS.EXPECTED_MISSING
  if (status === 'orphan') return EPISTEMIC_STATUS.OBSERVED_UNEXPECTED

  // Multi-stream demos (network discovery + field inventory): reserve
  // "cross_validated" for tags seen by both discovery streams. Baseline
  // reconciliation alone is "supported" so the Evidence row aligns with the
  // cross-validation line in InventoryHeader.
  const sourceLabels = asset?.discovered?._sourceLabels
  if (Array.isArray(sourceLabels)) {
    if (sourceLabels.length >= 2) return EPISTEMIC_STATUS.CROSS_VALIDATED
    if (sourceLabels.length === 1) return EPISTEMIC_STATUS.SUPPORTED
  }

  const validation = String(asset?.validation?.confidence || '').toUpperCase()
  const matchConfidence = Number(asset?.matchConfidence || 0)
  if (validation === 'HIGH' && matchConfidence >= 95) return EPISTEMIC_STATUS.CROSS_VALIDATED
  if (validation === 'LOW' || matchConfidence < 70) return EPISTEMIC_STATUS.INFERRED
  if (validation === 'MEDIUM' || validation === 'HIGH') return EPISTEMIC_STATUS.SUPPORTED
  return EPISTEMIC_STATUS.UNKNOWN
}
