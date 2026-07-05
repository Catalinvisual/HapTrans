import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Plus, Search, Loader2 } from 'lucide-react';
import api from '../lib/api';

export default function OrdersPage() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders');
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter(o => 
    o.referenceNumber?.toLowerCase().includes(search.toLowerCase()) ||
    o.client?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="relative w-full sm:w-auto flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
            <input
              type="text"
              placeholder={t('search', 'Search...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
          <button className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 shrink-0">
            <Plus className="w-4 h-4" />
            {t('addOrder', 'Add Order')}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface/50">
                  <th className="p-3 font-medium text-text-secondary">{t('reference', 'Reference')}</th>
                  <th className="p-3 font-medium text-text-secondary">{t('client', 'Client')}</th>
                  <th className="p-3 font-medium text-text-secondary">{t('status', 'Status')}</th>
                  <th className="p-3 font-medium text-text-secondary">{t('weight', 'Weight')}</th>
                  <th className="p-3 font-medium text-text-secondary">{t('pallets', 'Pallets')}</th>
                  <th className="p-3 font-medium text-text-secondary text-right">{t('actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-text-secondary">
                      {t('noData', 'No records found')}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(order => (
                    <tr key={order.id} className="hover:bg-surface/50 transition-colors">
                      <td className="p-3 font-medium">{order.referenceNumber || '-'}</td>
                      <td className="p-3">{order.client?.name || '-'}</td>
                      <td className="p-3 capitalize">
                        <span className="badge badge-gray">{order.status}</span>
                      </td>
                      <td className="p-3">{order.weightKg || '-'} kg</td>
                      <td className="p-3">{order.pallets || '-'}</td>
                      <td className="p-3 text-right">
                        {/* Placeholder for actions */}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
