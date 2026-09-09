'use client';

import * as React from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { PALETTE, TOOLTIP_STYLE } from './recharts-theme';

export interface PieChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

export interface PieChartProps {
  data: PieChartDataPoint[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  showLegend?: boolean;
  showTooltip?: boolean;
  variant?: 'pie' | 'donut';
  colors?: string[];
}

export function PieChart({
  data,
  height = 300,
  showLegend = true,
  showTooltip = true,
  variant = 'donut',
  colors,
}: PieChartProps) {
  const palette = colors || PALETTE;
  const inner = variant === 'donut' ? 60 : 0;
  const outer = variant === 'donut' ? 100 : 120;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={inner}
          outerRadius={outer}
          paddingAngle={2}
          dataKey="value"
          stroke="hsl(0, 0%, 100%)"
          strokeWidth={2}
        >
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={entry.color || palette[index % palette.length]} />
          ))}
        </Pie>
        {showTooltip && (
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={((value: unknown, name: unknown) => [typeof value === 'number' ? value.toLocaleString() : String(value), String(name)]) as never}
          />
        )}
        {showLegend && (
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
          />
        )}
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}

export interface RadialBarProps {
  data: PieChartDataPoint[];
  height?: number;
  colors?: string[];
}

export function RadialBarChart({
  data,
  height = 250,
  colors,
}: RadialBarProps) {
  const palette = colors || PALETTE;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius="50%"
          outerRadius="90%"
          paddingAngle={3}
          dataKey="value"
          stroke="hsl(0, 0%, 100%)"
          strokeWidth={2}
          startAngle={90}
          endAngle={-270}
        >
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={entry.color || palette[index % palette.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={((value: unknown, name: unknown) => [`${typeof value === 'number' ? value : String(value)}%`, String(name)]) as never}
        />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}
