import { FC } from "react";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import ButtonBase from "@mui/material/ButtonBase";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

interface VoteToggleProps {
  userSupport: number;
  uncommittedSupport: boolean;
  onUserVoteChange: (newVoteCount: number) => void;
  direction?: "horizontal" | "vertical";
}

interface SupportButtonProps {
  label: string;
  onClick: () => void;
  variant: "increase" | "decrease";
  hasUncommittedChange: boolean;
}

const SupportButton: FC<SupportButtonProps> = ({
  label,
  onClick,
  variant,
  hasUncommittedChange,
}) => {
  const baseColor = variant === "increase" ? "#e8f5e9" : "#ffebee";
  const hoverColor = variant === "increase" ? "#c8e6c9" : "#ffcdd2";
  const textColor = variant === "increase" ? "#2e7d32" : "#c62828";
  const borderColor = hasUncommittedChange
    ? variant === "increase"
      ? "#2e7d32"
      : "#c62828"
    : "transparent";

  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        flex: 1,
        backgroundColor: baseColor,
        color: textColor,
        borderRadius: 1,
        px: 2,
        py: 0.5,
        fontWeight: 600,
        fontSize: "1rem",
        border: `2px solid ${borderColor}`,
        "&:hover": {
          backgroundColor: hoverColor,
        },
      }}
    >
      {label}
    </ButtonBase>
  );
};

const VoteToggle: FC<VoteToggleProps> = ({
  userSupport,
  uncommittedSupport,
  onUserVoteChange,
  direction = "horizontal",
}) => {
  if (direction === "vertical") {
    const numberColor =
      userSupport > 0
        ? "success.main"
        : userSupport < 0
          ? "error.main"
          : "text.secondary";

    return (
      <Stack alignItems="center" spacing={0}>
        <ButtonBase
          onClick={() => onUserVoteChange(userSupport + 1)}
          sx={{
            color: "text.secondary",
            "&:hover": { color: "success.main" },
          }}
        >
          <KeyboardArrowUpIcon sx={{ fontSize: 28 }} />
        </ButtonBase>
        <Typography
          variant="body1"
          sx={{
            fontWeight: 500,
            lineHeight: 1.2,
            color: numberColor,
          }}
        >
          {userSupport}
        </Typography>
        <ButtonBase
          onClick={() => onUserVoteChange(userSupport - 1)}
          sx={{
            color: "text.secondary",
            "&:hover": { color: "error.main" },
          }}
        >
          <KeyboardArrowDownIcon sx={{ fontSize: 28 }} />
        </ButtonBase>
      </Stack>
    );
  }

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{ width: "100%" }}
    >
      {/* Decrease button */}
      <SupportButton
        label="-1"
        onClick={() => onUserVoteChange(userSupport - 1)}
        variant="decrease"
        hasUncommittedChange={uncommittedSupport}
      />

      {/* Current support value */}
      <Typography
        variant="h4"
        sx={{ fontWeight: 400, minWidth: 60, textAlign: "center" }}
      >
        {userSupport}
      </Typography>

      {/* Increase button */}
      <SupportButton
        label="+1"
        onClick={() => onUserVoteChange(userSupport + 1)}
        variant="increase"
        hasUncommittedChange={uncommittedSupport}
      />
    </Stack>
  );
};

export default VoteToggle;
export { SupportButton };
