const DEFAULT_SITE = 'Unknown Site'
const DEFAULT_UNIT = 'Unassigned'

function sourceStatus(asset) {
  return asset?._status || asset?.match_type || asset?.matchType || 'matched'
}

function assetTier(asset) {
  const tier = Number(asset?.classification?.tier || asset?.security_tier || asset?.tier)
  if ([1, 2, 3].includes(tier)) return tier

  const deviceType = String(asset?.device_type || asset?.instrument_type || '').toLowerCase()
  const hasNetworkIdentity = Boolean(asset?.ip_address || asset?.mac_address || asset?.hostname)

  if (/plc|dcs|hmi|scada|rtu|controller|server|workstation|historian|safety|sis|switch|router|firewall|gateway/.test(deviceType)) {
    return 1
  }
  if (hasNetworkIdentity || /smart|ethernet|profinet|modbus|camera|analyzer|vfd|drive|inverter/.test(deviceType)) {
    return 2
  }
  return 3
}

function assetSite(asset) {
  return asset?.plant || asset?.plant_code || asset?.facility || DEFAULT_SITE
}

function assetUnit(asset) {
  return asset?.unit || asset?.area || asset?.location || DEFAULT_UNIT
}

function subnetFromAsset(asset) {
  const explicit = asset?.network_segment || asset?.subnet
  if (explicit) return String(explicit).replace(/\/24$/, '')

  const ip = asset?.ip_address || asset?.discovered_ip
  if (!ip) return null
  const parts = String(ip).split('.')
  if (parts.length !== 4) return null
  return parts.slice(0, 3).join('.')
}

function pushAsset(target, asset, status) {
  const tier = assetTier(asset)
  const subnet = subnetFromAsset(asset)
  const protocol = asset?.protocol || asset?.ot_protocol || asset?._raw?.proto

  target.assets.push({ ...asset, _status: status, security_tier: tier })
  target.count += 1
  target[`tier${tier}`] += 1

  if (status === 'matched') target.matched += 1
  if (status === 'blind_spot') target.blindSpots += 1
  if (status === 'orphan') target.orphans += 1
  if (subnet) target.subnets.add(subnet)
  if (protocol) target.protocols.add(String(protocol))
}

function createUnit(name, site) {
  return {
    name,
    site,
    count: 0,
    matched: 0,
    blindSpots: 0,
    orphans: 0,
    tier1: 0,
    tier2: 0,
    tier3: 0,
    assets: [],
    subnets: new Set(),
    protocols: new Set()
  }
}

function buildUnifiedAssets(result) {
  const assets = []
  for (const asset of result?.assets || []) assets.push({ ...asset, _status: sourceStatus(asset) || 'matched' })
  for (const asset of result?.blindSpots || []) assets.push({ ...asset, _status: 'blind_spot' })
  for (const asset of result?.orphans || []) assets.push({ ...asset, _status: 'orphan' })
  return assets
}

function buildNetworkConduits(units) {
  const subnetUnits = new Map()

  units.forEach(unit => {
    unit.subnets.forEach(subnet => {
      if (!subnetUnits.has(subnet)) subnetUnits.set(subnet, [])
      subnetUnits.get(subnet).push(unit)
    })
  })

  const conduitMap = new Map()
  subnetUnits.forEach((members, subnet) => {
    if (members.length < 2) return
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const [from, to] = [members[i].name, members[j].name].sort()
        const key = `${from}::${to}`
        if (!conduitMap.has(key)) {
          conduitMap.set(key, {
            from,
            to,
            subnets: [],
            protocols: new Set(),
            critical: false,
            assets: 0
          })
        }
        const conduit = conduitMap.get(key)
        conduit.subnets.push(subnet)
        members[i].protocols.forEach(protocol => conduit.protocols.add(protocol))
        members[j].protocols.forEach(protocol => conduit.protocols.add(protocol))
        conduit.critical = conduit.critical || members[i].tier1 > 0 || members[j].tier1 > 0
        conduit.assets += members[i].count + members[j].count
      }
    }
  })

  return Array.from(conduitMap.values())
    .map(conduit => ({
      ...conduit,
      protocols: Array.from(conduit.protocols).sort(),
      strength: Math.min(1, conduit.subnets.length * 0.25)
    }))
    .sort((a, b) => b.subnets.length - a.subnets.length)
}

export function buildPlantMapModel(result, { selectedPlant = 'all' } = {}) {
  const allAssets = buildUnifiedAssets(result)
  const filteredAssets = selectedPlant === 'all'
    ? allAssets
    : allAssets.filter(asset => assetSite(asset) === selectedPlant)

  const unitMap = new Map()
  const siteSet = new Set()
  const summary = {
    totalAssets: 0,
    matched: 0,
    blindSpots: 0,
    orphans: 0,
    tier1: 0,
    tier2: 0,
    tier3: 0,
    networkable: 0,
    passive: 0,
    subnets: new Set(),
    protocols: new Set()
  }

  filteredAssets.forEach(asset => {
    const site = assetSite(asset)
    const unitName = assetUnit(asset)
    const status = sourceStatus(asset)
    const tier = assetTier(asset)
    const subnet = subnetFromAsset(asset)
    const protocol = asset?.protocol || asset?.ot_protocol || asset?._raw?.proto

    siteSet.add(site)
    summary.totalAssets += 1
    summary[`tier${tier}`] += 1
    if (tier === 1 || tier === 2) summary.networkable += 1
    if (tier === 3) summary.passive += 1
    if (status === 'matched') summary.matched += 1
    if (status === 'blind_spot') summary.blindSpots += 1
    if (status === 'orphan') summary.orphans += 1
    if (subnet) summary.subnets.add(subnet)
    if (protocol) summary.protocols.add(String(protocol))

    const key = `${site}::${unitName}`
    if (!unitMap.has(key)) unitMap.set(key, createUnit(unitName, site))
    pushAsset(unitMap.get(key), asset, status)
  })

  const units = Array.from(unitMap.values()).map(unit => ({
    ...unit,
    subnets: Array.from(unit.subnets).sort(),
    protocols: Array.from(unit.protocols).sort()
  })).sort((a, b) => {
    const criticalDelta = b.tier1 - a.tier1
    if (criticalDelta !== 0) return criticalDelta
    return b.count - a.count
  })

  return {
    assets: filteredAssets,
    plants: Array.from(siteSet).filter(site => site !== DEFAULT_SITE).sort(),
    units,
    network: {
      conduits: buildNetworkConduits(units.map(unit => ({
        ...unit,
        subnets: new Set(unit.subnets),
        protocols: new Set(unit.protocols)
      }))),
      subnets: Array.from(summary.subnets).sort(),
      protocols: Array.from(summary.protocols).sort()
    },
    summary: (() => {
      const documented = summary.matched + summary.blindSpots
      const discovered = summary.matched + summary.orphans
      const inScope = summary.matched + summary.blindSpots + summary.orphans
      const discoveryCoverage = documented > 0
        ? Math.round((summary.matched / documented) * 100)
        : 0

      return {
        ...summary,
        subnets: summary.subnets.size,
        protocols: summary.protocols.size,
        // Canonical denominators (used everywhere in the UI).
        // documented = engineering baseline (matched + blind spots)
        // discovered = anything seen on network (matched + orphans)
        // inScope    = union of both worlds (matched + blind spots + orphans)
        documented,
        discovered,
        inScope,
        discoveryCoverage,
        // Legacy aliases - retained so older consumers keep working.
        coveragePercent: discoveryCoverage
      }
    })()
  }
}

export default buildPlantMapModel
