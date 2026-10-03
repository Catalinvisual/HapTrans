import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Truck, LogIn } from 'lucide-react';
import portalApi from '../../lib/portalApi';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import styles from './PortalLoginPage.module.css';

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
  return <main className={styles.page}>
    <div className={styles.shell}>
      <section className={styles.intro} aria-labelledby="portal-title">
        <div className={styles.icon} aria-hidden="true"><Truck size={32} /></div>
        <h1 className={styles.title} id="portal-title">{t("jsx_clientPortal")}</h1>
        <p className={styles.subtitle}>{t("jsx_manageYourTra")}</p>
      </section>
      <div className={styles.formPanel}>
        <form className={styles.form} onSubmit={handleSubmit} aria-busy={loading}>
          <div>
            <label className={styles.label} htmlFor="portal-email">{t("jsx_emailAddress")}</label>
            <div className={styles.field}>
              <Mail size={20} className={styles.fieldIcon} aria-hidden="true" />
              <input id="portal-email" type="email" required autoComplete="username" className={styles.input} placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>
          <div>
            <label className={styles.label} htmlFor="portal-password">{t("jsx_password")}</label>
            <div className={styles.field}>
              <Lock size={20} className={styles.fieldIcon} aria-hidden="true" />
              <input id="portal-password" type="password" required autoComplete="current-password" className={styles.input} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
          </div>
          <div className={styles.options}>
            <div className={styles.remember}>
              <input id="remember-me" name="remember-me" type="checkbox" />
              <label htmlFor="remember-me">{t("jsx_rememberMe")}</label>
            </div>
            <a href="#" className={styles.recovery}>{t("jsx_forgotYourPas")}</a>
          </div>
          <button type="submit" disabled={loading} className={styles.submit}>
            {loading ? 'Signing in...' : <><LogIn size={20} aria-hidden="true" />{t("jsx_signIn")}</>}
          </button>
        </form>
      </div>
    </div>
  </main>;
}
