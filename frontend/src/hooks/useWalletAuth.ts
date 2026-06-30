import { useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useDisconnect } from "wagmi";

export const useWalletAuth = () => {
  const { ready, authenticated, login, logout, connectWallet } = usePrivy();
  const { address } = useAccount();
  const { disconnect: disconnectWagmi } = useDisconnect();

  const connect = useCallback(() => {
    if (!ready) return;
    // When a Privy session already exists but no wallet is connected (e.g. a
    // stale session after MetaMask disconnects), login() is a no-op because the
    // user is already authenticated. connectWallet() attaches a wallet instead.
    // connectOrCreateWallet() throws when already authenticated, so it is avoided.
    if (authenticated) {
      connectWallet();
      return;
    }
    login();
  }, [ready, authenticated, login, connectWallet]);

  const disconnect = useCallback(() => {
    disconnectWagmi();
    void logout();
  }, [disconnectWagmi, logout]);

  return {
    ready,
    authenticated,
    address,
    connect,
    disconnect,
  };
};
