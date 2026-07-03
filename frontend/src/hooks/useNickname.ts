import useLocalStorageValue from "./useLocalStorageValue";
import { useWalletAuth } from "@/wallet";

/**
 * Shared hook for the user's locally-stored nickname, keyed by wallet address.
 * Returns [nickname, setNickname]. The nickname is an empty string when unset.
 */
const useNickname = (): [string, (value: string) => void] => {
  const { address } = useWalletAuth();
  // Shorten address to first 4 bytes (10 chars inc. "0x") for a compact key.
  const addrKey = address ? address.slice(0, 10) : "anon";
  return useLocalStorageValue(`symvolia:nickname:${addrKey}`, "");
};

export default useNickname;
