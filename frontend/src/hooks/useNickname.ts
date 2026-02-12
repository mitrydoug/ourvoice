import { useAccount } from "wagmi";
import useLocalStorageValue from "./useLocalStorageValue";

/**
 * Shared hook for the user's locally-stored nickname, keyed by wallet address.
 * Returns [nickname, setNickname]. The nickname is an empty string when unset.
 */
const useNickname = (): [string, (value: string) => void] => {
  const { address } = useAccount();
  return useLocalStorageValue(`ourvoice:nickname:${address ?? "unknown"}`, "");
};

export default useNickname;
