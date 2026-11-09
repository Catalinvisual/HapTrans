/**
 * Cargo a planner stop carries.
 *
 * Trip stops hold one `stop_tasks` row per Order cargo item; the route plan
 * copies their sum into `pallets` / `weightKg` / `loadingMeters` / `volumeCbm`.
 * Editing an Order's cargo used to leave those task rows on the previous
 * quantities, so the planner kept showing the old load even though the Order,
 * the trip totals and the bill of lading had changed.
 */

export interface PlannerStopCargoTotals {
  pallets: number;
  weightKg: number;
  ldm: number;
  volumeCbm: number;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Sum of the stop's tasks. Returns null when the stop has no tasks at all: the
 * caller must then leave the persisted plan value alone instead of zeroing it.
 */
export function plannerStopTaskCargo(tasks: any[] | null | undefined): PlannerStopCargoTotals | null {
  const rows = (tasks || []).filter(Boolean);
  if (!rows.length) return null;

  const totals = { pallets: 0, weightKg: 0, ldm: 0, volumeCbm: 0 };
  for (const task of rows) {
    totals.pallets += Number(task.pallets) || 0;
    totals.weightKg += Number(task.weightKg) || 0;
    totals.ldm += Number(task.loadingMeters) || 0;
    totals.volumeCbm += Number(task.volumeCbm) || 0;
  }
  return {
    pallets: round2(totals.pallets),
    weightKg: round2(totals.weightKg),
    ldm: round2(totals.ldm),
    volumeCbm: round2(totals.volumeCbm),
  };
}

/** Cargo metrics a task created from one Order cargo item must carry. */
export function taskCargoMetrics(cargo: any, isLoad: boolean) {
  return {
    type: isLoad ? 'load' : 'unload',
    pallets: cargo?.unit === 'pallet' ? Number(cargo?.quantity) || 1 : 0,
    weightKg: Number(cargo?.weightKg) || 0,
    volumeCbm: Number(cargo?.volumeCbm) || 0,
    loadingMeters: Number(cargo?.ldm) || 0,
    quantity: Number(cargo?.quantity) || 1,
  };
}
