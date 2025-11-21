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
      <div className="gscore-page">
        <div className="gscore-container">
          <div className="card empty-state space-y-3">
            <p className="section-title">GSCORE PROFILE</p>
            <p className="text-lg text-white/70">Please connect your wallet to view your profile.</p>
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
          <p className="text-white/60">
            Wallet-bound GitHub metrics, FDC attestation status, and personalized recommendations.
          </p>
        </header>

        <div className="card space-y-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Wallet Address</h2>
            <p className="text-white/70 font-mono">{formatAddress(walletAddress)}</p>
          </div>

          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white/60"></div>
              <p className="mt-2 text-white/60">Loading profile...</p>
            </div>
          )}

          {error && (
            <div className="alert-card alert-card--danger">
              {error}
            </div>
          )}

          {scoreData && !loading && (
            <div className="space-y-6">
              <div className="border-t border-white/5 pt-6 space-y-4">
                <h2 className="text-2xl font-bold mb-2">Latest Score</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="stat-card">
                    <p className="stat-card__hint mb-2">GitHub Username</p>
                    <p className="stat-card__value">{scoreData.githubUsername}</p>
                  </div>
                  <div className="stat-card">
                    <p className="stat-card__hint mb-2">Score</p>
                    <p className="stat-card__value" style={{ color: 'var(--accent)' }}>
                      {scoreData.score} / 1000
                    </p>
                  </div>
                  <div className="stat-card">
                    <p className="stat-card__hint mb-2">Stored On</p>
                    <p className="stat-card__value">
                      {new Date(scoreData.timestamp * 1000).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="stat-card">
                    <p className="stat-card__hint mb-2">Verification</p>
                    {verificationStatus?.verified ? (
                      <div>
                        <p className="font-semibold flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-400 text-black text-xs">✓</span>
                          FDC Verified
                        </p>
                        <p className="text-xs text-white/60 break-all mt-2">
                          {verificationStatus.attestationId}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-white/70">User Submitted</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-6 space-y-3">
                <h3 className="text-lg font-semibold">Score Details</h3>
                <div className="stat-card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/70">Score Value:</span>
                    <span className="text-2xl font-bold">{scoreData.score}</span>
                  </div>
                  <div className="score-bar h-3">
                    <div
                      className="score-bar__value"
                      style={{ width: `${(scoreData.score / 1000) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-white/60 mt-2">
                    Maximum possible score: 1000
                  </p>
                </div>
              </div>

              {githubStats && (
                <div className="border-t border-white/5 pt-6">
                  <h3 className="text-xl font-semibold mb-3">GitHub Profile Snapshot</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="stat-card">
                      <p className="stat-card__hint mb-1">Followers</p>
                      <p className="text-3xl font-bold">{githubStats.followers}</p>
                    </div>
                    <div className="stat-card">
                      <p className="stat-card__hint mb-1">Total Stars</p>
                      <p className="text-3xl font-bold">{githubStats.totalStars}</p>
                    </div>
                    <div className="stat-card">
                      <p className="stat-card__hint mb-1">Public Repositories</p>
                      <p className="text-3xl font-bold">{githubStats.publicRepos}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="stat-card">
                      <p className="text-sm text-white/60 mb-2">External Collaboration</p>
                      <p className="text-lg font-semibold">
                        {githubStats.collaborationDiversity ? 'Active collaborator' : 'Mostly solo'}
                      </p>
                    </div>
                    <div className="stat-card">
                      <p className="text-sm text-white/60 mb-2">Languages Used</p>
                      <p className="text-lg font-semibold">
                        {githubStats.languageDiversity} distinct languages
                      </p>
                    </div>
                  </div>
                  {githubStats.topRepos?.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-semibold text-white/70 mb-2">Top Repositories</p>
                      <div className="space-y-3">
                        {githubStats.topRepos.map((repo) => (
                          <a
                            key={repo.url}
                            href={repo.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block stat-card hover:border-white/40 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">{repo.name}</span>
                              <span className="table-tag">
                                ★ {repo.stars}
                              </span>
                            </div>
                            {repo.description && (
                              <p className="text-sm text-white/70 mt-2 line-clamp-2">{repo.description}</p>
                            )}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {statsError && (
                <div className="alert-card alert-card--warning text-sm">
                  {statsError}
                </div>
              )}

              {flagStatus?.flagged && (
                <div className="alert-card alert-card--danger text-sm">
                  <p className="font-semibold mb-1">FDC Verification Warning</p>
                  <p>
                    This username was previously flagged during verification:
                    <strong> {flagStatus.entry?.reason}</strong>
                  </p>
                  <p className="text-xs text-white/70 mt-1">
                    Flagged at {flagStatus.entry ? new Date(flagStatus.entry.timestamp).toLocaleString() : '—'}
                  </p>
                </div>
              )}

              {boostTips.length > 0 && (
                <div className="border-t border-white/5 pt-6">
                  <h3 className="text-xl font-semibold mb-3">Recommendations to Boost Your Score</h3>
                  <ul className="list-disc pl-5 space-y-2 text-white/80">
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
              <p className="text-white/60">No score found. Calculate and store a score first.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

