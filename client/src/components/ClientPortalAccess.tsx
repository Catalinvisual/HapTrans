import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Mail, ShieldAlert, KeyRound, Ban, CheckCircle2, Clock } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import ConfirmModal from './ConfirmModal';

export default function ClientPortalAccess({ clientId }: { clientId: string }) {
  const { t } = useTranslation();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteForm, setInviteForm] = useState({ email: '', name: '' });
  const [inviteLink, setInviteLink] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  useEffect(() => {
    // Prefill form if client details are available
    api.get(`/clients/${clientId}`).then(res => {
      if (res.data) {
        setInviteForm(prev => ({
          ...prev,
          name: prev.name || res.data.contactName || res.data.name || '',
          email: prev.email || res.data.contactEmail || res.data.email || ''
        }));
      }
    }).catch(() => {});
  }, [clientId]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/portal-users/client/${clientId}`);
      setUsers(res.data);
    } catch {
      toast.error('Failed to load portal users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [clientId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/portal-users/invite', { clientId, ...inviteForm });
      toast.success('User invited successfully');
      setInviteLink(window.location.origin + res.data.inviteLink);
      setInviteForm({ email: '', name: '' });
      loadUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to invite user');
    }
  };

  const handleStatusChange = async (userId: string, status: string) => {
    try {
      await api.patch(`/portal-users/${userId}/status`, { status });
      toast.success(`User marked as ${status}`);
      loadUsers();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      await api.delete(`/portal-users/${userId}`);
      toast.success(t('inviteDeleted', 'Portal access deleted successfully'));
      loadUsers();
    } catch {
      toast.error(t('deleteInviteFailed', 'Failed to delete portal access'));
    }
  };

  const renderStatus = (status: string) => {
    switch(status) {
      case 'active': return <span className="flex items-center gap-1 text-success text-xs font-bold bg-green-100 px-2 py-1 rounded"><CheckCircle2 className="w-3 h-3"/> Active</span>;
      case 'pending': return <span className="flex items-center gap-1 text-orange-600 text-xs font-bold bg-orange-100 px-2 py-1 rounded"><Clock className="w-3 h-3"/> Pending</span>;
      case 'suspended': return <span className="flex items-center gap-1 text-red-600 text-xs font-bold bg-red-100 px-2 py-1 rounded"><ShieldAlert className="w-3 h-3"/> Suspended</span>;
      case 'disabled': return <span className="flex items-center gap-1 text-gray-600 text-xs font-bold bg-gray-100 px-2 py-1 rounded"><Ban className="w-3 h-3"/> Disabled</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">{t('portalUsers', 'Portal Access Users')}</h3>
      </div>

      <div className="bg-surface p-5 rounded-xl border border-border">
        <h4 className="font-bold text-primary mb-3 text-sm flex items-center gap-2"><Mail className="w-4 h-4"/> {t('inviteNewUser', 'Invite New User')}</h4>
        <form onSubmit={handleInvite} className="flex flex-col md:flex-row gap-3 items-end">
          <div className="flex-1 w-full">
            <label className="label text-xs">{t('name', 'Name')}</label>
            <input className="input" placeholder="John Doe" value={inviteForm.name} onChange={e => setInviteForm({...inviteForm, name: e.target.value})} required />
          </div>
          <div className="flex-1 w-full">
            <label className="label text-xs">{t('email', 'Email')}</label>
            <input type="email" className="input" placeholder="john@company.com" value={inviteForm.email} onChange={e => setInviteForm({...inviteForm, email: e.target.value})} required />
          </div>
          <button type="submit" className="btn-primary py-2 px-6 whitespace-nowrap">{t('sendInvite', 'Send Invite')}</button>
        </form>
        {inviteLink && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
            <p className="font-semibold text-green-800 mb-1">{t('inviteSentSuccess', 'Invitation Email Sent!')}</p>
            <p className="text-green-700 text-xs mb-2">{t('inviteManualSendDesc', 'An invitation has been sent via email to this user. You can also copy the link manually if needed:')}</p>
            <code className="block bg-white p-2 border border-green-100 rounded text-xs select-all break-all text-green-900">{inviteLink}</code>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-text-secondary text-sm">{t('loading', 'Loading users...')}</p>
      ) : users.length === 0 ? (
        <p className="text-text-secondary text-sm italic">{t('noPortalUsers', 'No portal users found for this client.')}</p>
      ) : (
        <div className="overflow-x-auto border border-border rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface border-b border-border">
                <th className="p-3 text-left font-bold text-text-secondary">{t('user', 'User')}</th>
                <th className="p-3 text-left font-bold text-text-secondary">{t('email', 'Email')}</th>
                <th className="p-3 text-left font-bold text-text-secondary">{t('status', 'Status')}</th>
                <th className="p-3 text-left font-bold text-text-secondary">{t('lastLogin', 'Last Login')}</th>
                <th className="p-3 text-right font-bold text-text-secondary">{t('actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-border hover:bg-surface/50">
                  <td className="p-3 font-semibold text-text">{u.name || '—'}</td>
                  <td className="p-3 text-text-secondary">{u.email}</td>
                  <td className="p-3">{renderStatus(u.status)}</td>
                  <td className="p-3 text-xs text-text-secondary">{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : t('never', 'Never')}</td>
                  <td className="p-3 flex justify-end gap-2">
                    {u.status !== 'suspended' && <button onClick={() => handleStatusChange(u.id, 'suspended')} className="p-1.5 text-text-secondary hover:text-orange-600 rounded-lg hover:bg-orange-50 transition-colors" title="Suspend"><Ban className="w-4 h-4" /></button>}
                    {u.status !== 'active' && <button onClick={() => handleStatusChange(u.id, 'active')} className="p-1.5 text-text-secondary hover:text-success rounded-lg hover:bg-green-50 transition-colors" title="Activate"><CheckCircle2 className="w-4 h-4" /></button>}
                    <button onClick={() => { setUserToDelete(u.id); setDeleteModalOpen(true); }} className="p-1.5 text-text-secondary hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setUserToDelete(null); }}
        onConfirm={() => {
          if (userToDelete) {
            handleDelete(userToDelete);
          }
        }}
        title={t('deleteInvite', 'Delete Portal Access')}
        message={t('confirmDeleteInvite', 'Are you sure you want to delete this portal access? This action cannot be undone.')}
        confirmText={t('delete', 'Delete')}
        type="danger"
      />
    </div>
  );
}
