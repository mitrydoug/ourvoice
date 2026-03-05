import { FC, ReactNode } from "react";
import { Card, Stack, SxProps, Theme, Typography } from "@mui/material";
import useIsMobile from "@/hooks/useIsMobile";

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
  sx?: SxProps<Theme>;
}

/**
 * Shared three-column card layout used by both StatementCard and
 * StagedStatementCard.
 *
 * Layout:
 *   [ leftSlot (48px) ] [ text / mobileVote / statsSlot ] [ desktopVote ]
 */
const StatementCardShell: FC<StatementCardShellProps> = ({
  leftSlot,
  text,
  statsSlot,
  voteControls,
  sx,
}) => {
  const isMobile = useIsMobile();

  return (
    <Card sx={{ p: 2, ...sx }}>
      <Stack direction="row" spacing={2}>
        {/* Left column: rank or placeholder */}
        <Stack
          alignItems="center"
          justifyContent="center"
          sx={{ width: 48, minWidth: 48, flexShrink: 0 }}
        >
          {leftSlot}
        </Stack>

        {/* Middle column: text + inline vote (mobile) + stats */}
        <Stack
          spacing={1.5}
          sx={{ flex: 1, minWidth: 0 }}
          justifyContent="space-between"
        >
          <Typography variant="h6" sx={{ fontWeight: 500 }}>
            {text}
          </Typography>

          {/* Inline vote controls on mobile */}
          {isMobile && voteControls}

          {statsSlot}
        </Stack>

        {/* Right column: vertical vote controls on desktop */}
        {!isMobile && voteControls && (
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{ flexShrink: 0, ml: "auto" }}
          >
            {voteControls}
          </Stack>
        )}
      </Stack>
    </Card>
  );
};

export default StatementCardShell;
