const FIELD_GROUPS = {
  tag_id: {
    label: 'Asset identity tag',
    aliases: ['tag_id', 'tag', 'asset_tag', 'asset_id', 'tagid']
  },
  device_type: {
    label: 'Device type',
    aliases: ['device_type', 'asset_type', 'instrument_type', 'type', 'category']
  },
  plant: {
    label: 'Site/plant',
    aliases: ['plant', 'site', 'facility', 'plant_code']
  },
  unit: {
    label: 'Unit/area',
    aliases: ['unit', 'area', 'process_unit', 'zone', 'unit_code']
  },
  ip_address: {
    label: 'IP address',
    aliases: ['ip_address', 'ip', 'ipv4', 'discovered_ip']
  },
  hostname: {
    label: 'Hostname',
    aliases: ['hostname', 'host', 'device_name']
  },
  mac_address: {
    label: 'MAC address',
    aliases: ['mac_address', 'mac', 'macaddress']
  },
  last_seen: {
    label: 'Last seen timestamp',
    aliases: ['last_seen', 'lastseen', 'last_discovered']
  },
  network_segment: {
    label: 'Network segment',
    aliases: ['network_segment', 'segment', 'vlan']
  },
  manufacturer: {
    label: 'Manufacturer',
    aliases: ['manufacturer', 'vendor', 'oem', 'make']
  },
  model: {
    label: 'Model',
    aliases: ['model', 'device_model', 'product']
  },
  firmware: {
    label: 'Firmware version',
    aliases: ['firmware_version', 'firmware', 'fw_version']
  },
  owner: {
    label: 'Owner/team',
    aliases: ['owner', 'asset_owner', 'responsible_team']
  },
  maintenance_provider: {
    label: 'Maintenance provider',
    aliases: ['maintenance_provider', 'service_provider', 'maintainer']
  },
  last_patch_date: {
    label: 'Last patch date',
    aliases: ['last_patch_date', 'last_patched', 'patched_date']
  },
  cve_count: {
    label: 'CVE count',
    aliases: ['cve_count', 'cves']
  },
  cve_ids: {
    label: 'CVE IDs',
    aliases: ['cve_ids', 'cves_list']
  },
  cvss_score: {
    label: 'CVSS score',
    aliases: ['cvss_score', 'cvss']
  },
  epss_score: {
    label: 'EPSS score',
    aliases: ['epss_score', 'epss']
  },
  cwe_ids: {
    label: 'CWE IDs',
    aliases: ['cwe_ids', 'cwe']
  },
  risk_score: {
    label: 'Risk score',
    aliases: ['risk_score', 'risk', 'riskscore']
  },
  remote_access: {
    label: 'Remote access signal',
    aliases: ['remote_access', 'ssh_enabled', 'rdp_enabled']
  },
  lockout: {
    label: 'Auth/lockout setting',
    aliases: ['lockout_threshold', 'login_attempts_before_lockout', 'password_policy']
  },
  protocol: {
    label: 'Protocol',
    aliases: ['protocol', 'ot_protocol', 'primary_protocol']
  }
}

export const CLIENT_CONTRACT_PROFILES = {
  'generic-ot': {
    id: 'generic-ot',
    label: 'Generic OT Inventory Baseline',
    requiredSourceTypes: ['engineering', 'discovery'],
    sourceRequirements: {
      engineering: ['tag_id', 'device_type', 'plant', 'unit'],
      discovery: ['ip_address', 'hostname', 'last_seen'],
      vulnerability: ['cve_count'],
      maintenance: ['owner'],
      network: ['network_segment']
    }
  },
  mdot: {
    id: 'mdot',
    label: 'MDOT Cyber-Physical Platform RFI',
    requiredSourceTypes: ['engineering', 'discovery'],
    sourceRequirements: {
      engineering: ['tag_id', 'device_type', 'plant', 'unit', 'manufacturer'],
      discovery: ['ip_address', 'hostname', 'mac_address', 'last_seen', 'network_segment'],
      vulnerability: ['cve_count', 'cvss_score', 'risk_score'],
      maintenance: ['owner', 'maintenance_provider', 'last_patch_date'],
      network: ['network_segment', 'protocol']
    }
  },
  'transportation-dot': {
    id: 'transportation-dot',
    label: 'Transportation / DOT Infrastructure',
    requiredSourceTypes: ['engineering', 'discovery'],
    sourceRequirements: {
      engineering: ['tag_id', 'device_type', 'plant', 'unit', 'manufacturer'],
      discovery: ['ip_address', 'hostname', 'last_seen', 'network_segment'],
      vulnerability: ['cve_count', 'risk_score'],
      maintenance: ['owner', 'last_patch_date'],
      network: ['network_segment', 'protocol']
    }
  }
}

export const DEFAULT_CONTRACT_PROFILE = 'generic-ot'

export function getContractGuide(profileId = DEFAULT_CONTRACT_PROFILE) {
  const profile = CLIENT_CONTRACT_PROFILES[profileId] || CLIENT_CONTRACT_PROFILES[DEFAULT_CONTRACT_PROFILE]
  return Object.entries(profile.sourceRequirements).map(([type, groupIds]) => ({
    type,
    required: profile.requiredSourceTypes.includes(type),
    minimumFields: groupIds.map(groupId => FIELD_GROUPS[groupId]?.label || groupId)
  }))
}

export const CLIENT_REQUIREMENT_GUIDE = getContractGuide(DEFAULT_CONTRACT_PROFILE)

function normalizeHeader(header) {
  return String(header || '')
    .trim()
    .toLowerCase()
    .replace(/\s+|-/g, '_')
}

function includesAlias(headers, aliases) {
  return aliases.some(alias => headers.has(normalizeHeader(alias)))
}

function mergeHeadersByType(files) {
  const headersByType = new Map()
  for (const file of files || []) {
    const type = file?.detectedType || 'other'
    if (!headersByType.has(type)) headersByType.set(type, new Set())
    const bucket = headersByType.get(type)
    for (const header of file?.headers || []) {
      bucket.add(normalizeHeader(header))
    }
  }
  return headersByType
}

function evaluateSource(type, profile, headersByType) {
  const requiredGroups = profile.sourceRequirements[type] || []
  const headers = headersByType.get(type) || new Set()
  const present = headersByType.has(type)

  const missingGroups = requiredGroups.filter(groupId => {
    const group = FIELD_GROUPS[groupId]
    if (!group) return true
    return !includesAlias(headers, group.aliases)
  })

  return {
    type,
    present,
    required: profile.requiredSourceTypes.includes(type),
    requiredCount: requiredGroups.length,
    satisfiedCount: requiredGroups.length - missingGroups.length,
    missingGroups,
    missingLabels: missingGroups.map(groupId => FIELD_GROUPS[groupId]?.label || groupId),
    ready: present && missingGroups.length === 0
  }
}

function capabilityFromSource(source, minSatisfied = 1) {
  return Boolean(source?.present) && (source.satisfiedCount >= minSatisfied)
}

export function evaluateClientDataContract(files, profileId = DEFAULT_CONTRACT_PROFILE) {
  const profile = CLIENT_CONTRACT_PROFILES[profileId] || CLIENT_CONTRACT_PROFILES[DEFAULT_CONTRACT_PROFILE]
  const headersByType = mergeHeadersByType(files)

  const sourceStatus = {}
  for (const type of Object.keys(profile.sourceRequirements)) {
    sourceStatus[type] = evaluateSource(type, profile, headersByType)
  }

  const missingRequiredTypes = profile.requiredSourceTypes.filter(type => !sourceStatus[type]?.present)
  const requiredFieldIssues = profile.requiredSourceTypes
    .filter(type => sourceStatus[type]?.present && sourceStatus[type].missingGroups.length > 0)
    .map(type => ({
      type,
      missingLabels: sourceStatus[type].missingLabels
    }))

  const capabilities = {
    inventoryDenominator: capabilityFromSource(sourceStatus.engineering, 4) && capabilityFromSource(sourceStatus.discovery, 4),
    devicePassport: capabilityFromSource(sourceStatus.engineering, 4) && (capabilityFromSource(sourceStatus.discovery, 3) || capabilityFromSource(sourceStatus.maintenance, 2)),
    vulnerabilityEvidence: capabilityFromSource(sourceStatus.vulnerability, 2) || capabilityFromSource(sourceStatus.discovery, 2),
    ownershipEvidence: capabilityFromSource(sourceStatus.maintenance, 2),
    configurationEvidence: capabilityFromSource(sourceStatus.discovery, 4),
    topologyEvidence: capabilityFromSource(sourceStatus.discovery, 5) || capabilityFromSource(sourceStatus.network, 2),
    responseReadiness: capabilityFromSource(sourceStatus.discovery, 4) && capabilityFromSource(sourceStatus.maintenance, 1)
  }

  const capabilityCount = Object.keys(capabilities).length
  const metCapabilities = Object.values(capabilities).filter(Boolean).length
  const readinessScore = capabilityCount > 0
    ? Math.round((metCapabilities / capabilityCount) * 100)
    : 0

  return {
    profileId: profile.id,
    profileLabel: profile.label,
    sourceStatus,
    missingRequiredTypes,
    requiredFieldIssues,
    strictIssues: [
      ...missingRequiredTypes.map(type => `Missing required source: ${type}`),
      ...requiredFieldIssues.map(issue => `Missing required fields in ${issue.type}: ${issue.missingLabels.join(', ')}`)
    ],
    contractReady: missingRequiredTypes.length === 0 && requiredFieldIssues.length === 0,
    capabilities,
    readinessScore
  }
}

export function capStatusWithContract(currentStatus, isCapabilityReady) {
  if (isCapabilityReady) return currentStatus
  if (currentStatus === 'met') return 'partial'
  if (currentStatus === 'partial') return 'gap'
  return 'gap'
}

