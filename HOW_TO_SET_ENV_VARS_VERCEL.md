# How to Set Environment Variables on Vercel

## 🚨 IMPORTANT SECURITY WARNING

**NEVER commit private keys or sensitive data to your repository!** 

If you've already committed a private key:
1. **Immediately rotate/change that private key** - it's compromised
2. Remove it from the file and use `.gitignore` to prevent future commits
3. Only add environment variables through Vercel's secure dashboard

---

## 📋 Step-by-Step Guide

### Method 1: Via Vercel Dashboard (Recommended)

#### Step 1: Access Your Project
1. Go to [vercel.com](https://vercel.com) and log in
2. Click on your project (or create a new one if you haven't deployed yet)

#### Step 2: Navigate to Settings
1. Click on the **"Settings"** tab at the top of your project page
2. In the left sidebar, click on **"Environment Variables"**

#### Step 3: Add Environment Variables
1. You'll see a form with three fields:
   - **Key**: The variable name (e.g., `VITE_CONTRACT_ADDRESS`)
   - **Value**: The variable value (e.g., `0x7fecba8aa411225388457669aaa86f68e5c0caff`)
   - **Environment**: Select which environments to apply to:
     - ☑️ **Production** - For production deployments
     - ☑️ **Preview** - For preview deployments (pull requests)
     - ☑️ **Development** - For local development (if using Vercel CLI)

2. Click **"Add"** or **"Save"** after entering each variable

#### Step 4: Add All Required Variables

Add these variables one by one:

```
Key: VITE_CONTRACT_ADDRESS
Value: 0x7fecba8aa411225388457669aaa86f68e5c0caff
Environment: ☑️ Production ☑️ Preview ☑️ Development
```

```
Key: VITE_API_URL
Value: https://your-app.vercel.app
(Note: Update this after your first deployment with your actual Vercel URL)
Environment: ☑️ Production ☑️ Preview ☑️ Development
```

```
Key: CONTRACT_ADDRESS
Value: 0x7fecba8aa411225388457669aaa86f68e5c0caff
Environment: ☑️ Production ☑️ Preview ☑️ Development
```

```
Key: PRIVATE_KEY
Value: your_private_key_here
(⚠️ Keep this secret! Never commit to Git!)
Environment: ☑️ Production ☑️ Preview
(⚠️ Usually NOT needed for Development)
```

```
Key: RPC_URL
Value: https://coston2-api.flare.network/ext/C/rpc
Environment: ☑️ Production ☑️ Preview ☑️ Development
```

#### Step 5: Redeploy
After adding environment variables:
- If you've already deployed: Go to **"Deployments"** tab → Click the **"..."** menu on the latest deployment → **"Redeploy"**
- If deploying for the first time: Push to GitHub or run `vercel` command

---

### Method 2: Via Vercel CLI

You can also set environment variables using the Vercel CLI:

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Login to Vercel
vercel login

# Link your project (if not already linked)
vercel link

# Add environment variables
vercel env add VITE_CONTRACT_ADDRESS production
# (It will prompt you to enter the value)

vercel env add VITE_API_URL production
vercel env add CONTRACT_ADDRESS production
vercel env add PRIVATE_KEY production
vercel env add RPC_URL production

# Pull environment variables to local .env file (optional)
vercel env pull .env.local
```

---

## 🔍 Visual Guide (What You'll See)

```
Vercel Dashboard
├── Your Project Name
    ├── Overview
    ├── Deployments
    ├── Settings ⬅️ Click here
    │   ├── General
    │   ├── Environment Variables ⬅️ Click here
    │   │   └── [Add New Variable Form]
    │   │       ├── Key: [text input]
    │   │       ├── Value: [text input]
    │   │       └── Environment: ☑️ Production ☑️ Preview ☑️ Development
    │   ├── Domains
    │   └── ...
```

---

## ✅ Verification

After setting environment variables:

1. **Check they're set correctly:**
   - Go to Settings → Environment Variables
   - You should see all your variables listed
   - Values are hidden for security (shown as `••••••••`)

2. **Test in your deployment:**
   - Deploy your app
   - Check the build logs to ensure no "undefined" errors
   - Test API endpoints to verify they work

3. **View in deployment logs:**
   - Go to Deployments → Click on a deployment
   - Check "Build Logs" to see if variables are accessible
   - ⚠️ Note: Never log sensitive values like `PRIVATE_KEY` in your code!

---

## 🔐 Security Best Practices

1. **Never commit `.env` files** - Add to `.gitignore`:
   ```
   .env
   .env.local
   .env.*.local
   ```

2. **Use different keys for different environments:**
   - Production: Use production contract address and keys
   - Preview: Use testnet contract address and test keys
   - Development: Use local test values

3. **Rotate keys if exposed:**
   - If a private key is ever committed to Git, immediately:
     - Generate a new key
     - Update it in Vercel
     - Remove it from Git history (if possible)

4. **Limit access:**
   - Only add `PRIVATE_KEY` to Production and Preview
   - Don't add sensitive keys to Development environment

---

## 🐛 Troubleshooting

**Variables not working?**
- Make sure you selected the correct environment (Production/Preview/Development)
- Redeploy after adding variables
- Check variable names match exactly (case-sensitive)
- For Vite variables, they must start with `VITE_`

**Can't see the Settings tab?**
- Make sure you're the project owner or have admin access
- Check you're logged into the correct Vercel account

**Variables show as undefined in code?**
- For frontend: Variables must start with `VITE_` to be exposed
- For backend (API routes): All variables are available via `process.env.VARIABLE_NAME`
- Restart dev server after adding variables locally

---

## 📝 Quick Checklist

- [ ] Logged into Vercel dashboard
- [ ] Selected your project
- [ ] Navigated to Settings → Environment Variables
- [ ] Added `VITE_CONTRACT_ADDRESS`
- [ ] Added `VITE_API_URL` (update after first deployment)
- [ ] Added `CONTRACT_ADDRESS`
- [ ] Added `PRIVATE_KEY` (Production + Preview only)
- [ ] Added `RPC_URL`
- [ ] Selected appropriate environments for each variable
- [ ] Redeployed the application
- [ ] Verified variables work in deployment

---

## 🆘 Need Help?

If you're still having issues:
1. Check Vercel's official docs: https://vercel.com/docs/concepts/projects/environment-variables
2. Check your deployment logs for specific error messages
3. Verify variable names match exactly what your code expects



