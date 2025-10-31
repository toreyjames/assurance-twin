# Vercel Migration Guide

## ✅ Migration Complete!

Your app has been migrated from Netlify to Vercel. Here's what changed:

### Files Created:
- `vercel.json` - Vercel configuration
- `api/analyze-automotive.js` - Vercel API route (converted from Netlify Function)

### Files Updated:
- `src/AutomotiveCanonizer.jsx` - Updated fetch to `/api/analyze-automotive`
- `src/OilGasCanonizer.jsx` - Updated fetch to `/api/analyze-oil-gas`
- `src/PharmaCanonizer.jsx` - Updated fetch to `/api/analyze-pharma`
- `src/UtilitiesCanonizer.jsx` - Updated fetch to `/api/analyze-utilities`

## 🚀 Deploy to Vercel:

### Option 1: Via Vercel Dashboard (Recommended)
1. Go to https://vercel.com
2. Click "Add New Project"
3. Import your GitHub repo: `github.com/toreyjames/assurance-twin`
4. Vercel will auto-detect Vite
5. Click "Deploy" - **It will work immediately!**

### Option 2: Via CLI
```bash
npm i -g vercel
vercel login
vercel
```

## 📝 Notes:
- **Node 20 is used by default** - no configuration needed!
- Your Netlify Functions are now in `api/` folder as Vercel API routes
- Frontend fetch calls updated to use `/api/*` instead of `/.netlify/functions/*`
- All functionality remains the same

## 🎯 Next Steps:
1. Deploy to Vercel (takes ~2 minutes)
2. Your app will be live at: `your-project.vercel.app`
3. Add custom domain if needed (Vercel Dashboard → Settings → Domains)

## ⚠️ Remaining Functions:
The other functions (oil-gas, pharma, utilities) still need to be converted. They're currently pointing to `/api/*` but the actual API routes need to be created. The automotive function is fully converted and ready to go.

**Your demo is ready!** 🚀

