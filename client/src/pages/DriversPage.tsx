import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, AlertCircle, Plus, Pencil, Trash2, ChevronDown, User, Phone, FileText, Calendar, Key, Mail, Download } from 'lucide-react';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import api from '../lib/api';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';
import ExportModal from '../components/ExportModal';
import { formatDate } from '../lib/dateUtils';

import CustomSelect from '../components/CustomSelect';

const STATUS_COLORS: Record<string, string> = {
  available: 'text-success',
  in_trip: 'text-primary',
  off: 'text-gray-500',
  sick: 'text-error',
  vacation: 'text-warning',
};

const STATUS_LABELS: Record<string, string> = {
  available: 'available',
  in_trip: 'inTrip',
  off: 'unavailable',
  sick: 'sick',
  vacation: 'vacation',
};

export default function DriversPage() {
  const { t, i18n } = useTranslation();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);

  // Form State
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    licenseNumber: '',
    dailyRate: '',
    grossSalary: '',
    licenseExpiry: '',
    medicalExpiry: '',
    tachoCardExpiry: '',
    status: 'available',
  });

  const loadDrivers = async () => {
    setLoading(true);
    try {
      const r = await api.get('/drivers');
      setDrivers(r.data);
    } catch (err) {
      toast.error('Eroare la încărcarea șoferilor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrivers();
  }, []);

  const isExpiringSoon = (date: string) => date && new Date(date) < new Date(Date.now() + 30 * 86400000);
  const isExpired = (date: string) => date && new Date(date) < new Date();

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm({ ...form, password: pass });
    toast.success(t('passwordGenerated'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) {
        // Edit driver
        await api.patch(`/drivers/${editId}`, form);
        toast.success('Șofer actualizat cu succes!');
      } else {
        // Add driver
        if (!form.email || !form.password) {
          toast.error('Emailul și parola sunt obligatorii pentru șoferi noi!');
          return;
        }
        await api.post('/drivers', form);
        toast.success('Șofer creat cu succes!');
      }
      setShowForm(false);
      setEditId(null);
      setForm({
        name: '', email: '', password: '', phone: '',
        licenseNumber: '', dailyRate: '', grossSalary: '', licenseExpiry: '', medicalExpiry: '', tachoCardExpiry: '',
        status: 'available',
      });
      loadDrivers();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Eroare la salvare.';
      toast.error(msg);
    }
  };

  const handleEdit = (d: any) => {
    setForm({
      name: d.user?.name || '',
      email: d.user?.email || '',
      password: '', // Leave blank unless changing
      phone: d.phone || '',
      licenseNumber: d.licenseNumber || '',
      dailyRate: d.dailyRate || '',
      grossSalary: d.grossSalary || '',
      licenseExpiry: d.licenseExpiry ? d.licenseExpiry.slice(0, 10) : '',
      medicalExpiry: d.medicalExpiry ? d.medicalExpiry.slice(0, 10) : '',
      tachoCardExpiry: d.tachoCardExpiry ? d.tachoCardExpiry.slice(0, 10) : '',
      status: d.status || 'available',
    });
    setEditId(d.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => setDeleteId(id);

  const executeDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/drivers/${deleteId}`);
      toast.success(t('success') || 'Șoferul a fost șters!');
      loadDrivers();
    } catch (err) {
      toast.error(t('error') || 'Eroare la ștergerea șoferului.');
    } finally { setDeleteId(null); }
  };

  const filtered = drivers.filter(d => {
    const query = search.toLowerCase();
    return (
      (d.user?.name || '').toLowerCase().includes(query) ||
      (d.user?.email || '').toLowerCase().includes(query) ||
      (d.licenseNumber || '').toLowerCase().includes(query) ||
      (d.phone || '').toLowerCase().includes(query) ||
      (d.status || '').toLowerCase().includes(query)
    );
  }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">{t('drivers')}</h1>
          <p className="text-text-secondary text-sm">{drivers.length} {t('registeredDrivers')}</p>
        </div>
        <button
          onClick={() => {
            setEditId(null);
            setForm({
              name: '', email: '', password: '', phone: '',
              licenseNumber: '', dailyRate: '', licenseExpiry: '', medicalExpiry: '', tachoCardExpiry: '',
              status: 'available',
            });
            setShowForm(!showForm);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> {t('addDriver')}
        </button>
      </div>

      {showForm && (
        <div className="card animate-fade-in bg-white border border-border rounded-2xl p-6 shadow-md">
          <h3 className="font-bold text-lg text-text mb-5 text-primary border-b border-border pb-3">
            {editId ? t('editDriver') : t('addDriver')}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Name */}
            <div>
              <label className="label font-semibold flex items-center gap-1">
                <User className="w-4 h-4 text-primary" /> {t('name')}
              </label>
              <input
                className="input"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder={t('name')}
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="label font-semibold flex items-center gap-1">
                <Mail className="w-4 h-4 text-primary" /> {t('email')}
              </label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="driver@company.com"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="label font-semibold flex items-center gap-1">
                <Key className="w-4 h-4 text-primary" /> {editId ? t('newPasswordOptional') || 'Parolă Nouă (Opțional)' : t('password')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  className="input pr-10"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder={editId ? t('leaveBlankToKeepUnchanged') || 'Lăsați gol' : '••••••••'}
                  required={!editId}
                />
                <button
                  type="button"
                  onClick={generatePassword}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-primary hover:text-primary-dark rounded transition-colors"
                  title={t('generatePasswordBtn') || 'Generează parolă'}
                >
                  <Key className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="label font-semibold flex items-center gap-1">
                <Phone className="w-4 h-4 text-primary" /> {t('phone')}
              </label>
              <input
                className="input"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="+1 234 567 8900"
              />
            </div>

            {/* License Number */}
            <div>
              <label className="label font-semibold flex items-center gap-1">
                <FileText className="w-4 h-4 text-primary" /> {t('licenseNumber')}
              </label>
              <input
                className="input"
                value={form.licenseNumber}
                onChange={e => setForm({ ...form, licenseNumber: e.target.value })}
                placeholder="ID-123456..."
              />
            </div>

            {/* Daily Rate (Onbelaste vergoeding) */}
            <div>
              <label className="label font-semibold flex items-center gap-1">
                <span className="w-4 h-4 text-primary font-bold text-center">€</span> Onbelaste vergoeding (€/zi)
              </label>
              <input
                type="number"
                className="input"
                value={form.dailyRate}
                onChange={e => setForm({ ...form, dailyRate: e.target.value })}
                placeholder="e.g. 55"
              />
            </div>

            {/* Gross Salary (Bruto Salaris) */}
            <div>
              <label className="label font-semibold flex items-center gap-1">
                <span className="w-4 h-4 text-primary font-bold text-center">€</span> Bruto Salaris (€/lună)
              </label>
              <input
                type="number"
                className="input"
                value={form.grossSalary}
                onChange={e => setForm({ ...form, grossSalary: e.target.value })}
                placeholder="e.g. 2500"
              />
            </div>

            {/* Status Selection */}
            <div>
              <label className="label font-semibold">{t('status')}</label>
              <CustomSelect
                value={form.status}
                onChange={val => setForm({ ...form, status: val })}
                options={[
                  { value: 'available', label: t('available'), color: 'text-success' },
                  { value: 'in_trip', label: t('inTrip'), color: 'text-primary' },
                  { value: 'off', label: t('unavailable'), color: 'text-gray-500' },
                  { value: 'sick', label: t('sick'), color: 'text-error' },
                  { value: 'vacation', label: t('vacation'), color: 'text-warning' },
                ]}
              />
            </div>

            {/* Document Expirations */}
            <div>
              <label className="label font-semibold flex items-center gap-1">
                <Calendar className="w-4 h-4 text-primary" /> {t('licenseExpiry')}
              </label>
              <Flatpickr
                value={form.licenseExpiry}
                onChange={(dates, dateStr) => setForm({...form, licenseExpiry: dateStr})}
                className="input bg-white"
                options={{ altInput: true, altFormat: 'd/m/Y', dateFormat: 'Y-m-d', allowInput: true }}
                placeholder="DD/MM/YYYY"
              />
            </div>

            <div>
              <label className="label font-semibold flex items-center gap-1">
                <Calendar className="w-4 h-4 text-primary" /> {t('medicalExpiry')}
              </label>
              <Flatpickr
                value={form.medicalExpiry}
                onChange={(dates, dateStr) => setForm({...form, medicalExpiry: dateStr})}
                className="input bg-white"
                options={{ altInput: true, altFormat: 'd/m/Y', dateFormat: 'Y-m-d', allowInput: true }}
                placeholder="DD/MM/YYYY"
              />
            </div>

            <div>
              <label className="label font-semibold flex items-center gap-1">
                <Calendar className="w-4 h-4 text-primary" /> {t('tachoCardExpiry')}
              </label>
              <Flatpickr
                value={form.tachoCardExpiry}
                onChange={(dates, dateStr) => setForm({...form, tachoCardExpiry: dateStr})}
                className="input bg-white"
                options={{ altInput: true, altFormat: 'd/m/Y', dateFormat: 'Y-m-d', allowInput: true }}
                placeholder="DD/MM/YYYY"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 md:col-span-2 lg:col-span-3 pt-3 border-t border-border mt-2">
              <button type="submit" className="btn-primary px-6 py-2.5 font-bold shadow-md shadow-primary/20">
                {t('save')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditId(null);
                }}
                className="btn-secondary px-6 py-2.5 font-bold"
              >
                {t('cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="card p-0 overflow-hidden bg-white border border-border rounded-2xl shadow-sm">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                className="input pl-9 py-2 text-sm"
                placeholder={t('search')}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button onClick={() => setShowExport(true)} className="btn-secondary py-2 px-4 flex items-center gap-2 text-sm font-semibold border-primary/20 hover:border-primary/50 text-primary transition-all">
              <Download className="w-4 h-4" /> {t('export')}
            </button>
          </div>
          <span className="text-xs font-semibold text-text-secondary uppercase bg-surface px-2.5 py-1.5 rounded-lg">
            {filtered.length} {t('results')}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface border-b border-border">
                {[t('name'), t('email'), t('phone'), t('licenseNumber'), 'Bruto Salaris', 'Vergoeding/zi', t('expLicense'), t('expMedical'), t('expTacho'), t('status'), t('documents'), t('actions')].map(h => (
                  <th key={h} className="table-header whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="table-cell text-center py-8 text-text-secondary">{t('loading')}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="table-cell text-center py-8 text-text-secondary">{t('noData')}</td></tr>
              ) : filtered.map(d => (
                <tr key={d.id} className="hover:bg-surface/60 transition-colors">
                  <td className="table-cell font-bold text-text">{d.user?.name || '—'}</td>
                  <td className="table-cell text-xs">{d.user?.email || '—'}</td>
                  <td className="table-cell text-xs font-medium text-text-secondary">{d.phone || '—'}</td>
                  <td className="table-cell text-xs font-semibold text-text-secondary">{d.licenseNumber || '—'}</td>
                  <td className="table-cell text-xs font-semibold text-text-secondary">
                    {d.grossSalary ? `€${Number(d.grossSalary).toFixed(2)}` : '—'}
                  </td>
                  <td className="table-cell text-xs font-semibold text-primary">
                    {d.dailyRate ? `€${Number(d.dailyRate).toFixed(2)}` : '—'}
                  </td>
                  {[d.licenseExpiry, d.medicalExpiry, d.tachoCardExpiry].map((date, i) => (
                    <td key={i} className="table-cell whitespace-nowrap">
                       {date ? (
                        <span className={`flex items-center gap-1 text-xs font-semibold ${isExpired(date) ? 'text-error' : isExpiringSoon(date) ? 'text-warning' : 'text-success'}`}>
                          {(isExpired(date) || isExpiringSoon(date)) && <AlertCircle className="w-3.5 h-3.5" />}
                          {formatDate(date)}
                        </span>
                      ) : '—'}
                    </td>
                  ))}
                  <td className="table-cell">
                    <CustomSelect
                      className="w-36 text-xs"
                      value={d.status || 'available'}
                      onChange={async (val) => {
                        try {
                          await api.patch(`/drivers/${d.id}`, { status: val });
                          toast.success(t('statusUpdated'));
                          loadDrivers();
                        } catch {
                          toast.error(t('error'));
                        }
                      }}
                      options={[
                        { value: 'available', label: t('available'), color: 'text-success' },
                        { value: 'in_trip', label: t('inTrip'), color: 'text-primary' },
                        { value: 'off', label: t('unavailable'), color: 'text-gray-500' },
                        { value: 'sick', label: t('sick'), color: 'text-error' },
                        { value: 'vacation', label: t('vacation'), color: 'text-warning' },
                      ]}
                    />
                  </td>
                  <td className="table-cell text-xs font-semibold text-primary">{d.documents?.length || 0} {t('documents').toLowerCase()}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(d)}
                        className="p-1.5 text-text-secondary hover:text-primary rounded-lg hover:bg-primary-light transition-all"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(d.id)}
                        className="p-1.5 text-text-secondary hover:text-error rounded-lg hover:bg-red-50 transition-all"
                      >
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

      <ExportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        data={filtered}
        filename="Soferi_HapTrans"
        getDateField={item => item.createdAt}
        headers={[
          { key: 'createdAt', label: 'Data Inregistrare', transform: val => val ? formatDate(val) : '' },
          { key: 'name', label: 'Nume Sofer', transform: (_, item) => item?.user?.name || '' },
          { key: 'email', label: 'Email', transform: (_, item) => item?.user?.email || '' },
          { key: 'phone', label: 'Telefon' },
          { key: 'licenseNumber', label: 'Numar Permis' },
          { key: 'grossSalary', label: 'Bruto Salaris (€)' },
          { key: 'dailyRate', label: 'Vergoeding (€)' },
          { key: 'licenseExpiry', label: 'Expirare Permis', transform: val => val ? formatDate(val) : '' },
          { key: 'medicalExpiry', label: 'Expirare Aviz Medical', transform: val => val ? formatDate(val) : '' },
          { key: 'tachoCardExpiry', label: 'Expirare Cartela Tacho', transform: val => val ? formatDate(val) : '' },
          { key: 'status', label: 'Status' },
        ]}
      />
    
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={executeDelete}
        title={t('confirm')}
        message={t('confirmDelete')}
      />
    </div>
  );
}
