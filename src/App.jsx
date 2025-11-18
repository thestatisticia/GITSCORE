import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import GetScore from './pages/GetScore';
import Profile from './pages/Profile';
import Leaderboard from './pages/Leaderboard';
import BulkRanking from './pages/BulkRanking';
import Recommendations from './pages/Recommendations';

function App() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [theme, setTheme] = useState('dark');
  const previousWallet = useRef(null);

  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.request({ method: 'eth_accounts' }).then((accounts) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
        }
      });

      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
        } else {
          setWalletAddress(null);
        }
      });
    }
  }, []);

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  useEffect(() => {
    if (previousWallet.current && previousWallet.current !== walletAddress) {
      localStorage.removeItem('bulkRecommendations');
    }
    previousWallet.current = walletAddress;
  }, [walletAddress]);

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <div className="min-h-screen">
        <Navbar walletAddress={walletAddress} onWalletConnect={setWalletAddress} />
        <Routes>
          <Route path="/" element={<GetScore walletAddress={walletAddress} />} />
          <Route path="/profile" element={<Profile walletAddress={walletAddress} />} />
          <Route path="/leaderboard" element={<Leaderboard walletAddress={walletAddress} />} />
          <Route path="/bulk-ranking" element={<BulkRanking walletAddress={walletAddress} />} />
          <Route path="/recommendations" element={<Recommendations />} />
        </Routes>
        <Footer
          onThemeToggle={(nextTheme) => setTheme(nextTheme)}
          theme={theme}
        />
      </div>
    </Router>
  );
}

export default App;
