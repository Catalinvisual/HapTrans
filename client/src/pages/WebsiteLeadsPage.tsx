import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Pagination from '../components/Pagination';
interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  from: string;
  to: string;
  weight: string;
  type: string;
  notes: string;
  pallets?: string;
  estimatedPrice?: string;
  status: 'new' | 'contacted' | 'quoted' | 'accepted' | 'rejected';
  source: string;
  createdAt: string;
}
const WebsiteLeadsPage = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const {
    t,
    i18n
  } = useTranslation();
  const navigate = useNavigate();
  const getLabel = (enText: string, roText: string, nlText: string, deText: string, frText: string, plText: string) => {
    const lang = i18n.language;
    if (lang === 'ro') return roText;
    if (lang === 'nl') return nlText;
    if (lang === 'de') return deText;
    if (lang === 'fr') return frText;
    if (lang === 'pl') return plText;
    return enText;
  };
  const fetchLeads = async () => {
    try {
      const {
        data
      } = await api.get('/leads');
      setLeads(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch leads', error);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchLeads();
  }, []);
  const convertToQuote = async (id: string) => {
    try {
      await api.post(`/leads/${id}/convert-quote`);
      toast.success(getLabel("Successfully converted to Quote!", "Transformat în Ofertă cu succes!", "Succesvol omgezet naar Offerte!", "Erfolgreich in Angebot umgewandelt!", "Converti en devis avec succès !", "Pomyślnie przekonwertowano na wycenę!"));
      fetchLeads();
    } catch (error) {
      console.error('Failed to convert to quote', error);
      toast.error(t("toast_failedToConve"));
    }
  };
  const updateStatus = async (id: string, status: string) => {
    try {
      if (status === 'accepted') {
        const {
          data
        } = await api.post(`/leads/${id}/convert`);
        if (data && data.tripId) {
          navigate(`/trips`); // the trip is created, go to trips list or edit
        }
      } else {
        await api.patch(`/leads/${id}`, {
          status
        });
      }
      fetchLeads();
    } catch (error) {
      console.error('Failed to update lead status', error);
    }
  };
  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800 border-blue-200',
      contacted: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      quoted: 'bg-purple-100 text-purple-800 border-purple-200',
      accepted: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200'
    };
    const displayStatus = status || 'new';
    return <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colors[displayStatus] || 'bg-surface text-text border-border'}`}>
        {displayStatus.toUpperCase()}
      </span>;
  };
  if (loading) return <div className="p-8">{t('common.loading', 'Se încarcă cererile...')}</div>;
  return <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text">{t('leads.title', 'Cereri Website (Leads)')}</h1>
        <p className="text-text-secondary mt-2">{t('leads.subtitle', 'Gestionează cererile de ofertă venite de pe site-ul public hapcargo.com.')}</p>
      </div>

      <div className="grid gap-6">
        {leads.length === 0 ? <div className="bg-card rounded-xl shadow-sm border border-border">
            <div className="p-8 text-center text-text-secondary">
              {t('leads.noLeads', 'Nu există nicio cerere momentan.')}
            </div>
          </div> : leads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(lead => <div key={lead.id} className="bg-card rounded-xl shadow-sm overflow-hidden border border-border">
              <div className="flex flex-col lg:flex-row">
                <div className="p-6 flex-1 border-b lg:border-b-0 lg:border-r border-border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{lead.name}</h3>
                    {getStatusBadge(lead.status)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-text-secondary mb-1">{t('common.contact', 'Contact')}</p>
                      <p className="font-medium">📞 {lead.phone}</p>
                      <p className="font-medium">📧 {lead.email}</p>
                    </div>
                    <div>
                      <p className="text-text-secondary mb-1">{t('leads.freightDetails', 'Detalii Marfă')}</p>
                      <p className="font-medium">⚖️ {lead.weight}</p>
                      <p className="font-medium">📦 {lead.type || t('common.unspecified', 'Nespecificat')}</p>
                      {lead.pallets && <p className="font-medium">🏢 {getLabel("Pallets", "Paleți", "Pallets", "Paletten", "Palettes", "Palety")}: {lead.pallets}</p>}
                    </div>
                  </div>

                  <div className="bg-surface p-4 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-xs text-text-secondary uppercase tracking-wider font-semibold mb-1">{t('common.from', 'De la')}</p>
                        <p className="font-medium">{lead.from}</p>
                      </div>
                      <div className="text-text-light">➔</div>
                      <div className="flex-1">
                        <p className="text-xs text-text-secondary uppercase tracking-wider font-semibold mb-1">{t('common.to', 'Până la')}</p>
                        <p className="font-medium">{lead.to}</p>
                      </div>
                    </div>
                  </div>

                  {lead.estimatedPrice && <div className="mt-4 p-3 bg-green-50 text-green-900 rounded-md text-sm border border-green-200 flex items-center gap-2">
                      <span className="font-bold">📊 {getLabel("Estimated Price seen by client", "Preț estimat văzut de client", "Geschatte prijs gezien door klant", "Vom Kunden gesehener geschätzter Preis", "Prix estimé vu par le client", "Szacowana cena widzana przez klienta")}:</span> {lead.estimatedPrice}
                    </div>}

                  {lead.notes && <div className="mt-4 p-3 bg-blue-50 text-blue-900 rounded-md text-sm border border-blue-100">
                      <strong>{t('common.notes', 'Observații')}:</strong> {lead.notes}
                    </div>}
                </div>
                
                <div className="p-6 lg:w-64 bg-surface flex flex-col justify-center gap-3">
                  <p className="text-xs text-text-secondary text-center mb-2">{t('common.quickActions', 'Acțiuni Rapide')}</p>
                  
                  {lead.status === 'new' && <button onClick={() => updateStatus(lead.id, 'contacted')} className="w-full py-2 px-4 rounded font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                      📞 {t('leads.markCalled', 'Marchează "Sunat"')}
                    </button>}
                  
                  {['new', 'contacted'].includes(lead.status) && <button onClick={() => convertToQuote(lead.id)} className="w-full py-2 px-4 rounded font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors flex items-center justify-center gap-2">
                      📝 {getLabel("Convert to Quote", "Transformă în Ofertă", "Omzetten naar Offerte", "In Angebot umwandeln", "Convertir en devis", "Konwertuj na wycenę")}
                    </button>}
                  
                  {['contacted', 'quoted'].includes(lead.status) && <button onClick={() => updateStatus(lead.id, 'accepted')} className="w-full py-2 px-4 rounded font-medium text-white bg-green-600 hover:bg-green-700 transition-colors">
                      ✅ {t('leads.convertToOrder', 'Transformă în Comandă')}
                    </button>}

                  {!['accepted', 'rejected'].includes(lead.status) && <button onClick={() => updateStatus(lead.id, 'rejected')} className="w-full py-2 px-4 rounded font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                      ❌ {t('leads.reject', 'Respins')}
                    </button>}

                  {['accepted', 'rejected'].includes(lead.status) && <div className="text-center text-sm font-medium text-text-secondary mt-2">{t("jsx_cerereFinaliza")}</div>}
                  
                  <div className="text-center text-xs text-text-light mt-auto pt-4">{t("jsx_primit")}{lead.createdAt ? new Date(lead.createdAt).toLocaleString('ro-RO') : ''}
                  </div>
                </div>
              </div>
            </div>)}
      </div>
      <Pagination currentPage={currentPage} totalItems={leads.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
    </div>;
};
export default WebsiteLeadsPage;