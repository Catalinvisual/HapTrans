/**
 * Minimal planning store used by PlanningResultsPanel.
 * Provides a boardSelector function that returns the data needed by the panel.
 * In a full implementation this would read from the state management store.
 */
export function boardSelector() {
  return {
    boardData: {
      resources: [],
      trips: [],
      orders: [],
      conflicts: [],
      hosSummary: {},
    },
    selectedTripId: '',
    grouping: 'truck' as 'truck' | 'driver' | 'trailer',
    truckFilter: '',
    driverFilter: '',
    priorityFilter: '',
    searchFilter: '',
  };
}