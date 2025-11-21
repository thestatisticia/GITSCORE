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
          <p className="text-white/60">
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

        <div className="card card--fluid table-card space-y-6">
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white/60"></div>
              <p className="mt-4 text-white/60">Loading leaderboard...</p>
            </div>
          )}

          {error && (
            <div className="alert-card alert-card--danger mb-4">
              {error}
            </div>
          )}

          {!loading && leaderboard.length === 0 && (
            <div className="text-center py-12">
              <p className="text-white/60 text-lg">No scores found yet. Be the first to store a score!</p>
            </div>
          )}

          {!loading && leaderboard.length > 0 && (
            <div className="table-wrapper">
              <table className="table-surface">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Wallet Address</th>
                    <th>GitHub Username</th>
                    <th>Score</th>
                    <th>Stored On</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, index) => {
                    const isUserRow =
                      walletAddress &&
                      entry.address.toLowerCase() === walletAddress.toLowerCase();
                    return (
                      <tr
                        key={entry.address}
                        className={`align-top ${isUserRow ? 'table-row--active' : ''}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-lg font-bold">
                            {getRankIcon(index + 1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-sm font-mono text-white/80">
                              {formatAddress(entry.address)}
                            </span>
                            {isUserRow && (
                              <span className="text-xs text-white/70 font-semibold">
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
                            className="text-sm font-medium"
                            style={{ color: 'var(--accent)' }}
                          >
                            {entry.githubUsername}
                          </a>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-lg font-bold">
                            {entry.score}
                          </span>
                          <span className="text-sm text-white/50"> / 1000</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">
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
                className="secondary-btn w-auto px-6 py-2 text-xs tracking-[0.25em]"
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

