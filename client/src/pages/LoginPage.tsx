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
    <div className="min-h-screen bg-secondary flex flex-col justify-center items-center relative overflow-hidden">
      {/* Background Abstract Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary opacity-20 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 -left-20 w-72 h-72 bg-accent opacity-20 rounded-full blur-[100px]" />
        <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-primary opacity-10 rounded-full blur-[100px]" />
      </div>

      {/* Language switcher - top right dropdown */}
      <div className="absolute top-6 right-6 z-50">
        <LanguageDropdown />
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-[420px] px-6">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-10 shadow-2xl animate-fade-in-up">
          <div className="flex flex-col items-center mb-10">
            <div className="flex items-center gap-2 mb-2">
              <svg viewBox="0 0 100 100" fill="currentColor" className="w-10 h-10 text-primary">
                <path d="M32 10 L46 10 L38 50 L48 50 L45.2 64 L35.2 64 L30 90 L16 90 L21.2 64 L5.2 64 L8 50 L24 50 Z" />
                <path d="M68 90 L54 90 L62 50 L52 50 L54.8 36 L64.8 36 L70 10 L84 10 L78.8 36 L94.8 36 L92 50 L76 50 Z" />
              </svg>
              <div className="flex items-center text-3xl tracking-tight italic">
                <span className="font-black text-primary">HAP</span>
                <span className="font-black text-white">CARGO</span>
              </div>
            </div>
            <p className="text-white/50 text-sm mt-1">{t('loginSubtitle')}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">{t('email')}</label>
              <input
                type="email"
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-white/30 transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nume@hapcargo.ro"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">{t('password')}</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-white/30 transition-all pr-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                >
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-primary-dark hover:opacity-90 text-white font-bold rounded-xl py-3.5 transition-all shadow-lg shadow-primary/25 disabled:opacity-50 mt-4"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Se autentifică...
                </span>
              ) : t('signIn')}
            </button>
          </form>

          <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/5">
            <p className="text-[11px] text-white/40 font-medium uppercase tracking-wider mb-2">🔑 Credențiale Administrator</p>
            <p className="text-sm text-white/60">Email: <span className="font-mono font-medium text-white/90">{email}</span></p>
            <p className="text-sm text-white/60">Parolă: <span className="font-mono font-medium text-white/90">Admin2024!</span></p>
          </div>
        </div>
        
        {/* Footer text */}
        <div className="text-center mt-8 text-white/30 text-xs">
          &copy; {new Date().getFullYear()} HapCargo Transport S.R.L. Toate drepturile rezervate.
        </div>
      </div>
    </div>
  );
}
