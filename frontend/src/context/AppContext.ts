import { ethers } from 'ethers';
import React from "react";
import { createContext } from 'react';

export interface AppState {
    polyVoice: ethers.Contract | null;
    wallet: {
        provider: ethers.BrowserProvider | null,
        walletState: string,
        signer: ethers.Signer | null,
        address: string | null,
        connectWallet: () => Promise<void>,
        connectionRequest: object | null,
        setConnectionRequest: React.Dispatch<React.SetStateAction<null>>,
    };
    requestConnection: () => void;
    connectionRequested: boolean;
}

const AppContext = createContext<AppState | null>(null);

export default AppContext;