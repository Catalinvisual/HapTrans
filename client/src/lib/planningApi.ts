import api from './api';

export const planningApi = {
  // ─── Profiles ───
  getProfiles: async (companyId?: string) => {
    const { data } = await api.get('/planning/profiles', { params: { companyId } });
    return data;
  },
  getDefaultProfile: async (companyId?: string) => {
    const { data } = await api.get('/planning/profiles/default', { params: { companyId } });
    return data;
  },

  // ─── Route plans ───
  getRoutePlan: async (truckId: string, date: string) => {
    const { data } = await api.get(`/planning/trucks/${truckId}/route`, { params: { date } });
    return data;
  },
  createRoutePlan: async (truckId: string, date: string, tripId?: string) => {
    const { data } = await api.post(`/planning/trucks/${truckId}/route`, { date, tripId });
    return data;
  },
  createRoutePlanFromTrip: async (truckId: string, tripId: string) => {
    const { data } = await api.post(`/planning/trucks/${truckId}/route/from-trip/${tripId}`);
    return data;
  },
  optimizeRoutePlan: async (truckId: string, date: string, profileId?: string) => {
    const { data } = await api.post(`/planning/trucks/${truckId}/optimize`, { date, profileId });
    return data;
  },
  recalculateRoutePlan: async (truckId: string, date: string) => {
    const { data } = await api.post(`/planning/trucks/${truckId}/recalculate`, { date });
    return data;
  },
  saveRoutePlan: async (truckId: string, routePlan: any, auditAction?: string) => {
    const { data } = await api.put(`/planning/trucks/${truckId}/route`, auditAction ? { ...routePlan, auditAction } : routePlan);
    return data;
  },
  validateRoutePlan: async (truckId: string, date: string) => {
    const { data } = await api.post(`/planning/trucks/${truckId}/validate`, { date });
    return data;
  },
  getAuditActions: async (truckId: string, date?: string) => {
    const { data } = await api.get(`/planning/trucks/${truckId}/actions`, { params: { date } });
    return data;
  },
  reorderStops: async (truckId: string, date: string, stopIds: string[]) => {
    const { data } = await api.post(`/planning/trucks/${truckId}/route/reorder`, { date, stopIds });
    return data;
  },
  resetRoutePlan: async (truckId: string, date: string) => {
    const { data } = await api.post(`/planning/trucks/${truckId}/route/reset`, { date });
    return data;
  },
  lockStop: async (stopId: string, routePlanId: string, lockSequence: boolean = false) => {
    const { data } = await api.post(`/planning/stops/${stopId}/lock`, { routePlanId, lockSequence });
    return data;
  },
  unlockStop: async (stopId: string, routePlanId: string) => {
    const { data } = await api.post(`/planning/stops/${stopId}/unlock`, { routePlanId });
    return data;
  },
  lockShipment: async (shipmentId: string) => {
    const { data } = await api.post(`/planning/shipments/${shipmentId}/lock`);
    return data;
  },
  unlockShipment: async (shipmentId: string) => {
    const { data } = await api.post(`/planning/shipments/${shipmentId}/unlock`);
    return data;
  },

  // ─── Shipments ───
  createShipmentsFromOrders: async (orderIds: string[]) => {
    const { data } = await api.post('/planning/shipments/from-orders', { orderIds });
    return data;
  },
};