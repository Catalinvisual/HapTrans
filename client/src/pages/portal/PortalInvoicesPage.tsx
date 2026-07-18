import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FileCheck2, Search, Download, CreditCard, Building2, Wallet, Eye } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import portalApi from '../../lib/portalApi';
import api from '../../lib/api'; // For public settings
import { formatDate } from '../../lib/dateUtils';
import Pagination from '../../components/Pagination';

export default function PortalInvoicesPage() {
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');

  const [companySettings, setCompanySettings] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState<any>(null);
  const [copySuccess, setCopySuccess] = useState('');

  useEffect(() => {
    portalApi.get('/portal/invoices').then(r => {
      setInvoices(r.data);
    }).catch(console.error).finally(() => setLoading(false));
    
    // Fetch company settings for bank details
    fetch(`${import.meta.env.VITE_API_URL}/public/company-settings`)
      .then(res => res.json())
      .then(data => setCompanySettings(data))
      .catch(console.error);
  }, []);

  const totalPages = Math.ceil(invoices.length / limit);
  const paginatedInvoices = invoices.slice((page - 1) * limit, page * limit);

  const handlePageChange = (newPage: number) => {
    setSearchParams({ page: newPage.toString(), limit: limit.toString() });
  };

  const handleLimitChange = (newLimit: number) => {
    setSearchParams({ page: '1', limit: newLimit.toString() });
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(type);
    setTimeout(() => setCopySuccess(''), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700';
      case 'overdue': return 'bg-red-100 text-red-700 animate-pulse';
      case 'sent': case 'viewed': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

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
                  <th className="p-3 text-left font-bold text-text-secondary">Issue Date</th>
                  <th className="p-3 text-left font-bold text-text-secondary">Due Date</th>
                  <th className="p-3 text-left font-bold text-text-secondary">Order Ref</th>
                  <th className="p-3 text-left font-bold text-text-secondary">Total</th>
                  <th className="p-3 text-left font-bold text-text-secondary">Balance</th>
                  <th className="p-3 text-left font-bold text-text-secondary">Status</th>
                  <th className="p-3 text-right font-bold text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedInvoices.map(inv => {
                  const total = Number(inv.total) || 0;
                  const paid = inv.payments?.reduce((acc: number, p: any) => acc + Number(p.amount), 0) || 0;
                  const balance = total - paid;
                  const canPay = ['sent', 'viewed', 'overdue'].includes(inv.status);

                  return (
                    <tr key={inv.id} className="border-b border-border hover:bg-surface/50">
                      <td className="p-3 font-semibold text-text">{inv.invoiceNumber || '—'}</td>
                      <td className="p-3 text-text-secondary">{formatDate(inv.issueDate || inv.createdAt)}</td>
                      <td className={`p-3 font-semibold ${inv.status === 'overdue' ? 'text-red-600' : 'text-text-secondary'}`}>{formatDate(inv.dueDate)}</td>
                      <td className="p-3">{inv.trip?.orders?.[0]?.referenceNumber || (inv.trip?.id ? `TRIP-${inv.trip.id.slice(0, 8).toUpperCase()}` : '—')}</td>
                      <td className="p-3 font-bold text-text">€{total.toLocaleString()}</td>
                      <td className="p-3 font-bold text-primary">€{balance.toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold capitalize ${getStatusColor(inv.status)}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-3 flex justify-end gap-2">
                        {canPay && balance > 0 && (
                          <button onClick={() => setShowPaymentModal(inv)} className="btn-primary py-1.5 px-3 flex items-center gap-2 text-xs font-bold">
                            <CreditCard className="w-3 h-3" /> Pay Now
                          </button>
                        )}
                        <button onClick={() => setShowDetailsModal(inv)} className="btn-secondary py-1.5 px-3 flex items-center gap-2 text-xs font-bold">
                          <Eye className="w-3 h-3" /> Details
                        </button>
                        <button className="btn-secondary py-1.5 px-3 flex items-center gap-2 text-xs font-bold">
                          <Download className="w-3 h-3" /> PDF
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {invoices.length > 0 && (
          <div className="p-4 border-t border-border flex justify-center">
            <Pagination
              currentPage={page}
              totalItems={invoices.length}
              itemsPerPage={limit}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleLimitChange}
            />
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-border bg-surface">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Building2 className="text-primary w-6 h-6" />
                  Bank Transfer Details
                </h3>
                <button onClick={() => setShowPaymentModal(null)} className="text-text-secondary hover:text-text">&times;</button>
              </div>
              <p className="text-sm text-text-secondary mt-2">
                Please transfer the amount to the following bank account. Include the invoice number in the payment reference.
              </p>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-text-secondary">Amount Due</span>
                  <span className="text-2xl font-black text-primary">
                    €{(Number(showPaymentModal.total) - (showPaymentModal.payments?.reduce((a: number, p: any) => a + Number(p.amount), 0) || 0)).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">Payment Reference</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-text bg-white px-2 py-1 rounded shadow-sm">{showPaymentModal.invoiceNumber}</span>
                    <button onClick={() => handleCopy(showPaymentModal.invoiceNumber, 'ref')} className="text-primary text-xs font-bold hover:underline">
                      {copySuccess === 'ref' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase">Beneficiary Name</label>
                  <p className="font-semibold text-text">{companySettings?.name || 'Company Name Not Set'}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase">Bank Name</label>
                  <p className="font-semibold text-text">{companySettings?.bankName || 'Bank Name Not Set'}</p>
                </div>
                <div className="relative">
                  <label className="text-xs font-bold text-text-secondary uppercase">IBAN</label>
                  <div className="flex items-center justify-between bg-surface p-3 rounded-xl border border-border">
                    <code className="font-bold text-text font-mono">{companySettings?.iban || 'IBAN Not Set'}</code>
                    <button onClick={() => handleCopy(companySettings?.iban || '', 'iban')} className="btn-secondary py-1 px-3 text-xs font-bold">
                      {copySuccess === 'iban' ? 'Copied!' : 'Copy IBAN'}
                    </button>
                  </div>
                </div>
                {companySettings?.bic && (
                  <div className="relative">
                    <label className="text-xs font-bold text-text-secondary uppercase">BIC / SWIFT</label>
                    <div className="flex items-center justify-between bg-surface p-3 rounded-xl border border-border">
                      <code className="font-bold text-text font-mono">{companySettings.bic}</code>
                      <button onClick={() => handleCopy(companySettings.bic, 'bic')} className="btn-secondary py-1 px-3 text-xs font-bold">
                        {copySuccess === 'bic' ? 'Copied!' : 'Copy BIC'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 border-t border-border bg-surface flex justify-end gap-3">
              <button onClick={() => setShowPaymentModal(null)} className="btn-primary w-full py-3 font-bold text-lg">
                I understand, close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-fade-in max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-border bg-surface shrink-0">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Invoice Details: {showDetailsModal.invoiceNumber}</h3>
                <button onClick={() => setShowDetailsModal(null)} className="text-text-secondary hover:text-text">&times;</button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase">Issue Date</label>
                  <p className="font-semibold">{formatDate(showDetailsModal.issueDate || showDetailsModal.createdAt)}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase">Due Date</label>
                  <p className="font-semibold">{formatDate(showDetailsModal.dueDate)}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase">Total Amount</label>
                  <p className="font-bold text-primary">€{Number(showDetailsModal.total).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase">Status</label>
                  <p><span className={`px-2 py-1 rounded text-xs font-bold capitalize ${getStatusColor(showDetailsModal.status)}`}>{showDetailsModal.status}</span></p>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-bold mb-3 border-b border-border pb-2">Payment History</h4>
                {showDetailsModal.payments && showDetailsModal.payments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-surface border-b border-border">
                          <th className="p-2 text-left font-bold text-text-secondary">Date</th>
                          <th className="p-2 text-left font-bold text-text-secondary">Method</th>
                          <th className="p-2 text-left font-bold text-text-secondary">Reference</th>
                          <th className="p-2 text-right font-bold text-text-secondary">Amount</th>
                          <th className="p-2 text-right font-bold text-text-secondary">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {showDetailsModal.payments.map((p: any) => (
                          <tr key={p.id} className="border-b border-border">
                            <td className="p-2">{formatDate(p.date || p.createdAt)}</td>
                            <td className="p-2 capitalize">{p.method}</td>
                            <td className="p-2">{p.reference || '—'}</td>
                            <td className="p-2 text-right font-bold text-primary">€{Number(p.amount).toLocaleString()}</td>
                            <td className="p-2 text-right">
                              <span className="px-2 py-1 rounded text-[10px] font-bold capitalize bg-green-100 text-green-700">
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-text-secondary bg-surface p-4 rounded-xl text-center">No payments recorded for this invoice yet.</p>
                )}
              </div>
            </div>
            
            <div className="p-6 border-t border-border bg-surface flex justify-end gap-3 shrink-0">
              {['sent', 'viewed', 'overdue'].includes(showDetailsModal.status) && (Number(showDetailsModal.total) - (showDetailsModal.payments?.reduce((a: number, p: any) => a + Number(p.amount), 0) || 0)) > 0 && (
                <button onClick={() => { setShowPaymentModal(showDetailsModal); setShowDetailsModal(null); }} className="btn-primary py-2 px-4 font-bold flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> Pay Now
                </button>
              )}
              <button onClick={() => setShowDetailsModal(null)} className="btn-secondary py-2 px-4 font-bold">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
