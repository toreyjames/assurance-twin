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
        <div className="header-content">
          <div className="deloitte-branding">
            <span className="deloitte-logo">🔷</span>
            <span className="deloitte-text">Deloitte OT Assurance Twin</span>
          </div>
          <h1>🏭 Gulf Coast Refinery - Performance Assurance Digital Twin</h1>
          <div className="plant-info">
            <span>Capacity: 250,000 bbl/day</span>
            <span>Status: Operating</span>
            <span className="canonical-graph">📊 Canonical Graph: Active</span>
            <span className="last-update">Last Update: {new Date().toLocaleTimeString()}</span>
          </div>
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
        <button 
          className={selectedUnit === 'canonical' ? 'active' : ''}
          onClick={() => setSelectedUnit('canonical')}
        >
          Canonical Graph
        </button>
        <button 
          className={selectedUnit === 'governance' ? 'active' : ''}
          onClick={() => setSelectedUnit('governance')}
        >
          Change Governance
        </button>
        <button 
          className={selectedUnit === 'business' ? 'active' : ''}
          onClick={() => setSelectedUnit('business')}
        >
          Business Impact
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
                      <small>Alarm: &gt;180°F | Trip: &gt;200°F</small>
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

        {selectedUnit === 'canonical' && (
          <div className="unit-detail">
            <h2>Canonical Graph - Deloitte's Unique Asset Intelligence</h2>
            <div className="detail-grid">
              <AssetCard title="Canonical Graph Overview">
                <div className="canonical-stats">
                  <MetricDisplay label="Discovered Assets" value="2,847" unit="devices" />
                  <MetricDisplay label="P&ID Integration" value="98.2" unit="% mapped" />
                  <MetricDisplay label="Loop Reconstruction" value="456" unit="control loops" />
                  <MetricDisplay label="Documentation Freshness" value="94.7" unit="% current" />
                </div>
                <div className="graph-visualization">
                  <h4>🔗 Asset Relationship Network</h4>
                  <div className="network-diagram">
                    <div className="node primary">CDU-101</div>
                    <div className="connection"></div>
                    <div className="node secondary">P-101A</div>
                    <div className="connection"></div>
                    <div className="node secondary">FT-101</div>
                    <div className="connection"></div>
                    <div className="node secondary">FIC-101</div>
                  </div>
                  <p><small>Live control loop: Crude feed rate control with pump P-101A</small></p>
                </div>
              </AssetCard>

              <AssetCard title="Loop Reconstruction & Validation">
                <div className="loop-analysis">
                  <h4>🔄 Control Loop Analysis</h4>
                  <div className="loop-item">
                    <strong>FIC-101: Crude Feed Flow Control</strong>
                    <div className="loop-details">
                      <p>📊 <strong>Historian Causality:</strong> 94.3% correlation</p>
                      <p>📋 <strong>P&ID Adjacency:</strong> Validated against drawing Rev-C</p>
                      <p>🔧 <strong>PLC Parsing:</strong> Logic block FB_101 confirmed</p>
                      <p>⚡ <strong>Loop Health:</strong> Normal operation, 2.1s response time</p>
                    </div>
                  </div>
                  <div className="validation-status">
                    <span className="status-badge fresh">✅ Documentation Fresh</span>
                    <span className="status-badge validated">✅ Loop Validated</span>
                    <span className="status-badge compliant">✅ IEC 62443 Compliant</span>
                  </div>
                </div>
              </AssetCard>

              <AssetCard title="Deloitte Differentiator">
                <div className="differentiator-content">
                  <h4>🎯 Why This Matters</h4>
                  <div className="comparison">
                    <div className="others">
                      <h5>❌ What Others Provide:</h5>
                      <ul>
                        <li>50-80% asset visibility (shadow networks)</li>
                        <li>Static P&IDs disconnected from reality</li>
                        <li>No process causality understanding</li>
                        <li>Separate silos of information</li>
                      </ul>
                    </div>
                    <div className="deloitte">
                      <h5>✅ Deloitte OT Assurance Twin:</h5>
                      <ul>
                        <li><strong>Canonical Graph:</strong> Fuses discovery + historian + PLC + P&IDs</li>
                        <li><strong>Loop Reconstruction:</strong> Proves causality relationships</li>
                        <li><strong>Live Documentation:</strong> P&IDs sync with actual plant state</li>
                        <li><strong>Crown Jewel Paths:</strong> $/hr risk quantification</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </AssetCard>
            </div>
          </div>
        )}

        {selectedUnit === 'governance' && (
          <div className="unit-detail">
            <h2>Change Governance & Evidence - Regulator Ready</h2>
            <div className="detail-grid">
              <AssetCard title="Signed Change Ledger">
                <div className="ledger-content">
                  <h4>🔐 Blockchain-Based Change Tracking</h4>
                  <div className="change-record">
                    <div className="change-item">
                      <strong>Change #2025-0923-001</strong>
                      <p>Modified: FIC-101 setpoint 45,000 → 47,000 bbl/day</p>
                      <div className="change-metadata">
                        <span>👤 Operator: J.Smith (Certified)</span>
                        <span>⏰ Timestamp: 2025-09-23 14:23:15 UTC</span>
                        <span>🔒 Hash: SHA-256 chain verified</span>
                        <span>📋 Approval: MOC-2025-456 (Approved)</span>
                      </div>
                    </div>
                  </div>
                  <div className="merkle-proof">
                    <h5>🌳 Merkle Root Verification</h5>
                    <code>0x7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730</code>
                    <p><small>Cryptographic proof of change integrity for regulatory audit</small></p>
                  </div>
                </div>
              </AssetCard>

              <AssetCard title="Regulatory Compliance Evidence">
                <div className="compliance-content">
                  <h4>📋 Evidence Packs Ready</h4>
                  <div className="evidence-packs">
                    <div className="pack-item">
                      <span className="pack-icon">🛡️</span>
                      <div>
                        <strong>IEC 62443 Compliance Pack</strong>
                        <p>Zone segmentation, access controls, change management</p>
                        <small>Generated: 2025-09-23 | Status: ✅ Current</small>
                      </div>
                    </div>
                    <div className="pack-item">
                      <span className="pack-icon">⚡</span>
                      <div>
                        <strong>NERC CIP Evidence Package</strong>
                        <p>Critical asset inventory, cyber security controls</p>
                        <small>Generated: 2025-09-23 | Status: ✅ Current</small>
                      </div>
                    </div>
                    <div className="pack-item">
                      <span className="pack-icon">💊</span>
                      <div>
                        <strong>FDA 21 CFR Part 11</strong>
                        <p>Electronic records, electronic signatures validation</p>
                        <small>Generated: 2025-09-23 | Status: ✅ Current</small>
                      </div>
                    </div>
                  </div>
                </div>
              </AssetCard>

              <AssetCard title="Trust Stream - Evidence in 5 Minutes">
                <div className="trust-stream">
                  <h4>⚡ Rapid Evidence Generation</h4>
                  <div className="evidence-timeline">
                    <div className="timeline-item completed">
                      <span className="timeline-dot"></span>
                      <div>
                        <strong>Asset Discovery Scan</strong>
                        <small>Completed in 2.3 minutes</small>
                      </div>
                    </div>
                    <div className="timeline-item completed">
                      <span className="timeline-dot"></span>
                      <div>
                        <strong>P&ID Correlation</strong>
                        <small>Completed in 1.8 minutes</small>
                      </div>
                    </div>
                    <div className="timeline-item completed">
                      <span className="timeline-dot"></span>
                      <div>
                        <strong>Compliance Report Generation</strong>
                        <small>Completed in 0.9 minutes</small>
                      </div>
                    </div>
                  </div>
                  <div className="evidence-output">
                    <p><strong>📄 Generated Evidence Package:</strong></p>
                    <ul>
                      <li>2,847 verified asset records</li>
                      <li>456 validated control loops</li>
                      <li>98.2% P&ID correlation</li>
                      <li>Regulator-ready compliance documentation</li>
                    </ul>
                  </div>
                </div>
              </AssetCard>
            </div>
          </div>
        )}

        {selectedUnit === 'business' && (
          <div className="unit-detail">
            <h2>Business Impact - Executive "What-Ifs"</h2>
            <div className="detail-grid">
              <AssetCard title="Financial Impact Analysis">
                <div className="financial-metrics">
                  <h4>💰 Real-Time Business Impact</h4>
                  <MetricDisplay label="Current Downtime Risk" value="$125,000" unit="/hour" status="warning" />
                  <MetricDisplay label="Compliance Cost Avoidance" value="$2.3M" unit="/year" />
                  <MetricDisplay label="Energy Efficiency Savings" value="$1.8M" unit="/year" />
                  <MetricDisplay label="CapEx ROI Improvement" value="23.5" unit="%" />
                </div>
                <div className="what-if-scenarios">
                  <h5>🎯 What-If Scenarios</h5>
                  <div className="scenario">
                    <strong>Scenario: CDU Unplanned Shutdown</strong>
                    <p>💸 Impact: $125,000/hour × 8 hours = <span className="cost-highlight">$1,000,000</span></p>
                    <p>🛡️ Deloitte Prevention: Early detection saves 6 hours = <span className="savings-highlight">$750,000</span></p>
                  </div>
                  <div className="scenario">
                    <strong>Scenario: Regulatory Non-Compliance</strong>
                    <p>💸 Penalty Risk: $2.3M fine + operational restrictions</p>
                    <p>🛡️ Deloitte Protection: Continuous compliance monitoring = <span className="savings-highlight">$2.3M avoided</span></p>
                  </div>
                </div>
              </AssetCard>

              <AssetCard title="Operational Excellence ROI">
                <div className="roi-analysis">
                  <h4>📈 Return on Investment</h4>
                  <div className="roi-metrics">
                    <div className="roi-item">
                      <span className="roi-label">Implementation Cost:</span>
                      <span className="roi-value">$1.2M</span>
                    </div>
                    <div className="roi-item">
                      <span className="roi-label">Annual Savings:</span>
                      <span className="roi-value savings">$4.8M</span>
                    </div>
                    <div className="roi-item">
                      <span className="roi-label">Payback Period:</span>
                      <span className="roi-value">3.6 months</span>
                    </div>
                    <div className="roi-item">
                      <span className="roi-label">3-Year NPV:</span>
                      <span className="roi-value savings">$12.4M</span>
                    </div>
                  </div>
                  <div className="roi-breakdown">
                    <h5>💡 Savings Breakdown:</h5>
                    <ul>
                      <li>Predictive Maintenance: $1.8M/year</li>
                      <li>Energy Optimization: $1.9M/year</li>
                      <li>Compliance Automation: $0.8M/year</li>
                      <li>Reduced Downtime: $0.3M/year</li>
                    </ul>
                  </div>
                </div>
              </AssetCard>

              <AssetCard title="Executive Dashboard">
                <div className="executive-summary">
                  <h4>📊 C-Suite Key Performance Indicators</h4>
                  <div className="kpi-grid">
                    <div className="kpi-item">
                      <span className="kpi-value">94.7%</span>
                      <span className="kpi-label">Asset Reliability</span>
                    </div>
                    <div className="kpi-item">
                      <span className="kpi-value">$4.8M</span>
                      <span className="kpi-label">Annual Savings</span>
                    </div>
                    <div className="kpi-item">
                      <span className="kpi-value">100%</span>
                      <span className="kpi-label">Regulatory Compliance</span>
                    </div>
                    <div className="kpi-item">
                      <span className="kpi-value">3.6mo</span>
                      <span className="kpi-label">ROI Payback</span>
                    </div>
                  </div>
                  <div className="strategic-value">
                    <h5>🎯 Strategic Business Value</h5>
                    <p><strong>Operational Resilience:</strong> Proactive risk management reduces unplanned downtime by 35%</p>
                    <p><strong>Regulatory Confidence:</strong> Automated compliance reduces audit preparation time by 80%</p>
                    <p><strong>Capital Efficiency:</strong> Data-driven CapEx decisions improve project ROI by 23%</p>
                    <p><strong>Competitive Advantage:</strong> Digital twin capabilities enable new service offerings</p>
                  </div>
                </div>
              </AssetCard>
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>🔷 <strong>Deloitte OT Assurance Twin</strong> - Canonical Graph • Loop Reconstruction • Change Governance • Business Intelligence</p>
        <p><strong>Assurance Twin restructures the existing process & OT asset data and turns it into executive and regulator ready intelligence.</strong></p>
      </footer>
      </div>
  )
}

export default App