import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchGitHubData, calculateScore, SCALING_CONSTANT } from '../utils/github';
import { storeFdcVerifiedScore, getFdcFlagStatus } from '../utils/contract';

const parseUsernames = (text) => {
  return Array.from(
    new Set(
      text
        .split(/[\s,]+/)
        .map((entry) => entry.trim().replace(/^https?:\/\/github\.com\//i, '').replace('@', ''))
        .filter(Boolean)
    )
  );
};

const initialProfile = (username) => ({
  username,
  status: 'pending',
  score: null,
  githubData: null,
  normalizedFactors: null,
  error: null,
  fdc: null,
  flag: null,
});

export default function BulkRanking({ walletAddress }) {
  const [profiles, setProfiles] = useState([]);
  const [uploadError, setUploadError] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [recommendations, setRecommendations] = useState(null);

  useEffect(() => {
    setProfiles([]);
    setUploadError(null);
    setRecommendations(null);
  }, [walletAddress]);

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const parsed = parseUsernames(text);
        if (parsed.length === 0) {
          setUploadError('No GitHub usernames found in the document.');
          return;
        }
        setUploadError(null);
        setProfiles(parsed.map(initialProfile));
      } catch (error) {
        setUploadError('Failed to parse document.');
      }
    };
    reader.readAsText(file);
  };

  const handleManualAdd = (event) => {
    const text = event.target.value;
    const parsed = parseUsernames(text);
    setProfiles(parsed.map(initialProfile));
  };

  const updateProfile = (username, updater) => {
    setProfiles((prev) =>
      prev.map((profile) =>
        profile.username === username ? { ...profile, ...updater(profile) } : profile
      )
    );
  };

  const refreshFlagStatus = async (username) => {
    try {
      const result = await getFdcFlagStatus(username);
      updateProfile(username, () => ({ flag: result }));
    } catch (error) {
      console.warn('Failed to fetch flag status for', username, error);
    }
  };

  const summarizeRecommendations = (scoredProfiles) => {
    const valid = scoredProfiles.filter((profile) => profile.score !== null && !profile.error);
    if (valid.length === 0) {
      setRecommendations(null);
      localStorage.removeItem('bulkRecommendations');
      return;
    }

    const sorted = [...valid].sort((a, b) => b.score - a.score);
    const topPerformers = sorted.slice(0, 3).map((profile, index) => ({
      rank: index + 1,
      username: profile.username,
      score: profile.score,
      followers: profile.githubData?.followers,
      stars: profile.githubData?.totalStars,
      verification: profile.fdc?.fdcAttestationId ? 'FDC Verified' : 'Unverified',
    }));

    const repoPool = [];
    valid.forEach((profile) => {
      profile.githubData?.topRepos?.forEach((repo) => {
        repoPool.push({
          owner: profile.username,
          ...repo,
        });
      });
    });
    repoPool.sort((a, b) => (b.stars || 0) - (a.stars || 0));

    const payload = {
      timestamp: Date.now(),
      recommendations: {
        topPerformers,
        standoutRepos: repoPool.slice(0, 5),
      },
      profiles: sorted,
    };

    setRecommendations(payload.recommendations);
    localStorage.setItem('bulkRecommendations', JSON.stringify(payload));
  };

  const handleCalculateScores = async () => {
    if (profiles.length === 0) {
      setUploadError('Upload a document or paste usernames first.');
      return;
    }

    setIsCalculating(true);
    for (const profile of profiles) {
      updateProfile(profile.username, () => ({ status: 'calculating', error: null }));
      try {
        const data = await fetchGitHubData(profile.username);
        const { score, normalizedFactors } = calculateScore(data);
        updateProfile(profile.username, () => ({
          status: 'scored',
          score,
          githubData: data,
          normalizedFactors,
        }));
        refreshFlagStatus(profile.username);
      } catch (error) {
        updateProfile(profile.username, () => ({
          status: 'error',
          error: error.message,
        }));
      }
    }
    setIsCalculating(false);
    setProfiles((prev) => {
      summarizeRecommendations(prev);
      return prev;
    });
  };

  const handleFdcVerify = async (profile) => {
    if (!walletAddress) {
      alert('Connect your wallet first.');
      return;
    }

    updateProfile(profile.username, () => ({ status: 'verifying' }));
    try {
      const response = await storeFdcVerifiedScore(walletAddress, profile.username);
      updateProfile(profile.username, () => ({
        status: 'verified',
        fdc: response,
      }));
      refreshFlagStatus(profile.username);
    } catch (error) {
      updateProfile(profile.username, () => ({
        status: 'scored',
        error: error.message,
      }));
      alert(`FDC verification failed for ${profile.username}: ${error.message}`);
    }
  };

  const sortedProfiles = [...profiles].sort((a, b) => (b.score || 0) - (a.score || 0));

  return (
    <div className="gscore-page">
      <div className="gscore-container space-y-6">
        <header className="text-center space-y-3">
          <p className="section-title tracking-[0.4em]">GSCORE BULK MODE</p>
          <h1 className="text-4xl font-semibold">Rank Entire Cohorts in Minutes</h1>
          <p className="text-white/60">
            Upload a document of GitHub usernames, score and verify them via FDC, and surface the standouts.
          </p>
        </header>

        <div className="card space-y-6">
          <div className="input-grid">
            <div className="input-stack full-span">
              <label>Upload usernames file (.txt, .csv)</label>
              <input
                type="file"
                accept=".txt,.csv"
                onChange={handleFileUpload}
                className="input-field cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border file:border-white/20 file:bg-white/10 file:text-white/80 file:uppercase file:tracking-[0.2em]"
              />
              <p className="field-hint">
                Each line or comma-separated value should contain a GitHub username or profile URL.
              </p>
            </div>

            <div className="input-stack full-span">
              <label>Or paste usernames manually</label>
              <textarea
                rows="3"
                onChange={handleManualAdd}
                placeholder="octocat, torvalds, https://github.com/defunkt"
                className="input-field min-h-[140px] resize-none"
              ></textarea>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-sm text-white/70">
              {profiles.length} profiles ready for scoring.
            </p>
            <button
              onClick={handleCalculateScores}
              disabled={profiles.length === 0 || isCalculating}
              className="primary-btn w-auto px-8 disabled:opacity-40"
            >
              {isCalculating ? 'Calculating...' : 'Calculate Scores'}
            </button>
          </div>

          {uploadError && (
            <div className="alert-card alert-card--danger text-sm">
              {uploadError}
            </div>
          )}
        </div>

        {profiles.length > 0 && (
          <div className="card card--fluid table-card">
            {recommendations && (
              <div className="info-banner info-banner--accent mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-sm text-white/70 mb-1">Recommendation snapshot saved</p>
                    <p className="text-lg font-semibold text-white">
                      Top performer:{' '}
                      {recommendations.topPerformers?.[0]
                        ? `${recommendations.topPerformers[0].username} (${recommendations.topPerformers[0].score}/1000)`
                        : 'N/A'}
                    </p>
                  </div>
                  <Link
                    to="/recommendations"
                    className="secondary-btn w-auto px-6 py-2 text-xs tracking-[0.2em]"
                  >
                    View Recommendations Page
                  </Link>
                </div>
              </div>
            )}
            <div className="table-wrapper p-0">
              <table className="table-surface">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Username</th>
                    <th>Score</th>
                    <th>Followers</th>
                    <th>Stars</th>
                    <th>Repos</th>
                    <th>Top Repos</th>
                    <th>Verification</th>
                    <th>Flag Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedProfiles.map((profile, index) => (
                    <tr key={profile.username} className="align-top">
                      <td className="px-4 py-3 text-sm text-white/70">{index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold">{profile.username}</div>
                        {profile.error && (
                          <p className="text-xs text-red-400">{profile.error}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {profile.score !== null ? (
                          <div>
                            <p className="font-bold">{profile.score}</p>
                            <p className="text-xs text-white/60">/ {SCALING_CONSTANT}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-white/50 capitalize">{profile.status}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-white/80">
                        {profile.githubData?.followers ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-white/80">
                        {profile.githubData?.totalStars ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-white/80">
                        {profile.githubData?.publicRepos ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-white/80">
                        <div className="space-y-1">
                          {profile.githubData?.topRepos?.length ? (
                            profile.githubData.topRepos.map((repo) => (
                              <a
                                key={repo.url}
                                href={repo.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block text-xs"
                                style={{ color: 'var(--accent)' }}
                              >
                                {repo.name} ({repo.stars}★)
                              </a>
                            ))
                          ) : (
                            <span>-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {profile.status === 'verified' && profile.fdc ? (
                          <div className="text-white">
                            <p className="font-semibold flex items-center gap-2">
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-400 text-black text-xs">✓</span>
                              FDC Verified
                            </p>
                            <p className="text-xs text-white/60 break-all">
                              {profile.fdc.fdcAttestationId}
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-white/60 capitalize">{profile.status}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {profile.flag?.flagged ? (
                          <div className="text-sm text-white">
                            <p className="font-semibold" style={{ color: 'var(--danger)' }}>Flagged</p>
                            <p className="text-xs break-all text-white/70">{profile.flag.entry?.reason}</p>
                          </div>
                        ) : (
                          <p className="text-xs text-white/60">None</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleFdcVerify(profile)}
                          disabled={profile.status !== 'scored' || !walletAddress}
                          className="secondary-btn w-auto px-5 py-2 text-xs tracking-[0.2em] disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Verify via FDC
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

