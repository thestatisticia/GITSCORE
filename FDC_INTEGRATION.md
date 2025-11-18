# FDC (Flare Data Connector) Integration Guide

## How FDC is Integrated

This project integrates **Flare Data Connector (FDC)** to provide verified, trustless GitHub score data on-chain. Here's how it works:

## Architecture Overview

```
Frontend (React)
    ↓
Backend API (Express) ← FDC Integration Layer
    ↓
Smart Contract (GitHubScorer.sol)
    ↓
Flare Testnet Blockchain
```

## FDC Integration Flow

### 1. **Contract-Level Integration** (`contracts/GitHubScorer.sol`)

The contract includes FDC-specific features:

- **FDC Verification Flag**: Each score stores a `fdcVerified` boolean
- **FDC Attestation ID**: Stores the `bytes32 fdcAttestationId` for verification
- **Owner-Only Function**: `storeFdcVerifiedScore()` - Only contract owner can store FDC-verified scores
- **Attestation Tracking**: Prevents duplicate attestation IDs from being used

**Key Functions:**
```solidity
function storeFdcVerifiedScore(
    address walletAddress,
    string memory githubUsername,
    uint256 score,
    uint256 timestamp,
    bytes32 fdcAttestationId
) public onlyOwner
```

### 2. **Backend FDC Service** (`backend/server.js`)

The backend acts as the **FDC Integration Layer**:

**Endpoint: `POST /api/fdc/verify-and-store`**

1. **Fetches GitHub Data**: Retrieves user data from GitHub API
2. **Calculates Score**: Uses the same algorithm as frontend
3. **Generates FDC Attestation ID**: Creates a deterministic hash representing verified data
   ```javascript
   const fdcAttestationId = generateFdcAttestationId(githubUsername, score, timestamp);
   ```
4. **Stores On-Chain**: Calls `storeFdcVerifiedScore()` as contract owner

**In Production**, this would:
- Request attestation from FDC Hub
- Wait for FDC to verify the GitHub data
- Get the attestation ID and Merkle proof from FDC
- Verify the proof on-chain before storing

### 3. **Frontend Integration** (`src/utils/contract.js`)

The frontend provides two ways to store scores:

**Standard Method** (User pays gas):
```javascript
storeScore(walletAddress, githubUsername, score)
```

**FDC Verified Method** (Backend pays gas, owner-only):
```javascript
storeFdcVerifiedScore(walletAddress, githubUsername, githubToken)
```

## FDC Benefits

1. **Trustless Verification**: FDC provides cryptographic proof that GitHub data is authentic
2. **No User Gas Costs**: FDC-verified scores are stored by the contract owner
3. **Data Integrity**: Attestation IDs prevent tampering and duplicate submissions
4. **Future-Proof**: Ready for full FDC Hub integration when available

## Current Implementation

**Current State**: The integration uses a **deterministic hash** as the attestation ID. This simulates FDC verification and provides the infrastructure for full FDC Hub integration.

**Production Ready**: When Flare's FDC Hub is fully available, you can:
1. Replace `generateFdcAttestationId()` with actual FDC Hub API calls
2. Add Merkle proof verification in the contract
3. Use FDC's enshrined oracle for trustless data verification

## Usage

### Store FDC-Verified Score

```javascript
import { storeFdcVerifiedScore } from './utils/contract';

// This calls the backend API which handles FDC verification
const result = await storeFdcVerifiedScore(
  walletAddress,
  'github-username',
  'optional-github-token'
);

console.log(result.transactionHash);
console.log(result.fdcAttestationId);
```

### Check FDC Verification Status

```javascript
import { isFdcVerified } from './utils/contract';

const { verified, attestationId } = await isFdcVerified(
  walletAddress,
  'github-username'
);
```

## Environment Variables

**Backend** (`.env` in `backend/`):
```
CONTRACT_ADDRESS=0x... (deployed contract address)
PRIVATE_KEY=0x... (contract owner private key)
RPC_URL=https://coston-api.flare.network/ext/C/rpc
PORT=3001
```

**Frontend** (`.env` in root):
```
VITE_CONTRACT_ADDRESS=0x... (deployed contract address)
VITE_API_URL=http://localhost:3001 (backend API URL)
```

## Network Details

**Flare Testnet (Coston)**:
- Chain ID: `88888`
- RPC URL: `https://coston-api.flare.network/ext/C/rpc`
- Explorer: `https://coston-explorer.flare.network`
- Currency: C2FLR (Coston FLR)

## Next Steps for Full FDC Integration

1. **Integrate FDC Hub SDK**: Use Flare's official FDC SDK
2. **Request Attestations**: Call FDC Hub API to request data attestation
3. **Verify Proofs**: Implement Merkle proof verification in contract
4. **Handle Callbacks**: Set up webhooks for FDC attestation completion

For more information, see: [Flare Data Connector Documentation](https://dev.flare.network/fdc/overview)

