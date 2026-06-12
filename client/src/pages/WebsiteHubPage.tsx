import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, MousePointerClick, FileText, Map, Phone, Briefcase, Truck, Mail } from 'lucide-react';
import WebsiteLeadsPage from './WebsiteLeadsPage';
import ContactInbox from './ContactInbox';
import api from '../lib/api';

const WebsiteHubPage = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('leads');
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
      // Optional: add toast notification here
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'leads', label: 'Cereri (Leads)', icon: MousePointerClick },
    { id: 'inbox', label: 'Inbox Contact', icon: Mail },
    { id: 'map', label: 'Harta & Țări', icon: Map },
    { id: 'about', label: 'Despre Noi', icon: FileText },
    { id: 'services', label: 'Servicii', icon: Briefcase },
    { id: 'fleet', label: 'Flota', icon: Truck },
    { id: 'contact', label: 'Contact', icon: Phone },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
            <Globe className="w-8 h-8 text-blue-600" />
            Website Hub
          </h1>
          <p className="text-gray-500 mt-2">Gestionează toate setările, paginile și cererile venite de pe site-ul public.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Tabs Header */}
        <div className="flex overflow-x-auto border-b border-gray-200 hide-scrollbar bg-gray-50/50">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-0 md:p-6 bg-white min-h-[500px]">
          {activeTab === 'leads' && (
            <div className="-m-8">
              <WebsiteLeadsPage />
            </div>
          )}

          {activeTab === 'inbox' && (
            <ContactInbox />
          )}
          
          {activeTab === 'map' && (
            <div className="max-w-2xl">
              <h3 className="text-lg font-semibold mb-4">Țări Acoperite</h3>
              <p className="text-sm text-gray-500 mb-4">Adaugă codurile țărilor (ex: RO, DE, FR) separate prin virgulă pentru a afișa steagurile pe hartă.</p>
              <textarea
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="RO, DE, FR, IT, NL..."
                value={cmsData['countries'] || ''}
                onChange={(e) => setCmsData({ ...cmsData, countries: e.target.value })}
              />
              <button 
                onClick={() => handleSave('countries', cmsData['countries'])}
                disabled={saving}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Se salvează...' : 'Salvează Țările'}
              </button>
            </div>
          )}

          {['about', 'services', 'fleet', 'contact'].includes(activeTab) && (
            <div className="max-w-4xl">
              <h3 className="text-lg font-semibold mb-4 capitalize">{activeTab} Page Content</h3>
              <p className="text-sm text-gray-500 mb-4">Adaugă conținutul pentru această pagină. (Suportă HTML de bază).</p>
              <textarea
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                rows={12}
                placeholder="<h1>Titlu Pagină</h1><p>Conținutul tău aici...</p>"
                value={cmsData[activeTab] || ''}
                onChange={(e) => setCmsData({ ...cmsData, [activeTab]: e.target.value })}
              />
              <button 
                onClick={() => handleSave(activeTab, cmsData[activeTab])}
                disabled={saving}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Se salvează...' : 'Salvează Conținutul'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebsiteHubPage;
