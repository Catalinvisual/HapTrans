// ---------------------------------------------------------------------------
// KPI CATALOGUE (GET /api/analytics/kpi-definitions)
//
// Every KPI below is implemented exactly as documented. The canonical
// calculation modules are:
//   - time performance ......... src/analytics/otif.service.ts
//   - revenue / cost / profit .. src/analytics/financial-calculator.ts
//   - operational & fleet KPIs .. src/analytics/analytics.service.ts
//
// The object list is returned verbatim by AnalyticsService.getKpiDefinitions()
// and powers the "KPI definitions / methodology" panel on the client.
// ---------------------------------------------------------------------------

export interface KpiDefinition {
  /** Stable identifier, re-used as the `key` of an analytics target. */
  id: string;
  /** KPI group used for grouping + target section. */
  section: 'service' | 'operations' | 'fleet' | 'financial' | 'receivables' | 'payables' | 'cashflow';
  /** English display label (client i18n keys map on top of this). */
  name: string;
  unit: '%' | 'EUR' | 'EUR/km' | 'EUR/month' | 'km' | 'count' | 'min' | 'days';
  /** Human description of what is measured. */
  definition: string;
  /** Where the figure comes from. */
  source: string;
  /** Precise formula. */
  formula: string;
}

export const KPI_DEFINITIONS: KpiDefinition[] = [
  // -------------------------------------------------------------------------
  // SERVICE
  // -------------------------------------------------------------------------
  {
    id: 'otif',
    section: 'service',
    name: 'On-Time, In-Full',
    unit: '%',
    definition:
      'Share of delivered orders that are both on time and delivered in full. "In full" uses the partially_delivered trip status as the completeness proxy until an order-level quantity-reconciliation table exists.',
    source: 'orders (requested_delivery_at, actual_delivery_at) + trips.status',
    formula: 'good / eligible × 100 — eligible = delivered orders with both promised & actual delivery time; good = on-time (actual <= requested + grace) AND not partially_delivered',
  },
  {
    id: 'otd',
    section: 'service',
    name: 'On-Time Delivery',
    unit: '%',
    definition: 'Share of delivered orders arriving by the promised delivery time (grace-free by default, configurable).',
    source: 'orders (requested_delivery_at, actual_delivery_at)',
    formula: 'good / eligible × 100 — good = actual_delivery_at <= requested_delivery_at + graceMinutes',
  },
  {
    id: 'otp',
    section: 'service',
    name: 'On-Time Pickup',
    unit: '%',
    definition: 'Share of trip pickup stops whose actual arrival respects the promised pickup window end.',
    source: 'stops (type=pickup, timeWindowMax, ata)',
    formula: 'good / eligible × 100 — eligible = pickup stops with timeWindowMax & ata; good = ata <= timeWindowMax + graceMinutes',
  },
  {
    id: 'deliveries',
    section: 'service',
    name: 'Deliveries',
    unit: 'count',
    definition: 'Orders that reached a delivered terminal status in the period.',
    source: 'orders.status ∈ ORDER_DELIVERED',
    formula: 'count(orders where lower(status) ∈ deltas delivered set)',
  },
  {
    id: 'lateDeliveries',
    section: 'service',
    name: 'Late Deliveries',
    unit: 'count',
    definition: 'Delivered orders flagged late (is_late OR late_minutes > 0).',
    source: 'orders.is_late / orders.late_minutes',
    formula: 'count(delivered orders with is_late=true or late_minutes>0)',
  },
  {
    id: 'avgDelayMinutes',
    section: 'service',
    name: 'Average delay (delivered)',
    unit: 'min',
    definition: 'Average minutes late among on-time-eligible delivered orders that were late.',
    source: 'orders.late_minutes + derived actual−requested',
    formula: 'Σ late_minutes / lateCount',
  },
  {
    id: 'podCompletionPct',
    section: 'service',
    name: 'POD completion',
    unit: '%',
    definition: 'Share of delivered orders that have an uploaded POD (proof of delivery) document.',
    source: 'documents (documentType = pod) joined by orderId',
    formula: 'delivered with POD / delivered × 100',
  },

  // -------------------------------------------------------------------------
  // OPERATIONS
  // -------------------------------------------------------------------------
  {
    id: 'ordersTotal',
    section: 'operations',
    name: 'Orders',
    unit: 'count',
    definition: 'Total orders created in the period.',
    source: 'orders.created_at',
    formula: 'count(orders in period)',
  },
  {
    id: 'openOrders',
    section: 'operations',
    name: 'Open orders',
    unit: 'count',
    definition: 'Orders not yet delivered and not cancelled.',
    source: 'orders.status',
    formula: 'count(orders where status ∉ ORDER_DELIVERED and status ≠ cancelled)',
  },
  {
    id: 'unassignedOrders',
    section: 'operations',
    name: 'Unassigned orders',
    unit: 'count',
    definition: 'Orders still awaiting a trip assignment.',
    source: 'orders.tripId + status',
    formula: 'count(orders with no tripId and status in new/draft/received/pending)',
  },
  {
    id: 'activeTrips',
    section: 'operations',
    name: 'Active trips',
    unit: 'count',
    definition: 'Trips currently in a live state.',
    source: 'trips.status ∈ TRIP_ACTIVE',
    formula: 'count(trips where status ∈ active set)',
  },
  {
    id: 'completedTrips',
    section: 'operations',
    name: 'Completed trips',
    unit: 'count',
    definition: 'Trips that reached a completed/closed status.',
    source: 'trips.status ∈ TRIP_COMPLETED',
    formula: 'count(trips where status ∈ completed set)',
  },
  {
    id: 'exceptions',
    section: 'operations',
    name: 'Open exceptions',
    unit: 'count',
    definition: 'Operational exceptions detected in the period: unassigned orders, late deliveries, overdue open orders, delayed trips, stop ETA breaches, negative-margin trips, missing POD, customer SLA breaches.',
    source: 'orders + trips + stops + trip_costs + documents + customer analytics',
    formula: 'count of detected exception events (severity-sorted, capped by limit)',
  },

  // -------------------------------------------------------------------------
  // FLEET
  // -------------------------------------------------------------------------
  {
    id: 'fleetUtilizationPct',
    section: 'fleet',
    name: 'Fleet utilization',
    unit: '%',
    definition: 'Share of trucks that are available or currently on a trip (i.e. not in maintenance).',
    source: 'trucks.status',
    formula: '(available + in_trip) / total × 100',
  },
  {
    id: 'loadedKm',
    section: 'fleet',
    name: 'Loaded km',
    unit: 'km',
    definition: 'Kilometres driven on trips carrying at least one order.',
    source: 'trips.distance_km/distanceKm + orders.tripId',
    formula: 'Σ distance where order_count ≥ 1',
  },
  {
    id: 'emptyKm',
    section: 'fleet',
    name: 'Empty km (deadhead)',
    unit: 'km',
    definition: 'Kilometres repositioned without cargo.',
    source: 'trips.distance_km/distanceKm + orders.tripId',
    formula: 'Σ distance where order_count = 0',
  },
  {
    id: 'deadheadPct',
    section: 'fleet',
    name: 'Deadhead ratio',
    unit: '%',
    definition: 'Share of total kilometres run empty.',
    source: 'trips distance',
    formula: 'emptyKm / (loadedKm + emptyKm) × 100',
  },
  {
    id: 'avgFuelConsumption',
    section: 'fleet',
    name: 'Average fuel consumption',
    unit: 'km',
    definition: 'Average fuel efficiency of configured trucks (l/100km). Telematics live readings are not yet integrated.',
    source: 'trucks.fuelConsumption',
    formula: 'mean(trucks.fuelConsumption where > 0)',
  },

  // -------------------------------------------------------------------------
  // FINANCIAL
  // -------------------------------------------------------------------------
  {
    id: 'revenue',
    section: 'financial',
    name: 'Revenue',
    unit: 'EUR',
    definition: 'Transport revenue for the period, from order prices per trip.',
    source: 'orders.price (fallback trips.revenue_amount / estimatedProfit)',
    formula: 'Σ tripRevenue(trip) — tripRevenue = Σ order.price if > 0 else revenue_amount ?? estimatedProfit',
  },
  {
    id: 'transportCost',
    section: 'financial',
    name: 'Transport cost',
    unit: 'EUR',
    definition: 'Direct attributable trip cost: manual costs plus allocated operational cost (km × truck cost/km).',
    source: 'trip_costs.amount + trucks.costPerKm × distance',
    formula: 'Σ (Σ trip_costs.amount + distanceKm × costPerKm); costPerKm defaults to 1.15 when missing',
  },
  {
    id: 'operatingExpenses',
    section: 'financial',
    name: 'Operating expenses',
    unit: 'EUR',
    definition: 'Company-level general expenses booked in the period. Never attributed to a single customer/route/vehicle/driver/carrier.',
    source: 'expenses.amount (date in period)',
    formula: 'Σ expenses.amount',
  },
  {
    id: 'totalCost',
    section: 'financial',
    name: 'Total cost',
    unit: 'EUR',
    definition: 'Transport cost + operating expenses (company-wide total).',
    source: 'transportCost + operatingExpenses',
    formula: 'transportCost + operatingExpenses',
  },
  {
    id: 'grossProfit',
    section: 'financial',
    name: 'Gross profit',
    unit: 'EUR',
    definition: 'Revenue minus total cost for the period.',
    source: 'revenue − totalCost',
    formula: 'revenue − totalCost',
  },
  {
    id: 'grossMargin',
    section: 'financial',
    name: 'Gross margin',
    unit: '%',
    definition: 'Gross profit as a share of revenue.',
    source: 'grossProfit / revenue',
    formula: 'grossProfit / revenue × 100',
  },
  {
    id: 'revenuePerKm',
    section: 'financial',
    name: 'Revenue / km',
    unit: 'EUR/km',
    definition: 'Revenue earned per kilometre driven.',
    source: 'revenue ÷ Σ distance',
    formula: 'revenue / km',
  },
  {
    id: 'costPerKm',
    section: 'financial',
    name: 'Cost / km',
    unit: 'EUR/km',
    definition: 'Total cost per kilometre driven (transport + operating).',
    source: 'totalCost ÷ Σ distance',
    formula: 'totalCost / km',
  },
  {
    id: 'profitPerKm',
    section: 'financial',
    name: 'Profit / km',
    unit: 'EUR/km',
    definition: 'Gross profit per kilometre driven.',
    source: 'grossProfit ÷ Σ distance',
    formula: 'grossProfit / km',
  },

  // -------------------------------------------------------------------------
  // RECEIVABLES / PAYABLES / CASHFLOW
  // -------------------------------------------------------------------------
  {
    id: 'accountsReceivable',
    section: 'receivables',
    name: 'Accounts receivable',
    unit: 'EUR',
    definition: 'Total outstanding balance of open invoices (issued amount minus payments received), not cancelled/paid.',
    source: 'invoices + payments',
    formula: 'Σ (invoice.total − Σ payments.amount) for open invoices',
  },
  {
    id: 'overdueReceivables',
    section: 'receivables',
    name: 'Overdue receivables',
    unit: 'EUR',
    definition: 'Outstanding balance of invoices past their due date.',
    source: 'invoices.due_date + payments',
    formula: 'Σ remaining where due_date < today',
  },
  {
    id: 'accountsPayable',
    section: 'payables',
    name: 'Accounts payable',
    unit: 'EUR',
    definition: 'Unpaid carrier/subcontractor trip costs plus outstanding unpaid driver settlements.',
    source: 'trip_costs (carrier types) + settlements',
    formula: 'Σ unpaid carrier trip costs + Σ unpaid settlement net_pay',
  },
  {
    id: 'unbilledRevenue',
    section: 'financial',
    name: 'Unbilled revenue',
    unit: 'EUR',
    definition: 'Transport revenue not yet issued as invoices.',
    source: 'revenue − invoiced',
    formula: 'max(0, revenue − Σ issued invoices)',
  },
  {
    id: 'avgPaymentDays',
    section: 'receivables',
    name: 'Average payment days (DSO)',
    unit: 'days',
    definition: 'Average days between invoice issue and first payment.',
    source: 'invoices.issue_date + payments.date',
    formula: 'mean(first payment date − issue date), floor 0',
  },
  {
    id: 'collectionRate',
    section: 'receivables',
    name: 'Collection rate',
    unit: '%',
    definition: 'Share of issued invoices collected in full.',
    source: 'invoices + payments',
    formula: 'fully-paid amount / total issued × 100',
  },
  {
    id: 'cashflowProjectedBalance',
    section: 'cashflow',
    name: 'Projected cash balance',
    unit: 'EUR',
    definition:
      'Opening book balance (0 until a bank/accounting integration exists) + period cash in − cash out + expected incoming (AR) − expected outgoing (AP).',
    source: 'payments + settlements + aging + payables',
    formula: 'opening + actualIncoming − actualOutgoing + expectedIncoming − expectedOutgoing',
  },
];