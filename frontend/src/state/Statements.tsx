import React, {
  FC,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from "react";
import { forumContractConfig } from "../contracts";
import { useReadContract, useWriteContract } from "wagmi";

type StatementsPageParams = {
  start: number;
  limit?: number;
};

export const useStatementsPage = ({
  start,
  limit = 25,
}: StatementsPageParams) => {
  const { data: _statements } = useReadContract({
    ...forumContractConfig,
    functionName: "getRankedStatementsPage",
    args: [BigInt(start), BigInt(limit)],
  });
};
