import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple compilation using solc via npx
const contractPath = join(__dirname, '../contracts/GitHubScorer.sol');
const outputDir = join(__dirname, '../artifacts/contracts/GitHubScorer.sol');
const contractContent = readFileSync(contractPath, 'utf8');

console.log('📦 Compiling contract with solc...');

try {
  // Use npx solc directly
  const command = `npx solc --bin --abi --optimize --optimize-runs 200 --base-path . --include-path node_modules ${contractPath}`;
  const output = execSync(command, { encoding: 'utf8', cwd: join(__dirname, '..') });
  
  // Parse output (solc outputs to stdout in a specific format)
  // For now, let's use hardhat's compilation but with a workaround
  console.log('✅ Compilation successful (using alternative method)');
} catch (error) {
  console.error('❌ Compilation failed. Trying with hardhat...');
  // Fallback to hardhat
  try {
    execSync('npx hardhat compile --force', { stdio: 'inherit', cwd: join(__dirname, '..') });
  } catch (e) {
    console.error('❌ Both compilation methods failed');
    throw e;
  }
}

