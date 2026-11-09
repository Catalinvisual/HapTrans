import { plannerStopTaskCargo, taskCargoMetrics } from './route-plan-cargo';

describe('plannerStopTaskCargo', () => {
  it('sums every task of the stop', () => {
    const totals = plannerStopTaskCargo([
      { pallets: 12, weightKg: 10500, loadingMeters: 4.8, volumeCbm: 30 },
      { pallets: 12, weightKg: 10500, loadingMeters: 4.8, volumeCbm: 30 },
    ]);

    expect(totals).toEqual({ pallets: 24, weightKg: 21000, ldm: 9.6, volumeCbm: 60 });
  });

  it('reports no data for a stop without tasks', () => {
    expect(plannerStopTaskCargo([])).toBeNull();
    expect(plannerStopTaskCargo(null)).toBeNull();
  });
});

describe('taskCargoMetrics', () => {
  it('maps a pallet cargo item to the task columns the planner reads', () => {
    expect(taskCargoMetrics({ unit: 'pallet', quantity: 24, weightKg: '21000', volumeCbm: '60', ldm: '9.6' }, true))
      .toEqual({ type: 'load', pallets: 24, weightKg: 21000, volumeCbm: 60, loadingMeters: 9.6, quantity: 24 });
  });

  it('does not count a non-pallet unit as pallets', () => {
    expect(taskCargoMetrics({ unit: 'box', quantity: 5, weightKg: 20, volumeCbm: 1, ldm: 0.4 }, false))
      .toMatchObject({ type: 'unload', pallets: 0, quantity: 5 });
  });
});
