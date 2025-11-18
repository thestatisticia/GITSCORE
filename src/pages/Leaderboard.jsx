import { useState, useEffect, useMemo } from 'react';
import { getContract } from '../utils/contract';
import { formatAddress } from '../utils/wallet';

export default function Leaderboard({ walletAddress }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    setLoading(true);
    setError(null);

    try {
      // Use read-only contract (no wallet needed for viewing leaderboard)
      const contract = await getContract(true);
      
      // Get total count
      const count = await contract.getScoreAddressesCount();
      const countNum = parseInt(count.toString());

      if (countNum === 0) {
        setLeaderboard([]);
        setLoading(false);
        return;
      }

      // Fetch all scores
      const scores = [];
      for (let i = 0; i < countNum; i++) {
        try {
          const address = await contract.getScoreAddress(i);
          const latestScore = await contract.getUserLatestScore(address);
          
          scores.push({
            address: address,
            githubUsername: latestScore[0],
            score: parseInt(latestScore[1].toString()),
            timestamp: parseInt(latestScore[2].toString()),
          });
        } catch (err) {
          // Skip addresses that don't have scores
          console.warn(`Skipping address at index ${i}:`, err.message);
        }
      }

      // Sort by score (descending)
      scores.sort((a, b) => b.score - a.score);

      setLeaderboard(scores);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      setError(`Failed to load leaderboard: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const userEntry = useMemo(() => {
    if (!walletAddress) return null;
    return leaderboard.find(
      (entry) => entry.address.toLowerCase() === walletAddress.toLowerCase()
    );
  }, [leaderboard, walletAddress]);

  const userRank = useMemo(() => {
    if (!userEntry) return null;
    const index = leaderboard.findIndex(
      (entry) => entry.address.toLowerCase() === walletAddress.toLowerCase()
    );
    return index >= 0 ? index + 1 : null;
  }, [leaderboard, walletAddress, userEntry]);

  return (
    <div className="gscore-page">
      <div className="gscore-container space-y-6">
        <header className="text-center space-y-3">
          <p className="section-title tracking-[0.4em]">GSCORE LEADERBOARD</p>
          <h1 className="text-4xl font-semibold">Global Signal Board</h1>
          <p className="text-gray-500">
            Every entry is immutably tied to a wallet + GitHub username via GSCORE.
          </p>
        </header>
        {userEntry && (
          <div className="card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="section-title">Your Rank</p>
              <p className="text-3xl font-semibold">
                #{userRank} – {userEntry.githubUsername}
              </p>
            </div>
            <div className="pill">{userEntry.score} / 1000</div>
          </div>
        )}

        <div className="card">
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-500">Loading leaderboard...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-md mb-4">
              {error}
            </div>
          )}

          {!loading && leaderboard.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No scores found yet. Be the first to store a score!</p>
            </div>
          )}

          {!loading && leaderboard.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Wallet Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      GitHub Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stored On
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leaderboard.map((entry, index) => {
                    const isUserRow =
                      walletAddress &&
                      entry.address.toLowerCase() === walletAddress.toLowerCase();
                    return (
                      <tr
                        key={entry.address}
                        className={`hover:bg-gray-50 ${isUserRow ? 'bg-indigo-50' : ''}`}
                      >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-lg font-bold text-gray-900">
                          {getRankIcon(index + 1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                        <span className="text-sm font-mono text-gray-700">
                          {formatAddress(entry.address)}
                        </span>
                          {isUserRow && (
                            <span className="text-xs text-indigo-600 font-semibold">
                              Your address
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <a
                          href={`https://github.com/${entry.githubUsername}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          {entry.githubUsername}
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-lg font-bold text-indigo-600">
                          {entry.score}
                        </span>
                        <span className="text-sm text-gray-500"> / 1000</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(entry.timestamp * 1000).toLocaleDateString()}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && leaderboard.length > 0 && (
            <div className="mt-6 text-center">
              <button
                onClick={loadLeaderboard}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Refresh Leaderboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

