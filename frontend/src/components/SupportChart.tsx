import { FC } from "react";
import { Box, CircularProgress, Typography, useTheme } from "@mui/material";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TooltipProps } from "recharts";
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";
import { useHistoricalSupport, SupportDataPoint } from "@/hooks/useHistoricalSupport";

interface SupportChartProps {
  statementId: bigint;
}

/** Props received by the tooltip content renderer. */
interface ChartTooltipPayload {
  active?: boolean;
  payload?: { payload: SupportDataPoint }[];
}

/** Minimal custom tooltip shown on hover. */
const ChartTooltip: FC<TooltipProps<ValueType, NameType>> = (outerProps) => {
  const props = outerProps as unknown as ChartTooltipPayload;
  if (!props.active || !props.payload?.length) return null;
  const { label, support } = props.payload[0].payload;
  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        px: 1.5,
        py: 0.75,
        boxShadow: 1,
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {support}
      </Typography>
    </Box>
  );
};

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

  return (
    <Box sx={{ width: "100%", height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
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
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="support"
            stroke={primaryColor}
            strokeWidth={2}
            fill="url(#supportGradient)"
            dot={false}
            activeDot={{
              r: 4,
              stroke: primaryColor,
              strokeWidth: 2,
              fill: theme.palette.background.paper,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default SupportChart;
