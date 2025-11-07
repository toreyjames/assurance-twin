# 📊 Sample Data Guide - Realistic Scale

## 🎯 Three Dataset Sizes

We provide three realistic sample datasets that match actual refinery scales:

⚠️ **For Live Demos:** Use **Demo (500)** or **Medium (8,000)** datasets. The Enterprise dataset may exceed Vercel upload limits.

---

## 1️⃣ **Quick Demo (500 assets)**

**Use case:** Fast demos, testing, laptop-friendly  
**Processing time:** <5 seconds  
**Scenario:** Small single-site refinery

### **Files:**
```
engineering_baseline_demo.csv    (500 assets)
ot_discovery_demo.csv            (60 devices discovered)
```

### **Statistics:**
- **Total Assets:** 500
- **Tier 1 (Critical PLCs/DCS/HMI):** 25 (5%)
- **Tier 2 (Smart/Networkable):** 150 (30%)
- **Tier 3 (Passive/Analog):** 325 (65%)
- **Discovered:** 60 devices (71% of networkable with IPs)
- **Coverage:** ~35% overall (realistic - most analog devices have no IP)
- **Orphans:** ~5 mystery devices
- **Plants:** 1 (Gulf Coast Refinery)

### **Best for:**
- ✅ Quick capability demos
- ✅ Testing new features
- ✅ Sales calls (fast results)
- ✅ Training sessions

---

## 2️⃣ **Medium Refinery (8,000 assets)**

**Use case:** Realistic client scenarios, standard demos  
**Processing time:** 10-15 seconds  
**Scenario:** Medium 150,000 bpd refinery across 2 sites

### **Files:**
```
engineering_baseline_medium.csv  (8,000 assets)
ot_discovery_medium.csv          (897 devices discovered)
```

### **Statistics:**
- **Total Assets:** 8,000
- **Tier 1 (Critical PLCs/DCS/HMI):** 400 (5%)
- **Tier 2 (Smart/Networkable):** 2,400 (30%)
- **Tier 3 (Passive/Analog):** 5,200 (65%)
- **Discovered:** 897 devices (72% of networkable with IPs)
- **Coverage:** ~35% overall
- **Orphans:** ~72 mystery devices (shadow IT, contractors)
- **Plants:** 2 (Gulf Coast + Midwest)

### **Breakdown by Process Unit:**
```
Crude Distillation Unit (CDU):    ~1,600 assets
Fluid Catalytic Cracking (FCC):   ~1,200 assets
Hydrocracker (HCU):                ~1,000 assets
Reformer:                          ~900 assets
Alkylation:                        ~800 assets
Coker Unit:                        ~700 assets
Utilities:                         ~1,200 assets
Tank Farm:                         ~400 assets
Control Room:                      ~200 assets
```

### **Best for:**
- ✅ Standard client demos
- ✅ Realistic scenarios
- ✅ Training CISO conversations
- ✅ Proof of concept
- ✅ **Most common use case**

---

## 3️⃣ **Large Enterprise (25,000 assets)**

**Use case:** Enterprise sales, stress testing, impressive scale  
**Processing time:** 30-45 seconds  
**Scenario:** Large 400,000+ bpd enterprise across 3 refineries

⚠️ **Note:** This dataset may exceed Vercel's serverless function limits (413 error). Use the Medium dataset for demos, or download and run locally for enterprise-scale testing.

### **Files:**
```
engineering_baseline_enterprise.csv  (25,000 assets)
ot_discovery_enterprise.csv          (2,743 devices discovered)
```

### **Statistics:**
- **Total Assets:** 25,000
- **Tier 1 (Critical PLCs/DCS/HMI):** 1,250 (5%)
- **Tier 2 (Smart/Networkable):** 7,500 (30%)
- **Tier 3 (Passive/Analog):** 16,250 (65%)
- **Discovered:** 2,743 devices (72% of networkable with IPs)
- **Coverage:** ~35% overall
- **Orphans:** ~220 mystery devices
- **Plants:** 3 (Gulf Coast + Midwest + West Coast)

### **Enterprise Complexity:**
```
Multiple Sites: 3 refineries
Process Units: 36 total (12 per site)
Critical Assets: 1,250 PLCs/DCS/HMI systems
Smart Devices: 7,500 networked instruments
Analog Devices: 16,250 4-20mA transmitters/valves
Management Challenge: Coordinating security across 3 sites
```

### **Best for:**
- ✅ Enterprise-level sales
- ✅ Multi-site scenarios
- ✅ Stress testing performance
- ✅ Impressive scale demonstrations
- ✅ Board-level presentations

---

## 📊 **Why These Numbers?**

### **Realistic Tier Distribution:**

Based on actual refinery data (modern refineries 2024):
- **5% Tier 1:** PLCs, DCS, HMI, SCADA (programmable, must secure)
- **30% Tier 2:** Smart transmitters, IP devices (networkable, should secure)
- **65% Tier 3:** 4-20mA transmitters, analog valves (inventory only)

### **Realistic Coverage:**

Why only 35% overall coverage?
```
Engineering has: 8,000 total assets
├─ 2,800 networkable (Tier 1 + Tier 2)
│  ├─ 1,250 have IP addresses (45%) ← incomplete engineering data!
│  └─ 897 discovered (72% of those with IPs)
└─ 5,200 passive (no IP/MAC, can't be discovered)

Result: 897 / 8,000 = 11.2% discovered
But: 897 / 1,250 = 72% of networkable with IPs ← GOOD!
```

**This is realistic!** Most engineering baselines lack IP addresses for many devices.

---

## 🎭 **Realistic Characteristics**

### **All datasets include:**

**1. Incomplete Data:**
- ✅ Only 40-60% of assets have IP addresses
- ✅ Only 35-50% have hostnames
- ✅ 15-20% show "Unknown" manufacturer
- ✅ 12-18% show "Unknown" device type

**2. Messy Naming:**
- ✅ Mix: `PLC-CDU-001` (structured) + `DEVICE-192-168-10-99` (auto-named)
- ✅ Some legacy: `XMTR-12345`, `DEV-OLD-1`

**3. Security Gaps:**
- ✅ Tier 1: 60-80% managed (gap to fix!)
- ✅ Tier 2: 35-50% managed (bigger gap)
- ✅ Vulnerabilities: 0-25 per device (realistic range)
- ✅ Firmware chaos: v1.x to v21.x, many "Unknown"

**4. Orphan Devices:**
- ✅ 8-12% of discovered devices not in engineering
- ✅ Includes: contractor laptops, test equipment, shadow IT
- ✅ Some with 10-25 vulnerabilities (risk!)

**5. Stale Data:**
- ✅ Last seen: 0-60 days ago
- ✅ Some devices haven't been seen in weeks (offline? removed?)

---

## 🚀 **How to Use**

### **Quick Demo:**
```
Upload:
- engineering_baseline_demo.csv
- ot_discovery_demo.csv

Time: <5 seconds
Result: Fast, impressive, perfect for calls
```

### **Standard Client Demo:**
```
Upload:
- engineering_baseline_medium.csv
- ot_discovery_medium.csv

Time: 10-15 seconds
Result: Realistic scale, credible numbers
```

### **Enterprise Sales:**
```
Upload:
- engineering_baseline_enterprise.csv
- ot_discovery_enterprise.csv

Time: 30-45 seconds
Result: Impressive scale, multi-site complexity
```

---

## 💡 **Demo Tips**

### **Start with Medium (8,000 assets):**

**Why?** Most realistic for typical refinery conversations.

**Script:**
> "This is data from a medium-size 150,000 barrel-per-day refinery 
> with 8,000 total assets. Let's see what we find..."

**Then point out:**
- ✅ "Only 35% overall coverage - but that's expected! 65% are analog 4-20mA devices with no network connectivity"
- ✅ "72% of networkable assets discovered - that's actually good!"
- ✅ "Found 72 orphan devices not in your asset register - possible shadow IT"
- ✅ "400 critical Tier 1 assets - only 64% secured - here's your gap"

### **Use Enterprise for Wow Factor:**

**When?** Board presentations, executive briefings, competitive situations

**Script:**
> "This is a large integrated refinery complex - 25,000 assets across 
> 3 sites. This is enterprise-scale asset management..."

---

## 📈 **Expected Results**

### **Medium Refinery (8,000 assets):**

```
🛡️ Complete Asset Inventory & Security Posture

Total Asset Inventory: 8,000        ✅ Complete visibility
Networkable Assets: 2,800           ⚠️ Require security
Security Coverage: ~45%             ⚠️ Gap to address
Passive/Analog: 5,200               ℹ️ Inventory only

🔴 Tier 1: 400 critical assets
   Secured: ~256 (64%) ⚠️ Gap!

🟡 Tier 2: 2,400 smart devices
   Secured: ~960 (40%) ⚠️ Bigger gap!

🔵 Tier 3: 5,200 passive devices
   Inventoried: ~416 (8%)
   ✅ No security needed

🧠 AI Insights:
   - 🔴 CRITICAL: 72 orphan devices found (shadow IT)
   - 🔴 CRITICAL: Only 64% Tier 1 secured
   - 🟡 HIGH: 45% missing IP addresses in engineering baseline
```

---

## 🎯 **Key Messages**

### **These datasets are realistic because:**

1. **Scale matches actual refineries**
   - Small: 3-5K assets
   - Medium: 8-15K assets
   - Large: 25-50K assets

2. **Tier distribution matches reality**
   - 5% critical programmable
   - 30% smart/networkable
   - 65% passive/analog

3. **Coverage is believable**
   - 70-75% of networkable assets discovered
   - Overall ~35% due to passive devices
   - Gaps in engineering data (no IPs)

4. **Problems are actionable**
   - Specific orphan devices to investigate
   - Clear security gaps to address
   - Data quality issues to fix

**Not sanitized. Not perfect. REAL.** 🎯

---

## 📂 **File Locations**

```
public/samples/demo/oil-gas/
├── engineering_baseline_demo.csv         (500 assets)
├── ot_discovery_demo.csv                 (60 devices)
├── engineering_baseline_medium.csv       (8,000 assets)
├── ot_discovery_medium.csv               (897 devices)
├── engineering_baseline_enterprise.csv   (25,000 assets)
└── ot_discovery_enterprise.csv           (2,743 devices)
```

---

## 🔧 **Regenerating Data**

If you need to regenerate with different parameters:

```bash
node tools/generate-realistic-data.mjs
```

Edit the script to adjust:
- Asset counts
- Tier distributions
- Coverage percentages
- Number of sites
- Orphan device counts

---

**Ready to demo with realistic scale!** 🚀

