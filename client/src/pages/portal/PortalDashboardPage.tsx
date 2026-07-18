import { useState, useEffect } from 'react';
import { Package, Truck, FileCheck2, Euro, Activity, Clock } from 'lucide-react';
import portalApi from '../../lib/portalApi';

export default function PortalDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalApi.get('/portal/dashboard/stats').then(res => {
      setStats(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8 text-center animate-pulse">Loading dashboard...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 bg-card border border-border rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-text-secondary font-medium">Active Orders</p>
            <p className="text-2xl font-bold">{stats.activeOrders}</p>
          </div>
        </div>

        <div className="card p-5 bg-card border border-border rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-text-secondary font-medium">Invoices Due</p>
            <p className="text-2xl font-bold">{stats.invoicesDue}</p>
          </div>
        </div>

        <div className="card p-5 bg-card border border-border rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
            <Euro className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-text-secondary font-medium">Outstanding Balance</p>
            <p className="text-2xl font-bold">€{stats.outstandingBalance.toLocaleString()}</p>
          </div>
        </div>

        <div className="card p-5 bg-card border border-border rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-green-600">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-text-secondary font-medium">Current Shipments</p>
            <p className="text-2xl font-bold">{stats.activeOrders}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Recent Activity</h2>
          </div>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-text-secondary" />
              </div>
              <div>
                <p className="text-sm font-medium">Order #1024 created</p>
                <p className="text-xs text-text-secondary">2 hours ago</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <Truck className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Truck assigned to Order #1023</p>
                <p className="text-xs text-text-secondary">5 hours ago</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                <Package className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Order #1020 Delivered</p>
                <p className="text-xs text-text-secondary">1 day ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
