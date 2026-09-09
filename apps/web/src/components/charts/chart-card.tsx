'use client';

import * as React from 'react';
import { cn } from '@hapcargo/ui';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@hapcargo/ui';
import { Download } from '@hapcargo/ui';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@hapcargo/ui';
import { Button } from '@hapcargo/ui';

export interface ChartCardProps {
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  exportData?: { label: string; value: number }[];
  exportFilename?: string;
  height?: number;
  loading?: boolean;
}

export function ChartCard({
  title,
  description,
  className,
  children,
  actions,
  exportData,
  exportFilename = 'chart-data',
}: ChartCardProps) {
  return (
    <Card className={cn('', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {exportData && exportData.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Download className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export Chart</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => exportToCSV(exportData, exportFilename)}
                >
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => exportToExcel(exportData, exportFilename)}
                >
                  Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent className="pl-2 pr-6 pb-4">
        {children}
      </CardContent>
    </Card>
  );
}

function exportToCSV(data: { label: string; value: number }[], filename: string) {
  const headers = 'Label,Value\n';
  const rows = data.map((d) => `${d.label},${d.value}`).join('\n');
  const blob = new Blob([headers + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportToExcel(data: { label: string; value: number }[], filename: string) {
  import('xlsx').then((XLSX) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, `${filename}.xlsx`);
  });
}
