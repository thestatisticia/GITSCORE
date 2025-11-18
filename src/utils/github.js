const SCALING_CONSTANT = 1000;
const API_BASE_URL = 'https://api.github.com';

const WEIGHTS = {
  followers: 0.30,
  totalStars: 0.25,
  recentActivityScore: 0.20,
  publicRepos: 0.15,
  collaborationDiversity: 0.10,
};

const normalize = (value, max) => (max > 0 ? Math.min(1, value / max) : 0);

const calculateRecentActivityScore = (dateString) => {
  const lastPush = new Date(dateString);
  const now = new Date();
  const days = (now - lastPush) / (1000 * 60 * 60 * 24);
  const maxDays = 365;
  return Math.max(0, 1 - days / maxDays);
};

const extractTopRepos = (reposData, limit = 3) => {
  const sorted = [...reposData].sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0));
  return sorted.slice(0, limit).map((repo) => ({
    name: repo.name,
    stars: repo.stargazers_count,
    url: repo.html_url,
    description: repo.description,
    language: repo.language,
  }));
};

export const fetchGitHubData = async (username, token = null) => {
  const headers = token ? { Authorization: `token ${token}` } : {};

  const userUrl = `${API_BASE_URL}/users/${username}`;
  const userRes = await fetch(userUrl, { headers });
  if (!userRes.ok) {
    throw new Error(`GitHub API Error: ${userRes.statusText} (${userRes.status})`);
  }
  const userData = await userRes.json();

  const reposUrl = `${API_BASE_URL}/users/${username}/repos?type=owner&sort=pushed&per_page=100`;
  const reposRes = await fetch(reposUrl, { headers });
  if (!reposRes.ok) {
    throw new Error(`GitHub API Error (Repositories): ${reposRes.statusText}`);
  }
  const reposData = await reposRes.json();

  let totalStars = 0;
  let recentActivityScores = [];
  let languageSet = new Set();

  reposData.forEach((repo, index) => {
    totalStars += repo.stargazers_count;
    if (index < 5) {
      recentActivityScores.push(calculateRecentActivityScore(repo.pushed_at));
    }
    if (repo.language) {
      languageSet.add(repo.language);
    }
  });

  const eventsUrl = `${API_BASE_URL}/users/${username}/events/public?per_page=100`;
  const eventsRes = await fetch(eventsUrl);
  let collaborationDiversityCount = 0;
  if (eventsRes.ok) {
    const eventsData = await eventsRes.json();
    collaborationDiversityCount = eventsData.filter((event) =>
      (event.type === 'PullRequestEvent' || event.type === 'IssuesEvent') &&
      event.repo.name.split('/')[0].toLowerCase() !== username.toLowerCase()
    ).length > 0 ? 1 : 0;
  }

  const avgRecentActivity = recentActivityScores.length > 0
    ? recentActivityScores.reduce((a, b) => a + b, 0) / recentActivityScores.length
    : 0;

  return {
    username: userData.login,
    followers: userData.followers,
    totalStars,
    publicRepos: userData.public_repos,
    avgRecentActivity,
    collaborationDiversity: collaborationDiversityCount,
    languageDiversity: languageSet.size,
    topRepos: extractTopRepos(reposData),
  };
};

export const calculateScore = (data) => {
  const BENCHMARKS = {
    maxFollowers: 5000,
    maxTotalStars: 50000,
    maxPublicRepos: 100,
    maxRecentActivity: 1.0,
    maxCollaborationDiversity: 1.0,
  };

  const normalizedFactors = {
    followers: normalize(data.followers, BENCHMARKS.maxFollowers),
    totalStars: normalize(data.totalStars, BENCHMARKS.maxTotalStars),
    publicRepos: normalize(data.publicRepos, BENCHMARKS.maxPublicRepos),
    recentActivityScore: normalize(data.avgRecentActivity, BENCHMARKS.maxRecentActivity),
    collaborationDiversity: normalize(data.collaborationDiversity, BENCHMARKS.maxCollaborationDiversity),
  };

  const finalScore = (
    (normalizedFactors.followers * WEIGHTS.followers) +
    (normalizedFactors.totalStars * WEIGHTS.totalStars) +
    (normalizedFactors.publicRepos * WEIGHTS.publicRepos) +
    (normalizedFactors.recentActivityScore * WEIGHTS.recentActivityScore) +
    (normalizedFactors.collaborationDiversity * WEIGHTS.collaborationDiversity)
  ) * SCALING_CONSTANT;

  return { score: Math.round(finalScore), normalizedFactors };
};

export { SCALING_CONSTANT, WEIGHTS };


