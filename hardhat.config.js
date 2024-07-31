require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.20"
      },
      {
        version: "0.7.6"
      },
    ]
  },
  networks: {
    local: {
      url: "http://127.0.0.1:8545"
    },
    arbitrum: {
      url: "https://arb1.arbitrum.io/rpc",
      accounts: [ vars.get("SMART_CONTRACT_DEPLOYER") ],
    },
    hardhat: {
      forking: {
        url: vars.get("ARBITRUM_ARCHIVE_NODE_RPC_ADDRESS"),
        blockNumber:238088027,
      },
      chains: {
        42161: {
          hardforkHistory: { 
            byzantium: 0,
            constantinople: 0,
            petersburg: 0,
            istanbul: 0,
            muirGlacier: 0,
            berlin: 0,
            london: 0,
          }
        }
      },
    }
  }
};
