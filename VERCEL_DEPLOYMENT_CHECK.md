# Vercel Deployment Verification

## 🔍 Quick Checks

### 1. Clear Your Browser Cache (IMPORTANT!)
The site might look the same because of browser cache:

**Chrome/Edge:**
- Press `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- Or open DevTools (F12) → Right-click refresh → "Empty Cache and Hard Reload"

**Firefox:**
- Press `Ctrl + Shift + Delete` → Clear "Cached Web Content"
- Then refresh the page

### 2. Check Vercel Deployment Status
1. Go to https://vercel.com/dashboard
2. Click on your project
3. Wait for the build to complete (green checkmark ✓)
4. Latest commit should be: `c24da2d` (Force rebuild: clear Vercel cache)

### 3. Verify API Routes Are Deployed
Test these URLs directly (should return JSON, not 404):

**Oil & Gas V2 API:**
```
https://assurance-twin.vercel.app/api/analyze-oil-gas-v2
```
- Should return: `{"error":"POST only"}` (that's correct!)

**Automotive V2 API:**
```
https://assurance-twin.vercel.app/api/analyze-automotive-v2
```
- Should return: `{"error":"POST only"}` (that's correct!)

### 4. Test the Frontend
1. Go to https://assurance-twin.vercel.app/
2. Open Browser DevTools (F12)
3. Go to Console tab
4. Select **Oil & Gas Refineries**
5. Upload sample files (any CSV)
6. Click "Canonize Assets"
7. Check Console for:
   - "Sending payload: ..."
   - Should POST to `/api/analyze-oil-gas-v2` (NOT `/api/analyze-oil-gas`)

### 5. Verify New UI Elements
After upload, you should see:
- ✅ "Process Unit Distribution" table
- ✅ "Device Type Distribution" table
- ✅ "Manufacturer Distribution" table
- ❌ NO "Crown Jewels" section
- ❌ NO "Risk Score" columns

---

## 🐛 If Still Not Working

### Option A: Redeploy from Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Click your project
3. Go to "Deployments" tab
4. Click "..." on latest deployment
5. Click "Redeploy"
6. Check "Use existing Build Cache" is **UNCHECKED**

### Option B: Check API Route Files Exist
In Vercel dashboard, check these files are deployed:
- `api/analyze-oil-gas-v2.js` ✓
- `api/analyze-automotive-v2.js` ✓

If missing, Vercel might not be picking up the `api/` folder.

### Option C: Verify vercel.json Configuration
Make sure `vercel.json` includes rewrites for SPA routing.

---

## 📊 Expected Results After Fix

### Oil & Gas (Clean Scenario)
Upload these files:
- `public/samples/demo/oil-gas/engineering_baseline_clean.csv`
- `public/samples/demo/oil-gas/ot_discovery_clean.csv`

**Expected:**
- Total Assets: 15
- Discovery Coverage: 93%
- Matched Assets: 14
- Blind Spots: 1
- Process Unit Distribution table visible
- NO crown jewels section

### Automotive (Clean Scenario)
Upload these files:
- `public/samples/demo/automotive/engineering_baseline_clean.csv`
- `public/samples/demo/automotive/ot_discovery_clean.csv`

**Expected:**
- Total Assets: 15
- Discovery Coverage: 100%
- Matched Assets: 15
- Blind Spots: 0
- Production Line Distribution table visible
- ISO 26262 ASIL Distribution table visible
- NO crown jewels section

---

## 🚨 Emergency Fallback

If Vercel keeps caching, you can:

1. **Delete and Redeploy:**
   - Delete the Vercel project
   - Reconnect GitHub repo
   - Fresh deployment

2. **Use Netlify Instead:**
   - Already have `netlify.toml` configured
   - Can deploy there if Vercel continues to have issues

3. **Local Demo:**
   - Run `npm run dev`
   - Demo from localhost:5173
   - (Not ideal but works!)

---

## ✅ Success Indicators

You'll know it's working when:
- Console shows POST to `/api/analyze-oil-gas-v2` (has `-v2`!)
- No "Crown Jewels" section visible
- "Process Unit Distribution" or "Production Line Distribution" tables visible
- Coverage percentages are realistic (not forced 50-75%)
- Manual enrichment "Suggested Matches" appears (if blind spots exist)

---

**Current Deployment:** Triggered fresh build at commit `c24da2d`  
**Wait Time:** ~2-3 minutes for Vercel to build and deploy  
**Then:** Hard refresh your browser (Ctrl+Shift+R)

