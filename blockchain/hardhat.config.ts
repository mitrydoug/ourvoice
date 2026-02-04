import type { HardhatUserConfig } from "hardhat/config";

import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import hardhatKeystore from "@nomicfoundation/hardhat-keystore";
import hardhatNetworkHelpers from "@nomicfoundation/hardhat-network-helpers";

import { configVariable } from "hardhat/config";

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxViemPlugin, hardhatNetworkHelpers, hardhatKeystore],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    default: {
      type: "edr-simulated",
      mining: {
        auto: true,
        interval: 12000,
      }
    },
    local_sepolia_fork: {
      type: "edr-simulated",
      forking: {
        url: configVariable("SEPOLIA_RPC_URL"),
        blockNumber: 9979546,
      },
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
    compose_hardhat: {
      type: "http",
      url: "http://hardhat_mocked:8545",
    }
  },
};

export default config;
