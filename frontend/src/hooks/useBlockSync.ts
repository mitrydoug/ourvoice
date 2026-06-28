import { useCallback, useEffect } from "react";
import { useBlockNumber } from "wagmi";
import { blockPollingIntervalMs } from "@/wagmiConfig";

/**
 * Hook to synchronize contract data with the latest blockchain state.
 *
 * Polls the chain head every `pollingInterval` milliseconds (default from
 * `VITE_BLOCK_POLLING_INTERVAL_MS`, fallback 60 000 ms).
 * Calls the provided refetch function whenever a new block number is observed.
 *
 * Also exposes `triggerSync`, which forces an immediate block-number refetch
 * and a direct refetch of contract data. Call this after a write transaction
 * confirms so the UI updates without waiting for the next polling tick.
 *
 * @param refetch - Function to call when new state should be fetched
 * @param pollingInterval - Milliseconds between block-number polls
 */
export const useBlockSync = (
  refetch: () => void | Promise<unknown>,
  pollingInterval = blockPollingIntervalMs,
) => {
  const { data: blockNumber, refetch: refetchBlockNumber } = useBlockNumber({
    watch: { pollingInterval },
  });

  useEffect(() => {
    if (blockNumber) {
      void refetch();
    }
  }, [blockNumber, refetch]);

  // Force an immediate sync: refreshes the block number (so latestSyncBlockNumber
  // is current) and re-reads contract data without waiting for the next poll.
  const triggerSync = useCallback(() => {
    void refetchBlockNumber();
    void refetch();
  }, [refetchBlockNumber, refetch]);

  return { blockNumber, triggerSync };
};

export default useBlockSync;
