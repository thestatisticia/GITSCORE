# Vercel Deployment Guide

## ✅ Setup Complete

Your app is now configured for Vercel deployment with:
- ✅ Frontend build configuration (`vercel.json`)
- ✅ Backend API routes converted to Vercel serverless functions
- ✅ All dependencies added to `package.json`

## 🚀 Deployment Steps

### 1. Install Dependencies (if not already done)

```bash
npm install
```

### 2. Set Environment Variables in Vercel

Go to your Vercel project settings → Environment Variables and add:

**Required Variables:**
```
VITE_CONTRACT_ADDRESS=0x7fecba8aa411225388457669aaa86f68e5c0caff
VITE_API_URL=https://your-vercel-app.vercel.app
CONTRACT_ADDRESS=0x7fecba8aa411225388457669aaa86f68e5c0caff
PRIVATE_KEY=5fe6aa8d64d7853bf0594952c19d257773b13362eecbec20c1f4e94576a43e47
RPC_URL=https://coston2-api.flare.network/ext/C/rpc
```

**Important Notes:**
- `VITE_API_URL` should point to your Vercel deployment URL (you'll update this after first deployment)
- `PRIVATE_KEY` is the contract owner's private key (keep it secure!)
- All variables are available to both frontend (VITE_*) and backend (API routes)

### 3. Deploy to Vercel

**Option A: Via Vercel CLI**
```bash
npm i -g vercel
vercel
```

**Option B: Via GitHub Integration**
1. Push your code to GitHub
2. Import the repository in Vercel
3. Vercel will auto-detect the configuration and deploy

### 4. Update API URL After First Deployment

After deployment, Vercel will give you a URL like `https://your-app.vercel.app`

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Update `VITE_API_URL` to: `https://your-app.vercel.app`
3. Redeploy (or wait for auto-deploy if using GitHub integration)

## 📁 Project Structure

```
web-app/
├── api/                    # Vercel serverless functions
│   └── fdc/
│       ├── verify-and-store.js
│       ├── check/
│       │   └── [walletAddress]/
│       │       └── [githubUsername].js
│       └── flag/
│           └── [githubUsername].js
├── src/                    # Frontend React app
├── dist/                   # Build output (auto-generated)
├── vercel.json             # Vercel configuration
└── package.json            # Dependencies
```

## 🔧 API Routes

The backend has been converted to Vercel serverless functions:

- `POST /api/fdc/verify-and-store` - Store FDC-verified score
- `GET /api/fdc/check/:walletAddress/:githubUsername` - Check FDC verification
- `GET /api/fdc/flag/:githubUsername` - Get flag status

## ⚠️ Important Notes

1. **File System Limitations**: The flag storage is now in-memory (resets on each deployment). For production, consider using:
   - Vercel KV (key-value store)
   - A database (MongoDB, PostgreSQL, etc.)
   - External storage service

2. **Environment Variables**: Make sure all environment variables are set in Vercel dashboard before deploying.

3. **Build Time**: The build process will:
   - Install dependencies
   - Run `npm run build` (Vite build)
   - Deploy frontend to `/` and API routes to `/api/*`

4. **CORS**: CORS is enabled for all API routes to allow frontend access.

## 🐛 Troubleshooting

**Build fails:**
- Check that all dependencies are in `package.json`
- Ensure Node.js version is compatible (Vercel uses Node 18+ by default)

**API routes return 404:**
- Verify the file structure matches the route paths
- Check that files are in the `api/` directory

**Environment variables not working:**
- Ensure variables are set in Vercel dashboard
- Redeploy after adding new variables
- Check variable names match exactly (case-sensitive)

**CORS errors:**
- Verify `VITE_API_URL` points to your Vercel deployment
- Check that CORS is enabled in API functions

## 📝 Next Steps

1. Deploy to Vercel
2. Test all API endpoints
3. Update `VITE_API_URL` with your deployment URL
4. Consider migrating flag storage to a persistent database

