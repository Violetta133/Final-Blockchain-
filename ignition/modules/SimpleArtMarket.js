import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("SimpleArtMarketModule", (m) => {
  const market = m.contract("SimpleArtMarket");
  return { market };
});
