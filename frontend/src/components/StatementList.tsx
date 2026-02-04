import { FC, useEffect, useRef } from "react";
import { Statement } from "../types";
import { Box, Stack, Typography, useTheme } from "@mui/material";
import StatementCard from "./StatementCard";

type StatementListProps = {
  statements: Statement[];
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
};

const StatementList: FC<StatementListProps> = ({
  statements,
  hasMore,
  isLoading,
  onLoadMore,
}) => {
  const theme = useTheme();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading, onLoadMore]);

  return (
    <>
      <Stack spacing={1}>
        {statements?.map((stmt) => (
          <StatementCard key={`stmt-${Number(stmt.id)}`} statement={stmt} />
        ))}
      </Stack>

      {/* Sentinel element for intersection observer - also displays status text */}
      <Box
        ref={sentinelRef}
        sx={{
          display: "flex",
          justifyContent: "center",
          py: theme.custom.statementList.endIndicatorPadding,
          minHeight: "20px",
        }}
      >
        {isLoading && (
          <Typography variant="body2" color="text.secondary">
            Loading more statements...
          </Typography>
        )}
        {!hasMore && statements.length > 0 && (
          <Typography variant="body2" color="text.secondary">
            No more statements
          </Typography>
        )}
      </Box>
    </>
  );
};

export default StatementList;
