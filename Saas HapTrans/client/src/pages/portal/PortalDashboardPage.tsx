import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Package, Truck, FileCheck2, Euro, Activity, Clock } from 'lucide-react';
import portalApi from '../../lib/portalApi';
import { formatDate } from '../../lib/dateUtils';
import { fmtMoney } from '../../lib/format';
export default function PortalDashboardPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    portalApi.get('/portal/dashboard/stats').then(res => {
      setStats(res.data);
      setLoading(false);
    });
  }, []);
  if (loading) return <div className="p-8 text-center animate-pulse">{t("jsx_loadingDashboa")}</div>;
  return <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">{t("jsx_dashboard")}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 bg-card border border-border rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-text-secondary font-medium">{t("jsx_activeOrders")}</p>
            <p className="text-2xl font-bold">{stats.activeOrders}</p>
          </div>
        </div>

        <div className="card p-5 bg-card border border-border rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-text-secondary font-medium">{t("jsx_invoicesDue")}</p>
            <p className="text-2xl font-bold">{stats.invoicesDue}</p>
          </div>
        </div>

        <div className="card p-5 bg-card border border-border rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
            <Euro className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-text-secondary font-medium">{t("jsx_outstandingBal")}</p>
            <p className="text-2xl font-bold">{fmtMoney(stats.outstandingBalance)}</p>
          </div>
        </div>

        <div className="card p-5 bg-card border border-border rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-green-600">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-text-secondary font-medium">{t("jsx_completedThisM")}</p>
            <p className="text-2xl font-bold">{stats.completedThisMonth ?? 0}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">{t("jsx_recentActivity")}</h2>
          </div>
           <div className="space-y-4">
            {stats.recentActivity?.length > 0 ? stats.recentActivity.map((a: any, i: number) => {
              const icon = a.status === 'delivered' || a.status === 'pod_received' ? <Package className="w-4 h-4 text-green-500" /> : a.status === 'in-transit' ? <Truck className="w-4 h-4 text-blue-500" /> : <Clock className="w-4 h-4 text-text-secondary" />;
              const label = a.status === 'delivered' ? t("jsx_orderDeliv") : a.status === 'in-transit' ? t("jsx_orderInTran") : a.status === 'pod_received' ? t("jsx_orderPod") : t("jsx_orderUpdated");
              return <div key={a.id} className="flex gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${a.status === 'delivered' ? 'bg-green-50' : a.status === 'in-transit' ? 'bg-blue-50' : 'bg-surface'}`}>
                  {icon}
                </div>
                <div>
                  <p className="text-sm font-medium">{label} {a.orderNumber ? `#${a.orderNumber}` : ''}</p>
                  <p className="text-xs text-text-secondary">{formatDate(a.updatedAt)}</p>
                </div>
              </div>;
            }) : <p className="text-sm text-text-secondary">{t("jsx_noRecentActivity")}</p>}
           </div>
        </div>
      </div>
    </div>;
}