import { HelpCircle, Mail, Phone, MessageSquare } from 'lucide-react';
export default function PortalSupportPage() {
  return <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">{t("jsx_supportConta")}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-card border border-border rounded-2xl shadow-sm p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-bold mb-2">{t("jsx_callUs")}</h3>
          <p className="text-sm text-text-secondary">+40 700 000 000</p>
          <p className="text-xs text-text-secondary mt-1">{t("jsx_monFri0800")}</p>
        </div>
        
        <div className="card bg-card border border-border rounded-2xl shadow-sm p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-bold mb-2">{t("jsx_emailUs")}</h3>
          <p className="text-sm text-text-secondary">{t("jsx_supportHaptran")}</p>
          <p className="text-xs text-text-secondary mt-1">{t("jsx_247ResponseW")}</p>
        </div>

        <div className="card bg-card border border-border rounded-2xl shadow-sm p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-bold mb-2">{t("jsx_liveChat")}</h3>
          <p className="text-sm text-text-secondary">{t("jsx_chatWithOurD")}</p>
          <p className="text-xs text-text-secondary mt-1">{t("jsx_availableNow")}</p>
        </div>
      </div>

      <div className="card bg-card border border-border rounded-2xl shadow-sm p-6">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><HelpCircle className="w-5 h-5" />{t("jsx_sendAMessage")}</h3>
        <form className="space-y-4">
          <div>
            <label className="label">{t("jsx_subject")}</label>
            <input className="input" placeholder="E.g., Issue with Order #1024" />
          </div>
          <div>
            <label className="label">{t("jsx_message")}</label>
            <textarea className="input min-h-[150px]" placeholder="How can we help you?"></textarea>
          </div>
          <button type="button" className="btn-primary py-2 px-6">{t("jsx_sendMessage")}</button>
        </form>
      </div>
    </div>;
}