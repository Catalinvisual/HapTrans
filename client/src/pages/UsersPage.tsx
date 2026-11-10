import { useSaveConfirm } from "../components/SaveConfirmProvider";
import { useAuthStore } from '../store/authStore';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  Plus, Trash2, Pencil, Key, Search, Users, UserCheck, ShieldCheck, Truck,
  LogOut, X, ChevronLeft, ChevronRight, Check, UserPlus, UserCog, Mail,
  Globe, Shield, Power, AlertTriangle, Loader2,
} from 'lucide-react';
import api from '../lib/api';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';
import CustomSelect from '../components/CustomSelect';
import { matchesSearch } from '../lib/search';
import { navItems, aliasKeysFor } from '../lib/navPermissions';
import Pagination from '../components/Pagination';
import { useShortcuts } from '../hooks/useShortcuts';
import { useTableShortcuts } from '../hooks/useTableShortcuts';
import KpiStrip from '../components/ui/KpiStrip';
import DataTable from '../components/ui/DataTable';

type UserForm = {
  email: string;
  password: string;
  name: string;
  role: string;
  language: string;
  allowedPages: string[];
  isActive: boolean;
};

const EMPTY_FORM: UserForm = {
  email: '',
  password: '',
  name: '',
  role: 'dispatcher',
  language: 'ro',
  allowedPages: [],
  isActive: true,
};

const emptyForm = (): UserForm => ({ ...EMPTY_FORM, allowedPages: [] });

const LANGUAGES = [
  { value: 'ro', label: 'Română' },
  { value: 'en', label: 'English' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
  { value: 'pl', label: 'Polski' },
];

const WIZARD_STEPS = ['users_step_account', 'users_step_access', 'users_step_status'];

const ROLE_OPTIONS = [
  { value: 'admin', labelKey: 'admin', hintKey: 'users_role_admin_hint', icon: ShieldCheck, tone: 'text-purple-600' },
  { value: 'dispatcher', labelKey: 'dispatcher', hintKey: 'users_role_dispatcher_hint', icon: Users, tone: 'text-blue-600' },
  { value: 'driver', labelKey: 'driver', hintKey: 'users_role_driver_hint', icon: Truck, tone: 'text-emerald-600' },
];

export default function UsersPage() {
  const confirmSave = useSaveConfirm();
  const { t, i18n } = useTranslation();
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deactivateUser, setDeactivateUser] = useState<any>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<any>(null);
  const [revokeUser, setRevokeUser] = useState<any>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRowIndex, setSelectedRowIndex] = useState(-1);

  const load = () => api.get('/users').then(r => {
    const sorted = r.data.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    setUsers(sorted);
    setLoading(false);
  });
  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm());
    setWizardStep(0);
    setWizardOpen(true);
  };

  const openEdit = (u: any) => {
    setEditId(u.id);
    setForm({
      name: u.name || '',
      email: u.email || '',
      password: '',
      role: u.role || 'dispatcher',
      language: u.language || 'ro',
      allowedPages: u.allowedPages || [],
      isActive: u.isActive !== false,
    });
    setWizardStep(0);
    setWizardOpen(true);
  };

  const closeWizard = () => {
    if (!saving) setWizardOpen(false);
  };

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm(prev => ({ ...prev, password: pass }));
    toast.success(t('passwordGenerated'));
  };

  const accountValid = (() => {
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
    const passwordValid = editId ? (!form.password || form.password.length >= 8) : form.password.length >= 8;
    return form.name.trim().length >= 2 && emailValid && passwordValid;
  })();

  const selectedPageCount = navItems.filter(item =>
    aliasKeysFor(item.key).some(key => form.allowedPages.includes(key))
  ).length;

  const togglePage = (item: any) => {
    const aliases = aliasKeysFor(item.key);
    setForm(prev => {
      const selected = aliases.some(key => prev.allowedPages.includes(key));
      return {
        ...prev,
        allowedPages: selected
          ? prev.allowedPages.filter(key => !aliases.includes(key))
          : Array.from(new Set([...prev.allowedPages, item.key])),
      };
    });
  };

  const selectAllPages = () => {
    setForm(prev => ({ ...prev, allowedPages: navItems.map(item => item.key) }));
  };

  const clearPages = () => {
    setForm(prev => ({ ...prev, allowedPages: [] }));
  };

  const handleNext = () => {
    if (wizardStep === 0 && !accountValid) {
      toast.error(t('users_account_required'));
      return;
    }
    setWizardStep(step => Math.min(2, step + 1));
  };

  const handleSubmit = async (e?: any) => {
    if (e?.preventDefault) e.preventDefault();
    if (wizardStep < 2) {
      handleNext();
      return;
    }
    if (!accountValid) {
      setWizardStep(0);
      toast.error(t('users_account_required'));
      return;
    }
    if (saving) return;
    if (!await confirmSave()) return;
    setSaving(true);
    try {
      const payload: any = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        language: form.language,
        allowedPages: form.role === 'driver' ? [] : form.allowedPages,
        isActive: form.isActive,
      };
      if (form.password) payload.password = form.password;

      if (editId) {
        await api.patch(`/users/${editId}`, payload);
        toast.success(t('userUpdated'));
      } else {
        await api.post('/users', payload);
        toast.success(t('userCreated'));
      }
      setWizardOpen(false);
      setEditId(null);
      load();
    } catch {
      toast.error(t('saveError'));
    } finally {
      setSaving(false);
    }
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
      await api.patch(`/users/${resetPasswordUser.user.id}`, {
        password: resetPasswordUser.newPass,
      });
      navigator.clipboard.writeText(resetPasswordUser.newPass);
      toast.success(`${t('passwordResetSuccess')}${resetPasswordUser.newPass} (clipboard)`);
    } catch {
      toast.error(t('passwordResetError'));
    } finally {
      setResetPasswordUser(null);
    }
  };

  const executeRevokeSessions = async () => {
    if (!revokeUser) return;
    try {
      await api.post(`/users/${revokeUser.id}/revoke-sessions`);
      toast.success(t('sessions_revoked'));
    } catch {
      toast.error(t('revoke_sessions_error'));
    } finally {
      setRevokeUser(null);
    }
  };

  const executeDelete = async () => {
    if (!deactivateUser) return;
    try {
      await api.delete(`/users/${deactivateUser.id}`);
      toast.success(t('userDeleted'));
      load();
    } catch {
      toast.error(t('error'));
    } finally {
      setDeactivateUser(null);
    }
  };

  const ROLE_BADGE: Record<string, string> = {
    admin: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
    dispatcher: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
    driver: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  };

  const formatDate = (value: any) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString(i18n.language || 'ro', { year: 'numeric', month: 'short', day: '2-digit' });
  };

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
  const editingSelf = !!editId && currentUser?.id === editId;
  const selectedLanguage = LANGUAGES.find(option => option.value === form.language)?.label || form.language;

  useShortcuts({
    'shift+n': () => {
      if (!wizardOpen && !resetPasswordUser && !deactivateUser && !revokeUser) openCreate();
    },
    'ctrl+s': e => {
      if (wizardOpen) void handleSubmit(e);
    },
    'escape': () => {
      if (wizardOpen && !resetPasswordUser && !deactivateUser && !revokeUser) closeWizard();
      if (resetPasswordUser) setResetPasswordUser(null);
      if (revokeUser) setRevokeUser(null);
      if (deactivateUser) setDeactivateUser(null);
    },
  });

  useTableShortcuts({
    items: currentTableItems,
    selectedIndex: selectedRowIndex,
    setSelectedIndex: setSelectedRowIndex,
    onOpen: openEdit,
    onDelete: u => setDeactivateUser(u),
    isActive: !wizardOpen && !resetPasswordUser && !deactivateUser && !revokeUser,
  });

  const wizard = wizardOpen && typeof document !== 'undefined' ? createPortal(
    <div
      className="fixed inset-0 z-[90000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-5 animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) closeWizard(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-wizard-title"
        className="w-full max-w-3xl max-h-[92vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              {editId ? <UserCog className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h2 id="user-wizard-title" className="text-lg font-bold text-text truncate">
                {editId ? t('editUser') : t('newUser')}
              </h2>
              <p className="text-[11px] font-semibold text-text-secondary mt-0.5">
                {t('users_step_of', { current: wizardStep + 1, total: 3 })} · {t(WIZARD_STEPS[wizardStep])}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeWizard}
            className="p-2 rounded-lg text-text-secondary hover:text-text hover:bg-surface transition-colors shrink-0"
            title={t('close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-border bg-surface/30 shrink-0">
          <div className="flex items-center gap-2">
            {WIZARD_STEPS.map((stepKey, index) => {
              const completed = index < wizardStep;
              const active = index === wizardStep;
              return (
                <div key={stepKey} className="flex items-center gap-2 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => { if (index <= wizardStep) setWizardStep(index); }}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border transition-colors shrink-0 ${
                      active
                        ? 'bg-primary text-white border-primary shadow-sm shadow-primary/30'
                        : completed
                          ? 'bg-primary/10 text-primary border-primary/30'
                          : 'bg-card text-text-secondary border-border'
                    }`}
                    aria-current={active ? 'step' : undefined}
                  >
                    {completed ? <Check className="w-3.5 h-3.5" /> : index + 1}
                  </button>
                  <span className={`hidden sm:block text-[11px] font-bold truncate ${active ? 'text-primary' : completed ? 'text-text' : 'text-text-secondary'}`}>
                    {t(stepKey)}
                  </span>
                  {index < WIZARD_STEPS.length - 1 && (
                    <div className={`h-px flex-1 ${completed ? 'bg-primary/50' : 'bg-border'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
          {wizardStep === 0 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-text">{t('users_account_title')}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label font-semibold">{t('name')} <span className="text-error">*</span></label>
                  <input
                    className="input"
                    value={form.name}
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    autoComplete="name"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="label font-semibold">{t('email')} <span className="text-error">*</span></label>
                  <input
                    type="email"
                    className="input"
                    value={form.email}
                    onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                    autoComplete="email"
                  />
                  <p className="text-[10px] text-text-secondary mt-1">{t('users_email_hint')}</p>
                </div>
                <div>
                  <label className="label font-semibold">
                    {editId ? t('password') : t('password')} {!editId && <span className="text-error">*</span>}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="input flex-1"
                      value={form.password}
                      onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                      autoComplete="new-password"
                      placeholder={editId ? t('users_password_keep_hint') : ''}
                    />
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="btn-secondary !px-3 shrink-0"
                      title={t('users_generate_password')}
                    >
                      <Key className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[10px] text-text-secondary mt-1">
                    {editId ? t('users_password_keep_hint') : t('users_password_hint')}
                  </p>
                </div>
                <div>
                  <label className="label font-semibold">{t('language')}</label>
                  <CustomSelect
                    value={form.language}
                    onChange={value => setForm(prev => ({ ...prev, language: value }))}
                    options={LANGUAGES}
                  />
                  <p className="text-[10px] text-text-secondary mt-1">{t('users_language_hint')}</p>
                </div>
              </div>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-[11px] text-text-secondary">
                {t('users_account_hint')}
              </div>
            </div>
          )}

          {wizardStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <div>
                  <h3 className="text-sm font-bold text-text">{t('users_access_title')}</h3>
                  <p className="text-[11px] text-text-secondary">{t('users_access_hint')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {ROLE_OPTIONS.map(option => {
                  const Icon = option.icon;
                  const selected = form.role === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, role: option.value }))}
                      className={`text-left rounded-xl border p-3 transition-all ${
                        selected
                          ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                          : 'border-border bg-card hover:border-primary/40 hover:bg-surface/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Icon className={`w-4 h-4 ${selected ? 'text-primary' : option.tone}`} />
                        {selected && <Check className="w-3.5 h-3.5 text-primary" />}
                      </div>
                      <p className="text-[12px] font-bold text-text mt-2">{t(option.labelKey)}</p>
                      <p className="text-[10px] leading-snug text-text-secondary mt-1">{t(option.hintKey)}</p>
                    </button>
                  );
                })}
              </div>

              {form.role !== 'driver' ? (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="text-sm font-bold text-text">{t('users_permissions_title')}</h3>
                      <p className="text-[11px] text-text-secondary">
                        {t('users_permissions_count', { count: selectedPageCount })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={selectAllPages} className="btn-secondary !px-2.5 !py-1 text-[10px] font-bold">
                        {t('users_select_all')}
                      </button>
                      <button type="button" onClick={clearPages} className="btn-secondary !px-2.5 !py-1 text-[10px] font-bold">
                        {t('users_clear_all')}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                    {navItems.map(item => {
                      const aliases = aliasKeysFor(item.key);
                      const selected = aliases.some(key => form.allowedPages.includes(key));
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => togglePage(item)}
                          className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                            selected
                              ? 'border-primary/40 bg-primary/5 text-primary'
                              : 'border-border bg-card text-text hover:bg-surface/60'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            selected ? 'bg-primary border-primary text-white' : 'border-border bg-card'
                          }`}>
                            {selected && <Check className="w-3 h-3" />}
                          </span>
                          <span className="text-[11px] font-semibold truncate">{t((item as any).labelKey || item.key)}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-text-secondary">{t('users_permissions_hint')}</p>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-[11px] text-text-secondary">
                  {t('users_driver_access_hint')}
                </div>
              )}
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2">
                <Power className="w-4 h-4 text-primary" />
                <div>
                  <h3 className="text-sm font-bold text-text">{t('users_status_title')}</h3>
                  <p className="text-[11px] text-text-secondary">{t('users_status_hint')}</p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${form.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                    <Power className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold text-text">
                      {form.isActive ? t('users_active_label') : t('users_inactive_label')}
                    </p>
                    <p className="text-[10px] text-text-secondary mt-0.5">
                      {form.isActive ? t('users_active_hint') : t('users_inactive_hint')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.isActive}
                  disabled={editingSelf}
                  onClick={() => setForm(prev => ({ ...prev, isActive: !prev.isActive }))}
                  className={`relative h-6 w-11 rounded-full transition-colors shrink-0 ${
                    form.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                  } ${editingSelf ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    form.isActive ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {editingSelf && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex items-start gap-2 text-[11px] text-amber-700">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  {t('users_self_deactivate_hint')}
                </div>
              )}

              {!form.isActive && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 flex items-start gap-2 text-[11px] text-red-700">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  {t('users_security_note')}
                </div>
              )}

              <div>
                <h3 className="text-sm font-bold text-text mb-2">{t('users_summary_title')}</h3>
                <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <UserPlus className="w-4 h-4 text-text-secondary shrink-0" />
                    <span className="text-[11px] font-semibold text-text-secondary w-28 shrink-0">{t('name')}</span>
                    <span className="text-[12px] font-bold text-text truncate">{form.name || '—'}</span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Mail className="w-4 h-4 text-text-secondary shrink-0" />
                    <span className="text-[11px] font-semibold text-text-secondary w-28 shrink-0">{t('email')}</span>
                    <span className="text-[12px] font-bold text-text truncate">{form.email || '—'}</span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <ShieldCheck className="w-4 h-4 text-text-secondary shrink-0" />
                    <span className="text-[11px] font-semibold text-text-secondary w-28 shrink-0">{t('role')}</span>
                    <span className="text-[12px] font-bold text-text">{t(form.role)}</span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Globe className="w-4 h-4 text-text-secondary shrink-0" />
                    <span className="text-[11px] font-semibold text-text-secondary w-28 shrink-0">{t('language')}</span>
                    <span className="text-[12px] font-bold text-text">{selectedLanguage}</span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Shield className="w-4 h-4 text-text-secondary shrink-0" />
                    <span className="text-[11px] font-semibold text-text-secondary w-28 shrink-0">{t('users_permissions_title')}</span>
                    <span className="text-[12px] font-bold text-text truncate">
                      {form.role === 'driver'
                        ? t('users_driver_access_hint')
                        : selectedPageCount === 0
                          ? t('users_full_access')
                          : t('users_permissions_count', { count: selectedPageCount })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Power className="w-4 h-4 text-text-secondary shrink-0" />
                    <span className="text-[11px] font-semibold text-text-secondary w-28 shrink-0">{t('users_status_title')}</span>
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      form.isActive
                        ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
                        : 'bg-red-500/10 text-red-700 border-red-500/20'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${form.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      {form.isActive ? t('status_active') : t('status_inactive')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-surface/40 p-3 text-[10px] text-text-secondary">
                {t('users_salary_note')}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border bg-surface/30 flex items-center justify-between gap-3 shrink-0">
          <button type="button" onClick={closeWizard} className="btn-secondary !px-4 !py-1.5 text-xs font-bold">
            {t('cancel')}
          </button>
          <div className="flex items-center gap-2">
            {wizardStep > 0 && (
              <button
                type="button"
                onClick={() => setWizardStep(step => Math.max(0, step - 1))}
                className="btn-secondary !px-3 !py-1.5 text-xs font-bold flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> {t('users_back')}
              </button>
            )}
            <button
              type="button"
              onClick={() => { if (wizardStep === 2) void handleSubmit(); else handleNext(); }}
              disabled={saving}
              className="btn-primary !px-4 !py-1.5 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-primary/20 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : wizardStep === 2 ? (
                <Check className="w-3.5 h-3.5" />
              ) : null}
              {wizardStep === 2 ? t('users_save') : t('users_next')}
              {wizardStep < 2 && !saving && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return <div className="space-y-5 animate-fade-in">
    <KpiStrip dense items={[
      { key: 'total', label: t('users_total'), value: users.length, icon: Users, color: 'text-primary' },
      { key: 'active', label: t('users_active'), value: activeCount, icon: UserCheck, color: 'text-success' },
      { key: 'staff', label: t('users_admin_dispatcher'), value: staffCount, icon: ShieldCheck, color: 'text-blue-600' },
      { key: 'drivers', label: t('users_drivers'), value: driverCount, icon: Truck, color: 'text-warning' },
    ]} />

    <div className="card flex items-center gap-2 px-3 py-2 flex-wrap">
      <div className="relative w-[240px] shrink-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
        <input
          className="input !pl-8 !py-1.5 !text-xs h-8 w-full"
          placeholder={t('users_search_placeholder')}
          value={search}
          onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
        />
      </div>
      <CustomSelect
        size="sm"
        className="w-[120px] shrink-0"
        value={roleFilter}
        onChange={value => { setRoleFilter(value); setCurrentPage(1); }}
        options={[
          { value: 'all', label: t('users_all_roles') },
          { value: 'admin', label: t('admin') },
          { value: 'dispatcher', label: t('dispatcher') },
          { value: 'driver', label: t('driver') },
        ]}
      />
      <CustomSelect
        size="sm"
        className="w-[120px] shrink-0"
        value={statusFilter}
        onChange={value => { setStatusFilter(value); setCurrentPage(1); }}
        options={[
          { value: 'all', label: t('users_all_statuses') },
          { value: 'active', label: t('status_active'), color: '#10B981' },
          { value: 'inactive', label: t('status_inactive'), color: '#EF4444' },
        ]}
      />
      <span className="text-[10px] font-bold text-text-secondary uppercase bg-surface px-2 py-1.5 rounded-lg border border-border/50 shrink-0">
        {filtered.length} {t('users_records')}
      </span>
      <div className="flex-1" />
      <button
        onClick={openCreate}
        className="btn-primary !py-1.5 !px-3 text-xs font-bold flex items-center gap-1.5 shrink-0 whitespace-nowrap shadow-md shadow-primary/20"
      >
        <Plus className="w-4 h-4" /> {t('newUser')}
      </button>
    </div>

    <div className="card p-0 overflow-hidden bg-card border border-border rounded-2xl shadow-sm">
      <DataTable
        dense
        minWidth="980px"
        loading={loading}
        rowKey={(u: any) => u.id}
        data={currentTableItems}
        emptyState={<div className="p-12 text-center text-sm text-text-secondary">{t('noData')}</div>}
        onRowClick={openEdit}
        columns={[
          {
            key: 'user', label: t('users_col_user_contact'), align: 'left', render: (u: any) => (
              <div>
                <p className="font-bold text-[13px] text-text truncate max-w-[240px]">{u.name || (u.email ? u.email.split('@')[0] : '—')}</p>
                <p className="text-[10px] text-text-secondary mt-0.5 truncate max-w-[240px]">{u.email}</p>
              </div>
            )
          },
          {
            key: 'role', label: t('users_col_role_access'), align: 'left', render: (u: any) => (
              <div>
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-md border ${ROLE_BADGE[u.role] || 'bg-slate-500/10 text-slate-600 border-slate-500/20'}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" /> {t(u.role)}
                </span>
                <p className="text-[10px] text-text-secondary mt-0.5 truncate max-w-[190px]">
                  {(u.allowedPages && u.allowedPages.length)
                    ? `${u.allowedPages.length} ${t('users_pages_access')}`
                    : t('users_full_access')}
                </p>
              </div>
            )
          },
          {
            key: 'created', label: t('users_col_created'), align: 'left', render: (u: any) => (
              <span className="text-[11px] font-semibold text-text-secondary whitespace-nowrap">{formatDate(u.createdAt)}</span>
            )
          },
          {
            key: 'status', label: t('users_col_status_actions'), align: 'right', sticky: 'right', width: '190px', render: (u: any) => (
              <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap ${u.isActive ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' : 'bg-red-500/10 text-red-700 border-red-500/20'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} /> {u.isActive ? t('status_active') : t('status_inactive')}
                </span>
                <button onClick={() => openEdit(u)} className="p-1.5 text-text-secondary hover:text-primary rounded-lg hover:bg-primary/10 transition-all" title={t('edit_user')}>
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {u.role === 'driver' && currentUser?.role === 'admin' && (
                  <button onClick={() => setRevokeUser(u)} className="p-1.5 text-text-secondary hover:text-warning rounded-lg hover:bg-amber-50 transition-all" title={t('revoke_sessions')}>
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={() => handleResetPassword(u)} className="p-1.5 text-text-secondary hover:text-warning rounded-lg hover:bg-yellow-50 transition-all" title={t('reset_password')}>
                  <Key className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setDeactivateUser(u)} className="p-1.5 text-text-secondary hover:text-error rounded-lg hover:bg-red-50 transition-all" title={t('deactivate_delete_user')}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          },
        ]}
      />
      <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
    </div>

    <ConfirmModal
      isOpen={!!resetPasswordUser}
      onClose={() => setResetPasswordUser(null)}
      onConfirm={executeResetPassword}
      title={t('reset_password_title')}
      message={resetPasswordUser ? t('reset_password_confirm', { name: resetPasswordUser.user.name, pass: resetPasswordUser.newPass }) : ''}
      confirmText={t('reset_password_btn')}
      type="warning"
    />
    <ConfirmModal
      isOpen={!!revokeUser}
      onClose={() => setRevokeUser(null)}
      onConfirm={executeRevokeSessions}
      title={t('revoke_sessions_title')}
      message={revokeUser ? t('revoke_sessions_confirm', { name: revokeUser.name }) : ''}
      confirmText={t('revoke_sessions_btn')}
      type="warning"
    />
    <ConfirmModal
      isOpen={!!deactivateUser}
      onClose={() => setDeactivateUser(null)}
      onConfirm={executeDelete}
      title={t('confirm')}
      message={t('confirmDeleteUser')}
    />

    {wizard}
  </div>;
}
