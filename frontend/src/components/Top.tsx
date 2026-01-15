import React, { FC, useState } from "react";
import { useReadContracts } from "wagmi";
import { useForum, FORUM_ABI } from "../state/Forum";
import { Statement } from "../types";
import StatementList from "./StatementList";

const PAGE_SIZE = 10;

const Top: FC = () => {
  const { forumContractAddress } = useForum();

  const [page, setPage] = useState(1);

  const result = useReadContracts({
    contracts: [
      {
        address: forumContractAddress,
        abi: FORUM_ABI,
        functionName: "rankedCount",
        args: [],
      },
      {
        address: forumContractAddress,
        abi: FORUM_ABI,
        functionName: "getRankedStatementsPage",
        args: [BigInt((page - 1) * PAGE_SIZE), BigInt(PAGE_SIZE)],
      },
    ],
  });

  const rankedCount =
    result.data && (result.data[0].result as bigint | undefined);
  const statementsPage =
    result.data && (result.data[1].result as Statement[] | undefined);

  const lastPage = Math.min(
    Math.max(10, 2 * page),
    Math.floor((Number(rankedCount) - 1) / PAGE_SIZE) + 1,
  );
  console.log("page is ", page);
  console.log("lastPage is ", lastPage);

  return statementsPage ? (
    <StatementList
      statements={statementsPage}
      page={page}
      pageCount={lastPage}
      onPageChange={setPage}
    />
  ) : (
    <></>
  );
};

export default Top;
