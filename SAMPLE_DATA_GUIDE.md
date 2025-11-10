# 📊 Sample Data Guide - REALISTIC Refinery Scale

## 🎯 Three Dataset Sizes

We provide three datasets that match ACTUAL refinery scales:

✅ **For Your Deloitte Demo:** Use **Medium (6,500 assets)** - this is a realistic 150,000 bpd refinery!  
🧪 **For Testing:** Use **Demo (500 assets)** for quick validation.  
❌ **Enterprise (25,000):** Too large for Vercel - local testing only.

---

## 1️⃣ **Quick Demo (500 assets)** ← 🧪 FOR TESTING ONLY

**Use case:** Quick validation, testing changes  
**Processing time:** 5 seconds  
**Scenario:** Small single-unit test  
**File sizes:** 37 KB + 8 KB = **45 KB total** ✅

### **Files:**
```
engineering_baseline_demo.csv  (500 assets)
ot_discovery_demo.csv          (54 devices discovered, ~11% coverage)
```

### **Stats:**
- **Total Assets:** 500
- **Networkable:** ~175 (35%)
- **Discovered & Secured:** ~27 (15% of networkable)
- **Passive/Analog:** ~325 (65%)

### **Why use this:**
- ✅ Fast validation (< 5 seconds)
- ✅ Good for testing changes
- ❌ Too small for impressive demos

---

## 2️⃣ **Medium Refinery (6,500 assets)** ← ✅ **USE THIS FOR YOUR DEMO!**

**Use case:** Client demos, All Hands presentations, realistic scale  
**Processing time:** 15-20 seconds  
**Scenario:** **REALISTIC 150,000 bpd mid-sized refinery**  
**File sizes:** 480 KB + 97 KB = **577 KB total** ✅

### **Files:**
```
engineering_baseline_medium.csv  (6,500 assets)
ot_discovery_medium.csv          (676 devices discovered, ~29% coverage)
```

### **Stats:**
- **Total Assets:** 6,500 (REALISTIC refinery scale!)
- **Networkable:** ~2,275 (35%)
- **Tier 1 Critical:** ~325 (5%) - PLCs, DCS, HMIs, SCADA
- **Tier 2 Smart:** ~1,950 (30%) - Smart transmitters, analyzers, VFDs
- **Tier 3 Passive:** ~4,225 (65%) - Analog instruments, valves, sensors
- **Discovered & Secured:** ~340 (15% of networkable - realistic gap!)
- **Blind Spots:** ~1,935 networkable devices NOT discovered (85%)

### **Process Units (12):**
- Crude Distillation Unit (CDU)
- Fluid Catalytic Cracking (FCC)
- Hydrocracker
- Reformer
- Alkylation
- Coker Unit
- Hydrotreater
- Isomerization
- Utilities
- Tank Farm
- Loading
- Control Room

### **Quality Issues (realistic & messy):**
- ⚠️ 8% missing manufacturer info
- ⚠️ 12% unknown/generic devices
- ⚠️ 15% devices without IP addresses
- ⚠️ 60+ orphan discovered devices (no matching tag_id)
- ⚠️ 85% of networkable devices NOT discovered (blind spots!)
- ⚠️ Security gaps in critical assets

### **Why use this:**
- ✅ **REALISTIC refinery scale** - people will believe it
- ✅ Multiple process units (12 areas)
- ✅ Shows REAL security gaps (85% blind spots)
- ✅ Enough data to show meaningful patterns
- ✅ **Perfect for executive demos**
- ✅ **Fits within Vercel limits!**
- ✅ **THIS IS WHAT YOU WANT FOR DELOITTE ALL HANDS** 🎯

---

## 3️⃣ **Large Enterprise (25,000 assets)**

**Use case:** Enterprise sales, multi-site complexity, stress testing  
**Processing time:** 30-45 seconds  
**Scenario:** Large 400,000+ bpd enterprise across 3 refineries  
**File sizes:** 1.8 MB + 388 KB = **2.2 MB total** ❌

⚠️ **Note:** This dataset **WILL FAIL on Vercel** (413 error). Use Medium for hosted demos. Download and run locally for enterprise-scale testing.

### **Files:**
```
engineering_baseline_enterprise.csv  (25,000 assets)
ot_discovery_enterprise.csv          (2,700 devices discovered)
```

### **Stats:**
- **Total Assets:** 25,000
- **3 Sites:** Gulf Coast, Midwest, West Coast refineries
- **Networkable:** ~8,750 (35%)
- **Discovered:** ~2,700 (31% coverage)
- **Passive/Analog:** ~16,250 (65%)

### **Why use this:**
- ✅ Enterprise-level credibility
- ✅ Multi-site complexity
- ❌ **Too large for Vercel - local only!**

---

## 🎯 Demo Strategy for Deloitte All Hands

### **What to Do:**

1. **Upload the Medium dataset** (6,500 assets):
   - `engineering_baseline_medium.csv`
   - `ot_discovery_medium.csv`

2. **Walk through the 3-section narrative:**
   - **Complete Asset Inventory:** Show 6,500 total assets, realistic tier breakdown
   - **Plant Intelligence:** 12 process units, device types, manufacturers
   - **Top 3 Actions:** Security gaps, blind spots, orphan devices

3. **Key talking points:**
   - "This is a realistic 150,000 barrel-per-day refinery"
   - "6,500 assets across 12 process units"
   - "Only 15% of networkable devices are managed - that's a $10M+ security gap"
   - "85% blind spots mean we don't even know what's on the network"
   - "340 devices secured out of 2,275 that need it"

4. **What makes it credible:**
   - ✅ Realistic asset count for mid-sized refinery
   - ✅ Messy data (missing fields, unknowns, orphans)
   - ✅ Real process units (CDU, FCC, Hydrocracker, etc.)
   - ✅ Realistic security gaps (85% blind spots)
   - ✅ Multi-tier device classification

---

## 📂 File Locations

All sample datasets are located in:
```
public/samples/demo/oil-gas/
```

**For Your Demo (Use These!):**
- ✅ `engineering_baseline_medium.csv` (480 KB) + `ot_discovery_medium.csv` (97 KB)

**For Testing:**
- 🧪 `engineering_baseline_demo.csv` (37 KB) + `ot_discovery_demo.csv` (8 KB)

**Local Only:**
- ❌ `engineering_baseline_enterprise.csv` + `ot_discovery_enterprise.csv` (too big)

---

## 🔧 Regenerating Datasets

If you need to regenerate with different parameters:

```bash
cd tools
node generate-realistic-data.mjs
```

Edit the script to adjust:
- Asset counts (currently: 500, 6500, 25000)
- Tier distributions (5% Tier 1, 30% Tier 2, 65% Tier 3)
- Discovery coverage rates (~11% for realistic gaps)
- Data quality issues (8% missing manufacturer, etc.)

---

## 💡 Pro Tips for Your Demo

1. **Run it locally first** to make sure everything works
2. **Practice the narrative** - inventory → intelligence → actions
3. **Highlight the blind spots** - "85% of networkable devices are invisible"
4. **Connect to $$** - "Each unsecured PLC is a $50K+ ransomware risk"
5. **Show the orphans** - "60+ devices on the network we don't even know about"

**You've got a realistic, impressive, credible demo. Knock 'em dead at Deloitte!** 🚀
