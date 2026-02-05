/**
 * ENGINEER-GRADE PLANT SCHEMATIC
 * 
 * Professional industrial plant layout visualization modeled after
 * engineering control room displays and ISA-95 compliant drawings.
 * 
 * Features:
 *   - Drawing border with title block (revision, date, scale, drawing number)
 *   - ISA-95 / Purdue zone demarcation boundaries
 *   - Proportional buildings based on real floor area
 *   - Interior equipment density visualization
 *   - Coverage ratio indicators per building
 *   - Orthogonal (right-angle) production flow routing
 *   - Risk/gap overlay indicators
 *   - Network subnet labels
 *   - Purdue level badges
 *   - SVG pan/zoom with mouse wheel + drag
 *   - Level-of-detail: more info at higher zoom
 *   - Export to PNG at 2x DPI
 *   - Deterministic layout (same data = same drawing)
 */

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { generatePlantLayout, computeOrthogonalPath } from '../lib/context/layout-engine.js'
import html2canvas from 'html2canvas'

// =============================================================================
// VISUAL CONFIGURATION
// =============================================================================

const UNIT_COLORS = {
  stamping:        { primary: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  stroke: 'rgba(245,158,11,0.6)' },
  body_shop:       { primary: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  stroke: 'rgba(59,130,246,0.6)' },
  paint_shop:      { primary: '#a855f7', bg: 'rgba(168,85,247,0.08)',  stroke: 'rgba(168,85,247,0.6)' },
  plastics:        { primary: '#06b6d4', bg: 'rgba(6,182,212,0.08)',   stroke: 'rgba(6,182,212,0.6)' },
  assembly:        { primary: '#22c55e', bg: 'rgba(34,197,94,0.08)',   stroke: 'rgba(34,197,94,0.6)' },
  powertrain:      { primary: '#ef4444', bg: 'rgba(239,68,68,0.08)',   stroke: 'rgba(239,68,68,0.6)' },
  battery:         { primary: '#f97316', bg: 'rgba(249,115,22,0.08)',  stroke: 'rgba(249,115,22,0.6)' },
  quality:         { primary: '#6366f1', bg: 'rgba(99,102,241,0.08)',  stroke: 'rgba(99,102,241,0.6)' },
  logistics:       { primary: '#64748b', bg: 'rgba(100,116,139,0.08)',stroke: 'rgba(100,116,139,0.6)' },
  plant_utilities: { primary: '#84cc16', bg: 'rgba(132,204,22,0.08)', stroke: 'rgba(132,204,22,0.6)' }
}

const DEFAULT_COLORS = { primary: '#94a3b8', bg: 'rgba(148,163,184,0.06)', stroke: 'rgba(148,163,184,0.4)' }

const UNIT_LABELS = {
  stamping: 'STAMPING', body_shop: 'BODY SHOP', paint_shop: 'PAINT SHOP',
  plastics: 'PLASTICS', assembly: 'FINAL ASSEMBLY', powertrain: 'POWERTRAIN',
  battery: 'BATTERY PACK', quality: 'QUALITY / TEST', logistics: 'LOGISTICS',
  plant_utilities: 'UTILITIES'
}

const UNIT_SHORT = {
  stamping: 'STP', body_shop: 'BDY', paint_shop: 'PNT', plastics: 'PLS',
  assembly: 'ASM', powertrain: 'PWR', battery: 'BAT', quality: 'QTY',
  logistics: 'LOG', plant_utilities: 'UTL'
}

const PURDUE_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7']
const PURDUE_LABELS = ['L0 PROCESS', 'L1 CONTROL', 'L2 SUPERVISORY', 'L3 OPERATIONS', 'L4 ENTERPRISE']

// =============================================================================
// DRAWING BORDER & TITLE BLOCK
// =============================================================================

function DrawingBorder({ width, height, plantName, totalAssets, totalUnits, date }) {
  const bw = 2 // border width
  const tbH = 50 // title block height
  const tbW = 320 // title block width

  return (
    <g className="drawing-border">
      {/* Outer border */}
      <rect x={bw} y={bw} width={width - bw * 2} height={height - bw * 2}
        fill="none" stroke="#334155" strokeWidth={bw} />
      {/* Inner border */}
      <rect x={bw + 4} y={bw + 4} width={width - bw * 2 - 8} height={height - bw * 2 - 8}
        fill="none" stroke="#1e293b" strokeWidth={1} />

      {/* Title block (bottom-right) */}
      <g transform={`translate(${width - tbW - bw - 6}, ${height - tbH - bw - 6})`}>
        <rect width={tbW} height={tbH} fill="#0f172a" stroke="#334155" strokeWidth={1.5} />
        {/* Vertical dividers */}
        <line x1={tbW * 0.55} y1={0} x2={tbW * 0.55} y2={tbH} stroke="#1e293b" strokeWidth={1} />
        <line x1={tbW * 0.78} y1={0} x2={tbW * 0.78} y2={tbH} stroke="#1e293b" strokeWidth={1} />
        {/* Horizontal divider */}
        <line x1={0} y1={tbH * 0.5} x2={tbW} y2={tbH * 0.5} stroke="#1e293b" strokeWidth={1} />

        {/* Title */}
        <text x={8} y={18} fill="#e2e8f0" fontSize="11" fontWeight="700" fontFamily="'JetBrains Mono', 'Fira Code', monospace">
          OT ASSURANCE TWIN
        </text>
        <text x={8} y={32} fill="#64748b" fontSize="8" fontFamily="monospace">
          {plantName || 'ALL SITES'} — PLANT SCHEMATIC
        </text>
        <text x={8} y={44} fill="#475569" fontSize="7" fontFamily="monospace">
          AIGNE CONTEXT FRAMEWORK
        </text>

        {/* Stats column */}
        <text x={tbW * 0.55 + 8} y={15} fill="#64748b" fontSize="7" fontFamily="monospace">UNITS</text>
        <text x={tbW * 0.55 + 8} y={28} fill="#e2e8f0" fontSize="12" fontWeight="700" fontFamily="monospace">{totalUnits}</text>
        <text x={tbW * 0.55 + 8} y={tbH * 0.5 + 13} fill="#64748b" fontSize="7" fontFamily="monospace">ASSETS</text>
        <text x={tbW * 0.55 + 8} y={tbH * 0.5 + 26} fill="#e2e8f0" fontSize="11" fontWeight="700" fontFamily="monospace">
          {totalAssets?.toLocaleString()}
        </text>

        {/* Date / Rev */}
        <text x={tbW * 0.78 + 8} y={15} fill="#64748b" fontSize="7" fontFamily="monospace">DATE</text>
        <text x={tbW * 0.78 + 8} y={27} fill="#94a3b8" fontSize="9" fontFamily="monospace">{date}</text>
        <text x={tbW * 0.78 + 8} y={tbH * 0.5 + 13} fill="#64748b" fontSize="7" fontFamily="monospace">REV</text>
        <text x={tbW * 0.78 + 8} y={tbH * 0.5 + 26} fill="#94a3b8" fontSize="10" fontWeight="700" fontFamily="monospace">A.0</text>
      </g>

      {/* North arrow (top-right) */}
      <g transform={`translate(${width - 40}, 30)`}>
        <line x1={0} y1={12} x2={0} y2={-8} stroke="#475569" strokeWidth={1.5} />
        <polygon points="-4,0 0,-8 4,0" fill="#475569" />
        <text x={0} y={22} textAnchor="middle" fill="#475569" fontSize="8" fontWeight="bold" fontFamily="monospace">N</text>
      </g>

      {/* Scale bar (bottom-left) */}
      <g transform={`translate(20, ${height - 18})`}>
        <line x1={0} y1={0} x2={60} y2={0} stroke="#475569" strokeWidth={1} />
        <line x1={0} y1={-3} x2={0} y2={3} stroke="#475569" strokeWidth={1} />
        <line x1={30} y1={-2} x2={30} y2={2} stroke="#475569" strokeWidth={0.5} />
        <line x1={60} y1={-3} x2={60} y2={3} stroke="#475569" strokeWidth={1} />
        <text x={30} y={-5} textAnchor="middle" fill="#475569" fontSize="7" fontFamily="monospace">~100m</text>
      </g>
    </g>
  )
}

// =============================================================================
// ISA-95 ZONE BOUNDARIES
// =============================================================================

function ISA95ZoneBoundaries({ boundaries, showZones }) {
  if (!showZones || !boundaries || boundaries.length === 0) return null

  return (
    <g className="isa95-zones" opacity={0.5}>
      {boundaries.map((zone, i) => {
        const { bounds, color, label } = zone
        if (!isFinite(bounds.minX)) return null
        const padding = 10
        const x = bounds.minX - padding
        const y = bounds.minY - padding
        const w = bounds.maxX - bounds.minX + padding * 2
        const h = bounds.maxY - bounds.minY + padding * 2

        return (
          <g key={i}>
            <rect
              x={x} y={y} width={w} height={h}
              fill="none" stroke={color} strokeWidth={1}
              strokeDasharray="8,4,2,4" rx={4} opacity={0.4}
            />
            <text x={x + 6} y={y + 10} fill={color} fontSize="7"
              fontFamily="monospace" fontWeight="600" opacity={0.7}>
              {label}
            </text>
          </g>
        )
      })}
    </g>
  )
}

// =============================================================================
// SCHEMATIC BUILDING
// =============================================================================

function SchematicBuilding({ node, isSelected, isHovered, onClick, onHover, zoomLevel }) {
  const colors = UNIT_COLORS[node.detectedType] || DEFAULT_COLORS
  const label = UNIT_LABELS[node.detectedType] || node.name.toUpperCase()
  const shortLabel = UNIT_SHORT[node.detectedType] || '??'
  const w = node.buildingWidth || 100
  const h = node.buildingHeight || 70

  // Coverage bar
  const coverage = node.coverageRatio != null ? Math.min(1, node.coverageRatio) : null
  const coveragePct = coverage != null ? Math.round(coverage * 100) : null

  // Purdue level badge color
  const purdueColor = PURDUE_COLORS[node.purdueLevel] || '#475569'

  // Device type breakdown (top 3)
  const deviceBreakdown = useMemo(() => {
    if (!node.deviceTypes || node.deviceTypes.length === 0) return []
    const counts = {}
    node.deviceTypes.forEach(dt => { counts[dt] = (counts[dt] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3)
  }, [node.deviceTypes])

  const showDetail = zoomLevel > 0.8

  return (
    <g
      transform={`translate(${node.x - w / 2}, ${node.y - h / 2})`}
      onClick={onClick}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      style={{ cursor: 'pointer' }}
    >
      {/* Selection highlight */}
      {isSelected && (
        <rect x={-5} y={-5} width={w + 10} height={h + 10}
          fill="none" stroke="white" strokeWidth={2} strokeDasharray="6,3" rx={3}>
          <animate attributeName="stroke-dashoffset" from="0" to="18" dur="1.5s" repeatCount="indefinite" />
        </rect>
      )}

      {/* Hover highlight */}
      {isHovered && !isSelected && (
        <rect x={-3} y={-3} width={w + 6} height={h + 6}
          fill="none" stroke={colors.primary} strokeWidth={1.5} rx={3} opacity={0.6} />
      )}

      {/* Building shadow */}
      <rect x={3} y={3} width={w} height={h} fill="rgba(0,0,0,0.25)" rx={2} />

      {/* Building body */}
      <rect width={w} height={h} fill={colors.bg} stroke={colors.primary}
        strokeWidth={isSelected ? 2.5 : 1.5} rx={2} />

      {/* Roof profile indicator */}
      {node.roofProfile === 'sawtooth' && (
        <g opacity={0.3}>
          {Array.from({ length: Math.floor(w / 15) }).map((_, i) => (
            <path key={i} d={`M ${i * 15 + 2} 0 L ${i * 15 + 9} -5 L ${i * 15 + 15} 0`}
              fill="none" stroke={colors.primary} strokeWidth={0.8} />
          ))}
        </g>
      )}
      {node.roofProfile === 'peaked' && (
        <path d={`M 0 0 L ${w / 2} -6 L ${w} 0`}
          fill="none" stroke={colors.primary} strokeWidth={0.8} opacity={0.3} />
      )}

      {/* Interior grid (suggests floor layout) */}
      <g opacity={0.12} clipPath={`url(#clip-${node.name?.replace(/\W/g, '')})`}>
        <defs>
          <clipPath id={`clip-${node.name?.replace(/\W/g, '')}`}>
            <rect width={w} height={h} rx={2} />
          </clipPath>
        </defs>
        {Array.from({ length: Math.floor(h / 18) }).map((_, i) => (
          <line key={`h${i}`} x1={0} y1={(i + 1) * 18} x2={w} y2={(i + 1) * 18}
            stroke={colors.primary} strokeWidth={0.5} />
        ))}
        {Array.from({ length: Math.floor(w / 18) }).map((_, i) => (
          <line key={`v${i}`} x1={(i + 1) * 18} y1={0} x2={(i + 1) * 18} y2={h}
            stroke={colors.primary} strokeWidth={0.5} />
        ))}
      </g>

      {/* Header bar */}
      <rect width={w} height={18} fill={colors.primary} rx={2} />
      <rect y={16} width={w} height={2} fill={colors.primary} />

      {/* Header label */}
      <text x={6} y={12.5} fill="white" fontSize="8.5" fontWeight="700"
        fontFamily="'JetBrains Mono', monospace" style={{ pointerEvents: 'none' }}>
        {shortLabel}
      </text>

      {/* Purdue level badge */}
      <g transform={`translate(${w - 28}, 3)`}>
        <rect width={24} height={12} rx={2} fill="rgba(0,0,0,0.35)" />
        <text x={12} y={9} textAnchor="middle" fill={purdueColor} fontSize="7"
          fontWeight="700" fontFamily="monospace" style={{ pointerEvents: 'none' }}>
          L{node.purdueLevel}
        </text>
      </g>

      {/* Asset count (center) */}
      <text x={w / 2} y={h * 0.42 + 5} textAnchor="middle" fill={colors.primary}
        fontSize={w > 100 ? '16' : '14'} fontWeight="800"
        fontFamily="'JetBrains Mono', monospace" style={{ pointerEvents: 'none' }}>
        {node.assetCount.toLocaleString()}
      </text>
      <text x={w / 2} y={h * 0.42 + 17} textAnchor="middle" fill="#475569"
        fontSize="7" fontFamily="monospace" letterSpacing="0.05em"
        style={{ pointerEvents: 'none' }}>
        ASSETS
      </text>

      {/* Coverage bar (bottom of building) */}
      {coverage != null && showDetail && (
        <g transform={`translate(6, ${h - 18})`}>
          {/* Track */}
          <rect width={w - 12} height={5} rx={2} fill="rgba(255,255,255,0.05)" />
          {/* Fill */}
          <rect width={(w - 12) * Math.min(1, coverage)} height={5} rx={2}
            fill={coverage < 0.5 ? '#ef4444' : coverage < 0.8 ? '#f59e0b' : '#22c55e'} opacity={0.8} />
          {/* Label */}
          <text x={w - 14} y={4} textAnchor="end" fill="#64748b" fontSize="6" fontFamily="monospace">
            {coveragePct}%
          </text>
        </g>
      )}

      {/* Subnet labels (if zoomed in) */}
      {showDetail && node.subnets && node.subnets.length > 0 && (
        <g transform={`translate(6, ${h - 28})`}>
          {node.subnets.slice(0, 2).map((subnet, i) => (
            <text key={i} x={0} y={i * 9} fill="#3b82f6" fontSize="6"
              fontFamily="monospace" opacity={0.6}>
              {subnet}.*
            </text>
          ))}
        </g>
      )}

      {/* Understaffed / overstaffed indicator */}
      {node.isUnderstaffed && (
        <g transform={`translate(${w - 12}, ${h - 12})`}>
          <circle r={5} fill="#ef4444" opacity={0.9} />
          <text x={0} y={3.5} textAnchor="middle" fill="white" fontSize="7"
            fontWeight="bold" style={{ pointerEvents: 'none' }}>!</text>
        </g>
      )}
      {node.isOverstaffed && (
        <g transform={`translate(${w - 12}, ${h - 12})`}>
          <circle r={5} fill="#f59e0b" opacity={0.9} />
          <text x={0} y={3.5} textAnchor="middle" fill="white" fontSize="6"
            fontWeight="bold" style={{ pointerEvents: 'none' }}>+</text>
        </g>
      )}

      {/* Building name below */}
      <text x={w / 2} y={h + 12} textAnchor="middle"
        fill={isSelected ? 'white' : '#94a3b8'} fontSize="8" fontWeight="600"
        fontFamily="system-ui, sans-serif" style={{ pointerEvents: 'none' }}>
        {node.name.length > 22 ? node.name.substring(0, 22) + '…' : node.name}
      </text>
    </g>
  )
}

// =============================================================================
// ORTHOGONAL FLOW CONNECTIONS
// =============================================================================

function FlowConnections({ connections, nodes, showFlow }) {
  if (!showFlow) return null

  return (
    <g className="flow-connections">
      {connections.map((conn, i) => {
        const fromNode = nodes.find(n => n.name === conn.from)
        const toNode = nodes.find(n => n.name === conn.to)
        if (!fromNode || !toNode) return null

        const isFlow = conn.isProductionFlow
        const color = isFlow ? (conn.critical ? '#22c55e' : '#4ade80') : '#334155'
        const strokeW = isFlow ? (conn.critical ? 2.5 : 1.8) : 1
        const opacity = isFlow ? 0.85 : 0.3

        // Orthogonal path
        const path = computeOrthogonalPath(fromNode.x, fromNode.y, toNode.x, toNode.y)

        return (
          <g key={i}>
            <path d={path} fill="none" stroke={color} strokeWidth={strokeW}
              strokeOpacity={opacity} strokeDasharray={isFlow ? 'none' : '4,3'}
              markerEnd={isFlow ? 'url(#arrow-flow)' : undefined} />
            {/* Material label on production flow */}
            {isFlow && conn.material && (
              <text
                x={(fromNode.x + toNode.x) / 2}
                y={(fromNode.y + toNode.y) / 2 - 6}
                textAnchor="middle" fill={color} fontSize="6.5"
                fontFamily="monospace" opacity={0.7}>
                {conn.material}
              </text>
            )}
          </g>
        )
      })}
    </g>
  )
}

// =============================================================================
// PURDUE LEVEL SIDEBAR
// =============================================================================

function PurdueSidebar({ purdueDistribution, x, y }) {
  if (!purdueDistribution) return null
  const total = Object.values(purdueDistribution).reduce((s, v) => s + v, 0) || 1
  const barW = 6
  const barMaxH = 40

  return (
    <g transform={`translate(${x}, ${y})`}>
      <text x={0} y={-6} fill="#475569" fontSize="7" fontFamily="monospace" fontWeight="600">
        PURDUE MODEL
      </text>
      {[0, 1, 2, 3, 4].map(level => {
        const count = purdueDistribution[level] || 0
        const barH = (count / total) * barMaxH
        const bx = level * 18
        return (
          <g key={level} transform={`translate(${bx}, 0)`}>
            {/* Bar track */}
            <rect width={barW} height={barMaxH} rx={1} fill="rgba(255,255,255,0.03)" />
            {/* Bar fill */}
            <rect y={barMaxH - barH} width={barW} height={barH} rx={1}
              fill={PURDUE_COLORS[level]} opacity={0.8} />
            {/* Level label */}
            <text x={barW / 2} y={barMaxH + 10} textAnchor="middle"
              fill={PURDUE_COLORS[level]} fontSize="6.5" fontWeight="700" fontFamily="monospace">
              L{level}
            </text>
            {/* Count */}
            <text x={barW / 2} y={barMaxH + 18} textAnchor="middle"
              fill="#475569" fontSize="5.5" fontFamily="monospace">
              {count}
            </text>
          </g>
        )
      })}
    </g>
  )
}

// =============================================================================
// COVERAGE LEGEND
// =============================================================================

function CoverageLegend({ coverageStats, x, y }) {
  if (!coverageStats) return null
  const underCovered = coverageStats.filter(s => s.status === 'under-covered').length
  const overCovered = coverageStats.filter(s => s.status === 'over-covered').length
  const normal = coverageStats.filter(s => s.status === 'normal').length

  return (
    <g transform={`translate(${x}, ${y})`}>
      <text x={0} y={-6} fill="#475569" fontSize="7" fontFamily="monospace" fontWeight="600">
        COVERAGE
      </text>
      <circle cx={4} cy={6} r={3} fill="#22c55e" opacity={0.8} />
      <text x={12} y={9} fill="#94a3b8" fontSize="7" fontFamily="monospace">{normal} Normal</text>
      <circle cx={4} cy={18} r={3} fill="#ef4444" opacity={0.8} />
      <text x={12} y={21} fill="#94a3b8" fontSize="7" fontFamily="monospace">{underCovered} Under</text>
      <circle cx={4} cy={30} r={3} fill="#f59e0b" opacity={0.8} />
      <text x={12} y={33} fill="#94a3b8" fontSize="7" fontFamily="monospace">{overCovered} Over</text>
    </g>
  )
}

// =============================================================================
// DETAIL PANEL (click on building)
// =============================================================================

function DetailPanel({ node, onClose, coverageStat }) {
  const colors = UNIT_COLORS[node.detectedType] || DEFAULT_COLORS
  const label = UNIT_LABELS[node.detectedType] || 'PROCESS AREA'

  return (
    <div style={{
      position: 'absolute', top: '1rem', right: '1rem', width: '300px',
      background: '#0f172a', borderRadius: '0.5rem',
      border: `2px solid ${colors.primary}`, overflow: 'hidden',
      boxShadow: `0 0 20px ${colors.primary}33`
    }}>
      {/* Header */}
      <div style={{ background: colors.primary, padding: '0.75rem 1rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 700, color: 'white', fontSize: '0.85rem',
            fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em' }}>
            {label}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
            {node.name}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(0,0,0,0.2)', border: 'none',
          color: 'white', borderRadius: '4px', width: 24, height: 24, cursor: 'pointer', fontSize: '1rem' }}>
          ×
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '1rem' }}>
        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
          {[
            { value: node.assetCount.toLocaleString(), label: 'ASSETS', color: 'white' },
            { value: node.subnets?.length || 0, label: 'SUBNETS', color: colors.primary },
            { value: `L${node.purdueLevel}`, label: 'PURDUE', color: PURDUE_COLORS[node.purdueLevel] }
          ].map((stat, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.04)', padding: '0.5rem',
              borderRadius: '0.375rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: stat.color, fontFamily: 'monospace' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '0.55rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Coverage indicator */}
        {coverageStat && coverageStat.ratio != null && (
          <div style={{ marginBottom: '1rem', padding: '0.5rem', background: 'rgba(255,255,255,0.03)',
            borderRadius: '0.375rem', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.6rem', color: '#64748b', fontFamily: 'monospace', textTransform: 'uppercase' }}>
                COVERAGE vs EXPECTED
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'monospace',
                color: coverageStat.ratio < 50 ? '#ef4444' : coverageStat.ratio < 80 ? '#f59e0b' : '#22c55e' }}>
                {coverageStat.ratio}%
              </span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3 }}>
              <div style={{ height: 6, borderRadius: 3, width: `${Math.min(100, coverageStat.ratio)}%`,
                background: coverageStat.ratio < 50 ? '#ef4444' : coverageStat.ratio < 80 ? '#f59e0b' : '#22c55e' }} />
            </div>
            {coverageStat.expected && (
              <div style={{ fontSize: '0.6rem', color: '#475569', marginTop: '0.25rem', fontFamily: 'monospace' }}>
                Expected: {coverageStat.expected.min}–{coverageStat.expected.max} (typical {coverageStat.expected.typical})
              </div>
            )}
          </div>
        )}

        {/* Network segments */}
        {node.subnets && node.subnets.length > 0 && (
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.6rem', color: '#64748b', marginBottom: '0.375rem',
              textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'monospace' }}>
              Network Segments
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
              {node.subnets.slice(0, 10).map((subnet, i) => (
                <span key={i} style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)',
                  padding: '0.125rem 0.375rem', borderRadius: '0.25rem', fontSize: '0.65rem',
                  color: '#93c5fd', fontFamily: 'monospace' }}>
                  {subnet}.*
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Regulations */}
        {node.regulations && node.regulations.length > 0 && (
          <div style={{ marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.6rem', color: '#64748b', marginBottom: '0.25rem',
              textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'monospace' }}>
              Applicable Standards
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
              {node.regulations.map((reg, i) => (
                <span key={i} style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
                  padding: '0.1rem 0.3rem', borderRadius: '0.2rem', fontSize: '0.6rem',
                  color: '#a5b4fc', fontFamily: 'monospace' }}>
                  {reg}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Safety notes */}
        {node.safetyNotes && (
          <div style={{ fontSize: '0.65rem', color: '#f59e0b', fontFamily: 'monospace',
            padding: '0.375rem', background: 'rgba(245,158,11,0.08)', borderRadius: '0.25rem',
            border: '1px solid rgba(245,158,11,0.15)' }}>
            {node.safetyNotes}
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// SITE SELECTOR
// =============================================================================

function SiteSelector({ plants, selectedPlant, onSelectPlant }) {
  if (plants.length <= 1) return null
  return (
    <select value={selectedPlant} onChange={e => onSelectPlant(e.target.value)}
      style={{ padding: '0.4rem 0.75rem', paddingRight: '1.75rem', background: '#1e293b',
        color: 'white', border: '1px solid #334155', borderRadius: '0.375rem',
        fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'monospace',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.4rem center', backgroundSize: '1rem' }}>
      <option value="all">ALL SITES ({plants.length})</option>
      {plants.map(p => <option key={p} value={p}>{p}</option>)}
    </select>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function AutomotivePlantMap({ result }) {
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [hoveredNode, setHoveredNode] = useState(null)
  const [selectedPlant, setSelectedPlant] = useState('all')
  const [showFlow, setShowFlow] = useState(true)
  const [showZones, setShowZones] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 1000, height: 620 })

  // Pan/zoom state
  const [viewBox, setViewBox] = useState(null) // null = fit-to-container
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [zoomLevel, setZoomLevel] = useState(1)

  // Unique plants
  const plants = useMemo(() => {
    const s = new Set()
    ;(result?.assets || []).forEach(a => {
      const p = a.plant || a.plant_code || a.facility
      if (p) s.add(p)
    })
    return Array.from(s).sort()
  }, [result])

  // Filter by plant
  const filteredAssets = useMemo(() => {
    const assets = result?.assets || []
    if (selectedPlant === 'all') return assets
    return assets.filter(a => (a.plant || a.plant_code || a.facility) === selectedPlant)
  }, [result, selectedPlant])

  // Generate layout
  const layout = useMemo(() => {
    if (filteredAssets.length === 0) return null
    return generatePlantLayout(filteredAssets, {
      industry: 'automotive',
      width: dimensions.width,
      height: dimensions.height - 80
    })
  }, [filteredAssets, dimensions])

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) setDimensions({ width, height: Math.max(520, height) })
    })
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  // Initialize viewBox
  useEffect(() => {
    if (layout && !viewBox) {
      setViewBox({ x: 0, y: 0, w: dimensions.width, h: dimensions.height - 80 })
    }
  }, [layout, dimensions])

  // ---- PAN / ZOOM HANDLERS ----
  const handleWheel = useCallback(e => {
    e.preventDefault()
    if (!viewBox) return
    const factor = e.deltaY > 0 ? 1.08 : 0.92
    const svgRect = svgRef.current?.getBoundingClientRect()
    if (!svgRect) return

    // Zoom toward cursor
    const mx = ((e.clientX - svgRect.left) / svgRect.width) * viewBox.w + viewBox.x
    const my = ((e.clientY - svgRect.top) / svgRect.height) * viewBox.h + viewBox.y
    const newW = Math.max(200, Math.min(dimensions.width * 3, viewBox.w * factor))
    const newH = Math.max(150, Math.min((dimensions.height - 80) * 3, viewBox.h * factor))
    const newX = mx - (mx - viewBox.x) * (newW / viewBox.w)
    const newY = my - (my - viewBox.y) * (newH / viewBox.h)
    setViewBox({ x: newX, y: newY, w: newW, h: newH })
    setZoomLevel(dimensions.width / newW)
  }, [viewBox, dimensions])

  const handleMouseDown = useCallback(e => {
    if (e.button !== 0) return
    // Only pan if clicking on SVG background
    if (e.target.tagName === 'svg' || e.target.tagName === 'rect') {
      setIsPanning(true)
      setPanStart({ x: e.clientX, y: e.clientY })
    }
  }, [])

  const handleMouseMove = useCallback(e => {
    if (!isPanning || !viewBox) return
    const svgRect = svgRef.current?.getBoundingClientRect()
    if (!svgRect) return
    const dx = (e.clientX - panStart.x) / svgRect.width * viewBox.w
    const dy = (e.clientY - panStart.y) / svgRect.height * viewBox.h
    setViewBox(prev => ({ ...prev, x: prev.x - dx, y: prev.y - dy }))
    setPanStart({ x: e.clientX, y: e.clientY })
  }, [isPanning, panStart, viewBox])

  const handleMouseUp = useCallback(() => setIsPanning(false), [])

  const resetView = useCallback(() => {
    setViewBox({ x: 0, y: 0, w: dimensions.width, h: dimensions.height - 80 })
    setZoomLevel(1)
  }, [dimensions])

  // Export
  const handleExport = async () => {
    if (!containerRef.current) return
    try {
      const canvas = await html2canvas(containerRef.current, { backgroundColor: '#0f172a', scale: 2 })
      const link = document.createElement('a')
      const plantLabel = selectedPlant === 'all' ? 'all-sites' : selectedPlant.replace(/\s+/g, '-')
      link.download = `plant-schematic-${plantLabel}-${new Date().toISOString().split('T')[0]}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  // ---- RENDER ----

  if (!layout || layout.nodes.length === 0) {
    return (
      <div style={{ background: '#0f172a', borderRadius: '0.5rem', padding: '3rem',
        textAlign: 'center', color: '#64748b', border: '2px solid #1e293b' }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '1rem', fontFamily: 'monospace', opacity: 0.5 }}>
          [ NO DATA ]
        </div>
        <div style={{ fontSize: '0.85rem' }}>
          Upload engineering baseline and OT discovery data to generate plant schematic.
        </div>
      </div>
    )
  }

  const selectedNodeData = selectedNode ? layout.nodes.find(n => n.name === selectedNode) : null
  const selectedCoverage = selectedNode ? layout.coverageStats?.find(c => c.name === selectedNode) : null
  const today = new Date().toISOString().split('T')[0]
  const svgW = dimensions.width
  const svgH = dimensions.height - 80
  const vb = viewBox || { x: 0, y: 0, w: svgW, h: svgH }

  return (
    <div style={{ background: '#0f172a', borderRadius: '0.5rem', overflow: 'hidden', border: '2px solid #1e293b' }}>
      {/* ---- HEADER ---- */}
      <div style={{ padding: '0.75rem 1rem', borderBottom: '2px solid #1e293b',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '0.5rem',
        background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div>
            <h3 style={{ margin: 0, color: 'white', fontSize: '0.95rem', fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#334155' }}>[</span>
              PLANT SCHEMATIC
              <span style={{ color: '#334155' }}>]</span>
            </h3>
            <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.7rem', fontFamily: 'monospace' }}>
              {layout.summary.totalUnits} AREAS
              <span style={{ color: '#334155' }}> | </span>
              {layout.summary.totalAssets.toLocaleString()} ASSETS
              <span style={{ color: '#334155' }}> | </span>
              {layout.summary.detectedTypes.length} RECOGNIZED TYPES
            </p>
          </div>
          <SiteSelector plants={plants} selectedPlant={selectedPlant} onSelectPlant={setSelectedPlant} />
        </div>

        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
          {/* Zoom indicator */}
          <div style={{ padding: '0.375rem 0.5rem', background: '#1e293b', border: '1px solid #334155',
            borderRadius: '0.25rem', fontSize: '0.7rem', fontFamily: 'monospace', color: '#94a3b8', minWidth: '3.5rem', textAlign: 'center' }}>
            {Math.round(zoomLevel * 100)}%
          </div>
          <button onClick={resetView} style={{ padding: '0.375rem 0.625rem', background: '#1e293b',
            color: '#94a3b8', border: '1px solid #334155', borderRadius: '0.25rem', cursor: 'pointer',
            fontSize: '0.7rem', fontFamily: 'monospace' }}>
            FIT
          </button>
          <div style={{ width: 1, height: 20, background: '#334155' }} />
          <button onClick={() => setShowFlow(!showFlow)}
            style={{ padding: '0.375rem 0.625rem',
              background: showFlow ? 'rgba(34,197,94,0.15)' : '#1e293b',
              color: showFlow ? '#22c55e' : '#64748b',
              border: `1px solid ${showFlow ? 'rgba(34,197,94,0.3)' : '#334155'}`,
              borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.7rem', fontFamily: 'monospace' }}>
            {showFlow ? 'FLOW ON' : 'FLOW OFF'}
          </button>
          <button onClick={() => setShowZones(!showZones)}
            style={{ padding: '0.375rem 0.625rem',
              background: showZones ? 'rgba(59,130,246,0.15)' : '#1e293b',
              color: showZones ? '#3b82f6' : '#64748b',
              border: `1px solid ${showZones ? 'rgba(59,130,246,0.3)' : '#334155'}`,
              borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.7rem', fontFamily: 'monospace' }}>
            ISA-95
          </button>
          <div style={{ width: 1, height: 20, background: '#334155' }} />
          <button onClick={handleExport}
            style={{ padding: '0.375rem 0.625rem', background: '#3b82f6', color: 'white',
              border: '1px solid #3b82f6', borderRadius: '0.25rem', cursor: 'pointer',
              fontSize: '0.7rem', fontWeight: 600, fontFamily: 'monospace' }}>
            EXPORT
          </button>
        </div>
      </div>

      {/* ---- SVG CANVAS ---- */}
      <div ref={containerRef} style={{ height: `${dimensions.height - 80}px`, position: 'relative',
        cursor: isPanning ? 'grabbing' : 'grab',
        background: `
          linear-gradient(rgba(30,41,59,0.5) 1px, transparent 1px),
          linear-gradient(90deg, rgba(30,41,59,0.5) 1px, transparent 1px),
          linear-gradient(rgba(30,41,59,0.25) 1px, transparent 1px),
          linear-gradient(90deg, rgba(30,41,59,0.25) 1px, transparent 1px)`,
        backgroundSize: '100px 100px, 100px 100px, 20px 20px, 20px 20px',
        backgroundPosition: '-1px -1px' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg ref={svgRef} width="100%" height="100%"
          viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
          preserveAspectRatio="xMidYMid meet">

          <defs>
            {/* Flow arrow marker */}
            <marker id="arrow-flow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#22c55e" />
            </marker>
          </defs>

          {/* Drawing border & title block */}
          <DrawingBorder width={svgW} height={svgH}
            plantName={selectedPlant === 'all' ? null : selectedPlant}
            totalAssets={layout.summary.totalAssets}
            totalUnits={layout.summary.totalUnits}
            date={today} />

          {/* ISA-95 Zone boundaries */}
          <ISA95ZoneBoundaries boundaries={layout.isa95Boundaries} showZones={showZones} />

          {/* Flow connections (behind buildings) */}
          <FlowConnections connections={layout.connections} nodes={layout.nodes} showFlow={showFlow} />

          {/* Building nodes */}
          {layout.nodes.map(node => (
            <SchematicBuilding
              key={node.name}
              node={node}
              isSelected={selectedNode === node.name}
              isHovered={hoveredNode === node.name}
              onClick={() => setSelectedNode(selectedNode === node.name ? null : node.name)}
              onHover={h => setHoveredNode(h ? node.name : null)}
              zoomLevel={zoomLevel}
            />
          ))}

          {/* Purdue sidebar (top-left inside drawing) */}
          <PurdueSidebar purdueDistribution={layout.purdueDistribution} x={18} y={24} />

          {/* Coverage legend (below Purdue) */}
          <CoverageLegend coverageStats={layout.coverageStats} x={18} y={105} />

        </svg>

        {/* Detail panel overlay */}
        {selectedNodeData && (
          <DetailPanel node={selectedNodeData}
            coverageStat={selectedCoverage}
            onClose={() => setSelectedNode(null)} />
        )}

        {/* Navigation help */}
        <div style={{ position: 'absolute', bottom: '0.75rem', left: '0.75rem',
          background: 'rgba(15,23,42,0.92)', border: '1px solid #334155',
          padding: '0.375rem 0.625rem', borderRadius: '0.25rem',
          fontSize: '0.65rem', fontFamily: 'monospace', color: '#475569' }}>
          SCROLL: Zoom &middot; DRAG: Pan &middot; CLICK: Select
        </div>

        {/* Stats bar */}
        <div style={{ position: 'absolute', top: '0.75rem', right: selectedNodeData ? '320px' : '0.75rem',
          background: 'rgba(15,23,42,0.92)', border: '1px solid #334155',
          padding: '0.375rem 0.625rem', borderRadius: '0.25rem',
          fontFamily: 'monospace', fontSize: '0.65rem', display: 'flex', gap: '0.75rem' }}>
          <span style={{ color: '#22c55e' }}>
            {layout.summary.productionFlowConnections} FLOW
          </span>
          <span style={{ color: '#334155' }}>|</span>
          <span style={{ color: '#3b82f6' }}>
            {layout.summary.networkConnections} NET
          </span>
          {layout.summary.unrecognizedAssets > 0 && (
            <>
              <span style={{ color: '#334155' }}>|</span>
              <span style={{ color: '#f59e0b' }}>
                {layout.summary.unrecognizedAssets} UNMAPPED
              </span>
            </>
          )}
        </div>
      </div>

      {/* ---- FOOTER ---- */}
      <div style={{ padding: '0.5rem 1rem', borderTop: '2px solid #1e293b',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: '0.65rem', color: '#475569', fontFamily: 'monospace',
        background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {layout.summary.detectedTypes.slice(0, 7).map(t => {
            const c = UNIT_COLORS[t]?.primary || '#94a3b8'
            return (
              <span key={t} style={{ color: c }}>
                {UNIT_SHORT[t] || '??'}
              </span>
            )
          })}
        </div>
        <div>
          DETERMINISTIC LAYOUT &middot; ISA-95 COMPLIANT &middot; AIGNE FRAMEWORK
        </div>
      </div>
    </div>
  )
}
