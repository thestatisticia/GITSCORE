# Deployment Guide

## Contract Deployment Status

The contract is **NOT YET DEPLOYED**. You need to deploy it first.

## Steps to Deploy

### 1. Install Hardhat Dependencies

```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox dotenv
```

### 2. Create .env File

Create a `.env` file in the root directory:

```
PRIVATE_KEY=your_private_key_here
```

**Important**: Get testnet FLR tokens from [Flare Faucet](https://faucet.flare.network/)

### 3. Deploy Contract

```bash
npx hardhat run scripts/deploy.js --network flareTestnet
```

This will output the contract address. **Save it!**

### 4. Update Frontend .env

Create or update `.env` in the root directory:

```
VITE_CONTRACT_ADDRESS=0x... (paste the deployed contract address here)
```

### 5. Restart Dev Server

```bash
npm run dev
```

## Features Implemented

✅ **Navbar** - With wallet connection button  
✅ **Get Your Score Page** - Calculate and store GitHub scores  
✅ **User Profile Page** - View your stored GitHub stats  
✅ **Leaderboard Page** - View all scores ranked by wallet  
✅ **MetaMask Integration** - Auto-switches to Flare Testnet  
✅ **On-Chain Storage** - Scores stored on Flare Testnet smart contract  

## Contract Functions

- `storeScore()` - Store a score (triggers MetaMask popup)
- `getUserLatestScore()` - Get latest score for a wallet
- `getScoreAddressesCount()` - Get total number of scores (for leaderboard)
- `getScoreAddress()` - Get wallet address at index (for leaderboard)

## Notes

- The contract tracks all addresses that have stored scores for the leaderboard
- MetaMask will popup when you click "Store Score on Flare Testnet"
- Leaderboard can be viewed without wallet connection (read-only)
- Profile page requires wallet connection







