# Deploy Contract with Viem

## Quick Deployment Guide

### 1. Install Dependencies

```bash
npm install viem dotenv
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
```

### 2. Compile Contract

```bash
npm run compile
# or
npx hardhat compile
```

### 3. Set Up Environment

Create a `.env` file in the root directory:

```
PRIVATE_KEY=your_private_key_here
```

**Important**: 
- Get testnet tokens from [Flare Faucet](https://faucet.flare.network/)
- Never commit your private key to git!

### 4. Deploy with Viem

```bash
npm run deploy
# or
node scripts/deploy-viem.js
```

The script will:
- ✅ Check your account balance
- ✅ Deploy the contract to Flare Testnet (Coston)
- ✅ Wait for confirmation
- ✅ Display the contract address

### 5. Update Environment Variables

After deployment, update your `.env` files:

**Root `.env`** (for frontend):
```
VITE_CONTRACT_ADDRESS=0x... (your deployed address)
VITE_API_URL=http://localhost:3001
```

**Backend `.env`** (in `backend/` folder):
```
CONTRACT_ADDRESS=0x... (your deployed address)
PRIVATE_KEY=0x... (contract owner private key - same as deployer)
RPC_URL=https://coston-api.flare.network/ext/C/rpc
PORT=3001
```

## Flare Testnet Details

- **Network Name**: Flare Testnet (Coston)
- **Chain ID**: `88888`
- **RPC URL**: `https://coston-api.flare.network/ext/C/rpc`
- **Explorer**: `https://coston-explorer.flare.network`
- **Currency**: C2FLR (Coston FLR)

## Troubleshooting

### "Contract artifacts not found"
Run `npm run compile` first to compile the contract.

### "Account balance is 0"
Get testnet tokens from the [Flare Faucet](https://faucet.flare.network/).

### "PRIVATE_KEY not found"
Make sure you have a `.env` file with your private key.

## Alternative: Deploy with Hardhat

If you prefer using Hardhat directly:

```bash
npm run deploy:hardhat
```

