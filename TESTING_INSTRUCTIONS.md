# Testing the Production-Ready OT Canonizer

## ✅ What Just Changed

### Backend (API)
- ✅ Created **NEW** production API: `/api/analyze-oil-gas-v2`
- ✅ Flexible matching: IP address → hostname → MAC address (no forced tag_id)
- ✅ Removed ALL subjective criticality (crown jewels, risk scores, critical paths)
- ✅ Added demo mode toggle (off by default)
- ✅ Returns suggested matches for manual enrichment

### Frontend (UI)
- ✅ Switched to production API endpoint
- ✅ Removed crown jewels, critical path, risk score displays
- ✅ Added objective metrics only (process units, device types, manufacturers)
- ✅ Added manual enrichment UI (suggested matches)
- ✅ Cleaned up KPIs to focus on coverage and security posture

### Sample Data
- ✅ Created realistic "clean" scenario (good coverage ~93%)
- ✅ Created realistic "broken" scenario (poor coverage ~32%)
- ✅ OT discovery data has NO tag_id (realistic constraint)

---

## 🧪 Test Plan

### Test 1: Clean Scenario (Good Coverage)

**Expected Result:** ~93% coverage, good security

1. Open http://localhost:5173 (or your dev server URL)
2. Select "Oil & Gas Refineries" industry
3. Upload files:
   - **Engineering Baseline:** `public/samples/demo/oil-gas/engineering_baseline_clean.csv`
   - **OT Discovery Tool Data:** `public/samples/demo/oil-gas/ot_discovery_clean.csv`
4. Click "Canonize Assets"

**Expected Results:**
- ✅ Total Assets: 15
- ✅ Discovery Coverage: ~93% (14/15 matched by IP/hostname)
- ✅ Matched Assets: 14
- ✅ Blind Spots: 1 (one unmatched asset)
- ✅ Security Managed: 60-70% (varies by data)
- ✅ Patched: 60-70%
- ✅ NO crown jewels, risk scores, or subjective criticality displayed
- ✅ Process Unit Distribution table shows 3 units
- ✅ Device Type Distribution shows PLCs, HMIs, etc.
- ✅ Manufacturer Distribution shows Siemens, Allen Bradley, etc.

---

### Test 2: Broken Scenario (Poor Coverage, Many Blind Spots)

**Expected Result:** ~32% coverage, vulnerabilities

1. Refresh the page
2. Upload files:
   - **Engineering Baseline:** `public/samples/demo/oil-gas/engineering_baseline_broken.csv`
   - **OT Discovery Tool Data:** `public/samples/demo/oil-gas/ot_discovery_broken.csv`
3. Click "Canonize Assets"

**Expected Results:**
- ✅ Total Assets: 28
- ✅ Discovery Coverage: ~32% (9/28 matched)
- ✅ Matched Assets: 9
- ✅ Blind Spots: 19 (many unmatched assets - realistic problem!)
- ✅ Orphan Assets: 2 (discovered but not in engineering baseline)
- ✅ Security Managed: 20-40% (poor patching)
- ✅ Vulnerabilities: Multiple CVEs shown
- ✅ Suggested Matches section appears (yellow box)
- ✅ Manual enrichment suggestions for unmatched assets

**Key Insight:**
This scenario shows a **realistic problem** - many assets in the engineering baseline that the OT discovery tool couldn't find. This is a real blind spot that needs investigation.

---

## 📊 What You Should See (Screenshots Guide)

### Main KPIs (Top Section)
```
┌─────────────────────────────────────────────────────────────┐
│ Total Assets | Discovery Coverage | Matched | Blind Spots  │
│     15       |        93%         |   14    |      1       │
└─────────────────────────────────────────────────────────────┘
```

### OT Discovery Analysis (Blue Card)
- Step 1: Asset Inventory & Discovery Coverage
  - Engineering Assets: 15
  - Discovered Assets: 15
  - Matched Assets: 14
  - Discovery Coverage: 93%
  - Blind Spots: 1

- Step 2: Security Management Coverage (only if data present)
  - Managed by Security Tools: X%
  - Current Security Patches: X%
  - Encryption Enabled: X%
  - Authentication Required: X%

- Step 3: Vulnerability Posture (only if vulnerabilities exist)
  - Total Vulnerabilities: X
  - Total CVEs: X

### Process Unit Distribution (New!)
```
┌───────────────────────────────────────────────────┐
│ Process Unit                         | Assets | % │
├───────────────────────────────────────────────────┤
│ Crude Distillation Unit (CDU)       |   6    | 40%│
│ Fluid Catalytic Cracking (FCC)      |   5    | 33%│
│ Hydrocracking Unit (HCU)            |   4    | 27%│
└───────────────────────────────────────────────────┘
```

### Device Type Distribution (New!)
```
┌───────────────────────────────────────────────────┐
│ Device Type            | Assets | %                │
├───────────────────────────────────────────────────┤
│ Smart_Transmitter      |   5    | 33%              │
│ PLC                    |   4    | 27%              │
│ HMI                    |   3    | 20%              │
│ Safety_System          |   2    | 13%              │
│ VFD                    |   1    | 7%               │
└───────────────────────────────────────────────────┘
```

### Suggested Matches (Yellow Card - Broken Scenario Only)
```
┌─────────────────────────────────────────────────────────────┐
│ 🔗 Suggested Asset Matches (Manual Review Required)        │
├─────────────────────────────────────────────────────────────┤
│ Engineering Asset: XMTR-CDU-P002                           │
│ Crude Distillation Unit (CDU) • Smart_Transmitter         │
│                                                             │
│ Potential Matches:                                         │
│   → 192.168.50.100 (UNKNOWN-DEVICE)                       │
│      60% confidence • Similar device type and location     │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Success Criteria

### Must Have:
- [ ] NO "Crown Jewels" section
- [ ] NO "Risk Score" columns
- [ ] NO "Critical Path" indicators
- [ ] NO subjective "Criticality" (unless from objective standard like ASIL)
- [ ] Coverage percentage shows realistic values (60-95%)
- [ ] Process Unit Distribution visible
- [ ] Device Type Distribution visible
- [ ] Manufacturer Distribution visible
- [ ] Suggested Matches visible in broken scenario

### Nice to Have:
- [ ] Clean UI with objective metrics only
- [ ] Clear 3-step analysis (Inventory → Security → Vulnerabilities)
- [ ] Conditional display (hide sections if no data)
- [ ] Professional color coding (green = good, red = needs attention)

---

## 🐛 Common Issues & Fixes

### Issue 1: "This API route is not yet implemented"
**Cause:** Old API endpoint still being called  
**Fix:** Check line 42 in `src/OilGasCanonizer.jsx` - should be `/api/analyze-oil-gas-v2`

### Issue 2: "Cannot read property 'processUnitDistribution' of undefined"
**Cause:** API response structure changed  
**Fix:** V2 API returns different structure. Check that frontend expects `result.processUnitDistribution` not `result.plantMapping.units`

### Issue 3: Coverage shows 0% or 100%
**Cause:** Demo mode might be ON  
**Fix:** Ensure `demoMode: false` (or omit) in API payload. Production should NOT force coverage.

### Issue 4: Tag IDs don't match
**Cause:** Expected! OT discovery data doesn't have tag_id by design  
**Expected:** Matching happens by IP/hostname/MAC. This is realistic.

---

## 🎯 Client Demo Script

### Opening:
> "We've built a production-ready OT Canonizer that works with real-world discovery tool data. Let me show you two scenarios..."

### Clean Scenario Demo:
> "This refinery has good OT visibility. We see 93% coverage - 14 out of 15 assets discovered. Notice we're matching by IP address and hostname, not tag IDs, because real OT tools like Claroty or Nozomi don't provide tag IDs. The one blind spot is documented and likely an air-gapped safety system."

### Broken Scenario Demo:
> "This refinery has significant blind spots. Only 32% coverage - 9 out of 28 assets found. The OT discovery tool can't see 19 assets. Are they offline? Air-gapped? Misconfigured? This is where the Canonizer adds value - it identifies these gaps. We also have 2 orphan assets - devices on the network that aren't in the engineering baseline. Potential shadow IT."

### Manual Enrichment:
> "For unmatched assets, the Canonizer provides suggested matches based on device type and location. Your OT engineers can review these and manually approve them. This hybrid approach - automated + manual - gives you confidence in the results."

### Objective Metrics:
> "Notice we removed subjective labels like 'crown jewel' or 'risk score.' Instead, we show objective data: process units, device types, manufacturers. YOU define what's critical based on YOUR business context and compliance requirements."

---

## 📞 Next Steps After Testing

### If Tests Pass:
1. ✅ Commit changes to Git
2. ✅ Push to GitHub
3. ✅ Deploy to Vercel (automatic)
4. ✅ Test production URL
5. ✅ Share with client

### If Tests Fail:
1. Check browser console for errors
2. Verify API endpoint (should be `/api/analyze-oil-gas-v2`)
3. Check network tab - is API returning data?
4. Review `CLIENT_READY_GUIDE.md` for troubleshooting

---

**Ready to test? Open http://localhost:5173 and try the clean scenario first!**

