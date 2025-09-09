import { useCallback, useEffect, useState, useMemo } from "react";
import { MetaMaskSDK, type SDKProvider } from "@metamask/sdk";
import { type Web3AuthContextConfig } from '@web3auth/modal/react'
import { WEB3AUTH_NETWORK, type Web3AuthOptions } from '@web3auth/modal'

const CELO_SEPOLIA_CHAIN_ID = BigInt(11142220);

const web3AuthOptions: Web3AuthOptions = {
  clientId: 'YOUR_CLIENT_ID', // Get your Client ID from Web3Auth Dashboard
  web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
}

const MMSDK = new MetaMaskSDK({
    dappMetadata: {
        name: "MetaMask SDK Demo",
        url: window.location.href,
        iconUrl: "https://docs.metamask.io/img/metamask-logo.svg",
    },
    infuraAPIKey: import.meta.env.VITE_INFURA_API_KEY || "",
});



export const useWallet = () => {

    const [isConnected, setIsConnected] = useState(false);
    const [provider, setProvider] = useState<SDKProvider | undefined>();
    const [account, setAccount] = useState<string | undefined>();
    const [balance, setBalance] = useState<number | undefined>();

    useEffect(() => {
        setProvider(MMSDK.getProvider());
    }, []);

    const connect = async () => {
        const accounts = await MMSDK.connect();
        setAccount(accounts[0]);
        if (accounts.length > 0) {
            setIsConnected(true);
        }
    };

    const terminate = async () => {
        await MMSDK.terminate();
        setIsConnected(false);
        setBalance(undefined);
        setAccount(undefined);
    };

    const getBalance = async () => {
        if (!account || !provider) {
            return;
        }
        const result = await provider?.request({
            method: "eth_getBalance",
            params: [account, "latest"],
        });
        const decimal = BigInt(result as string);
        const balance = (await Number(decimal)) / 10 ** 18;
        console.log(balance.toFixed(4));
        setBalance(balance);
    };

}