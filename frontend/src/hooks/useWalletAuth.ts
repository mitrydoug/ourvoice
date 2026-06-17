import { useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useDisconnect } from "wagmi";

export const useWalletAuth = () => {
  const { ready, authenticated, login, logout, connectOrCreateWallet } =
    usePrivy();
  const { address } = useAccount();
  const { disconnect: disconnectWagmi } = useDisconnect();

  const connect = useCallback(() => {
    if (!ready) return;

    if (authenticated && !address) {
      connectOrCreateWallet();
      return;
    }

    login();
  }, [ready, authenticated, address, connectOrCreateWallet, login]);

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
