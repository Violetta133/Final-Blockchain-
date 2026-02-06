import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ArtChainModule", (m) => {
  // 1) Deploy reward token
  const rewardToken = m.contract("ArtRewardToken");

  // 2) Deploy marketplace with reward token address
  const marketplace = m.contract("ArtMarketplace", [rewardToken]);

  // 3) Set marketplace address inside reward token
  m.call(rewardToken, "setMarketplace", [marketplace]);

  return { rewardToken, marketplace };
});
