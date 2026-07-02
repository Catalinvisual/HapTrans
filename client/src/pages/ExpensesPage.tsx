import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { Plus, Trash2, Edit2, Upload, FileText, Loader2, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import CustomSelect from '../components/CustomSelect';
import Pagination from '../components/Pagination';
import { useShortcuts } from '../hooks/useShortcuts';
import { useTableShortcuts } from '../hooks/useTableShortcuts';

const CATEGORIES = [
  { value: 'fuel',        labelKey: 'cat_fuel' },
  { value: 'maintenance', labelKey: 'cat_maintenance' },
  { value: 'accounting',  labelKey: 'cat_accounting' },
  { value: 'salary',      labelKey: 'cat_salary' },
  { value: 'toll',        labelKey: 'cat_toll' },
  { value: 'other',       labelKey: 'cat_other' },
];

export default function ExpensesPage() {
  const { t } = useTranslation();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedRowIndex, setSelectedRowIndex] = useState(-1);

  const [form, setForm] = useState<any>({
    amount: '',
    currency: 'EUR',
    category: 'other',
    description: '',
    date: new Date().toISOString().slice(0, 10),
    receiptUrl: '',
    publicId: '',
    resourceType: '',
    cloudinaryType: '',
    format: '',
    originalFilename: '',
  });

  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuccess, setAiSuccess] = useState(false);

  useEffect(() => { load() }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/expenses');
      setExpenses(res.data);
    } catch {
      toast.error(t('expenseLoadError'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ amount: '', currency: 'EUR', category: 'other', description: '', date: new Date().toISOString().slice(0, 10), receiptUrl: '', publicId: '', resourceType: '', cloudinaryType: '', format: '', originalFilename: '' });
    setEditId(null);
    setShowForm(false);
    setAiSuccess(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setAiLoading(true);
    setAiSuccess(false);
    const toastId = toast.loading(t('scannerTitle'));
    try {
      const res = await api.post('/expenses/upload-and-parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { fileUrl, cloudinaryMetadata, parsedData } = res.data;

      setForm(prev => {
        const newData = { 
          ...prev, 
          receiptUrl: fileUrl,
          ...(cloudinaryMetadata || {})
        };
        if (parsedData) {
          if (parsedData.amount) newData.amount = parsedData.amount.toString();
          if (parsedData.currency) newData.currency = parsedData.currency.toUpperCase();
          if (parsedData.description) newData.description = parsedData.description;
          if (parsedData.date) newData.date = parsedData.date;
          toast.success(t('aiScanExtracted'), { id: toastId });
          setAiSuccess(true);
        } else {
          toast.success(t('aiScanFailed'), { id: toastId });
        }
        return newData;
      });

    } catch (err) {
      toast.error(t('aiScanError'), { id: toastId });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      const data = { ...form, amount: Number(form.amount) || 0 };
      if (editId) {
        await api.patch(`/expenses/${editId}`, data);
      } else {
        await api.post('/expenses', data);
      }
      toast.success(t('expenseSaved'));
      resetForm();
      load();
    } catch {
      toast.error(t('saveError') || 'Eroare la salvare');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('confirmDelete') || 'Sigur ștergi?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      toast.success(t('expenseDeleted'));
      load();
    } catch {
      toast.error(t('saveError') || 'Eroare la stergere');
    }
  };

  const handleEdit = (exp: any) => {
    setForm({ amount: exp.amount.toString(), currency: exp.currency, category: exp.category, description: exp.description || '', date: exp.date?.slice(0, 10) || '', receiptUrl: exp.receiptUrl || '' });
    setEditId(exp.id);
    setShowForm(true);
  };

  const getCategoryLabel = (val: string) => {
    const cat = CATEGORIES.find(c => c.value === val);
    return cat ? t(cat.labelKey) : val;
  };

  const currentTableItems = expenses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useShortcuts({
    'shift+n': () => {
      if (!showForm) {
        setForm({ date: new Date().toISOString().split('T')[0], category: 'fuel', amount: '', currency: 'EUR', description: '', receiptUrl: '' });
        setEditId(null);
        setShowForm(true);
      }
    },
    'ctrl+s': (e) => {
      if (showForm) handleSubmit(e);
    },
    'escape': () => {
      if (showForm) resetForm();
    }
  });

  useTableShortcuts({
    items: currentTableItems,
    selectedIndex: selectedRowIndex,
    setSelectedIndex: setSelectedRowIndex,
    onOpen: (exp) => handleEdit(exp),
    onDelete: (exp) => handleDelete(exp.id),
    isActive: !showForm
  });

  return (
    <div className="space-y-5 animate-fade-in">

      {showForm && (
        <div className="card animate-fade-in bg-card border border-border rounded-2xl p-6 shadow-md relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary" />
          <h3 className="text-lg font-bold text-text mb-5 text-primary border-b border-border pb-3">
            {editId ? t('save') : t('addExpense')}
          </h3>

          {/* AI Scanner Banner */}
          <div className={`mb-6 rounded-xl border-2 p-4 transition-all duration-500 ${
            aiSuccess ? 'bg-green-50 border-green-300' : 'bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
                  aiSuccess ? 'bg-green-500' : 'bg-gradient-to-br from-primary to-secondary'
                }`}>
                  {aiLoading
                    ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                    : aiSuccess
                      ? <CheckCircle2 className="w-5 h-5 text-white" />
                      : <FileText className="w-5 h-5 text-white" />
                  }
                </div>
                <div>
                  <p className="font-bold text-sm text-text">
                    {aiSuccess ? t('scannerSuccessTitle') : t('aiScanTitle')}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {aiSuccess ? t('scannerSuccessSubtitle') : t('aiScanDesc')}
                  </p>
                </div>
              </div>
              <label className={`cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                aiLoading
                  ? 'opacity-50 cursor-not-allowed border-border text-text-light'
                  : aiSuccess
                    ? 'border-green-400 text-green-700 hover:bg-green-100'
                    : 'border-primary/40 text-primary hover:bg-primary/10'
              }`}>
                <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileUpload} disabled={aiLoading} />
                <Upload className="w-4 h-4" />
                {aiLoading ? t('scannerProcessing') : aiSuccess ? t('scannerRescan') : t('aiScanUpload')}
              </label>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label font-semibold text-xs">{t('expenseAmount')}</label>
                <input type="number" step="0.01" className="input" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required />
              </div>
              <div>
                <label className="label font-semibold text-xs">Currency</label>
                <CustomSelect 
                  value={form.currency} 
                  onChange={val => setForm({...form, currency: val})}
                  options={[
                    { value: 'EUR', label: 'EUR' },
                    { value: 'USD', label: 'USD' },
                    { value: 'RON', label: 'RON' },
                    { value: 'GBP', label: 'GBP' }
                  ]}
                />
              </div>
            </div>

            <div>
              <label className="label font-semibold text-xs">{t('expenseCategory')}</label>
              <CustomSelect 
                value={form.category} 
                onChange={val => setForm({...form, category: val})}
                options={CATEGORIES.map(cat => ({ value: cat.value, label: t(cat.labelKey) }))}
              />
            </div>

            <div>
              <label className="label font-semibold text-xs">{t('expenseDate')}</label>
              <input type="date" className="input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
            </div>

            <div className="lg:col-span-3">
              <label className="label font-semibold text-xs">{t('expenseDescription')}</label>
              <input type="text" className="input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="e.g. Fuel, Accounting services etc..." required />
            </div>

            {form.receiptUrl && (
              <div className="lg:col-span-3 flex items-center gap-2 text-sm text-primary">
                <ImageIcon className="w-4 h-4" />
                <a href={form.receiptUrl} target="_blank" rel="noreferrer" className="hover:underline">{t('viewAttached')}</a>
              </div>
            )}

            <div className="lg:col-span-3 flex justify-end gap-3 mt-2">
              <button type="button" onClick={resetForm} className="btn-secondary">
                {t('cancel')}
              </button>
              <button type="submit" className="btn-primary" disabled={aiLoading}>
                {t('save')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card p-0 overflow-hidden bg-card border border-border rounded-2xl shadow-sm">
        <div className="p-4 border-b border-border flex items-center justify-end">
          <button onClick={() => { setShowForm(!showForm); setEditId(null); }} className="btn-primary flex items-center gap-2 text-sm font-semibold py-2 px-4">
            <Plus className="w-4 h-4" />
            {t('addExpense')}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface border-b border-border">
                <th className="table-header">{t('expenseDate')}</th>
                <th className="table-header">{t('expenseCategory')}</th>
                <th className="table-header">{t('expenseDescription')}</th>
                <th className="table-header">{t('expenseAmount')}</th>
                <th className="table-header">{t('expenseDocument')}</th>
                <th className="table-header">{t('expenseActions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="table-cell text-center py-10 text-text-secondary">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={6} className="table-cell text-center py-10 text-text-secondary">{t('noExpenses')}</td></tr>
              ) : currentTableItems.map((exp: any, idx: number) => (
                <tr key={exp.id} 
                    className={`hover:bg-surface/60 transition-colors border-b border-border/50 last:border-0 cursor-pointer ${selectedRowIndex === idx ? 'bg-primary/5 ring-1 ring-inset ring-primary' : ''}`}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('button, select, input, a, .interactive-click')) return;
                      handleEdit(exp);
                    }}>
                  <td className="table-cell text-text-secondary font-medium">
                    {new Date(exp.date).toLocaleDateString()}
                  </td>
                  <td className="table-cell">
                    <span className="badge badge-gray text-xs uppercase font-bold">{getCategoryLabel(exp.category)}</span>
                  </td>
                  <td className="table-cell font-medium text-text">{exp.description}</td>
                  <td className="table-cell font-bold text-error">
                    -{Number(exp.amount).toFixed(2)} {exp.currency}
                  </td>
                  <td className="table-cell">
                    {exp.receiptUrl ? (
                      <a href={exp.receiptUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1 text-sm">
                        <FileText className="w-4 h-4" /> {t('viewAttached')}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button onClick={() => {
                        setForm({ amount: exp.amount.toString(), currency: exp.currency, category: exp.category, description: exp.description || '', date: exp.date?.slice(0, 10) || '', receiptUrl: exp.receiptUrl || '' });
                        setEditId(exp.id); setShowForm(true);
                      }} className="p-1.5 text-text-secondary hover:text-primary rounded-lg hover:bg-primary-light transition-all">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(exp.id)} className="p-1.5 text-text-secondary hover:text-error rounded-lg hover:bg-red-50 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={expenses.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>
    </div>
  );
}
