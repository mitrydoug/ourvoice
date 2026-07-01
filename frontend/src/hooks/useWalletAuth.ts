import { useCallback, useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useAccount, useDisconnect } from "wagmi";

export const useWalletAuth = () => {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { address, status } = useAccount();
  const { disconnect: disconnectWagmi } = useDisconnect();

  // Keep "authenticated" in lockstep with having an active wallet, so the only
  // two states are "logged in with an active wallet" or "logged out". When
  // wagmi settles to `disconnected` — the user disconnected in-app or in their
  // wallet extension, or a session failed to reconnect — sign out of Privy.
  // We key off the settled `disconnected` status (not any falsy address) so we
  // don't sign out during the `connecting` / `reconnecting` window on load.
  useEffect(() => {
    if (!ready) return;
    if (status === "disconnected" && authenticated) {
      void logout();
    }
  }, [ready, status, authenticated, logout]);

  const connect = useCallback(() => {
    // Only ever open the Privy login modal ("Log in or Sign Up", incl. wallet
    // login). If the user is already authenticated there is nothing to do —
    // the effect above guarantees an authenticated user has (or is getting) an
    // active wallet, so we never fall back to a bare connectWallet() modal.
    if (!ready || authenticated) return;
    login();
  }, [ready, authenticated, login]);

  const disconnect = useCallback(() => {
    // Best-effort disconnect of the active wallet (no-ops for wallets like
    // MetaMask that don't support programmatic disconnect), then drop the wagmi
    // connection. Clearing `address` settles wagmi to `disconnected`, which
    // triggers the effect above and logs the user out of Privy.
    const active = wallets.find((w) => w.address === address);
    active?.disconnect();
    disconnectWagmi();
  }, [wallets, address, disconnectWagmi]);

  return {
    ready,
    authenticated,
    address,
    connect,
    disconnect,
  };
};
