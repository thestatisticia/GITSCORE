import { ethers } from 'ethers';
import cors from 'cors';

// Enable CORS for all routes
const corsHandler = cors({
  origin: true,
  credentials: true,
});

const SCALING_CONSTANT = 1000;
const API_BASE_URL = 'https://api.github.com';

const WEIGHTS = {
  followers: 0.30,
  totalStars: 0.25,
  recentActivityScore: 0.20,
  publicRepos: 0.15,
  collaborationDiversity: 0.10,
};

const normalize = (value, max) => (max > 0 ? Math.min(1, value / max) : 0);

const calculateRecentActivityScore = (dateString) => {
  const lastPush = new Date(dateString);
  const now = new Date();
  const days = (now - lastPush) / (1000 * 60 * 60 * 24);
  const maxDays = 365;
  return Math.max(0, 1 - days / maxDays);
};

const generateFdcAttestationId = (githubUsername, score, timestamp) => {
  const data = `${githubUsername}-${score}-${timestamp}`;
  return ethers.keccak256(ethers.toUtf8Bytes(data));
};

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

const CONTRACT_ABI = [
  "function storeFdcVerifiedScore(address walletAddress, string memory githubUsername, uint256 score, uint256 timestamp, bytes32 fdcAttestationId) public",
  "function getUserLatestScore(address walletAddress) public view returns (string memory githubUsername, uint256 score, uint256 timestamp)",
];

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { walletAddress, githubUsername, githubToken } = req.body;

    if (!walletAddress || !githubUsername) {
      return res.status(400).json({ error: 'walletAddress and githubUsername are required' });
    }

    const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    const RPC_URL = process.env.RPC_URL || 'https://coston2-api.flare.network/ext/C/rpc';

    if (!CONTRACT_ADDRESS || !PRIVATE_KEY) {
      return res.status(500).json({ error: 'Contract address or private key not configured' });
    }

    // 1. Fetch GitHub data
    console.log(`Fetching GitHub data for: ${githubUsername}`);
    let rawData;
    try {
      rawData = await fetchGitHubData(githubUsername, githubToken);
    } catch (githubError) {
      return res.status(400).json({ 
        error: `GitHub fetch failed: ${githubError.message}`,
        flagged: true 
      });
    }

    // 2. Calculate score
    const score = calculateScore(rawData);
    const timestamp = Math.floor(Date.now() / 1000);

    // 3. Generate FDC attestation ID
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
        return res.status(400).json({
          error: `Wallet ${walletAddress} is already locked to GitHub username "${existingUsername}".`,
          flagged: true
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
    res.status(500).json({ error: error.message });
  }
}

