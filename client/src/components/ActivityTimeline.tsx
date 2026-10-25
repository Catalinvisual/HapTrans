import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, ChevronDown, ArrowRight, History } from 'lucide-react';
import api from '../lib/api';

export default function ActivityTimeline({
  entityType,
  entityId,
  createdAt,
  createdBy,
  updatedAt,
  updatedBy,
}: {
  entityType: string;
  entityId: string;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}) {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (!entityId || !entityType) return;
    setLoading(true);
    setError(false);
    api.get(`/action-logs/${entityType}/${entityId}`)
      .then(res => setLogs(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [entityId, entityType]);

  const fieldLabels: Record<string, string> = {
    // Orders / Invoices / Financial
    price: t('price', 'Preț'),
    currency: t('currency', 'Monedă'),
    status: t('status', 'Status'),
    priority: t('priority', 'Prioritate'),
    transportType: t('transport_type', 'Tip transport'),
    estimatedCost: t('est_cost', 'Cost estimat'),
    estimatedProfit: t('est_profit', 'Profit estimat'),
    distanceKm: t('distance', 'Distanță'),
    distance: t('distance', 'Distanță'),
    client: t('client', 'Client'),
    clientId: t('client', 'Client'),
    route: t('route', 'Traseu'),
    cargoItems: t('cargo', 'Marfă'),
    equipmentRequirements: t('equipment', 'Echipament'),
    orderNumber: t('order_number', 'Număr comandă'),
    internalReference: t('internal_reference', 'Ref. internă'),
    customerReference: t('customer_reference', 'Ref. client'),
    loadingReference: t('loading_reference', 'Ref. încărcare'),
    unloadingReference: t('unloading_reference', 'Ref. descărcare'),
    contactPerson: t('contact_person', 'Persoană contact'),
    contactPhone: t('contact_phone', 'Telefon contact'),
    notes: t('notes', 'Notițe'),
    stops: t('stops', 'Opriri'),
    total: t('total', 'Total'),
    invoiceNumber: t('invoiceNumber', 'Număr factură'),

    // Trucks / Trailers / Fleet
    plateNumber: t('plateNumber', 'Număr înmatriculare'),
    truck: t('truck', 'Camion'),
    truckId: t('truck', 'Camion'),
    trailer: t('trailer', 'Semiremorcă'),
    trailerId: t('trailer', 'Semiremorcă'),
    driver: t('driver', 'Șofer'),
    driverId: t('driver', 'Șofer'),
    make: t('make', 'Marcă'),
    model: t('model', 'Model'),
    vin: t('vin', 'VIN'),
    type: t('type', 'Tip'),
    year: t('year', 'An fabricație'),
    payloadCapacity: t('payload', 'Sarcină utilă'),
    fuelConsumption: t('fuel_consumption', 'Consum'),
    tollCost: t('tolls', 'Taxe drum'),

    // Trips
    tripNumber: t('tripNumber', 'Număr cursă'),
    dispatcher: t('dispatcher', 'Dispecer'),
    carrierName: t('carrier', 'Cărăuș'),
    plannedDeparture: t('planned_departure', 'Plecare planificată'),
    plannedArrival: t('planned_arrival', 'Sosire planificată'),
    actualDeparture: t('actual_departure', 'Plecare reală'),
    actualArrival: t('actual_arrival', 'Sosire reală'),

    // Drivers / Users / Clients
    name: t('name', 'Nume'),
    email: t('email', 'Email'),
    phone: t('phone', 'Telefon'),
    address: t('address', 'Adresă'),
    city: t('city', 'Oraș'),
    country: t('country', 'Țară'),
    cui: t('vatCui', 'CUI / CIF'),
    paymentTermsDays: t('paymentTermsDays', 'Termen plată (zile)'),
    licenseNumber: t('licenseNumber', 'Permis conducere'),
    licenseExpiry: t('expLicense', 'Expirare permis'),
    medicalExpiry: t('expMedical', 'Expirare fișă medicală'),
    tachoCardExpiry: t('expTacho', 'Expirare card tahograf'),
  };

  const formatVal = (field: string, val: any) => {
    if (val === null || val === undefined || val === '') return '—';
    if (typeof val === 'object') {
      if (val.plateNumber) return val.plateNumber;
      if (val.name) return val.name;
      if (val.orderNumber) return val.orderNumber;
      if (val.tripNumber) return val.tripNumber;
      if (Array.isArray(val)) return `${val.length} elemente`;
      return JSON.stringify(val);
    }
    if (['price', 'estimatedCost', 'estimatedProfit', 'total', 'basePrice', 'tollCost'].includes(field)) {
      return `€${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (['distanceKm', 'distance'].includes(field)) return `${val} km`;
    return String(val);
  };

  if (loading) {
    return (
      <div className="bg-surface/40 rounded-xl p-3 border border-border">
        <div className="text-[10px] font-bold uppercase text-text-secondary mb-2 flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-primary" />
          {t('activity_audit_history', 'Istoric Modificări & Audit')}
        </div>
        <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-surface/40 rounded-xl p-3 border border-border">
        <div className="text-[10px] font-bold uppercase text-text-secondary mb-2 flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-primary" />
          {t('activity_audit_history', 'Istoric Modificări & Audit')}
        </div>
        <div className="text-xs text-red-500">{t('error_loading', 'Eroare la încărcarea istoricului.')}</div>
      </div>
    );
  }

  const displayLogs = [...logs];
  const hasCreatedLog = displayLogs.some((l: any) => l.action === 'CREATED');
  
  if (!hasCreatedLog && createdAt) {
    displayLogs.push({
      id: 'synthetic-created',
      action: 'CREATED',
      createdAt: createdAt,
      user: { name: createdBy || t('system', 'System') }
    });
  }

  const hasUpdatedLog = displayLogs.some((l: any) => l.action === 'UPDATED');
  if (!hasUpdatedLog && updatedAt && createdAt && new Date(updatedAt).getTime() > new Date(createdAt).getTime() + 1000) {
    displayLogs.push({
      id: 'synthetic-updated',
      action: 'UPDATED',
      createdAt: updatedAt,
      user: { name: updatedBy || createdBy || t('system', 'System') }
    });
  }

  // Sort chronological: oldest (creation) first, newest updates at the bottom
  displayLogs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <div className="bg-surface/40 rounded-xl p-3 border border-border flex flex-col transition-all duration-200">
      <div 
        onClick={() => setIsCollapsed(!isCollapsed)} 
        className="flex items-center justify-between cursor-pointer select-none group"
      >
        <div className="flex items-center gap-2">
          <History className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary group-hover:text-primary transition-colors">
            {t('activity_audit_history', 'Istoric Modificări & Audit')}
          </span>
          {displayLogs.length > 0 && (
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">
              {displayLogs.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-text-secondary">
          <span className="text-[10px] font-medium hidden sm:inline">
            {isCollapsed ? t('expand', 'Extinde') : t('collapse', 'Restrânge')}
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} />
        </div>
      </div>

      {!isCollapsed && (
        <div className="mt-3 overflow-y-auto max-h-64 pr-1 space-y-3 custom-scrollbar border-t border-border/40 pt-3">
          {displayLogs.length === 0 ? (
            <div className="text-xs text-text-muted">{t('no_activity_recorded', 'Nicio activitate înregistrată încă.')}</div>
          ) : (
            displayLogs.map((log: any, idx: number) => {
              const isCreated = log.action === 'CREATED';
              const userName = log.user?.name || log.user?.email || (isCreated ? createdBy : updatedBy) || t('system', 'System');
              return (
                <div key={log.id || idx} className="flex gap-2.5">
                  <div className="w-2 mt-1 shrink-0 flex flex-col items-center">
                    <div className={`w-2 h-2 rounded-full ${isCreated ? 'bg-primary' : 'bg-blue-500'}`} />
                    {idx < displayLogs.length - 1 && <div className="w-px h-full bg-border mt-1" />}
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="text-xs font-bold text-text-primary">
                      {isCreated ? t('action_created', 'Creat') : log.action === 'UPDATED' ? t('action_updated', 'Modificat') : log.action}
                    </div>
                    <div className="text-[11px] text-text-secondary mt-0.5">
                      {t('by', 'de către')}{' '}
                      <span className="font-semibold text-text-primary">{userName}</span> · {new Date(log.createdAt).toLocaleString()}
                    </div>

                    {log.action === 'UPDATED' && log.details?.changes && Object.keys(log.details.changes).length > 0 ? (
                      <div className="mt-1.5 space-y-1 bg-surface/70 dark:bg-card/70 p-2 rounded-lg border border-border/60">
                        {Object.entries(log.details.changes).map(([field, change]: [string, any]) => (
                          <div key={field} className="text-[11px] flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-text-primary">
                              {fieldLabels[field] || field}:
                            </span>
                            <span className="line-through text-red-500/80 bg-red-500/10 px-1 rounded text-[10px]">
                              {formatVal(field, change.old)}
                            </span>
                            <ArrowRight className="w-3 h-3 text-text-muted shrink-0" />
                            <span className="font-bold text-green-600 dark:text-green-400 bg-green-500/10 px-1 rounded text-[10px]">
                              {formatVal(field, change.new)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : log.action === 'UPDATED' && log.details?.updatedFields && log.details.updatedFields.length > 0 ? (
                      <div className="text-[10px] text-text-muted mt-1 uppercase tracking-wide">
                        {t('edited_fields', 'Câmpuri modificate')}: {log.details.updatedFields.map((f: string) => fieldLabels[f] || f).join(', ')}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
