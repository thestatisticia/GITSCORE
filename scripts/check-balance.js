import { createPublicClient, http, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import dotenv from 'dotenv';

dotenv.config();

const FLARE_TESTNET = {
  id: 88888,
  name: 'Flare Testnet (Coston)',
  network: 'flare-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Coston FLR',
    symbol: 'C2FLR',
  },
  rpcUrls: {
    default: {
      http: ['https://coston-api.flare.network/ext/C/rpc'],
    },
  },
};

async function checkBalance() {
  if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY not found in .env file');
  }

  const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY.replace(/^0x/, '')}`);
  console.log(`Checking balance for: ${account.address}`);

  const publicClient = createPublicClient({
    chain: FLARE_TESTNET,
    transport: http(FLARE_TESTNET.rpcUrls.default.http[0]),
  });

  try {
    const balance = await publicClient.getBalance({ address: account.address });
    console.log(`Balance: ${formatEther(balance)} C2FLR`);
    console.log(`Balance (wei): ${balance.toString()}`);
    
    // Also check block number to verify RPC is working
    const blockNumber = await publicClient.getBlockNumber();
    console.log(`Current block: ${blockNumber}`);
  } catch (error) {
    console.error('Error checking balance:', error.message);
  }
}

checkBalance();

