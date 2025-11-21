const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying GitHubScorer contract to Flare Testnet...");

  const GitHubScorer = await hre.ethers.getContractFactory("GitHubScorer");
  const scorer = await GitHubScorer.deploy();

  await scorer.waitForDeployment();
  const address = await scorer.getAddress();

  console.log("✅ Contract deployed to:", address);
  console.log("📝 Contract address:", address);
  console.log("\n🔧 Next steps:");
  console.log("1. Update VITE_CONTRACT_ADDRESS in .env file with:", address);
  console.log("2. The contract is ready to store GitHub scores!");
  
  // Wait for block confirmations
  console.log("\n⏳ Waiting for block confirmations...");
  await scorer.deploymentTransaction()?.wait(3);
  
  console.log("\n✅ Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });







