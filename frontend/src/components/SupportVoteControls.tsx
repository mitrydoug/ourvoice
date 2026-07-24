import { FC } from "react";
import { Box, Stack, Tooltip, Typography } from "@mui/material";

import { supportCreditsToAllocatedCredits } from "../util";
import AnimatedCounter from "./AnimatedCounter";
import VoteToggle from "./VoteToggle";

const labelSx = {
  fontSize: "0.55rem",
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
  color: "text.disabled",
  lineHeight: 1,
};

const CoinIcon = ({ size = 14 }: { size?: number }) => (
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

type SupportVoteControlsProps = {
  userSupport: number;
  uncommittedSupport: boolean;
  onUserVoteChange: (newVoteCount: number) => void;
  onClear?: () => void;
  creditsTooltip?: string;
  /** Show a small "credits" label next to the coin (detail page only). */
  showCreditsLabel?: boolean;
};

const SupportVoteControls: FC<SupportVoteControlsProps> = ({
  userSupport,
  uncommittedSupport,
  onUserVoteChange,
  onClear,
  creditsTooltip,
  showCreditsLabel = false,
}) => {
  const creditsAllocated = supportCreditsToAllocatedCredits(userSupport);

  return (
    <Stack direction="row" alignItems="flex-start" spacing={1.5}>
      {creditsAllocated > 0 && (
        <Stack alignItems="center" spacing={0.5}>
          <Tooltip
            title={
              creditsTooltip ??
              `${creditsAllocated} credits providing ${userSupport} support`
            }
            arrow
          >
            <Box sx={{ height: 24, display: "flex", alignItems: "center" }}>
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
            </Box>
          </Tooltip>
          {showCreditsLabel && (
            <Typography component="span" sx={labelSx}>
              Credits
            </Typography>
          )}
        </Stack>
      )}

      <Stack alignItems="center" spacing={0.5}>
        <Box sx={{ height: 24, display: "flex", alignItems: "center" }}>
          <VoteToggle
            userSupport={userSupport}
            uncommittedSupport={uncommittedSupport}
            onUserVoteChange={onUserVoteChange}
            direction="compact"
            onClear={onClear}
          />
        </Box>
        {showCreditsLabel && (
          <Typography component="span" sx={labelSx}>
            Your Support
          </Typography>
        )}
      </Stack>
    </Stack>
  );
};

export default SupportVoteControls;
