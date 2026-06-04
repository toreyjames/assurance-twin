import React from 'react'

function firstValue(asset, keys) {
  for (const key of keys) {
    const value = asset?.[key]
    if (value === 0) return value
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && !Number.isNaN(value)) return value
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  }
  return ''
}

function listValue(value, maxItems = 4) {
  if (!Array.isArray(value) || value.length === 0) return ''
  const shown = value.slice(0, maxItems).map(v => String(v))
  if (value.length > maxItems) shown.push(`+${value.length - maxItems} more`)
  return shown.join(', ')
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div style={{
        fontSize: '0.6rem',
        color: '#64748b',
        fontFamily: 'monospace',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '0.35rem'
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Row({ label, value }) {
  if (!value && value !== 0) return null
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      gap: '0.5rem',
      padding: '0.15rem 0',
      borderBottom: '1px solid #1e293b'
    }}>
      <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{label}</span>
      <span style={{ color: '#e2e8f0', fontSize: '0.75rem', fontFamily: 'monospace', textAlign: 'right' }}>
        {String(value)}
      </span>
    </div>
  )
}

export default function DevicePassport({ asset }) {
  if (!asset) return null

  const sourceCount = Array.isArray(asset.evidence?.sources) ? asset.evidence.sources.length : 0
  const sourceLabel = sourceCount > 0 ? `${sourceCount} source records` : ''

  const nestedDevicesRaw = firstValue(asset, ['nested_device_count', 'nested_devices_count', 'subcomponent_count'])
  const nestedDevices =
    nestedDevicesRaw ||
    (Array.isArray(asset.nested_devices) ? asset.nested_devices.length : 0) ||
    (Array.isArray(asset.subcomponents) ? asset.subcomponents.length : 0) ||
    ''

  const interfaceCount =
    firstValue(asset, ['interfacing_device_count', 'interface_count']) ||
    (Array.isArray(asset.interfacing_devices) ? asset.interfacing_devices.length : 0) ||
    ''

  const hasExplicitConfig = [
    'login_attempts_before_lockout',
    'lockout_threshold',
    'password_policy',
    'remote_access',
    'ssh_enabled',
    'rdp_enabled',
    'usb_enabled'
  ].some(key => asset?.[key] != null && String(asset[key]).trim() !== '')

  return (
    <div style={{
      marginTop: '0.75rem',
      padding: '0.7rem',
      background: '#0b1220',
      border: '1px solid #1e293b',
      borderRadius: '0.45rem'
    }}>
      <div style={{
        fontSize: '0.62rem',
        color: '#94a3b8',
        fontFamily: 'monospace',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '0.5rem'
      }}>
        Device Passport (RFI-Oriented)
      </div>

      <Section title="Pedigree">
        <Row label="Manufacturer" value={firstValue(asset, ['manufacturer', 'vendor', 'oem'])} />
        <Row label="Model" value={firstValue(asset, ['model', 'model_number'])} />
        <Row label="Firmware" value={firstValue(asset, ['firmware_version', 'firmware', 'fw_version'])} />
        <Row label="Lifecycle status" value={firstValue(asset, ['lifecycle_status', 'lifecycleState']) || asset.lifecycleStatus?.status} />
        <Row label="Nested devices" value={nestedDevices} />
        <Row label="Source corroboration" value={sourceLabel} />
      </Section>

      <Section title="Operations and Ownership">
        <Row label="Maintenance provider" value={firstValue(asset, ['maintenance_provider', 'service_provider', 'maintainer'])} />
        <Row label="Owner/team" value={firstValue(asset, ['asset_owner', 'owner', 'responsible_team'])} />
        <Row label="Managed" value={firstValue(asset, ['is_managed'])} />
        <Row label="Last patch date" value={firstValue(asset, ['last_patch_date'])} />
      </Section>

      <Section title="Interfaces and Connectivity">
        <Row label="Plant / Unit" value={[asset.plant, asset.unit].filter(Boolean).join(' / ')} />
        <Row label="Segment" value={firstValue(asset, ['network_segment', 'segment'])} />
        <Row label="Protocol" value={firstValue(asset, ['protocol', 'primary_protocol'])} />
        <Row label="Interfacing devices" value={interfaceCount} />
      </Section>

      <Section title="Configuration Signals">
        <Row label="Login attempts before lockout" value={firstValue(asset, ['login_attempts_before_lockout', 'lockout_threshold'])} />
        <Row label="Remote access enabled" value={firstValue(asset, ['remote_access', 'ssh_enabled', 'rdp_enabled'])} />
        <Row label="USB/serial bridge signal" value={firstValue(asset, ['usb_enabled', 'serial_bridge_present'])} />
        {!hasExplicitConfig && (
          <div style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'monospace' }}>
            No explicit configuration baseline fields detected in current source files.
          </div>
        )}
      </Section>

      <Section title="Risk and Vulnerability Evidence">
        <Row label="Risk score" value={firstValue(asset, ['risk_score'])} />
        <Row label="CVE count" value={firstValue(asset, ['cve_count'])} />
        <Row label="CVEs" value={firstValue(asset, ['cve_ids']) || listValue(asset.cves)} />
        <Row label="CVSS" value={firstValue(asset, ['cvss_score', 'cvss'])} />
        <Row label="EPSS" value={firstValue(asset, ['epss_score', 'epss'])} />
        <Row label="CWE" value={firstValue(asset, ['cwe', 'cwe_ids']) || listValue(asset.cwe_ids)} />
      </Section>

      <Section title="Provenance and Corroboration">
        <Row label="Epistemic status" value={asset.evidence?.epistemic_status} />
        <Row label="Match strategy" value={firstValue(asset, ['matchType', 'match_type'])} />
        <Row label="Match confidence" value={asset.matchConfidence != null ? `${asset.matchConfidence}%` : ''} />
        <Row label="Validation confidence" value={asset.validation?.confidence} />
        <Row label="Source records" value={Array.isArray(asset.evidence?.sources) ? asset.evidence.sources.map(s => s.source).join(', ') : ''} />
      </Section>
    </div>
  )
}
