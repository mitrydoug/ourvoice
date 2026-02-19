import { type Web3AuthContextConfig } from "@web3auth/modal/react";
import {
  CHAIN_NAMESPACES,
  WEB3AUTH_NETWORK,
  type Web3AuthOptions,
} from "@web3auth/modal";

const HardhatLocalhost = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0x7A69",
  rpcTarget: "http://127.0.0.1:8545",
  displayName: "Hardhat Localhost",
  blockExplorerUrl: "",
  ticker: "ETH",
  tickerName: "Ethereum",
  decimals: 18,
  logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRz4i1wWF516fnkizp1WSDG5rnG8GfkQAVoVQ&s",
};

const Sepolia = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0xAA36A7",
  rpcTarget: import.meta.env.VITE_SEPOLIA_RPC_URL ?? "https://rpc.sepolia.org",
  displayName: "Sepolia Testnet",
  blockExplorerUrl: "https://sepolia.etherscan.io",
  ticker: "ETH",
  tickerName: "Ethereum",
  decimals: 18,
  logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRz4i1wWF516fnkizp1WSDG5rnG8GfkQAVoVQ&s",
};

const chain = import.meta.env.DEV ? HardhatLocalhost : Sepolia;

const web3AuthOptions: Web3AuthOptions = {
  clientId:
    "BOVYZL_vjpqhKWkaub-_RpX3I_OqBNxQdxy5YbTXz59mQahcyMAWWA5uChhZCGRAuIbivb83zAAUeh3rWdJTUqs", // Get your Client ID from Web3Auth Dashboard
  web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
  chains: [chain],
  defaultChainId: chain.chainId,
};

const web3AuthContextConfig: Web3AuthContextConfig = {
  web3AuthOptions,
};

export default web3AuthContextConfig;
