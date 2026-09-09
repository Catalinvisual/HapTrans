'use client';

import * as React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { PALETTE, CHART_STYLE, TOOLTIP_STYLE } from './recharts-theme';

export type BarChartDataPoint = Record<string, string | number>;

export interface BarChartSeries {
  key: string;
  color?: string;
  label: string;
  radius?: [number, number, number, number];
}

export interface BarChartProps {
  data: BarChartDataPoint[];
  series: BarChartSeries[];
  xKey: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  stacked?: boolean;
  horizontal?: boolean;
  colors?: string[];
}

export function BarChart({
  data,
  series,
  xKey,
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  stacked = false,
  horizontal = false,
  colors,
}: BarChartProps) {
  const palette = colors || PALETTE;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        layout={horizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 5, right: 10, left: horizontal ? 60 : -10, bottom: 0 }}
      >
        {showGrid && (
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(214, 32%, 90%)"
            vertical={false}
            horizontal={horizontal ? false : undefined}
          />
        )}
        {horizontal ? (
          <>
            <XAxis type="number" axisLine={false} tickLine={false} tick={CHART_STYLE} />
            <YAxis
              type="category"
              dataKey={xKey}
              axisLine={false}
              tickLine={false}
              tick={CHART_STYLE}
              width={60}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey={xKey}
              axisLine={false}
              tickLine={false}
              tick={CHART_STYLE}
              dy={10}
            />
            <YAxis axisLine={false} tickLine={false} tick={CHART_STYLE} dx={-10} />
          </>
        )}
        {showTooltip && (
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ fill: 'hsl(213, 25%, 95%)', radius: 4 }}
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
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={s.color || palette[i % palette.length]}
            stackId={stacked ? 'stack' : undefined}
            radius={s.radius || (stacked ? [0, 0, 0, 0] : [4, 4, 0, 0])}
            maxBarSize={40}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
