import { FC, useEffect } from "react";
import { Card, Stack, Typography } from "@mui/material";

import { useUserVotes } from "../state/UserVotes";
import VoteToggle from "./VoteToggle";
import { useBlockNumber, useReadContract } from "wagmi";
import { useForum, FORUM_ABI } from "../state/Forum";

const LOOK_BACK_BLOCKS = BigInt(1);

interface Statement {
  id: bigint;
  text: string;
  createdTimestamp: bigint;
  support: bigint;
  rank: bigint;
}

type StatementCardProps = {
  statement: Statement;
};

export const StatementCard: FC<StatementCardProps> = ({ statement }) => {
  const {
    isUserVerified,
    dispatch,
    getEffectiveSupport,
    getOnChainSupport,
    hasAdjustment,
  } = useUserVotes();
  const { forumContractAddress } = useForum();

  // Watch for new blocks
  const { data: blockNumber } = useBlockNumber({ watch: true });

  const { data: historicalData, refetch: refetchHistorical } = useReadContract({
    address: forumContractAddress,
    abi: FORUM_ABI,
    functionName: "getStatementsById",
    args: [[statement.id]],
    blockNumber: blockNumber ? blockNumber - LOOK_BACK_BLOCKS : undefined,
    query: { enabled: !!blockNumber },
  });

  // Sync historical data query on each new block
  useEffect(() => {
    if (blockNumber) {
      refetchHistorical();
    }
  }, [blockNumber, refetchHistorical]);

  const statementOneWeekAgo = historicalData
    ? (historicalData[0] as Statement)
    : null;

  const lastWeekRank = statementOneWeekAgo
    ? Number(statementOneWeekAgo.rank) + 1
    : null;

  const userSupport = isUserVerified
    ? getEffectiveSupport(Number(statement.id))
    : 0;
  const hasUncommittedSupport = isUserVerified
    ? hasAdjustment(Number(statement.id))
    : false;

  const handleSupportChange = (newSupport: number) => {
    if (!isUserVerified) return;
    const onChainSupport = getOnChainSupport(Number(statement.id));
    dispatch({
      type: "STAGE_USER_SUPPORT",
      payload: {
        statementId: statement.id,
        adjustment: newSupport - onChainSupport,
      },
    });
  };

  // Placeholder values for peak and weeks
  const peakRank = 1;
  const weeksOnChart = 12;

  return (
    <Card sx={{ p: 2 }}>
      <Stack spacing={2}>
        {/* Statement text */}
        <Typography variant="h6" sx={{ fontWeight: 500 }}>
          {statement.text}
        </Typography>

        {/* Stats row */}
        <Stack direction="row" alignItems="flex-start" spacing={2}>
          {/* Rank */}
          <Stack alignItems="center" spacing={0}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: "0.7rem" }}
            >
              RANK
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 400, lineHeight: 1 }}>
              {Number(statement.rank) + 1}
            </Typography>
          </Stack>

          {/* Support controls with labels below */}
          {isUserVerified && (
            <Stack spacing={0.5}>
              {/* Vote toggle */}
              <VoteToggle
                userSupport={userSupport}
                uncommittedSupport={hasUncommittedSupport}
                onUserVoteChange={handleSupportChange}
              />

              {/* Labels row - aligned under buttons */}
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: "0.7rem", minWidth: 56, textAlign: "center" }}
                >
                  LW {lastWeekRank ?? "-"}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: "0.7rem", minWidth: 60, textAlign: "center" }}
                >
                  PEAK {peakRank}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: "0.7rem", minWidth: 56, textAlign: "center" }}
                >
                  WEEKS {weeksOnChart}
                </Typography>
              </Stack>
            </Stack>
          )}
        </Stack>
      </Stack>
    </Card>
  );
};

export default StatementCard;
