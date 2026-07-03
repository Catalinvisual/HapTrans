import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Globe, Code, FileText, Truck, Building2 } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

const LANGUAGES = [
  { code: 'RO', label: 'Română' },
  { code: 'EN', label: 'Engleză' },
  { code: 'NL', label: 'Olandeză' },
  { code: 'DE', label: 'Germană' },
  { code: 'FR', label: 'Franceză' },
  { code: 'PL', label: 'Poloneză' },
];

const SECTIONS = [
  { id: 'about', title: 'Despre Noi', icon: Building2, desc: 'Afișat pe pagina /despre-noi. Folosiți <h3> pentru a crea carduri cu informații.' },
  { id: 'services', title: 'Servicii', icon: FileText, desc: 'Afișat pe pagina /servicii. Folosiți <h3> pentru a crea carduri cu servicii.' },
  { id: 'fleet', title: 'Flota', icon: Truck, desc: 'Afișat pe pagina /flota. Folosiți <h3> pentru a crea carduri cu camioane.' },
];

// Default HTML templates to help users if the field is empty
const DEFAULT_TEMPLATES: Record<string, string> = {
  about: `<h2>Cine suntem noi?</h2>
<p><strong>HapCargo</strong> s-a născut din pasiunea pentru un transport de marfă bine făcut, la timp și în deplină siguranță. Suntem o echipă tânără, extrem de ambițioasă, cu o abordare proaspătă a industriei logistice europene.</p>
<br/>
<h3>🎯 Misiunea Noastră</h3>
<p>Să oferim transparență 100% în fiecare stadiu al transportului.</p>
<h3>👁️ Viziunea Noastră</h3>
<p>Să devenim cel mai de încredere partener de transport rutier din Europa.</p>
<h3>⚡ Valorile Noastre</h3>
<p>Transparență, punctualitate, inovație și respect.</p>`,
  services: `<h2>Soluții Complete de Logistică</h2>
<p>La <strong>HapCargo</strong>, am dezvoltat un portofoliu de servicii flexibile.</p>
<br/>
<h3>🚚 Transport FTL (Full Truck Load)</h3>
<p>Camion complet dedicat exclusiv mărfii dumneavoastră.</p>
<h3>📦 Transport LTL (Grupaj)</h3>
<p>Soluția economică pentru expediții mai mici.</p>
<h3>⚡ Transport Express</h3>
<p>Livrăm oriunde în Europa în regim de maximă urgență.</p>`,
  fleet: `<h2>Flota Noastră Modernă</h2>
<p>Investim constant în utilaje noi pentru a asigura fiabilitatea transportului.</p>
<br/>
<h3>🚛 Mega Trailers (100mc)</h3>
<p>Ideale pentru mărfuri voluminoase.</p>
<h3>🚚 Semiremorci Standard (Tautliner)</h3>
<p>Perfecte pentru paleți generali.</p>
<h3>🚐 Dube Express 3.5t</h3>
<p>Pentru transporturi urgente door-to-door.</p>`,
};

const WebsiteCmsPage = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<Record<string, string>>({});
  const [selectedLang, setSelectedLang] = useState('RO');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await api.get('/website-cms');
      setData(res.data || {});
    } catch (err) {
      toast.error(t('cmsLoadError', 'Eroare la încărcarea datelor CMS'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/website-cms', data);
      toast.success(t('cmsSaved', 'Setările site-ului au fost salvate cu succes!'));
    } catch (err) {
      toast.error(t('cmsSaveError', 'Eroare la salvare'));
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return <div className="p-8">Se încarcă...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text">{t('cms.title', 'Conținut Website (CMS)')}</h1>
          <p className="text-text-secondary mt-2">{t('cms.subtitle', 'Editează conținutul dinamic de pe site-ul public hapcargo.com')}</p>
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

      <div className="bg-card rounded-xl shadow-sm border border-border p-6 mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-text">
          <Globe className="w-5 h-5 text-primary" />
          Rute & Destinații (Harta Europei din prima pagină)
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Țările în care efectuăm transporturi (separate prin virgulă)</label>
            <input
              type="text"
              className="input w-full"
              value={data['countries'] || ''}
              placeholder="Ex: România, Germania, Franța, Italia..."
              onChange={(e) => handleChange('countries', e.target.value)}
            />
            <p className="text-sm text-text-secondary mt-1">Aceste țări vor fi evidențiate automat pe harta interactivă din prima pagină a site-ului.</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border p-6 mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-text">
          <Globe className="w-5 h-5 text-primary" />
          Social Media
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">LinkedIn URL</label>
            <input
              type="text"
              className="input w-full"
              value={data['social_linkedin'] || ''}
              placeholder="https://linkedin.com/company/..."
              onChange={(e) => handleChange('social_linkedin', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Facebook URL</label>
            <input
              type="text"
              className="input w-full"
              value={data['social_facebook'] || ''}
              placeholder="https://facebook.com/..."
              onChange={(e) => handleChange('social_facebook', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Instagram URL</label>
            <input
              type="text"
              className="input w-full"
              value={data['social_instagram'] || ''}
              placeholder="https://instagram.com/..."
              onChange={(e) => handleChange('social_instagram', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">TikTok URL</label>
            <input
              type="text"
              className="input w-full"
              value={data['social_tiktok'] || ''}
              placeholder="https://tiktok.com/@..."
              onChange={(e) => handleChange('social_tiktok', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-border">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-text">
            <Code className="w-5 h-5 text-primary" />
            Pagini Interioare Website
          </h3>
          <div className="flex items-center gap-2 bg-background p-1 rounded-lg">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelectedLang(lang.code)}
                className={\`px-3 py-1.5 rounded-md text-sm font-medium transition-colors \${
                  selectedLang === lang.code 
                    ? 'bg-card text-primary shadow-sm' 
                    : 'text-text-secondary hover:text-text'
                }\`}
              >
                {lang.code}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          {SECTIONS.map((section) => {
            const key = \`\${section.id}_\${selectedLang}\`;
            const fallbackKey = section.id;
            const content = data[key] !== undefined ? data[key] : (data[fallbackKey] !== undefined && selectedLang === 'RO' ? data[fallbackKey] : '');
            
            return (
              <div key={section.id} className="space-y-2">
                <div className="flex items-center gap-2 text-text font-medium">
                  <section.icon className="w-4 h-4 text-text-secondary" />
                  {section.title} ({selectedLang})
                </div>
                <p className="text-sm text-text-secondary">{section.desc}</p>
                
                <div className="relative">
                  <textarea
                    className="input w-full font-mono text-sm"
                    rows={12}
                    value={content}
                    onChange={(e) => handleChange(key, e.target.value)}
                    placeholder={DEFAULT_TEMPLATES[section.id]}
                  />
                  {!content && (
                    <button 
                      onClick={() => handleChange(key, DEFAULT_TEMPLATES[section.id])}
                      className="absolute top-4 right-6 text-xs bg-primary text-white px-2 py-1 rounded hover:bg-primary-dark transition-colors"
                    >
                      Inserează șablon HTML
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WebsiteCmsPage;
