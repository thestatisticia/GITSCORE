# Web3 GitHub Account Scorer

A decentralized GitHub profile scoring application built on Flare Testnet with Flare Data Connector (FDC) integration.

## Features

- 🔗 **Flare Testnet Integration** - Connect MetaMask wallet on Flare Testnet
- 📊 **GitHub Scoring Algorithm** - Weighted scoring based on:
  - Followers (30%)
  - Total Stars (25%)
  - Recent Activity (20%)
  - Public Repositories (15%)
  - External Collaboration (10%)
- 🔐 **On-Chain Storage** - Store scores on Flare Testnet smart contract
- 🎨 **Modern UI** - Built with React and Tailwind CSS

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Deploy Smart Contract

```bash
# Install Hardhat dependencies (if not already installed)
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox dotenv

# Create .env file in root with your private key
echo "PRIVATE_KEY=your_private_key_here" > .env

# Deploy contract
npx hardhat run scripts/deploy.js --network flareTestnet
```

After deployment, update `.env` with the contract address:
```
VITE_CONTRACT_ADDRESS=0x... (your deployed contract address)
```

### 3. Start Development Server

```bash
npm run dev
```

## Usage

1. **Connect Wallet**: Click "Connect MetaMask" - it will automatically switch to Flare Testnet
2. **Enter GitHub Username**: Paste a GitHub profile link or username
3. **Calculate Score**: Click "Calculate Score" to fetch GitHub data and compute the score
4. **Store on Chain**: Click "Store Score on Flare Testnet" to save the score on-chain

## Smart Contract

The `GitHubScorer.sol` contract stores scores on Flare Testnet:
- `storeScore()` - Store a score for a wallet and GitHub username
- `getScore()` - Retrieve a stored score
- `getUserLatestScore()` - Get the latest score for a wallet

## Scoring Formula

The score (0-1000) is calculated using weighted normalization:

```
Score = (
  (normalized_followers × 0.30) +
  (normalized_stars × 0.25) +
  (normalized_activity × 0.20) +
  (normalized_repos × 0.15) +
  (normalized_collaboration × 0.10)
) × 1000
```

## Network Configuration

- **Network**: Flare Testnet (Coston)
- **Chain ID**: 88888
- **RPC URL**: https://coston-api.flare.network/ext/C/rpc
- **Explorer**: https://coston-explorer.flare.network

## Tech Stack

- React 19
- Vite
- Tailwind CSS
- Ethers.js v6
- Hardhat
- Solidity 0.8.20

## License

MIT
