import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Truck, LogIn } from 'lucide-react';
import portalApi from '../../lib/portalApi';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

export default function PortalLoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await portalApi.post('/portal-auth/login', {
        email,
        password
      });
      localStorage.setItem('portal_token', res.data.access_token);
      localStorage.setItem('portal_user', JSON.stringify(res.data.user));
      toast.success(t("toast_loginSuccessfu"));
      navigate('/portal/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };
  return <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[url('/bg-pattern.svg')] bg-repeat">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
            <Truck className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-text">{t("jsx_clientPortal")}</h2>
        <p className="mt-2 text-center text-sm text-text-secondary">{t("jsx_manageYourTra")}</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md animate-fade-in">
        <div className="bg-surface py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-border">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="label text-sm font-medium">{t("jsx_emailAddress")}</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-text-secondary" />
                </div>
                <input type="email" required className="input pl-10" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="label text-sm font-medium">{t("jsx_password")}</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-text-secondary" />
                </div>
                <input type="password" required className="input pl-10" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-border rounded" />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-text-secondary">{t("jsx_rememberMe")}</label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-primary hover:text-primary-light">{t("jsx_forgotYourPas")}</a>
              </div>
            </div>

            <div>
              <button type="submit" disabled={loading} className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50">
                {loading ? 'Signing in...' : <><LogIn className="w-5 h-5 mr-2" />{t("jsx_signIn")}</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>;
}