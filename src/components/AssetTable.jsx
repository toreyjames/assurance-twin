/**
 * ASSET TABLE
 * The single source of truth. Every asset in one filterable, searchable table.
 * No charts, no decoration — just the data.
 */

import React, { useMemo, useState, useCallback } from 'react'

// Status colors
const STATUS_STYLE = {
  matched:    { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0', label: 'Matched' },
  blind_spot: { bg: '#fffbeb', color: '#92400e', border: '#fde68a', label: 'Blind Spot' },
  orphan:     { bg: '#faf5ff', color: '#6b21a8', border: '#e9d5ff', label: 'Orphan' }
}

const TIER_STYLE = {
  1: { color: '#dc2626', label: 'T1 Critical' },
  2: { color: '#f59e0b', label: 'T2 Network' },
  3: { color: '#6366f1', label: 'T3 Passive' }
}

const PAGE_SIZE = 50

// =============================================================================
// DETAIL PANEL — click a row, see everything
// =============================================================================

function DetailPanel({ asset, onClose }) {
  if (!asset) return null

  const status = asset._status
  const statusInfo = STATUS_STYLE[status] || STATUS_STYLE.matched
  const tier = asset.classification?.tier || asset.security_tier || 3
  const isManaged = asset.is_managed === true || asset.is_managed === 'true'

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: '420px',
      background: 'white', borderLeft: '2px solid #e2e8f0', zIndex: 1000,
      display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 20px rgba(0,0,0,0.1)'
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        background: '#f8fafc'
      }}>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', fontFamily: 'monospace' }}>
            {asset.tag_id || asset.ip_address || 'Unknown'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.125rem' }}>
            {asset.device_type || 'Unknown type'} — {asset.unit || 'No unit'}
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', fontSize: '1.5rem', color: '#94a3b8',
          cursor: 'pointer', lineHeight: 1, padding: '0 0.25rem'
        }}>x</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '1.25rem' }}>
        {/* Status + Tier + Managed */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <span style={{
            padding: '0.25rem 0.6rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: '600',
            background: statusInfo.bg, color: statusInfo.color, border: `1px solid ${statusInfo.border}`
          }}>{statusInfo.label}</span>
          <span style={{
            padding: '0.25rem 0.6rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: '600',
            background: '#f1f5f9', color: TIER_STYLE[tier]?.color || '#64748b'
          }}>{TIER_STYLE[tier]?.label || `Tier ${tier}`}</span>
          {(tier === 1 || tier === 2) && (
            <span style={{
              padding: '0.25rem 0.6rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: '700',
              background: isManaged ? '#f0fdf4' : '#fef2f2',
              color: isManaged ? '#166534' : '#dc2626',
              border: `1px solid ${isManaged ? '#bbf7d0' : '#fecaca'}`
            }}>{isManaged ? 'Managed' : 'NOT MANAGED'}</span>
          )}
        </div>

        {/* Status explanation */}
        {status === 'blind_spot' && (
          <div style={{ padding: '0.75rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#92400e' }}>
            This asset is in the engineering baseline but was NOT found on the network by discovery tools.
          </div>
        )}
        {status === 'orphan' && (
          <div style={{ padding: '0.75rem', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#6b21a8' }}>
            This device was found on the network but is NOT in the engineering baseline. It is undocumented.
          </div>
        )}
        {(tier === 1 || tier === 2) && !isManaged && (
          <div style={{ padding: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#dc2626' }}>
            This device requires cyber management (Tier {tier}) but is_managed = false. It lacks confirmed security controls.
          </div>
        )}

        {/* Match info */}
        {asset.matchType && (
          <Section title="MATCH DETAILS">
            <Field label="Method" value={asset.matchType} />
            <Field label="Confidence" value={asset.matchConfidence ? `${asset.matchConfidence}%` : '-'} />
          </Section>
        )}

        {/* Engineering record */}
        <Section title="ENGINEERING BASELINE">
          <Field label="Tag ID" value={asset.tag_id} />
          <Field label="Plant" value={asset.plant} />
          <Field label="Unit" value={asset.unit} />
          <Field label="Device Type" value={asset.device_type} />
          <Field label="Manufacturer" value={asset.manufacturer} />
          <Field label="Model" value={asset.model} />
          <Field label="Criticality" value={asset.criticality} />
          <Field label="Security Tier" value={tier} />
        </Section>

        {/* Discovery record */}
        <Section title="NETWORK DISCOVERY">
          <Field label="IP Address" value={asset.ip_address || asset.discovered_ip} />
          <Field label="MAC" value={asset.mac_address} />
          <Field label="Hostname" value={asset.hostname} />
          <Field label="Last Seen" value={asset.last_seen} />
          <Field label="First Seen" value={asset.first_seen} />
          <Field label="Firmware" value={asset.firmware_version} />
          <Field label="Is Managed" value={asset.is_managed === true || asset.is_managed === 'true' ? 'Yes' : 'No'} />
          <Field label="Last Patch" value={asset.last_patch_date} />
          <Field label="Risk Score" value={asset.risk_score} />
          <Field label="Vulnerabilities" value={asset.vulnerabilities} />
          <Field label="CVEs" value={asset.cve_ids} />
        </Section>

        {/* Network */}
        <Section title="NETWORK">
          <Field label="Segment" value={asset.network_segment} />
          <Field label="Protocol" value={asset.protocol} />
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{
        fontSize: '0.65rem', color: '#94a3b8', fontFamily: 'monospace', fontWeight: '600',
        letterSpacing: '0.05em', marginBottom: '0.375rem', paddingBottom: '0.25rem',
        borderBottom: '1px solid #f1f5f9'
      }}>{title}</div>
      {children}
    </div>
  )
}

function Field({ label, value }) {
  if (!value && value !== 0) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', fontSize: '0.8rem' }}>
      <span style={{ color: '#64748b' }}>{label}</span>
      <span style={{ color: '#0f172a', fontFamily: 'monospace', maxWidth: '60%', textAlign: 'right', wordBreak: 'break-all' }}>
        {String(value)}
      </span>
    </div>
  )
}

// =============================================================================
// MAIN TABLE
// =============================================================================

export default function AssetTable({ unifiedAssets, result }) {
  const [filter, setFilter] = useState('all')
  const [plantFilter, setPlantFilter] = useState('all')
  const [unitFilter, setUnitFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  // Extract unique plants and units for dropdowns
  const { plants, units } = useMemo(() => {
    const plantSet = new Set()
    const unitSet = new Set()
    for (const a of (unifiedAssets || [])) {
      const p = a.plant || a.plant_code || a.facility
      const u = a.unit || a.area
      if (p) plantSet.add(p)
      if (u) unitSet.add(u)
    }
    return {
      plants: Array.from(plantSet).sort(),
      units: Array.from(unitSet).sort()
    }
  }, [unifiedAssets])

  // Filtered units based on selected plant
  const filteredUnits = useMemo(() => {
    if (plantFilter === 'all') return units
    const unitSet = new Set()
    for (const a of (unifiedAssets || [])) {
      const p = a.plant || a.plant_code || a.facility
      if (p === plantFilter && (a.unit || a.area)) unitSet.add(a.unit || a.area)
    }
    return Array.from(unitSet).sort()
  }, [unifiedAssets, plantFilter, units])

  // Filter + search
  const filtered = useMemo(() => {
    let list = unifiedAssets || []

    // Plant filter
    if (plantFilter !== 'all') {
      list = list.filter(a => (a.plant || a.plant_code || a.facility) === plantFilter)
    }

    // Unit filter
    if (unitFilter !== 'all') {
      list = list.filter(a => (a.unit || a.area) === unitFilter)
    }

    // Status filter
    if (filter === 'matched') list = list.filter(a => a._status === 'matched')
    else if (filter === 'blind_spot') list = list.filter(a => a._status === 'blind_spot')
    else if (filter === 'orphan') list = list.filter(a => a._status === 'orphan')
    else if (filter === 'unmanaged') list = list.filter(a =>
      (a.classification?.tier === 1 || a.classification?.tier === 2 || a.security_tier === 1 || a.security_tier === 2) &&
      a.is_managed !== true && a.is_managed !== 'true'
    )

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(a =>
        (a.tag_id || '').toLowerCase().includes(q) ||
        (a.unit || '').toLowerCase().includes(q) ||
        (a.device_type || '').toLowerCase().includes(q) ||
        (a.ip_address || '').toLowerCase().includes(q) ||
        (a.hostname || '').toLowerCase().includes(q) ||
        (a.manufacturer || '').toLowerCase().includes(q) ||
        (a.plant || '').toLowerCase().includes(q)
      )
    }

    // Sort
    if (sortCol) {
      list = [...list].sort((a, b) => {
        const va = a[sortCol] ?? ''
        const vb = b[sortCol] ?? ''
        const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true })
        return sortDir === 'asc' ? cmp : -cmp
      })
    }

    return list
  }, [unifiedAssets, filter, plantFilter, unitFilter, search, sortCol, sortDir])

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // Reset page on filter/search change
  const handleFilter = useCallback(f => { setFilter(f); setPage(0) }, [])
  const handleSearch = useCallback(e => { setSearch(e.target.value); setPage(0) }, [])
  const handlePlant = useCallback(p => { setPlantFilter(p); setUnitFilter('all'); setPage(0) }, [])
  const handleUnit = useCallback(u => { setUnitFilter(u); setPage(0) }, [])

  const handleSort = useCallback(col => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }, [sortCol])

  // Counts for filter badges (scoped to current plant/unit selection)
  const counts = useMemo(() => {
    let all = unifiedAssets || []
    if (plantFilter !== 'all') all = all.filter(a => (a.plant || a.plant_code || a.facility) === plantFilter)
    if (unitFilter !== 'all') all = all.filter(a => (a.unit || a.area) === unitFilter)
    return {
      all: all.length,
      matched: all.filter(a => a._status === 'matched').length,
      blind_spot: all.filter(a => a._status === 'blind_spot').length,
      orphan: all.filter(a => a._status === 'orphan').length,
      unmanaged: all.filter(a =>
        (a.classification?.tier === 1 || a.classification?.tier === 2 || a.security_tier === 1 || a.security_tier === 2) &&
        a.is_managed !== true && a.is_managed !== 'true'
      ).length
    }
  }, [unifiedAssets])

  const filterBtn = (id, label, count, color) => (
    <button
      key={id}
      onClick={() => handleFilter(id)}
      style={{
        padding: '0.375rem 0.75rem', borderRadius: '0.25rem', cursor: 'pointer',
        fontSize: '0.8rem', fontWeight: filter === id ? '700' : '500',
        background: filter === id ? `${color}15` : 'white',
        color: filter === id ? color : '#64748b',
        border: `1.5px solid ${filter === id ? color : '#e2e8f0'}`,
        display: 'flex', alignItems: 'center', gap: '0.375rem'
      }}
    >
      {label}
      <span style={{
        fontSize: '0.7rem', fontFamily: 'monospace', fontWeight: '700',
        color: filter === id ? color : '#94a3b8'
      }}>{count.toLocaleString()}</span>
    </button>
  )

  const colHeader = (col, label, width) => (
    <th
      key={col}
      onClick={() => handleSort(col)}
      style={{
        padding: '0.5rem 0.625rem', textAlign: 'left', cursor: 'pointer',
        fontSize: '0.7rem', fontWeight: '600', color: '#64748b',
        fontFamily: 'monospace', letterSpacing: '0.03em', width,
        borderBottom: '2px solid #e2e8f0', background: '#f8fafc',
        whiteSpace: 'nowrap', userSelect: 'none'
      }}
    >
      {label} {sortCol === col ? (sortDir === 'asc' ? '\u25B2' : '\u25BC') : ''}
    </th>
  )

  const selectStyle = {
    padding: '0.375rem 0.5rem', border: '1.5px solid #e2e8f0', borderRadius: '0.25rem',
    fontSize: '0.8rem', background: 'white', cursor: 'pointer', color: '#0f172a'
  }

  return (
    <div>
      {/* Plant / Unit Filters */}
      {plants.length > 1 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600', fontFamily: 'monospace' }}>PLANT:</label>
          <select value={plantFilter} onChange={e => handlePlant(e.target.value)} style={selectStyle}>
            <option value="all">All Plants ({plants.length})</option>
            {plants.map(p => {
              const c = (unifiedAssets || []).filter(a => (a.plant || a.plant_code || a.facility) === p).length
              return <option key={p} value={p}>{p} ({c.toLocaleString()})</option>
            })}
          </select>

          <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600', fontFamily: 'monospace', marginLeft: '0.5rem' }}>UNIT:</label>
          <select value={unitFilter} onChange={e => handleUnit(e.target.value)} style={selectStyle}>
            <option value="all">All Units ({filteredUnits.length})</option>
            {filteredUnits.map(u => {
              let scope = unifiedAssets || []
              if (plantFilter !== 'all') scope = scope.filter(a => (a.plant || a.plant_code || a.facility) === plantFilter)
              const c = scope.filter(a => (a.unit || a.area) === u).length
              return <option key={u} value={u}>{u} ({c.toLocaleString()})</option>
            })}
          </select>

          {(plantFilter !== 'all' || unitFilter !== 'all') && (
            <button onClick={() => { handlePlant('all') }} style={{
              padding: '0.25rem 0.5rem', background: 'none', border: '1px solid #e2e8f0',
              borderRadius: '0.25rem', fontSize: '0.75rem', color: '#64748b', cursor: 'pointer'
            }}>Clear</button>
          )}
        </div>
      )}

      {/* Status Filters + Search */}
      <div style={{
        display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem',
        alignItems: 'center'
      }}>
        {filterBtn('all', 'All', counts.all, '#0f172a')}
        {filterBtn('matched', 'Matched', counts.matched, '#16a34a')}
        {filterBtn('blind_spot', 'Blind Spots', counts.blind_spot, '#d97706')}
        {filterBtn('orphan', 'Orphans', counts.orphan, '#7c3aed')}
        {filterBtn('unmanaged', 'Unmanaged', counts.unmanaged, '#dc2626')}

        <div style={{ marginLeft: 'auto' }}>
          <input
            type="text"
            placeholder="Search tag, unit, type, IP..."
            value={search}
            onChange={handleSearch}
            style={{
              padding: '0.375rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.25rem',
              fontSize: '0.8rem', width: '240px', outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr>
              {colHeader('tag_id', 'TAG ID', '15%')}
              {colHeader('plant', 'PLANT', '10%')}
              {colHeader('unit', 'UNIT', '12%')}
              {colHeader('device_type', 'TYPE', '12%')}
              {colHeader('_status', 'STATUS', '10%')}
              {colHeader('security_tier', 'TIER', '7%')}
              {colHeader('is_managed', 'MANAGED', '8%')}
              {colHeader('ip_address', 'IP', '12%')}
              {colHeader('last_seen', 'LAST SEEN', '14%')}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  {search ? 'No assets match your search.' : 'No assets to display.'}
                </td>
              </tr>
            )}
            {pageData.map((asset, i) => {
              const status = asset._status
              const si = STATUS_STYLE[status] || STATUS_STYLE.matched
              const tier = asset.classification?.tier || asset.security_tier || 3
              const ti = TIER_STYLE[tier] || {}
              const isManaged = asset.is_managed === true || asset.is_managed === 'true'
              const needsMgmt = tier === 1 || tier === 2
              const isSelected = selectedAsset === asset

              return (
                <tr
                  key={`${asset.tag_id || asset.ip_address || i}-${i}`}
                  onClick={() => setSelectedAsset(isSelected ? null : asset)}
                  style={{
                    cursor: 'pointer',
                    background: isSelected ? '#eff6ff' : i % 2 === 0 ? 'white' : '#fafafa',
                    borderBottom: '1px solid #f1f5f9'
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#fafafa' }}
                >
                  <td style={{ padding: '0.5rem 0.625rem', fontFamily: 'monospace', fontWeight: '600', color: '#0f172a' }}>
                    {asset.tag_id || asset.ip_address || '-'}
                  </td>
                  <td style={{ padding: '0.5rem 0.625rem', color: '#475569' }}>
                    {(asset.plant || '-').length > 15 ? (asset.plant || '-').slice(0, 15) + '...' : (asset.plant || '-')}
                  </td>
                  <td style={{ padding: '0.5rem 0.625rem', color: '#475569' }}>
                    {asset.unit || '-'}
                  </td>
                  <td style={{ padding: '0.5rem 0.625rem', color: '#475569' }}>
                    {asset.device_type || '-'}
                  </td>
                  <td style={{ padding: '0.5rem 0.625rem' }}>
                    <span style={{
                      padding: '0.15rem 0.4rem', borderRadius: '0.2rem', fontSize: '0.7rem', fontWeight: '600',
                      background: si.bg, color: si.color, border: `1px solid ${si.border}`
                    }}>{si.label}</span>
                  </td>
                  <td style={{ padding: '0.5rem 0.625rem', fontFamily: 'monospace', color: ti.color || '#64748b', fontWeight: '600' }}>
                    {tier}
                  </td>
                  <td style={{ padding: '0.5rem 0.625rem' }}>
                    {needsMgmt ? (
                      <span style={{
                        fontWeight: '700', fontSize: '0.75rem',
                        color: isManaged ? '#16a34a' : '#dc2626'
                      }}>{isManaged ? 'Yes' : 'No'}</span>
                    ) : (
                      <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '0.5rem 0.625rem', fontFamily: 'monospace', color: '#475569', fontSize: '0.75rem' }}>
                    {asset.ip_address || asset.discovered_ip || '-'}
                  </td>
                  <td style={{ padding: '0.5rem 0.625rem', color: '#94a3b8', fontSize: '0.75rem' }}>
                    {asset.last_seen ? new Date(asset.last_seen).toLocaleDateString() : '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0.75rem 0', fontSize: '0.8rem', color: '#64748b'
      }}>
        <div>
          Showing {Math.min(page * PAGE_SIZE + 1, filtered.length)}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()}
          {filter !== 'all' && ` (filtered from ${counts.all.toLocaleString()})`}
        </div>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{
              padding: '0.375rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.25rem',
              background: 'white', cursor: page === 0 ? 'default' : 'pointer',
              opacity: page === 0 ? 0.4 : 1, fontSize: '0.8rem'
            }}
          >Prev</button>
          <span style={{ padding: '0.375rem 0.5rem', fontFamily: 'monospace' }}>
            {page + 1}/{totalPages || 1}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            style={{
              padding: '0.375rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.25rem',
              background: 'white', cursor: page >= totalPages - 1 ? 'default' : 'pointer',
              opacity: page >= totalPages - 1 ? 0.4 : 1, fontSize: '0.8rem'
            }}
          >Next</button>
        </div>
      </div>

      {/* Detail panel */}
      {selectedAsset && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setSelectedAsset(null)}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.2)', zIndex: 999 }}
          />
          <DetailPanel asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
        </>
      )}
    </div>
  )
}
