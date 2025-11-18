import { ethers } from 'ethers';

// Contract ABI and address (will be updated after deployment)
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';

const COSTON2_CHAIN_ID_HEX = '0x72'; // 114 in hex
const FLARE_TESTNET = {
  chainId: COSTON2_CHAIN_ID_HEX,
  chainName: 'Flare Testnet Coston2',
  nativeCurrency: {
    name: 'Coston2 FLR',
    symbol: 'C2FLR',
    decimals: 18,
  },
  rpcUrls: ['https://coston2-api.flare.network/ext/C/rpc'],
  blockExplorerUrls: ['https://coston2-explorer.flare.network'],
};

const ensureCorrectNetwork = async () => {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('Wallet not connected');
  }

  const chainId = await window.ethereum.request({ method: 'eth_chainId' });
  if (chainId !== COSTON2_CHAIN_ID_HEX) {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: COSTON2_CHAIN_ID_HEX }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [FLARE_TESTNET],
        });
      } else {
        throw new Error('Please switch MetaMask to Flare Testnet Coston2');
      }
    }
  }
};

const CONTRACT_ABI = [
  // Store score
  "function storeScore(address walletAddress, string memory githubUsername, uint256 score, uint256 timestamp) public",
  
  // FDC verified score storage (owner only)
  "function storeFdcVerifiedScore(address walletAddress, string memory githubUsername, uint256 score, uint256 timestamp, bytes32 fdcAttestationId) public",
  
  // Get score
  "function getScore(address walletAddress, string memory githubUsername) public view returns (uint256 score, uint256 timestamp)",
  
  // Get user's latest score
  "function getUserLatestScore(address walletAddress) public view returns (string memory githubUsername, uint256 score, uint256 timestamp)",
  
  // FDC verification check
  "function isFdcVerified(address walletAddress, string memory githubUsername) public view returns (bool verified, bytes32 attestationId)",
  
  // Leaderboard functions
  "function getScoreAddressesCount() public view returns (uint256 count)",
  "function getScoreAddress(uint256 index) public view returns (address walletAddress)",
  
  // Events
  "event ScoreStored(address indexed walletAddress, string indexed githubUsername, uint256 score, uint256 timestamp, bool fdcVerified, bytes32 fdcAttestationId)",
  "event FdcScoreStored(address indexed walletAddress, string indexed githubUsername, uint256 score, bytes32 indexed fdcAttestationId)"
];

// Backend API URL for FDC integration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const getContract = async (readOnly = false) => {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('Wallet not connected');
  }

  if (CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
    throw new Error('Contract not deployed. Please deploy the contract and set VITE_CONTRACT_ADDRESS in .env');
  }

  await ensureCorrectNetwork();

  const provider = new ethers.BrowserProvider(window.ethereum);
  
  if (readOnly) {
    // Return read-only contract (no signer needed)
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  }
  
  const signer = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
};

export const storeScore = async (walletAddress, githubUsername, score) => {
  const contract = await getContract();
  const timestamp = Math.floor(Date.now() / 1000);
  
  const tx = await contract.storeScore(walletAddress, githubUsername, score, timestamp);
  await tx.wait();
  return tx;
};

export const getScore = async (walletAddress, githubUsername) => {
  const contract = await getContract();
  const result = await contract.getScore(walletAddress, githubUsername);
  return {
    score: result[0].toString(),
    timestamp: result[1].toString(),
  };
};

export const getUserLatestScore = async (walletAddress) => {
  const contract = await getContract();
  const result = await contract.getUserLatestScore(walletAddress);
  return {
    githubUsername: result[0],
    score: result[1].toString(),
    timestamp: result[2].toString(),
  };
};

/**
 * FDC Integration: Store score with FDC verification via backend
 * This calls the backend API which handles FDC attestation and stores on-chain
 */
export const storeFdcVerifiedScore = async (walletAddress, githubUsername, githubToken = null) => {
  const response = await fetch(`${API_BASE_URL}/api/fdc/verify-and-store`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      walletAddress,
      githubUsername,
      githubToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to store FDC verified score');
  }

  return await response.json();
};

/**
 * Check if a score is FDC verified
 */
export const checkFdcVerification = async (walletAddress, githubUsername) => {
  const response = await fetch(`${API_BASE_URL}/api/fdc/check/${walletAddress}/${githubUsername}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to check FDC verification');
  }

  return await response.json();
};

/**
 * Check FDC verification status on-chain
 */
export const isFdcVerified = async (walletAddress, githubUsername) => {
  const contract = await getContract(true); // Read-only
  const result = await contract.isFdcVerified(walletAddress, githubUsername);
  return {
    verified: result[0],
    attestationId: result[1] !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? result[1] : null,
  };
};

export const getFdcFlagStatus = async (githubUsername) => {
  const response = await fetch(`${API_BASE_URL}/api/fdc/flag/${githubUsername}`);
  if (!response.ok) {
    throw new Error('Unable to fetch flag status');
  }
  return await response.json();
};
