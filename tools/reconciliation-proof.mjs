// Proves lib/reconciliation.js is a generic primitive, not an OT-specific hack:
// the exact same function reconciles two completely unrelated domain pairs,
// with zero code changes - only config and data differ.
import { reconcile } from '../lib/reconciliation.js'

function report(title, result) {
  console.log(`\n=== ${title} ===`)
  console.log(`${result.stats.ownerA} has ${result.stats.totalA} records, ${result.stats.ownerB} has ${result.stats.totalB}`)
  console.log(`VERIFIED (matched, facts agree): ${result.stats.verifiedCount}`)
  console.log(`DISPUTED (matched, facts disagree): ${result.stats.disputedCount}`)
  result.matched.filter(m => m.status === 'disputed').forEach(m =>
    console.log(`  - disputed: ${JSON.stringify(m.disputes)}`))
  console.log(`UNCORROBORATED (in ${result.stats.ownerA}, not ${result.stats.ownerB}): ${result.blindSpots.length}`)
  result.blindSpots.forEach(b => console.log(`  - ${JSON.stringify(b)}`))
  console.log(`UNCLAIMED (in ${result.stats.ownerB}, not ${result.stats.ownerA}): ${result.orphans.length}`)
  result.orphans.forEach(o => console.log(`  - ${JSON.stringify(o)}`))
}

// --- Domain 1: OT plant (what the existing app already does) ---
const engineeringBaseline = [
  { tag_id: 'P-101A', ip_address: '10.0.1.5', device_type: 'Pump', manufacturer: 'Siemens' },
  { tag_id: 'P-101B', ip_address: '10.0.1.6', device_type: 'Pump', manufacturer: 'Emerson' },
  { tag_id: 'FT-204', ip_address: null, device_type: 'Flow Transmitter', manufacturer: 'Rosemount' }
]
const otDiscovery = [
  { tag_id: 'P-101A', ip_address: '10.0.1.5', manufacturer: 'Siemens-Legacy' }, // matches, but manufacturer disagrees
  { tag_id: 'DIFFERENT-TAG', ip_address: '10.0.1.6', device_type: 'Pump', manufacturer: 'Emerson' },
  { tag_id: 'SW-01', ip_address: '10.0.9.1' }
]
report(
  'OT: Engineering Baseline vs. OT Discovery',
  reconcile(engineeringBaseline, otDiscovery, {
    identityKeys: ['tag_id', 'ip_address'],
    fuzzyFields: [['device_type', 'manufacturer']],
    compareFields: ['manufacturer'],
    ownerA: 'Engineering',
    ownerB: 'OT Discovery'
  })
)

// --- Domain 2: HR roster vs. IT directory service (a completely different silo pair) ---
const hrRoster = [
  { employee_id: 'E1001', email: 'j.smith@corp.com', department: 'Finance', last_name: 'Smith' },
  { employee_id: 'E1002', email: 'a.chen@corp.com', department: 'Engineering', last_name: 'Chen' },
  { employee_id: 'E1003', email: 'r.patel@corp.com', department: 'Security', last_name: 'Patel' }
]
const directoryService = [
  { employee_id: 'E1001', email: 'j.smith@corp.com' },
  { employee_id: 'E9999', email: 'a.chen@corp.com', department: 'Engineering', last_name: 'Chen' }, // HR ID drifted, name/dept still match
  { employee_id: 'CONTRACTOR-42', email: 'temp.contractor@corp.com' } // account with no HR record at all
]
report(
  'IT/HR: HR Roster vs. Directory Service',
  reconcile(hrRoster, directoryService, {
    identityKeys: ['employee_id', 'email'],
    fuzzyFields: [['last_name', 'department']],
    compareFields: ['department'],
    ownerA: 'HR Roster',
    ownerB: 'Directory Service'
  })
)
