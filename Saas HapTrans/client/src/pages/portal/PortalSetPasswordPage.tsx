import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Mail, Truck, ArrowRight } from 'lucide-react';
import portalApi from '../../lib/portalApi';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
export default function PortalSetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  if (!token || !email) {
    return <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="card max-w-md w-full text-center p-8 border border-border shadow-lg rounded-2xl bg-surface">
          <h2 className="text-2xl font-bold text-error mb-2">{t("jsx_invalidLink")}</h2>
          <p className="text-text-secondary">{t("jsx_thisInvitation")}</p>
        </div>
      </div>;
  }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error(t("toast_passwordsDoNo"));
      return;
    }
    if (password.length < 8) {
      toast.error(t("toast_passwordMustB"));
      return;
    }
    setLoading(true);
    try {
      await portalApi.post('/portal-auth/set-password', {
        email,
        token,
        password
      });
      toast.success(t("toast_passwordSetSu"));
      navigate('/portal/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to set password. Link may be expired.');
    } finally {
      setLoading(false);
    }
  };
  return <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="card max-w-md w-full p-8 border border-border shadow-xl rounded-2xl bg-surface">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <Truck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-text">{t("jsx_welcomeToHapT")}</h1>
          <p className="text-text-secondary mt-1">{t("jsx_setYourPasswo")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">{t("jsx_emailReadOnl")}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
              <input className="input pl-10 bg-surface-hover opacity-70" value={email} readOnly />
            </div>
          </div>

          <div>
            <label className="label">{t("jsx_newPassword")}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
              <input type="password" className="input pl-10" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
            </div>
          </div>

          <div>
            <label className="label">{t("jsx_confirmPasswor")}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
              <input type="password" className="input pl-10" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 flex items-center justify-center gap-2 mt-4">
            {loading ? 'Activating...' : 'Activate Account'} <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>;
}