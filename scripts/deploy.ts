import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const deployerAddr = await deployer.getAddress();

  console.log("Deploying with:", deployerAddr);

  const balance = await hre.ethers.provider.getBalance(deployerAddr);
  console.log("Balance:", hre.ethers.formatEther(balance), "ETH");

  // 1) Deploy RewardToken
  const TokenFactory = await hre.ethers.getContractFactory("RewardToken", deployer);
  const token = await TokenFactory.deploy();
  await token.waitForDeployment();

  const tokenAddress = await token.getAddress();
  console.log("✅ RewardToken deployed to:", tokenAddress);

  // 2) Deploy SimpleArtMarket
  const MarketFactory = await hre.ethers.getContractFactory("SimpleArtMarket", deployer);
  const market = await MarketFactory.deploy();
  await market.waitForDeployment();

  const marketAddress = await market.getAddress();
  console.log("✅ SimpleArtMarket deployed to:", marketAddress);

  // 3) Give market permission to mint tokens
  const tx1 = await token.setMinter(marketAddress);
  await tx1.wait();
  console.log("✅ setMinter done:", marketAddress);

  // 4) Tell market which token to use
  const tx2 = await market.setRewardToken(tokenAddress);
  await tx2.wait();
  console.log("✅ setRewardToken done:", tokenAddress);

  console.log("\n=== COPY THESE ===");
  console.log("MARKET_ADDRESS =", marketAddress);
  console.log("REWARD_TOKEN_ADDRESS =", tokenAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
