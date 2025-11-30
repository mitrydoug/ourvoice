import React, { FC } from "react";
import { Statement } from "../types";
import { Box, Pagination, Stack } from "@mui/material";
import StatementCard from "./StatementCard";

type StatementListProps = {
  statements: Statement[];
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
};

const StatementList: FC<StatementListProps> = ({
  statements,
  page,
  pageCount,
  onPageChange,
}) => {
  return (
    <>
      <Stack spacing={1}>
        {statements?.map((stmt, idx) => (
          <StatementCard key={`stmt-${idx}`} statement={stmt} />
        ))}
      </Stack>
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Pagination
          page={page}
          count={pageCount}
          onChange={(e, page) => onPageChange(page)}
        />
      </Box>
    </>
  );
};

export default StatementList;
