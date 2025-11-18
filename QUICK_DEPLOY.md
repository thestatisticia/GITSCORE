# Quick Contract Deployment Guide

## The Error You're Seeing

The error "Contract not deployed" means the contract address in `.env` is still the default zero address. You need to deploy the contract first.

## Steps to Deploy

### 1. Install Hardhat (if not already installed)

```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox dotenv
```

### 2. Create .env file with your private key

Create a `.env` file in the root directory:

```
PRIVATE_KEY=your_private_key_here
```

**Important**: 
- Get testnet FLR tokens from [Flare Faucet](https://faucet.flare.network/)
- Never share your private key!

### 3. Deploy the Contract

```bash
npx hardhat run scripts/deploy.js --network flareTestnet
```

This will output a contract address like: `0x1234...`

### 4. Update Frontend .env

Create or update `.env` in the root directory:

```
VITE_CONTRACT_ADDRESS=0x1234... (paste the deployed address here)
```

### 5. Restart Dev Server

Stop the current dev server (Ctrl+C) and restart:

```bash
npm run dev
```

## Alternative: Use a Test Contract Address

If you want to test the UI without deploying, you can temporarily use a test address (but contract functions won't work):

```
VITE_CONTRACT_ADDRESS=0x1111111111111111111111111111111111111111
```

But you'll still get errors when trying to interact with the contract.

## Need Help?

If you need help with deployment, let me know and I can guide you through it step by step!





