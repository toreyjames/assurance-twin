#!/usr/bin/env node
/**
 * Generate realistic discovery CSV for the medium refinery demo.
 * 
 * - Reads existing engineering baseline
 * - Ensures ~85% of engineering rows have IP addresses
 * - Generates discovery rows matching ~70% of engineering IPs
 * - Adds ~400 orphan discovery rows
 * - Writes updated engineering + new discovery CSVs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENG_PATH = path.join(__dirname, '..', 'public', 'samples', 'demo', 'oil-gas', 'engineering_baseline_medium.csv')
const DISC_PATH = path.join(__dirname, '..', 'public', 'samples', 'demo', 'oil-gas', 'ot_discovery_medium.csv')

const MANUFACTURERS = ['Siemens', 'Honeywell', 'Allen-Bradley', 'Schneider', 'Yokogawa', 'Emerson', 'ABB', 'GE', 'Mitsubishi', 'Omron']
const PROTOCOLS = ['Modbus TCP', 'EtherNet/IP', 'PROFINET', 'OPC UA', 'BACnet', 'DNP3', 'S7', 'HART-IP']

function randomIP() {
  const subnet = [10, 172, 192][Math.floor(Math.random() * 3)]
  if (subnet === 10) return `10.${rand(1,254)}.${rand(1,254)}.${rand(1,254)}`
  if (subnet === 172) return `172.${rand(16,31)}.${rand(1,254)}.${rand(1,254)}`
  return `192.168.${rand(1,254)}.${rand(1,254)}`
}

function randomMAC() {
  return Array.from({ length: 6 }, () => rand(0, 255).toString(16).padStart(2, '0').toUpperCase()).join(':')
}

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

function parseCSV(text) {
  const lines = text.trim().split('\n')
  const headers = lines[0].split(',')
  return lines.slice(1).map(line => {
    const vals = line.split(',')
    const obj = {}
    headers.forEach((h, i) => obj[h.trim()] = (vals[i] || '').trim())
    return obj
  })
}

function toCSV(rows, headers) {
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map(h => row[h] || '').join(','))
  }
  return lines.join('\n')
}

// Device type -> realistic discovery attributes
const DEVICE_PROFILES = {
  PLC:          { managed: 0.95, patched: 0.80, vulns: [0,3],  cves: [0,2] },
  DCS:          { managed: 0.95, patched: 0.85, vulns: [0,2],  cves: [0,1] },
  HMI:          { managed: 0.90, patched: 0.70, vulns: [0,4],  cves: [0,3] },
  SCADA:        { managed: 0.95, patched: 0.75, vulns: [0,3],  cves: [0,2] },
  RTU:          { managed: 0.85, patched: 0.60, vulns: [0,5],  cves: [0,3] },
  Controller:   { managed: 0.90, patched: 0.75, vulns: [0,3],  cves: [0,2] },
  Server:       { managed: 0.95, patched: 0.90, vulns: [0,2],  cves: [0,1] },
  Historian:    { managed: 0.90, patched: 0.80, vulns: [0,3],  cves: [0,2] },
  Engineering_Workstation: { managed: 0.85, patched: 0.70, vulns: [0,4], cves: [0,3] },
  Safety_Controller: { managed: 0.95, patched: 0.85, vulns: [0,1], cves: [0,1] },
  Switch:       { managed: 0.80, patched: 0.50, vulns: [0,5],  cves: [0,4] },
  Gateway:      { managed: 0.75, patched: 0.55, vulns: [0,6],  cves: [0,4] },
  Protocol_Converter: { managed: 0.70, patched: 0.45, vulns: [0,6], cves: [0,5] },
  Analyzer:     { managed: 0.65, patched: 0.40, vulns: [0,4],  cves: [0,3] },
  VFD:          { managed: 0.60, patched: 0.35, vulns: [0,3],  cves: [0,2] },
  Smart_Transmitter: { managed: 0.55, patched: 0.30, vulns: [0,3], cves: [0,2] },
  IP_Camera:    { managed: 0.50, patched: 0.25, vulns: [1,8],  cves: [0,6] },
  default:      { managed: 0.40, patched: 0.20, vulns: [0,2],  cves: [0,1] }
}

function makeDiscoveryRow(engRow, ip) {
  const profile = DEVICE_PROFILES[engRow.device_type] || DEVICE_PROFILES.default
  const isManaged = Math.random() < profile.managed
  const isPatched = Math.random() < profile.patched
  const vulns = rand(profile.vulns[0], profile.vulns[1])
  const cves = rand(profile.cves[0], profile.cves[1])

  const daysAgo = rand(0, 14)
  const lastSeen = new Date(Date.now() - daysAgo * 86400000).toISOString().split('T')[0]

  return {
    ip_address: ip,
    hostname: engRow.hostname || '',
    mac_address: randomMAC(),
    device_type: engRow.device_type,
    manufacturer: engRow.manufacturer || pick(MANUFACTURERS),
    model: engRow.model || '',
    is_managed: isManaged ? 'true' : 'false',
    has_security_patches: isPatched ? 'true' : 'false',
    encryption_enabled: Math.random() < 0.4 ? 'true' : 'false',
    authentication_required: Math.random() < 0.6 ? 'true' : 'false',
    firewall_protected: Math.random() < 0.5 ? 'true' : 'false',
    access_control: pick(['None', 'Basic', 'Role-Based', 'MFA']),
    vulnerabilities: String(vulns),
    cve_count: String(cves),
    last_seen: lastSeen,
    confidence_level: String(rand(50, 99)),
    firmware_version: `v${rand(1,20)}.${rand(0,9)}.${rand(0,9)}`,
    protocol: pick(PROTOCOLS)
  }
}

function main() {
  console.log('Reading engineering baseline...')
  const engText = fs.readFileSync(ENG_PATH, 'utf-8')
  const engRows = parseCSV(engText)
  console.log(`  ${engRows.length} rows`)

  // Step 1: Assign IPs to ~85% of engineering rows that don't have them
  const usedIPs = new Set()
  let ipAssigned = 0
  for (const row of engRows) {
    if (row.ip_address) {
      usedIPs.add(row.ip_address)
      continue
    }
    if (Math.random() < 0.83) {
      let ip
      do { ip = randomIP() } while (usedIPs.has(ip))
      usedIPs.add(ip)
      row.ip_address = ip
      if (!row.hostname) row.hostname = row.tag_id ? row.tag_id.replace(/^(\w+)-(\w+)-(\d+)$/, '$1-$3') : ''
      ipAssigned++
    }
  }
  console.log(`  Assigned IPs to ${ipAssigned} rows (total with IP: ${usedIPs.size})`)

  // Write updated engineering CSV
  const engHeaders = ['tag_id', 'plant', 'unit', 'device_type', 'manufacturer', 'model', 'ip_address', 'hostname']
  fs.writeFileSync(ENG_PATH, toCSV(engRows, engHeaders))
  console.log(`  Updated engineering baseline written`)

  // Step 2: Pick ~70% of engineering rows to generate matching discovery
  const withIP = engRows.filter(r => r.ip_address)
  const targetMatch = Math.round(engRows.length * 0.70) // ~8,400
  const shuffled = withIP.sort(() => Math.random() - 0.5)
  const toMatch = shuffled.slice(0, Math.min(targetMatch, shuffled.length))

  console.log(`Generating ${toMatch.length} matched discovery rows...`)
  const discRows = toMatch.map(eng => makeDiscoveryRow(eng, eng.ip_address))

  // Step 3: Add ~400 orphan rows (discovery-only, no engineering match)
  const orphanCount = 400
  console.log(`Adding ${orphanCount} orphan discovery rows...`)
  const orphanTypes = ['Unknown', 'Switch', 'IP_Camera', 'Gateway', 'Smart_Transmitter', 'VFD', 'Analyzer']
  for (let i = 0; i < orphanCount; i++) {
    let ip
    do { ip = randomIP() } while (usedIPs.has(ip))
    usedIPs.add(ip)
    const dt = pick(orphanTypes)
    discRows.push(makeDiscoveryRow(
      { device_type: dt, manufacturer: pick(MANUFACTURERS), model: `${dt}-${rand(100,999)}`, hostname: '' },
      ip
    ))
  }

  // Shuffle discovery rows
  discRows.sort(() => Math.random() - 0.5)

  // Write discovery CSV
  const discHeaders = ['ip_address', 'hostname', 'mac_address', 'device_type', 'manufacturer', 'model',
    'is_managed', 'has_security_patches', 'encryption_enabled', 'authentication_required',
    'firewall_protected', 'access_control', 'vulnerabilities', 'cve_count', 'last_seen',
    'confidence_level', 'firmware_version', 'protocol']
  fs.writeFileSync(DISC_PATH, toCSV(discRows, discHeaders))
  console.log(`\nDone!`)
  console.log(`  Engineering: ${engRows.length} rows`)
  console.log(`  Discovery:   ${discRows.length} rows (${toMatch.length} matched + ${orphanCount} orphans)`)
  console.log(`  Expected coverage: ~${Math.round(toMatch.length / engRows.length * 100)}%`)
}

main()
