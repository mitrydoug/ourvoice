import { FC } from "react";
import { Box, CircularProgress, Typography, useTheme } from "@mui/material";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from "recharts";
import type { ActiveDotProps } from "recharts/types/util/types";
import {
  useHistoricalSupport,
  SupportDataPoint,
} from "@/hooks/useHistoricalSupport";

interface SupportChartProps {
  statementId: bigint;
}

const SupportChart: FC<SupportChartProps> = ({ statementId }) => {
  const { data, isLoading } = useHistoricalSupport(statementId);
  const theme = useTheme();

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (data.length < 2) {
    return (
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ py: 2, textAlign: "center" }}
      >
        Not enough history to chart.
      </Typography>
    );
  }

  const primaryColor = theme.palette.primary.main;
  const textColor = theme.palette.text.primary;
  const bgColor = theme.palette.background.paper;

  /** Active dot that also renders the y-value as a label above the point. */
  const renderActiveDot = (dotProps: ActiveDotProps) => {
    const cx = dotProps.cx ?? 0;
    const cy = dotProps.cy ?? 0;
    const idx = dotProps.index ?? 0;
    const dotPayload = dotProps.payload as SupportDataPoint | undefined;

    // Clamp text anchor so labels at the edges don't get clipped
    let anchor: "start" | "middle" | "end" = "middle";
    if (idx === 0) anchor = "start";
    else if (idx === data.length - 1) anchor = "end";

    return (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={4}
          stroke={primaryColor}
          strokeWidth={2}
          fill={bgColor}
        />
        <text
          x={cx}
          y={cy - 10}
          textAnchor={anchor}
          fontSize={11}
          fontWeight={600}
          fill={textColor}
        >
          {dotPayload?.support}
        </text>
      </g>
    );
  };

  return (
    <Box sx={{ width: "100%", height: 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 16, right: 12, bottom: 0, left: -40 }}
        >
          <defs>
            <linearGradient id="supportGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={primaryColor} stopOpacity={0.25} />
              <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Area
            type="monotone"
            dataKey="support"
            stroke={primaryColor}
            strokeWidth={2}
            fill="url(#supportGradient)"
            dot={false}
            activeDot={renderActiveDot}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default SupportChart;
