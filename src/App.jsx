import { useState, useEffect } from 'react'
import './App.css'

// Simulated real-time data from different systems
const generateRealTimeData = () => ({
  // DCS/SCADA Data
  dcs: {
    cdu: {
      feedRate: 45000 + Math.random() * 2000, // bbl/day
      topTemp: 180 + Math.random() * 10, // °F
      bottomTemp: 650 + Math.random() * 20,
      pressure: 15.2 + Math.random() * 0.5, // psig
      efficiency: 94.2 + Math.random() * 2
    },
    fcc: {
      feedRate: 18000 + Math.random() * 1000,
      reactorTemp: 980 + Math.random() * 15, // °F
      regeneratorTemp: 1250 + Math.random() * 20,
      conversion: 78.5 + Math.random() * 3,
      gasoline_yield: 45.2 + Math.random() * 2
    }
  },
  // Vibration Monitoring System
  vibration: {
    compressor_101: {
      overall: 2.1 + Math.random() * 0.3, // mm/s RMS
      bearing_temp: 165 + Math.random() * 10, // °F
      status: Math.random() > 0.1 ? 'Normal' : 'Alert'
    },
    pump_201: {
      overall: 1.8 + Math.random() * 0.2,
      bearing_temp: 145 + Math.random() * 8,
      status: Math.random() > 0.05 ? 'Normal' : 'Warning'
    }
  },
  // LIMS Quality Data
  lims: {
    crude_oil: {
      api_gravity: 32.1 + Math.random() * 1.2,
      sulfur_content: 1.85 + Math.random() * 0.15, // wt%
      last_updated: new Date().toLocaleTimeString()
    },
    gasoline: {
      octane: 91.2 + Math.random() * 0.8,
      reid_vapor_pressure: 7.8 + Math.random() * 0.3, // psi
      sulfur_content: 8.2 + Math.random() * 1.1, // ppm
      last_updated: new Date().toLocaleTimeString()
    }
  },
  // CMMS Maintenance Data
  cmms: {
    work_orders_open: 23 + Math.floor(Math.random() * 5),
    critical_equipment: [
      { tag: 'P-101A', description: 'Crude Feed Pump', due_date: '2025-09-28', priority: 'High' },
      { tag: 'E-201B', description: 'Heat Exchanger', due_date: '2025-10-05', priority: 'Medium' },
      { tag: 'C-301', description: 'FCC Main Compressor', due_date: '2025-09-30', priority: 'Critical' }
    ]
  },
  // Energy Management
  energy: {
    steam_consumption: 285 + Math.random() * 20, // klb/hr
    power_consumption: 42.5 + Math.random() * 3, // MW
    fuel_gas_usage: 155 + Math.random() * 10, // MMBTU/hr
    efficiency_index: 88.7 + Math.random() * 2
  }
})

function App() {
  const [data, setData] = useState(generateRealTimeData())
  const [selectedUnit, setSelectedUnit] = useState('overview')

  useEffect(() => {
    const interval = setInterval(() => {
      setData(generateRealTimeData())
    }, 3000) // Update every 3 seconds to simulate real-time

    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (value, thresholds) => {
    if (value > thresholds.critical) return '#ff4444'
    if (value > thresholds.warning) return '#ffaa00'
    return '#00aa44'
  }

  const AssetCard = ({ title, children, status = 'normal' }) => (
    <div className={`asset-card ${status}`}>
      <h3>{title}</h3>
      {children}
    </div>
  )

  const MetricDisplay = ({ label, value, unit, status = 'normal' }) => (
    <div className={`metric ${status}`}>
      <span className="metric-label">{label}</span>
      <span className="metric-value">{typeof value === 'number' ? value.toFixed(1) : value} {unit}</span>
    </div>
  )

  return (
    <div className="refinery-app">
      <header className="app-header">
        <h1>🏭 Gulf Coast Refinery - Performance Assurance Digital Twin</h1>
        <div className="plant-info">
          <span>Capacity: 250,000 bbl/day</span>
          <span>Status: Operating</span>
          <span className="last-update">Last Update: {new Date().toLocaleTimeString()}</span>
        </div>
      </header>

      <nav className="unit-nav">
        <button 
          className={selectedUnit === 'overview' ? 'active' : ''}
          onClick={() => setSelectedUnit('overview')}
        >
          Plant Overview
        </button>
        <button 
          className={selectedUnit === 'cdu' ? 'active' : ''}
          onClick={() => setSelectedUnit('cdu')}
        >
          Crude Distillation Unit
        </button>
        <button 
          className={selectedUnit === 'fcc' ? 'active' : ''}
          onClick={() => setSelectedUnit('fcc')}
        >
          FCC Unit
        </button>
        <button 
          className={selectedUnit === 'rotating' ? 'active' : ''}
          onClick={() => setSelectedUnit('rotating')}
        >
          Rotating Equipment
        </button>
        <button 
          className={selectedUnit === 'quality' ? 'active' : ''}
          onClick={() => setSelectedUnit('quality')}
        >
          Quality & Lab Data
        </button>
      </nav>

      <main className="main-content">
        {selectedUnit === 'overview' && (
          <div className="overview-grid">
            <AssetCard title="Plant Performance Summary">
              <MetricDisplay label="Overall Equipment Effectiveness" value={92.3} unit="%" />
              <MetricDisplay label="Energy Efficiency Index" value={data.energy.efficiency_index} unit="%" />
              <MetricDisplay label="Open Work Orders" value={data.cmms.work_orders_open} unit="" status="warning" />
            </AssetCard>

            <AssetCard title="Production Rates">
              <MetricDisplay label="Crude Feed Rate" value={data.dcs.cdu.feedRate} unit="bbl/day" />
              <MetricDisplay label="FCC Feed Rate" value={data.dcs.fcc.feedRate} unit="bbl/day" />
              <MetricDisplay label="Gasoline Yield" value={data.dcs.fcc.gasoline_yield} unit="%" />
            </AssetCard>

            <AssetCard title="Energy Consumption">
              <MetricDisplay label="Steam" value={data.energy.steam_consumption} unit="klb/hr" />
              <MetricDisplay label="Power" value={data.energy.power_consumption} unit="MW" />
              <MetricDisplay label="Fuel Gas" value={data.energy.fuel_gas_usage} unit="MMBTU/hr" />
            </AssetCard>

            <AssetCard title="Critical Maintenance" status="warning">
              <div className="maintenance-list">
                {data.cmms.critical_equipment.map((item, index) => (
                  <div key={index} className={`maintenance-item ${item.priority.toLowerCase()}`}>
                    <strong>{item.tag}</strong> - {item.description}
                    <br />
                    <small>Due: {item.due_date} | Priority: {item.priority}</small>
                  </div>
                ))}
              </div>
            </AssetCard>
          </div>
        )}

        {selectedUnit === 'cdu' && (
          <div className="unit-detail">
            <h2>Crude Distillation Unit - Performance Dashboard</h2>
            <div className="detail-grid">
              <AssetCard title="Process Parameters (DCS Data)">
                <MetricDisplay label="Feed Rate" value={data.dcs.cdu.feedRate} unit="bbl/day" />
                <MetricDisplay label="Column Top Temperature" value={data.dcs.cdu.topTemp} unit="°F" />
                <MetricDisplay label="Column Bottom Temperature" value={data.dcs.cdu.bottomTemp} unit="°F" />
                <MetricDisplay label="Column Pressure" value={data.dcs.cdu.pressure} unit="psig" />
                <MetricDisplay label="Unit Efficiency" value={data.dcs.cdu.efficiency} unit="%" />
              </AssetCard>

              <AssetCard title="Data Source Integration">
                <div className="data-sources">
                  <div className="source-item">
                    <span className="source-icon">📊</span>
                    <div>
                      <strong>DCS/SCADA</strong>
                      <p>Real-time process data from Honeywell TDC 3000</p>
                      <small>Last update: {new Date().toLocaleTimeString()}</small>
                    </div>
                  </div>
                  <div className="source-item">
                    <span className="source-icon">🔧</span>
                    <div>
                      <strong>CMMS (Maximo)</strong>
                      <p>Maintenance schedules and work orders</p>
                      <small>Sync: Every 15 minutes</small>
                    </div>
                  </div>
                  <div className="source-item">
                    <span className="source-icon">📈</span>
                    <div>
                      <strong>PI Historian</strong>
                      <p>Historical trends and analytics</p>
                      <small>Data retention: 5 years</small>
                    </div>
                  </div>
                </div>
              </AssetCard>
            </div>
          </div>
        )}

        {selectedUnit === 'fcc' && (
          <div className="unit-detail">
            <h2>Fluid Catalytic Cracking Unit - Performance Dashboard</h2>
            <div className="detail-grid">
              <AssetCard title="Process Parameters">
                <MetricDisplay label="Feed Rate" value={data.dcs.fcc.feedRate} unit="bbl/day" />
                <MetricDisplay label="Reactor Temperature" value={data.dcs.fcc.reactorTemp} unit="°F" />
                <MetricDisplay label="Regenerator Temperature" value={data.dcs.fcc.regeneratorTemp} unit="°F" />
                <MetricDisplay label="Conversion Rate" value={data.dcs.fcc.conversion} unit="%" />
                <MetricDisplay label="Gasoline Yield" value={data.dcs.fcc.gasoline_yield} unit="%" />
              </AssetCard>

              <AssetCard title="Performance Analysis">
                <div className="performance-insights">
                  <p><strong>Current Status:</strong> Operating within normal parameters</p>
                  <p><strong>Efficiency Trend:</strong> Stable over last 24 hours</p>
                  <p><strong>Catalyst Activity:</strong> Good (estimated 85% of fresh catalyst)</p>
                  <p><strong>Next Regeneration:</strong> Scheduled in 72 hours</p>
                </div>
              </AssetCard>
            </div>
          </div>
        )}

        {selectedUnit === 'rotating' && (
          <div className="unit-detail">
            <h2>Rotating Equipment - Condition Monitoring</h2>
            <div className="detail-grid">
              <AssetCard title="Main Compressor (C-101)" 
                status={data.vibration.compressor_101.status === 'Normal' ? 'normal' : 'warning'}>
                <MetricDisplay 
                  label="Vibration (Overall)" 
                  value={data.vibration.compressor_101.overall} 
                  unit="mm/s RMS"
                  status={data.vibration.compressor_101.overall > 3.0 ? 'critical' : 'normal'}
                />
                <MetricDisplay 
                  label="Bearing Temperature" 
                  value={data.vibration.compressor_101.bearing_temp} 
                  unit="°F" 
                />
                <MetricDisplay 
                  label="Status" 
                  value={data.vibration.compressor_101.status} 
                  unit="" 
                />
              </AssetCard>

              <AssetCard title="Feed Pump (P-201A)" 
                status={data.vibration.pump_201.status === 'Normal' ? 'normal' : 'warning'}>
                <MetricDisplay 
                  label="Vibration (Overall)" 
                  value={data.vibration.pump_201.overall} 
                  unit="mm/s RMS"
                  status={data.vibration.pump_201.overall > 2.5 ? 'warning' : 'normal'}
                />
                <MetricDisplay 
                  label="Bearing Temperature" 
                  value={data.vibration.pump_201.bearing_temp} 
                  unit="°F" 
                />
                <MetricDisplay 
                  label="Status" 
                  value={data.vibration.pump_201.status} 
                  unit="" 
                />
              </AssetCard>

              <AssetCard title="Vibration Monitoring System">
                <div className="data-sources">
                  <div className="source-item">
                    <span className="source-icon">📳</span>
                    <div>
                      <strong>Bently Nevada System 1</strong>
                      <p>Continuous vibration monitoring on critical rotating equipment</p>
                      <small>32 channels active | Update rate: 1Hz</small>
                    </div>
                  </div>
                  <div className="source-item">
                    <span className="source-icon">🌡️</span>
                    <div>
                      <strong>Temperature Monitoring</strong>
                      <p>RTD sensors on all bearing housings</p>
                      <small>Alarm: >180°F | Trip: >200°F</small>
                    </div>
                  </div>
                </div>
              </AssetCard>
            </div>
          </div>
        )}

        {selectedUnit === 'quality' && (
          <div className="unit-detail">
            <h2>Quality Control & Laboratory Data (LIMS Integration)</h2>
            <div className="detail-grid">
              <AssetCard title="Crude Oil Quality">
                <MetricDisplay 
                  label="API Gravity" 
                  value={data.lims.crude_oil.api_gravity} 
                  unit="°API" 
                />
                <MetricDisplay 
                  label="Sulfur Content" 
                  value={data.lims.crude_oil.sulfur_content} 
                  unit="wt%" 
                />
                <p><small>Last Sample: {data.lims.crude_oil.last_updated}</small></p>
              </AssetCard>

              <AssetCard title="Gasoline Product Quality">
                <MetricDisplay 
                  label="Research Octane Number" 
                  value={data.lims.gasoline.octane} 
                  unit="RON" 
                />
                <MetricDisplay 
                  label="Reid Vapor Pressure" 
                  value={data.lims.gasoline.reid_vapor_pressure} 
                  unit="psi" 
                />
                <MetricDisplay 
                  label="Sulfur Content" 
                  value={data.lims.gasoline.sulfur_content} 
                  unit="ppm" 
                />
                <p><small>Last Sample: {data.lims.gasoline.last_updated}</small></p>
              </AssetCard>

              <AssetCard title="Laboratory Information Management System">
                <div className="data-sources">
                  <div className="source-item">
                    <span className="source-icon">🧪</span>
                    <div>
                      <strong>LIMS Integration</strong>
                      <p>Automated sample tracking and results reporting</p>
                      <small>Sample frequency: Every 4 hours</small>
                    </div>
                  </div>
                  <div className="source-item">
                    <span className="source-icon">📋</span>
                    <div>
                      <strong>Quality Specifications</strong>
                      <p>ASTM standards compliance monitoring</p>
                      <small>Auto-alerts for out-of-spec results</small>
                    </div>
                  </div>
                </div>
              </AssetCard>
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>🔄 Data Integration: DCS/SCADA • CMMS • LIMS • Vibration Monitoring • Energy Management • PI Historian</p>
        <p>Performance Assurance Digital Twin - Driving Better Asset Performance Through Data Integration</p>
      </footer>
    </div>
  )
}

export default App