import { ethers } from 'ethers';
import cors from 'cors';

const corsHandler = cors({
  origin: true,
  credentials: true,
});

const CONTRACT_ABI = [
  "function isFdcVerified(address walletAddress, string memory githubUsername) public view returns (bool verified, bytes32 attestationId)",
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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Vercel dynamic route: /api/fdc/check/:walletAddress/:githubUsername
    const { walletAddress, githubUsername } = req.query;

    if (!walletAddress || !githubUsername) {
      return res.status(400).json({ error: 'walletAddress and githubUsername are required' });
    }

    const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
    const RPC_URL = process.env.RPC_URL || 'https://coston2-api.flare.network/ext/C/rpc';

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
}

