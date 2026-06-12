import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Globe } from 'lucide-react';

const WebsiteCmsPage = () => {
  const { t } = useTranslation();
  const [countries, setCountries] = useState('România, Germania, Franța, Italia, Olanda, Belgia, Austria');
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    // Simulate API call
    setTimeout(() => {
      setSaving(false);
      alert('Setările site-ului au fost salvate cu succes!');
    }, 1000);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">{t('cms.title', 'Conținut Website (CMS)')}</h1>
          <p className="text-gray-500 mt-2">{t('cms.subtitle', 'Editează conținutul dinamic de pe site-ul public hapcargo.com')}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? t('common.saving', 'Se salvează...') : t('common.save', 'Salvează Modificările')}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-gray-800">
          <Globe className="w-5 h-5 text-blue-500" />
          Rute & Destinații (Harta Europei)
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Țările în care efectuăm transporturi (separate prin virgulă)</label>
            <textarea
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              rows={3}
              value={countries}
              onChange={(e) => setCountries(e.target.value)}
            />
            <p className="text-sm text-gray-500 mt-1">Aceste țări vor fi evidențiate automat pe harta interactivă din prima pagină a site-ului.</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-gray-800">
          Sistem de Prețuri (Calculator)
        </h3>
        <p className="text-gray-500 mb-4">Aici vei putea seta prețul per KM sau tarifele standard, pentru moment calculatorul rulează în modul "estimare cerere" fără a afișa prețul final pe site (așa cum am convenit).</p>
      </div>

    </div>
  );
};

export default WebsiteCmsPage;
