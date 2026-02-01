import { useEffect } from "react";
import { useBlockNumber } from "wagmi";

/**
 * Hook to synchronize contract data with the latest blockchain state.
 * Calls the provided refetch function whenever a new block is mined.
 *
 * @param refetch - Function to call when a new block is detected
 */
export const useBlockSync = (refetch: () => void) => {
  const { data: blockNumber } = useBlockNumber({
    watch: true,
  });

  useEffect(() => {
    if (blockNumber) {
      refetch();
    }
  }, [blockNumber, refetch]);

  return { blockNumber };
};

export default useBlockSync;
