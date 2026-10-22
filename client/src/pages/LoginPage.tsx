import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Eye, EyeOff, AlertTriangle, KeyRound } from 'lucide-react';
import LanguageDropdown from '../components/LanguageDropdown';

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const isLocalHost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick token import for local development
  const [showTokenHelper, setShowTokenHelper] = useState(false);
  const [quickToken, setQuickToken] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      toast.error('Vă rugăm să introduceți emailul și parola.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const { data } = await api.post('/auth/login', {
        email: cleanEmail,
        password,
      });
      setAuth(data.user, data.access_token);
      toast.success(`${t('welcomeUser')}${data.user.name}!`);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      const serverMsg = err.response?.data?.message;
      let displayMsg = '';
      if (typeof serverMsg === 'string' && serverMsg.length > 0) {
        displayMsg = serverMsg;
      } else if (Array.isArray(serverMsg) && serverMsg.length > 0) {
        displayMsg = serverMsg.join(', ');
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        displayMsg = 'Eroare de conexiune la server (CORS / Network Error). Vă rugăm să verificați conexiunea la internet.';
      }

      const lang = i18n.language;
      const defaultMsg =
        lang === 'en'
          ? 'Authentication Error: The email or password entered is incorrect. Please verify your credentials and try again.'
          : lang === 'nl'
          ? 'Inlogfout: Het ingevoerde e-mailadres of wachtwoord is onjuist. Controleer uw gegevens en probeer het opnieuw.'
          : lang === 'de'
          ? 'Anmeldefehler: Die eingegebene E-Mail-Adresse oder das Passwort ist falsch. Bitte überprüfen Sie Ihre Daten und versuchen Sie es erneut.'
          : lang === 'fr'
          ? "Erreur d'authentification : L'adresse e-mail ou le mot de passe entré est incorrect. Veuillez vérifier vos identifiants et réessayer."
          : 'Eroare de autentificare: Emailul sau parola introduse sunt incorecte. Te rugăm să verifici datele și să încerci din nou.';

      const finalMsg = displayMsg || defaultMsg;
      setErrorMessage(finalMsg);
      toast.error(finalMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyQuickToken = () => {
    const raw = quickToken.trim();
    if (!raw) {
      toast.error('Introduceți tokenul!');
      return;
    }
    try {
      const token = raw.replace(/^Bearer\s+/i, '');
      const parts = token.split('.');
      let user: any = { id: 'admin', email: 'admin@hapcargo.ro', name: 'Administrator', role: 'admin' };
      if (parts.length === 3) {
        try {
          const payload = JSON.parse(atob(parts[1]));
          user = {
            id: payload.sub || 'admin',
            email: payload.email || 'admin@hapcargo.ro',
            name: payload.name || payload.email || 'Administrator',
            role: payload.role || 'admin',
          };
        } catch (e) {
          console.warn('Could not decode JWT payload:', e);
        }
      }
      setAuth(user, token);
      toast.success('Autentificare cu succes pe localhost!');
      navigate('/dashboard');
    } catch (e) {
      toast.error('Token invalid!');
    }
  };

  const rightsReservedText =
    i18n.language === 'en'
      ? 'All rights reserved.'
      : i18n.language === 'nl'
      ? 'Alle rechten voorbehouden.'
      : i18n.language === 'de'
      ? 'Alle Rechte vorbehalten.'
      : i18n.language === 'fr'
      ? 'Tous droits réservés.'
      : i18n.language === 'pl'
      ? 'Wszelkie prawa zastrzeżone.'
      : 'Toate drepturile rezervate.';

  const loadingText =
    i18n.language === 'en'
      ? 'Signing in...'
      : i18n.language === 'nl'
      ? 'Inloggen...'
      : i18n.language === 'de'
      ? 'Anmeldung...'
      : i18n.language === 'fr'
      ? 'Connexion...'
      : 'Se autentifică...';

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
        <div className="bg-card/5 backdrop-blur-xl border border-white/10 rounded-3xl p-10 shadow-2xl animate-fade-in-up">
          <div className="flex flex-col items-center mb-8">
            <div className="flex flex-col items-center gap-2 mb-2">
              <img src="/footer-logo.png" alt="Company Logo" className="h-20 w-auto max-w-full object-contain" />
            </div>
            <p className="text-white/50 text-sm mt-1">{t('loginSubtitle')}</p>
          </div>

          {errorMessage && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-2xl flex items-start gap-3 animate-fade-in">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed font-medium flex-1">
                {errorMessage}
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
                {t('email')}
              </label>
              <input
                type="email"
                className="w-full bg-card/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-white/30 transition-all"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="nume@hapcargo.ro"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
                {t('password')}
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="w-full bg-card/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-white/30 transition-all pr-11"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
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
              className="w-full bg-gradient-to-r from-primary to-primary-dark hover:opacity-90 text-white font-bold rounded-xl py-3.5 transition-all shadow-lg shadow-primary/25 disabled:opacity-50 mt-4 cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {loadingText}
                </span>
              ) : (
                t('signIn')
              )}
            </button>
          </form>

          {/* Localhost helper to paste production token if needed */}
          {isLocalHost && (
            <div className="mt-6 pt-4 border-t border-white/10 text-center">
              <button
                type="button"
                onClick={() => setShowTokenHelper(!showTokenHelper)}
                className="text-xs text-white/50 hover:text-white/80 transition-colors inline-flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5 text-primary" />
                {showTokenHelper ? 'Ascunde opțiuni rapide' : 'Conectare rapidă cu Token (Localhost)'}
              </button>

              {showTokenHelper && (
                <div className="mt-3 p-3 bg-white/5 border border-white/10 rounded-xl text-left animate-fade-in text-xs space-y-2">
                  <p className="text-white/60 text-[11px] leading-relaxed">
                    Dacă ești deja logat în producție, poți lipi tokenul JWT din <code className="text-primary bg-black/30 px-1 rounded">localStorage.hapcargo_token</code>:
                  </p>
                  <textarea
                    rows={2}
                    className="w-full bg-black/30 border border-white/10 text-white rounded-lg p-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary font-mono placeholder:text-white/20"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={quickToken}
                    onChange={(e) => setQuickToken(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleApplyQuickToken}
                    className="w-full bg-primary/80 hover:bg-primary text-white font-semibold py-2 rounded-lg text-xs transition-colors"
                  >
                    Activează Sesiunea pe Localhost
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer text */}
        <div className="text-center mt-8 text-white/30 text-xs">
          &copy; 2026-{new Date().getFullYear()} {t('jsx_hapCargoTransp')} {rightsReservedText}
        </div>
      </div>
    </div>
  );
}