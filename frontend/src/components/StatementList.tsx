import { FC, useEffect, useRef } from "react";
import { Statement } from "../types";
import {
  Box,
  CircularProgress,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import StatementCard from "./StatementCard";

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

  if (!isLoading && statements.length === 0) {
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
