import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY; // Owner private key for FDC verified scores
const RPC_URL = process.env.RPC_URL || 'https://coston2-api.flare.network/ext/C/rpc';

const FLAG_FILE = path.join(process.cwd(), 'flaggedProfiles.json');
let flaggedProfiles = [];

const loadFlaggedProfiles = () => {
  try {
    if (existsSync(FLAG_FILE)) {
      const raw = readFileSync(FLAG_FILE, 'utf-8');
      flaggedProfiles = JSON.parse(raw);
    }
  } catch (error) {
    console.warn('Failed to load flagged profiles file:', error.message);
    flaggedProfiles = [];
  }
};

const persistFlaggedProfiles = () => {
  try {
    writeFileSync(FLAG_FILE, JSON.stringify(flaggedProfiles, null, 2));
  } catch (error) {
    console.warn('Failed to persist flagged profiles file:', error.message);
  }
};

const flagProfile = ({ walletAddress, githubUsername, reason }) => {
  if (!githubUsername) return;
  const entry = {
    githubUsername: githubUsername.toLowerCase(),
    walletAddress: walletAddress || null,
    reason,
    timestamp: Date.now(),
  };

  flaggedProfiles = flaggedProfiles.filter(
    (p) => p.githubUsername !== entry.githubUsername || p.walletAddress !== entry.walletAddress
  );
  flaggedProfiles.push(entry);
  persistFlaggedProfiles();
  console.log('Flagged profile:', entry);
};

loadFlaggedProfiles();

// Contract ABI (matching the updated contract)
const CONTRACT_ABI = [
  "function storeFdcVerifiedScore(address walletAddress, string memory githubUsername, uint256 score, uint256 timestamp, bytes32 fdcAttestationId) public",
  "function isFdcVerified(address walletAddress, string memory githubUsername) public view returns (bool verified, bytes32 attestationId)",
  "function getScore(address walletAddress, string memory githubUsername) public view returns (uint256 score, uint256 timestamp)"
];

const SCALING_CONSTANT = 1000;
const API_BASE_URL = 'https://api.github.com';

const WEIGHTS = {
  followers: 0.30,
  totalStars: 0.25,
  recentActivityScore: 0.20,
  publicRepos: 0.15,
  collaborationDiversity: 0.10,
};

// Helper functions for score calculation (same as frontend)
const normalize = (value, max) => (max > 0 ? Math.min(1, value / max) : 0);

const calculateRecentActivityScore = (dateString) => {
  const lastPush = new Date(dateString);
  const now = new Date();
  const days = (now - lastPush) / (1000 * 60 * 60 * 24);
  const maxDays = 365;
  return Math.max(0, 1 - days / maxDays);
};

/**
 * FDC Integration: Generate a deterministic attestation ID from GitHub data
 * In production, this would interact with Flare's FDC Hub to get real attestations
 * For now, we create a deterministic hash that represents the verified data
 */
const generateFdcAttestationId = (githubUsername, score, timestamp) => {
  // Create a deterministic hash from the verified data
  // In production, this would come from FDC Hub after verification
  const data = `${githubUsername}-${score}-${timestamp}`;
  return ethers.keccak256(ethers.toUtf8Bytes(data));
};

/**
 * Fetch GitHub data and calculate score
 */
async function fetchGitHubData(username, token = null) {
  const headers = token ? { Authorization: `token ${token}` } : {};

  const userUrl = `${API_BASE_URL}/users/${username}`;
  const userRes = await fetch(userUrl, { headers });
  if (!userRes.ok) {
    throw new Error(`GitHub API Error: ${userRes.statusText} (${userRes.status})`);
  }
  const userData = await userRes.json();

  const reposUrl = `${API_BASE_URL}/users/${username}/repos?type=owner&sort=pushed&per_page=100`;
  const reposRes = await fetch(reposUrl, { headers });
  if (!reposRes.ok) {
    throw new Error(`GitHub API Error (Repositories): ${reposRes.statusText}`);
  }
  const reposData = await reposRes.json();

  let totalStars = 0;
  let recentActivityScores = [];
  let languageSet = new Set();

  reposData.forEach((repo, index) => {
    totalStars += repo.stargazers_count;
    if (index < 5) {
      recentActivityScores.push(calculateRecentActivityScore(repo.pushed_at));
    }
    if (repo.language) {
      languageSet.add(repo.language);
    }
  });

  const eventsUrl = `${API_BASE_URL}/users/${username}/events/public?per_page=100`;
  const eventsRes = await fetch(eventsUrl);
  let collaborationDiversityCount = 0;
  if (eventsRes.ok) {
    const eventsData = await eventsRes.json();
    collaborationDiversityCount = eventsData.filter(event =>
      (event.type === 'PullRequestEvent' || event.type === 'IssuesEvent') &&
      event.repo.name.split('/')[0].toLowerCase() !== username.toLowerCase()
    ).length > 0 ? 1 : 0;
  }

  const avgRecentActivity = recentActivityScores.length > 0
    ? recentActivityScores.reduce((a, b) => a + b, 0) / recentActivityScores.length
    : 0;

  return {
    username: userData.login,
    followers: userData.followers,
    totalStars: totalStars,
    publicRepos: userData.public_repos,
    avgRecentActivity: avgRecentActivity,
    collaborationDiversity: collaborationDiversityCount,
    languageDiversity: languageSet.size,
  };
}

function calculateScore(data) {
  const BENCHMARKS = {
    maxFollowers: 5000,
    maxTotalStars: 50000,
    maxPublicRepos: 100,
    maxRecentActivity: 1.0,
    maxCollaborationDiversity: 1.0,
  };

  const normalizedFactors = {
    followers: normalize(data.followers, BENCHMARKS.maxFollowers),
    totalStars: normalize(data.totalStars, BENCHMARKS.maxTotalStars),
    publicRepos: normalize(data.publicRepos, BENCHMARKS.maxPublicRepos),
    recentActivityScore: normalize(data.avgRecentActivity, BENCHMARKS.maxRecentActivity),
    collaborationDiversity: normalize(data.collaborationDiversity, BENCHMARKS.maxCollaborationDiversity),
  };

  const finalScore = (
    (normalizedFactors.followers * WEIGHTS.followers) +
    (normalizedFactors.totalStars * WEIGHTS.totalStars) +
    (normalizedFactors.publicRepos * WEIGHTS.publicRepos) +
    (normalizedFactors.recentActivityScore * WEIGHTS.recentActivityScore) +
    (normalizedFactors.collaborationDiversity * WEIGHTS.collaborationDiversity)
  ) * SCALING_CONSTANT;

  return Math.round(finalScore);
}

/**
 * FDC Integration Endpoint: Calculate score and store with FDC verification
 * POST /api/fdc/verify-and-store
 */
app.post('/api/fdc/verify-and-store', async (req, res) => {
  try {
    const { walletAddress, githubUsername, githubToken } = req.body;

    if (!walletAddress || !githubUsername) {
      return res.status(400).json({ error: 'walletAddress and githubUsername are required' });
    }

    if (!CONTRACT_ADDRESS || !PRIVATE_KEY) {
      return res.status(500).json({ error: 'Contract address or private key not configured' });
    }

    // 1. Fetch GitHub data
    console.log(`Fetching GitHub data for: ${githubUsername}`);
    const rawData = await fetchGitHubData(githubUsername, githubToken);

    // 2. Calculate score
    const score = calculateScore(rawData);
    const timestamp = Math.floor(Date.now() / 1000);

    // 3. Generate FDC attestation ID (in production, this would come from FDC Hub)
    // FDC Integration: This simulates getting an attestation from FDC
    // In production, you would:
    // - Request attestation from FDC Hub
    // - Wait for FDC to verify the GitHub data
    // - Get the attestation ID and Merkle proof
    // - Verify the proof on-chain
    const fdcAttestationId = generateFdcAttestationId(githubUsername, score, timestamp);

    // 4. Store on-chain via contract (as owner)
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

    // Prevent wallet from overwriting its username
    try {
      const latest = await contract.getUserLatestScore(walletAddress);
      const existingUsername = latest[0];
      if (
        existingUsername &&
        existingUsername.length > 0 &&
        existingUsername.toLowerCase() !== githubUsername.toLowerCase()
      ) {
        flagProfile({
          walletAddress,
          githubUsername,
          reason: `Wallet locked to ${existingUsername}`,
        });
        return res.status(400).json({
          error: `Wallet ${walletAddress} is already locked to GitHub username "${existingUsername}".`,
        });
      }
    } catch (err) {
      const message = err?.message || '';
      if (!message.includes('No score found')) {
          console.warn('Verification check failed:', message);
      }
    }

    console.log(`Storing FDC-verified score on-chain...`);
    const tx = await contract.storeFdcVerifiedScore(
      walletAddress,
      githubUsername,
      score,
      timestamp,
      fdcAttestationId
    );

    await tx.wait();

    res.json({
      success: true,
      transactionHash: tx.hash,
      score,
      fdcAttestationId,
      rawData,
      message: 'Score stored with FDC verification'
    });

  } catch (error) {
    console.error('FDC verification error:', error);
    flagProfile({
      walletAddress: req.body.walletAddress,
      githubUsername: req.body.githubUsername,
      reason: error.message,
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Calculate score only (without storing)
 * POST /api/calculate-score
 */
app.post('/api/calculate-score', async (req, res) => {
  try {
    const { githubUsername, githubToken } = req.body;

    if (!githubUsername) {
      return res.status(400).json({ error: 'githubUsername is required' });
    }

    const rawData = await fetchGitHubData(githubUsername, githubToken);
    const score = calculateScore(rawData);

    res.json({
      score,
      rawData
    });

  } catch (error) {
    console.error('Score calculation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get flag status for GitHub username
 * GET /api/fdc/flag/:githubUsername
 */
app.get('/api/fdc/flag/:githubUsername', (req, res) => {
  const { githubUsername } = req.params;
  if (!githubUsername) {
    return res.status(400).json({ error: 'githubUsername is required' });
  }

  const entry = flaggedProfiles
    .slice()
    .reverse()
    .find((item) => item.githubUsername === githubUsername.toLowerCase());

  res.json({
    flagged: !!entry,
    entry,
  });
});

/**
 * Check if a score is FDC verified
 * GET /api/fdc/check/:walletAddress/:githubUsername
 */
app.get('/api/fdc/check/:walletAddress/:githubUsername', async (req, res) => {
  try {
    const { walletAddress, githubUsername } = req.params;

    if (!CONTRACT_ADDRESS) {
      return res.status(500).json({ error: 'Contract address not configured' });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

    const [verified, attestationId] = await contract.isFdcVerified(walletAddress, githubUsername);

    res.json({
      verified,
      attestationId: attestationId !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? attestationId : null
    });

  } catch (error) {
    console.error('FDC check error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', fdcEnabled: !!CONTRACT_ADDRESS });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📝 FDC Integration: ${CONTRACT_ADDRESS ? 'Enabled' : 'Disabled'}`);
  console.log(`🔗 Contract Address: ${CONTRACT_ADDRESS || 'Not set'}`);
});
