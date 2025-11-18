import { createWalletClient, createPublicClient, http, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Flare Testnet (Coston) Network Configuration
// Note: There are two Coston testnets - Coston (88888) and Coston2 (114)
// Trying Coston first, will check if balance exists
const FLARE_TESTNET = {
  id: 88888, // Coston testnet chain ID
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
    public: {
      http: ['https://coston-api.flare.network/ext/C/rpc'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Flare Explorer',
      url: 'https://coston-explorer.flare.network',
    },
  },
  testnet: true,
};

// Alternative: Coston2 (chain ID 114)
const FLARE_TESTNET_COSTON2 = {
  id: 114,
  name: 'Flare Testnet (Coston2)',
  network: 'flare-testnet-coston2',
  nativeCurrency: {
    decimals: 18,
    name: 'Coston2 FLR',
    symbol: 'C2FLR',
  },
  rpcUrls: {
    default: {
      http: ['https://coston2-api.flare.network/ext/C/rpc'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Flare Explorer',
      url: 'https://coston2-explorer.flare.network',
    },
  },
  testnet: true,
};

async function deployContract() {
  console.log('🚀 Deploying GitHubScorer contract to Flare Testnet using Viem...\n');

  // Check for private key
  if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY not found in .env file. Please add your private key.');
  }

  // Check for compiled artifacts
  const artifactsPath = join(__dirname, '../artifacts/contracts/GitHubScorer.sol/GitHubScorer.json');
  let artifact;
  
  try {
    const artifactContent = readFileSync(artifactsPath, 'utf8');
    artifact = JSON.parse(artifactContent);
  } catch (error) {
    console.error('❌ Contract artifacts not found. Please compile the contract first:');
    console.error('   npx hardhat compile');
    throw error;
  }

  const bytecode = artifact.bytecode;
  const abi = artifact.abi;

  if (!bytecode) {
    throw new Error('Bytecode not found in artifacts. Please compile the contract first.');
  }

  // Create account from private key
  const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY.replace(/^0x/, '')}`);
  console.log(`📝 Deploying from address: ${account.address}\n`);

  // Try both networks to find where the balance is
  let network = FLARE_TESTNET;
  let publicClient = createPublicClient({
    chain: FLARE_TESTNET,
    transport: http(FLARE_TESTNET.rpcUrls.default.http[0]),
  });
  
  let balance = await publicClient.getBalance({ address: account.address });
  console.log(`💰 Account balance on Coston (88888): ${formatEther(balance)} C2FLR`);
  
  // Check Coston2 if balance is 0
  if (balance === 0n) {
    console.log('   Checking Coston2 (114)...');
    const publicClient2 = createPublicClient({
      chain: FLARE_TESTNET_COSTON2,
      transport: http(FLARE_TESTNET_COSTON2.rpcUrls.default.http[0]),
    });
    const balance2 = await publicClient2.getBalance({ address: account.address });
    console.log(`💰 Account balance on Coston2 (114): ${formatEther(balance2)} C2FLR`);
    
    if (balance2 > 0n) {
      console.log('✅ Found balance on Coston2! Using Coston2 network...\n');
      network = FLARE_TESTNET_COSTON2;
      publicClient = publicClient2;
      balance = balance2;
    }
  }
  
  console.log(`\n📝 Using network: ${network.name} (Chain ID: ${network.id})\n`);

  // Create wallet client for transactions
  const walletClient = createWalletClient({
    account,
    chain: network,
    transport: http(network.rpcUrls.default.http[0]),
  });

  if (balance === 0n) {
    console.warn('⚠️  Warning: Account balance is 0 on both networks.');
    console.warn('   Please verify funds are in the wallet: ' + account.address);
    console.warn('   Explorer: https://coston-explorer.flare.network/address/' + account.address);
    console.warn('   Or: https://coston2-explorer.flare.network/address/' + account.address);
    throw new Error('Insufficient balance for deployment');
  } else {
    console.log(`✅ Account has sufficient balance: ${formatEther(balance)} C2FLR\n`);
  }

  // Deploy contract
  console.log('📦 Deploying contract...');
  // Ensure bytecode has 0x prefix (but not double)
  const bytecodeWithPrefix = bytecode.startsWith('0x') ? bytecode : `0x${bytecode}`;
  const hash = await walletClient.deployContract({
    abi,
    bytecode: bytecodeWithPrefix,
    args: [], // No constructor arguments
  });

  console.log(`⏳ Transaction hash: ${hash}`);
  console.log('⏳ Waiting for deployment confirmation...\n');

  // Wait for transaction receipt
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (!receipt.contractAddress) {
    throw new Error('Contract address not found in receipt. Deployment may have failed.');
  }

  console.log('\n✅ Contract deployed successfully!');
  console.log(`📍 Contract Address: ${receipt.contractAddress}`);
  console.log(`🔗 Explorer: https://coston-explorer.flare.network/address/${receipt.contractAddress}`);
  console.log(`📝 Transaction: https://coston-explorer.flare.network/tx/${hash}\n`);

  console.log('🔧 Next steps:');
  console.log(`1. Add to .env file: VITE_CONTRACT_ADDRESS=${receipt.contractAddress}`);
  console.log(`2. Update backend/.env: CONTRACT_ADDRESS=${receipt.contractAddress}`);
  console.log(`3. Restart your dev server\n`);

  return {
    contractAddress: receipt.contractAddress,
    transactionHash: hash,
    blockNumber: receipt.blockNumber,
  };
}

deployContract()
  .then(() => {
    console.log('✅ Deployment complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  });

