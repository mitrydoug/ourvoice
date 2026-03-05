import { FC } from "react";
import { Chip, IconButton, Stack } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import { StagedStatement } from "../state/UserVotes";
import VoteToggle from "./VoteToggle";
import StatementCardShell from "./StatementCardShell";

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
  const statsSlot = (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
      <Chip label="Pending" size="small" color="warning" variant="outlined" />
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
      userSupport={staged.initialSupport}
      uncommittedSupport={true}
      onUserVoteChange={(newSupport) =>
        onUpdateSupport(staged.tempId, newSupport)
      }
      direction="vertical"
    />
  ) : undefined;

  return (
    <StatementCardShell
      text={staged.text}
      statsSlot={statsSlot}
      voteControls={voteControls}
      sx={{ opacity: 0.85 }}
    />
  );
};

export default StagedStatementCard;
