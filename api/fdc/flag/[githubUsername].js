import cors from 'cors';

const corsHandler = cors({
  origin: true,
  credentials: true,
});

// In-memory storage for flags (resets on each deployment)
// For production, consider using Vercel KV or a database
let flaggedProfiles = [];

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
    // Vercel dynamic route: /api/fdc/flag/:githubUsername
    const { githubUsername } = req.query;

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

  } catch (error) {
    console.error('Flag check error:', error);
    res.status(500).json({ error: error.message });
  }
}

