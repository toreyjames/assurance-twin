# 📊 Sample Data Guide - Realistic Scale

## 🎯 Three Dataset Sizes

We provide three realistic sample datasets that match actual refinery scales:

✅ **For Live Demos:** Use **Demo (200)** or **Medium (1,500)** datasets - they work perfectly on Vercel!  
❌ **Enterprise (25,000):** Too large for hosted demos - use for local testing only.

---

## 1️⃣ **Quick Demo (200 assets)** ← ✅ BEST FOR FIRST DEMOS

**Use case:** Quick client demos, initial proof of concept  
**Processing time:** 3-5 seconds  
**Scenario:** Small 50,000 bpd regional refinery  
**File sizes:** 15 KB + 4 KB = **19 KB total** ✅

### **Files:**
```
engineering_baseline_demo.csv  (200 assets)
ot_discovery_demo.csv          (24 devices discovered, ~12% coverage)
```

### **Stats:**
- **Total Assets:** 200
- **Networkable:** ~70 (35%)
- **Discovered & Secured:** ~12 (17% of networkable)
- **Passive/Analog:** ~130 (65%)

### **Quality Issues (realistic):**
- ⚠️ 8% missing manufacturer info
- ⚠️ 12% unknown/generic devices
- ⚠️ 15% devices without IP in discovery tool
- ⚠️ 3-5 orphan discovered devices (no matching tag_id)

### **Why use this:**
- ✅ Fast demo (< 5 seconds)
- ✅ Small enough to walk through results
- ✅ Shows realistic gaps & issues
- ✅ Perfect for first client meeting
- ✅ **Guaranteed to work on Vercel!**

---

## 2️⃣ **Medium Refinery (1,500 assets)** ← ✅ BEST FOR CLIENT PRESENTATIONS

**Use case:** Realistic client demos, sales presentations  
**Processing time:** 10-15 seconds  
**Scenario:** Mid-sized 150,000 bpd refinery  
**File sizes:** 110 KB + 23 KB = **133 KB total** ✅

### **Files:**
```
engineering_baseline_medium.csv  (1,500 assets)
ot_discovery_medium.csv          (159 devices discovered, ~29% coverage)
```

### **Stats:**
- **Total Assets:** 1,500
- **Networkable:** ~525 (35%)
- **Discovered & Secured:** ~80 (15% of networkable)
- **Passive/Analog:** ~975 (65%)

### **Quality Issues (realistic):**
- ⚠️ 7% missing manufacturer
- ⚠️ 10% unknown/generic devices
- ⚠️ 20% devices without IP in discovery tool
- ⚠️ 15-20 orphan discovered devices
- ⚠️ ~40% of networkable devices not discovered (blind spots!)

### **Why use this:**
- ✅ Impressive scale but not overwhelming
- ✅ Multiple process units (CDU, FCC, Hydrocracker, etc.)
- ✅ Shows realistic security gaps
- ✅ Enough data to show patterns
- ✅ **Most common use case**
- ✅ **Guaranteed to work on Vercel!**

---

## 3️⃣ **Large Enterprise (25,000 assets)**

**Use case:** Enterprise sales, stress testing, impressive scale  
**Processing time:** 30-45 seconds  
**Scenario:** Large 400,000+ bpd enterprise across 3 refineries  
**File sizes:** 1.8 MB + 388 KB = **2.2 MB total** ❌

⚠️ **Note:** This dataset **WILL FAIL on Vercel** (413 error). Use Demo or Medium for hosted demos. Download and run locally for enterprise-scale testing.

### **Files:**
```
engineering_baseline_enterprise.csv  (25,000 assets)
ot_discovery_enterprise.csv          (2,711 devices discovered)
```

### **Stats:**
- **Total Assets:** 25,000
- **Networkable:** ~8,750 (35%)
- **Discovered & Secured:** ~1,350 (15% of networkable)
- **Passive/Analog:** ~16,250 (65%)
- **3 Sites:** Gulf Coast, Midwest, West Coast refineries

### **Quality Issues (realistic):**
- ⚠️ 8% missing manufacturer
- ⚠️ 12% unknown/generic devices
- ⚠️ 18% devices without IP in discovery tool
- ⚠️ 200+ orphan discovered devices
- ⚠️ ~35% of networkable devices not discovered (major blind spots!)

### **Why use this:**
- ✅ Enterprise-level credibility
- ✅ Multi-site complexity
- ✅ Stress tests the matching engine
- ✅ Shows real-world scale
- ❌ **Too large for Vercel - local only!**

---

## 🎯 Demo Strategy

### **For Initial Demos (15 min):**
Use **Demo (200 assets)**
- Upload `engineering_baseline_demo.csv` + `ot_discovery_demo.csv`
- Walk through the 3-section narrative:
  1. Complete inventory & security posture
  2. Plant intelligence (what we have, where)
  3. Top 3 actions
- Highlight realistic gaps & orphans

### **For Client Presentations (30 min):**
Use **Medium (1,500 assets)**
- Upload `engineering_baseline_medium.csv` + `ot_discovery_medium.csv`
- Show realistic refinery scale
- Focus on security gaps & blind spots
- Discuss matching strategies (IP, hostname, MAC)

### **For Enterprise Conversations:**
Mention **Enterprise (25,000 assets)** exists for local testing
- Download files from repo
- Run locally with `npm run dev`
- Show screenshots/recordings in presentation

---

## 📂 File Locations

All sample datasets are located in:
```
public/samples/demo/oil-gas/
```

**Vercel-Compatible (Use These!):**
- ✅ `engineering_baseline_demo.csv` + `ot_discovery_demo.csv`
- ✅ `engineering_baseline_medium.csv` + `ot_discovery_medium.csv`

**Local Only:**
- ❌ `engineering_baseline_enterprise.csv` + `ot_discovery_enterprise.csv`

**Legacy (Older Datasets):**
- `engineering_baseline_clean.csv` + `ot_discovery_clean.csv` (perfect data, unrealistic)
- `engineering_baseline_broken.csv` + `ot_discovery_broken.csv` (too broken, not useful)

---

## 🔧 Regenerating Datasets

If you need to regenerate with different parameters:

```bash
cd tools
node generate-realistic-data.mjs
```

Edit the script to adjust:
- Asset counts
- Tier distributions (5% Tier 1, 30% Tier 2, 65% Tier 3)
- Discovery coverage rates
- Data quality issues
