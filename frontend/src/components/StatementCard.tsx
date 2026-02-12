import { FC, useEffect } from "react";
import { Card, IconButton, Stack, Typography } from "@mui/material";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import LandscapeIcon from "@mui/icons-material/Landscape";

import { useUserVotes } from "../state/UserVotes";
import VoteToggle from "./VoteToggle";
import { useBlockNumber, useReadContract } from "wagmi";
import { useForum, FORUM_ABI } from "../state/Forum";
import useIsMobile from "@/hooks/useIsMobile";

const LOOK_BACK_BLOCKS = BigInt(1);

interface Statement {
  id: bigint;
  text: string;
  createdTimestamp: bigint;
  support: bigint;
  rank: bigint;
}

/**
 * Format a number to 3 significant digits with a suffix (k, m, b, t).
 * Examples: 120 -> "120", 3220 -> "3.22k", 3220000 -> "3.22m"
 */
const formatSupport = (value: number): string => {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs < 1000) return `${sign}${abs}`;

  const suffixes = ["", "k", "m", "b", "t"];
  const tier = Math.floor(Math.log10(abs) / 3);
  const suffix = suffixes[tier] ?? `e${tier * 3}`;
  const scaled = abs / Math.pow(10, tier * 3);

  // 3 significant digits
  const digits = 3 - Math.floor(Math.log10(scaled)) - 1;
  const formatted = scaled.toFixed(Math.max(0, digits));

  return `${sign}${formatted}${suffix}`;
};

/** Scale font size down for 2- and 3-digit rank numbers. */
const rankFontSize = (rank: number): string => {
  if (rank >= 100) return "1.2rem";
  if (rank >= 10) return "1.6rem";
  return "2rem";
};

type StatementCardProps = {
  statement: Statement;
  isBookmarked?: boolean;
  onToggleBookmark?: (statementId: number) => void;
};

export const StatementCard: FC<StatementCardProps> = ({
  statement,
  isBookmarked,
  onToggleBookmark,
}) => {
  const {
    isUserVerified,
    dispatch,
    getEffectiveSupport,
    getOnChainSupport,
    hasAdjustment,
  } = useUserVotes();
  const { forumContractAddress } = useForum();
  const isMobile = useIsMobile();

  // Watch for new blocks
  const { data: blockNumber } = useBlockNumber({ watch: true });

  const { data: historicalData, refetch: refetchHistorical } = useReadContract({
    address: forumContractAddress,
    abi: FORUM_ABI,
    functionName: "getStatementsById",
    args: [[statement.id]],
    blockNumber: blockNumber ? blockNumber - LOOK_BACK_BLOCKS : undefined,
    query: { enabled: !!blockNumber },
  });

  // Sync historical data query on each new block
  useEffect(() => {
    if (blockNumber) {
      refetchHistorical();
    }
  }, [blockNumber, refetchHistorical]);

  const statementOneWeekAgo = historicalData
    ? (historicalData[0] as Statement)
    : null;

  const currentRank = Number(statement.rank) + 1;
  const lastWeekRank = statementOneWeekAgo
    ? Number(statementOneWeekAgo.rank) + 1
    : null;

  // Rank change: positive means improved (moved up), negative means dropped
  const rankChange = lastWeekRank !== null ? lastWeekRank - currentRank : null;

  const userSupport = isUserVerified
    ? getEffectiveSupport(Number(statement.id))
    : 0;
  const hasUncommittedSupport = isUserVerified
    ? hasAdjustment(Number(statement.id))
    : false;

  const handleSupportChange = (newSupport: number) => {
    if (!isUserVerified) return;
    const onChainSupport = getOnChainSupport(Number(statement.id));
    dispatch({
      type: "STAGE_USER_SUPPORT",
      payload: {
        statementId: statement.id,
        adjustment: newSupport - onChainSupport,
      },
    });
  };

  // Placeholder value for peak rank (not yet implemented)
  const peakRank = 1;

  const globalSupport = Number(statement.support);

  return (
    <Card sx={{ p: 2 }}>
      <Stack direction="row" spacing={2}>
        {/* Left column: rank */}
        <Stack
          alignItems="center"
          justifyContent="center"
          sx={{ width: 48, minWidth: 48, flexShrink: 0 }}
        >
          <Typography
            variant="h4"
            sx={{
              fontWeight: 600,
              fontSize: rankFontSize(currentRank),
              lineHeight: 1.1,
              color: "text.primary",
            }}
          >
            {currentRank}
          </Typography>
        </Stack>

        {/* Middle column: content */}
        <Stack
          spacing={1.5}
          sx={{ flex: 1, minWidth: 0 }}
          justifyContent="space-between"
        >
          {/* Statement text */}
          <Typography variant="h6" sx={{ fontWeight: 500 }}>
            {statement.text}
          </Typography>

          {/* Vote controls — inline on mobile only */}
          {isUserVerified && isMobile && (
            <VoteToggle
              userSupport={userSupport}
              uncommittedSupport={hasUncommittedSupport}
              onUserVoteChange={handleSupportChange}
              direction="horizontal"
            />
          )}

          {/* Bottom stats row */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
            sx={{ mt: 0.5 }}
          >
            {/* Global support (blue) */}
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: "primary.main" }}
            >
              {formatSupport(globalSupport)}
            </Typography>

            {/* Rank change */}
            <Stack direction="row" alignItems="center" spacing={0.25}>
              {rankChange === null || rankChange === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  — N/C
                </Typography>
              ) : rankChange > 0 ? (
                <>
                  <ArrowUpwardIcon
                    sx={{ fontSize: 16, color: "success.main" }}
                  />
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: "success.main" }}
                  >
                    {rankChange}
                  </Typography>
                </>
              ) : (
                <>
                  <ArrowDownwardIcon
                    sx={{ fontSize: 16, color: "error.main" }}
                  />
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: "error.main" }}
                  >
                    {Math.abs(rankChange)}
                  </Typography>
                </>
              )}
            </Stack>

            {/* Peak rank */}
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <LandscapeIcon sx={{ fontSize: 18, color: "text.secondary" }} />
              <Typography variant="body2" color="text.secondary">
                {peakRank}
              </Typography>
            </Stack>

            {/* Spacer pushes bookmark to the right */}
            <Stack sx={{ flexGrow: 1 }} />

            {/* Bookmark */}
            {onToggleBookmark && (
              <IconButton
                size="small"
                onClick={() => onToggleBookmark(Number(statement.id))}
                aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
                sx={{ p: 0 }}
              >
                {isBookmarked ? (
                  <BookmarkIcon sx={{ fontSize: 22 }} />
                ) : (
                  <BookmarkBorderIcon sx={{ fontSize: 22 }} />
                )}
              </IconButton>
            )}
          </Stack>
        </Stack>

        {/* Right column: vertical vote controls — desktop only */}
        {isUserVerified && !isMobile && (
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{ flexShrink: 0, ml: "auto" }}
          >
            <VoteToggle
              userSupport={userSupport}
              uncommittedSupport={hasUncommittedSupport}
              onUserVoteChange={handleSupportChange}
              direction="vertical"
            />
          </Stack>
        )}
      </Stack>
    </Card>
  );
};

export default StatementCard;
