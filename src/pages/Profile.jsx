import { useState, useEffect } from 'react';
import { getContract, isFdcVerified, getFdcFlagStatus } from '../utils/contract';
import { formatAddress } from '../utils/wallet';
import { fetchGitHubData } from '../utils/github';

const buildScoreBoostTips = (stats) => {
  if (!stats) return [];
  const tips = [];

  if (stats.followers < 200) {
    tips.push('Engage with the community to gain more followers (target 200+ for stronger influence).');
  }
  if (stats.totalStars < 100) {
    tips.push('Publish or polish repositories to accumulate more stars. Showcase your top repos in READMEs.');
  }
  if (stats.publicRepos < 15) {
    tips.push('Increase your public repository count to highlight consistent building.');
  }
  if (stats.collaborationDiversity === 0) {
    tips.push('Collaborate on other people’s repositories to boost the collaboration diversity metric.');
  }
  if (stats.avgRecentActivity < 0.4) {
    tips.push('Push code more frequently; recent activity heavily influences your score.');
  }
  if (stats.languageDiversity < 3) {
    tips.push('Explore additional programming languages to improve language diversity.');
  }

  if (tips.length === 0) {
    tips.push('Great work! Maintain momentum with frequent commits and community engagement.');
  }

  return tips;
};

export default function Profile({ walletAddress }) {
  const [scoreData, setScoreData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [githubStats, setGithubStats] = useState(null);
  const [statsError, setStatsError] = useState(null);
  const [boostTips, setBoostTips] = useState([]);
  const [flagStatus, setFlagStatus] = useState(null);

  useEffect(() => {
    if (walletAddress) {
      loadProfile();
    }
  }, [walletAddress]);

  const loadProfile = async () => {
    if (!walletAddress) {
      setError('Please connect your wallet');
      return;
    }

    setLoading(true);
    setError(null);
    setVerificationStatus(null);

    try {
      // Use read-only contract for viewing profile
      const contract = await getContract(true);
      const result = await contract.getUserLatestScore(walletAddress);
      const data = {
        githubUsername: result[0],
        score: result[1].toString(),
        timestamp: result[2].toString(),
      };
      setScoreData({
        githubUsername: data.githubUsername,
        score: parseInt(data.score),
        timestamp: parseInt(data.timestamp),
      });

      try {
        const verification = await isFdcVerified(walletAddress, data.githubUsername);
        setVerificationStatus(verification);
      } catch (verificationError) {
        console.warn('Failed to fetch verification status', verificationError);
      }

      try {
        const stats = await fetchGitHubData(data.githubUsername);
        setGithubStats(stats);
        setBoostTips(buildScoreBoostTips(stats));
      } catch (statsErr) {
        setStatsError('Unable to fetch GitHub profile details at this time.');
        console.warn('GitHub stats fetch failed', statsErr);
      }

      try {
        const flagInfo = await getFdcFlagStatus(data.githubUsername);
        setFlagStatus(flagInfo);
      } catch (flagErr) {
        console.warn('Failed to fetch flag status', flagErr);
      }
    } catch (error) {
      if (error.message.includes('No score found')) {
        setError('No score found for this wallet. Calculate and store a score first.');
      } else {
        setError(`Failed to load profile: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!walletAddress) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <p className="text-gray-500 text-lg">Please connect your wallet to view your profile</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gscore-page">
      <div className="gscore-container space-y-8">
        <header className="text-center space-y-3">
          <p className="section-title tracking-[0.4em]">GSCORE PROFILE</p>
          <h1 className="text-4xl font-semibold">Your On-Chain Signature</h1>
          <p className="text-gray-500">
            Wallet-bound GitHub metrics, FDC attestation status, and personalized recommendations.
          </p>
        </header>

        <div className="card space-y-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Wallet Address</h2>
            <p className="text-gray-600 font-mono">{formatAddress(walletAddress)}</p>
          </div>

          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-2 text-gray-500">Loading profile...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
              {error}
            </div>
          )}

          {scoreData && !loading && (
            <div className="space-y-6">
              <div className="border-t pt-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Latest Score</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">GitHub Username</p>
                    <p className="text-xl font-bold text-indigo-700">{scoreData.githubUsername}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Score</p>
                    <p className="text-xl font-bold text-green-700">{scoreData.score} / 1000</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Stored On</p>
                    <p className="text-xl font-bold text-blue-700">
                      {new Date(scoreData.timestamp * 1000).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Verification</p>
                    {verificationStatus?.verified ? (
                      <div>
                        <p className="text-lg font-bold text-emerald-700 flex items-center">
                          <span className="inline-flex items-center justify-center w-5 h-5 mr-2 rounded-full bg-emerald-600 text-white text-xs">✓</span>
                          FDC Verified
                        </p>
                        <p className="text-xs text-gray-500 break-all mt-1">
                          {verificationStatus.attestationId}
                        </p>
                      </div>
                    ) : (
                      <p className="text-lg font-semibold text-amber-600">User Submitted</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Score Details</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600">Score Value:</span>
                    <span className="text-2xl font-bold text-indigo-600">{scoreData.score}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-indigo-600 h-4 rounded-full transition-all duration-500"
                      style={{ width: `${(scoreData.score / 1000) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Maximum possible score: 1000
                  </p>
                </div>
              </div>

              {githubStats && (
                <div className="border-t pt-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">GitHub Profile Snapshot</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white border rounded-lg p-4 shadow-sm">
                      <p className="text-sm text-gray-500">Followers</p>
                      <p className="text-2xl font-bold text-gray-900">{githubStats.followers}</p>
                    </div>
                    <div className="bg-white border rounded-lg p-4 shadow-sm">
                      <p className="text-sm text-gray-500">Total Stars</p>
                      <p className="text-2xl font-bold text-gray-900">{githubStats.totalStars}</p>
                    </div>
                    <div className="bg-white border rounded-lg p-4 shadow-sm">
                      <p className="text-sm text-gray-500">Public Repositories</p>
                      <p className="text-2xl font-bold text-gray-900">{githubStats.publicRepos}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-2">External Collaboration</p>
                      <p className="text-lg font-semibold text-gray-800">
                        {githubStats.collaborationDiversity ? 'Active collaborator' : 'Mostly solo'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-2">Languages Used</p>
                      <p className="text-lg font-semibold text-gray-800">
                        {githubStats.languageDiversity} distinct languages
                      </p>
                    </div>
                  </div>
                  {githubStats.topRepos?.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-semibold text-gray-600 mb-2">Top Repositories</p>
                      <div className="space-y-3">
                        {githubStats.topRepos.map((repo) => (
                          <a
                            key={repo.url}
                            href={repo.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block border rounded-lg p-4 hover:border-indigo-400 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-gray-900">{repo.name}</span>
                              <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                                ★ {repo.stars}
                              </span>
                            </div>
                            {repo.description && (
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{repo.description}</p>
                            )}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {statsError && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg text-sm">
                  {statsError}
                </div>
              )}

              {flagStatus?.flagged && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  <p className="font-semibold mb-1">FDC Verification Warning</p>
                  <p>
                    This username was previously flagged during verification:
                    <strong> {flagStatus.entry?.reason}</strong>
                  </p>
                  <p className="text-xs text-red-500 mt-1">
                    Flagged at {flagStatus.entry ? new Date(flagStatus.entry.timestamp).toLocaleString() : '—'}
                  </p>
                </div>
              )}

              {boostTips.length > 0 && (
                <div className="border-t pt-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">Recommendations to Boost Your Score</h3>
                  <ul className="list-disc pl-5 space-y-2 text-gray-700">
                    {boostTips.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {!loading && !error && !scoreData && (
            <div className="text-center py-8">
              <p className="text-gray-500">No score found. Calculate and store a score first.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

