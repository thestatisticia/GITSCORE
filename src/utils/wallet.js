import { ethers } from 'ethers';

// Flare Testnet configuration (Coston2)
const FLARE_TESTNET = {
  chainId: '0x72', // 114 in hex (Coston2)
  chainName: 'Flare Testnet Coston2',
  nativeCurrency: {
    name: 'Coston2 FLR',
    symbol: 'C2FLR',
    decimals: 18,
  },
  rpcUrls: ['https://coston2-api.flare.network/ext/C/rpc'],
  blockExplorerUrls: ['https://coston2-explorer.flare.network'],
};

export const connectWallet = async () => {
  if (typeof window.ethereum !== 'undefined') {
    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      // Check if we're on the correct network
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      
      if (chainId !== FLARE_TESTNET.chainId) {
        // Switch to Flare Testnet
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: FLARE_TESTNET.chainId }],
          });
        } catch (switchError) {
          // If the chain doesn't exist, add it
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [FLARE_TESTNET],
            });
          } else {
            throw switchError;
          }
        }
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      return { address, provider, signer };
    } catch (error) {
      // Don't show alert if user rejected the request
      if (error.code !== 4001 && error.message !== 'User rejected the request.') {
        console.error('Error connecting wallet:', error);
      }
      throw error;
    }
  } else {
    throw new Error('MetaMask or compatible wallet not found');
  }
};

export const formatAddress = (address) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
