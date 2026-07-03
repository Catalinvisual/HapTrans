import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, MousePointerClick, FileText, Map, Phone, Briefcase, Truck, Mail, Users } from 'lucide-react';
import WebsiteLeadsPage from './WebsiteLeadsPage';
import WebsiteQuotesPage from './WebsiteQuotesPage';
import ContactInbox from './ContactInbox';
import WebsiteJobsTab from '../components/WebsiteJobsTab';
import api from '../lib/api';
import toast from 'react-hot-toast';
import CustomSelect from '../components/CustomSelect';

const WebsiteHubPage = () => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('quotes');
  const [editLang, setEditLang] = useState('RO');
  const [cmsData, setCmsData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/website-cms').then((res) => {
      setCmsData(res.data);
    });
  }, []);

  const handleSave = async (key: string, value: string) => {
    setSaving(true);
    try {
      await api.post('/website-cms', { [key]: value });
      setCmsData(prev => ({ ...prev, [key]: value }));
      toast.success(t('website_hub_saved_success', 'Modificările au fost salvate cu succes!'));
    } catch (e) {
      console.error(e);
      toast.error(t('website_hub_saved_error', 'Eroare la salvarea modificărilor.'));
    } finally {
      setSaving(false);
    }
  };

  const getQuotesTitle = () => {
    const lang = i18n.language?.substring(0, 2).toLowerCase();
    switch(lang) {
      case 'en': return 'Requests (Leads)';
      case 'nl': return 'Aanvragen (Leads)';
      case 'de': return 'Anfragen (Leads)';
      case 'fr': return 'Demandes (Leads)';
      case 'es': return 'Solicitudes (Leads)';
      default: return 'Cereri Ofertă';
    }
  };

  const tabs = [
    { id: 'quotes', label: t('website_hub_tabs_quotes', getQuotesTitle()), icon: FileText },
    { id: 'inbox', label: t('website_hub_tabs_inbox', 'Inbox Contact'), icon: Mail },
    { id: 'map', label: t('website_hub_tabs_map', 'Harta & Țări'), icon: Map },
    { id: 'about', label: t('website_hub_tabs_about', 'Despre Noi'), icon: FileText },
    { id: 'services', label: t('website_hub_tabs_services', 'Servicii'), icon: Briefcase },
    { id: 'fleet', label: t('website_hub_tabs_fleet', 'Flota'), icon: Truck },
    { id: 'jobs', label: t('website_hub_tabs_jobs', 'Cariere / Jobs'), icon: Users },
    { id: 'contact', label: t('website_hub_tabs_contact', 'Contact'), icon: Phone },
  ];


  const editLangs = ['RO', 'EN', 'NL', 'DE', 'FR', 'ES'];

  const getCmsKey = (tab: string, lang: string) => {
    return `${tab}_${lang}`;
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text flex items-center gap-3">
            <Globe className="w-8 h-8 text-primary" />
            {t('websiteHub', 'Website Hub')}
          </h1>
          <p className="text-text-secondary mt-2">{t('websiteHubSubtitle', 'Gestionează toate setările, paginile și cererile venite de pe site-ul public.')}</p>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        {/* Tabs Header */}
        <div className="flex overflow-x-auto border-b border-border hide-scrollbar bg-surface/50">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-primary text-primary bg-card'
                    : 'border-transparent text-text-secondary hover:text-text-secondary hover:border-border'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-text-light'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-4 md:p-6 bg-card min-h-[500px]">
          {activeTab === 'quotes' && (
            <div className="-m-4 md:-m-6">
              <WebsiteQuotesPage />
            </div>
          )}

          {activeTab === 'inbox' && (
            <ContactInbox />
          )}

          {activeTab === 'jobs' && (
            <WebsiteJobsTab 
              cmsData={cmsData} 
              editLang={editLang} 
              setEditLang={setEditLang}
              handleSave={handleSave} 
              saving={saving} 
            />
          )}
          
          {activeTab === 'map' && (
            <div className="max-w-2xl">
              <h3 className="text-lg font-semibold mb-4">{t('website_hub_countries_title', 'Țări Acoperite')}</h3>
              <p className="text-sm text-text-secondary mb-4">{t('website_hub_countries_desc', 'Adaugă codurile țărilor (ex: RO, DE, FR) separate prin virgulă pentru a afișa steagurile pe hartă.')}</p>
              <textarea
                className="w-full px-4 py-3 rounded-lg border border-border focus:ring-2 focus:ring-primary"
                rows={3}
                placeholder="RO, DE, FR, IT, NL..."
                value={cmsData['countries'] || ''}
                onChange={(e) => setCmsData({ ...cmsData, countries: e.target.value })}
              />
              <button 
                onClick={() => handleSave('countries', cmsData['countries'])}
                disabled={saving}
                className="mt-4 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark disabled:opacity-50"
              >
                {saving ? t('website_hub_saving', 'Se salvează...') : t('website_hub_save_countries', 'Salvează Țările')}
              </button>
            </div>
          )}

          {['about', 'services', 'fleet', 'contact'].includes(activeTab) && (
            <div className="max-w-4xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-border">
                <div>
                  <h3 className="text-lg font-semibold capitalize">
                    {t('website_hub_page_content_title', { defaultValue: `${activeTab} Page Content`, page: t(`website_hub_tabs_${activeTab}`) })}
                  </h3>
                  <p className="text-sm text-text-secondary mt-1">{t('website_hub_page_content_desc', 'Adaugă conținutul pentru această pagină. (Suportă HTML de bază).')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-semibold text-text-secondary whitespace-nowrap">{t('website_hub_edit_language', 'Limba de Editare')}:</label>
                  <CustomSelect 
                    value={editLang} 
                    onChange={val => setEditLang(val)}
                    className="w-32 text-sm font-semibold shadow-sm"
                    options={editLangs.map(l => ({ value: l, label: l }))}
                  />
                </div>
              </div>

              <textarea
                className="w-full px-4 py-3 rounded-lg border border-border focus:ring-2 focus:ring-primary font-mono text-sm"
                rows={12}
                placeholder={t('website_hub_placeholder_html', '<h1>Titlu Pagină</h1><p>Conținutul tău aici...</p>')}
                value={cmsData[getCmsKey(activeTab, editLang)] || ''}
                onChange={(e) => setCmsData({ ...cmsData, [getCmsKey(activeTab, editLang)]: e.target.value })}
              />
              <button 
                onClick={() => handleSave(getCmsKey(activeTab, editLang), cmsData[getCmsKey(activeTab, editLang)])}
                disabled={saving}
                className="mt-4 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark disabled:opacity-50"
              >
                {saving ? t('website_hub_saving', 'Se salvează...') : t('website_hub_save_content', 'Salvează Conținutul')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebsiteHubPage;
