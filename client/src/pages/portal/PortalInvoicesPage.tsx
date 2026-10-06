import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Download, CreditCard, Building2, Eye, Package } from 'lucide-react';
import { notify } from '../../components/AppToaster';
import { useSearchParams } from 'react-router-dom';
import portalApi from '../../lib/portalApi';
import { formatDate } from '../../lib/dateUtils';
import { fmtMoney } from '../../lib/format';
import Pagination from '../../components/Pagination';
import OrderWizard from '../../components/orders/OrderWizard';
export default function PortalInvoicesPage() {
  const { t, i18n } = useTranslation();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequest, setShowRequest] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState<any>(null);
  const [copySuccess, setCopySuccess] = useState("");
  const [paymentForm, setPaymentForm] = useState({ amount: "", date: new Date().toISOString().slice(0, 10), method: "bank_transfer", reference: "" });
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    portalApi.get('/portal/invoices').then(r => {
      setInvoices(r.data);
    }).catch(console.error).finally(() => setLoading(false));

    // Fetch company settings for bank details
    fetch(`${import.meta.env.VITE_API_URL}/public/company-settings`).then(res => res.json()).then(data => setCompanySettings(data)).catch(console.error);
  }, []);
  const paginatedInvoices = invoices.slice((page - 1) * limit, page * limit);
  const handlePageChange = (newPage: number) => {
    setSearchParams({
      page: newPage.toString(),
      limit: limit.toString()
    });
  };
  const handleLimitChange = (newLimit: number) => {
    setSearchParams({
      page: '1',
      limit: newLimit.toString()
    });
  };
  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(type);
    setTimeout(() => setCopySuccess(''), 2000);
  };

  const handleDownloadPdf = async (inv: any) => {
    try {
      const res = await portalApi.post('/invoices/generate-pdf', {
        invoice: inv,
        company: companySettings,
        lang: (i18n.language === 'nl' ? 'nl' : 'en') as 'en' | 'nl',
      });
      const { base64 } = res.data || {};
      if (!base64) { notify.error('PDF negenerat.'); return; }
      const byteChars = atob(base64);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
      const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (inv.invoiceNumber || 'invoice') + '.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      notify.error(err?.response?.data?.message || 'Eroare generare PDF.');
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'overdue':
        return 'bg-red-100 text-red-700 animate-pulse';
      case 'sent':
      case 'viewed':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };
  return <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">{t("jsx_invoicesBill")}</h1>
        <button onClick={() => setShowRequest(true)} className="btn-primary py-2 px-4 flex items-center gap-2">
          <Package className="w-4 h-4" />{t("jsx_newTransportR")}</button>
      </div>

      <div className="card bg-card border border-border rounded-2xl shadow-sm p-4">
        {loading ? <div className="py-12 text-center text-text-secondary">{t("jsx_loadingInvoice")}</div> : invoices.length === 0 ? <div className="py-12 text-center text-text-secondary">{t("jsx_noInvoicesFou")}</div> : <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface border-b border-border">
                  <th className="table-header">{t("jsx_invoice")}</th>
                  <th className="table-header">{t("jsx_issueDate")}</th>
                  <th className="table-header">{t("jsx_dueDate")}</th>
                  <th className="table-header">{t("jsx_orderRef")}</th>
                  <th className="table-header">{t("jsx_total")}</th>
                  <th className="table-header">{t("jsx_balance")}</th>
                  <th className="table-header">{t("jsx_status")}</th>
                  <th className="table-header">{t("jsx_actions")}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedInvoices.map(inv => {
              const total = Number(inv.total) || 0;
              const paid = inv.payments?.reduce((acc: number, p: any) => acc + Number(p.amount), 0) || 0;
              const balance = total - paid;
              const canPay = ['sent', 'viewed', 'overdue'].includes(inv.status);
              return <tr key={inv.id} className="border-b border-border hover:bg-surface/50">
                      <td className="p-3 font-semibold text-text">{inv.invoiceNumber || '—'}</td>
                      <td className="p-3 text-text-secondary">{formatDate(inv.issueDate || inv.createdAt)}</td>
                      <td className={`p-3 font-semibold ${inv.status === 'overdue' ? 'text-red-600' : 'text-text-secondary'}`}>{formatDate(inv.dueDate)}</td>
                      <td className="p-3">{inv.trip?.orders?.[0]?.referenceNumber || (inv.trip?.id ? `TRIP-${inv.trip.id.slice(0, 8).toUpperCase()}` : '—')}</td>
                      <td className="p-3 font-bold text-text">{fmtMoney(total)}</td>
                      <td className="p-3 font-bold text-primary">{fmtMoney(balance)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold capitalize ${getStatusColor(inv.status)}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-3 flex justify-end gap-2">
                        {canPay && balance > 0 && <button onClick={() => setShowPaymentModal(inv)} className="btn-primary py-1.5 px-3 flex items-center gap-2 text-xs font-bold">
                            <CreditCard className="w-3 h-3" />{t("jsx_payNow")}</button>}
                        <button onClick={() => setShowDetailsModal(inv)} className="btn-secondary py-1.5 px-3 flex items-center gap-2 text-xs font-bold">
                          <Eye className="w-3 h-3" />{t("jsx_details")}</button>
                        <button onClick={() => handleDownloadPdf(inv)} className="btn-secondary py-1.5 px-3 flex items-center gap-2 text-xs font-bold">
                          <Download className="w-3 h-3" />{t("jsx_pDF")}</button>
                      </td>
                    </tr>;
            })}
              </tbody>
            </table>
          </div>}
        
        {invoices.length > 0 && <div className="p-4 border-t border-border flex justify-center">
            <Pagination currentPage={page} totalItems={invoices.length} itemsPerPage={limit} onPageChange={handlePageChange} onItemsPerPageChange={handleLimitChange} />
          </div>}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && typeof document !== 'undefined' && createPortal(<div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-border bg-surface">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Building2 className="text-primary w-6 h-6" />{t("jsx_bankTransferD")}</h3>
                <button onClick={() => setShowPaymentModal(null)} className="text-text-secondary hover:text-text">&times;</button>
              </div>
              <p className="text-sm text-text-secondary mt-2">{t("jsx_pleaseTransfer")}</p>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-text-secondary">{t("jsx_amountDue")}</span>
                  <span className="text-2xl font-black text-primary">
                    {fmtMoney(Number(showPaymentModal.total) - (showPaymentModal.payments?.reduce((a: number, p: any) => a + Number(p.amount), 0) || 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">{t("jsx_paymentReferen")}</span>
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
                  <label className="text-xs font-bold text-text-secondary uppercase">{t("jsx_beneficiaryNam")}</label>
                  <p className="font-semibold text-text">{companySettings?.name || 'Company Name Not Set'}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase">{t("jsx_bankName")}</label>
                  <p className="font-semibold text-text">{companySettings?.bankName || 'Bank Name Not Set'}</p>
                </div>
                <div className="relative">
                  <label className="text-xs font-bold text-text-secondary uppercase">{t("jsx_iBAN")}</label>
                  <div className="flex items-center justify-between bg-surface p-3 rounded-xl border border-border">
                    <code className="font-bold text-text font-mono">{companySettings?.iban || 'IBAN Not Set'}</code>
                    <button onClick={() => handleCopy(companySettings?.iban || '', 'iban')} className="btn-secondary py-1 px-3 text-xs font-bold">
                      {copySuccess === 'iban' ? 'Copied!' : 'Copy IBAN'}
                    </button>
                  </div>
                </div>
                {companySettings?.bic && <div className="relative">
                    <label className="text-xs font-bold text-text-secondary uppercase">{t("jsx_bICSWIFT")}</label>
                    <div className="flex items-center justify-between bg-surface p-3 rounded-xl border border-border">
                      <code className="font-bold text-text font-mono">{companySettings.bic}</code>
                      <button onClick={() => handleCopy(companySettings.bic, 'bic')} className="btn-secondary py-1 px-3 text-xs font-bold">
                        {copySuccess === 'bic' ? 'Copied!' : 'Copy BIC'}
                      </button>
                    </div>
                  </div>}
              </div>
            </div>
            
            <div className="p-6 border-t border-border bg-surface flex justify-end gap-3">
              <button onClick={() => setShowPaymentModal(null)} className="btn-primary w-full py-3 font-bold text-lg">{t("jsx_iUnderstandC")}</button>
            </div>
          </div>
        </div>, document.body)}
      {/* Details Modal */}
      {showDetailsModal && typeof document !== 'undefined' && createPortal(<div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-fade-in max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-border bg-surface shrink-0">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">{t("jsx_invoiceDetails")}{showDetailsModal.invoiceNumber}</h3>
                <button onClick={() => setShowDetailsModal(null)} className="text-text-secondary hover:text-text">&times;</button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase">{t("jsx_issueDate")}</label>
                  <p className="font-semibold">{formatDate(showDetailsModal.issueDate || showDetailsModal.createdAt)}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase">{t("jsx_dueDate")}</label>
                  <p className="font-semibold">{formatDate(showDetailsModal.dueDate)}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase">{t("jsx_totalAmount")}</label>
                  <p className="font-bold text-primary">{fmtMoney(showDetailsModal.total)}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase">{t("jsx_status")}</label>
                  <p><span className={`px-2 py-1 rounded text-xs font-bold capitalize ${getStatusColor(showDetailsModal.status)}`}>{showDetailsModal.status}</span></p>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-bold mb-3 border-b border-border pb-2">{t("jsx_paymentHistory")}</h4>
                {showDetailsModal.payments && showDetailsModal.payments.length > 0 ? <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-surface border-b border-border">
                          <th className="table-header">{t("jsx_date")}</th>
                          <th className="table-header">{t("jsx_method")}</th>
                          <th className="table-header">{t("jsx_reference")}</th>
                          <th className="table-header">{t("jsx_amount")}</th>
                          <th className="table-header">{t("jsx_status")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {showDetailsModal.payments.map((p: any) => <tr key={p.id} className="border-b border-border">
                            <td className="p-2">{formatDate(p.date || p.createdAt)}</td>
                            <td className="p-2 capitalize">{p.method}</td>
                            <td className="p-2">{p.reference || '—'}</td>
                            <td className="p-2 text-right font-bold text-primary">{fmtMoney(p.amount)}</td>
                            <td className="p-2 text-right">
                              <span className="px-2 py-1 rounded text-[10px] font-bold capitalize bg-green-100 text-green-700">
                                {p.status}
                              </span>
                            </td>
                          </tr>)}
                      </tbody>
                    </table>
                  </div> : <p className="text-sm text-text-secondary bg-surface p-4 rounded-xl text-center">{t("jsx_noPaymentsRec")}</p>}
              </div>
            </div>
            
            <div className="p-6 border-t border-border bg-surface flex justify-end gap-3 shrink-0">
              {['sent', 'viewed', 'overdue'].includes(showDetailsModal.status) && Number(showDetailsModal.total) - (showDetailsModal.payments?.reduce((a: number, p: any) => a + Number(p.amount), 0) || 0) > 0 && <button onClick={() => {
            setShowPaymentModal(showDetailsModal);
            setShowDetailsModal(null);
          }} className="btn-primary py-2 px-4 font-bold flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />{t("jsx_payNow")}</button>}
              <button onClick={() => setShowDetailsModal(null)} className="btn-secondary py-2 px-4 font-bold">{t("jsx_close")}</button>
            </div>
          </div>
        </div>, document.body)}
    <OrderWizard isPortal={true} isOpen={showRequest} onClose={() => setShowRequest(false)} onSaved={() => window.location.reload()} />
    </div>;
}