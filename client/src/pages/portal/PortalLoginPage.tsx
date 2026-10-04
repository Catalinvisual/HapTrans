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
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-[#f7f6f2]">
      {/* Decorative premium background elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-gradient-to-b from-[#ff6a2b0a] to-transparent pointer-events-none rounded-full blur-3xl opacity-70" />
      <div className="absolute bottom-0 left-[-20%] w-[800px] h-[800px] bg-[radial-gradient(ellipse_at_center,_#ff6a2b0a,_transparent_60%)] pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-[radial-gradient(ellipse_at_center,_#395f6d0f,_transparent_60%)] pointer-events-none" />

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-[440px]">
        <div className="flex justify-center mb-8">
          <div className="w-[72px] h-[72px] rounded-3xl bg-[#FF6A2B] flex items-center justify-center shadow-[0_16px_32px_-12px_rgba(255,106,43,0.6)] animate-fade-in-up">
            <Truck className="w-9 h-9 text-white" />
          </div>
        </div>
        <h2 className="text-center text-[2rem] font-[800] tracking-[-0.03em] text-[#172630] mb-2 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
          {t("jsx_clientPortal")}
        </h2>
        <p className="text-center text-[0.95rem] text-[#657079] animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          {t("jsx_manageYourTra")}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[440px] relative z-10 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
        <div className="bg-white py-10 px-6 sm:px-10 rounded-[28px] shadow-[0_24px_64px_-32px_rgba(23,38,48,0.22),_0_2px_8px_rgba(23,38,48,0.025)] border border-[#2e3a450a]">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-[0.9rem] font-[600] text-[#172630] mb-2">{t("jsx_emailAddress")}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-[18px] w-[18px] text-[#657079]" />
                </div>
                <input 
                  type="email" 
                  required 
                  className="w-full pl-[2.6rem] pr-4 py-3 bg-white border border-[#2e3a4515] rounded-2xl text-[0.95rem] text-[#172630] transition-all duration-200 outline-none focus:border-[#FF6A2B] focus:ring-[4px] focus:ring-[#FF6A2B]/15 placeholder:text-[#a0acb5]" 
                  placeholder="you@company.com" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                />
              </div>
            </div>

            <div>
              <label className="block text-[0.9rem] font-[600] text-[#172630] mb-2">{t("jsx_password")}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-[18px] w-[18px] text-[#657079]" />
                </div>
                <input 
                  type="password" 
                  required 
                  className="w-full pl-[2.6rem] pr-4 py-3 bg-white border border-[#2e3a4515] rounded-2xl text-[0.95rem] text-[#172630] transition-all duration-200 outline-none focus:border-[#FF6A2B] focus:ring-[4px] focus:ring-[#FF6A2B]/15 placeholder:text-[#a0acb5]" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center">
                <input 
                  id="remember-me" 
                  name="remember-me" 
                  type="checkbox" 
                  className="h-4 w-4 text-[#FF6A2B] focus:ring-[#FF6A2B] border-[#2e3a4520] rounded" 
                />
                <label htmlFor="remember-me" className="ml-2.5 block text-sm text-[#657079] select-none cursor-pointer hover:text-[#172630] transition-colors">{t("jsx_rememberMe")}</label>
              </div>
              <div className="text-sm">
                <a href="#" className="font-[600] text-[#0F6FFF] hover:text-[#0a52cc] transition-colors">{t("jsx_forgotYourPas")}</a>
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full flex justify-center items-center py-3.5 px-4 rounded-[14px] text-[0.95rem] font-[700] text-[#172630] bg-[#FF6A2B] shadow-[0_10px_24px_-12px_rgba(255,106,43,0.55)] hover:-translate-y-[2px] hover:shadow-[0_14px_28px_-14px_rgba(255,106,43,0.7)] hover:bg-[#FF814D] active:translate-y-0 transition-all outline-none focus-visible:ring-[4px] focus-visible:ring-[#FF6A2B]/20 disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {loading ? 'Autentificare...' : <><LogIn className="w-[18px] h-[18px] mr-2" />{t("jsx_signIn")}</>}
              </button>
            </div>
          </form>
        </div>
        <p className="text-center text-sm text-[#657079] mt-8">
          HapCargo TMS © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}