/**
 * COMPLIANCE FRAMEWORK MAPPER
 * Maps OT gaps and findings to specific regulatory/standard control requirements
 * 
 * Supported frameworks:
 *   - IEC 62443 (Industrial Automation and Control Systems Security)
 *   - NIST CSF 2.0 (Cybersecurity Framework)
 *   - ISA/IEC 62443-3-3 (System Security Requirements)
 *   - NERC CIP (for utilities/power)
 *   - FDA 21 CFR Part 11 (for pharma)
 * 
 * Usage:
 *   const mapper = new ComplianceMapper('automotive')
 *   const findings = mapper.mapGaps(gaps)
 *   const summary = mapper.generateComplianceSummary(findings)
 */

// =============================================================================
// IEC 62443 CONTROL REQUIREMENTS
// =============================================================================

const IEC_62443 = {
  // Part 3-3: System security requirements and security levels
  'SR 1.1': {
    id: 'SR 1.1',
    title: 'Human user identification and authentication',
    zone: 'IAC',
    description: 'All human users shall be uniquely identified and authenticated.',
    applicableGapTypes: ['missing_function'],
    applicableDeviceTypes: ['hmi', 'workstation', 'ews'],
    severity: 'high'
  },
  'SR 1.2': {
    id: 'SR 1.2',
    title: 'Software process and device identification and authentication',
    zone: 'IAC',
    description: 'All software processes and devices shall be identified and authenticated.',
    applicableGapTypes: ['orphan', 'blind_spot'],
    applicableDeviceTypes: ['plc', 'dcs', 'rtu', 'controller'],
    severity: 'critical'
  },
  'SR 1.3': {
    id: 'SR 1.3',
    title: 'Account management',
    zone: 'IAC',
    description: 'Capability to manage all accounts by authorized users.',
    applicableGapTypes: ['missing_function'],
    applicableDeviceTypes: ['server', 'workstation', 'hmi'],
    severity: 'medium'
  },
  'SR 2.1': {
    id: 'SR 2.1',
    title: 'Authorization enforcement',
    zone: 'UC',
    description: 'Enforce assigned privileges for all human users.',
    applicableGapTypes: ['missing_function', 'insufficient_coverage'],
    applicableDeviceTypes: ['plc', 'dcs', 'hmi', 'scada'],
    severity: 'high'
  },
  'SR 2.4': {
    id: 'SR 2.4',
    title: 'Mobile code',
    zone: 'UC',
    description: 'Control of mobile code technologies.',
    applicableGapTypes: ['orphan'],
    applicableDeviceTypes: ['workstation', 'server'],
    severity: 'medium'
  },
  'SR 3.1': {
    id: 'SR 3.1',
    title: 'Communication integrity',
    zone: 'SI',
    description: 'Protect integrity of all communications.',
    applicableGapTypes: ['network_blind_spot', 'missing_function'],
    applicableDeviceTypes: ['switch', 'router', 'firewall', 'gateway'],
    severity: 'high'
  },
  'SR 3.3': {
    id: 'SR 3.3',
    title: 'Security functionality verification',
    zone: 'SI',
    description: 'Mechanisms to verify security function operation.',
    applicableGapTypes: ['no_visibility', 'low_visibility'],
    applicableDeviceTypes: ['sis', 'safety_plc', 'esd'],
    severity: 'critical'
  },
  'SR 3.5': {
    id: 'SR 3.5',
    title: 'Input validation',
    zone: 'SI',
    description: 'Validate input from all sources.',
    applicableGapTypes: ['missing_function'],
    applicableDeviceTypes: ['plc', 'dcs', 'controller'],
    severity: 'medium'
  },
  'SR 4.1': {
    id: 'SR 4.1',
    title: 'Information confidentiality',
    zone: 'DC',
    description: 'Protect confidentiality of information at rest.',
    applicableGapTypes: ['orphan', 'missing_function'],
    applicableDeviceTypes: ['historian', 'server', 'database'],
    severity: 'medium'
  },
  'SR 5.1': {
    id: 'SR 5.1',
    title: 'Network segmentation',
    zone: 'RDF',
    description: 'Segment control system networks from non-control networks.',
    applicableGapTypes: ['network_blind_spot', 'orphan'],
    applicableDeviceTypes: ['firewall', 'switch', 'router'],
    severity: 'critical'
  },
  'SR 5.2': {
    id: 'SR 5.2',
    title: 'Zone boundary protection',
    zone: 'RDF',
    description: 'Monitor and control communications at zone boundaries.',
    applicableGapTypes: ['missing_function', 'network_blind_spot'],
    applicableDeviceTypes: ['firewall', 'ids', 'gateway'],
    severity: 'high'
  },
  'SR 6.1': {
    id: 'SR 6.1',
    title: 'Audit log accessibility',
    zone: 'TRE',
    description: 'Audit logs available for authorized access.',
    applicableGapTypes: ['missing_function', 'no_visibility'],
    applicableDeviceTypes: ['historian', 'siem', 'server'],
    severity: 'high'
  },
  'SR 6.2': {
    id: 'SR 6.2',
    title: 'Continuous monitoring',
    zone: 'TRE',
    description: 'Continuously monitor all audit mechanisms.',
    applicableGapTypes: ['no_visibility', 'low_visibility', 'blind_spot'],
    applicableDeviceTypes: ['ids', 'siem', 'nms'],
    severity: 'high'
  },
  'SR 7.1': {
    id: 'SR 7.1',
    title: 'Denial of service protection',
    zone: 'RA',
    description: 'Protection against denial of service events.',
    applicableGapTypes: ['missing_function', 'no_redundancy'],
    applicableDeviceTypes: ['plc', 'dcs', 'controller', 'switch'],
    severity: 'high'
  },
  'SR 7.2': {
    id: 'SR 7.2',
    title: 'Resource management',
    zone: 'RA',
    description: 'Manage resources to support availability.',
    applicableGapTypes: ['no_redundancy', 'insufficient_coverage'],
    applicableDeviceTypes: ['plc', 'dcs', 'server'],
    severity: 'medium'
  },
  'SR 7.6': {
    id: 'SR 7.6',
    title: 'Network and security configuration settings',
    zone: 'RA',
    description: 'Correct configuration of network and security settings.',
    applicableGapTypes: ['stale_data', 'orphan'],
    applicableDeviceTypes: ['switch', 'router', 'firewall', 'plc'],
    severity: 'high'
  }
}

// =============================================================================
// NIST CSF 2.0 MAPPING
// =============================================================================

const NIST_CSF = {
  'ID.AM-1': {
    id: 'ID.AM-1',
    title: 'Physical devices and systems inventoried',
    function: 'IDENTIFY',
    category: 'Asset Management',
    applicableGapTypes: ['blind_spot', 'orphan', 'no_visibility'],
    severity: 'high'
  },
  'ID.AM-2': {
    id: 'ID.AM-2',
    title: 'Software platforms and applications inventoried',
    function: 'IDENTIFY',
    category: 'Asset Management',
    applicableGapTypes: ['blind_spot', 'stale_data'],
    severity: 'medium'
  },
  'ID.AM-3': {
    id: 'ID.AM-3',
    title: 'Organizational communication and data flows mapped',
    function: 'IDENTIFY',
    category: 'Asset Management',
    applicableGapTypes: ['network_blind_spot', 'missing_function'],
    severity: 'high'
  },
  'ID.RA-1': {
    id: 'ID.RA-1',
    title: 'Asset vulnerabilities identified and documented',
    function: 'IDENTIFY',
    category: 'Risk Assessment',
    applicableGapTypes: ['blind_spot', 'stale_data', 'no_visibility'],
    severity: 'high'
  },
  'PR.AC-1': {
    id: 'PR.AC-1',
    title: 'Identities and credentials managed for devices and users',
    function: 'PROTECT',
    category: 'Access Control',
    applicableGapTypes: ['orphan', 'missing_function'],
    severity: 'high'
  },
  'PR.AC-5': {
    id: 'PR.AC-5',
    title: 'Network integrity protected',
    function: 'PROTECT',
    category: 'Access Control',
    applicableGapTypes: ['network_blind_spot', 'orphan'],
    severity: 'critical'
  },
  'PR.DS-5': {
    id: 'PR.DS-5',
    title: 'Protections against data leaks implemented',
    function: 'PROTECT',
    category: 'Data Security',
    applicableGapTypes: ['orphan', 'missing_function'],
    severity: 'medium'
  },
  'PR.IP-1': {
    id: 'PR.IP-1',
    title: 'Baseline configuration established and maintained',
    function: 'PROTECT',
    category: 'Info Protection',
    applicableGapTypes: ['blind_spot', 'stale_data', 'orphan'],
    severity: 'high'
  },
  'PR.MA-1': {
    id: 'PR.MA-1',
    title: 'Maintenance and repair performed and logged',
    function: 'PROTECT',
    category: 'Maintenance',
    applicableGapTypes: ['stale_data'],
    severity: 'medium'
  },
  'DE.AE-1': {
    id: 'DE.AE-1',
    title: 'Baseline of network operations established',
    function: 'DETECT',
    category: 'Anomalies & Events',
    applicableGapTypes: ['no_visibility', 'low_visibility', 'network_blind_spot'],
    severity: 'high'
  },
  'DE.CM-1': {
    id: 'DE.CM-1',
    title: 'Network monitored to detect cybersecurity events',
    function: 'DETECT',
    category: 'Continuous Monitoring',
    applicableGapTypes: ['no_visibility', 'low_visibility', 'blind_spot'],
    severity: 'critical'
  },
  'DE.CM-7': {
    id: 'DE.CM-7',
    title: 'Monitoring for unauthorized personnel, connections, devices',
    function: 'DETECT',
    category: 'Continuous Monitoring',
    applicableGapTypes: ['orphan', 'network_blind_spot'],
    severity: 'high'
  },
  'RS.AN-1': {
    id: 'RS.AN-1',
    title: 'Notifications from detection systems investigated',
    function: 'RESPOND',
    category: 'Analysis',
    applicableGapTypes: ['missing_function', 'no_visibility'],
    severity: 'high'
  },
  'RC.RP-1': {
    id: 'RC.RP-1',
    title: 'Recovery plan executed during or after an incident',
    function: 'RECOVER',
    category: 'Recovery Planning',
    applicableGapTypes: ['no_redundancy', 'missing_function'],
    severity: 'high'
  }
}

// =============================================================================
// GAP TYPE → COMPLIANCE CONTROL MAPPING RULES
// =============================================================================

const GAP_COMPLIANCE_RULES = [
  // Blind spots → asset inventory + continuous monitoring requirements
  {
    gapType: 'blind_spot',
    iec62443: ['SR 1.2', 'SR 6.2'],
    nistCsf: ['ID.AM-1', 'ID.RA-1', 'DE.CM-1', 'PR.IP-1'],
    finding: 'Documented asset not visible on network — violates inventory completeness and continuous monitoring requirements'
  },
  // Orphans → unauthorized device detection
  {
    gapType: 'orphan',
    iec62443: ['SR 1.2', 'SR 5.1'],
    nistCsf: ['ID.AM-1', 'DE.CM-7', 'PR.AC-5'],
    finding: 'Undocumented device on OT network — violates access control and unauthorized device monitoring requirements'
  },
  // Missing function → system completeness
  {
    gapType: 'missing_function',
    iec62443: ['SR 2.1', 'SR 3.3', 'SR 7.1'],
    nistCsf: ['ID.AM-3', 'PR.AC-1', 'RS.AN-1'],
    finding: 'Expected control function missing — system does not meet functional completeness requirements'
  },
  // Insufficient coverage → redundancy/availability
  {
    gapType: 'insufficient_coverage',
    iec62443: ['SR 7.2'],
    nistCsf: ['ID.AM-1'],
    finding: 'Fewer devices than expected for function — potential coverage or redundancy gap'
  },
  // No redundancy → availability
  {
    gapType: 'no_redundancy',
    iec62443: ['SR 7.1', 'SR 7.2'],
    nistCsf: ['RC.RP-1'],
    finding: 'Single point of failure for critical function — violates availability and recovery requirements'
  },
  // No visibility → monitoring blind spot
  {
    gapType: 'no_visibility',
    iec62443: ['SR 3.3', 'SR 6.1', 'SR 6.2'],
    nistCsf: ['DE.AE-1', 'DE.CM-1'],
    finding: 'Process unit has no discovered devices — complete monitoring blind spot'
  },
  // Low visibility → insufficient monitoring
  {
    gapType: 'low_visibility',
    iec62443: ['SR 6.2'],
    nistCsf: ['DE.AE-1', 'DE.CM-1'],
    finding: 'Process unit has very few discovered devices — monitoring coverage insufficient'
  },
  // Network blind spot → segmentation gap
  {
    gapType: 'network_blind_spot',
    iec62443: ['SR 3.1', 'SR 5.1', 'SR 5.2'],
    nistCsf: ['PR.AC-5', 'DE.AE-1', 'DE.CM-7'],
    finding: 'Network segment with no monitoring coverage — potential lateral movement path'
  },
  // Stale data → maintenance gap
  {
    gapType: 'stale_data',
    iec62443: ['SR 7.6'],
    nistCsf: ['PR.IP-1', 'PR.MA-1', 'ID.RA-1'],
    finding: 'Asset data significantly outdated — configuration baseline may not reflect reality'
  }
]

// =============================================================================
// COMPLIANCE MAPPER CLASS
// =============================================================================

export class ComplianceMapper {
  constructor(industry = 'automotive') {
    this.industry = industry
  }

  /**
   * Map an array of gaps to compliance findings
   * @param {Array} gaps - gaps from gap-analyzer.js
   * @returns {Array} compliance findings with control references
   */
  mapGaps(gaps) {
    if (!gaps || gaps.length === 0) return []

    const findings = []

    for (const gap of gaps) {
      const gapType = gap.type
      const rules = GAP_COMPLIANCE_RULES.filter(r => r.gapType === gapType)

      for (const rule of rules) {
        const iecControls = rule.iec62443.map(id => IEC_62443[id]).filter(Boolean)
        const nistControls = rule.nistCsf.map(id => NIST_CSF[id]).filter(Boolean)

        findings.push({
          // Source gap
          gapId: gap.tagId || gap.unit || gap.function || 'unknown',
          gapType: gap.type,
          gapSeverity: gap.severity,
          unit: gap.unit || '',
          deviceType: gap.deviceType || '',

          // Compliance mapping
          finding: rule.finding,
          iec62443: iecControls.map(c => ({
            id: c.id,
            title: c.title,
            zone: c.zone,
            severity: c.severity
          })),
          nistCsf: nistControls.map(c => ({
            id: c.id,
            title: c.title,
            function: c.function,
            category: c.category,
            severity: c.severity
          })),

          // Recommendation
          recommendation: gap.recommendation || 'Review and remediate',
          
          // Computed severity (highest of gap + controls)
          complianceSeverity: this._computeSeverity(gap, iecControls, nistControls)
        })
      }
    }

    return findings
  }

  /**
   * Generate compliance summary statistics
   */
  generateComplianceSummary(findings) {
    // IEC 62443 control coverage
    const iecControlsHit = new Set()
    const nistControlsHit = new Set()

    findings.forEach(f => {
      f.iec62443.forEach(c => iecControlsHit.add(c.id))
      f.nistCsf.forEach(c => nistControlsHit.add(c.id))
    })

    // Severity breakdown
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
    findings.forEach(f => {
      bySeverity[f.complianceSeverity] = (bySeverity[f.complianceSeverity] || 0) + 1
    })

    // By framework function (NIST CSF)
    const byFunction = { IDENTIFY: 0, PROTECT: 0, DETECT: 0, RESPOND: 0, RECOVER: 0 }
    findings.forEach(f => {
      f.nistCsf.forEach(c => {
        byFunction[c.function] = (byFunction[c.function] || 0) + 1
      })
    })

    // By IEC zone
    const byZone = {}
    findings.forEach(f => {
      f.iec62443.forEach(c => {
        byZone[c.zone] = (byZone[c.zone] || 0) + 1
      })
    })

    // Top impacted controls
    const controlCounts = {}
    findings.forEach(f => {
      f.iec62443.forEach(c => {
        controlCounts[c.id] = (controlCounts[c.id] || 0) + 1
      })
      f.nistCsf.forEach(c => {
        controlCounts[c.id] = (controlCounts[c.id] || 0) + 1
      })
    })
    const topControls = Object.entries(controlCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, count]) => ({
        id,
        count,
        title: IEC_62443[id]?.title || NIST_CSF[id]?.title || id
      }))

    return {
      totalFindings: findings.length,
      bySeverity,
      byFunction,
      byZone,
      iecControlsImpacted: iecControlsHit.size,
      iecControlsTotal: Object.keys(IEC_62443).length,
      nistControlsImpacted: nistControlsHit.size,
      nistControlsTotal: Object.keys(NIST_CSF).length,
      topControls,
      complianceScore: this._computeComplianceScore(findings, iecControlsHit, nistControlsHit)
    }
  }

  /**
   * Generate per-unit compliance posture
   */
  generateUnitCompliance(findings) {
    const units = {}
    findings.forEach(f => {
      const unit = f.unit || 'Unknown'
      if (!units[unit]) {
        units[unit] = { unit, findings: [], critical: 0, high: 0, medium: 0, low: 0, controls: new Set() }
      }
      units[unit].findings.push(f)
      units[unit][f.complianceSeverity] = (units[unit][f.complianceSeverity] || 0) + 1
      f.iec62443.forEach(c => units[unit].controls.add(c.id))
      f.nistCsf.forEach(c => units[unit].controls.add(c.id))
    })

    return Object.values(units).map(u => ({
      ...u,
      controls: [...u.controls],
      totalFindings: u.findings.length,
      riskScore: u.critical * 10 + u.high * 5 + u.medium * 2 + u.low * 1
    })).sort((a, b) => b.riskScore - a.riskScore)
  }

  // --- Private helpers ---

  _computeSeverity(gap, iecControls, nistControls) {
    const severities = [
      gap.severity,
      ...iecControls.map(c => c.severity),
      ...nistControls.map(c => c.severity)
    ]
    if (severities.includes('critical')) return 'critical'
    if (severities.includes('high')) return 'high'
    if (severities.includes('medium')) return 'medium'
    if (severities.includes('low')) return 'low'
    return 'info'
  }

  _computeComplianceScore(findings, iecHit, nistHit) {
    // Score = percentage of controls NOT impacted (higher = better)
    const totalControls = Object.keys(IEC_62443).length + Object.keys(NIST_CSF).length
    const impacted = iecHit.size + nistHit.size
    const clean = totalControls - impacted
    return Math.round((clean / totalControls) * 100)
  }
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

export { IEC_62443, NIST_CSF, GAP_COMPLIANCE_RULES }

export default ComplianceMapper
