import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { Plus, Trash2, Edit2, Upload, FileText, Loader2, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

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

  const [form, setForm] = useState({
    amount: '',
    currency: 'EUR',
    category: 'other',
    description: '',
    date: new Date().toISOString().slice(0, 10),
    receiptUrl: '',
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
    setForm({ amount: '', currency: 'EUR', category: 'other', description: '', date: new Date().toISOString().slice(0, 10), receiptUrl: '' });
    setAiSuccess(false);
    setShowForm(false);
    setEditId(null);
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

      const { fileUrl, parsedData } = res.data;

      setForm(prev => {
        const newData = { ...prev, receiptUrl: fileUrl };
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

    } catch {
      toast.error(t('aiScanError'), { id: toastId });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const getCategoryLabel = (val: string) => {
    const cat = CATEGORIES.find(c => c.value === val);
    return cat ? t(cat.labelKey) : val;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-text mb-1">{t('expensesTitle')}</h1>
          <p className="text-text-secondary text-sm">{t('expensesSubtitle')}</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {t('addExpense')}
        </button>
      </div>

      {showForm && (
        <div className="card animate-fade-in bg-white border border-border rounded-2xl p-6 shadow-md relative overflow-hidden">
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
                  ? 'opacity-50 cursor-not-allowed border-gray-200 text-gray-400'
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
            <div>
              <label className="label font-semibold text-xs">{t('expenseAmount')}</label>
              <div className="relative">
                <input type="number" step="0.01" className="input pr-16" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required />
                <select className="absolute right-0 top-0 bottom-0 bg-transparent border-l border-border px-2 text-sm font-bold text-text-secondary focus:outline-none rounded-r-xl" value={form.currency} onChange={e => setForm({...form, currency: e.target.value})}>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="RON">RON</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label font-semibold text-xs">{t('expenseCategory')}</label>
              <select className="input" value={form.category} onChange={e => setForm({...form, category: e.target.value})} required>
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{t(cat.labelKey)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label font-semibold text-xs">{t('expenseDate')}</label>
              <input type="date" className="input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
            </div>

            <div className="lg:col-span-3">
              <label className="label font-semibold text-xs">{t('expenseDescription')}</label>
              <input type="text" className="input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Ex: Motorină, Servicii contabile mai..." required />
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

      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
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
              ) : expenses.map(exp => (
                <tr key={exp.id} className="hover:bg-surface/60 transition-colors border-b border-border/50 last:border-0">
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
      </div>
    </div>
  );
}
