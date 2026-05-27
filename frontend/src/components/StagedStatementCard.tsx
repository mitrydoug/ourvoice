import { FC } from "react";
import {
  ButtonBase,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import UTurnLeftIcon from "@mui/icons-material/UTurnLeft";

import { StagedStatement } from "../state/UserVotes";
import VoteToggle from "./VoteToggle";
import StatementCardShell from "./StatementCardShell";
import { useCreditConversion } from "../hooks/useCreditConversion";

interface StagedStatementCardProps {
  staged: StagedStatement;
  onUnstage?: (tempId: string) => void;
  onUpdateSupport?: (tempId: string, newSupport: number) => void;
}

const StagedStatementCard: FC<StagedStatementCardProps> = ({
  staged,
  onUnstage,
  onUpdateSupport,
}) => {
  const { toCredits, toParts } = useCreditConversion();
  const initialSupportCredits = toCredits(staged.initialSupport);
  const leftSlot = (
    <Typography
      variant="caption"
      sx={{
        fontWeight: 600,
        fontSize: "0.6rem",
        lineHeight: 1.2,
        color: "warning.main",
        textAlign: "center",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      Pending
    </Typography>
  );

  const statsSlot = (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
      {onUnstage && (
        <IconButton
          size="small"
          onClick={() => onUnstage(staged.tempId)}
          aria-label="Remove staged statement"
          sx={{ p: 0.25 }}
        >
          <DeleteOutlineIcon fontSize="small" color="action" />
        </IconButton>
      )}
    </Stack>
  );

  const voteControls = onUpdateSupport ? (
    <VoteToggle
      userSupport={initialSupportCredits}
      uncommittedSupport={true}
      onUserVoteChange={(newCreditSupport) =>
        onUpdateSupport(staged.tempId, toParts(newCreditSupport))
      }
      direction="vertical"
    />
  ) : undefined;
  const rightStatsSlot =
    onUpdateSupport && initialSupportCredits !== 0 ? (
      <Tooltip title="Clear support" arrow>
        <ButtonBase
          aria-label="Clear support"
          onClick={() => onUpdateSupport(staged.tempId, 0)}
          sx={{
            width: 32,
            height: 24,
            color: "text.secondary",
            "&:hover": { color: "text.primary" },
          }}
        >
          <UTurnLeftIcon sx={{ fontSize: 21, transform: "rotate(90deg)" }} />
        </ButtonBase>
      </Tooltip>
    ) : undefined;

  return (
    <StatementCardShell
      leftSlot={leftSlot}
      text={staged.text}
      statsSlot={statsSlot}
      voteControls={voteControls}
      rightStatsSlot={rightStatsSlot}
      sx={{
        opacity: 0.85,
        borderLeft: "3.5px solid",
        borderColor: "#ffb74d",
      }}
    />
  );
};

export default StagedStatementCard;
