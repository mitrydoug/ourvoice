import { FC, useEffect } from "react";
import { IconButton, Stack, Typography } from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import LandscapeIcon from "@mui/icons-material/Landscape";
import { useNavigate } from "react-router-dom";

import { useUserVotes } from "../state/UserVotes";

// ── Coin icon SVG ────────────────────────────────────────────────────────────
const CoinIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="12" cy="12" r="10" fill="#FBBF24" />
    <circle cx="12" cy="12" r="8" fill="#F59E0B" />
    <text
      x="12"
      y="16.5"
      textAnchor="middle"
      fontSize="12"
      fontWeight="bold"
      fill="#FFFBEB"
      fontFamily="Inter, sans-serif"
    >
      C
    </text>
  </svg>
);
import VoteToggle from "./VoteToggle";
import AnimatedCounter from "./AnimatedCounter";
import StatementCardShell from "./StatementCardShell";
import { useBlockNumber, useReadContract } from "wagmi";
import { useForum, FORUM_ABI } from "../state/Forum";

const LOOK_BACK_BLOCKS = BigInt(1);

interface Statement {
  id: bigint;
  text: string;
  createdTimestamp: bigint;
  support: bigint;
  rank: bigint;
  peakRank: bigint;
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

/** Color for top-3 rank badges (gold, silver, bronze). */
const rankColor = (rank: number): string | undefined => {
  if (rank === 1) return "#D4A017";
  if (rank === 2) return "#8E8E93";
  if (rank === 3) return "#A0522D";
  return undefined;
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
  const navigate = useNavigate();
  const handleCardClick = () => {
    void navigate(`/statement/${statement.id}`);
  };
  const {
    isUserVerified,
    dispatch,
    getEffectiveSupport,
    getOnChainSupport,
    hasAdjustment,
  } = useUserVotes();
  const { forumContractAddress } = useForum();

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
      void refetchHistorical();
    }
  }, [blockNumber, refetchHistorical]);

  const statementOneWeekAgo = historicalData
    ? (historicalData[0] as Statement)
    : null;

  const currentRank = statement.rank >= 0n ? Number(statement.rank) + 1 : null;
  const lastWeekRank =
    statementOneWeekAgo && statementOneWeekAgo.rank >= 0n
      ? Number(statementOneWeekAgo.rank) + 1
      : null;

  // Rank change: positive means improved (moved up), negative means dropped
  const rankChange =
    lastWeekRank !== null && currentRank !== null
      ? lastWeekRank - currentRank
      : null;

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

  const peakRank =
    statement.peakRank >= 0n ? Number(statement.peakRank) + 1 : null;

  const globalSupport = Number(statement.support);

  /** Credits allocated = triangular number of |support| */
  const creditsAllocated = Math.abs(userSupport) * (Math.abs(userSupport) + 1) / 2;

  const leftSlot =
    currentRank !== null ? (
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          fontSize: rankFontSize(currentRank),
          lineHeight: 1.1,
          color: rankColor(currentRank) ?? "text.primary",
        }}
      >
        {currentRank}
      </Typography>
    ) : (
      <Typography
        variant="caption"
        sx={{
          fontWeight: 600,
          fontSize: "0.6rem",
          lineHeight: 1.2,
          color: "text.disabled",
          textAlign: "center",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        Not
        <br />
        Ranked
      </Typography>
    );

  const statsSlot = (
    <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 0.5 }}>
      <Typography
        variant="body2"
        sx={{ fontWeight: 600, color: "primary.main" }}
      >
        {formatSupport(globalSupport)}
      </Typography>

      <Stack direction="row" alignItems="center" spacing={0.25}>
        {rankChange === null || rankChange === 0 ? (
          <Typography variant="body2" color="text.disabled">
            —
          </Typography>
        ) : rankChange > 0 ? (
          <>
            <ArrowUpwardIcon sx={{ fontSize: 16, color: "success.main" }} />
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: "success.main" }}
            >
              {rankChange}
            </Typography>
          </>
        ) : (
          <>
            <ArrowDownwardIcon sx={{ fontSize: 16, color: "error.main" }} />
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: "error.main" }}
            >
              {Math.abs(rankChange)}
            </Typography>
          </>
        )}
      </Stack>

      {peakRank !== null && (
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <LandscapeIcon sx={{ fontSize: 18, color: "text.secondary" }} />
          <Typography variant="body2" color="text.secondary">
            {peakRank}
          </Typography>
        </Stack>
      )}

      {creditsAllocated > 0 && (
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <CoinIcon size={16} />
          <AnimatedCounter
            value={creditsAllocated}
            typographyProps={{
              variant: "body2",
              fontWeight: 600,
              sx: {
                fontVariantNumeric: "tabular-nums",
                color: "text.secondary",
              },
            }}
          />
        </Stack>
      )}

      <Stack sx={{ flexGrow: 1 }} />

      {onToggleBookmark && (
        <IconButton
          size="small"
          onClick={() => onToggleBookmark(Number(statement.id))}
          aria-label={isBookmarked ? "Unstar" : "Star"}
          sx={{ p: 0 }}
        >
          {isBookmarked ? (
            <StarIcon sx={{ fontSize: 22, color: "#E8C84A" }} />
          ) : (
            <StarBorderIcon sx={{ fontSize: 22, color: "text.secondary" }} />
          )}
        </IconButton>
      )}
    </Stack>
  );

  const voteControls = isUserVerified ? (
    <VoteToggle
      userSupport={userSupport}
      uncommittedSupport={hasUncommittedSupport}
      onUserVoteChange={handleSupportChange}
      direction="vertical"
    />
  ) : undefined;

  return (
    <StatementCardShell
      leftSlot={leftSlot}
      text={statement.text}
      statsSlot={statsSlot}
      voteControls={voteControls}
      onClick={handleCardClick}
      sx={{
        cursor: "pointer",
        transition: "box-shadow 0.2s ease, border-color 0.2s ease",
        "&:hover": { boxShadow: 3 },
        borderLeft: hasUncommittedSupport ? "3.5px solid" : "3.5px solid transparent",
        borderColor: hasUncommittedSupport ? "#ffb74d" : "transparent",
      }}
    />
  );
};

export default StatementCard;
