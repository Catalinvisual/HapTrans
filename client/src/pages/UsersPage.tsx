import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Pencil, Key, Search } from 'lucide-react';
import api from '../lib/api';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';
import CustomSelect from '../components/CustomSelect';
import { navItems } from '../components/Sidebar';
import Pagination from '../components/Pagination';
import { useShortcuts } from '../hooks/useShortcuts';
import { useTableShortcuts } from '../hooks/useTableShortcuts';

export default function UsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deactivateUser, setDeactivateUser] = useState<any>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<{ email: string, password: string, name: string, role: string, grossSalary: string, dailyRate: string, allowedPages: string[] }>({ email: '', password: '', name: '', role: 'dispatcher', grossSalary: '', dailyRate: '', allowedPages: [] });
  const [showPageSelect, setShowPageSelect] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedRowIndex, setSelectedRowIndex] = useState(-1);

  const load = () => api.get('/users').then(r => {
    const sorted = r.data.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    setUsers(sorted);
    setLoading(false);
  });
  
  useEffect(() => { load(); }, []);

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm({ ...form, password: pass });
    toast.success(t('passwordGenerated'));
  };

  const handleSubmit = async (e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      if (editId) {
        const payload: Partial<typeof form> = { ...form };
        if (!payload.password) delete payload.password;
        await api.patch(`/users/${editId}`, payload);
        toast.success(t('userUpdated'));
      } else {
        await api.post('/auth/register', form);
        toast.success(t('userCreated'));
      }
      setShowForm(false);
      setEditId(null);
      setForm({ email: '', password: '', name: '', role: 'dispatcher', grossSalary: '', dailyRate: '', allowedPages: [] });
      load();
    } catch {
      toast.error(t('saveError'));
    }
  };

  const handleEdit = (u: any) => {
    setForm({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      grossSalary: u.grossSalary || '',
      dailyRate: u.dailyRate || '',
      allowedPages: u.allowedPages || [],
    });
    setEditId(u.id);
    setShowForm(true);
  };

  const handleResetPassword = (u: any) => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
    let newPass = '';
    for (let i = 0; i < 12; i++) {
      newPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setResetPasswordUser({ user: u, newPass });
  };

  const executeResetPassword = async () => {
    if (!resetPasswordUser) return;
    try {
      await api.patch(`/users/${resetPasswordUser.user.id}`, { password: resetPasswordUser.newPass });
      navigator.clipboard.writeText(resetPasswordUser.newPass);
      toast.success(`${t('passwordResetSuccess')}${resetPasswordUser.newPass} (clipboard)`);
    } catch {
      toast.error(t('passwordResetError'));
    } finally {
      setResetPasswordUser(null);
    }
  };

  const executeDelete = async () => {
    if (!deactivateUser) return;
    try {
      await api.delete(`/users/${deactivateUser.id}`);
      toast.success(t('userDeleted', 'Utilizator șters cu succes'));
      load();
    } catch {
      toast.error(t('error') || 'Eroare la ștergerea utilizatorului');
    } finally {
      setDeactivateUser(null);
    }
  };

  const ROLE_BADGE: Record<string, string> = { admin: 'badge-error', dispatcher: 'badge-primary', driver: 'badge-success' };

  const filtered = users.filter(u => {
    const query = search.toLowerCase();
    return (
      (u.name || '').toLowerCase().includes(query) ||
      (u.email || '').toLowerCase().includes(query) ||
      (u.role || '').toLowerCase().includes(query) ||
      (u.language || '').toLowerCase().includes(query)
    );
  });

  const currentTableItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useShortcuts({
    'ctrl+n': () => {
      if (!showForm && !resetPasswordUser && !deactivateUser) {
        setForm({ email: '', password: '', name: '', role: 'dispatcher', grossSalary: '', dailyRate: '', allowedPages: [] });
        setEditId(null);
        setShowForm(true);
      }
    },
    'ctrl+s': (e) => {
      if (showForm) {
        handleSubmit(e);
      }
    },
    'escape': () => {
      if (showForm) setShowForm(false);
      if (resetPasswordUser) setResetPasswordUser(null);
      if (deactivateUser) setDeactivateUser(null);
    }
  });

  useTableShortcuts({
    items: currentTableItems,
    selectedIndex: selectedRowIndex,
    setSelectedIndex: setSelectedRowIndex,
    onOpen: (u) => {
      setEditId(u.id);
      setForm({
        name: u.name,
        email: u.email,
        password: '',
        role: u.role,
        grossSalary: u.grossSalary?.toString() || '',
        dailyRate: u.dailyRate?.toString() || '',
        allowedPages: u.allowedPages || []
      });
      setShowForm(true);
    },
    onDelete: (u) => setDeactivateUser(u),
    isActive: !showForm && !resetPasswordUser && !deactivateUser
  });

  return (
    <div className="space-y-5 animate-fade-in">

      {showForm && (
        <div className="card animate-fade-in bg-white border border-border rounded-2xl p-6 shadow-md">
          <h3 className="font-bold text-lg text-text mb-5 text-primary border-b border-border pb-3">
            {editId ? t('editUser', 'Editare utilizator') : t('newUser', 'Utilizator nou')}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div>
              <label className="label font-semibold">{t('name')}</label>
              <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
            <div>
              <label className="label font-semibold">{t('email')}</label>
              <input type="email" className="input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
            </div>
            <div>
              <label className="label font-semibold">{editId ? t('newPasswordOptional', 'Parolă nouă (opțională)') : t('password', 'Parolă')}</label>
              <div className="relative">
                <input type="text" className="input pr-10" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required={!editId} minLength={editId ? undefined : 6} placeholder={editId ? t('leaveBlankToKeepUnchanged', 'Lăsați gol') : ''} />
                <button type="button" onClick={generatePassword} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-primary hover:text-primary-dark rounded transition-colors" title={t('generatePasswordBtn', 'Generează parolă')}>
                  <Key className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <label className="label font-semibold">{t('role')}</label>
              <CustomSelect
                value={form.role}
                onChange={val => setForm({...form, role: val})}
                options={[
                  { value: 'admin', label: t('admin') || 'Admin' },
                  { value: 'dispatcher', label: t('dispatcher') || 'Dispecer' },
                  { value: 'driver', label: t('driver') || 'Șofer' },
                ]}
              />
            </div>
            <div>
              <label className="label font-semibold">{t('payroll_gross') || 'Bruto Salaris (€)'}</label>
              <input type="number" className="input bg-surface" value={form.grossSalary} onChange={e => setForm({...form, grossSalary: e.target.value})} placeholder="0.00" />
            </div>
            <div>
              <label className="label font-semibold">{t('payroll_allowance') || 'Vergoeding / Zi (€)'}</label>
              <input type="number" className="input bg-surface" value={form.dailyRate} onChange={e => setForm({...form, dailyRate: e.target.value})} placeholder="0.00" />
            </div>

            {(form.role === 'admin' || form.role === 'dispatcher') && (
              <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-2">
                <label className="label font-semibold">{t('allowedPages', 'Acces Pagini (Lăsați gol pentru acces complet)')}</label>
                <div className="relative">
                  <div 
                    className="input cursor-pointer min-h-[42px] flex flex-wrap gap-2 items-center bg-white"
                    onClick={() => setShowPageSelect(!showPageSelect)}
                  >
                    {form.allowedPages.length === 0 ? (
                      <span className="text-text-secondary">{t('allPages', 'Toate paginile...')}</span>
                    ) : (
                      form.allowedPages.map(p => (
                        <span key={p} className="badge-primary px-2 py-0.5 text-xs rounded-md">
                          {t(p)}
                        </span>
                      ))
                    )}
                  </div>
                  {showPageSelect && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-border rounded-xl shadow-lg max-h-64 overflow-y-auto p-2">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {navItems.map(item => {
                          const isSelected = form.allowedPages.includes(item.key);
                          return (
                            <label key={item.key} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors border ${isSelected ? 'border-primary bg-primary/5 text-primary' : 'border-transparent hover:bg-surface'}`}>
                              <input 
                                type="checkbox" 
                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setForm({ ...form, allowedPages: [...form.allowedPages, item.key] });
                                  } else {
                                    setForm({ ...form, allowedPages: form.allowedPages.filter(p => p !== item.key) });
                                  }
                                }}
                              />
                              <span className="text-sm font-medium">{t(item.key)}</span>
                            </label>
                          );
                        })}
                      </div>
                      <div className="mt-3 flex justify-end border-t border-border pt-2">
                        <button type="button" onClick={() => setShowPageSelect(false)} className="btn-secondary text-xs px-3 py-1">{t('close', 'Închide')}</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3 col-span-1 md:col-span-2 lg:col-span-4 pt-3 border-t border-border mt-2">
              <button type="submit" className="btn-primary px-6 py-2.5 font-bold shadow-md shadow-primary/20">{t('save')}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="btn-secondary px-6 py-2.5 font-bold">{t('cancel')}</button>
            </div>
          </form>
        </div>
      )}

      <div className="card p-0 overflow-hidden bg-white border border-border rounded-2xl shadow-sm">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input className="input pl-9 py-2 text-sm" placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-text-secondary uppercase bg-surface px-2.5 py-1.5 rounded-lg">
              {filtered.length} {t('results')}
            </span>
            <button onClick={() => { setEditId(null); setForm({ email: '', password: '', name: '', role: 'dispatcher', grossSalary: '', dailyRate: '', allowedPages: [] }); setShowForm(!showForm); setShowPageSelect(false); }} className="btn-primary flex items-center gap-2 py-2 px-4 text-sm font-semibold">
              <Plus className="w-4 h-4" /> {t('newUser')}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface border-b border-border">
                {[t('name'), t('email'), t('role'), t('payroll_gross') || 'Bruto', t('status'), t('actions')].map((h, i) => (
                  <th key={i} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="table-cell text-center py-8 text-text-secondary">{t('loading')}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="table-cell text-center py-8 text-text-secondary">{t('noData')}</td></tr>
              ) : currentTableItems.map((u: any, idx: number) => (
                <tr key={u.id} 
                    className={`hover:bg-surface/60 transition-colors cursor-pointer ${selectedRowIndex === idx ? 'bg-primary/5 ring-1 ring-inset ring-primary' : ''}`}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('button, select, input, a, .interactive-click')) return;
                      setEditId(u.id);
                      setForm({
                        name: u.name,
                        email: u.email,
                        password: '',
                        role: u.role,
                        grossSalary: u.grossSalary?.toString() || '',
                        dailyRate: u.dailyRate?.toString() || '',
                        allowedPages: u.allowedPages || []
                      });
                      setShowForm(true);
                    }}>
                  <td className="table-cell font-bold text-text">{u.name}</td>
                  <td className="table-cell text-xs text-text-secondary">{u.email}</td>
                  <td className="table-cell"><span className={ROLE_BADGE[u.role] || 'badge-gray'}>{t(u.role)}</span></td>
                  <td className="table-cell text-sm font-semibold text-text">
                    {u.grossSalary ? `€${Number(u.grossSalary).toFixed(2)}` : '-'}
                  </td>
                  <td className="table-cell">
                    <span className={u.isActive ? 'badge-success' : 'badge-gray'}>{u.isActive ? t('active') : t('inactive')}</span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEdit(u)} className="p-1.5 text-text-secondary hover:text-primary rounded-lg hover:bg-primary-light transition-all" title="Editare utilizator">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleResetPassword(u)} className="p-1.5 text-text-secondary hover:text-warning rounded-lg hover:bg-yellow-50 transition-all" title="Resetare parolă">
                        <Key className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeactivateUser(u)} className="p-1.5 text-text-secondary hover:text-error rounded-lg hover:bg-red-50 transition-all" title="Dezactivare/Ștergere">
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
          totalItems={filtered.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>
    
      <ConfirmModal
        isOpen={!!resetPasswordUser}
        onClose={() => setResetPasswordUser(null)}
        onConfirm={executeResetPassword}
        title="Resetare parolă"
        message={resetPasswordUser ? `Sigur doriți să resetați parola pentru ${resetPasswordUser.user.name}? Noua parolă generată este: ${resetPasswordUser.newPass}` : ''}
        confirmText="Resetează"
        type="warning"
      />
      <ConfirmModal
        isOpen={!!deactivateUser}
        onClose={() => setDeactivateUser(null)}
        onConfirm={executeDelete}
        title={t('confirm', 'Confirmare')}
        message={t('confirmDeleteUser', 'Sunteți sigur că doriți să ștergeți acest utilizator? Această acțiune este ireversibilă.')}
      />
    </div>
  );
}
