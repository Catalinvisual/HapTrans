'use client';

import * as React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { PALETTE, CHART_STYLE, TOOLTIP_STYLE } from './recharts-theme';

export type LineChartDataPoint = Record<string, string | number>;

export interface LineChartSeries {
  key: string;
  color?: string;
  label: string;
  dashed?: boolean;
}

export interface LineChartProps {
  data: LineChartDataPoint[];
  series: LineChartSeries[];
  xKey: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
}

export function LineChart({
  data,
  series,
  xKey,
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
}: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart
        data={data}
        margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
      >
        {showGrid && (
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(214, 32%, 90%)"
            vertical={false}
          />
        )}
        <XAxis
          dataKey={xKey}
          axisLine={false}
          tickLine={false}
          tick={CHART_STYLE}
          dy={10}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={CHART_STYLE}
          dx={-10}
        />
        {showTooltip && (
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ stroke: 'hsl(214, 32%, 90%)', strokeWidth: 1 }}
          />
        )}
        {showLegend && (
          <Legend
            verticalAlign="top"
            height={36}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
          />
        )}
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color || PALETTE[i % PALETTE.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2 }}
            strokeDasharray={s.dashed ? '5 5' : undefined}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
