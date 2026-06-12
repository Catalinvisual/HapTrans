import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Truck, Eye, EyeOff } from 'lucide-react';
import LanguageDropdown from '../components/LanguageDropdown';



export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('admin@hapcargo.ro');
  const [password, setPassword] = useState('Admin2024!');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setAuth(data.user, data.access_token);
      toast.success(`${t('welcomeUser')}${data.user.name}!`);
      navigate('/dashboard');
    } catch {
      toast.error(t('invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-gradient-to-br from-primary to-primary-dark p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-56 h-56 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                <path d="M5 3l-1 18h4l1-18H5zm9 0l-1 18h4l1-18h-4zm-8 7l1 4h9l-1-4H6z" />
              </svg>
            </div>
            <span className="text-2xl font-bold">HapCargo</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Gestionați-vă<br />flota cu<br />încredere
          </h1>
          <p className="text-white/80 text-lg">
            Platforma SaaS completă pentru administrarea firmei de transport.
          </p>
        </div>
        <div className="relative z-10 grid grid-cols-2 gap-4">
          {[
            { label: 'Curse monitorizate', value: '24/7' },
            { label: 'Camioane live', value: '100%' },
            { label: 'Reducere costuri', value: '30%' },
            { label: 'Clienți satisfăcuți', value: '★ 4.9' },
          ].map((s) => (
            <div key={s.label} className="bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-white/70 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-8">
        {/* Language switcher - top right dropdown */}
        <div className="absolute top-5 right-6">
          <LanguageDropdown />
        </div>

        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-text">HapCargo</span>
          </div>

          <h2 className="text-3xl font-bold text-text mb-2">{t('welcome')}</h2>
          <p className="text-text-secondary mb-8">{t('loginSubtitle')}</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="label">{t('email')}</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@hapcargo.ro"
                required
              />
            </div>
            <div>
              <label className="label">{t('password')}</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input pr-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-base"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Se autentifică...
                </span>
              ) : t('signIn')}
            </button>
          </form>

          <div className="mt-8 p-4 bg-primary-light rounded-xl border border-primary/20">
            <p className="text-xs text-primary-dark font-medium mb-1">🔑 Credențiale demo</p>
            <p className="text-xs text-text-secondary">Email: <span className="font-mono font-semibold text-text">admin@hapcargo.ro</span></p>
            <p className="text-xs text-text-secondary">Parolă: <span className="font-mono font-semibold text-text">Admin2024!</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
