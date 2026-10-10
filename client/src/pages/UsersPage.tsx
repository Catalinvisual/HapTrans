import { useSaveConfirm } from "../components/SaveConfirmProvider";
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Pencil, Key, Search, Users, UserCheck, ShieldCheck, Truck, Eye, EyeOff } from 'lucide-react';
import api from '../lib/api';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';
import CustomSelect from '../components/CustomSelect';
import { matchesSearch } from '../lib/search';
import { navItems } from '../components/Sidebar';
import Pagination from '../components/Pagination';
import { useShortcuts } from '../hooks/useShortcuts';
import { useTableShortcuts } from '../hooks/useTableShortcuts';
import KpiStrip from '../components/ui/KpiStrip';
import DataTable from '../components/ui/DataTable';
export default function UsersPage() {
  const confirmSave = useSaveConfirm();
  const {
    t
  } = useTranslation();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deactivateUser, setDeactivateUser] = useState<any>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<{
    email: string;
    password: string;
    name: string;
    role: string;
    grossSalary: string;
    dailyRate: string;
    allowedPages: string[];
  }>({
    email: '',
    password: '',
    name: '',
    role: 'dispatcher',
    grossSalary: '',
    dailyRate: '',
    allowedPages: []
  });
  const [showPageSelect, setShowPageSelect] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [maskSalary, setMaskSalary] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState(-1);
  const load = () => api.get('/users').then(r => {
    const sorted = r.data.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    setUsers(sorted);
    setLoading(false);
  });
  useEffect(() => {
    load();
  }, []);
  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm({
      ...form,
      password: pass
    });
    toast.success(t('passwordGenerated'));
  };
  const handleSubmit = async (e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!await confirmSave()) return;
    try {
      if (editId) {
        const payload: Partial<typeof form> = {
          ...form
        };
        if (!payload.password) delete payload.password;
        await api.patch(`/users/${editId}`, payload);
        toast.success(t('userUpdated'));
      } else {
        await api.post('/auth/register', form);
        toast.success(t('userCreated'));
      }
      setShowForm(false);
      setEditId(null);
      setForm({
        email: '',
        password: '',
        name: '',
        role: 'dispatcher',
        grossSalary: '',
        dailyRate: '',
        allowedPages: []
      });
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
      allowedPages: u.allowedPages || []
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
    setResetPasswordUser({
      user: u,
      newPass
    });
  };
  const executeResetPassword = async () => {
    if (!resetPasswordUser) return;
    try {
      await api.patch(`/users/${resetPasswordUser.user.id}`, {
        password: resetPasswordUser.newPass
      });
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
  const ROLE_BADGE: Record<string, string> = {
    admin: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
    dispatcher: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
    driver: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  };
  const formatSalary = (v: any) => (v == null || v === '' ? '—' : `${Number(v).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`);
  const activeCount = users.filter(u => u.isActive).length;
  const staffCount = users.filter(u => u.role === 'admin' || u.role === 'dispatcher').length;
  const driverCount = users.filter(u => u.role === 'driver').length;
  const filtered = users.filter(u => {
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? !!u.isActive : !u.isActive);
    const matchSearch = matchesSearch(search, u.name, u.email, u.role, u.language);
    return matchRole && matchStatus && matchSearch;
  });
  const currentTableItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  useShortcuts({
    'shift+n': () => {
      if (!showForm && !resetPasswordUser && !deactivateUser) {
        setForm({
          email: '',
          password: '',
          name: '',
          role: 'dispatcher',
          grossSalary: '',
          dailyRate: '',
          allowedPages: []
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
      if (showForm) setShowForm(false);
      if (resetPasswordUser) setResetPasswordUser(null);
      if (deactivateUser) setDeactivateUser(null);
    }
  });
  useTableShortcuts({
    items: currentTableItems,
    selectedIndex: selectedRowIndex,
    setSelectedIndex: setSelectedRowIndex,
    onOpen: u => {
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
    onDelete: u => setDeactivateUser(u),
    isActive: !showForm && !resetPasswordUser && !deactivateUser
  });
  return <div className="space-y-5 animate-fade-in">

      {showForm && <div className="card animate-fade-in bg-card border border-border rounded-2xl p-6 shadow-md">
          <h3 className="font-bold text-lg text-text mb-5 text-primary border-b border-border pb-3">
            {editId ? t('editUser', 'Editare utilizator') : t('newUser', 'Utilizator nou')}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div>
              <label className="label font-semibold">{t('name')}</label>
              <input className="input" value={form.name} onChange={e => setForm({
            ...form,
            name: e.target.value
          })} required />
            </div>
            <div>
              <label className="label font-semibold">{t('email')}</label>
              <input type="email" className="input" value={form.email} onChange={e => setForm({
            ...form,
            email: e.target.value
          })} required />
            </div>
            <div>
              <label className="label font-semibold">{editId ? t('newPasswordOptional', 'Parolă nouă (opțională)') : t('password', 'Parolă')}</label>
              <div className="relative">
                <input type="text" className="input pr-10" value={form.password} onChange={e => setForm({
              ...form,
              password: e.target.value
            })} required={!editId} minLength={editId ? undefined : 6} placeholder={editId ? t('leaveBlankToKeepUnchanged', 'Lăsați gol') : ''} />
                <button type="button" onClick={generatePassword} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-primary hover:text-primary-dark rounded transition-colors" title={t('generatePasswordBtn', 'Generează parolă')}>
                  <Key className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <label className="label font-semibold">{t('role')}</label>
              <CustomSelect value={form.role} onChange={val => setForm({
            ...form,
            role: val
          })} options={[{
            value: 'admin',
            label: t('admin') || 'Admin'
          }, {
            value: 'dispatcher',
            label: t('dispatcher') || 'Dispecer'
          }, {
            value: 'driver',
            label: t('driver') || 'Șofer'
          }]} />
            </div>
            <div>
              <label className="label font-semibold">{t('payroll_gross') || 'Bruto Salaris (€)'}</label>
              <input type="number" className="input bg-surface" value={form.grossSalary} onChange={e => setForm({
            ...form,
            grossSalary: e.target.value
          })} placeholder="0.00" />
            </div>
            <div>
              <label className="label font-semibold">{t('payroll_allowance') || 'Vergoeding / Zi (€)'}</label>
              <input type="number" className="input bg-surface" value={form.dailyRate} onChange={e => setForm({
            ...form,
            dailyRate: e.target.value
          })} placeholder="0.00" />
            </div>

            {(form.role === 'admin' || form.role === 'dispatcher') && <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-2">
                <label className="label font-semibold">{t('allowedPages', 'Acces Pagini (Lăsați gol pentru acces complet)')}</label>
                <div className="relative">
                  <div className="input cursor-pointer min-h-[42px] flex flex-wrap gap-2 items-center bg-card" onClick={() => setShowPageSelect(!showPageSelect)}>
                    {form.allowedPages.length === 0 ? <span className="text-text-secondary">{t('allPages', 'Toate paginile...')}</span> : form.allowedPages.map(p => <span key={p} className="badge-primary px-2 py-0.5 text-xs rounded-md">
                          {t(p)}
                        </span>)}
                  </div>
                  {showPageSelect && <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                      <div className="max-h-64 overflow-y-auto p-2 custom-scrollbar">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {navItems.map(item => {
                  const isSelected = form.allowedPages.includes(item.key);
                  return <label key={item.key} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors border ${isSelected ? 'border-primary bg-primary/5 text-primary' : 'border-transparent hover:bg-surface'}`}>
                              <input type="checkbox" className="w-4 h-4 rounded border-border text-primary focus:ring-primary" checked={isSelected} onChange={e => {
                      if (e.target.checked) {
                        setForm({
                          ...form,
                          allowedPages: [...form.allowedPages, item.key]
                        });
                      } else {
                        setForm({
                          ...form,
                          allowedPages: form.allowedPages.filter(p => p !== item.key)
                        });
                      }
                    }} />
                              <span className="text-sm font-medium">{t(item.key)}</span>
                            </label>;
                })}
                      </div>
                      <div className="mt-3 flex justify-end border-t border-border pt-2">
                        <button type="button" onClick={() => setShowPageSelect(false)} className="btn-secondary text-xs px-3 py-1">{t('close', 'Închide')}</button>
                      </div>
                      </div>
                    </div>}
                </div>
              </div>}

            <div className="flex gap-3 col-span-1 md:col-span-2 lg:col-span-4 pt-3 border-t border-border mt-2">
              <button type="submit" className="btn-primary !px-4 !py-1.5 text-sm font-bold shadow-md shadow-primary/20">{t('save')}</button>
              <button type="button" onClick={() => {
            setShowForm(false);
            setEditId(null);
          }} className="btn-secondary !px-4 !py-1.5 text-sm font-bold">{t('cancel')}</button>
            </div>
          </form>
        </div>}

      <KpiStrip dense items={[
        { key: 'total', label: t('users_total', 'TOTAL UTILIZATORI'), value: users.length, icon: Users, color: 'text-primary' },
        { key: 'active', label: t('users_active', 'ACTIVI'), value: activeCount, icon: UserCheck, color: 'text-success' },
        { key: 'staff', label: t('users_admin_dispatcher', 'ADMINI & DISPECERI'), value: staffCount, icon: ShieldCheck, color: 'text-blue-600' },
        { key: 'drivers', label: t('users_drivers', 'CONTURI ȘOFERI'), value: driverCount, icon: Truck, color: 'text-warning' },
      ]} />

      <div className="card flex items-center gap-2 px-3 py-2 flex-wrap">
        <div className="relative w-[240px] shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
          <input className="input !pl-8 !py-1.5 !text-xs h-8 w-full" placeholder={t('searchUsers', 'Caută nume sau email...')} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <CustomSelect size="sm" className="w-[120px] shrink-0" value={roleFilter} onChange={setRoleFilter} options={[
          { value: 'all', label: t('allRoles', 'Toate rolurile') },
          { value: 'admin', label: t('admin_role', 'Admin') },
          { value: 'dispatcher', label: t('dispatcher') || 'Dispecer' },
          { value: 'driver', label: t('driver') || 'Șofer' },
        ]} />
        <CustomSelect size="sm" className="w-[120px] shrink-0" value={statusFilter} onChange={setStatusFilter} options={[
          { value: 'all', label: t('allStatuses', 'Toate statusurile') },
          { value: 'active', label: t('status_active', 'Activ'), color: '#10B981' },
          { value: 'inactive', label: t('status_inactive', 'Inactiv'), color: '#EF4444' },
        ]} />
        <span className="text-[10px] font-bold text-text-secondary uppercase bg-surface px-2 py-1.5 rounded-lg border border-border/50 shrink-0">
          {filtered.length} {t('records')}
        </span>
        <button onClick={() => setMaskSalary(!maskSalary)} className="p-1.5 text-text-secondary hover:text-primary rounded-lg hover:bg-primary/10 border border-border/60 shrink-0" title={t('toggle_salary_visibility', 'Ascunde / arată salariile')}>
          {maskSalary ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
        <div className="flex-1" />
        <button onClick={() => {
            setEditId(null);
            setForm({
              email: '',
              password: '',
              name: '',
              role: 'dispatcher',
              grossSalary: '',
              dailyRate: '',
              allowedPages: []
            });
            setShowForm(!showForm);
            setShowPageSelect(false);
          }} className="btn-primary !py-1.5 !px-3 text-xs font-bold flex items-center gap-1.5 shrink-0 whitespace-nowrap shadow-md shadow-primary/20">
          <Plus className="w-4 h-4" /> {t('newUser')}
        </button>
      </div>

      <div className="card p-0 overflow-hidden bg-card border border-border rounded-2xl shadow-sm">
        <DataTable
          dense
          minWidth="1040px"
          loading={loading}
          rowKey={(u: any) => u.id}
          data={currentTableItems}
          emptyState={<div className="p-12 text-center text-sm text-text-secondary">{t('noData')}</div>}
          onRowClick={(u: any) => {
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
          }}
          columns={[
            { key: 'user', label: t('users_col_user_contact', 'UTILIZATOR & CONTACT'), align: 'left', render: (u: any) => (
              <div>
                <p className="font-bold text-[13px] text-text truncate max-w-[240px]">{u.name || (u.email ? u.email.split('@')[0] : '—')}</p>
                <p className="text-[10px] text-text-secondary mt-0.5 truncate max-w-[240px]">{u.email}</p>
              </div>
            ) },
            { key: 'role', label: t('users_col_role_access', 'ROL & ACCES'), align: 'left', render: (u: any) => (
              <div>
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-md border ${ROLE_BADGE[u.role] || 'bg-slate-500/10 text-slate-600 border-slate-500/20'}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" /> {t(u.role)}
                </span>
                <p className="text-[10px] text-text-secondary mt-0.5 truncate max-w-[180px]">{(u.allowedPages && u.allowedPages.length) ? `${u.allowedPages.length} ${t('pages_access', 'pagini acces')}` : t('full_access', 'Acces complet')}</p>
              </div>
            ) },
            { key: 'salary', label: t('users_col_gross_salary', 'SALARIU BRUT'), align: 'right', render: (u: any) => (
              <span className="inline-block font-bold text-[12px] text-text whitespace-nowrap">{maskSalary ? '••••••' : formatSalary(u.grossSalary)}</span>
            ) },
            { key: 'status', label: t('users_col_status_actions', 'STATUS & ACȚIUNI'), align: 'right', sticky: 'right', width: '190px', render: (u: any) => (
              <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap ${u.isActive ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' : 'bg-red-500/10 text-red-700 border-red-500/20'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} /> {u.isActive ? t('status_active') : t('status_inactive')}
                </span>
                <button onClick={() => handleEdit(u)} className="p-1.5 text-text-secondary hover:text-primary rounded-lg hover:bg-primary/10 transition-all" title={t('edit_user', 'Editare utilizator')}>
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleResetPassword(u)} className="p-1.5 text-text-secondary hover:text-warning rounded-lg hover:bg-yellow-50 transition-all" title={t('reset_password', 'Resetare parolă')}>
                  <Key className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setDeactivateUser(u)} className="p-1.5 text-text-secondary hover:text-error rounded-lg hover:bg-red-50 transition-all" title={t('deactivate_delete_user', 'Dezactivare/Ștergere')}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) },
          ]}
        />
        <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
      </div>
    
      <ConfirmModal isOpen={!!resetPasswordUser} onClose={() => setResetPasswordUser(null)} onConfirm={executeResetPassword} title={t('reset_password_title', 'Resetare parolă')} message={resetPasswordUser ? t('reset_password_confirm', 'Sigur doriți să resetați parola pentru {{name}}? Noua parolă generată este: {{pass}}', { name: resetPasswordUser.user.name, pass: resetPasswordUser.newPass }) : ''} confirmText={t('reset_password_btn', 'Resetează')} type="warning" />
      <ConfirmModal isOpen={!!deactivateUser} onClose={() => setDeactivateUser(null)} onConfirm={executeDelete} title={t('confirm', 'Confirmare')} message={t('confirmDeleteUser', 'Sunteți sigur că doriți să ștergeți acest utilizator? Această acțiune este ireversibilă.')} />
    </div>;
}

