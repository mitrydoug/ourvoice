import { FC, useEffect, useRef } from "react";
import { Statement } from "../types";
import {
  Box,
  Card,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import StatementCard from "./StatementCard";
import { type StagedStatement } from "../state/UserVotes";

type StatementListProps = {
  statements: Statement[];
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  /** How many pages the user has loaded beyond the first (0 = first page only). */
  pageIndex?: number;
  /** Label shown next to the spinner while loading. */
  loadingLabel?: string;
  isBookmarked?: (statementId: number) => boolean;
  onToggleBookmark?: (statementId: number) => void;
  /** Staged (not yet committed) statements to render above the on-chain list. */
  stagedStatements?: StagedStatement[];
  /** Called when the user removes a staged statement. */
  onUnstagStatement?: (tempId: string) => void;
};

const StatementList: FC<StatementListProps> = ({
  statements,
  hasMore,
  isLoading,
  onLoadMore,
  pageIndex = 0,
  loadingLabel = "Loading more statements\u2026",
  isBookmarked,
  onToggleBookmark,
  stagedStatements,
  onUnstagStatement,
}) => {
  const theme = useTheme();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    // Find the nearest scrollable ancestor to use as the observer root.
    // The app layout scrolls inside a Container (overflow-y: auto), not
    // the viewport, so a default (viewport) root would miss scroll events.
    let root: Element | null = null;
    let el: Element | null = sentinel.parentElement;
    while (el) {
      const { overflowY } = getComputedStyle(el);
      if (overflowY === "auto" || overflowY === "scroll") {
        root = el;
        break;
      }
      el = el.parentElement;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      { threshold: 0.1, root },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading, onLoadMore]);

  const hasStagedStatements = stagedStatements && stagedStatements.length > 0;

  if (!isLoading && statements.length === 0 && !hasStagedStatements) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
        }}
      >
        <Typography variant="body1" color="text.secondary">
          No statements found.
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Stack spacing={1}>
        {/* Staged (pending) statements */}
        {hasStagedStatements &&
          stagedStatements.map((staged) => (
            <Card
              key={`staged-${staged.tempId}`}
              sx={{
                p: 2,
                opacity: 0.85,
                border: "1px dashed",
                borderColor: "warning.main",
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Chip
                      label="Pending"
                      size="small"
                      color="warning"
                      variant="outlined"
                    />
                    {staged.initialSupport !== 0 && (
                      <Typography variant="caption" color="text.secondary">
                        Initial support: {staged.initialSupport}
                      </Typography>
                    )}
                  </Stack>
                  <Typography variant="h6" sx={{ fontWeight: 500 }}>
                    {staged.text}
                  </Typography>
                </Stack>
                {onUnstagStatement && (
                  <IconButton
                    size="small"
                    onClick={() => onUnstagStatement(staged.tempId)}
                    aria-label="Remove staged statement"
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                )}
              </Stack>
            </Card>
          ))}

        {/* On-chain statements */}
        {statements?.map((stmt) => (
          <StatementCard
            key={`stmt-${Number(stmt.id)}`}
            statement={stmt}
            isBookmarked={isBookmarked?.(Number(stmt.id))}
            onToggleBookmark={onToggleBookmark}
          />
        ))}
      </Stack>

      {/* Sentinel element for intersection observer - also displays status text */}
      <Box
        ref={sentinelRef}
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          py: theme.custom.statementList.endIndicatorPadding,
          minHeight: "20px",
        }}
      >
        {isLoading && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">
              {loadingLabel}
            </Typography>
          </Box>
        )}
        {!hasMore && !isLoading && statements.length > 0 && pageIndex > 0 && (
          <Typography variant="body2" color="text.secondary">
            No more statements
          </Typography>
        )}
      </Box>
    </>
  );
};

export default StatementList;
