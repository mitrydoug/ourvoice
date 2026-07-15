import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Card, InputBase, Stack, Typography } from "@mui/material";
import { useForumNavigate } from "../hooks/useForumNavigate";

import { useUserVotes } from "../state/UserVotes";
import { useForum } from "../state/Forum";
import { useWalletAuth } from "@/wallet";
import SupportVoteControls from "./SupportVoteControls";
import SimilarStatements from "./SimilarStatements";
import {
  creditsToParts,
  supportCreditsToAllocatedCredits,
  supportCreditsToAllocatedParts,
} from "../util";

const MAX_STATEMENT_LENGTH = 120;
const DRAFT_SAVE_DEBOUNCE_MS = 300;

interface PersistedCreateStatementDraft {
  text: string;
  initialSupport: number;
}

const createDraftStorageKey = (
  chainFingerprint: string,
  forumName: string,
  addressKey: string,
): string =>
  `symvolia:create-draft:${chainFingerprint}:${forumName}:${addressKey}`;

const loadDraftFromStorage = (
  key: string,
): PersistedCreateStatementDraft | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PersistedCreateStatementDraft>;
    return {
      text: typeof parsed.text === "string" ? parsed.text : "",
      initialSupport: Number.isFinite(parsed.initialSupport)
        ? Number(parsed.initialSupport)
        : 0,
    };
  } catch {
    return null;
  }
};

const saveDraftToStorage = (
  key: string,
  draft: PersistedCreateStatementDraft,
): void => {
  try {
    localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // Ignore localStorage write failures.
  }
};

const clearDraftFromStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore localStorage removal failures.
  }
};

const CreateStatementForm: FC = () => {
  const navigate = useForumNavigate();
  const [text, setText] = useState("");
  const [initialSupport, setInitialSupport] = useState(0);
  const [hasHydratedDraft, setHasHydratedDraft] = useState(false);
  const hydratedDraftKeyRef = useRef<string | undefined>(undefined);

  const { isUserVerified, stageStatement, setPendingDraftCost } =
    useUserVotes();
  const { address } = useWalletAuth();
  const { creditMultiplier, name: forumName, chainFingerprint } = useForum();
  const draftStorageKey = useMemo(() => {
    if (!chainFingerprint) return undefined;

    return createDraftStorageKey(
      chainFingerprint,
      forumName,
      address?.slice(0, 10) ?? "anon",
    );
  }, [address, chainFingerprint, forumName]);

  useEffect(() => {
    if (!draftStorageKey) {
      hydratedDraftKeyRef.current = undefined;
      setHasHydratedDraft(false);
      return;
    }

    if (hydratedDraftKeyRef.current === draftStorageKey) {
      return;
    }

    hydratedDraftKeyRef.current = draftStorageKey;

    if (text !== "" || initialSupport !== 0) {
      setHasHydratedDraft(true);
      return;
    }

    const draft = loadDraftFromStorage(draftStorageKey);
    if (draft) {
      setText(draft.text.slice(0, MAX_STATEMENT_LENGTH));
      setInitialSupport(draft.initialSupport);
    }
    setHasHydratedDraft(true);
  }, [draftStorageKey, initialSupport, text]);

  useEffect(() => {
    if (!draftStorageKey || !hasHydratedDraft) return;

    const handle = window.setTimeout(() => {
      if (text.trim() === "" && initialSupport === 0) {
        clearDraftFromStorage(draftStorageKey);
        return;
      }

      saveDraftToStorage(draftStorageKey, {
        text,
        initialSupport,
      });
    }, DRAFT_SAVE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(handle);
    };
  }, [draftStorageKey, hasHydratedDraft, initialSupport, text]);

  // ── Handlers ───────────────────────────────────────────────────────────
  const updateText = useCallback((textVal: string) => {
    if (textVal.length <= MAX_STATEMENT_LENGTH) {
      setText(textVal);
    }
  }, []);

  // Keep the credit bar in sync with the draft's initial support (cost in credit parts)
  const draftCreditCost = supportCreditsToAllocatedParts(
    initialSupport,
    creditMultiplier,
  );
  useEffect(() => {
    setPendingDraftCost(draftCreditCost);
    return () => setPendingDraftCost(0);
  }, [draftCreditCost, setPendingDraftCost]);

  const handleCreate = useCallback(() => {
    if (text.length > 0 && isUserVerified && stageStatement) {
      setPendingDraftCost(0);
      if (draftStorageKey) {
        clearDraftFromStorage(draftStorageKey);
      }
      stageStatement(text, creditsToParts(initialSupport, creditMultiplier));
      void navigate("/my-statements");
    }
  }, [
    draftStorageKey,
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
    if (draftStorageKey) {
      clearDraftFromStorage(draftStorageKey);
    }
    void navigate("/");
  }, [draftStorageKey, setPendingDraftCost, navigate]);

  return (
    <Box>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <Typography variant="h6" sx={{ pb: 1.5, fontWeight: 600 }}>
        New Statement
      </Typography>

      {/* Statement input — card-style with vote toggle on the right */}
      <Card sx={{ p: 2 }}>
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
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
          >
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
            <SupportVoteControls
              userSupport={initialSupport}
              uncommittedSupport={initialSupport !== 0}
              onUserVoteChange={setInitialSupport}
              onClear={() => setInitialSupport(0)}
              creditsTooltip={`This statement will use ${supportCreditsToAllocatedCredits(initialSupport)} credits for ${initialSupport} support`}
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
