import { FC } from "react";
import { IconButton, Stack, Typography } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

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
      userSupport={toCredits(staged.initialSupport)}
      uncommittedSupport={true}
      onUserVoteChange={(newCreditSupport) =>
        onUpdateSupport(staged.tempId, toParts(newCreditSupport))
      }
      direction="vertical"
    />
  ) : undefined;

  return (
    <StatementCardShell
      leftSlot={leftSlot}
      text={staged.text}
      statsSlot={statsSlot}
      voteControls={voteControls}
      sx={{
        opacity: 0.85,
        borderLeft: "3.5px solid",
        borderColor: "#ffb74d",
      }}
    />
  );
};

export default StagedStatementCard;
