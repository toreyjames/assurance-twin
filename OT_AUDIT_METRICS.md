# OT Assurance Twin - Audit Metrics Framework
## CISO & OT Lead Perspective for Oil & Gas

### Executive Summary
The OT Assurance Twin provides a **4-step audit framework** aligned with ISA/IEC 62443 and oil & gas regulatory requirements (NERC CIP, API 1164).

---

## The 4-Step Audit Framework

### **STEP 1: Asset Inventory** 
**Question: "What do we HAVE?"**

**Data Source:** Engineering Baseline (P&IDs, asset registers, CMMS)

**Key Metrics:**
- Total Assets
- Critical Assets (SIS, Safety-Critical)
- Crown Jewels (Revenue-Critical)
- Process Units (CDU, FCC, HCU, etc.)

**Audit Purpose:** Establish the "source of truth" for what SHOULD exist in the OT environment.

---

### **STEP 2: Discovery Coverage**
**Question: "What can we SEE?"**

**Data Source:** OT Discovery Tool vs. Engineering Baseline

**Key Metrics:**
- **Discovery Coverage %** - What % of engineering assets are discovered on the network
- **Blind Spots** - Engineering assets NOT discovered (potential gaps)
- **Orphan Assets** - Discovered assets NOT in engineering baseline (shadow IT/rogue devices)
- **Critical Blind Spots** - Safety-critical assets not discovered

**Audit Purpose:** Identify visibility gaps. If you can't see it, you can't secure it.

**Industry Benchmark:**
- 60-80% = GOOD (air-gapped systems, passive devices, offline assets are normal)
- 80-90% = EXCELLENT
- <50% = RED FLAG - significant visibility gaps

---

### **STEP 3: Security Management**
**Question: "What is SECURED?"**

**Data Source:** OT Discovery Tool (`is_managed`, `has_security_patches`)

**Key Metrics:**
- **Managed %** - Assets actively managed by security tools (EDR, vulnerability scanner, SIEM)
- **Patched %** - Assets with current security patches
- **Unmanaged Assets** - Discovered but NOT managed (high risk)
- **Unpatched Critical Assets** - Critical assets with outdated firmware (RED FLAG)

**Audit Purpose:** Show active security coverage, not just discovery. CISO needs to know what's under management.

**Industry Benchmark:**
- Managed: 70%+ for OT is good (some legacy systems can't be managed)
- Patched: 80%+ for critical assets (OT patching is slower than IT)
- Critical assets should be 90%+ managed

---

### **STEP 4: Security Controls & Compliance**
**Question: "What are the GAPS?"**

**Data Source:** OT Discovery Tool (security control attributes)

#### Security Controls:
- **Encryption Enabled %** - Network traffic encryption
- **Authentication Required %** - Proper authentication mechanisms
- **Access Control %** - Role-based or advanced access control
- **Network Isolation %** - Proper segmentation/VLANs
- **Firewall Protected %** - Perimeter protection

#### Vulnerability Posture:
- **Total Vulnerabilities** - Known vulnerabilities across discovered assets
- **Total CVEs** - Common Vulnerabilities and Exposures
- **Assets with Vulnerabilities %**
- **Critical Assets with Vulnerabilities** - HIGH PRIORITY (safety impact)

**Audit Purpose:** Demonstrate compliance with ISA/IEC 62443, identify compensating controls, prioritize remediation.

**ISA/IEC 62443 Security Levels:**
- **SL-4 (Critical)** - Safety Instrumented Systems, crown jewels → Need all controls
- **SL-3 (High)** - Critical process control → Need encryption + auth + access control
- **SL-2 (Medium)** - Standard OT → Need auth + firewall
- **SL-1 (Low)** - Non-critical → Basic controls acceptable

---

## Data Source Consolidation

### ✅ **Required Data:**
1. **Engineering Baseline CSV** - Asset inventory (P&IDs, asset registers)
2. **OT Discovery Tool CSV** - Network discovery with security attributes

### ❌ **Redundant Data (Can Remove):**
1. **Network CSV** - REDUNDANT (OT Discovery has `ip_address`, `mac_address`, `network_segment`, `protocol`)
2. **CMMS CSV** - OPTIONAL (OT Discovery has firmware/patch data)
3. **Historian CSV** - OPTIONAL (for performance metrics only)

**Rationale:** OT Discovery Tool data already contains:
- Network information (IP, MAC, protocol, VLAN)
- Security posture (managed, patched, encrypted, authenticated)
- Vulnerability data (CVEs, security scans)
- Device metadata (vendor, model, firmware)

---

## Metric Display Structure (Recommended)

### Executive Dashboard:
```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Asset Inventory (What We Have)                     │
│ • Total Assets: 1200                                        │
│ • Critical Assets: 520                                      │
│ • Safety Instrumented Systems (SIS): 240                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Discovery Coverage (What We Can See)               │
│ • Discovery Coverage: 67% (805/1200)                        │
│ • Blind Spots: 395 assets                                   │
│ • Critical Blind Spots: 120 (RED FLAG)                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Security Management (What Is Secured)              │
│ • Managed by Security Tools: 62% (499/805)                  │
│ • Current Security Patches: 58% (467/805)                   │
│ • Unmanaged Critical Assets: 85 (HIGH RISK)                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Security Controls & Compliance Gaps                │
│ • Encryption Enabled: 45%                                   │
│ • Authentication Required: 78%                              │
│ • Access Control: 34%                                       │
│ • Total Vulnerabilities: 234 (18 CVEs)                      │
│ • Critical Assets with Vulnerabilities: 12 (URGENT)         │
└─────────────────────────────────────────────────────────────┘
```

---

## Oil & Gas Specific Considerations

### Regulatory Drivers:
- **NERC CIP** - Critical Infrastructure Protection (bulk electric systems)
- **API 1164** - Pipeline SCADA security
- **TSA Security Directives** - Pipeline cybersecurity requirements
- **ISA/IEC 62443** - OT cybersecurity standard
- **NIST CSF** - Cybersecurity framework

### Key Audit Questions:
1. **Asset Accountability** - Do we know all critical assets?
2. **Visibility** - Can we see all networked OT devices?
3. **Security Coverage** - Are critical assets managed and patched?
4. **Segmentation** - Is OT properly isolated from IT/internet?
5. **Vulnerability Management** - Do we know and track OT vulnerabilities?
6. **Incident Response** - Can we detect and respond to OT incidents?

### Industry-Specific Risks:
- **Safety Instrumented Systems (SIS)** - Must be identified and protected
- **Crown Jewels** - Revenue-generating units (CDU, FCC) need highest protection
- **Process Safety** - Vulnerabilities in critical units can cause safety incidents
- **Air-Gapped Systems** - Some systems intentionally offline (acceptable blind spots)
- **Legacy Equipment** - Old PLCs/DCS may not support modern security controls

---

## Next Steps for Frontend Display

1. **Remove "Network Coverage 0%"** - Confusing and redundant
2. **Add Security Management section** with managed/patched percentages
3. **Add Security Controls section** with encryption/auth/access control
4. **Add Vulnerability Dashboard** with CVE counts and critical asset exposure
5. **Simplify file inputs** - Only require Engineering + OT Discovery (make others optional)
6. **Color code metrics:**
   - 🟢 Green: >80% (Good)
   - 🟡 Yellow: 60-80% (Acceptable)
   - 🔴 Red: <60% (Action Required)

---

## Summary

**What Changed:**
- ✅ Added Security Management metrics (managed %, patched %)
- ✅ Added Security Controls metrics (encryption, auth, access control)
- ✅ Added Vulnerability metrics (CVEs, vulnerable assets)
- ✅ Clarified 4-step audit flow
- ❌ Network CSV is now redundant (OT Discovery has everything)

**Why This Matters:**
- CISO can show Board: "We know what we have, we can see X%, we're managing Y%, we have Z vulnerabilities"
- OT Lead can prioritize remediation: Critical unmanaged assets first
- Auditors can verify: Asset accountability, visibility, security posture, compliance gaps
- Aligns with ISA/IEC 62443, NERC CIP, API 1164 requirements

**Industry Differentiation:**
- Most tools show "what's on the network" (discovery only)
- OT Assurance Twin shows the FULL picture: inventory → discovery → management → compliance
- Perfect for audit readiness and board reporting

