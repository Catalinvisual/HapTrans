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

  // ─── Authoritative TRP Lifecycle Actions ───
  validateTrip: async (tripId: string) => {
    const { data } = await api.post(`/planning/trips/${tripId}/validate`);
    return data;
  },
  confirmTrip: async (tripId: string) => {
    const { data } = await api.post(`/planning/trips/${tripId}/confirm`);
    return data;
  },
  reopenPlanning: async (tripId: string) => {
    const { data } = await api.post(`/planning/trips/${tripId}/reopen`);
    return data;
  },
  sendToDriver: async (tripId: string, payload?: any) => {
    const { data } = await api.post(`/planning/trips/${tripId}/send-to-driver`, payload || {});
    return data;
  },
  unassignOrder: async (tripId: string, orderId: string) => {
    const { data } = await api.post(`/planning/trips/${tripId}/unassign-order`, { orderId });
    return data;
  },
  unplanTrip: async (tripId: string) => {
    const { data } = await api.post(`/planning/trips/${tripId}/unplan`);
    return data;
  },
  getRoutePlanByTrip: async (tripId: string) => {
    const { data } = await api.get(`/planning/trips/${tripId}/route`);
    return data;
  },
  splitTrip: async (tripId: string, orderIds: string[]) => {
    const { data } = await api.post(`/planning/trips/${tripId}/split`, { orderIds });
    return data;
  },
  combineTrips: async (sourceTripId: string, targetTripId: string) => {
    const { data } = await api.post('/planning/combine', { sourceTripId, targetTripId });
    return data;
  },
  autoOrderStops: async (tripId: string) => {
    const { data } = await api.post(`/planning/trips/${tripId}/auto-order`);
    return data;
  },
  reorderTripStops: async (tripId: string, stopIds: string[]) => {
    const { data } = await api.put(`/planning/trips/${tripId}/reorder`, { order: stopIds });
    return data;
  },

  // ─── Saved Views ───
  getViews: async () => {
    const { data } = await api.get('/planning/views');
    return data;
  },
  saveView: async (dto: { name: string; isDefault?: boolean; filters?: any; sort?: any; grouping?: string; columns?: any; dateRange?: any; viewMode?: string; timelineSettings?: any }) => {
    const { data } = await api.post('/planning/views', dto);
    return data;
  },
  updateView: async (id: string, dto: any) => {
    const { data } = await api.patch(`/planning/views/${id}`, dto);
    return data;
  },
  deleteView: async (id: string) => {
    const { data } = await api.delete(`/planning/views/${id}`);
    return data;
  },
};