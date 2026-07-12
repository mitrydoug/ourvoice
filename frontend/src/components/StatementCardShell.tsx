import { FC, MouseEvent, ReactNode } from "react";
import { Box, Card, Stack, SxProps, Theme, Typography } from "@mui/material";

/** Prevent clicks inside interactive zones from bubbling to the card. */
const stopPropagation = (e: MouseEvent) => e.stopPropagation();

interface StatementCardShellProps {
  /**
   * Content for the fixed-width left column (rank number, "Not Ranked" label,
   * or empty for staged statements).
   */
  leftSlot?: ReactNode;
  /** Main statement text. */
  text: string;
  /**
   * Bottom stats/actions row displayed below the text.
   * Different for on-chain statements (support, rank change) vs staged (Pending
   * chip + delete).
   */
  statsSlot: ReactNode;
  /**
   * Vote controls (VoteToggle). The shell handles responsive placement:
   * inline below the text on mobile, in the right column on desktop.
   */
  voteControls?: ReactNode;
  /** Optional action rendered in the top-right corner, aligned with the text. */
  topRightSlot?: ReactNode;
  /** Optional action shown just before the vote controls (e.g. switch support). */
  rightTopSlot?: ReactNode;
  /** Optional click handler for the entire card. */
  onClick?: () => void;
  sx?: SxProps<Theme>;
}

/**
 * Shared three-column card layout used by both StatementCard and
 * StagedStatementCard.
 *
 * Layout:
 *   [ leftSlot (72px) ] [ text + topRight / stats + inline vote group ]
 */
const StatementCardShell: FC<StatementCardShellProps> = ({
  leftSlot,
  text,
  statsSlot,
  voteControls,
  topRightSlot,
  rightTopSlot,
  onClick,
  sx,
}) => {
  const hasVoteGroup = Boolean(voteControls || rightTopSlot);

  return (
    <Card sx={{ p: 1.5, ...sx }} onClick={onClick}>
      <Stack direction="row" spacing={1.5}>
        {/* Left column: rank or placeholder */}
        <Stack
          alignItems="center"
          justifyContent="center"
          sx={{ width: 72, minWidth: 72, flexShrink: 0 }}
        >
          {leftSlot}
        </Stack>

        {/* Middle column: text + stats row with inline vote controls */}
        <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="flex-start" spacing={1}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 500, flex: 1, minWidth: 0 }}
            >
              {text}
            </Typography>
            {topRightSlot && (
              <Box onClick={stopPropagation} sx={{ flexShrink: 0 }}>
                {topRightSlot}
              </Box>
            )}
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ flex: 1, minWidth: 0 }}>{statsSlot}</Box>
            {hasVoteGroup && (
              <Stack
                direction="row"
                alignItems="center"
                spacing={0.5}
                onClick={stopPropagation}
                sx={{ flexShrink: 0 }}
              >
                {rightTopSlot}
                {voteControls}
              </Stack>
            )}
          </Stack>
        </Stack>
      </Stack>
    </Card>
  );
};

export default StatementCardShell;
