import { useEffect } from "react";
import { useBlockNumber } from "wagmi";

/**
 * Hook to synchronize contract data with the latest blockchain state.
 * Calls the provided refetch function whenever a new block is mined.
 *
 * @param refetch - Function to call when a new block is detected
 */
export const useBlockSync = (refetch: () => void | Promise<unknown>) => {
  const { data: blockNumber } = useBlockNumber({
    watch: true,
  });

  useEffect(() => {
    if (blockNumber) {
      void refetch();
    }
  }, [blockNumber, refetch]);

  return { blockNumber };
};

export default useBlockSync;
