import React, { useState } from 'react';
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
          <p className="text-gray-500">
            Upload a document of GitHub usernames, score and verify them via FDC, and surface the standouts.
          </p>
        </header>

        <div className="card space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload usernames file (.txt, .csv)
            </label>
            <input
              type="file"
              accept=".txt,.csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            <p className="text-xs text-gray-500 mt-1">
              Each line or comma-separated value should contain a GitHub username or profile URL.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or paste usernames manually
            </label>
            <textarea
              rows="3"
              onChange={handleManualAdd}
              placeholder="octocat, torvalds, https://github.com/defunkt"
              className="mt-1 block w-full resize-none rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
            ></textarea>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-sm text-gray-600">
              {profiles.length} profiles ready for scoring.
            </p>
            <button
              onClick={handleCalculateScores}
              disabled={profiles.length === 0 || isCalculating}
              className="inline-flex items-center justify-center px-5 py-2 rounded-md bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCalculating ? 'Calculating...' : 'Calculate Scores'}
            </button>
          </div>

          {uploadError && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
              {uploadError}
            </div>
          )}
        </div>

        {profiles.length > 0 && (
          <div className="card overflow-x-auto">
            {recommendations && (
              <div className="mb-6 border border-emerald-100 bg-emerald-50 rounded-lg p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-sm text-emerald-700 mb-1">Recommendation snapshot saved</p>
                    <p className="text-lg font-semibold text-emerald-900">
                      Top performer:{' '}
                      {recommendations.topPerformers?.[0]
                        ? `${recommendations.topPerformers[0].username} (${recommendations.topPerformers[0].score}/1000)`
                        : 'N/A'}
                    </p>
                  </div>
                  <Link
                    to="/recommendations"
                    className="inline-flex px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
                  >
                    View Recommendations Page
                  </Link>
                </div>
              </div>
            )}
            <table className="table-surface">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Username</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Score</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Followers</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Stars</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Repos</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Top Repos</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Verification</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Flag Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Action</th>
                </tr>
              </thead>
                <tbody>
                {sortedProfiles.map((profile, index) => (
                  <tr key={profile.username} className="align-top">
                    <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{profile.username}</div>
                      {profile.error && (
                        <p className="text-xs text-red-500">{profile.error}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {profile.score !== null ? (
                        <div>
                          <p className="font-bold text-indigo-700">{profile.score}</p>
                          <p className="text-xs text-gray-500">/ {SCALING_CONSTANT}</p>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 capitalize">{profile.status}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {profile.githubData?.followers ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {profile.githubData?.totalStars ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {profile.githubData?.publicRepos ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div className="space-y-1">
                        {profile.githubData?.topRepos?.map((repo) => (
                          <a
                            key={repo.url}
                            href={repo.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-indigo-600 hover:underline text-xs"
                          >
                            {repo.name} ({repo.stars}★)
                          </a>
                        )) || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {profile.status === 'verified' && profile.fdc ? (
                        <div className="text-emerald-700">
                          <p className="font-semibold flex items-center">
                            <span className="inline-flex items-center justify-center w-5 h-5 mr-2 rounded-full bg-emerald-600 text-white text-xs">✓</span>
                            FDC Verified
                          </p>
                          <p className="text-xs text-gray-500 break-all">
                            {profile.fdc.fdcAttestationId}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 capitalize">{profile.status}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {profile.flag?.flagged ? (
                        <div className="text-sm text-red-600">
                          <p className="font-semibold">Flagged</p>
                          <p className="text-xs break-all">{profile.flag.entry?.reason}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">None</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleFdcVerify(profile)}
                        disabled={profile.status !== 'scored' || !walletAddress}
                        className="px-4 py-2 text-sm rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Verify via FDC
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

