const hre = require("hardhat");

async function main() {
  const s = await hre.ethers.getSigners();
  console.log("signers:", s.length);
  if (s[0]) console.log("addr:", await s[0].getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
