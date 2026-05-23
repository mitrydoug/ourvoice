import { FC, useCallback, useEffect, useState } from "react";
import { Box, Button, Card, InputBase, Stack, Typography } from "@mui/material";
import { useForumNavigate } from "../hooks/useForumNavigate";

import { useUserVotes } from "../state/UserVotes";
import { useForum } from "../state/Forum";
import VoteToggle from "./VoteToggle";
import SimilarStatements from "./SimilarStatements";
import { creditsToParts } from "../util";

const MAX_STATEMENT_LENGTH = 280;

const CreateStatementForm: FC = () => {
  const navigate = useForumNavigate();
  const [text, setText] = useState("");
  const [initialSupport, setInitialSupport] = useState(0);

  const { isUserVerified, stageStatement, setPendingDraftCost } =
    useUserVotes();
  const { creditMultiplier } = useForum();

  // ── Handlers ───────────────────────────────────────────────────────────
  const updateText = useCallback((textVal: string) => {
    if (textVal.length <= MAX_STATEMENT_LENGTH) {
      setText(textVal);
    }
  }, []);

  // Keep the credit bar in sync with the draft's initial support (cost in credit parts)
  const draftSupportParts = creditsToParts(
    Math.abs(initialSupport),
    creditMultiplier,
  );
  const draftCreditCost =
    (draftSupportParts * (draftSupportParts + creditMultiplier)) /
    (2 * creditMultiplier);
  useEffect(() => {
    setPendingDraftCost(draftCreditCost);
    return () => setPendingDraftCost(0);
  }, [draftCreditCost, setPendingDraftCost]);

  const handleCreate = useCallback(() => {
    if (text.length > 0 && isUserVerified && stageStatement) {
      setPendingDraftCost(0);
      stageStatement(text, creditsToParts(initialSupport, creditMultiplier));
      void navigate("/my-statements");
    }
  }, [
    text,
    initialSupport,
    isUserVerified,
    creditMultiplier,
    stageStatement,
    setPendingDraftCost,
    navigate,
  ]);

  const handleCancel = useCallback(() => {
    setPendingDraftCost(0);
    void navigate("/");
  }, [setPendingDraftCost, navigate]);

  return (
    <Box>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <Typography variant="h6" sx={{ pb: 1.5, fontWeight: 600 }}>
        New Statement
      </Typography>

      {/* Statement input — card-style with vote toggle on the right */}
      <Card sx={{ p: 2 }}>
        <Stack direction="row" spacing={2}>
          {/* Text area + char count */}
          <Stack sx={{ flex: 1, minWidth: 0 }} spacing={0.5}>
            <InputBase
              placeholder="What's on your mind?"
              value={text}
              onChange={(e) => updateText(e.target.value)}
              multiline
              minRows={3}
              maxRows={6}
              autoFocus
              sx={{
                fontSize: "1.05rem",
                lineHeight: 1.5,
                width: "100%",
              }}
            />
            <Typography
              variant="body2"
              sx={{
                textAlign: "right",
                fontWeight:
                  text.length < MAX_STATEMENT_LENGTH * 0.9 ? "normal" : "bold",
              }}
              color={
                text.length < MAX_STATEMENT_LENGTH * 0.8
                  ? "text.secondary"
                  : text.length < MAX_STATEMENT_LENGTH * 0.9
                    ? "DarkOrange"
                    : "red"
              }
            >
              {text.length} / {MAX_STATEMENT_LENGTH}
            </Typography>
          </Stack>

          {/* Vertical vote toggle on the right */}
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{ flexShrink: 0 }}
          >
            <VoteToggle
              userSupport={initialSupport}
              uncommittedSupport={initialSupport !== 0}
              onUserVoteChange={setInitialSupport}
              direction="vertical"
            />
          </Stack>
        </Stack>
      </Card>

      {/* ── Action buttons ──────────────────────────────────────────── */}
      <Stack
        direction="row"
        justifyContent="flex-end"
        spacing={2}
        sx={{ mt: 2 }}
      >
        <Button onClick={handleCancel}>Cancel</Button>
        <Button
          variant="contained"
          disabled={text.trim().length === 0}
          onClick={handleCreate}
        >
          Create
        </Button>
      </Stack>

      {/* ── Similar Statements ────────────────────────────────────── */}
      <Box sx={{ mt: 4 }}>
        <SimilarStatements query={text} />
      </Box>
    </Box>
  );
};

export default CreateStatementForm;
