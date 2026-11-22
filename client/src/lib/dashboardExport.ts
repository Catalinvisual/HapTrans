import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { exportWorkbook } from './exportExcel';
import { getCompanySettings } from '../store/settingsStore';
import { fmtNumber, fmtPercent } from './format';
import {
  drawPdfHeader, finishPdf, pdfSafe, pdfSectionTitle,
  PDF_ALT_ROW_STYLES, PDF_HEAD_STYLES, PDF_INK, PDF_MUTED, PDF_TABLE_STYLES,
} from './pdfTheme';
import type { OverviewData, OverviewTrip } from '../components/dashboard/types';
import {
  formatLongDate, formatShortDate, formatTime, humanizeStatus, routeText,
} from '../components/dashboard/types';

type Translator = any;

function statusText(trip: OverviewTrip, t: Translator): string {
  return t(`status_${trip.status}`, humanizeStatus(trip.status));
}

function tripRecord(trip: OverviewTrip, kind: string, t: Translator, lang: string) {
  return {
    ref: trip.tripNumber || trip.id.slice(0, 8).toUpperCase(),
    type: kind,
    status: statusText(trip, t),
    route: routeText(trip.originCity, trip.originCountry, trip.destCity, trip.destCountry, lang),
    truck: trip.truckPlate || t('dbd_no_truck'),
    driver: trip.driverName || t('dbd_no_driver'),
    departure: formatTime(trip.plannedDeparture, lang),
    arrival: formatTime(trip.plannedArrival, lang),
    delay: trip.delayMinutes || 0,
    orders: trip.orderCount || 0,
  };
}

function operationRows(data: OverviewData, t: Translator, lang: string) {
  const groups: Array<[string, OverviewTrip[]]> = [
    [t('dbd_departures'), data.today.departures],
    [t('dbd_arrivals'), data.today.arrivals],
    [t('dbd_active_now'), data.today.active],
    [t('dbd_delayed'), data.today.delayed],
  ];
  const seen = new Map<string, ReturnType<typeof tripRecord>>();
  for (const [kind, trips] of groups) {
    for (const trip of trips) {
      if (!seen.has(trip.id)) seen.set(trip.id, tripRecord(trip, kind, t, lang));
    }
  }
  return [...seen.values()];
}

function summaryRecords(data: OverviewData, t: Translator) {
  const k = data.kpis || {};
  return [
    { metric: t('dbd_trips'), value: k.tripsTotal || 0 },
    { metric: t('dbd_kpi_completed'), value: k.tripsCompleted || 0 },
    { metric: t('dbd_kpi_delayed'), value: k.tripsDelayed || 0 },
    { metric: t('dbd_kpi_unassigned'), value: k.ordersUnassigned || 0 },
    { metric: t('dbd_kpi_orders'), value: k.ordersTotal || 0 },
    { metric: t('dbd_kpi_km'), value: k.kmTotal || 0 },
    { metric: t('dbd_kpi_ontime'), value: fmtPercent(k.onTimeRate || 0) },
    { metric: t('dbd_delay_avg'), value: `${fmtNumber(k.avgDelayMinutes || 0)} ${t('dbd_min')}` },
    { metric: t('dbd_kpi_countries'), value: k.countriesActive || 0 },
    { metric: t('dbd_kpi_incidents'), value: k.openIncidents || 0 },
    { metric: t('dbd_fleet_title'), value: `${fmtNumber(k.fleetAvailable || 0)} ${t('dbd_fleet_available').toLowerCase()} / ${fmtNumber(k.fleetTotal || 0)}` },
    { metric: t('dbd_drivers_title'), value: `${fmtNumber(k.driversOnDuty || 0)} ${t('dbd_driver_in_trip').toLowerCase()} / ${fmtNumber(k.driversTotal || 0)}` },
  ];
}

export async function exportDashboardExcel(
  data: OverviewData,
  t: Translator,
  lang: string,
): Promise<void> {
  const periodLabel = `${formatShortDate(data.meta.from, lang)} – ${formatShortDate(data.meta.to, lang)}`;
  const generated = t('dbd_export_generated', { time: formatTime(data.meta.generatedAt, lang) });
  const subtitle = `${periodLabel} · ${generated}`;
  const filename = `dashboard-${data.meta.from.slice(0, 10)}-${data.meta.to.slice(0, 10)}`;

  const operations = operationRows(data, t, lang);
  const countryRows = data.byCountry.map((row) => ({
    country: row.country,
    pickups: row.pickups,
    deliveries: row.deliveries,
    total: row.total,
  }));
  const routeRows = data.topRoutes.map((row) => ({
    from: row.from || '—',
    to: row.to || '—',
    trips: row.trips,
    km: row.km,
  }));
  const upcomingRows = data.upcoming.days.map((day) => ({
    date: formatShortDate(day.date, lang),
    departures: day.count,
  }));
  const upcomingTrips = data.upcoming.trips.map((trip) => tripRecord(trip, t('dbd_departures'), t, lang));
  const unassignedRows = data.unassignedOrders.map((order) => ({
    ref: order.orderNumber || order.id.slice(0, 8).toUpperCase(),
    client: order.clientName || '—',
    route: routeText(order.originCity, order.originCountry, order.destCity, order.destCountry, lang),
    priority: order.priority,
    status: order.status,
    created: formatShortDate(order.createdAt || '', lang),
  }));

  await exportWorkbook({
    filename,
    sheets: [
      {
        name: t('dbd_export_summary'),
        title: t('dbd_export_summary'),
        subtitle,
        headers: [
          { key: 'metric', label: t('fin_metric', 'Indicator') },
          { key: 'value', label: t('fin_value', 'Value'), align: 'right' },
        ],
        rows: summaryRecords(data, t),
      },
      {
        name: t('dbd_export_ops_today'),
        title: t('dbd_export_ops_today'),
        subtitle,
        headers: [
          { key: 'ref', label: t('ref_table_header', 'Ref'), align: 'center' },
          { key: 'type', label: t('dbd_export_type') },
          { key: 'status', label: t('jsx_status', 'Status') },
          { key: 'route', label: t('jsx_route', 'Route') },
          { key: 'truck', label: t('jsx_truck', 'Truck') },
          { key: 'driver', label: t('jsx_driver', 'Driver') },
          { key: 'departure', label: t('dbd_departures'), align: 'center' },
          { key: 'arrival', label: t('dbd_arrivals'), align: 'center' },
          { key: 'delay', label: t('dbd_min'), align: 'right' },
          { key: 'orders', label: t('dbd_kpi_orders'), align: 'right' },
        ],
        rows: operations,
      },
      {
        name: t('dbd_country_title'),
        title: t('dbd_country_title'),
        subtitle,
        headers: [
          { key: 'country', label: t('ifta_country', 'Country') },
          { key: 'pickups', label: t('dbd_pickups'), align: 'right' },
          { key: 'deliveries', label: t('dbd_deliveries'), align: 'right' },
          { key: 'total', label: t('dbd_total'), align: 'right' },
        ],
        rows: countryRows,
      },
      {
        name: t('dbd_routes_title'),
        title: t('dbd_routes_title'),
        subtitle,
        headers: [
          { key: 'from', label: t('origin', 'Origin') },
          { key: 'to', label: t('destination', 'Destination') },
          { key: 'trips', label: t('dbd_trips'), align: 'right' },
          { key: 'km', label: t('dbd_kpi_km'), align: 'right' },
        ],
        rows: routeRows,
      },
      {
        name: t('dbd_upcoming_title'),
        title: t('dbd_upcoming_title'),
        subtitle,
        headers: [
          { key: 'date', label: t('jsx_pickupDate', 'Date') },
          { key: 'departures', label: t('dbd_departures'), align: 'right' },
        ],
        rows: upcomingRows,
      },
      {
        name: t('dbd_unassigned_title'),
        title: t('dbd_unassigned_title'),
        subtitle,
        headers: [
          { key: 'ref', label: t('ref_table_header', 'Ref'), align: 'center' },
          { key: 'client', label: t('jsx_client', 'Client') },
          { key: 'route', label: t('jsx_route', 'Route') },
          { key: 'priority', label: t('jsx_priority', 'Priority') },
          { key: 'status', label: t('jsx_status', 'Status') },
          { key: 'created', label: t('createdBy', 'Created'), align: 'center' },
        ],
        rows: unassignedRows,
      },
      {
        name: t('dbd_trips'),
        title: `${t('dbd_upcoming_title')} · ${t('dbd_trips')}`,
        subtitle,
        headers: [
          { key: 'ref', label: t('ref_table_header', 'Ref'), align: 'center' },
          { key: 'status', label: t('jsx_status', 'Status') },
          { key: 'route', label: t('jsx_route', 'Route') },
          { key: 'truck', label: t('jsx_truck', 'Truck') },
          { key: 'driver', label: t('jsx_driver', 'Driver') },
          { key: 'departure', label: t('dbd_departures'), align: 'center' },
          { key: 'orders', label: t('dbd_kpi_orders'), align: 'right' },
        ],
        rows: upcomingTrips.map(({ delay, arrival, type, ...rest }) => {
          void delay; void arrival; void type;
          return rest;
        }),
      },
    ],
  });
}

export async function exportDashboardPdf(
  data: OverviewData,
  t: Translator,
  lang: string,
): Promise<void> {
  const doc = new jsPDF('landscape', 'pt', 'a4');
  const company = getCompanySettings();
  const periodLabel = `${formatLongDate(data.meta.from, lang)} – ${formatLongDate(data.meta.to, lang)}`;
  const k = data.kpis || {};

  const header = await drawPdfHeader(doc, {
    title: t('dbd_title'),
    subtitle: `${periodLabel} · ${t('dbd_export_generated', { time: formatTime(data.meta.generatedAt, lang) })}`,
    company,
    unit: 'pt',
  });

  const kpiPairs: Array<[string, string]> = [
    [t('dbd_trips'), fmtNumber(k.tripsTotal || 0)],
    [t('dbd_kpi_completed'), fmtNumber(k.tripsCompleted || 0)],
    [t('dbd_kpi_delayed'), fmtNumber(k.tripsDelayed || 0)],
    [t('dbd_kpi_unassigned'), fmtNumber(k.ordersUnassigned || 0)],
    [t('dbd_kpi_fleet'), `${fmtNumber(k.fleetAvailable || 0)} / ${fmtNumber(k.fleetTotal || 0)}`],
    [t('dbd_kpi_km'), fmtNumber(k.kmTotal || 0)],
    [t('dbd_kpi_ontime'), fmtPercent(k.onTimeRate || 0)],
    [t('dbd_kpi_countries'), fmtNumber(k.countriesActive || 0)],
    [t('dbd_kpi_orders'), fmtNumber(k.ordersTotal || 0)],
    [t('dbd_kpi_incidents'), fmtNumber(k.openIncidents || 0)],
  ];
  const kpiBody: any[] = [];
  for (let i = 0; i < kpiPairs.length; i += 2) {
    const first = kpiPairs[i];
    const second = kpiPairs[i + 1] || ['', ''];
    kpiBody.push([pdfSafe(first[0]), pdfSafe(first[1]), pdfSafe(second[0]), pdfSafe(second[1])]);
  }
  autoTable(doc, {
    startY: header.startY,
    body: kpiBody,
    theme: 'plain',
    margin: { left: 40, right: 40 },
    styles: { fontSize: 9, cellPadding: { top: 4, bottom: 4, left: 6, right: 6 } },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: PDF_MUTED, cellWidth: 130 },
      1: { fontStyle: 'bold', fontSize: 12, textColor: PDF_INK, cellWidth: 120 },
      2: { fontStyle: 'bold', textColor: PDF_MUTED, cellWidth: 130 },
      3: { fontStyle: 'bold', fontSize: 12, textColor: PDF_INK },
    },
  });

  let cursorY = ((doc as any).lastAutoTable?.finalY || 150) + 18;

  const section = (title: string, head: string[], body: any[], widths?: Record<number, any>) => {
    if (!body.length) return;
    pdfSectionTitle(doc, title, 40, cursorY, 'pt');
    autoTable(doc, {
      startY: cursorY + 8,
      head: [head.map((cell: any) => pdfSafe(cell))],
      body: body.map((row) => row.map((cell: any) => (typeof cell === 'number' ? cell : pdfSafe(cell)))),
      theme: 'grid',
      margin: { left: 40, right: 40 },
      headStyles: { ...PDF_HEAD_STYLES, fontSize: 8 },
      styles: { ...PDF_TABLE_STYLES, fontSize: 8, lineColor: [235, 235, 235] },
      alternateRowStyles: PDF_ALT_ROW_STYLES,
      columnStyles: widths,
    });
    cursorY = ((doc as any).lastAutoTable?.finalY || cursorY) + 24;
  };

  const operations = operationRows(data, t, lang);
  section(
    t('dbd_export_ops_today'),
    [t('jsx_eta', 'ETA'), t('dbd_export_type'), t('ref_table_header', 'Ref'), t('jsx_route', 'Route'), `${t('jsx_truck', 'Truck')} / ${t('jsx_driver', 'Driver')}`, t('jsx_status', 'Status'), t('dbd_delayed')],
    operations.slice(0, 24).map((row) => [
      row.departure || row.arrival,
      row.type,
      row.ref,
      row.route,
      `${row.truck} / ${row.driver}`,
      row.status,
      row.delay > 0 ? `+${row.delay} ${t('dbd_min')}` : '—',
    ]),
    { 0: { cellWidth: 48 }, 1: { cellWidth: 70 }, 2: { cellWidth: 70 }, 4: { cellWidth: 150 }, 6: { cellWidth: 64 } },
  );

  section(
    t('dbd_country_title'),
    [t('ifta_country', 'Country'), t('dbd_pickups'), t('dbd_deliveries'), t('dbd_total')],
    data.byCountry.slice(0, 10).map((row) => [row.country, row.pickups, row.deliveries, row.total]),
    { 3: { fontStyle: 'bold' } },
  );

  section(
    `${t('dbd_fleet_title')} · ${t('dbd_drivers_title')}`,
    [t('fin_metric', 'Indicator'), t('fin_value', 'Value')],
    [
      [t('dbd_fleet_in_trip'), data.fleet.inTrip],
      [t('dbd_fleet_available'), data.fleet.available],
      [t('dbd_fleet_maintenance'), data.fleet.maintenance],
      [t('dbd_fleet_inactive'), data.fleet.inactive],
      [t('dbd_utilization'), fmtPercent(k.utilizationPct || 0)],
      [t('dbd_driver_in_trip'), data.drivers.inTrip],
      [t('dbd_driver_available'), data.drivers.available],
      [t('dbd_driver_off'), data.drivers.off],
      [t('dbd_driver_sick'), data.drivers.sick],
      [t('dbd_driver_vacation'), data.drivers.vacation],
    ],
    { 1: { fontStyle: 'bold' } },
  );

  section(
    t('dbd_status_title'),
    [t('jsx_status', 'Status'), t('dbd_trips')],
    data.statusDistribution.map((row) => [t(`status_${row.status}`, humanizeStatus(row.status)), row.count]),
    { 1: { fontStyle: 'bold' } },
  );

  section(
    t('dbd_routes_title'),
    [t('origin', 'Origin'), t('destination', 'Destination'), t('dbd_trips'), t('dbd_kpi_km')],
    data.topRoutes.map((row) => [row.from || '—', row.to || '—', row.trips, row.km]),
    {},
  );

  section(
    t('dbd_upcoming_title'),
    [t('jsx_pickupDate', 'Date'), t('dbd_departures')],
    data.upcoming.days.map((day) => [formatShortDate(day.date, lang), day.count]),
    { 1: { fontStyle: 'bold' } },
  );

  section(
    t('dbd_unassigned_title'),
    [t('ref_table_header', 'Ref'), t('jsx_client', 'Client'), t('jsx_route', 'Route'), t('jsx_priority', 'Priority'), t('jsx_status', 'Status')],
    data.unassignedOrders.map((order) => [
      order.orderNumber || order.id.slice(0, 8).toUpperCase(),
      order.clientName || '—',
      routeText(order.originCity, order.originCountry, order.destCity, order.destCountry, lang),
      order.priority,
      t(`status_${order.status}`, humanizeStatus(order.status)),
    ]),
  );

  finishPdf(doc);
  doc.save(`dashboard-${data.meta.from.slice(0, 10)}-${data.meta.to.slice(0, 10)}.pdf`);
}

/** Compact portrait handover sheet for the next dispatcher shift. */
export async function exportHandoverPdf(
  data: OverviewData,
  t: Translator,
  lang: string,
  resolvedIds: Set<string> = new Set(),
): Promise<void> {
  const doc = new jsPDF('portrait', 'pt', 'a4');
  const margin = 40;
  const company = getCompanySettings();
  const alerts = data.alerts.filter((alert) => !resolvedIds.has(alert.id));
  const incidents = alerts.filter((alert) => alert.type === 'incident');
  const documents = alerts.filter((alert) => alert.type === 'document');
  const driverRows = (data.driverHours || []).filter((row) => row.drivingRemainingMin <= 120 || row.breakInMin <= 30);
  const offline = data.telemetry?.stale || [];

  const hm = (minutes: number): string => {
    const safe = Math.max(0, Math.round(minutes || 0));
    const h = Math.floor(safe / 60);
    const m = safe % 60;
    return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
  };

  const header = await drawPdfHeader(doc, {
    title: t('dbd_handover_title'),
    subtitle: `${formatLongDate(data.today.date, lang)} · ${t('dbd_handover_sub')}`,
    company,
    unit: 'pt',
  });

  let cursor = header.startY;
  const section = (title: string, head: string[], body: any[]) => {
    if (!body.length) return;
    if (cursor > doc.internal.pageSize.getHeight() - 150) {
      doc.addPage();
      cursor = 50;
    }
    pdfSectionTitle(doc, title, margin, cursor, 'pt');
    autoTable(doc, {
      startY: cursor + 8,
      head: [head.map((cell: any) => pdfSafe(cell))],
      body: body.map((row) => row.map((cell: any) => (typeof cell === 'number' ? cell : pdfSafe(cell)))),
      theme: 'grid',
      margin: { left: margin, right: margin },
      headStyles: { ...PDF_HEAD_STYLES, fontSize: 8 },
      styles: { ...PDF_TABLE_STYLES, fontSize: 8, lineColor: [235, 235, 235] },
      alternateRowStyles: PDF_ALT_ROW_STYLES,
    });
    cursor = ((doc as any).lastAutoTable?.finalY || cursor) + 24;
  };

  autoTable(doc, {
    startY: cursor,
    body: [
      [pdfSafe(t('dbd_handover_delayed')), String(data.today.counts.delayed)],
      [pdfSafe(t('dbd_handover_unassigned')), String(data.kpis.ordersUnassigned || 0)],
      [pdfSafe(t('dbd_handover_incidents')), String(incidents.length)],
      [pdfSafe(t('dbd_handover_docs')), String(documents.length)],
    ],
    theme: 'grid',
    margin: { left: margin, right: margin },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 220 }, 1: { fontStyle: 'bold' } },
    styles: { ...PDF_TABLE_STYLES, fontSize: 9, cellPadding: 5 },
    alternateRowStyles: PDF_ALT_ROW_STYLES,
  });
  cursor = ((doc as any).lastAutoTable?.finalY || cursor) + 26;

  section(
    t('dbd_handover_delayed'),
    [t('ref_table_header', 'Ref'), t('jsx_route', 'Route'), t('dbd_min')],
    data.today.delayed.map((trip) => [
      trip.tripNumber || trip.id.slice(0, 8).toUpperCase(),
      routeText(trip.originCity, trip.originCountry, trip.destCity, trip.destCountry, lang),
      `+${trip.delayMinutes}`,
    ]),
  );

  section(
    t('dbd_handover_unassigned'),
    [t('ref_table_header', 'Ref'), t('jsx_client', 'Client'), t('jsx_route', 'Route'), t('jsx_priority', 'Priority')],
    data.unassignedOrders.map((order) => [
      order.orderNumber || order.id.slice(0, 8).toUpperCase(),
      order.clientName || '—',
      routeText(order.originCity, order.originCountry, order.destCity, order.destCountry, lang),
      order.priority,
    ]),
  );

  section(
    t('dbd_handover_incidents'),
    [t('ref_table_header', 'Ref'), t('jsx_route', 'Route'), t('jsx_status', 'Status')],
    incidents.map((alert) => [alert.title, alert.subtitle || '—', alert.severity]),
  );

  section(
    t('dbd_handover_docs'),
    [t('jsx_documents', 'Document'), t('dbd_days')],
    documents.map((alert) => [alert.title, alert.value != null ? String(Math.max(0, alert.value)) : '—']),
  );

  section(
    t('dbd_handover_drivers'),
    [t('jsx_driver', 'Driver'), t('jsx_truck', 'Truck'), t('dbd_driving_left'), t('dbd_break_in')],
    driverRows.map((row) => [row.driverName, row.truckPlate, hm(row.drivingRemainingMin), hm(row.breakInMin)]),
  );

  section(
    t('dbd_handover_offline'),
    [t('jsx_truck', 'Truck'), t('dbd_last_seen'), t('jsx_status', 'Status')],
    offline.map((row) => [row.plate, row.lastSeenAt ? formatTime(row.lastSeenAt, lang) : '—', row.status]),
  );

  finishPdf(doc);
  doc.save(`handover-${data.today.date}.pdf`);
}
