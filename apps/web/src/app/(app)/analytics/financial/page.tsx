'use client';

import * as React from 'react';
import { PageHeader, KpiCard, Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, Select, SelectTrigger, SelectContent, SelectItem, SelectValue, Tabs, TabsList, TabsTrigger, TabsContent, Spinner, cn } from '@hapcargo/ui';
import { DollarSign, TrendingUp, Target, Users, Truck, Download, BarChart, Activity, Clock, Globe, History } from '@hapcargo/ui';
import { ChartCard, AreaChart, BarChart as HapBarChart, LineChart, PieChart } from '@/components/charts';
import { exportToExcel, exportToPDF, formatCurrency, formatNumber, formatKm } from '@/lib/export';
import type { ExportColumn } from '@/lib/export';
import type { TimePeriod } from '@/lib/mock-analytics';
import { useFinancialData } from '@/lib/use-analytics';

export default function FinancialAnalyticsPage() {
  const [period, setPeriod] = React.useState<TimePeriod>('monthly');
  const [tab, setTab] = React.useState('overview');

  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useFinancialData(period);

  const trendData = data?.trend ?? [];
  const monthlyFinancials = data?.monthly ?? [];
  const customerPerf = data?.customers ?? [];
  const drivers = data?.drivers ?? [];
  const trucks = data?.fleet?.byType ?? [];
  const tripAnalytics = data?.trips ?? {
    totalTrips: 0,
    completedTrips: 0,
    activeTrips: 0,
    plannedTrips: 0,
    avgDistance: 0,
    avgDuration: 0,
    totalKm: 0,
    onTimeRate: 0,
  };
  const costBreakdown = data?.costBreakdown ?? [];
  const otifData = data?.otif ?? [];
  const countryData = data?.countries ?? [];
  const revenueBreakdown = data?.revenueBreakdown ?? [];
  const kpis = data?.kpis;

  const pct = (v: number | undefined, inverse = false) => {
    const value = Number(v ?? 0);
    const positive = inverse ? value <= 0 : value >= 0;
    return { value: Math.abs(Math.round(value * 10) / 10), trend: value === 0 ? ('neutral' as const) : positive ? ('up' as const) : ('down' as const) };
  };

  const totalRevenue = React.useMemo(() => monthlyFinancials.reduce((s, m) => s + m.revenue, 0), [monthlyFinancials]);
  const totalCosts = React.useMemo(() => monthlyFinancials.reduce((s, m) => s + m.costs, 0), [monthlyFinancials]);
  const totalProfit = React.useMemo(() => monthlyFinancials.reduce((s, m) => s + m.profit, 0), [monthlyFinancials]);
  const avgMargin = React.useMemo(() => (monthlyFinancials.length > 0 ? monthlyFinancials.reduce((s, m) => s + m.margin, 0) / monthlyFinancials.length : 0), [monthlyFinancials]);
  const avgOtif = React.useMemo(() => (otifData.length > 0 ? otifData.reduce((s, d) => s + d.otif, 0) / otifData.length : 0), [otifData]);

  const profitMarginData = React.useMemo(
    () => monthlyFinancials.map((m) => ({ month: m.month, revenue: m.revenue / 1000, profit: m.profit / 1000, margin: m.margin })),
    [monthlyFinancials]
  );

  const highlights = React.useMemo(() => {
    const items: Array<{
      id: string;
      icon: React.ReactNode;
      title: string;
      description: string;
      tone: 'info' | 'warn' | 'good';
    }> = [];

    const best = [...monthlyFinancials].sort((a, b) => b.profit - a.profit)[0];
    if (best) {
      items.push({
        id: 'best-month',
        icon: <DollarSign className="h-4 w-4" />,
        title: `${best.month} posted the highest profit`,
        description: `€${formatNumber(best.profit)} net on €${formatNumber(best.revenue)} revenue at a ${best.margin}% margin.`,
        tone: 'good',
      });
    }

    const topCustomer = customerPerf[0];
    if (topCustomer) {
      items.push({
        id: 'top-customer',
        icon: <Users className="h-4 w-4" />,
        title: `${topCustomer.name} is the top revenue customer`,
        description: `€${formatNumber(topCustomer.revenue)} across ${formatNumber(topCustomer.totalOrders)} orders at ${topCustomer.otif}% OTIF.`,
        tone: 'info',
      });
    }

    const costRatio = totalRevenue > 0 ? Math.round((totalCosts / totalRevenue) * 1000) / 10 : 0;
    items.push({
      id: 'margin',
      icon: <Target className="h-4 w-4" />,
      title: `Average margin ${avgMargin.toFixed(1)}%`,
      description: `Costs absorb ${costRatio}% of revenue over the period, leaving €${formatNumber(totalProfit)} net profit.`,
      tone: 'info',
    });

    const worstOtif = [...otifData].sort((a, b) => a.otif - b.otif)[0];
    if (worstOtif) {
      items.push({
        id: 'otif-low',
        icon: <Activity className="h-4 w-4" />,
        title: `${worstOtif.month} had the lowest OTIF`,
        description: `${worstOtif.otif}% vs the 95% target — examine on-time delivery in that period.`,
        tone: 'warn',
      });
    }

    return items;
  }, [monthlyFinancials, customerPerf, totalRevenue, totalCosts, totalProfit, avgMargin, otifData]);

  const handleExportFull = React.useCallback(() => {
    const cols: ExportColumn[] = [
      { key: 'month', label: 'Month' },
      { key: 'revenue', label: 'Revenue (EUR)', formatter: (v) => `€${Number(v).toLocaleString()}` },
      { key: 'costs', label: 'Costs (EUR)', formatter: (v) => `€${Number(v).toLocaleString()}` },
      { key: 'profit', label: 'Profit (EUR)', formatter: (v) => `€${Number(v).toLocaleString()}` },
      { key: 'margin', label: 'Margin %', formatter: (v) => `${v}%` },
    ];
    exportToExcel({
      title: 'HAP Cargo - Financial Report',
      filename: `hapcargo-financial-${period}-${new Date().toISOString().slice(0, 10)}`,
      columns: cols,
      data: monthlyFinancials.map((m) => m as unknown as Record<string, unknown>),
    });
  }, [monthlyFinancials, period]);

  const handleExportPDF = React.useCallback(() => {
    const cols: ExportColumn[] = [
      { key: 'month', label: 'Month' },
      { key: 'revenue', label: 'Revenue', formatter: (v) => `€${Number(v).toLocaleString()}` },
      { key: 'costs', label: 'Costs', formatter: (v) => `€${Number(v).toLocaleString()}` },
      { key: 'profit', label: 'Profit', formatter: (v) => `€${Number(v).toLocaleString()}` },
      { key: 'margin', label: 'Margin', formatter: (v) => `${v}%` },
    ];
    exportToPDF({
      title: 'HAP Cargo - Financial Report',
      filename: `hapcargo-financial-${period}-${new Date().toISOString().slice(0, 10)}`,
      columns: cols,
      data: monthlyFinancials.map((m) => m as unknown as Record<string, unknown>),
    });
  }, [monthlyFinancials, period]);

  const handleExportCustomers = React.useCallback(() => {
    const cols: ExportColumn[] = [
      { key: 'name', label: 'Customer' },
      { key: 'totalOrders', label: 'Total Orders' },
      { key: 'revenue', label: 'Revenue (EUR)', formatter: (v) => `€${Number(v).toLocaleString()}` },
      { key: 'avgDeliveryTime', label: 'Avg Delivery (days)', formatter: (v) => `${v} days` },
      { key: 'otif', label: 'OTIF %', formatter: (v) => `${v}%` },
      { key: 'claims', label: 'Claims' },
      { key: 'satisfaction', label: 'Satisfaction', formatter: (v) => `${v}/5.0` },
    ];
    exportToExcel({
      title: 'HAP Cargo - Customer Performance',
      filename: `hapcargo-customer-performance-${new Date().toISOString().slice(0, 10)}`,
      columns: cols,
      data: customerPerf.map((c) => c as unknown as Record<string, unknown>),
    });
  }, [customerPerf]);

  const handleExportDrivers = React.useCallback(() => {
    const cols: ExportColumn[] = [
      { key: 'name', label: 'Driver' },
      { key: 'trips', label: 'Total Trips' },
      { key: 'otif', label: 'OTIF %', formatter: (v) => `${v}%` },
      { key: 'avgKm', label: 'Avg km/trip' },
      { key: 'fuelEfficiency', label: 'Fuel Efficiency', formatter: (v) => `${v} km/L` },
    ];
    exportToExcel({
      title: 'HAP Cargo - Driver Performance',
      filename: `hapcargo-driver-performance-${new Date().toISOString().slice(0, 10)}`,
      columns: cols,
      data: drivers.map((d) => d as unknown as Record<string, unknown>),
    });
  }, [drivers]);

  const handleExportTrips = React.useCallback(() => {
    const data = [
      { metric: 'Total Trips', value: tripAnalytics.totalTrips },
      { metric: 'Completed Trips', value: tripAnalytics.completedTrips },
      { metric: 'Active Trips', value: tripAnalytics.activeTrips },
      { metric: 'Planned Trips', value: tripAnalytics.plannedTrips },
      { metric: 'Avg Distance (km)', value: tripAnalytics.avgDistance },
      { metric: 'Avg Duration (hours)', value: tripAnalytics.avgDuration },
      { metric: 'Total km', value: tripAnalytics.totalKm },
      { metric: 'On-Time Rate (%)', value: tripAnalytics.onTimeRate },
    ];
    exportToExcel({
      title: 'HAP Cargo - Trip Analytics',
      filename: `hapcargo-trip-analytics-${new Date().toISOString().slice(0, 10)}`,
      columns: [
        { key: 'metric', label: 'Metric' },
        { key: 'value', label: 'Value' },
      ],
      data,
    });
  }, [tripAnalytics]);

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <Card className="p-6 max-w-lg mx-auto mt-16">
        <CardHeader>
          <CardTitle>Failed to load financial analytics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <Button size="sm" onClick={() => refetch()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Analytics"
        description="Comprehensive financial performance, customer analysis, and operational metrics"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Analytics' },
          { label: 'Financial Analytics' },
        ]}
        primaryAction={
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={(v) => setPeriod(v as TimePeriod)}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExportFull}>
              <Download className="h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <Download className="h-4 w-4" />
              PDF
            </Button>
            <span className={cn(
              'hidden sm:flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border',
              isFetching ? 'bg-warning/10 text-warning border-warning/20' : 'bg-success/10 text-success border-success/20'
            )}>
              <span className={cn('h-1.5 w-1.5 rounded-full', isFetching ? 'animate-pulse bg-warning' : 'bg-success')} />
              {isFetching ? 'Syncing' : 'Live'}
            </span>
            <span className="hidden md:flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
              <History className="h-3.5 w-3.5" />
              {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
            </span>
          </div>
        }
      />

      {/* Financial KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          title="Total Revenue"
          value={`€${formatNumber(totalRevenue)}`}
          change={{ ...pct(kpis?.revenueChange), label: 'vs prev. year' }}
          icon={<DollarSign className="h-5 w-5" />}
          variant="success"
        />
        <KpiCard
          title="Total Costs"
          value={`€${formatNumber(totalCosts)}`}
          change={{ ...pct(kpis?.costsChange, true), label: 'vs prev. year' }}
          icon={<BarChart className="h-5 w-5" />}
          variant="warning"
        />
        <KpiCard
          title="Net Profit"
          value={`€${formatNumber(totalProfit)}`}
          change={{ ...pct(kpis?.profitChange), label: 'vs prev. year' }}
          icon={<TrendingUp className="h-5 w-5" />}
          variant="primary"
        />
        <KpiCard
          title="Avg Margin"
          value={`${avgMargin.toFixed(1)}%`}
          change={{ value: 0, trend: 'neutral', label: 'vs prev. year' }}
          icon={<Target className="h-5 w-5" />}
          variant="success"
        />
        <KpiCard
          title="OTIF Rate"
          value={`${avgOtif.toFixed(1)}%`}
          change={{ ...pct(kpis?.otifChange, true), label: 'vs target 95%' }}
          icon={<Activity className="h-5 w-5" />}
          variant="primary"
        />
      </div>

      {/* Period Highlights */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart className="h-4 w-4 text-primary" />
            Period Highlights
          </CardTitle>
          <p className="text-xs text-muted-foreground">Automatically derived from live financial data</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {highlights.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border',
                  item.tone === 'warn' && 'border-warning/30 bg-warning/5',
                  item.tone === 'info' && 'border-info/30 bg-info/5',
                  item.tone === 'good' && 'border-success/30 bg-success/5'
                )}
              >
                <span className={cn(
                  'flex items-center justify-center h-8 w-8 rounded-lg shrink-0',
                  item.tone === 'warn' && 'bg-warning/15 text-warning',
                  item.tone === 'info' && 'bg-info/15 text-info',
                  item.tone === 'good' && 'bg-success/15 text-success'
                )}>
                  {item.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="trips">Trips & Fleet</TabsTrigger>
          <TabsTrigger value="drivers">Drivers</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Revenue, Costs & Profit Trend */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ChartCard
                title="Revenue, Costs & Profit Trend"
                description={`${period.charAt(0).toUpperCase() + period.slice(1)} view — all amounts in EUR`}
                exportData={trendData.map((d) => ({ label: d.date, value: d.revenue }))}
                exportFilename={`financial-trend-${period}`}
              >
                <AreaChart
                  data={trendData}
                  xKey="date"
                  series={[
                    { key: 'revenue', label: 'Revenue', color: 'hsl(213, 58%, 26%)', fillOpacity: 0.2 },
                    { key: 'costs', label: 'Costs', color: 'hsl(0, 72%, 51%)', fillOpacity: 0.1 },
                    { key: 'profit', label: 'Profit', color: 'hsl(152, 60%, 38%)', fillOpacity: 0.15 },
                  ]}
                  height={340}
                />
              </ChartCard>
            </div>

            <div className="space-y-4">
              <ChartCard
                title="Revenue by Service"
                description="Breakdown by type"
                exportData={revenueBreakdown.map((r) => ({ label: r.name, value: r.value }))}
                exportFilename="revenue-by-service"
              >
                <PieChart
                  data={revenueBreakdown}
                  height={170}
                  variant="donut"
                  showLegend={true}
                />
              </ChartCard>

              <ChartCard
                title="Cost Breakdown"
                description="Operating cost distribution"
                exportData={costBreakdown.map((c) => ({ label: c.name, value: c.value }))}
                exportFilename="cost-breakdown"
              >
                <PieChart
                  data={costBreakdown}
                  height={170}
                  variant="donut"
                  showLegend={true}
                />
              </ChartCard>
            </div>
          </div>

          {/* Monthly Financials Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-sm font-medium">Monthly Financial Summary</CardTitle>
                <CardDescription>Revenue, costs, profit and margin by month</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-xs" onClick={handleExportFull}>
                <Download className="h-3 w-3" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Month</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Revenue</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Costs</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Profit</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyFinancials.map((m) => (
                      <tr key={m.month} className="border-b last:border-0 hover:bg-accent/50">
                        <td className="py-2.5 px-3 font-medium">{m.month}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{formatCurrency(m.revenue)}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-destructive">{formatCurrency(m.costs)}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums font-medium text-success">{formatCurrency(m.profit)}</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={cn(
                            'font-medium tabular-nums',
                            m.margin >= 13 ? 'text-success' : m.margin >= 10 ? 'text-warning' : 'text-destructive'
                          )}>
                            {m.margin}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold border-t">
                      <td className="py-2.5 px-3">Total</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{formatCurrency(totalRevenue)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-destructive">{formatCurrency(totalCosts)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-success">{formatCurrency(totalProfit)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{avgMargin.toFixed(1)}%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Profit Margin Trend */}
          <ChartCard
            title="Profit Margin Trend"
            description="Monthly margin percentage"
            exportData={monthlyFinancials.map((m) => ({ label: m.month, value: m.margin }))}
            exportFilename="margin-trend"
          >
            <LineChart
              data={profitMarginData}
              xKey="month"
              series={[
                { key: 'margin', label: 'Margin %', color: 'hsl(152, 60%, 38%)' },
              ]}
              height={250}
            />
          </ChartCard>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-4 mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Revenue by Customer"
              description="Top performers"
              exportData={customerPerf.map((c) => ({ label: c.name, value: c.revenue }))}
              exportFilename="revenue-by-customer"
            >
              <HapBarChart
                data={customerPerf.map((c) => ({ name: c.name, revenue: c.revenue / 1000 }))}
                xKey="name"
                series={[{ key: 'revenue', label: 'Revenue (x1000 EUR)', color: 'hsl(213, 58%, 26%)' }]}
                height={300}
                horizontal
              />
            </ChartCard>

            <ChartCard
              title="Customer OTIF vs Satisfaction"
              description="Performance correlation"
              exportData={customerPerf.map((c) => ({ label: c.name, value: c.otif }))}
              exportFilename="customer-otif"
            >
              <HapBarChart
                data={customerPerf.map((c) => ({ name: c.name, otif: c.otif, satisfaction: c.satisfaction * 20 }))}
                xKey="name"
                series={[
                  { key: 'otif', label: 'OTIF %', color: 'hsl(152, 60%, 38%)' },
                  { key: 'satisfaction', label: 'Satisfaction (x20)', color: 'hsl(210, 80%, 50%)' },
                ]}
                height={300}
                horizontal
                stacked
              />
            </ChartCard>
          </div>

          {/* Customer Performance Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Customer Performance Details
                </CardTitle>
                <CardDescription>Orders, delivery times, OTIF, claims and satisfaction</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-xs" onClick={handleExportCustomers}>
                <Download className="h-3 w-3" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Customer</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Orders</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Revenue</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Avg Delivery</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">OTIF</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Claims</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerPerf.map((c) => (
                      <tr key={c.name} className="border-b last:border-0 hover:bg-accent/50">
                        <td className="py-2.5 px-3 font-medium">{c.name}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{formatNumber(c.totalOrders)}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{formatCurrency(c.revenue)}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{c.avgDeliveryTime} days</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={cn(
                            'font-medium tabular-nums',
                            c.otif >= 95 ? 'text-success' : c.otif >= 93 ? 'text-warning' : 'text-destructive'
                          )}>
                            {c.otif}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Badge
                            variant={c.claims <= 2 ? 'success' : c.claims <= 3 ? 'warning' : 'destructive'}
                            className="text-[10px]"
                          >
                            {c.claims}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className="tabular-nums font-medium">{c.satisfaction}</span>
                            <span className="text-muted-foreground">/5</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Revenue by Country */}
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Revenue by Country"
              description="Geographic distribution"
              exportData={countryData.map((c) => ({ label: `${c.flag} ${c.country}`, value: c.revenue }))}
              exportFilename="revenue-by-country"
            >
              <HapBarChart
                data={countryData.map((c) => ({ country: `${c.flag} ${c.country}`, revenue: c.revenue / 1000 }))}
                xKey="country"
                series={[{ key: 'revenue', label: 'Revenue (x1000 EUR)', color: 'hsl(213, 58%, 26%)' }]}
                height={280}
                horizontal
              />
            </ChartCard>

            <ChartCard
              title="Orders by Country"
              description="Volume distribution"
              exportData={countryData.map((c) => ({ label: `${c.flag} ${c.country}`, value: c.orders }))}
              exportFilename="orders-by-country"
            >
              <HapBarChart
                data={countryData.map((c) => ({ country: `${c.flag} ${c.country}`, orders: c.orders }))}
                xKey="country"
                series={[{ key: 'orders', label: 'Orders', color: 'hsl(152, 60%, 38%)' }]}
                height={280}
                horizontal
              />
            </ChartCard>
          </div>
        </TabsContent>

        {/* Trips & Fleet Tab */}
        <TabsContent value="trips" className="space-y-4 mt-4">
          {/* Trip KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Total Trips"
              value={formatNumber(tripAnalytics.totalTrips)}
              icon={<Truck className="h-5 w-5" />}
              variant="primary"
            />
            <KpiCard
              title="Total Distance"
              value={formatKm(tripAnalytics.totalKm)}
              icon={<Globe className="h-5 w-5" />}
              variant="primary"
            />
            <KpiCard
              title="Avg Trip Distance"
              value={formatKm(tripAnalytics.avgDistance)}
              icon={<BarChart className="h-5 w-5" />}
              variant="default"
            />
            <KpiCard
              title="Avg Trip Duration"
              value={`${tripAnalytics.avgDuration}h`}
              icon={<Clock className="h-5 w-5" />}
              variant="default"
            />
          </div>

          {/* Trip Status & Fleet */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-sm font-medium">Trip Status Overview</CardTitle>
                  <CardDescription>Current trip distribution</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-xs" onClick={handleExportTrips}>
                  <Download className="h-3 w-3" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: 'Completed', value: tripAnalytics.completedTrips, color: 'bg-success', pct: Math.round((tripAnalytics.completedTrips / tripAnalytics.totalTrips) * 100) },
                    { label: 'Active', value: tripAnalytics.activeTrips, color: 'bg-info', pct: Math.round((tripAnalytics.activeTrips / tripAnalytics.totalTrips) * 100) },
                    { label: 'Planned', value: tripAnalytics.plannedTrips, color: 'bg-primary', pct: Math.round((tripAnalytics.plannedTrips / tripAnalytics.totalTrips) * 100) },
                  ].map((s) => (
                    <div key={s.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{s.label}</span>
                        <span className="tabular-nums text-muted-foreground">{s.value} ({s.pct}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full transition-all', s.color)} style={{ width: `${s.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">On-Time Rate</p>
                      <p className="text-lg font-semibold tabular-nums text-success">{tripAnalytics.onTimeRate}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Utilization Rate</p>
                      <p className="text-lg font-semibold tabular-nums">{Math.round((tripAnalytics.activeTrips / tripAnalytics.totalTrips) * 100)}%</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fleet Status */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary" />
                  Fleet Status by Type
                </CardTitle>
                <CardDescription>Current fleet utilization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {trucks.map((t) => {
                    const total = t.available + t.inUse + t.maintenance;
                    const utilPct = Math.round((t.inUse / total) * 100);
                    return (
                      <div key={t.type} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{t.type}</span>
                          <span className="tabular-nums text-muted-foreground">{utilPct}% utilized</span>
                        </div>
                        <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                          <div
                            className="bg-success transition-all"
                            style={{ width: `${(t.available / total) * 100}%` }}
                            title={`Available: ${t.available}`}
                          />
                          <div
                            className="bg-primary transition-all"
                            style={{ width: `${(t.inUse / total) * 100}%` }}
                            title={`In Use: ${t.inUse}`}
                          />
                          <div
                            className="bg-warning transition-all"
                            style={{ width: `${(t.maintenance / total) * 100}%` }}
                            title={`Maintenance: ${t.maintenance}`}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-success" /> {t.available} avail
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {t.inUse} active
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-warning" /> {t.maintenance} maint
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* OTIF Trend */}
          <ChartCard
            title="OTIF Performance Trend"
            description="Monthly on-time in-full rate vs 95% target"
            exportData={otifData.map((d) => ({ label: d.month, value: d.otif }))}
            exportFilename="otif-trend"
          >
            <LineChart
              data={otifData}
              xKey="month"
              series={[
                { key: 'otif', label: 'OTIF %', color: 'hsl(213, 58%, 26%)' },
                { key: 'target', label: 'Target (95%)', color: 'hsl(0, 72%, 51%)', dashed: true },
              ]}
              height={280}
            />
          </ChartCard>
        </TabsContent>

        {/* Drivers Tab */}
        <TabsContent value="drivers" className="space-y-4 mt-4">
          {/* Driver KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Total Drivers"
              value={drivers.length}
              icon={<Users className="h-5 w-5" />}
              variant="primary"
            />
            <KpiCard
              title="Avg OTIF"
              value={`${(drivers.reduce((s, d) => s + d.otif, 0) / drivers.length).toFixed(1)}%`}
              icon={<Target className="h-5 w-5" />}
              variant="success"
            />
            <KpiCard
              title="Avg Fuel Efficiency"
              value={`${(drivers.reduce((s, d) => s + d.fuelEfficiency, 0) / drivers.length).toFixed(1)} km/L`}
              icon={<Activity className="h-5 w-5" />}
              variant="primary"
            />
            <KpiCard
              title="Total Trips (All)"
              value={formatNumber(drivers.reduce((s, d) => s + d.trips, 0))}
              icon={<Truck className="h-5 w-5" />}
              variant="default"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Driver OTIF Performance"
              description="On-time in-full rate by driver"
              exportData={drivers.map((d) => ({ label: d.name, value: d.otif }))}
              exportFilename="driver-otif"
            >
              <HapBarChart
                data={drivers.map((d) => ({ name: d.name, otif: d.otif }))}
                xKey="name"
                series={[{ key: 'otif', label: 'OTIF %', color: 'hsl(152, 60%, 38%)' }]}
                height={280}
                horizontal
              />
            </ChartCard>

            <ChartCard
              title="Driver Trips & Fuel Efficiency"
              description="Productivity metrics"
              exportData={drivers.map((d) => ({ label: d.name, value: d.trips }))}
              exportFilename="driver-trips"
            >
              <HapBarChart
                data={drivers.map((d) => ({ name: d.name, trips: d.trips, fuelEfficiency: d.fuelEfficiency }))}
                xKey="name"
                series={[
                  { key: 'trips', label: 'Total Trips', color: 'hsl(213, 58%, 26%)' },
                ]}
                height={280}
                horizontal
              />
            </ChartCard>
          </div>

          {/* Driver Performance Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-sm font-medium">Detailed Driver Performance</CardTitle>
                <CardDescription>Complete metrics for all drivers</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-xs" onClick={handleExportDrivers}>
                <Download className="h-3 w-3" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Driver</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Total Trips</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">OTIF</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Avg km/trip</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Fuel Efficiency</th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drivers.map((d) => {
                      const rating = d.otif >= 97 ? 5 : d.otif >= 95 ? 4 : d.otif >= 93 ? 3 : 2;
                      return (
                        <tr key={d.name} className="border-b last:border-0 hover:bg-accent/50">
                          <td className="py-2.5 px-3 font-medium">{d.name}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums">{d.trips}</td>
                          <td className="py-2.5 px-3 text-right">
                            <span className={cn(
                              'font-medium tabular-nums',
                              d.otif >= 95 ? 'text-success' : d.otif >= 93 ? 'text-warning' : 'text-destructive'
                            )}>
                              {d.otif}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums">{d.avgKm} km</td>
                          <td className="py-2.5 px-3 text-right tabular-nums">{d.fuelEfficiency} km/L</td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <svg
                                  key={star}
                                  className={cn(
                                    'h-3.5 w-3.5',
                                    star <= rating ? 'text-warning fill-warning' : 'text-muted-foreground/30'
                                  )}
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
