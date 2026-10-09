import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Eye, Download, Share2, Trash2, Mail, BarChart3, Send, Wallet, CheckCircle2, AlertTriangle, Pencil, FileText } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import ExportModal from '../components/ExportModal';
import { generateInvoicePdfBase64 } from '../lib/invoicePdfGenerator';
import { formatDate } from '../lib/dateUtils';
import { fmtMoney } from '../lib/format';
import { matchesSearch } from '../lib/search';
import CustomSelect from '../components/CustomSelect';
import type { SelectOption } from '../components/CustomSelect';
import ConfirmModal from '../components/ConfirmModal';
import { getCompanySettings } from "../store/settingsStore";
import { useFormStore } from '../store/formStore';
import Pagination from '../components/Pagination';
import KpiStrip from '../components/ui/KpiStrip';
import DataTable from '../components/ui/DataTable';
import type { Column } from '../components/ui/DataTable';
import { useShortcuts } from '../hooks/useShortcuts';
import { useTableShortcuts } from '../hooks/useTableShortcuts';
import { useSaveConfirm, useConfirm } from '../components/SaveConfirmProvider';
export default function InvoicesPage({
  embeddedClientId
}: {
  embeddedClientId?: string;
}) {
  const formStore = useFormStore();
  const {
    t,
    i18n
  } = useTranslation();
  const confirmSave = useSaveConfirm();
  const confirm = useConfirm();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(formStore.invoicesShowForm);
  const [editId, setEditId] = useState<string | null>(formStore.invoicesEditId);
  const fpOptions = useMemo(() => ({
    altInput: true,
    altFormat: 'd/m/Y',
    dateFormat: 'Y-m-d',
    allowInput: false,
    minDate: 'today'
  }), []);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showExport, setShowExport] = useState(false);
  const [showAging, setShowAging] = useState(false);
  const [aging, setAging] = useState<any>(null);
  const [agingLoading, setAgingLoading] = useState(false);
  const [reminderBusy, setReminderBusy] = useState(false);
  const loadAging = async () => {
    setAgingLoading(true);
    try {
      const res = await api.get('/invoices/aging');
      setAging(res.data);
      setShowAging(true);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || t('agingLoadError'));
    } finally {
      setAgingLoading(false);
    }
  };
  const sendReminders = async () => {
    const ok = await confirm({
      type: 'warning',
      title: t('sendReminders', 'Trimitere notificări'),
      message: t('reminderConfirm', 'Ești sigur că vrei să trimiți notificări pentru facturile scadente?'),
      confirmText: t('send', 'Trimite'),
      cancelText: t('cancel', 'Anulează')
    });
    if (!ok) return;
    setReminderBusy(true);
    try {
      const res = await api.post('/invoices/send-reminders', {});
      toast.success((t('remindersSent') || 'Reminders sent:') + ' ' + res.data.sent);
      loadAging();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || t('remindersFailed'));
    } finally {
      setReminderBusy(false);
    }
  };
  const [previewData, setPreviewData] = useState<string | null>(null);
  const [invoiceLangModal, setInvoiceLangModal] = useState<any>({
    isOpen: false,
    data: null,
    type: '',
    cb: null
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [selectedRowIndex, setSelectedRowIndex] = useState(-1);
  const [form, setForm] = useState(formStore.invoicesForm || {
    clientId: '',
    tripId: '',
    amount: '',
    fuelSurcharge: '',
    extraCosts: '',
    tollCosts: '',
    vatPercent: '19',
    vatType: 'NORMAL',
    issueDate: '',
    dueDate: '',
    notes: ''
  });
  useEffect(() => {
    formStore.setFormState('invoices', {
      showForm,
      editId,
      form
    });
  }, [showForm, editId, form]);
  const filteredTrips = form.clientId ? trips.filter((t: any) => t.client?.id === form.clientId) : trips;
  const load = async () => {
    const [inv, cl, tr] = await Promise.all([api.get('/invoices'), api.get('/clients'), api.get('/trips')]);
    setInvoices(inv.data);
    setClients(cl.data);
    setTrips(tr.data);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (!showForm) {
      setPreviewData(null);
      return;
    }
    const timer = setTimeout(async () => {
      const mockClient = clients.find(c => c.id === form.clientId);
      const mockTrip = trips.find(t => t.id === form.tripId);
      let routeDesc = 'Road freight transport services';
      if (mockTrip && mockTrip.pickupAddress && mockTrip.dropoffAddress) {
        routeDesc = 'Transport: ' + mockTrip.pickupAddress.split(',')[0] + ' - ' + mockTrip.dropoffAddress.split(',')[0];
      }
      let tariffs: any = {
        adrSurchargeFee: 100,
        nightSurchargeFee: 80,
        weekendSurchargeFee: 150,
        holidaySurchargeFee: 200
      };
      try {
        const tRes = await api.get('/public/tariff-settings');
        if (tRes.data && Object.keys(tRes.data).length > 0) {
          tariffs = {
            ...tariffs,
            ...tRes.data
          };
        }
      } catch (e) {
        console.error(e);
      }
      const items = [];
      let subtotal = 0;
      const pN = (v: string | number) => Number(String(v).replace(',', '.')) || 0;
      const amount = pN(form.amount);
      const vatP = pN(form.vatPercent) || 19;
      const isVat = form.vatType === 'NORMAL';
      if (amount > 0) {
        items.push({
          description: routeDesc,
          quantity: 1,
          unitPrice: amount,
          vatRate: isVat ? vatP : 0,
          total: amount
        });
        subtotal += amount;
      }
      const fuel = pN(form.fuelSurcharge);
      if (fuel > 0) {
        const fuelCost = Number((amount * fuel / 100).toFixed(2));
        items.push({
          description: 'Fuel Surcharge (' + fuel + '%)',
          quantity: 1,
          unitPrice: fuelCost,
          vatRate: isVat ? vatP : 0,
          total: fuelCost
        });
        subtotal += fuelCost;
      }
      const toll = pN(form.tollCosts);
      if (toll > 0) {
        items.push({
          description: 'Road tolls / Toll charges',
          quantity: 1,
          unitPrice: toll,
          vatRate: isVat ? vatP : 0,
          total: toll
        });
        subtotal += toll;
      }
      if (mockTrip?.adrSurcharge) {
        const fee = Number(tariffs.adrSurchargeFee) || 100;
        items.push({
          description: 'ADR Surcharge Fee',
          quantity: 1,
          unitPrice: fee,
          vatRate: isVat ? vatP : 0,
          total: fee
        });
        subtotal += fee;
      }
      if (mockTrip?.nightSurcharge) {
        const fee = Number(tariffs.nightSurchargeFee) || 80;
        items.push({
          description: 'Night / Express Surcharge Fee',
          quantity: 1,
          unitPrice: fee,
          vatRate: isVat ? vatP : 0,
          total: fee
        });
        subtotal += fee;
      }
      if (mockTrip?.weekendSurcharge) {
        const fee = Number(tariffs.weekendSurchargeFee) || 150;
        items.push({
          description: 'Weekend Surcharge Fee',
          quantity: 1,
          unitPrice: fee,
          vatRate: isVat ? vatP : 0,
          total: fee
        });
        subtotal += fee;
      }
      if (mockTrip?.holidaySurcharge) {
        const fee = Number(tariffs.holidaySurchargeFee) || 200;
        items.push({
          description: 'Public Holiday Surcharge Fee',
          quantity: 1,
          unitPrice: fee,
          vatRate: isVat ? vatP : 0,
          total: fee
        });
        subtotal += fee;
      }
      const extra = pN(form.extraCosts);
      if (extra > 0) {
        items.push({
          description: 'Extra charges',
          quantity: 1,
          unitPrice: extra,
          vatRate: isVat ? vatP : 0,
          total: extra
        });
        subtotal += extra;
      }
      let vatAmount = isVat ? Number((subtotal * vatP / 100).toFixed(2)) : 0;
      let total = subtotal + vatAmount;
      const mockInvoice = {
        invoiceNumber: editId ? invoices.find(i => i.id === editId)?.invoiceNumber : 'DRAFT',
        client: mockClient || {
          name: '...'
        },
        trip: mockTrip || {},
        amount: pN(form.amount),
        fuelSurcharge: pN(form.fuelSurcharge),
        extraCosts: pN(form.extraCosts),
        tollCosts: pN(form.tollCosts),
        vatPercent: pN(form.vatPercent),
        vatType: form.vatType || 'NORMAL',
        issueDate: form.issueDate || new Date().toISOString(),
        dueDate: form.dueDate || new Date().toISOString(),
        notes: form.notes || '',
        status: 'draft',
        items,
        subtotal,
        vatAmount,
        total
      };
      try {
        const base64 = await generateInvoicePdfBase64(mockInvoice, i18n.language === 'ro' ? 'en' : i18n.language as any);
        setPreviewData(base64);
      } catch (e) {
        console.error(e);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [form, showForm, editId, clients, trips, invoices, i18n.language]);
  const handlePreviewDraft = async (inv: any) => {
    const loadId = toast.loading(t('generatingPdf'));
    try {
      const base64 = await generateInvoicePdfBase64(inv, i18n.language === 'ro' ? 'en' : i18n.language as any);
      toast.dismiss(loadId);
      const newTab = window.open();
      if (newTab) newTab.document.write(`<iframe src="${base64}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%; position: fixed;" allowfullscreen></iframe>`);
    } catch (err: any) {
      toast.dismiss(loadId);
      toast.error(err?.response?.data?.message || err?.message || t('pdfGenerateError'));
    }
  };
  const handlePreview = (invoice: any) => {
    const newTab = window.open();
    if (newTab) {
      newTab.document.write(`<iframe src="${invoice.pdfUrl || invoice.pdfData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%; position: fixed;" allowfullscreen></iframe>`);
    } else {
      toast.error(t('allowPopups'));
    }
  };
  const handleDownload = (invoice: any) => {
    const link = document.createElement('a');
    link.href = invoice.pdfUrl || invoice.pdfData;
    link.download = `Invoice_${invoice.invoiceNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(t('invoiceDownloaded'));
  };
  const handleShare = async (invoice: any) => {
    if (navigator.share) {
      try {
        if (invoice.pdfUrl) {
          await navigator.share({
            title: `Invoice ${invoice.invoiceNumber}`,
            text: `Hello, here is the invoice ${invoice.invoiceNumber} from HapCargo. Link:`,
            url: invoice.pdfUrl
          });
        } else {
          const arr = invoice.pdfData.split(',');
          const mime = arr[0].match(/:(.*?);/)[1];
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          const file = new File([u8arr], `Invoice_${invoice.invoiceNumber}.pdf`, {
            type: mime
          });
          await navigator.share({
            files: [file],
            title: `Invoice ${invoice.invoiceNumber}`,
            text: `Hello, here is the invoice ${invoice.invoiceNumber} from HapCargo.`
          });
        }
        toast.success(t('invoiceShared'));
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          toast.error(t('shareFailed'));
        }
      }
    } else {
      navigator.clipboard.writeText(`Invoice ${invoice.invoiceNumber} - Client: ${invoice.client?.name} - Amount: € ${invoice.amount}`);
      toast.success(t('copiedToClipboard'));
    }
  };
  const handleSendEmail = async (invoice: any) => {
    const loadId = toast.loading(t('sendingEmail') || 'Sending Email...');
    try {
      const company = getCompanySettings();
      await api.post(`/invoices/send-email/${invoice.id}`, {
        company: JSON.stringify(company)
      });
      toast.dismiss(loadId);
      toast.success(t('emailSent') || 'Email sent successfully!');
      load();
    } catch (err: any) {
      toast.dismiss(loadId);
      toast.error(err.response?.data?.message || t('error'));
    }
  };
  const ensurePdfAndExecute = async (invoice: any, action: (inv: any) => void) => {
    if (invoice.pdfUrl || invoice.pdfData) {
      action(invoice);
    } else {
      setInvoiceLangModal({
        isOpen: true,
        data: invoice,
        type: 'ensure',
        cb: action
      });
    }
  };
  const executeDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/invoices/${deleteId}`);
      toast.success(t('invoiceDeleted') || t('statusUpdated'));
      setDeleteId(null);
      load();
    } catch (err: any) {
      toast.error(t('saveError'));
    }
  };
  const isPastDate = (val: string) => {
    if (editId || !val) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(val);
    selected.setHours(0, 0, 0, 0);
    return selected < today;
  };
  const getErrorMessage = () => {
    const lg = i18n?.language || 'en';
    if (lg === 'ro') return 'Data nu poate fi în trecut.';
    if (lg === 'nl') return 'Datum mag niet in het verleden liggen.';
    if (lg === 'de') return 'Datum darf nicht in der Vergangenheit liegen.';
    if (lg === 'fr') return 'La date ne peut pas être dans le passé.';
    if (lg === 'es') return 'La fecha no puede estar en el pasado.';
    if (lg === 'pl') return 'Data nie może być w przeszłości.';
    return 'Date cannot be in the past.';
  };
  const handleSubmit = async (e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!await confirmSave()) return;
    if (isPastDate(form.issueDate) || isPastDate(form.dueDate)) {
      toast.error(getErrorMessage());
      return;
    }
    if (!form.clientId) {
      toast.error(t('selectClient'));
      return;
    }
    setInvoiceLangModal({
      isOpen: true,
      data: form,
      type: 'submit'
    });
  };
  const handleEditClick = (inv: any) => {
    setForm({
      clientId: inv.client?.id || '',
      tripId: inv.trip?.id || '',
      amount: String(inv.amount && Number(inv.amount) > 0 ? inv.amount : inv.trip?.price ?? inv.trip?.agreedPrice ?? ''),
      fuelSurcharge: String(inv.fuelSurcharge && Number(inv.fuelSurcharge) > 0 ? inv.fuelSurcharge : inv.trip?.fuelSurchargePercent ?? inv.trip?.fuelSurcharge ?? ''),
      extraCosts: String(inv.extraCosts && Number(inv.extraCosts) > 0 ? inv.extraCosts : inv.trip?.extraCosts ?? ''),
      tollCosts: String(inv.tollCosts && Number(inv.tollCosts) > 0 ? inv.tollCosts : inv.trip?.tollCosts ?? ''),
      vatPercent: String(inv.vatPercent ?? '19'),
      vatType: inv.vatType || 'NORMAL',
      issueDate: inv.issueDate ? new Date(inv.issueDate).toISOString().split('T')[0] : '',
      dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '',
      notes: inv.notes || ''
    });
    setEditId(inv.id);
    setShowForm(true);
  };
  const handleApprove = async (invoice: any, sendEmail: boolean) => {
    try {
      const loadId = toast.loading(sendEmail ? t('approvingAndSending') : t('approving'));
      const approveRes = await api.patch(`/invoices/${invoice.id}/approve`);
      const officialInvoice = approveRes.data;
      const base64Pdf = await generateInvoicePdfBase64(officialInvoice, 'en');
      const arr = base64Pdf.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/pdf';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const file = new File([u8arr], `Invoice_${officialInvoice.invoiceNumber}.pdf`, {
        type: mime
      });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('company', JSON.stringify(getCompanySettings()));
      await api.post(`/invoices/upload-pdf/${officialInvoice.id}?sendEmail=${sendEmail}`, formData);
      toast.dismiss(loadId);
      toast.success(sendEmail ? t('invoiceApprovedAndSent') : t('invoiceApproved'));
      load();
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.response?.data?.message || t('error'));
    }
  };
  const executeLangAction = async (lang: 'en' | 'nl') => {
    if (invoiceLangModal.type === 'submit') {
      try {
        const pN = (v: string | number) => Number(String(v).replace(',', '.')) || 0;
        const dataToSubmit = {
          ...invoiceLangModal.data,
          tripId: invoiceLangModal.data.tripId === '' ? null : invoiceLangModal.data.tripId,
          amount: invoiceLangModal.data.amount === '' ? null : pN(invoiceLangModal.data.amount),
          fuelSurcharge: invoiceLangModal.data.fuelSurcharge === '' ? null : pN(invoiceLangModal.data.fuelSurcharge),
          extraCosts: invoiceLangModal.data.extraCosts === '' ? null : pN(invoiceLangModal.data.extraCosts),
          tollCosts: invoiceLangModal.data.tollCosts === '' ? null : pN(invoiceLangModal.data.tollCosts),
          vatPercent: invoiceLangModal.data.vatPercent === '' ? null : pN(invoiceLangModal.data.vatPercent),
          vatType: invoiceLangModal.data.vatType,
          issueDate: invoiceLangModal.data.issueDate === '' ? null : invoiceLangModal.data.issueDate,
          dueDate: invoiceLangModal.data.dueDate === '' ? null : invoiceLangModal.data.dueDate
        };
        let savedInvoice;
        if (editId) {
          const res = await api.patch(`/invoices/${editId}`, dataToSubmit);
          savedInvoice = res.data;
        } else {
          const res = await api.post('/invoices', dataToSubmit);
          savedInvoice = res.data;
        }
        const base64Pdf = await generateInvoicePdfBase64(savedInvoice, lang);
        const arr = base64Pdf.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const file = new File([u8arr], `Invoice_${savedInvoice.invoiceNumber}.pdf`, {
          type: mime
        });
        const formData = new FormData();
        formData.append('file', file);
        formData.append('company', JSON.stringify(getCompanySettings()));
        await api.post(`/invoices/upload-pdf/${savedInvoice.id}`, formData);
        if (editId) {
          toast.success(t('draftUpdated') || t('statusUpdated'));
        } else {
          toast.success(t('invoiceCreatedWithPdf'));
        }
        setShowForm(false);
        setEditId(null);
        load();
      } catch (err: any) {
        toast.error(t('error'));
      }
    } else if (invoiceLangModal.type === 'ensure') {
      const invoice = invoiceLangModal.data;
      const loadId = toast.loading(t('generatingPdf'));
      try {
        const base64Pdf = await generateInvoicePdfBase64(invoice, lang);
        const arr = base64Pdf.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const file = new File([u8arr], `Invoice_${invoice.invoiceNumber}.pdf`, {
          type: mime
        });
        const formData = new FormData();
        formData.append('file', file);
        formData.append('company', JSON.stringify(getCompanySettings()));
        const res = await api.post(`/invoices/upload-pdf/${invoice.id}`, formData);
        invoice.pdfUrl = res.data.pdfUrl;
        toast.dismiss(loadId);
        if (invoiceLangModal.cb) invoiceLangModal.cb(invoice);
        load();
      } catch (err: any) {
        toast.dismiss(loadId);
        toast.error(err?.response?.data?.message || err?.message || t('pdfGenerateError'));
      }
    }
  };
  const displayInvoices = embeddedClientId ? invoices.filter((inv: any) => inv.client?.id === embeddedClientId) : invoices;
  const filtered = displayInvoices.filter(i => matchesSearch(search, i.invoiceNumber, i.client?.name, i.status, i.notes, i.amount)).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  const currentTableItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  useShortcuts({
    'shift+n': () => {
      if (!showForm && !previewData && !invoiceLangModal.isOpen) {
        setForm({
          clientId: '',
          tripId: '',
          amount: '',
          fuelSurcharge: '',
          extraCosts: '',
          tollCosts: '',
          vatPercent: '19',
          vatType: 'NORMAL',
          issueDate: '',
          dueDate: '',
          notes: ''
        });
        setEditId(null);
        setShowForm(true);
      }
    },
    'ctrl+s': e => {
      if (showForm) {
        handleSubmit(e);
      }
    },
    'escape': () => {
      if (showForm) {
        setShowForm(false);
      } else if (previewData) {
        setPreviewData(null);
      }
    }
  });
  useTableShortcuts({
    items: currentTableItems,
    selectedIndex: selectedRowIndex,
    setSelectedIndex: setSelectedRowIndex,
    onOpen: inv => {
      if (inv.status === 'draft') handleEditClick(inv);else if (inv.pdfUrl) window.open(inv.pdfUrl, '_blank');
    },
    onDelete: inv => {
      if (inv.status === 'draft') setDeleteId(inv.id);
    },
    isActive: !showForm && !previewData && !invoiceLangModal.isOpen
  });
  const getInvTotals = (inv: any) => {
    let sub = Number(inv.subtotal) || 0;
    if (!sub) {
      const amt = Number(inv.amount) || 0;
      const fuel = Number(inv.fuelSurcharge) || 0;
      const fuelCost = fuel > 0 ? Number((amt * fuel / 100).toFixed(2)) : 0;
      const toll = Number(inv.tollCosts) || 0;
      const extra = Number(inv.extraCosts) || 0;
      sub = amt + fuelCost + toll + extra;
    }
    const vatP = Number(inv.vatPercent) || 19;
    const isVat = inv.vatType === 'NORMAL' || !inv.vatType;
    const vatAmt = Number(inv.vatAmount) || (isVat ? Number((sub * vatP / 100).toFixed(2)) : 0);
    const total = Number(inv.total) || sub + vatAmt;
    return {
      subtotal: sub,
      vatAmount: vatAmt,
      total
    };
  };
  const kpiPaid = displayInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + getInvTotals(i).total, 0);
  const kpiDue = displayInvoices.filter(i => ['sent', 'approved', 'overdue'].includes(i.status)).reduce((s, i) => s + getInvTotals(i).total, 0);
  const kpiOverdue = displayInvoices.filter(i => i.status === 'overdue').reduce((s, i) => s + getInvTotals(i).total, 0);
  const kpiDrafts = displayInvoices.filter(i => i.status === 'draft').length;
  const kpis = [
    { key: 'total', label: t('kpi_total', 'Total Emis'), value: fmtMoney(kpiPaid + kpiDue), icon: BarChart3 },
    { key: 'paid', label: t('kpi_paid', 'Încasat'), value: fmtMoney(kpiPaid), color: '#22c55e', icon: CheckCircle2 },
    { key: 'due', label: t('kpi_unpaid', 'De Încasat'), value: fmtMoney(kpiDue), color: '#6366f1', icon: Wallet },
    { key: 'overdue', label: t('kpi_overdue', 'Restanțe'), value: fmtMoney(kpiOverdue), color: '#ef4444', icon: AlertTriangle },
    { key: 'drafts', label: t('kpi_drafts', 'Ciorne'), value: kpiDrafts, color: '#f97316', icon: FileText },
  ];
  const statusOpts: SelectOption[] = [
    { value: 'draft', label: t('draft'), color: 'text-text-light' },
    { value: 'approved', label: t('approved') || 'Approved', color: 'text-indigo-600' },
    { value: 'sent', label: t('sent'), color: 'text-primary' },
    { value: 'paid', label: t('paid'), color: 'text-success' },
    { value: 'overdue', label: t('overdue'), color: 'text-error' },
    { value: 'cancelled', label: t('cancelled'), color: 'text-text-light' },
  ];
  const updateStatus = async (inv: any, val: string) => {
    try {
      await api.patch(`/invoices/${inv.id}`, { status: val });
      toast.success(t('statusUpdated'));
      load();
    } catch {
      toast.error(t('error'));
    }
  };
  const isOverdue = (inv: any) => inv.status === 'overdue' || (inv.dueDate && new Date(inv.dueDate) < new Date() && !['paid', 'cancelled', 'draft'].includes(inv.status));
  const columns: Column<any>[] = [
    {
      key: 'invoice', label: t('invoiceNo') + ' / ' + t('client'), width: '200px',
      render: (inv: any) => (
        <div className="leading-tight min-w-0">
          <div className="font-mono text-[13px] font-bold text-text-primary truncate" title={inv.invoiceNumber}>{inv.invoiceNumber}</div>
          <div className="text-[11px] text-text-secondary truncate max-w-[170px]" title={inv.client?.name || ''}>{inv.client?.name || '—'}</div>
        </div>
      ),
    },
    {
      key: 'value', label: t('valueVat', 'Valoare & TVA'), align: 'right', width: '180px',
      render: (inv: any) => {
        const totals = getInvTotals(inv);
        const vatLabel = inv.vatType === 'REVERSE_CHARGE' ? '0% (Taxare inv.)' : inv.vatType === 'EXEMPT' ? '0% (Scutit)' : `${inv.vatPercent}%`;
        return (
          <div className="text-right leading-tight whitespace-nowrap">
            <div className="text-[13px] font-bold text-success">{fmtMoney(totals.total)}</div>
            <div className="text-[11px] text-text-secondary">{t('net', 'Net')}: {fmtMoney(totals.subtotal)} • TVA: {vatLabel}</div>
          </div>
        );
      },
    },
    {
      key: 'dates', label: t('dates', 'Date'), width: '180px',
      render: (inv: any) => {
        const od = isOverdue(inv);
        return (
          <div className="leading-tight whitespace-nowrap">
            <div className="text-[11px] text-text-secondary">{t('issueDate')}: {formatDate(inv.issueDate)}</div>
            <div className={`text-xs font-bold ${od ? 'text-red-600 animate-pulse' : 'text-text-primary'}`}>{t('dueDate')}: {formatDate(inv.dueDate)}</div>
          </div>
        );
      },
    },
    {
      key: 'status', label: t('status'), width: '170px',
      render: (inv: any) => (
        <div onClick={e => e.stopPropagation()}>
          <CustomSelect className="w-36 text-xs" value={inv.status} onChange={val => updateStatus(inv, val)} options={statusOpts} />
        </div>
      ),
    },
    {
      key: 'actions', label: t('actions'), align: 'right', sticky: 'right', width: '140px',
      render: (inv: any) => inv.status === 'draft' ? (
        <div className="flex items-center justify-end gap-0.5">
          <button onClick={() => handlePreviewDraft(inv)} className="p-1 text-text-secondary hover:text-primary rounded-lg hover:bg-surface transition-colors" title={t('previewDraft', 'Vizualizare Draft')}><Eye className="w-3.5 h-3.5" /></button>
          <button onClick={() => handleEditClick(inv)} className="p-1 text-text-secondary hover:text-primary rounded-lg hover:bg-surface transition-colors" title={t('edit', 'Edit')}><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={() => handleApprove(inv, false)} className="p-1 text-text-secondary hover:text-success rounded-lg hover:bg-green-50 transition-colors" title={t('approve', 'Aprobă')}><CheckCircle2 className="w-3.5 h-3.5" /></button>
          <button onClick={() => setDeleteId(inv.id)} className="p-1 text-text-secondary hover:text-error rounded-lg hover:bg-red-50 transition-colors" title={t('delete', 'Șterge')}><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      ) : (
        <div className="flex items-center justify-end gap-0.5">
          <button onClick={() => ensurePdfAndExecute(inv, handlePreview)} className="p-1 text-text-secondary hover:text-primary rounded-lg hover:bg-surface transition-colors" title="Previzualizare PDF"><Eye className="w-3.5 h-3.5" /></button>
          <button onClick={() => ensurePdfAndExecute(inv, handleDownload)} className="p-1 text-text-secondary hover:text-success rounded-lg hover:bg-green-50 transition-colors" title="Descărcare PDF"><Download className="w-3.5 h-3.5" /></button>
          <button onClick={() => ensurePdfAndExecute(inv, handleShare)} className="p-1 text-text-secondary hover:text-warning rounded-lg hover:bg-yellow-50 transition-colors" title="Partajare"><Share2 className="w-3.5 h-3.5" /></button>
          <button onClick={() => ensurePdfAndExecute(inv, handleSendEmail)} className="p-1 text-text-secondary hover:text-primary rounded-lg hover:bg-surface transition-colors" title={t('sendEmailAction') || 'Trimite Email'}><Mail className="w-3.5 h-3.5" /></button>
          <button onClick={() => setDeleteId(inv.id)} className="p-1 text-text-secondary hover:text-error rounded-lg hover:bg-red-50 transition-colors" title={t('delete', 'Șterge')}><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      ),
    },
  ];
  return <div className="space-y-4 animate-fade-in">
      <KpiStrip dense items={kpis} />
      {showForm && typeof document !== 'undefined' && createPortal(<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-[90rem] w-full h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center bg-surface shrink-0">
              <h3 className="font-bold text-xl text-primary">{editId ? t('editDraft', 'Editare Draft / Detalii Complete') : t('newInvoice')}</h3>
              <button type="button" onClick={() => {
            setShowForm(false);
            setEditId(null);
          }} className="text-text-secondary hover:text-red-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
              <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-y-auto border-r border-border">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">{t('client')}</label>
                  <CustomSelect value={form.clientId} onChange={val => setForm({
                ...form,
                clientId: val
              })} placeholder={t('selectClient')} options={clients.map((c: any) => ({
                value: c.id,
                label: c.name
              }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">{t('trip')}{t("jsx_Optional")}</label>
                  <CustomSelect value={form.tripId} onChange={val => {
                const trip = trips.find((t: any) => t.id === val);
                if (trip) {
                  setForm({
                    ...form,
                    tripId: val,
                    amount: String(trip.price ?? trip.agreedPrice ?? ''),
                    fuelSurcharge: String(trip.fuelSurchargePercent ?? trip.fuelSurcharge ?? ''),
                    extraCosts: String(trip.extraCosts ?? ''),
                    tollCosts: String(trip.clientRate?.tollIncluded ? '0' : trip.tollCosts ?? '')
                  });
                } else {
                  setForm({
                    ...form,
                    tripId: val,
                    amount: '',
                    fuelSurcharge: '',
                    extraCosts: '',
                    tollCosts: ''
                  });
                }
              }} placeholder={t('noTrip')} options={[{
                value: '',
                label: t('noTrip')
              }, ...filteredTrips.map((t: any) => ({
                value: t.id,
                label: t.referenceNumber || `REF-${t.id.slice(0, 8).toUpperCase()}`
              }))]} />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">{t('amount')} (€)</label>
                  <input type="number" className="input py-3 text-lg font-bold" value={form.amount} onChange={e => setForm({
                ...form,
                amount: e.target.value
              })} required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">{t('fuelSurcharge')}</label>
                  <input type="number" className="input py-3 text-lg font-bold text-orange-600" value={form.fuelSurcharge} onChange={e => setForm({
                ...form,
                fuelSurcharge: e.target.value
              })} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">{t('extraCosts', 'Extra Costs')} (€)</label>
                  <input type="number" className="input py-3 text-lg font-bold text-blue-600" value={form.extraCosts} onChange={e => setForm({
                ...form,
                extraCosts: e.target.value
              })} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">{t('tollCosts', 'Toll Costs')} (€)</label>
                  <input type="number" className="input py-3 text-lg font-bold text-teal-600" value={form.tollCosts} onChange={e => setForm({
                ...form,
                tollCosts: e.target.value
              })} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">{t('vatType')}</label>
                  <CustomSelect value={form.vatType} onChange={v => setForm((f: any) => ({
                ...f,
                vatType: v,
                vatPercent: v !== 'NORMAL' ? '0' : '19'
              }))} options={[{
                value: 'NORMAL',
                label: t('vatNormal')
              }, {
                value: 'REVERSE_CHARGE',
                label: t('vatReverseCharge')
              }, {
                value: 'EXEMPT',
                label: t('vatExempt')
              }]} />
                </div>
                {form.vatType === 'NORMAL' && <div className="space-y-1">
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">{t('tvaPercent')}</label>
                    <input type="number" className="input py-3 text-lg font-bold" value={form.vatPercent} onChange={e => setForm({
                ...form,
                vatPercent: e.target.value
              })} required />
                  </div>}
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">{t('issueDate')}</label>
                  <Flatpickr type="hidden" value={form.issueDate} onChange={(_dates, dateStr) => setForm({
                ...form,
                issueDate: dateStr
              })} onClick={e => {
                e.stopPropagation();
                const fp = (e.target as any)._flatpickr;
                if (fp) fp.open();
              }} onFocus={e => {
                const fp = (e.target as any)._flatpickr;
                if (fp) fp.open();
              }} className={`input py-3 bg-card ${isPastDate(form.issueDate) ? 'border-red-500 text-red-600 bg-red-50/20' : ''}`} options={fpOptions} placeholder="DD/MM/YYYY" />
                  {isPastDate(form.issueDate) && <span className="text-xs text-red-600 font-semibold mt-1 block">⚠️ {getErrorMessage()}</span>}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">{t('dueDate')}</label>
                  <Flatpickr type="hidden" value={form.dueDate} onChange={(_dates, dateStr) => setForm({
                ...form,
                dueDate: dateStr
              })} onClick={e => {
                e.stopPropagation();
                const fp = (e.target as any)._flatpickr;
                if (fp) fp.open();
              }} onFocus={e => {
                const fp = (e.target as any)._flatpickr;
                if (fp) fp.open();
              }} className={`input py-3 bg-card ${isPastDate(form.dueDate) ? 'border-red-500 text-red-600 bg-red-50/20' : ''}`} options={fpOptions} placeholder="DD/MM/YYYY" />
                  {isPastDate(form.dueDate) && <span className="text-xs text-red-600 font-semibold mt-1 block">⚠️ {getErrorMessage()}</span>}
                </div>
                
                <div className="space-y-1 md:col-span-2 mt-2">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">{t('notes')}</label>
                  <textarea className="input py-3 text-sm min-h-[80px]" placeholder={t('notesPlaceholder')} value={form.notes} onChange={e => setForm({
                ...form,
                notes: e.target.value
              })} />
                </div>
                
                <div className="md:col-span-2 pt-6 border-t border-border mt-2 flex items-center justify-end gap-3 sticky bottom-0 bg-card">
                  <button type="button" onClick={() => {
                setShowForm(false);
                setEditId(null);
              }} className="btn-secondary px-6 py-3 font-bold text-sm">
                    {t('cancel')}
                  </button>
                  <button type="submit" className="btn-primary px-8 py-3 font-bold text-sm shadow-lg shadow-primary/30">
                    {t('saveDraft') || 'Save Draft'}
                  </button>
                </div>
              </form>

              <div className="flex-1 bg-surface flex flex-col p-6 hidden md:flex">
                <h4 className="text-sm font-bold text-text-secondary uppercase mb-3 flex items-center gap-2"><Eye className="w-4 h-4" />{t("jsx_livePreview")}</h4>
                {previewData ? <iframe src={previewData} className="w-full h-full rounded-xl border border-border shadow-sm bg-card" /> : <div className="w-full h-full flex flex-col items-center justify-center text-text-secondary bg-card rounded-xl border border-border">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                    {t('generatingPdf')}...
                  </div>}
              </div>
            </div>
          </div>
        </div>, document.body)}
      {showAging && (
        <div className="card p-5 bg-card border border-border rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="font-bold text-lg text-primary flex items-center gap-2"><BarChart3 className="w-5 h-5" /> {t('agingTitle')}</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowAging(false)} className="btn-secondary py-1.5 px-3 text-xs font-semibold">{t('close')}</button>
              <button onClick={sendReminders} disabled={reminderBusy} className="btn-primary py-1.5 px-3 text-xs font-semibold flex items-center gap-2"><Send className="w-3.5 h-3.5" /> {t('agingSendReminders')}</button>
            </div>
          </div>
          {agingLoading ? (
            <div className="flex items-center justify-center py-8 text-text-secondary text-sm">{t('loading')}...</div>
          ) : aging ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <div className="col-span-2 md:col-span-1 p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <div className="text-xs font-bold uppercase text-text-secondary">{t('agingTotal')}</div>
                  <div className="text-xl font-bold text-primary mt-1">{fmtMoney(aging.totalReceivable)}</div>
                </div>
                {aging.buckets.map((b: any) => (
                  <div key={b.label} className={'p-4 rounded-xl border ' + (b.label === 'current' ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700' : b.label === '1-30' ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700' : b.label === '31-60' ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-700' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700')}>
                    <div className="text-xs font-bold uppercase text-text-secondary">{t('agingBucket' + b.label)}</div>
                    <div className="text-lg font-bold mt-1">{fmtMoney(b.amount)}</div>
                    <div className="text-xs text-text-secondary">{b.count} {t('agingInvoices')}</div>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead><tr className="bg-surface border-b border-border">
                    <th className="table-header">{t('client')}</th>
                    <th className="table-header">{t('agingTotal')}</th>
                    <th className="table-header">{t('agingDays')}</th>
                    <th className="table-header">{t('agingInvoices')}</th>
                  </tr></thead>
                  <tbody>
                    {aging.byClient.map((c: any) => (
                      <tr key={c.id} className="border-b border-border hover:bg-surface/60">
                        <td className="p-3">{c.name} {c.email ? '(' + c.email + ')' : ''}</td>
                        <td className="p-3 font-semibold">{fmtMoney(c.total)}</td>
                        <td className="p-3 text-orange-600 font-semibold">{c.maxDays > 0 ? c.maxDays + ' ' + t('agingDays') : t('agingBucketcurrent')}</td>
                        <td className="p-3">{c.invoices.length}</td>
                      </tr>
                    ))}
                    {aging.byClient.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-text-secondary">{t('noResults')}</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      )}


      <div className="card p-0 overflow-hidden bg-card border border-border rounded-2xl shadow-sm">
        <div className="px-2.5 py-2 border-b border-border flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-1 min-w-[260px]">
            <div className="relative w-[220px] shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
              <input className="input pl-8 pr-3 py-1.5 text-xs w-full" placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button onClick={() => setShowExport(true)} className="btn-secondary px-2 py-1.5 flex items-center text-xs font-semibold border-primary/20 hover:border-primary/50 text-primary transition-all" title={t('export')}>
              <Download className="w-3.5 h-3.5" />
            </button>
            <button onClick={loadAging} className="btn-secondary px-2 py-1.5 flex items-center text-xs font-semibold border-primary/20 hover:border-primary/50 text-primary transition-all" title={t('agingTitle')}>
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-semibold text-text-secondary whitespace-nowrap">{filtered.length} {t('results')}</span>
            <button onClick={() => {
            setEditId(null);
            setForm({
              clientId: '',
              tripId: '',
              amount: '',
              fuelSurcharge: '',
              extraCosts: '',
              tollCosts: '',
              vatPercent: '19',
              vatType: 'NORMAL',
              issueDate: '',
              dueDate: '',
              notes: ''
            });
            setShowForm(!showForm);
          }} className="btn-primary px-2.5 py-1.5 flex items-center gap-1.5 text-xs font-semibold">
              <Plus className="w-3.5 h-3.5" /> {t('newInvoice')}
            </button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={currentTableItems}
          rowKey={(inv: any) => inv.id}
          minWidth="920px"
          loading={loading}
          dense
          onRowClick={(inv: any) => {
            if (inv.status === 'draft') handleEditClick(inv); else if (inv.pdfUrl) window.open(inv.pdfUrl, '_blank');
          }}
          highlightRow={(inv: any) => inv.status === 'overdue' ? 'bg-red-50/50 dark:bg-red-950/20' : ''}
          emptyState={
            <div className="p-16 text-center">
              <BarChart3 className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-40" />
              <h3 className="text-lg font-bold text-text-primary mb-1">{t('noData')}</h3>
              <p className="text-text-secondary">{t('noResult') || 'No invoices found.'}</p>
            </div>
          }
        />
        <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
      </div>

      <ExportModal isOpen={showExport} onClose={() => setShowExport(false)} data={filtered} filename="Invoices_HapCargo" title="Invoices" sheetName="Invoices" getDateField={item => item.issueDate || item.createdAt} headers={[{
      key: 'createdAt',
      label: 'Registration Date',
      transform: val => val ? formatDate(val) : ''
    }, {
      key: 'invoiceNumber',
      label: 'Invoice Number'
    }, {
      key: 'client',
      label: 'Client Name',
      transform: val => val?.name || ''
    }, {
      key: 'amount',
      label: 'Subtotal Excl. VAT (€)',
      transform: (_val, item) => Number(getInvTotals(item).subtotal.toFixed(2))
    }, {
      key: 'vatPercent',
      label: 'VAT (%)',
      transform: (val, item) => item?.vatType === 'REVERSE_CHARGE' ? 'Reverse Charge (0%)' : item?.vatType === 'EXEMPT' ? 'Exempt (0%)' : `${val || 19}%`
    }, {
      key: 'total',
      label: 'Total Incl. VAT (€)',
      transform: (_val, item) => Number(getInvTotals(item).total.toFixed(2))
    }, {
      key: 'issueDate',
      label: 'Issue Date',
      transform: val => val ? formatDate(val) : ''
    }, {
      key: 'dueDate',
      label: 'Due Date',
      transform: val => val ? formatDate(val) : ''
    }, {
      key: 'status',
      label: 'Status'
    }]} />

      {invoiceLangModal.isOpen && typeof document !== 'undefined' && createPortal(<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card p-6 rounded-2xl shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-xl font-bold mb-2">{t('invoiceLanguageTitle') || 'Invoice Language'}</h3>
            <p className="text-sm text-text-secondary mb-6">{t('invoiceLanguageSub') || 'Choose the language for the generated PDF'}</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => {
            setInvoiceLangModal({
              isOpen: false,
              data: null,
              type: '',
              cb: null
            });
            executeLangAction('en');
          }} className="w-full py-3 px-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors flex items-center justify-center gap-2">
                {t('generateEn') || 'English (EN)'}
              </button>
              <button onClick={() => {
            setInvoiceLangModal({
              isOpen: false,
              data: null,
              type: '',
              cb: null
            });
            executeLangAction('nl');
          }} className="w-full py-3 px-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors flex items-center justify-center gap-2">
                {t('generateNl') || 'Dutch (NL)'}
              </button>
              <button onClick={() => setInvoiceLangModal({
            isOpen: false,
            data: null,
            type: '',
            cb: null
          })} className="w-full py-2 px-4 mt-2 text-text-secondary hover:text-text font-medium transition-colors">
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>, document.body)}

      <ConfirmModal isOpen={!!deleteId} onConfirm={executeDelete} onCancel={() => setDeleteId(null)} type="danger" />
    </div>;
}

