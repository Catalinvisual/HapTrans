import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FileCheck2, Search, Download } from 'lucide-react';
import portalApi from '../../lib/portalApi';
import { formatDate } from '../../lib/dateUtils';

export default function PortalInvoicesPage() {
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalApi.get('/portal/invoices').then(r => {
      setInvoices(r.data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Invoices & Billing</h1>
      </div>

      <div className="card bg-card border border-border rounded-2xl shadow-sm p-4">
        {loading ? (
          <div className="py-12 text-center text-text-secondary">Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="py-12 text-center text-text-secondary">No invoices found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface border-b border-border">
                  <th className="p-3 text-left font-bold text-text-secondary">Invoice #</th>
                  <th className="p-3 text-left font-bold text-text-secondary">Date</th>
                  <th className="p-3 text-left font-bold text-text-secondary">Order Ref</th>
                  <th className="p-3 text-left font-bold text-text-secondary">Amount</th>
                  <th className="p-3 text-left font-bold text-text-secondary">Status</th>
                  <th className="p-3 text-right font-bold text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} className="border-b border-border hover:bg-surface/50">
                    <td className="p-3 font-semibold text-text">{inv.number}</td>
                    <td className="p-3 text-text-secondary">{formatDate(inv.createdAt)}</td>
                    <td className="p-3">{inv.order?.referenceNumber || '—'}</td>
                    <td className="p-3 font-bold text-primary">€{Number(inv.total).toLocaleString()}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold capitalize ${
                        inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-3 flex justify-end gap-2">
                      <button className="btn-secondary py-1.5 px-3 flex items-center gap-2 text-xs font-bold">
                        <Download className="w-3 h-3" /> Download PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
