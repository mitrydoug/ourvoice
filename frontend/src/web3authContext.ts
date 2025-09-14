import { type Web3AuthContextConfig } from '@web3auth/modal/react'
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK, type Web3AuthOptions } from '@web3auth/modal'

const HardhatNetwork = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0x7A69", // Sepolia chainId in hex
  rpcTarget: "http://127.0.0.1:8545", // Your Hardhat RPC URL
  displayName: "Hardhat Localhost",
  blockExplorerUrl: "",
  ticker: "ETH",
  tickerName: "Ethereum",
  decimals: 18,
  logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRz4i1wWF516fnkizp1WSDG5rnG8GfkQAVoVQ&s",
};

const web3AuthOptions: Web3AuthOptions = {
  clientId: 'BOVYZL_vjpqhKWkaub-_RpX3I_OqBNxQdxy5YbTXz59mQahcyMAWWA5uChhZCGRAuIbivb83zAAUeh3rWdJTUqs', // Get your Client ID from Web3Auth Dashboard
  web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
  chains: [HardhatNetwork],
  defaultChainId: "0x7A69",
}

const web3AuthContextConfig: Web3AuthContextConfig = {
  web3AuthOptions,
}

export default web3AuthContextConfig