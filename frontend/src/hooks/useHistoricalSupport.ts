import { useEffect, useMemo, useState } from "react";
import { useBlockNumber, usePublicClient } from "wagmi";
import { useForum, FORUM_ABI } from "../state/Forum";
import { partsToCredits } from "../util";

/** Average Sepolia block time in seconds. */
export const AVG_BLOCK_TIME = 12;

/** Number of past periods to chart. */
export const PERIODS_BACK = 7;

/**
 * Duration of one chart period in seconds.
 *
 * Production default: 86 400 s (1 day)  → 7-day chart.
 * Testing override:      360 s (6 min)  → 42-minute chart.
 *
 * Controlled by the `VITE_CHART_PERIOD_SECONDS` env var.
 */
export const PERIOD_SECONDS = Number(
  import.meta.env.VITE_CHART_PERIOD_SECONDS ?? "86400",
);
const PERIOD_MS = PERIOD_SECONDS * 1000;

/** Whether we're using the production (daily) period. */
const IS_DAILY = PERIOD_SECONDS >= 86400;

export interface SupportDataPoint {
  /** UTC timestamp in milliseconds. */
  timestamp: number;
  /** Net support value at that point. */
  support: number;
  /** Human-readable label for the x-axis. */
  label: string;
}

/**
 * Fetch a statement's support over the last 7 chart periods plus the
 * current value.  Returns up to 8 data points.
 *
 * The period length is controlled by `VITE_CHART_PERIOD_SECONDS`
 * (defaults to 86 400 = 1 day).  In test environments a shorter period
 * such as 360 s (6 minutes) can be used.
 *
 * Uses block-number estimation (currentBlock − secondsAgo / 12) rather
 * than binary-searching for exact blocks — precision is ±~1 minute which
 * is fine for a visual chart.
 */
export function useHistoricalSupport(statementId: bigint): {
  data: SupportDataPoint[];
  isLoading: boolean;
} {
  const publicClient = usePublicClient();
  const { forumContractAddress, creditMultiplier } = useForum();
  const { data: currentBlockNumber } = useBlockNumber();

  const [dataPoints, setDataPoints] = useState<SupportDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Build the list of target timestamps for the past PERIODS_BACK periods.
  const targets = useMemo(() => {
    const now = Date.now();
    const result: { timestamp: number; label: string }[] = [];

    if (IS_DAILY) {
      // Production: anchor to UTC noon each day.
      const todayNoonUTC = new Date(
        Date.UTC(
          new Date().getUTCFullYear(),
          new Date().getUTCMonth(),
          new Date().getUTCDate(),
          12,
        ),
      );

      for (let i = PERIODS_BACK; i >= 1; i--) {
        const t = new Date(todayNoonUTC.getTime() - i * PERIOD_MS);
        if (t.getTime() < now) {
          result.push({
            timestamp: t.getTime(),
            label: t.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              timeZone: "UTC",
            }),
          });
        }
      }

      if (todayNoonUTC.getTime() < now) {
        result.push({
          timestamp: todayNoonUTC.getTime(),
          label: todayNoonUTC.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          }),
        });
      }
    } else {
      // Test / short periods: evenly space points ending near now.
      for (let i = PERIODS_BACK; i >= 1; i--) {
        const t = now - i * PERIOD_MS;
        const minutesAgo = Math.round((now - t) / 60_000);
        result.push({
          timestamp: t,
          label:
            minutesAgo >= 60
              ? `${Math.floor(minutesAgo / 60)}h${minutesAgo % 60}m`
              : `${minutesAgo}m`,
        });
      }
    }

    return result;
  }, []);

  useEffect(() => {
    if (!publicClient || !currentBlockNumber || !forumContractAddress) return;

    let cancelled = false;
    setIsLoading(true);

    const fetchHistory = async () => {
      const nowMs = Date.now();
      const currentBlock = Number(currentBlockNumber);

      // Estimate block numbers for each target timestamp
      const queries = targets.map(({ timestamp, label }) => {
        const secondsAgo = Math.floor((nowMs - timestamp) / 1000);
        const blocksAgo = Math.max(0, Math.floor(secondsAgo / AVG_BLOCK_TIME));
        const blockNum = Math.max(0, currentBlock - blocksAgo);
        return { blockNumber: BigInt(blockNum), timestamp, label };
      });

      // Fetch support at each historical block in parallel
      const results = await Promise.all(
        queries.map(async ({ blockNumber, timestamp, label }) => {
          try {
            const data = await publicClient.readContract({
              address: forumContractAddress,
              abi: FORUM_ABI,
              functionName: "getStatementsById",
              args: [[statementId]],
              blockNumber,
            });
            const statements = data as readonly {
              id: bigint;
              support: bigint;
            }[];
            const support =
              statements.length > 0 ? partsToCredits(Number(statements[0].support), creditMultiplier) : 0;
            return { timestamp, support, label };
          } catch {
            // Statement may not exist at this block — skip
            return null;
          }
        }),
      );

      if (cancelled) return;

      const points: SupportDataPoint[] = results.filter(
        (r): r is SupportDataPoint => r !== null,
      );

      // Add the current (live) data point
      try {
        const liveData = await publicClient.readContract({
          address: forumContractAddress,
          abi: FORUM_ABI,
          functionName: "getStatementsById",
          args: [[statementId]],
        });
        const liveStatements = liveData as readonly {
          id: bigint;
          support: bigint;
        }[];
        if (!cancelled && liveStatements.length > 0) {
          points.push({
            timestamp: nowMs,
            support: partsToCredits(Number(liveStatements[0].support), creditMultiplier),
            label: "Now",
          });
        }
      } catch {
        // Ignore — live data already shown on the card
      }

      if (!cancelled) {
        setDataPoints(points);
        setIsLoading(false);
      }
    };

    void fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [
    publicClient,
    currentBlockNumber,
    forumContractAddress,
    creditMultiplier,
    statementId,
    targets,
  ]);

  return { data: dataPoints, isLoading };
}
