/**
 * WORLD MODEL COMPONENT
 * Enterprise-level view across all plants, ports, and sites
 * 
 * For automotive: Shows manufacturing footprint similar to TMNA
 * - Kentucky (Georgetown) - Main assembly
 * - Indiana (Princeton) - SUV/Minivan
 * - Texas (San Antonio) - Trucks
 * - Mississippi (Blue Springs) - Compact
 * - Alabama (Huntsville) - Powertrain
 */

import React, { useState, useMemo } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  Line
} from 'react-simple-maps'

// US TopoJSON - using the built-in US atlas
const US_GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"

// =============================================================================
// AUTOMOTIVE PLANT DATABASE
// =============================================================================

const AUTOMOTIVE_PLANTS = [
  {
    id: 'TMMK',
    name: 'Kentucky Manufacturing',
    code: 'TMMK',
    city: 'Georgetown, KY',
    icon: '🏭',
    type: 'Assembly Plant',
    products: ['Camry', 'RAV4', 'Lexus ES'],
    capacity: 550000,
    employees: 9000,
    sqft: '8.1M',
    lat: 38.2098,
    lng: -84.5584,
    founded: 1988,
    color: '#ef4444'
  },
  {
    id: 'TMMI',
    name: 'Indiana Manufacturing',
    code: 'TMMI',
    city: 'Princeton, IN',
    icon: '🏭',
    type: 'Assembly Plant',
    products: ['Highlander', 'Grand Highlander', 'Sienna'],
    capacity: 420000,
    employees: 7000,
    sqft: '4.7M',
    lat: 38.3553,
    lng: -87.5675,
    founded: 1996,
    color: '#3b82f6'
  },
  {
    id: 'TMMTX',
    name: 'Texas Manufacturing',
    code: 'TMMTX',
    city: 'San Antonio, TX',
    icon: '🛻',
    type: 'Truck Assembly',
    products: ['Tundra', 'Tacoma', 'Sequoia'],
    capacity: 350000,
    employees: 3200,
    sqft: '2.5M',
    lat: 29.4241,
    lng: -98.4936,
    founded: 2006,
    color: '#f59e0b'
  },
  {
    id: 'TMMMS',
    name: 'Mississippi Manufacturing',
    code: 'TMMMS',
    city: 'Blue Springs, MS',
    icon: '🚗',
    type: 'Assembly Plant',
    products: ['Corolla', 'Corolla Cross'],
    capacity: 350000,
    employees: 2000,
    sqft: '2.0M',
    lat: 34.4743,
    lng: -88.7892,
    founded: 2011,
    color: '#8b5cf6'
  },
  {
    id: 'TMMAL',
    name: 'Alabama Engine Plant',
    code: 'TMMAL',
    city: 'Huntsville, AL',
    icon: '⚙️',
    type: 'Powertrain',
    products: ['4-Cyl Engines', 'V6 Engines'],
    capacity: 900000,
    employees: 1800,
    sqft: '1.2M',
    lat: 34.7304,
    lng: -86.5861,
    founded: 2003,
    color: '#10b981'
  }
]

const SITE_COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#06b6d4', '#ec4899']

const FALLBACK_SITE_COORDINATES = [
  { lat: 29.7604, lng: -95.3698, city: 'Houston, TX' },
  { lat: 30.4515, lng: -91.1871, city: 'Baton Rouge, LA' },
  { lat: 40.4406, lng: -79.9959, city: 'Pittsburgh, PA' },
  { lat: 41.8781, lng: -87.6298, city: 'Chicago, IL' },
  { lat: 34.0522, lng: -118.2437, city: 'Los Angeles, CA' },
  { lat: 39.7392, lng: -104.9903, city: 'Denver, CO' },
  { lat: 33.7490, lng: -84.3880, city: 'Atlanta, GA' }
]

const SITE_METADATA = [
  ...AUTOMOTIVE_PLANTS,
  { id: 'BTR', code: 'BTR', name: 'Baytown Refinery', city: 'Baytown, TX', icon: '🏭', type: 'Refinery', lat: 29.7355, lng: -94.9774 },
  { id: 'GCR', code: 'GCR', name: 'Gulf Coast Refinery', city: 'Gulf Coast, TX', icon: '🏭', type: 'Refinery', lat: 29.7604, lng: -95.3698 },
  { id: 'API', code: 'API', name: 'API Production', city: 'Pharma Campus', icon: '⚗️', type: 'Pharma Production', lat: 40.7128, lng: -74.0060 },
  { id: 'CGN', code: 'CGN', name: 'Central Generation', city: 'Generation Site', icon: '⚡', type: 'Power Generation', lat: 35.2271, lng: -80.8431 }
]

function normalizeSiteKey(value) {
  return String(value || '').trim().toUpperCase()
}

function codeFromName(name) {
  const words = String(name || '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word && !['THE', 'AND', 'OF', 'SITE', 'PLANT'].includes(word.toUpperCase()))

  return words.map(word => word[0]).join('').slice(0, 5).toUpperCase() || 'SITE'
}

function assetSiteIdentity(asset) {
  const name = asset?.plant || asset?.site || asset?.facility || asset?.site_name || ''
  const explicitCode = asset?.plant_code || asset?.plantCode || asset?.site_code || asset?.facility_code || ''
  const tagPrefix = String(asset?.tag_id || asset?.asset_id || '').split('-')[0]
  const code = explicitCode || (name ? codeFromName(name) : tagPrefix)
  const displayName = name || code || 'Unknown Site'

  return {
    key: normalizeSiteKey(displayName || code),
    code: String(code || displayName).trim(),
    name: String(displayName).trim()
  }
}

function assetStatus(asset) {
  return asset?._status || asset?.match_type || (asset?.matchType || asset?.discovered ? 'matched' : 'matched')
}

function allResultAssets(result) {
  return [
    ...(result?.assets || []).map(asset => ({ ...asset, _status: assetStatus(asset) })),
    ...(result?.blindSpots || []).map(asset => ({ ...asset, _status: 'blind_spot' })),
    ...(result?.orphans || []).map(asset => ({ ...asset, _status: 'orphan' }))
  ]
}

function metadataForSite(identity) {
  const identityKeys = [identity.code, identity.name].map(normalizeSiteKey)
  return SITE_METADATA.find(site => {
    const siteKeys = [site.id, site.code, site.name].map(normalizeSiteKey)
    return siteKeys.some(key => identityKeys.includes(key))
  })
}

function industrySiteType(industry) {
  if (industry === 'oil-gas') return 'Refinery'
  if (industry === 'pharma') return 'Pharma Site'
  if (industry === 'utilities') return 'Utility Site'
  return 'Manufacturing Site'
}

function industrySiteIcon(industry) {
  if (industry === 'oil-gas') return '🏭'
  if (industry === 'pharma') return '⚗️'
  if (industry === 'utilities') return '⚡'
  return '🏭'
}

function buildDataDrivenPlants(result, industry) {
  const groupedSites = new Map()

  allResultAssets(result).forEach(asset => {
    const identity = assetSiteIdentity(asset)
    if (!identity.key || identity.key === 'UNKNOWN SITE') return

    if (!groupedSites.has(identity.key)) {
      groupedSites.set(identity.key, {
        ...identity,
        units: new Map(),
        assets: []
      })
    }

    const group = groupedSites.get(identity.key)
    const unit = asset.unit || asset.area || asset.location || 'Unassigned'
    group.assets.push(asset)
    group.units.set(unit, (group.units.get(unit) || 0) + 1)
  })

  const dataPlants = Array.from(groupedSites.values()).map((site, index) => {
    const metadata = metadataForSite(site)
    const fallback = FALLBACK_SITE_COORDINATES[index % FALLBACK_SITE_COORDINATES.length]
    const topUnits = Array.from(site.units.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([unit]) => unit)

    return {
      id: site.key,
      code: metadata?.code || site.code,
      name: metadata?.name || site.name,
      city: metadata?.city || fallback.city,
      icon: metadata?.icon || industrySiteIcon(industry),
      type: metadata?.type || industrySiteType(industry),
      products: metadata?.products || topUnits,
      capacity: metadata?.capacity,
      employees: metadata?.employees,
      founded: metadata?.founded,
      lat: metadata?.lat || fallback.lat,
      lng: metadata?.lng || fallback.lng,
      color: metadata?.color || SITE_COLORS[index % SITE_COLORS.length]
    }
  })

  if (dataPlants.length > 0) return dataPlants
  return industry === 'automotive' ? AUTOMOTIVE_PLANTS : []
}

// =============================================================================
// PLANT CARD COMPONENT
// =============================================================================

function PlantCard({ plant, stats, isSelected, onClick }) {
  const matchRate = stats?.matchRate || 0
  const matchColor = matchRate >= 80 ? '#22c55e' : matchRate >= 60 ? '#f59e0b' : '#ef4444'
  
  return (
    <div
      onClick={onClick}
      style={{
        padding: '1rem',
        background: isSelected ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
        border: `2px solid ${isSelected ? plant.color : 'rgba(255,255,255,0.1)'}`,
        borderRadius: '0.75rem',
        cursor: 'pointer',
        transition: 'all 0.2s',
        minWidth: '220px',
        position: 'relative'
      }}
    >
      {/* Plant header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div style={{ 
          fontSize: '1.75rem',
          width: '44px',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `${plant.color}20`,
          borderRadius: '0.5rem'
        }}>
          {plant.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'white' }}>{plant.code}</div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{plant.city}</div>
          <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '2px' }}>{plant.type}</div>
        </div>
      </div>
      
      {/* Products */}
      <div style={{ 
        fontSize: '0.7rem', 
        color: '#94a3b8', 
        marginBottom: '0.75rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.25rem'
      }}>
        {plant.products.map((p, i) => (
          <span key={i} style={{
            padding: '0.125rem 0.375rem',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '0.25rem'
          }}>
            {p}
          </span>
        ))}
      </div>
      
      {/* Stats */}
      {stats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr',
          gap: '0.5rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'white' }}>
              {stats.assetCount?.toLocaleString() || '—'}
            </div>
            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Assets</div>
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: matchColor }}>
              {matchRate}%
            </div>
            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Match Rate</div>
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: '600', color: stats.blindSpots > 0 ? '#f59e0b' : '#22c55e' }}>
              {stats.blindSpots || 0}
            </div>
            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Blind Spots</div>
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: '600', color: stats.orphans > 0 ? '#ef4444' : '#22c55e' }}>
              {stats.orphans || 0}
            </div>
            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Orphans</div>
          </div>
        </div>
      )}
      
      {/* Not loaded indicator */}
      {!stats && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.75rem',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          marginTop: '0.75rem'
        }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            📁 Upload data to view
          </span>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// US MAP VISUALIZATION USING REACT-SIMPLE-MAPS
// =============================================================================

// States where plants are located (for highlighting)
const PLANT_STATES = ['Texas', 'Alabama', 'Mississippi', 'Kentucky', 'Indiana', 'Tennessee']

function USMapVisualization({ plants, plantStats, selectedPlant, onSelectPlant }) {
  // Build connection lines between plants
  const connectionLines = useMemo(() => {
    const lines = []
    for (let i = 0; i < plants.length; i++) {
      for (let j = i + 1; j < plants.length; j++) {
        const hasData = plantStats[plants[i].id] && plantStats[plants[j].id]
        lines.push({
          from: [plants[i].lng, plants[i].lat],
          to: [plants[j].lng, plants[j].lat],
          hasData,
          key: `${plants[i].id}-${plants[j].id}`
        })
      }
    }
    return lines
  }, [plants, plantStats])

  return (
    <div style={{
      background: 'linear-gradient(180deg, #0c1222 0%, #1a2744 100%)',
      borderRadius: '0.75rem',
      position: 'relative',
      height: '400px',
      marginBottom: '1.5rem',
      overflow: 'hidden',
      border: '1px solid rgba(59, 130, 246, 0.2)'
    }}>
      <ComposableMap
        projection="geoAlbersUsa"
        projectionConfig={{
          scale: 1000
        }}
        style={{
          width: '100%',
          height: '100%'
        }}
      >
        {/* US States */}
        <Geographies geography={US_GEO_URL}>
          {({ geographies }) =>
            geographies.map(geo => {
              const stateName = geo.properties.name
              const isPlantState = PLANT_STATES.includes(stateName)
              
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={isPlantState ? 'rgba(59, 130, 246, 0.15)' : 'rgba(30, 41, 59, 0.8)'}
                  stroke={isPlantState ? 'rgba(59, 130, 246, 0.5)' : 'rgba(71, 85, 105, 0.5)'}
                  strokeWidth={isPlantState ? 1.5 : 0.5}
                  style={{
                    default: { outline: 'none' },
                    hover: { 
                      fill: isPlantState ? 'rgba(59, 130, 246, 0.25)' : 'rgba(51, 65, 85, 0.8)',
                      outline: 'none' 
                    },
                    pressed: { outline: 'none' }
                  }}
                />
              )
            })
          }
        </Geographies>

        {/* Connection lines between plants */}
        {connectionLines.map(line => (
          <Line
            key={line.key}
            from={line.from}
            to={line.to}
            stroke={line.hasData ? 'rgba(59, 130, 246, 0.4)' : 'rgba(100, 116, 139, 0.2)'}
            strokeWidth={line.hasData ? 2 : 1}
            strokeDasharray={line.hasData ? 'none' : '5,5'}
            strokeLinecap="round"
          />
        ))}

        {/* Plant markers */}
        {plants.map(plant => {
          const stats = plantStats[plant.id]
          const isSelected = selectedPlant === plant.id
          const hasData = !!stats
          const matchRate = stats?.matchRate || 0
          const markerColor = hasData ? plant.color : '#475569'

          return (
            <Marker
              key={plant.id}
              coordinates={[plant.lng, plant.lat]}
              onClick={() => onSelectPlant(plant.id === selectedPlant ? null : plant.id)}
              style={{ cursor: 'pointer' }}
            >
              {/* Pulse animation ring */}
              {hasData && (
                <circle
                  r={12}
                  fill="none"
                  stroke={plant.color}
                  strokeWidth={2}
                  opacity={0.6}
                >
                  <animate
                    attributeName="r"
                    from="12"
                    to="30"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    from="0.6"
                    to="0"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}

              {/* Main marker */}
              <circle
                r={isSelected ? 14 : (hasData ? 12 : 8)}
                fill={markerColor}
                stroke={isSelected ? 'white' : 'rgba(255,255,255,0.6)'}
                strokeWidth={isSelected ? 3 : 2}
                style={{
                  filter: hasData ? 'drop-shadow(0 0 6px rgba(0,0,0,0.5))' : 'none'
                }}
              />

              {/* Icon */}
              <text
                textAnchor="middle"
                y={4}
                style={{
                  fontSize: isSelected ? '12px' : '10px',
                  pointerEvents: 'none'
                }}
              >
                {plant.icon}
              </text>

              {/* Match rate badge */}
              {hasData && (
                <g transform="translate(16, -8)">
                  <rect
                    x={0}
                    y={-8}
                    width={36}
                    height={16}
                    rx={4}
                    fill={matchRate >= 80 ? '#22c55e' : matchRate >= 60 ? '#f59e0b' : '#ef4444'}
                  />
                  <text
                    x={18}
                    y={3}
                    textAnchor="middle"
                    style={{
                      fontSize: '10px',
                      fill: 'white',
                      fontWeight: 'bold',
                      fontFamily: 'system-ui, sans-serif'
                    }}
                  >
                    {matchRate}%
                  </text>
                </g>
              )}

              {/* Labels below marker */}
              <text
                textAnchor="middle"
                y={isSelected ? 30 : 26}
                style={{
                  fontSize: '11px',
                  fill: isSelected ? 'white' : '#cbd5e1',
                  fontWeight: isSelected ? 'bold' : '600',
                  fontFamily: 'system-ui, sans-serif',
                  pointerEvents: 'none'
                }}
              >
                {plant.code}
              </text>
              <text
                textAnchor="middle"
                y={isSelected ? 42 : 38}
                style={{
                  fontSize: '9px',
                  fill: '#64748b',
                  fontFamily: 'system-ui, sans-serif',
                  pointerEvents: 'none'
                }}
              >
                {plant.city}
              </text>
            </Marker>
          )
        })}
      </ComposableMap>

      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: '0.75rem',
        left: '0.75rem',
        display: 'flex',
        gap: '1rem',
        fontSize: '0.75rem',
        color: '#94a3b8',
        background: 'rgba(0,0,0,0.8)',
        padding: '0.5rem 0.75rem',
        borderRadius: '0.5rem',
        backdropFilter: 'blur(4px)'
      }}>
        <span><span style={{ color: '#22c55e' }}>●</span> &gt;80% Match</span>
        <span><span style={{ color: '#f59e0b' }}>●</span> 60-80%</span>
        <span><span style={{ color: '#ef4444' }}>●</span> &lt;60%</span>
        <span style={{ color: '#475569' }}>|</span>
        <span><span style={{ color: '#475569' }}>●</span> No data</span>
      </div>

      {/* Title */}
      <div style={{
        position: 'absolute',
        top: '0.75rem',
        right: '0.75rem',
        fontSize: '0.85rem',
        color: '#e2e8f0',
        background: 'rgba(0,0,0,0.8)',
        padding: '0.5rem 0.875rem',
        borderRadius: '0.5rem',
        fontWeight: '600',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <span style={{ fontSize: '1rem' }}>🇺🇸</span>
        US Manufacturing Footprint
      </div>

      {/* Stats */}
      <div style={{
        position: 'absolute',
        top: '0.75rem',
        left: '0.75rem',
        fontSize: '0.7rem',
        color: '#94a3b8',
        background: 'rgba(0,0,0,0.8)',
        padding: '0.5rem 0.75rem',
        borderRadius: '0.5rem',
        backdropFilter: 'blur(4px)'
      }}>
        <div style={{ color: '#e2e8f0', fontWeight: '600', marginBottom: '0.25rem' }}>
          {Object.keys(plantStats).length} / {plants.length} Plants Active
        </div>
        <div>Click markers for details</div>
      </div>
    </div>
  )
}

// =============================================================================
// ENTERPRISE SUMMARY BAR
// =============================================================================

function EnterpriseSummary({ plantStats, plants, securityStats }) {
  const totals = useMemo(() => {
    const loadedPlants = plants.filter(p => plantStats[p.id])
    return {
      sites: loadedPlants.length,
      totalSites: plants.length,
      assets: loadedPlants.reduce((sum, p) => sum + (plantStats[p.id]?.assetCount || 0), 0),
      matched: loadedPlants.reduce((sum, p) => sum + (plantStats[p.id]?.matched || 0), 0),
      blindSpots: loadedPlants.reduce((sum, p) => sum + (plantStats[p.id]?.blindSpots || 0), 0),
      orphans: loadedPlants.reduce((sum, p) => sum + (plantStats[p.id]?.orphans || 0), 0),
      matchRate: loadedPlants.length > 0 
        ? Math.round(loadedPlants.reduce((sum, p) => sum + (plantStats[p.id]?.matchRate || 0), 0) / loadedPlants.length)
        : 0
    }
  }, [plantStats, plants])
  
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: '0.75rem',
      marginBottom: '1.5rem'
    }}>
      <SummaryBox 
        icon="🏭" 
        value={`${totals.sites}/${totals.totalSites}`} 
        label="Plants Loaded"
        subtext="Operational sites"
      />
      <SummaryBox 
        icon="📊" 
        value={totals.assets.toLocaleString()} 
        label="Total Assets"
        subtext={`${totals.matched.toLocaleString()} verified`}
      />
      <SummaryBox 
        icon="✅" 
        value={`${totals.matchRate}%`} 
        label="Baseline Match"
        valueColor={totals.matchRate >= 80 ? '#22c55e' : totals.matchRate >= 60 ? '#f59e0b' : '#ef4444'}
        subtext="Eng → Discovery"
      />
      <SummaryBox 
        icon="🛡️" 
        value={`${securityStats.securePercent}%`} 
        label="Assets Secure"
        valueColor={securityStats.securePercent >= 70 ? '#22c55e' : securityStats.securePercent >= 50 ? '#f59e0b' : '#ef4444'}
        subtext={`${securityStats.secure.toLocaleString()} no CVEs`}
      />
      <SummaryBox 
        icon="⚠️" 
        value={securityStats.withVulns.toLocaleString()} 
        label="Need Attention"
        valueColor={securityStats.withVulns === 0 ? '#22c55e' : '#f59e0b'}
        subtext="Has vulnerabilities"
      />
    </div>
  )
}

function SummaryBox({ icon, value, label, valueColor = 'white', subtext }) {
  return (
    <div style={{
      padding: '0.75rem',
      background: 'rgba(255,255,255,0.05)',
      borderRadius: '0.5rem',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{icon}</div>
      <div style={{ fontSize: '1.25rem', fontWeight: '700', color: valueColor }}>{value}</div>
      <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{label}</div>
      {subtext && <div style={{ fontSize: '0.6rem', color: '#94a3b8', marginTop: '0.25rem' }}>{subtext}</div>}
    </div>
  )
}

// =============================================================================
// MAIN WORLD MODEL COMPONENT
// =============================================================================

export default function WorldModel({ result, industry = 'automotive' }) {
  const [selectedPlant, setSelectedPlant] = useState(null)
  
  // Sites are derived from the loaded data; static metadata only enriches known demo sites.
  const plants = useMemo(() => buildDataDrivenPlants(result, industry), [result, industry])
  
  // Calculate security stats from actual asset data
  const securityStats = useMemo(() => {
    if (!result?.assets) return { secure: 0, withVulns: 0, securePercent: 0, managed: 0, unmanaged: 0, patchedRecently: 0 }
    
    // All matched assets have discovery data
    const discoveredAssets = result.assets.filter(a => 
      a.match_type === 'matched' || a.matchType || a.discovered_ip || a.discovered
    )
    
    let secure = 0
    let withVulns = 0
    let managed = 0
    let unmanaged = 0
    let patchedRecently = 0
    
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    
    discoveredAssets.forEach(asset => {
      // Vulnerabilities - check top level first, then discovered object
      const vulnCount = parseInt(asset.vulnerabilities) || parseInt(asset.discovered?.vulnerabilities) || 0
      if (vulnCount === 0) secure++
      else withVulns++
      
      // Management status
      const isManaged = asset.is_managed || asset.discovered?.is_managed || false
      if (isManaged) managed++
      else unmanaged++
      
      // Patch status - check if patched within 90 days
      const patchDate = asset.last_patch_date || asset.discovered?.last_patch_date
      if (patchDate) {
        const patchDateObj = new Date(patchDate)
        if (patchDateObj >= ninetyDaysAgo) patchedRecently++
      }
    })
    
    const total = discoveredAssets.length
    return {
      secure,
      withVulns,
      managed,
      unmanaged,
      patchedRecently,
      total,
      securePercent: total > 0 ? Math.round((secure / total) * 100) : 0,
      managedPercent: total > 0 ? Math.round((managed / total) * 100) : 0,
      patchedPercent: total > 0 ? Math.round((patchedRecently / total) * 100) : 0
    }
  }, [result])
  
  // Parse plant stats from the same data-derived site identities used by the map.
  const plantStats = useMemo(() => {
    const allAssets = allResultAssets(result)
    if (allAssets.length === 0) return {}

    const byPlant = {}

    allAssets.forEach(asset => {
      const { key } = assetSiteIdentity(asset)
      const isKnownPlant = plants.some(plant => plant.id === key)
      if (!key || !isKnownPlant) return

      if (!byPlant[key]) {
        byPlant[key] = {
          assets: [],
          matched: 0,
          blindSpots: 0,
          orphans: 0
        }
      }

      byPlant[key].assets.push(asset)

      const status = assetStatus(asset)
      if (status === 'blind_spot') {
        byPlant[key].blindSpots++
      } else if (status === 'orphan') {
        byPlant[key].orphans++
      } else {
        byPlant[key].matched++
      }
    })

    // Calculate final stats per plant
    const stats = {}
    Object.entries(byPlant).forEach(([key, data]) => {
      // Match Rate: matched assets / (matched + blindSpots)
      // This shows how many engineering assets were actually discovered
      const totalBaseline = data.matched + data.blindSpots
      const matchRate = totalBaseline > 0 
        ? Math.round((data.matched / totalBaseline) * 100) 
        : (data.assets.length > 0 ? 100 : 0) // If no blind spots, 100%
      
      stats[key] = {
        assetCount: data.assets.length,
        matched: data.matched,
        blindSpots: data.blindSpots,
        orphans: data.orphans,
        matchRate // Eng baseline match rate (what % of expected assets were found)
      }
    })
    
    return stats
  }, [result, plants])
  
  const hasAnyData = Object.keys(plantStats).length > 0
  
  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      border: '2px solid #334155',
      borderRadius: '1rem',
      padding: '1.5rem',
      marginBottom: '2rem',
      color: 'white'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '1.25rem'
      }}>
        <div>
          <h3 style={{ 
            margin: '0 0 0.25rem 0', 
            fontSize: '1.35rem', 
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            🌐 Enterprise World Model
          </h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8' }}>
            {industry === 'automotive' ? 'Automotive Manufacturing Network' : 'Enterprise Asset Visibility'}
          </p>
        </div>
        
        <div style={{
          padding: '0.5rem 1rem',
          background: hasAnyData ? '#22c55e20' : '#64748b20',
          borderRadius: '0.5rem',
          fontSize: '0.8rem',
          color: hasAnyData ? '#22c55e' : '#94a3b8'
        }}>
          {Object.keys(plantStats).length} of {plants.length} plants loaded
        </div>
      </div>
      
      {/* Enterprise Summary */}
      {hasAnyData && <EnterpriseSummary plantStats={plantStats} plants={plants} securityStats={securityStats} />}
      
      {/* Map Visualization */}
      <USMapVisualization 
        plants={plants}
        plantStats={plantStats}
        selectedPlant={selectedPlant}
        onSelectPlant={setSelectedPlant}
      />
      
      {/* Plant Cards */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        overflowX: 'auto',
        paddingBottom: '0.5rem'
      }}>
        {plants.map(plant => (
          <PlantCard
            key={plant.id}
            plant={plant}
            stats={plantStats[plant.id]}
            isSelected={selectedPlant === plant.id}
            onClick={() => setSelectedPlant(plant.id === selectedPlant ? null : plant.id)}
          />
        ))}
      </div>
      
      {/* Selected Plant Detail */}
      {selectedPlant && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '0.5rem',
          borderLeft: `4px solid ${plants.find(p => p.id === selectedPlant)?.color || '#3b82f6'}`
        }}>
          {(() => {
            const plant = plants.find(p => p.id === selectedPlant)
            const stats = plantStats[selectedPlant]
            
            return (
              <div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  marginBottom: '0.75rem'
                }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', fontWeight: '700' }}>
                      {plant.name}
                    </h4>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      {(plant.products || []).join(' • ') || plant.type}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#64748b' }}>
                    {plant.capacity && <div>Capacity: {plant.capacity.toLocaleString()}/year</div>}
                    {plant.employees && <div>Employees: {plant.employees.toLocaleString()}</div>}
                    {plant.founded && <div>Founded: {plant.founded}</div>}
                    {!plant.capacity && !plant.employees && !plant.founded && <div>{plant.city}</div>}
                  </div>
                </div>
                
                {stats && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '1rem',
                    padding: '0.75rem',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '0.5rem'
                  }}>
                    <div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{stats.assetCount.toLocaleString()}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Total OT Assets</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#22c55e' }}>{stats.matched.toLocaleString()}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Verified</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700', color: stats.blindSpots > 0 ? '#f59e0b' : '#22c55e' }}>{stats.blindSpots}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Blind Spots</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700', color: stats.orphans > 0 ? '#ef4444' : '#22c55e' }}>{stats.orphans}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Orphans</div>
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}
      
      {/* Build your model message */}
      {!hasAnyData && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '0.5rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.9rem', color: '#93c5fd', marginBottom: '0.5rem' }}>
            🎯 <strong>Start Building Your World Model</strong>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Upload engineering baselines and OT discovery data from each plant to build enterprise-wide asset visibility.
          </div>
        </div>
      )}
      
      {/* CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.3; }
          50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
