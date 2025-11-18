import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import solc from 'solc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const contractPath = join(__dirname, '../contracts/GitHubScorer.sol');
const outputDir = join(__dirname, '../artifacts/contracts/GitHubScorer.sol');

console.log('📦 Compiling contract with solc-js...');

const contractSource = readFileSync(contractPath, 'utf8');

const input = {
  language: 'Solidity',
  sources: {
    'GitHubScorer.sol': {
      content: contractSource,
    },
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode'],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  const errors = output.errors.filter(e => e.severity === 'error');
  if (errors.length > 0) {
    console.error('❌ Compilation errors:');
    errors.forEach(error => console.error(error.formattedMessage));
    process.exit(1);
  }
}

const contractName = 'GitHubScorer';
const compiledContract = output.contracts['GitHubScorer.sol'][contractName];

if (!compiledContract) {
  console.error('❌ Contract not found in compilation output');
  process.exit(1);
}

// Create output directory
mkdirSync(outputDir, { recursive: true });

// Write ABI and bytecode
const artifact = {
  contractName,
  abi: compiledContract.abi,
  bytecode: compiledContract.evm.bytecode.object,
};

writeFileSync(
  join(outputDir, `${contractName}.json`),
  JSON.stringify(artifact, null, 2)
);

console.log('✅ Contract compiled successfully!');
console.log(`📁 Artifacts saved to: ${outputDir}`);

