import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Download, CreditCard, Building2, Eye, Search, FileText, Coins, AlertTriangle, CheckCircle2, Clock, Plus } from 'lucide-react';
import { notify } from '../../components/AppToaster';
import portalApi from '../../lib/portalApi';
import { formatDate } from '../../lib/dateUtils';
import { fmtMoney } from '../../lib/format';
import { matchesSearch } from '../../lib/search';
import Pagination from '../../components/Pagination';
import DataTable from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import KpiStrip from '../../components/ui/KpiStrip';
import StatusBadge from '../../components/ui/StatusBadge';
import OrderWizard from '../../components/orders/OrderWizard';
export default function PortalInvoicesPage() {
  const { t, i18n } = useTranslation();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequest, setShowRequest] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState<any>(null);
  const [copySuccess, setCopySuccess] = useState("");
  useEffect(() => {
    portalApi.get('/portal/invoices').then(r => {
      setInvoices(r.data);
    }).catch(console.error).finally(() => setLoading(false));

    // Fetch company settings for bank details
    fetch(`${import.meta.env.VITE_API_URL}/public/company-settings`).then(res => res.json()).then(data => setCompanySettings(data)).catch(console.error);
  }, []);
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter]);
  const balanceOf = (inv: any) => (Number(inv.total) || 0) - (inv.payments?.reduce((acc: number, p: any) => acc + Number(p.amount), 0) || 0);
  const filteredInvoices = useMemo(() => invoices
    .filter(inv => matchesSearch(search, inv.invoiceNumber, inv.status))
    .filter(inv => statusFilter === 'all' || inv.status === statusFilter ||
      (statusFilter === 'open' && ['sent', 'viewed', 'overdue'].includes(inv.status)))
    .sort((a, b) => new Date(b.issueDate || b.createdAt || 0).getTime() - new Date(a.issueDate || a.createdAt || 0).getTime()),
    [invoices, search, statusFilter]);
  const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalOutstanding = invoices.filter(i => ['sent', 'viewed', 'overdue'].includes(i.status)).reduce((s, i) => s + balanceOf(i), 0);
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
  const columns: Column<any>[] = [
    { key: 'invoice', label: t('jsx_invoice', 'Invoice'), render: inv => (
      <div className="min-w-0">
        <div className="font-bold text-primary text-[13px] truncate">{inv.invoiceNumber || '—'}</div>
        <div className="text-[11px] text-text-secondary truncate">{formatDate(inv.issueDate || inv.createdAt)}</div>
      </div>
    ) },
    { key: 'due', label: t('jsx_dueDate', 'Due date'), render: inv => (
      <span className={`text-[12px] font-semibold whitespace-nowrap ${inv.status === 'overdue' ? 'text-red-600' : 'text-text-primary'}`}>{formatDate(inv.dueDate)}</span>
    ) },
    { key: 'order', label: t('jsx_orderRef', 'Order'), render: inv => (
      <span className="text-[12px] font-medium text-text-secondary">{inv.trip?.orders?.[0]?.orderNumber || inv.trip?.orders?.[0]?.referenceNumber || (inv.trip?.id ? `TRIP-${inv.trip.id.slice(0, 8).toUpperCase()}` : '—')}</span>
    ) },
    { key: 'total', label: t('jsx_total', 'Total'), align: 'right', render: inv => <div className="text-right font-bold text-text-primary whitespace-nowrap">{fmtMoney(Number(inv.total) || 0)}</div> },
    { key: 'balance', label: t('jsx_balance', 'Balance'), align: 'right', render: inv => <div className="text-right font-black text-primary whitespace-nowrap">{fmtMoney(balanceOf(inv))}</div> },
    { key: 'status', label: t('jsx_status', 'Status'), render: inv => {
      const map: Record<string, string> = { paid: 'paid', overdue: 'cancelled', sent: 'new', viewed: 'new', draft: 'draft' };
      return <StatusBadge status={map[inv.status] || 'draft'} label={<span className="capitalize">{inv.status}</span>} />;
    } },
    { key: 'actions', label: t('jsx_actions', 'Actions'), align: 'right', render: inv => {
      const canPay = ['sent', 'viewed', 'overdue'].includes(inv.status) && balanceOf(inv) > 0;
      return (
        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
          {canPay && <button title={t('jsx_payNow', 'Pay now')} onClick={() => setShowPaymentModal(inv)} className="p-1.5 rounded-md text-text-secondary hover:text-green-600 hover:bg-green-50"><CreditCard className="w-4 h-4" /></button>}
          <button title={t('jsx_details', 'Details')} onClick={() => setShowDetailsModal(inv)} className="p-1.5 rounded-md text-text-secondary hover:text-primary hover:bg-primary/10"><Eye className="w-4 h-4" /></button>
          <button title={t('jsx_pDF', 'PDF')} onClick={() => handleDownloadPdf(inv)} className="p-1.5 rounded-md text-text-secondary hover:text-primary hover:bg-primary/10"><Download className="w-4 h-4" /></button>
        </div>
      );
    } },
  ];
  return <div className="max-w-[1600px] mx-auto space-y-4 animate-fade-in">
      <KpiStrip items={[
        { key: 'total', label: t('kpi_total', 'Total'), value: invoices.length, icon: FileText, color: 'text-text-primary', onClick: () => setStatusFilter('all'), active: statusFilter === 'all' },
        { key: 'open', label: t('kpi_open', 'Open'), value: invoices.filter(i => ['sent', 'viewed', 'overdue'].includes(i.status)).length, icon: Clock, color: 'text-blue-600', onClick: () => setStatusFilter('open'), active: statusFilter === 'open' },
        { key: 'overdue', label: t('kpi_overdue', 'Overdue'), value: invoices.filter(i => i.status === 'overdue').length, icon: AlertTriangle, color: 'text-red-600', onClick: () => setStatusFilter('overdue'), active: statusFilter === 'overdue' },
        { key: 'paid', label: t('kpi_paid', 'Paid'), value: invoices.filter(i => i.status === 'paid').length, icon: CheckCircle2, color: 'text-green-600', onClick: () => setStatusFilter('paid'), active: statusFilter === 'paid' },
        { key: 'outstanding', label: t('kpi_outstanding', 'Outstanding'), value: fmtMoney(totalOutstanding), icon: Coins, color: 'text-primary' },
      ]} />

      <div className="card p-0 overflow-hidden border-border">
        <div className="p-3 border-b border-border bg-surface/30">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px] max-w-[16rem] shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchPlaceholder', 'Search invoices...')} className="input pl-9 bg-white w-full text-sm" />
            </div>
            <div className="flex items-center gap-2 ml-auto shrink-0">
              <span className="text-xs text-text-secondary font-medium whitespace-nowrap">{filteredInvoices.length} {t('results', 'results')}</span>
              <button onClick={() => setShowRequest(true)} className="btn-primary py-2 px-3 flex items-center gap-2 text-sm font-semibold shadow-md shadow-primary/20 whitespace-nowrap"><Plus className="w-4 h-4" />{t('addOrder', 'Create Order')}</button>
            </div>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={paginatedInvoices}
          rowKey={inv => inv.id}
          loading={loading}
          minWidth="800px"
          onRowClick={inv => setShowDetailsModal(inv)}
          emptyState={<div className="p-16 text-center text-text-secondary">{t('jsx_noInvoicesFou', 'No invoices found')}</div>}
        />
        <Pagination currentPage={currentPage} totalItems={filteredInvoices.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
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