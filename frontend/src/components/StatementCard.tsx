import { FC } from "react";
import {
  Box,
  ButtonBase,
  CircularProgress,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import MergeIcon from "@mui/icons-material/Merge";

import { useForumNavigate } from "../hooks/useForumNavigate";

import { SupportAdjustmentType, useUserVotes } from "../state/UserVotes";
import StatementCardShell from "./StatementCardShell";
import SupportVoteControls from "./SupportVoteControls";
import { useReadContract } from "wagmi";
import { useBlockSync } from "../hooks/useBlockSync";
import { useForum, FORUM_ABI } from "../state/Forum";
import { useCreditConversion } from "../hooks/useCreditConversion";
import { supportCreditsToAllocatedCredits } from "../util";
import {
  AVG_BLOCK_TIME,
  PERIODS_BACK,
  PERIOD_SECONDS,
} from "../hooks/useHistoricalSupport";

const LOOK_BACK_BLOCKS = BigInt(
  Math.floor((PERIODS_BACK * PERIOD_SECONDS) / AVG_BLOCK_TIME),
);

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
 * Examples: 120 -> "120", 1000 -> "1k", 3220 -> "3.22k"
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
  const formatted = Number(scaled.toFixed(Math.max(0, digits))).toString();

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

const peakRankIcon = (rank: number): string => {
  if (rank === 1) return "🏆";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return "⛰️";
};

const peakRankIconSize = (rank: number): number => {
  if (rank === 2 || rank === 3) return 17;
  return 14;
};

const clampPercent = (value: number): number =>
  Math.max(0, Math.min(100, value));

const rankingProgressPercent = (
  supportParts: number,
  thresholdParts: number,
): number => {
  if (thresholdParts <= 0) return supportParts > 0 ? 100 : 0;
  return clampPercent((Math.max(0, supportParts) / thresholdParts) * 100);
};

const RankingProgressRing: FC<{ value: number }> = ({ value }) => {
  const roundedValue = Math.round(value);

  return (
    <Tooltip title={`${roundedValue}% of the support needed to rank`} arrow>
      <Box
        sx={{
          position: "relative",
          width: 64,
          height: 64,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress
          variant="determinate"
          value={100}
          size={64}
          thickness={4}
          sx={{
            color: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(255, 255, 255, 0.18)"
                : "rgba(0, 0, 0, 0.06)",
            position: "absolute",
          }}
        />
        <CircularProgress
          variant="determinate"
          value={roundedValue}
          size={64}
          thickness={4}
          sx={{ color: "primary.main", position: "absolute" }}
        />
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            fontSize: "0.875rem",
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {roundedValue}%
        </Typography>
      </Box>
    </Tooltip>
  );
};

type StatementCardProps = {
  statement: Statement;
  isBookmarked?: boolean;
  onToggleBookmark?: (statementId: number) => void;
  onSwitchSupport?: (statementId: number) => void;
};

export const StatementCard: FC<StatementCardProps> = ({
  statement,
  isBookmarked,
  onToggleBookmark,
  onSwitchSupport,
}) => {
  const navigate = useForumNavigate();
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
  const { toCredits, toParts } = useCreditConversion();

  const { blockNumber } = useBlockSync(() => {});

  const { data: historicalData } = useReadContract({
    address: forumContractAddress,
    abi: FORUM_ABI,
    functionName: "getStatementsById",
    args: [[statement.id]],
    blockNumber: blockNumber ? blockNumber - LOOK_BACK_BLOCKS : undefined,
    query: {
      enabled: !!blockNumber,
      placeholderData: (prev) => prev,
    },
  });

  const { data: rankingThreshold } = useReadContract({
    address: forumContractAddress,
    abi: FORUM_ABI,
    functionName: "getRankingThreshold",
    query: {
      enabled: statement.rank < 0n,
    },
  });

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

  const userSupportParts = isUserVerified
    ? getEffectiveSupport(Number(statement.id))
    : 0;
  const userSupport = toCredits(userSupportParts);
  const hasUncommittedSupport = isUserVerified
    ? hasAdjustment(Number(statement.id))
    : false;

  const handleSupportChange = (newCreditSupport: number) => {
    if (!isUserVerified) return;
    const onChainParts = getOnChainSupport(Number(statement.id));
    const onChainCredits = toCredits(onChainParts);
    const adjustment =
      newCreditSupport === 0
        ? {
            value: 0,
            adjustmentType: SupportAdjustmentType.SetTo,
          }
        : {
            value: toParts(newCreditSupport - onChainCredits),
            adjustmentType: SupportAdjustmentType.Delta,
          };
    dispatch({
      type: "STAGE_USER_SUPPORT",
      payload: {
        statementId: statement.id,
        adjustment,
      },
    });
  };

  const peakRank =
    statement.peakRank >= 0n ? Number(statement.peakRank) + 1 : null;

  const rankingProgress =
    rankingThreshold !== undefined
      ? rankingProgressPercent(
          Number(statement.support),
          Number(rankingThreshold),
        )
      : null;

  const globalSupport = toCredits(Number(statement.support));

  const isHotRankChange =
    rankChange !== null &&
    lastWeekRank !== null &&
    rankChange > 0 &&
    rankChange / lastWeekRank >= 0.25;

  const rankChangeIndicator =
    rankChange !== null && rankChange !== 0 ? (
      <Tooltip
        title={`Recently moved ${rankChange > 0 ? "up" : "down"} ${Math.abs(rankChange)} ${Math.abs(rankChange) === 1 ? "rank" : "ranks"}`}
        arrow
      >
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            fontSize: "0.95rem",
            color: isHotRankChange
              ? "warning.main"
              : rankChange > 0
                ? "success.main"
                : "error.main",
            lineHeight: 1,
          }}
        >
          {isHotRankChange ? (
            <Box
              component="span"
              sx={{
                fontSize: "1.15em",
                lineHeight: 1,
                verticalAlign: "-0.04em",
              }}
            >
              🔥
            </Box>
          ) : rankChange > 0 ? (
            "▲"
          ) : (
            "▼"
          )}
          {Math.abs(rankChange)}
        </Typography>
      </Tooltip>
    ) : null;

  const leftSlot =
    currentRank !== null ? (
      <Stack alignItems="center" spacing={1.35}>
        {/* Rank number */}
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
        {rankChangeIndicator}
      </Stack>
    ) : (
      <Stack alignItems="center" spacing={0.75}>
        {rankingProgress !== null ? (
          <RankingProgressRing value={rankingProgress} />
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
        )}
      </Stack>
    );

  const statsSlot = (
    <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 0.1 }}>
      <Tooltip title={`${globalSupport} total support`} arrow>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: "text.secondary",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formatSupport(globalSupport)}
        </Typography>
      </Tooltip>

      {peakRank !== null && (
        <Tooltip title={`Peak rank: #${peakRank}`} arrow>
          <Stack direction="row" alignItems="center" spacing={0.25}>
            <Typography
              sx={{ fontSize: peakRankIconSize(peakRank), lineHeight: 1 }}
            >
              {peakRankIcon(peakRank)}
            </Typography>
            {peakRank > 3 && (
              <Typography variant="body2" color="text.secondary">
                {peakRank}
              </Typography>
            )}
          </Stack>
        </Tooltip>
      )}
    </Stack>
  );

  const bookmarkSlot = onToggleBookmark ? (
    <IconButton
      size="small"
      onClick={() => onToggleBookmark(Number(statement.id))}
      aria-label={isBookmarked ? "Unstar" : "Star"}
      sx={{ p: 0.25 }}
    >
      {isBookmarked ? (
        <StarIcon sx={{ fontSize: 22, color: "#E8C84A" }} />
      ) : (
        <StarBorderIcon sx={{ fontSize: 22, color: "text.secondary" }} />
      )}
    </IconButton>
  ) : undefined;

  const voteControls = isUserVerified ? (
    <SupportVoteControls
      userSupport={userSupport}
      uncommittedSupport={hasUncommittedSupport}
      onUserVoteChange={handleSupportChange}
      onClear={() => handleSupportChange(0)}
      creditsTooltip={`You have ${supportCreditsToAllocatedCredits(userSupport)} credits providing ${userSupport} support`}
    />
  ) : undefined;
  const rightTopSlot = onSwitchSupport ? (
    <Tooltip title="Switch support to this statement" arrow>
      <ButtonBase
        aria-label="Switch support to this statement"
        onClick={() => onSwitchSupport(Number(statement.id))}
        sx={{
          width: 32,
          height: 24,
          color: "text.secondary",
          "&:hover": { color: "text.primary" },
        }}
      >
        <MergeIcon sx={{ fontSize: 22, transform: "rotate(90deg)" }} />
      </ButtonBase>
    </Tooltip>
  ) : undefined;

  return (
    <StatementCardShell
      leftSlot={leftSlot}
      text={statement.text}
      statsSlot={statsSlot}
      voteControls={voteControls}
      topRightSlot={bookmarkSlot}
      rightTopSlot={rightTopSlot}
      onClick={handleCardClick}
      sx={{
        cursor: "pointer",
        transition: "box-shadow 0.2s ease, border-color 0.2s ease",
        "&:hover": { boxShadow: 3 },
        borderLeft: hasUncommittedSupport
          ? "3.5px solid"
          : "3.5px solid transparent",
        borderColor: hasUncommittedSupport ? "#ffb74d" : "transparent",
      }}
    />
  );
};

export default StatementCard;
