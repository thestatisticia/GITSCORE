import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SCALING_CONSTANT } from '../utils/github';

export default function Recommendations() {
  const snapshot = useMemo(() => {
    try {
      const stored = localStorage.getItem('bulkRecommendations');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to load recommendations snapshot', error);
      return null;
    }
  }, []);

  if (!snapshot) {
    return (
      <div className="gscore-page">
        <div className="gscore-container">
          <div className="card text-center space-y-4">
            <h1 className="text-3xl font-semibold">Recommendations</h1>
            <p className="text-gray-500">
              Upload a bulk GitHub document and calculate scores first. Your latest recommendations
              will appear here automatically.
            </p>
            <Link to="/bulk-ranking" className="primary-btn w-auto px-8 mx-auto">
              Go to Bulk Ranking
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { recommendations } = snapshot;

  return (
    <div className="gscore-page">
      <div className="gscore-container space-y-6">
        <header className="text-center space-y-3">
          <p className="section-title tracking-[0.4em]">GSCORE INSIGHTS</p>
          <h1 className="text-4xl font-semibold">Recommendation Insights</h1>
          <p className="text-gray-500">
            Based on your latest bulk scoring batch ({new Date(snapshot.timestamp).toLocaleString()}).
          </p>
        </header>

        <div className="card space-y-6">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Top Recommended Profiles</h2>
            {recommendations.topPerformers?.length ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recommendations.topPerformers.map((profile) => (
                  <div
                    key={profile.username}
                    className="border rounded-lg p-4 bg-gray-50 shadow-sm"
                  >
                    <p className="text-sm text-gray-500 mb-1">Rank {profile.rank}</p>
                    <p className="text-xl font-bold text-gray-900">{profile.username}</p>
                    <p className="text-lg text-indigo-700 font-semibold">
                      {profile.score} <span className="text-sm text-gray-500">/ {SCALING_CONSTANT}</span>
                    </p>
                    <ul className="text-sm text-gray-600 mt-2 space-y-1">
                      <li>Followers: {profile.followers ?? '—'}</li>
                      <li>Total Stars: {profile.stars ?? '—'}</li>
                      <li>Status: {profile.verification}</li>
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No scored profiles yet.</p>
            )}
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Standout Repositories</h2>
            {recommendations.standoutRepos?.length ? (
              <div className="space-y-3">
                {recommendations.standoutRepos.map((repo) => (
                  <a
                    key={`${repo.owner}-${repo.url}`}
                    href={repo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block border rounded-lg p-4 hover:border-indigo-400 transition-colors bg-white shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">{repo.owner}</p>
                        <p className="text-lg font-semibold text-gray-900">{repo.name}</p>
                      </div>
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                        ★ {repo.stars}
                      </span>
                    </div>
                    {repo.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{repo.description}</p>
                    )}
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No standout repos captured yet.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

