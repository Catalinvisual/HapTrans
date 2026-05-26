import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { Plus, Trash2, Edit2, Upload, FileText, Loader2, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

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

  useEffect(() => { load() }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/expenses');
      setExpenses(res.data);
    } catch {
      toast.error(t('loadError') || 'Eroare la incarcare');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setAiLoading(true);
    const toastId = toast.loading('Încărcare și procesare cu AI...');
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
          toast.success('✨ Date extrase automat din document!', { id: toastId });
        } else {
          toast.success('Document încărcat, dar nu am putut extrage date.', { id: toastId });
        }
        return newData;
      });
      
    } catch (err: any) {
      toast.error('Eroare la încărcare document.', { id: toastId });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...form,
        amount: Number(form.amount) || 0,
      };

      if (editId) {
        await api.patch(`/expenses/${editId}`, data);
        toast.success(t('saveSuccess') || 'Salvat!');
      } else {
        await api.post('/expenses', data);
        toast.success(t('saveSuccess') || 'Adăugat!');
      }
      setShowForm(false);
      setEditId(null);
      setForm({ amount: '', currency: 'EUR', category: 'other', description: '', date: new Date().toISOString().slice(0, 10), receiptUrl: '' });
      load();
    } catch {
      toast.error(t('saveError') || 'Eroare la salvare');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('confirm') || 'Sigur ștergi?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      toast.success(t('deleteSuccess') || 'Șters!');
      load();
    } catch {
      toast.error(t('saveError') || 'Eroare la stergere');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-text mb-2">Company Expenses</h1>
          <p className="text-text-secondary">Manage company operational costs</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus className="w-5 h-5 mr-2" />
          Add Expense
        </button>
      </div>

      {showForm && (
        <div className="bg-surface rounded-2xl p-6 border border-border shadow-sm mb-6 animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary" />
          <h3 className="text-xl font-bold text-text mb-6">
            {editId ? 'Edit Expense' : 'New Expense'}
          </h3>

          <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-xl">
            <h4 className="font-bold text-primary mb-2 flex items-center gap-2">
              <FileText className="w-5 h-5" /> 
              Smart AI Scanner
            </h4>
            <p className="text-sm text-text-secondary mb-4">
              Încarcă o poză cu bonul sau factura, iar AI-ul nostru va extrage automat suma și descrierea!
            </p>
            <div className="flex items-center gap-4">
              <label className="btn-secondary cursor-pointer relative overflow-hidden group">
                <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileUpload} disabled={aiLoading} />
                <span className="flex items-center">
                  {aiLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin text-primary" /> : <Upload className="w-5 h-5 mr-2 group-hover:-translate-y-1 transition-transform" />}
                  {aiLoading ? 'Se procesează AI...' : 'Upload Document'}
                </span>
              </label>
              {form.receiptUrl && (
                <a href={form.receiptUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                  <ImageIcon className="w-4 h-4" /> View attached
                </a>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-semibold text-text-secondary mb-1">Amount</label>
              <div className="relative">
                <input type="number" step="0.01" className="input pr-16" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required />
                <select className="absolute right-0 top-0 bottom-0 bg-transparent border-l border-border px-2 text-sm font-bold text-text-secondary focus:outline-none" value={form.currency} onChange={e => setForm({...form, currency: e.target.value})}>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="RON">RON</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-text-secondary mb-1">Category</label>
              <select className="input" value={form.category} onChange={e => setForm({...form, category: e.target.value})} required>
                <option value="fuel">Combustibil</option>
                <option value="maintenance">Piese / Service</option>
                <option value="accounting">Contabilitate</option>
                <option value="salary">Salarii (Admin/Birou)</option>
                <option value="toll">Taxe Drum</option>
                <option value="other">Altele</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-text-secondary mb-1">Date</label>
              <input type="date" className="input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
            </div>

            <div className="lg:col-span-3">
              <label className="block text-sm font-semibold text-text-secondary mb-1">Description / Services</label>
              <input type="text" className="input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Ex: Motorină, Servicii contabile luma Mai..." required />
            </div>

            <div className="lg:col-span-3 flex justify-end gap-3 mt-2">
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="btn-secondary">
                {t('cancel') || 'Cancel'}
              </button>
              <button type="submit" className="btn-primary" disabled={aiLoading}>
                {t('save') || 'Save Expense'}
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
                <th className="table-header">Date</th>
                <th className="table-header">Category</th>
                <th className="table-header">Description</th>
                <th className="table-header">Amount</th>
                <th className="table-header">Document</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="table-cell text-center py-8 text-text-secondary">Loading...</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={6} className="table-cell text-center py-8 text-text-secondary">No expenses found</td></tr>
              ) : expenses.map(exp => (
                <tr key={exp.id} className="hover:bg-surface/60 transition-colors">
                  <td className="table-cell text-text-secondary font-medium">
                    {new Date(exp.date).toLocaleDateString()}
                  </td>
                  <td className="table-cell uppercase text-xs font-bold text-text opacity-70">
                    {exp.category}
                  </td>
                  <td className="table-cell font-medium text-text">
                    {exp.description}
                  </td>
                  <td className="table-cell font-bold text-error">
                    -{Number(exp.amount).toFixed(2)} {exp.currency}
                  </td>
                  <td className="table-cell">
                    {exp.receiptUrl ? (
                      <a href={exp.receiptUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1 text-sm">
                        <FileText className="w-4 h-4" /> View
                      </a>
                    ) : '-'}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { 
                        setForm({ amount: exp.amount.toString(), currency: exp.currency, category: exp.category, description: exp.description || '', date: exp.date.split('T')[0], receiptUrl: exp.receiptUrl || '' }); 
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
