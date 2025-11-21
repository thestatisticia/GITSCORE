import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { connectWallet, formatAddress } from '../utils/wallet';

const NAV_ITEMS = [
  { path: '/', label: 'HOME' },
  { path: '/profile', label: 'PROFILE' },
  { path: '/leaderboard', label: 'LEADERBOARD' },
  { path: '/bulk-ranking', label: 'BULK' },
  { path: '/recommendations', label: 'INSIGHTS' },
];

const IconButton = ({ children, className = '', ...props }) => (
  <button
    {...props}
    className={`w-10 h-10 rounded-full border border-white/15 flex items-center justify-center text-sm text-white/80 hover:text-white hover:bg-white/10 transition ${className}`}
  >
    {children}
  </button>
);

export default function Navbar({ walletAddress, onWalletConnect }) {
  const location = useLocation();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const { address } = await connectWallet();
      onWalletConnect?.(address);
    } catch (error) {
      if (error.code !== 4001 && error.message !== 'User rejected the request.') {
        alert(`Failed to connect wallet: ${error.message}`);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-30 navbar-shell">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
        <Link to="/" className="flex items-center space-x-3 mr-12">
          <div className="h-9 w-9 rounded-full border border-white/15 flex items-center justify-center text-sm text-white">
            G
          </div>
          <p className="text-xl font-semibold tracking-[0.35em] uppercase text-white">GITSCORE</p>
        </Link>

        <div className="flex items-center gap-6 flex-1 justify-center text-xs tracking-[0.3em]">
          {NAV_ITEMS.map((nav) => (
            <Link
              key={nav.path}
              to={nav.path}
              className={`nav-pill text-xs tracking-[0.25em] ${
                isActive(nav.path)
                  ? 'nav-pill--active'
                  : 'text-white/50 hover:text-white/90 hover:border-white/20'
              }`}
            >
              {nav.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <IconButton aria-label="Notifications">
            🔔
          </IconButton>
          {walletAddress ? (
            <button
              onClick={() => onWalletConnect?.(null)}
              className="secondary-btn w-auto px-4 py-2 text-xs tracking-[0.3em]"
            >
              {formatAddress(walletAddress)}
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="primary-btn w-auto px-5 py-2 text-xs tracking-[0.3em]"
            >
              {isConnecting ? '...' : 'CONNECT'}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}



