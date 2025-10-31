# 🎯 OT Discovery Demo Guide

## **Demo Data Available**

### **Realistic Datasets Generated:**
- **Automotive**: 522 engineering assets, 75% discovery coverage, 130 blind spots
- **Oil & Gas**: 535 engineering assets, 85% discovery coverage, 82 blind spots  
- **Pharmaceutical**: 442 engineering assets, 81% discovery coverage, 83 blind spots
- **Utilities**: 524 engineering assets, 93% discovery coverage, 38 blind spots

### **File Locations:**
```
public/samples/demo/
├── automotive/
│   ├── engineering_baseline.csv
│   └── ot_discovery_data.csv
├── oil-gas/
│   ├── engineering_baseline.csv
│   └── ot_discovery_data.csv
├── pharma/
│   ├── engineering_baseline.csv
│   └── ot_discovery_data.csv
└── utilities/
    ├── engineering_baseline.csv
    └── ot_discovery_data.csv
```

## **Demo Script**

### **1. Select Industry**
- Go to https://performanceassurance.netlify.app
- Click on industry card (e.g., "Automotive Plants")
- Shows industry-specific standards and governance

### **2. Upload Engineering Baseline**
- **File**: `public/samples/demo/automotive/engineering_baseline.csv`
- **What it represents**: "This is what our engineering team says should be on the OT network"
- **Key points**: 522 assets across 5 production units, includes expected IPs and protocols

### **3. Upload OT Discovery Tool Data**
- **File**: `public/samples/demo/automotive/ot_discovery_data.csv`
- **What it represents**: "This is what our OT Discovery Tool actually found on the network"
- **Key points**: 444 assets discovered, includes security status and compliance data

### **4. Run Analysis**
- Click "Canonize Assets"
- Shows cross-verification metrics and gaps

### **5. Review Results**

#### **Audit-Ready Cross-Verification Metrics:**
- **Baseline Established**: 522 assets (engineering baseline)
- **OT Discovery Coverage**: 75% (realistic gap)
- **Security Managed**: 40% (compliance gap)
- **Cross-Verification Status**: "Partial - Low Discovery Coverage"

#### **Key Insights:**
- **130 Blind Spots**: Engineering assets not discovered
- **52 Orphan Assets**: Discovered assets not in engineering
- **Critical Assets**: ASIL-D safety systems coverage
- **Compliance Gaps**: Security management issues

## **Demo Talking Points**

### **The Problem:**
- "We don't know what assets we have on our OT network"
- "We don't know if they're properly secured"
- "We can't prove compliance to auditors"

### **The Solution:**
- "Establish engineering baseline first"
- "Cross-verify with OT Discovery Tool"
- "Identify gaps and compliance issues"
- "Generate audit-ready evidence"

### **The Value:**
- "75% discovery coverage means 25% of our assets are blind spots"
- "40% security managed means 60% have compliance gaps"
- "52 orphan assets means unauthorized devices on network"
- "This gives us actionable remediation priorities"

## **Industry-Specific Demos**

### **Automotive (ISO 26262, IATF 16949)**
- Focus on ASIL-D safety systems
- Production line criticality
- Robot asset security

### **Oil & Gas (ISA/IEC 62443, IEC 61511)**
- Process safety systems
- Crown jewel protection
- SIS asset compliance

### **Pharmaceutical (FDA 21 CFR Part 11, GAMP 5)**
- Batch process compliance
- Data integrity requirements
- Contamination control systems

### **Utilities (NERC CIP, FERC)**
- Grid stability assets
- Protection systems
- Environmental controls

## **Real-World Context**

### **What This Represents:**
- **Engineering Baseline**: Integration of P&IDs, asset registers, control system docs, safety systems, network architecture, commissioning records, as-built drawings
- **OT Discovery Tool**: Comprehensive network scanning, protocol analysis, device fingerprinting, security assessment
- **Cross-Verification**: Matching baseline vs. discovery to identify gaps

### **Audit Readiness:**
- **Immutable Evidence**: Hash-based audit trail
- **Cross-Verification**: Multiple data sources
- **Compliance Metrics**: Industry-specific standards
- **Remediation Priorities**: Risk-based gap analysis

## **Next Steps**

### **For Production:**
1. **Integrate multiple engineering data sources**
2. **Deploy comprehensive OT Discovery Tool**
3. **Establish regular cross-verification process**
4. **Generate ongoing compliance reporting**

### **For Demo:**
1. **Use provided realistic datasets**
2. **Show cross-verification metrics**
3. **Highlight compliance gaps**
4. **Demonstrate audit readiness**






