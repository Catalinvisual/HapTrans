import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Truck, AlertTriangle, FileWarning, Clock, Package, DollarSign, Activity, Users } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';

function StatCard({ title, value, icon: Icon, color, suffix }: any) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
      <div>
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">{title}</span>
        <div className="flex items-baseline gap-1">
          <span className={`text-3xl font-black ${color || 'text-gray-900 dark:text-white'}`}>{value}</span>
          {suffix && <span className="text-sm font-bold text-gray-400">{suffix}</span>}
        </div>
      </div>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-gray-50 dark:bg-gray-700 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  
  // Use the user's role if available, otherwise default to manager
  const role = user?.role === 'dispatcher' ? 'dispatcher' : 'manager';

  useEffect(() => {
    api.get(`/dashboard?role=${role}`)
      .then((r) => { setData(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [role]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (role === 'dispatcher') {
    return (
      <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dispatcher Dashboard</h1>
            <p className="text-sm text-gray-500">Live operational overview</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Orders Waiting" value={data?.ordersWaiting || 0} icon={Package} color="text-orange-500" />
          <StatCard title="Orders Delayed" value={data?.ordersDelayed || 0} icon={AlertTriangle} color="text-red-500" />
          <StatCard title="Trucks Available" value={data?.trucksAvailable || 0} icon={Truck} color="text-blue-500" />
          <StatCard title="Active Trips" value={data?.tripsActive || 0} icon={Activity} color="text-green-500" />
          <StatCard title="Free Drivers" value={data?.driversFree || 0} icon={Users} color="text-purple-500" />
          <StatCard title="Avg Plan Time" value={data?.avgPlanningTime || '-'} icon={Clock} color="text-gray-600" />
        </div>

        {/* Dispatcher Actions */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Package className="text-orange-500" /> Action Required
            </h3>
            {data?.ordersWaiting > 0 ? (
              <div className="p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-xl">
                <p className="font-semibold text-orange-800 dark:text-orange-300">You have {data.ordersWaiting} orders waiting to be planned.</p>
                <a href="/planning" className="inline-block mt-3 text-sm font-bold bg-orange-600 text-white px-4 py-2 rounded-lg">Go to Planning Board</a>
              </div>
            ) : (
              <p className="text-gray-500">No urgent actions pending.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Manager Role View
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manager Dashboard</h1>
          <p className="text-sm text-gray-500">Financial and fleet performance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Revenue (Today)" value={data?.revenueToday || 0} suffix="€" icon={DollarSign} color="text-green-500" />
        <StatCard title="Profit (Today)" value={data?.profitToday || 0} suffix="€" icon={TrendingUp} color="text-emerald-500" />
        <StatCard title="Fleet Utilization" value={data?.fleetUtilization || 0} suffix="%" icon={Truck} color="text-blue-500" />
        <StatCard title="On-Time Delivery" value={data?.onTimeDeliveryRate || 0} suffix="%" icon={Clock} color="text-purple-500" />
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <FileWarning className="text-red-500" /> Financial Alerts
          </h3>
          {data?.invoicesWaiting > 0 ? (
             <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl">
               <p className="font-semibold text-red-800 dark:text-red-300">You have {data.invoicesWaiting} overdue invoices.</p>
               <a href="/invoices" className="inline-block mt-3 text-sm font-bold bg-red-600 text-white px-4 py-2 rounded-lg">View Invoices</a>
             </div>
          ) : (
            <p className="text-gray-500">All invoices are up to date.</p>
          )}
        </div>
      </div>
    </div>
  );
}
