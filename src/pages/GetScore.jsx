import React, { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { storeScore, storeFdcVerifiedScore, getContract, getFdcFlagStatus } from '../utils/contract';
import { SCALING_CONSTANT, WEIGHTS, fetchGitHubData, calculateScore } from '../utils/github';

const GithubIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22V17M9 22v-5"/>
    <path d="M12 2a4 4 0 0 0-4 4c0 2.2 2 4 4 4s4-1.8 4-4a4 4 0 0 0-4-4z"/>
    <path d="M12 10c-3.3 0-6 2.7-6 6v4h12v-4c0-3.3-2.7-6-6-6z"/>
  </svg>
);

const GaugeIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a10 10 0 1 0 10 10"/>
    <path d="M15.5 8.5L12 12V6"/>
    <path d="M18.8 15.5L12 12"/>
  </svg>
);

export default function GetScore({ walletAddress }) {
  const [githubUsername, setGithubUsername] = useState('');
  const [githubPat, setGithubPat] = useState('');
  const [score, setScore] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStoring, setIsStoring] = useState(false);
  const [error, setError] = useState(null);
  const [rawData, setRawData] = useState(null);
  const [fdcStatus, setFdcStatus] = useState(null);
  const [isFdcStoring, setIsFdcStoring] = useState(false);
  const [flagStatus, setFlagStatus] = useState(null);
  const ensureWalletLockedUsername = useCallback(
    async (targetUsername) => {
      if (!walletAddress) return;
      try {
        const contract = await getContract(true);
        const latest = await contract.getUserLatestScore(walletAddress);
        const existing = latest[0];
        if (
          existing &&
          existing.length > 0 &&
          existing.toLowerCase() !== targetUsername.toLowerCase()
        ) {
          throw new Error(
            `This wallet is locked to GitHub username "${existing}". You can view other profiles but cannot store a different username.`
          );
        }
      } catch (err) {
        if (err.message?.includes('No score found')) {
          return;
        }
        throw err;
      }
    },
    [walletAddress]
  );

  const fetchGitHubProfile = useCallback(fetchGitHubData, []);
  const computeScore = useCallback(calculateScore, []);

  useEffect(() => {
    setGithubUsername('');
    setGithubPat('');
    setScore(null);
    setRawData(null);
    setError(null);
    setFdcStatus(null);
  }, [walletAddress]);

  useEffect(() => {
    const controller = new AbortController();
    const lookup = async () => {
      const targetUsername = githubUsername.trim().split('/').pop();
      if (!targetUsername) {
        setFlagStatus(null);
        return;
      }
      try {
        const flagInfo = await getFdcFlagStatus(targetUsername);
        if (!controller.signal.aborted) {
          setFlagStatus(flagInfo);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setFlagStatus(null);
        }
      }
    };
    lookup();
    return () => controller.abort();
  }, [githubUsername]);

  const handleScoreCalculation = async (e) => {
    e.preventDefault();

    if (!walletAddress) {
      setError('Please connect your wallet first.');
      return;
    }

    const targetUsername = githubUsername.trim().split('/').pop();
    if (!targetUsername) {
      setError('Please enter a valid GitHub username or profile link.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setScore(null);
    setRawData(null);
    setFdcStatus(null);

    try {
      // Require a wallet signature before fetching any GitHub data so the user explicitly approves the action
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      await signer.signMessage(`Authorize GitHub score calculation for ${targetUsername} at ${new Date().toISOString()}`);

      const rawData = await fetchGitHubProfile(targetUsername, githubPat.trim() || null);
      const { score, normalizedFactors } = computeScore(rawData);
      setScore(score);
      setRawData({ ...rawData, normalizedFactors });
    } catch (e) {
      console.error("Scoring failed:", e);
      setError(e.message || 'An unknown error occurred while fetching GitHub data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStoreScore = async () => {
    if (!walletAddress || !score || !rawData) {
      setError('Please calculate a score first.');
      return;
    }

    setIsStoring(true);
    setError(null);

    try {
      const targetUsername = githubUsername.trim().split('/').pop();
      await ensureWalletLockedUsername(targetUsername);
      // This will trigger MetaMask popup
      const tx = await storeScore(walletAddress, targetUsername, score);
      alert(`Score stored on-chain! Transaction: ${tx.hash}`);
      console.log('Transaction hash:', tx.hash);
    } catch (e) {
      console.error("Storing score failed:", e);
      setError(`Failed to store score on-chain: ${e.message}`);
    } finally {
      setIsStoring(false);
    }
  };

  const handleStoreFdcScore = async () => {
    if (!walletAddress || !score || !rawData) {
      setError('Please calculate a score first.');
      return;
    }

    setIsFdcStoring(true);
    setError(null);

    try {
      const targetUsername = githubUsername.trim().split('/').pop();
      await ensureWalletLockedUsername(targetUsername);
      const response = await storeFdcVerifiedScore(walletAddress, targetUsername, githubPat.trim() || null);
      setFdcStatus({
        transactionHash: response.transactionHash,
        attestationId: response.fdcAttestationId,
      });
      alert(`FDC-verified score stored! Transaction: ${response.transactionHash}`);
    } catch (e) {
      console.error('Storing FDC score failed:', e);
      setError(`FDC storage failed: ${e.message}`);
    } finally {
      setIsFdcStoring(false);
    }
  };

  const targetUsername = githubUsername.trim().split('/').pop() || 'Profile';
  const factorData = rawData ? [
    { label: 'Followers', key: 'followers', weight: WEIGHTS.followers, raw: rawData.followers },
    { label: 'Total Stars', key: 'totalStars', weight: WEIGHTS.totalStars, raw: rawData.totalStars },
    { label: 'Recent Activity (Avg. 5 Repos)', key: 'recentActivityScore', weight: WEIGHTS.recentActivityScore, raw: (rawData.avgRecentActivity * 100).toFixed(1) + '%' },
    { label: 'Public Repositories', key: 'publicRepos', weight: WEIGHTS.publicRepos, raw: rawData.publicRepos },
    { label: 'External Collaboration', key: 'collaborationDiversity', weight: WEIGHTS.collaborationDiversity, raw: rawData.collaborationDiversity === 1 ? 'Yes' : 'No' },
  ] : [];

  return (
    <div className="gscore-page">
      <div className="gscore-container space-y-8">
        <header className="text-center space-y-3">
          <p className="section-title tracking-[0.4em]">GSCORE CALCULATOR</p>
          <h1 className="text-4xl font-semibold">Measure. Verify. Signal.</h1>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Upload any GitHub profile, calculate the score, and anchor it on Flare with an FDC
            attestation badge.
          </p>
        </header>

        <div className="card space-y-4">
          <h2 className="section-title flex items-center">
            <GithubIcon className="w-5 h-5 mr-2" />
            Profile Input
          </h2>

          <form onSubmit={handleScoreCalculation} className="space-y-4">
            <div>
              <label htmlFor="github-profile" className="text-xs tracking-[0.3em] uppercase text-gray-500">
                GitHub Username
              </label>
              <input
                id="github-profile"
                type="text"
                value={githubUsername}
                onChange={(e) => setGithubUsername(e.target.value)}
                placeholder="e.g., octocat"
                required
                className="input-field mt-2"
              />
            </div>

            {flagStatus?.flagged && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs">
                Warning: this username was previously flagged during FDC verification ({flagStatus.entry?.reason}).
                Scores may fail to verify until the issue is resolved.
              </div>
            )}

            <div>
              <label htmlFor="github-pat" className="text-xs tracking-[0.3em] uppercase text-gray-500">
                Personal Access Token (Optional)
              </label>
              <input
                id="github-pat"
                type="password"
                value={githubPat}
                onChange={(e) => setGithubPat(e.target.value)}
                placeholder="Paste PAT here to include private data"
                className="input-field mt-2"
              />
              <p className="mt-2 text-xs text-gray-500">
                Only use tokens with minimal permissions.
              </p>
            </div>

            <button
              type="submit"
              disabled={!walletAddress || isLoading}
              className="primary-btn mt-4"
            >
              {isLoading ? 'Calculating…' : `Calculate Score for ${targetUsername}`}
            </button>

            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
                Error: {error}
              </div>
            )}
          </form>
        </div>

        {score && rawData && (
          <div className="card space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="section-title">Final GitHub Score</p>
                <p className="text-5xl font-semibold">{score}</p>
                <p className="text-sm text-gray-500">Out of {SCALING_CONSTANT}</p>
              </div>
              <div className="pill">
                {rawData.followers} followers • {rawData.publicRepos} repos
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="section-title">Score Breakdown</h3>
              {factorData.map((factor) => {
                const normalized = rawData.normalizedFactors[factor.key];
                const contribution = normalized * factor.weight * SCALING_CONSTANT;
                const percentage = normalized * 100;
                const barWidth = Math.min(100, Math.max(5, percentage));

                return (
                  <div key={factor.key} className="bg-gray-50 p-3 rounded-lg shadow-sm">
                    <div className="flex justify-between items-center text-sm font-medium mb-2">
                      <span>{factor.label}</span>
                      <span className="text-gray-500">Raw: {factor.raw}</span>
                      <span>
                        {contribution.toFixed(0)} ({factor.weight * 100}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-indigo-400 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${barWidth}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {walletAddress && (
              <div className="space-y-3">
              <button
                onClick={handleStoreScore}
                disabled={isStoring}
                  className="primary-btn"
                >
                  {isStoring ? 'Storing on Flare…' : 'Store Score (Wallet Tx)'}
                </button>

                <button
                  onClick={handleStoreFdcScore}
                  disabled={isFdcStoring}
                  className="secondary-btn"
              >
                  {isFdcStoring ? 'Verifying via FDC…' : 'Store with FDC Verification'}
              </button>
                <p className="text-xs text-gray-500 text-center">
                  FDC-verified storage routes the data through the backend owner wallet and tags it on-chain as verified.
                </p>
              </div>
            )}

            {fdcStatus && (
              <div className="p-4 border border-emerald-300 bg-emerald-50 rounded-lg text-sm text-emerald-800">
                <p className="font-semibold flex items-center">
                  <span className="inline-flex items-center justify-center w-5 h-5 mr-2 rounded-full bg-emerald-600 text-white text-xs">✓</span>
                  FDC verification successful
                </p>
                <p className="mt-2 break-all">
                  Attestation ID: <span className="font-mono">{fdcStatus.attestationId}</span>
                </p>
                <p className="mt-1 break-all">
                  Transaction: <span className="font-mono">{fdcStatus.transactionHash}</span>
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

