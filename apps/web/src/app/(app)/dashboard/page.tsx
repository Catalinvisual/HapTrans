'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader, KpiCard, Card, CardHeader, CardTitle, CardContent, Button, Badge, Select, SelectTrigger, SelectContent, SelectItem, SelectValue, Spinner, cn } from '@hapcargo/ui';
import { Package, Truck, DollarSign, Target, Activity, Clock, AlertCircle, Users, Download, Brain, History, AlertTriangle, Globe, Zap } from '@hapcargo/ui';
import { NAMESPACES } from '@/i18n';
import { ChartCard, AreaChart, BarChart as HapBarChart, PieChart } from '@/components/charts';
import { exportToExcel, exportToPDF, formatCurrency, formatNumber } from '@/lib/export';
import type { ExportColumn } from '@/lib/export';
import type { TimePeriod } from '@/lib/mock-analytics';
import { useDashboardData } from '@/lib/use-analytics';

export default function DashboardPage() {
  const { t } = useTranslation(NAMESPACES);
  const [period, setPeriod] = React.useState<TimePeriod>('monthly');

  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useDashboardData(period);

  const trendData = data?.trend ?? [];
  const countryData = data?.countries ?? [];
  const orderStatusData = data?.orderStatus ?? [];
  const todayOrders = data?.todayOrders ?? [];
  const lateDeliveries = data?.lateDeliveries ?? [];
  const topCustomers = data?.topCustomers ?? [];
  const drivers = data?.drivers ?? [];
  const trucks = data?.fleet?.byType ?? [];
  const otifData = data?.otif ?? [];
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
  const revenueBreakdown = data?.revenueBreakdown ?? [];
  const dailyMetrics = data?.weekly ?? [];
  const metrics = data?.metrics;
  const lateByCountry = data?.lateByCountry ?? [];

  const pct = (v: number | undefined, inverse = false) => {
    const value = Number(v ?? 0);
    const positive = inverse ? value <= 0 : value >= 0;
    return { value: Math.abs(Math.round(value * 10) / 10), trend: value === 0 ? ('neutral' as const) : positive ? ('up' as const) : ('down' as const) };
  };

  const totalRevenue = React.useMemo(() => trendData.reduce((sum, d) => sum + d.revenue, 0), [trendData]);
  const totalOrders = React.useMemo(() => trendData.reduce((sum, d) => sum + d.orders, 0), [trendData]);
  const avgOtif = React.useMemo(() => (otifData.length > 0 ? otifData.reduce((sum, d) => sum + d.otif, 0) / otifData.length : 0), [otifData]);
  const totalFleet = React.useMemo(() => trucks.reduce((sum, t) => sum + t.available + t.inUse + t.maintenance, 0) || 1, [trucks]);
  const activeFleet = React.useMemo(() => trucks.reduce((sum, t) => sum + t.inUse, 0), [trucks]);

  const handleExportDashboard = React.useCallback(() => {
    const columns: ExportColumn[] = [
      { key: 'date', label: 'Period' },
      { key: 'orders', label: 'Orders' },
      { key: 'revenue', label: 'Revenue (EUR)', formatter: (v) => `€${Number(v).toLocaleString()}` },
      { key: 'costs', label: 'Costs (EUR)', formatter: (v) => `€${Number(v).toLocaleString()}` },
      { key: 'profit', label: 'Profit (EUR)', formatter: (v) => `€${Number(v).toLocaleString()}` },
    ];

    exportToExcel({
      title: 'HAP Cargo - Dashboard Report',
      filename: `hapcargo-dashboard-${period}-${new Date().toISOString().slice(0, 10)}`,
      columns,
      data: trendData.map((d) => d as unknown as Record<string, unknown>),
    });
  }, [trendData, period]);

  const handleExportPDF = React.useCallback(() => {
    const columns: ExportColumn[] = [
      { key: 'date', label: 'Period' },
      { key: 'orders', label: 'Orders' },
      { key: 'revenue', label: 'Revenue (EUR)', formatter: (v) => `€${Number(v).toLocaleString()}` },
      { key: 'costs', label: 'Costs (EUR)', formatter: (v) => `€${Number(v).toLocaleString()}` },
      { key: 'profit', label: 'Profit (EUR)', formatter: (v) => `€${Number(v).toLocaleString()}` },
    ];

    exportToPDF({
      title: 'HAP Cargo - Dashboard Report',
      filename: `hapcargo-dashboard-${period}-${new Date().toISOString().slice(0, 10)}`,
      columns,
      data: trendData.map((d) => d as unknown as Record<string, unknown>),
    });
  }, [trendData, period]);

  const countryBarData = React.useMemo(
    () => countryData.map((c) => ({ country: c.country, orders: c.orders, revenue: c.revenue })),
    [countryData]
  );

  const statusPieData = React.useMemo(
    () => orderStatusData.map((s) => ({ name: s.name, value: s.value, color: s.color })),
    [orderStatusData]
  );

  const insights = React.useMemo(() => {
    const items: Array<{
      id: string;
      icon: React.ReactNode;
      title: string;
      description: string;
      tone: 'info' | 'warn' | 'good';
    }> = [];

    const topCountry = [...countryData].sort((a, b) => b.orders - a.orders)[0];
    if (topCountry) {
      items.push({
        id: 'volume',
        icon: <Globe className="h-4 w-4" />,
        title: `${topCountry.country} leads order volume`,
        description: `${formatNumber(topCountry.orders)} orders · €${formatNumber(topCountry.revenue)} revenue in the period — consider additional capacity on this corridor.`,
        tone: 'info',
      });
    }

    const lateFocus = [...lateByCountry].sort((a, b) => b.orders - a.orders)[0];
    if (lateFocus) {
      items.push({
        id: 'late',
        icon: <AlertTriangle className="h-4 w-4" />,
        title: `Late deliveries concentrated in ${lateFocus.country}`,
        description: `${lateFocus.orders} on-time-exceeding shipments landed here — review schedule buffers and driver routing.`,
        tone: 'warn',
      });
    }

    const otifGap = Math.round((95 - avgOtif) * 10) / 10;
    if (otifGap > 0) {
      items.push({
        id: 'otif',
        icon: <Target className="h-4 w-4" />,
        title: `OTIF is ${otifGap.toFixed(1)}pp below the 95% target`,
        description: `Current on-time in-full rate is ${avgOtif.toFixed(1)}% — improve last-mile planning and door-window accuracy.`,
        tone: 'warn',
      });
    }

    const utilization = metrics?.fleetUtilization ?? Math.round((activeFleet / totalFleet) * 100);
    items.push({
      id: 'fleet',
      icon: <Truck className="h-4 w-4" />,
      title: `Fleet utilization at ${utilization}%`,
      description: `${activeFleet} of ${totalFleet} vehicles active now — ${trucks.reduce((s, t) => s + t.maintenance, 0)} in maintenance ${trucks.reduce((s, t) => s + t.available, 0)} available.`,
      tone: 'info',
    });

    const topDriver = [...drivers].sort((a, b) => b.trips - a.trips)[0];
    if (topDriver) {
      items.push({
        id: 'driver',
        icon: <Zap className="h-4 w-4" />,
        title: `${topDriver.name} leads driver activity`,
        description: `${topDriver.trips} trips at ${topDriver.otif}% OTIF — ${topDriver.avgKm} km average per trip.`,
        tone: 'good',
      });
    }

    return items;
  }, [countryData, lateByCountry, avgOtif, metrics, activeFleet, totalFleet, trucks, drivers]);

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
          <CardTitle>Failed to load analytics</CardTitle>
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
        title={t('dashboard:welcome')}
        description={t('dashboard:welcomeSubtitle')}
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
            <Button variant="outline" size="sm" onClick={handleExportDashboard}>
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

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          title="Total Revenue"
          value={`€${formatNumber(totalRevenue)}`}
          change={{ ...pct(metrics?.revenueChange), label: 'vs prev. period' }}
          icon={<DollarSign className="h-5 w-5" />}
          variant="success"
        />
        <KpiCard
          title="Total Orders"
          value={formatNumber(totalOrders)}
          change={{ ...pct(metrics?.ordersChange), label: 'vs prev. period' }}
          icon={<Package className="h-5 w-5" />}
          variant="primary"
        />
        <KpiCard
          title="OTIF Rate"
          value={`${avgOtif.toFixed(1)}%`}
          change={{ ...pct(metrics?.otifChange, true), label: 'vs target 95%' }}
          icon={<Target className="h-5 w-5" />}
          variant="success"
        />
        <KpiCard
          title="Fleet Utilization"
          value={`${Math.round((activeFleet / totalFleet) * 100)}%`}
          change={{ value: metrics?.fleetUtilization ?? 0, trend: 'neutral', label: `${activeFleet}/${totalFleet} trucks` }}
          icon={<Truck className="h-5 w-5" />}
          variant="primary"
        />
        <KpiCard
          title="Active Trips"
          value={tripAnalytics.activeTrips}
          change={{ value: 0, trend: 'neutral', label: `${tripAnalytics.plannedTrips} planned` }}
          icon={<Activity className="h-5 w-5" />}
          variant="default"
        />
      </div>

      {/* Smart Insights */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Smart Insights
          </CardTitle>
          <p className="text-xs text-muted-foreground">Automatically derived from live operational data</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {insights.map((item) => (
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

      {/* Revenue & Orders Trend */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard
            title="Revenue & Orders Trend"
            description={`${period.charAt(0).toUpperCase() + period.slice(1)} view`}
            exportData={trendData.map((d) => ({ label: d.date, value: d.revenue }))}
            exportFilename={`revenue-trend-${period}`}
          >
            <AreaChart
              data={trendData}
              xKey="date"
              series={[
                { key: 'revenue', label: 'Revenue (EUR)', color: 'hsl(213, 58%, 26%)', fillOpacity: 0.15 },
                { key: 'costs', label: 'Costs (EUR)', color: 'hsl(0, 72%, 51%)', fillOpacity: 0.08 },
                { key: 'profit', label: 'Profit (EUR)', color: 'hsl(152, 60%, 38%)', fillOpacity: 0.1 },
              ]}
              height={320}
            />
          </ChartCard>
        </div>

        <div className="space-y-4">
          <ChartCard
            title="Revenue Breakdown"
            description="By service type"
            exportData={revenueBreakdown.map((r) => ({ label: r.name, value: r.value }))}
            exportFilename="revenue-breakdown"
          >
            <PieChart
              data={revenueBreakdown}
              height={180}
              variant="donut"
              showLegend={true}
            />
          </ChartCard>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">OTIF Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {otifData.slice(-4).map((m) => (
                  <div key={m.month} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{m.month}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            m.otif >= m.target ? 'bg-success' : 'bg-warning'
                          )}
                          style={{ width: `${Math.min((m.otif / 100) * 100, 100)}%` }}
                        />
                      </div>
                      <span className={cn(
                        'font-medium tabular-nums w-12 text-right',
                        m.otif >= m.target ? 'text-success' : 'text-warning'
                      )}>
                        {m.otif.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Orders by Country & Order Status */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard
            title="Orders by Country"
            description="Top corridors"
            exportData={countryData.map((c) => ({ label: c.country, value: c.orders }))}
            exportFilename="orders-by-country"
          >
            <HapBarChart
              data={countryBarData}
              xKey="country"
              series={[{ key: 'orders', label: 'Orders', color: 'hsl(213, 58%, 26%)' }]}
              height={280}
              horizontal
            />
          </ChartCard>
        </div>

        <div className="space-y-4">
          <ChartCard
            title="Order Status"
            description="Current distribution"
            exportData={orderStatusData.map((s) => ({ label: s.name, value: s.value }))}
            exportFilename="order-status"
          >
            <PieChart
              data={statusPieData}
              height={200}
              variant="donut"
              showLegend={true}
            />
          </ChartCard>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Fleet Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {trucks.map((t) => {
                  const total = t.available + t.inUse + t.maintenance;
                  return (
                    <div key={t.type} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{t.type}</span>
                        <span className="text-muted-foreground">{total} units</span>
                      </div>
                      <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                        <div
                          className="bg-success"
                          style={{ width: `${(t.available / total) * 100}%` }}
                        />
                        <div
                          className="bg-primary"
                          style={{ width: `${(t.inUse / total) * 100}%` }}
                        />
                        <div
                          className="bg-warning"
                          style={{ width: `${(t.maintenance / total) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-success" /> Available
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-primary" /> In Use
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-warning" /> Maintenance
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Today's Orders & Late Deliveries */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Today's Planned Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Today&apos;s Planned Orders
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">{todayOrders.length} orders scheduled</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => {
                const cols: ExportColumn[] = [
                  { key: 'id', label: 'Order ID' },
                  { key: 'customer', label: 'Customer' },
                  { key: 'origin', label: 'Origin' },
                  { key: 'destination', label: 'Destination' },
                  { key: 'status', label: 'Status' },
                  { key: 'departureTime', label: 'Departure' },
                  { key: 'vehicle', label: 'Vehicle' },
                  { key: 'driver', label: 'Driver' },
                ];
                exportToExcel({
                  title: "Today's Orders",
                  filename: `hapcargo-today-orders-${new Date().toISOString().slice(0, 10)}`,
                  columns: cols,
                  data: todayOrders.map((o) => o as unknown as Record<string, unknown>),
                });
              }}
            >
              <Download className="h-3 w-3" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {todayOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{order.id}</span>
                      <Badge
                        variant={
                          order.status === 'In Transit'
                            ? 'info'
                            : order.status === 'Dispatched'
                            ? 'secondary'
                            : order.status === 'Planned'
                            ? 'outline'
                            : 'success'
                        }
                        className="text-[10px]"
                      >
                        {order.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {order.customer} &middot; {order.origin} &rarr; {order.destination}
                    </p>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <p className="text-xs font-medium tabular-nums">{order.departureTime}</p>
                    <p className="text-[10px] text-muted-foreground">{order.vehicle}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Late Deliveries */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                Late Deliveries
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">{lateDeliveries.length} deliveries need attention</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => {
                const cols: ExportColumn[] = [
                  { key: 'id', label: 'Order ID' },
                  { key: 'customer', label: 'Customer' },
                  { key: 'origin', label: 'Origin' },
                  { key: 'destination', label: 'Destination' },
                  { key: 'expectedDate', label: 'Expected Date' },
                  { key: 'delayDays', label: 'Delay (Days)' },
                  { key: 'status', label: 'Severity' },
                ];
                exportToExcel({
                  title: 'Late Deliveries',
                  filename: `hapcargo-late-deliveries-${new Date().toISOString().slice(0, 10)}`,
                  columns: cols,
                  data: lateDeliveries.map((d) => d as unknown as Record<string, unknown>),
                });
              }}
            >
              <Download className="h-3 w-3" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {lateDeliveries.map((delivery) => (
                <div
                  key={delivery.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border',
                    delivery.status === 'critical' && 'border-destructive/30 bg-destructive/5',
                    delivery.status === 'warning' && 'border-warning/30 bg-warning/5',
                    delivery.status === 'minor' && 'border-info/30 bg-info/5'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{delivery.id}</span>
                      <Badge
                        variant={
                          delivery.status === 'critical'
                            ? 'destructive'
                            : delivery.status === 'warning'
                            ? 'warning'
                            : 'info'
                        }
                        className="text-[10px]"
                      >
                        {delivery.status === 'critical' ? 'Critical' : delivery.status === 'warning' ? 'Warning' : 'Minor'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {delivery.customer} &middot; {delivery.origin} &rarr; {delivery.destination}
                    </p>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <p className={cn(
                      'text-sm font-semibold tabular-nums',
                      delivery.status === 'critical' ? 'text-destructive' :
                      delivery.status === 'warning' ? 'text-warning' : 'text-info'
                    )}>
                      {delivery.delayDays > 0 ? `+${delivery.delayDays}d` : 'Today'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">ETA: {delivery.expectedDate}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Customers & Driver Performance */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top Customers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Top Customers
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => {
                const cols: ExportColumn[] = [
                  { key: 'name', label: 'Customer' },
                  { key: 'orders', label: 'Orders' },
                  { key: 'revenue', label: 'Revenue (EUR)', formatter: (v) => `€${Number(v).toLocaleString()}` },
                  { key: 'growth', label: 'Growth %', formatter: (v) => `${Number(v)}%` },
                ];
                exportToExcel({
                  title: 'Top Customers',
                  filename: `hapcargo-top-customers-${new Date().toISOString().slice(0, 10)}`,
                  columns: cols,
                  data: topCustomers.map((c) => c as unknown as Record<string, unknown>),
                });
              }}
            >
              <Download className="h-3 w-3" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {topCustomers.map((customer, i) => (
                <div
                  key={customer.name}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-bold">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{customer.orders} orders</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium tabular-nums">{formatCurrency(customer.revenue)}</p>
                    <p className={cn(
                      'text-xs font-medium',
                      customer.growth >= 0 ? 'text-success' : 'text-destructive'
                    )}>
                      {customer.growth >= 0 ? '+' : ''}{customer.growth}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Driver Performance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                Driver Performance
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => {
                const cols: ExportColumn[] = [
                  { key: 'name', label: 'Driver' },
                  { key: 'trips', label: 'Trips' },
                  { key: 'otif', label: 'OTIF %', formatter: (v) => `${Number(v)}%` },
                  { key: 'avgKm', label: 'Avg km/trip' },
                  { key: 'fuelEfficiency', label: 'Fuel (km/L)', formatter: (v) => `${Number(v)} km/L` },
                ];
                exportToExcel({
                  title: 'Driver Performance',
                  filename: `hapcargo-driver-performance-${new Date().toISOString().slice(0, 10)}`,
                  columns: cols,
                  data: drivers.map((d) => d as unknown as Record<string, unknown>),
                });
              }}
            >
              <Download className="h-3 w-3" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Driver</th>
                    <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">Trips</th>
                    <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">OTIF</th>
                    <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">Avg km</th>
                    <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">Fuel eff.</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.map((driver) => (
                    <tr key={driver.name} className="border-b last:border-0 hover:bg-accent/50">
                      <td className="py-2.5 px-2 font-medium">{driver.name}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums">{driver.trips}</td>
                      <td className="py-2.5 px-2 text-right">
                        <span className={cn(
                          'font-medium tabular-nums',
                          driver.otif >= 95 ? 'text-success' : driver.otif >= 93 ? 'text-warning' : 'text-destructive'
                        )}>
                          {driver.otif}%
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right tabular-nums">{driver.avgKm} km</td>
                      <td className="py-2.5 px-2 text-right tabular-nums">{driver.fuelEfficiency} km/L</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Late Deliveries by Country & Daily Metrics */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Late Deliveries by Country"
          description="Corridors with delays"
          exportData={countryData.map((c) => ({ label: c.country, value: c.revenue }))}
          exportFilename="late-by-country"
        >
          <HapBarChart
            data={lateByCountry.map((c) => ({ country: c.country, late: c.orders }))}
            xKey="country"
            series={[{ key: 'late', label: 'Late Orders', color: 'hsl(0, 72%, 51%)' }]}
            height={280}
            horizontal
          />
        </ChartCard>

        <ChartCard
          title="Weekly Activity"
          description="Orders, km and hours"
          exportData={dailyMetrics.map((d) => ({ label: d.day, value: d.orders }))}
          exportFilename="weekly-activity"
        >
          <HapBarChart
            data={dailyMetrics}
            xKey="day"
            series={[
              { key: 'orders', label: 'Orders', color: 'hsl(213, 58%, 26%)' },
            ]}
            height={280}
          />
        </ChartCard>
      </div>
    </div>
  );
}
