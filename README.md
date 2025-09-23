# Gulf Coast Refinery - Performance Assurance Digital Twin

## Overview
A comprehensive Performance Assurance Digital Twin for a 250,000 bbl/day oil & gas refinery, demonstrating the integration of disparate data sources to answer the critical question: **"How are my assets performing?"**

## Refinery Specifications
- **Plant**: Gulf Coast Refinery Complex
- **Capacity**: 250,000 barrels per day
- **Primary Units**: 
  - Crude Distillation Unit (CDU)
  - Fluid Catalytic Cracking (FCC) Unit  
  - Hydrotreating Units
  - Heat Exchanger Network
  - Storage Tank Farm

## Key Performance Questions Answered
1. **Asset Health**: What is the current condition of critical rotating equipment?
2. **Process Efficiency**: Are units operating within optimal parameters?
3. **Product Quality**: Do products meet specifications consistently?
4. **Maintenance Planning**: Which assets require immediate attention?
5. **Energy Performance**: How efficiently are we using utilities?

## Data Source Integration

### 1. DCS/SCADA Systems
- **Source**: Honeywell TDC 3000
- **Data**: Real-time process parameters
- **Update Frequency**: 1-5 seconds
- **Key Metrics**: 
  - Feed rates (bbl/day)
  - Temperatures (°F)
  - Pressures (psig)
  - Unit efficiency (%)

### 2. Computerized Maintenance Management System (CMMS)
- **Source**: IBM Maximo
- **Data**: Work orders, maintenance schedules
- **Update Frequency**: 15 minutes
- **Key Metrics**:
  - Open work orders
  - Critical maintenance due dates
  - Equipment reliability metrics

### 3. Laboratory Information Management System (LIMS)
- **Source**: Automated lab systems
- **Data**: Product quality analysis
- **Update Frequency**: Every 4 hours
- **Key Metrics**:
  - API Gravity (°API)
  - Sulfur content (ppm)
  - Octane ratings (RON)
  - Reid Vapor Pressure (psi)

### 4. Vibration Monitoring System
- **Source**: Bently Nevada System 1
- **Data**: Rotating equipment condition
- **Update Frequency**: 1 Hz continuous
- **Key Metrics**:
  - Overall vibration (mm/s RMS)
  - Bearing temperatures (°F)
  - Equipment status alerts

### 5. Energy Management System
- **Source**: Plant utilities systems
- **Data**: Energy consumption and efficiency
- **Update Frequency**: 1 minute
- **Key Metrics**:
  - Steam consumption (klb/hr)
  - Power consumption (MW)
  - Fuel gas usage (MMBTU/hr)

### 6. PI Historian
- **Source**: OSIsoft PI System
- **Data**: Historical trends and analytics
- **Retention**: 5 years
- **Purpose**: Trend analysis, performance benchmarking

## Critical Assets Monitored

### Crude Distillation Unit (CDU)
- **Capacity**: 45,000 bbl/day feed rate
- **Key Parameters**: Column temperatures, pressures, efficiency
- **Critical Equipment**: Feed pumps (P-101A/B), Crude heater (F-101)

### Fluid Catalytic Cracking (FCC) Unit  
- **Capacity**: 18,000 bbl/day feed rate
- **Key Parameters**: Reactor/regenerator temperatures, conversion rates
- **Critical Equipment**: Main air blower (C-301), Reactor (R-301)

### Rotating Equipment
- **Main Compressor (C-101)**: 3,580 RPM, critical for plant operations
- **Feed Pumps (P-201A/B)**: 1,780 RPM, primary crude feed
- **Vibration Limits**: 
  - Normal: < 2.5 mm/s RMS
  - Warning: 2.5-4.0 mm/s RMS  
  - Critical: > 4.0 mm/s RMS

## Performance Assurance Use Cases

### 1. Predictive Maintenance
- **Challenge**: Unplanned equipment failures cost $50,000-500,000 per incident
- **Solution**: Vibration monitoring + CMMS integration identifies issues 2-4 weeks early
- **Impact**: 35% reduction in unplanned downtime

### 2. Process Optimization
- **Challenge**: Energy costs represent 60% of operating expenses
- **Solution**: Real-time efficiency monitoring identifies optimization opportunities
- **Impact**: 2-3% improvement in energy efficiency = $2M annual savings

### 3. Quality Assurance
- **Challenge**: Off-spec product requires expensive reprocessing
- **Solution**: LIMS integration with process data prevents quality excursions
- **Impact**: 90% reduction in off-spec production

### 4. Regulatory Compliance
- **Challenge**: Environmental and safety regulations require continuous monitoring
- **Solution**: Automated data collection and reporting
- **Impact**: 100% compliance with reporting requirements

## Technology Stack
- **Frontend**: React 19.1.1 with Vite
- **Styling**: Custom CSS with industrial dashboard theme
- **Data Simulation**: Real-time data generation mimicking actual plant systems
- **Deployment**: Ready for Netlify/Vercel deployment

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
```bash
npm install
npm run dev
```

### Viewing the Application
Navigate to `http://localhost:5173` to view the Gulf Coast Refinery Digital Twin

## Data Files
Sample data files are included in `/public/data/`:
- `cmms_work_orders.csv` - Maintenance work orders
- `lims_quality_data.csv` - Laboratory quality results  
- `vibration_monitoring.csv` - Equipment condition data

## Performance Metrics Dashboard

### Plant Overview
- Overall Equipment Effectiveness (OEE)
- Energy Efficiency Index
- Critical maintenance alerts
- Production rates summary

### Unit-Specific Views
- **CDU**: Process parameters, efficiency trends
- **FCC**: Conversion rates, catalyst performance
- **Rotating Equipment**: Vibration analysis, bearing temperatures
- **Quality Control**: Product specifications, compliance status

## Business Value Proposition

### Operational Excellence
- **Asset Reliability**: 95%+ uptime through predictive maintenance
- **Process Efficiency**: Optimal operating parameters maintained
- **Quality Consistency**: Reduced product variability

### Financial Impact
- **Maintenance Costs**: 25% reduction through condition-based maintenance
- **Energy Savings**: 2-3% efficiency improvement = $2M+ annually
- **Production Optimization**: Increased throughput and yield

### Risk Mitigation
- **Safety**: Early detection of equipment anomalies
- **Environmental**: Continuous emissions monitoring
- **Regulatory**: Automated compliance reporting

## Future Enhancements
- Machine learning for predictive analytics
- Advanced process control integration
- Mobile application for field operators
- Integration with enterprise systems (SAP, etc.)
- Real-time optimization algorithms

---

**Performance Assurance Digital Twin - Driving Better Asset Performance Through Data Integration**

*Demonstrating how multiple data sources provide comprehensive visibility into refinery operations, enabling data-driven decisions that improve safety, reliability, and profitability.*