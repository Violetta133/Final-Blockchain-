require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const pk = process.env.DEPLOYER_PRIVATE_KEY;

module.exports = {
  solidity: "0.8.28",
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: pk ? [pk] : [],
    },
  },
};