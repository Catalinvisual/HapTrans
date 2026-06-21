import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { useTranslation } from 'react-i18next';
import { Download, Filter, Calendar, Eye, ChevronDown, ChevronUp, Truck } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import { QuoteReplyForm } from './QuoteReplyForm';
import { useNavigate } from 'react-router-dom';

interface QuoteReply {
  id: string;
  quoteRequestId: string;
  message?: string;
  price?: number;
  pickupDate?: string;
  deliveryDate?: string;
  validUntil?: string;
  sentBy?: string;
  sentAt: string;
}

interface QuoteRequest {
  id: string;
  companyName: string;
  contactPerson?: string;
  phone: string;
  email: string;
  preferredContactMethod: string;
  loadingLocation: string;
  unloadingLocation: string;
  loadingDate: string;
  loadingTime: string;
  unloadingDate: string;
  unloadingTime: string;
  cargoType: string;
  cargoWeightKg: string;
  numberOfPallets: string;
  cargoVolumeM3: string;
  isUrgent: boolean;
  truckType: string;
  temperatureRequired: string;
  notes: string;
  attachmentUrl: string;
  status: 'new' | 'reviewing' | 'contacted' | 'quoted' | 'accepted' | 'rejected';
  createdAt: string;
  replies?: QuoteReply[];
}

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
};

// Local translations for the Quotes Page
const translations: Record<string, Record<string, string>> = {
  ro: {
    filter_requests: 'Filtrează cererile:',
    all_statuses: 'Toate statusurile',
    status_new: 'Nou',
    status_reviewing: 'În analiză',
    status_contacted: 'Contactat',
    status_quoted: 'Ofertat',
    status_accepted: 'Acceptat',
    status_rejected: 'Respins',
    clear_filters: 'Șterge filtre',
    no_requests_found: 'Nu a fost găsită nicio cerere cu aceste filtre.',
    urgent: 'URGENT',
    contact: 'Contact',
    preference: 'Preferință',
    unspecified: 'Nespecificat',
    cargo_details: 'Detalii Marfă',
    type: 'Tip',
    weight: 'Greutate',
    pallets: 'Paleți',
    volume: 'Volum',
    required_truck: 'Camion Necesar',
    temp: 'Temp',
    loading: 'Încărcare',
    unloading: 'Descărcare',
    client_notes: 'Observații client',
    view_file: 'Vizualizare',
    download_file: 'Descarcă',
    modify_status: 'Modifică Status',
    received_at: 'Primită la:',
    loading_requests: 'Se încarcă cererile...',
    reply: 'Răspunde', send_reply: 'Trimite Oferta', price_eur: 'Preț (€)', valid_until: 'Valabil până la', reply_history: 'Istoric Răspunsuri', reply_message: 'Mesaj / Ofertă', reply_success: 'Răspuns trimis cu succes!', create_transport: 'Creează cursă din ofertă'
  },
  en: {
    filter_requests: 'Filter requests:',
    all_statuses: 'All statuses',
    status_new: 'New',
    status_reviewing: 'Reviewing',
    status_contacted: 'Contacted',
    status_quoted: 'Quoted',
    status_accepted: 'Accepted',
    status_rejected: 'Rejected',
    clear_filters: 'Clear filters',
    no_requests_found: 'No requests found with these filters.',
    urgent: 'URGENT',
    contact: 'Contact',
    preference: 'Preference',
    unspecified: 'Unspecified',
    cargo_details: 'Cargo Details',
    type: 'Type',
    weight: 'Weight',
    pallets: 'Pallets',
    volume: 'Volume',
    required_truck: 'Required Truck',
    temp: 'Temp',
    loading: 'Loading',
    unloading: 'Unloading',
    client_notes: 'Client notes',
    view_file: 'View',
    download_file: 'Download',
    modify_status: 'Modify Status',
    received_at: 'Received at:',
    loading_requests: 'Loading requests...',
    reply: 'Reply', send_reply: 'Send Offer', price_eur: 'Price (€)', valid_until: 'Valid until', reply_history: 'Reply History', reply_message: 'Message / Offer', reply_success: 'Reply sent successfully!', create_transport: 'Create transport from quote'
  },
  nl: {
    filter_requests: 'Verzoeken filteren:',
    all_statuses: 'Alle statussen',
    status_new: 'Nieuw',
    status_reviewing: 'Beoordelen',
    status_contacted: 'Gecontacteerd',
    status_quoted: 'Geoffreerd',
    status_accepted: 'Geaccepteerd',
    status_rejected: 'Geweigerd',
    clear_filters: 'Filters wissen',
    no_requests_found: 'Geen verzoeken gevonden met deze filters.',
    urgent: 'URGENT',
    contact: 'Contact',
    preference: 'Voorkeur',
    unspecified: 'Niet gespecificeerd',
    cargo_details: 'Ladinggegevens',
    type: 'Type',
    weight: 'Gewicht',
    pallets: 'Pallets',
    volume: 'Volume',
    required_truck: 'Benodigd voertuig',
    temp: 'Temp',
    loading: 'Laden',
    unloading: 'Lossen',
    client_notes: 'Klant opmerkingen',
    view_file: 'Bekijken',
    download_file: 'Downloaden',
    modify_status: 'Status wijzigen',
    received_at: 'Ontvangen op:',
    loading_requests: 'Verzoeken laden...',
    reply: 'Beantwoorden', send_reply: 'Offerte verzenden', price_eur: 'Prijs (€)', valid_until: 'Geldig tot', reply_history: 'Antwoordgeschiedenis', reply_message: 'Bericht / Offerte', reply_success: 'Antwoord succesvol verzonden!', create_transport: 'Maak transport van offerte'
  },
  de: {
    filter_requests: 'Anfragen filtern:',
    all_statuses: 'Alle Status',
    status_new: 'Neu',
    status_reviewing: 'In Prüfung',
    status_contacted: 'Kontaktiert',
    status_quoted: 'Angeboten',
    status_accepted: 'Akzeptiert',
    status_rejected: 'Abgelehnt',
    clear_filters: 'Filter löschen',
    no_requests_found: 'Keine Anfragen mit diesen Filtern gefunden.',
    urgent: 'DRINGEND',
    contact: 'Kontakt',
    preference: 'Präferenz',
    unspecified: 'Nicht angegeben',
    cargo_details: 'Frachtdetails',
    type: 'Typ',
    weight: 'Gewicht',
    pallets: 'Paletten',
    volume: 'Volumen',
    required_truck: 'Erforderlicher LKW',
    temp: 'Temp',
    loading: 'Beladung',
    unloading: 'Entladung',
    client_notes: 'Kundennotizen',
    view_file: 'Ansehen',
    download_file: 'Herunterladen',
    modify_status: 'Status ändern',
    received_at: 'Erhalten am:',
    loading_requests: 'Lade Anfragen...',
    reply: 'Antworten', send_reply: 'Angebot senden', price_eur: 'Preis (€)', valid_until: 'Gültig bis', reply_history: 'Antwortverlauf', reply_message: 'Nachricht / Angebot', reply_success: 'Antwort erfolgreich gesendet!', create_transport: 'Transport aus Angebot erstellen'
  },
  fr: {
    filter_requests: 'Filtrer les demandes:',
    all_statuses: 'Tous les statuts',
    status_new: 'Nouveau',
    status_reviewing: 'En révision',
    status_contacted: 'Contacté',
    status_quoted: 'Coté',
    status_accepted: 'Accepté',
    status_rejected: 'Rejeté',
    clear_filters: 'Effacer les filtres',
    no_requests_found: 'Aucune demande trouvée avec ces filtres.',
    urgent: 'URGENT',
    contact: 'Contact',
    preference: 'Préférence',
    unspecified: 'Non spécifié',
    cargo_details: 'Détails de la cargaison',
    type: 'Type',
    weight: 'Poids',
    pallets: 'Palettes',
    volume: 'Volume',
    required_truck: 'Camion requis',
    temp: 'Temp',
    loading: 'Chargement',
    unloading: 'Déchargement',
    client_notes: 'Notes du client',
    view_file: 'Voir',
    download_file: 'Télécharger',
    modify_status: 'Modifier le statut',
    received_at: 'Reçu le :',
    loading_requests: 'Chargement des demandes...',
    reply: 'Répondre', send_reply: 'Envoyer l\'offre', price_eur: 'Prix (€)', valid_until: 'Valable jusqu\'au', reply_history: 'Historique des réponses', reply_message: 'Message / Offre', reply_success: 'Réponse envoyée avec succès !', create_transport: 'Créer un transport à partir du devis'
  },
  es: {
    filter_requests: 'Filtrar solicitudes:',
    all_statuses: 'Todos los estados',
    status_new: 'Nuevo',
    status_reviewing: 'En revisión',
    status_contacted: 'Contactado',
    status_quoted: 'Cotizado',
    status_accepted: 'Aceptado',
    status_rejected: 'Rechazado',
    clear_filters: 'Borrar filtros',
    no_requests_found: 'No se encontraron solicitudes con estos filtros.',
    urgent: 'URGENTE',
    contact: 'Contacto',
    preference: 'Preferencia',
    unspecified: 'No especificado',
    cargo_details: 'Detalles de carga',
    type: 'Tipo',
    weight: 'Peso',
    pallets: 'Palets',
    volume: 'Volumen',
    required_truck: 'Camión requerido',
    temp: 'Temp',
    loading: 'Carga',
    unloading: 'Descarga',
    client_notes: 'Notas del cliente',
    view_file: 'Ver',
    download_file: 'Descargar',
    modify_status: 'Modificar estado',
    received_at: 'Recibido en:',
    loading_requests: 'Cargando solicitudes...',
    reply: 'Responder', send_reply: 'Enviar Oferta', price_eur: 'Precio (€)', valid_until: 'Válido hasta', reply_history: 'Historial de Respuestas', reply_message: 'Mensaje / Oferta', reply_success: '¡Respuesta enviada con éxito!', create_transport: 'Crear transporte a partir de cotización'
  }
};

const WebsiteQuotesPage = () => {
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null);
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  
  const currentLang = i18n.language?.substring(0, 2).toLowerCase() || 'ro';
  const tLocal = (key: string) => translations[currentLang]?.[key] || translations['en'][key] || key;

  const fetchQuotes = async () => {
    try {
      const { data } = await api.get('/quotes');
      setQuotes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch quote requests', error);
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/quotes/${id}`, { status });
      fetchQuotes();
    } catch (error) {
      console.error('Failed to update quote status', error);
    }
  };

  const handleCreateTripFromQuote = (quote: QuoteRequest) => {
    let finalNotes = quote.notes || '';
    if (quote.truckType) {
      finalNotes += (finalNotes ? '\n' : '') + `Requested Truck: ${quote.truckType}`;
    }
    if (quote.attachmentUrl) {
      finalNotes += (finalNotes ? '\n' : '') + `Attachment: ${quote.attachmentUrl}`;
    }

    const prefilledData = {
      pickupCompanyName: quote.companyName,
      pickupAddress: quote.loadingLocation,
      dropoffAddress: quote.unloadingLocation,
      pickupDate: quote.loadingDate,
      pickupTime: quote.loadingTime,
      dropoffDate: quote.unloadingDate,
      dropoffTime: quote.unloadingTime,
      pallets: quote.numberOfPallets,
      weightKg: quote.cargoWeightKg,
      volumeCbm: quote.cargoVolumeM3,
      notes: finalNotes,
      price: quote.replies && quote.replies.length > 0 ? quote.replies[quote.replies.length - 1].price : '',
      clientName: quote.companyName, // if we want to try matching or saving it
      contactPerson: quote.contactPerson,
      phone: quote.phone,
      email: quote.email
    };
    navigate('/trips', { state: { createFromQuote: prefilledData } });
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-orange-100 text-orange-800 border-orange-200',
      reviewing: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      contacted: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      quoted: 'bg-purple-100 text-purple-800 border-purple-200',
      accepted: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200'
    };
    
    const displayStatus = status || 'new';

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colors[displayStatus] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
        {tLocal(`status_${displayStatus}`).toUpperCase()}
      </span>
    );
  };

  const filteredQuotes = quotes.filter(q => {
    if (statusFilter !== 'all' && q.status !== statusFilter) return false;
    if (dateFilter) {
      const qDate = new Date(q.createdAt).toISOString().split('T')[0];
      if (qDate !== dateFilter) return false;
    }
    return true;
  });

  const statusOptions = [
    { value: 'all', label: tLocal('all_statuses') },
    { value: 'new', label: tLocal('status_new') },
    { value: 'reviewing', label: tLocal('status_reviewing') },
    { value: 'contacted', label: tLocal('status_contacted') },
    { value: 'quoted', label: tLocal('status_quoted') },
    { value: 'accepted', label: tLocal('status_accepted') },
    { value: 'rejected', label: tLocal('status_rejected') },
  ];

  if (loading) return <div className="p-8">{tLocal('loading_requests')}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <span className="font-medium text-gray-700">{tLocal('filter_requests')}</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
          <div className="w-full sm:w-48 relative z-50">
            <CustomSelect 
              value={statusFilter} 
              onChange={setStatusFilter}
              options={statusOptions}
            />
          </div>
          
          <div className="relative w-full sm:w-auto z-40">
            <Flatpickr
              value={dateFilter}
              onChange={(dates, dateStr) => setDateFilter(dateStr)}
              className="w-full sm:w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary text-sm bg-white cursor-pointer pl-10"
              options={{
                altInput: true,
                altFormat: 'd/m/Y',
                dateFormat: 'Y-m-d',
                allowInput: true,
              }}
              placeholder="dd/mm/yyyy"
            />
            <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          
          {(statusFilter !== 'all' || dateFilter) && (
            <button 
              onClick={() => { setStatusFilter('all'); setDateFilter(''); }}
              className="text-sm text-primary hover:text-primary-dark font-medium whitespace-nowrap px-2"
            >
              {tLocal('clear_filters')}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        {filteredQuotes.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-8 text-center text-gray-500">
              {tLocal('no_requests_found')}
            </div>
          </div>
        ) : (
          filteredQuotes.map((quote) => {
            const isExpanded = expandedQuoteId === quote.id;
            const createdAtDate = quote.createdAt ? new Date(quote.createdAt) : null;
            
            return (
              <div key={quote.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200 transition-all">
                {/* Header Row (Clickable) */}
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedQuoteId(isExpanded ? null : quote.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">{quote.companyName}</h3>
                        {quote.isUrgent && (
                          <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-0.5 rounded uppercase border border-red-200">
                            {tLocal('urgent')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {createdAtDate ? formatDate(createdAtDate.toISOString().split('T')[0]) : '-'} {createdAtDate ? createdAtDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''} • {quote.loadingLocation} ➔ {quote.unloadingLocation}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {getStatusBadge(quote.status)}
                    <button className="text-gray-400 hover:text-gray-600">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Collapsible Body */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/30">
                    <div className="flex flex-col lg:flex-row">
                      <div className="p-6 flex-1 border-b lg:border-b-0 lg:border-r border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6 text-sm">
                          <div>
                            <p className="text-gray-500 mb-1 text-xs uppercase font-semibold">{tLocal('contact')}</p>
                            <p className="font-medium">👤 {quote.contactPerson || quote.companyName}</p>
                            <p className="font-medium">📞 {quote.phone}</p>
                            <p className="font-medium">📧 {quote.email}</p>
                            <p className="text-gray-500 mt-1">{tLocal('preference')}: <span className="font-medium text-gray-700 capitalize">{quote.preferredContactMethod || tLocal('unspecified')}</span></p>
                          </div>
                          
                          <div>
                            <p className="text-gray-500 mb-1 text-xs uppercase font-semibold">{tLocal('cargo_details')}</p>
                            <p className="font-medium">📦 {tLocal('type')}: {quote.cargoType || '-'}</p>
                            <p className="font-medium">⚖️ {tLocal('weight')}: {quote.cargoWeightKg ? `${quote.cargoWeightKg} kg` : '-'}</p>
                            <p className="font-medium">🏢 {tLocal('pallets')}: {quote.numberOfPallets || '-'}</p>
                            <p className="font-medium">📐 {tLocal('volume')}: {quote.cargoVolumeM3 ? `${quote.cargoVolumeM3} m³` : '-'}</p>
                          </div>

                          <div>
                            <p className="text-gray-500 mb-1 text-xs uppercase font-semibold">{tLocal('required_truck')}</p>
                            <p className="font-medium">🚚 {tLocal('type')}: {quote.truckType || '-'}</p>
                            {quote.temperatureRequired && (
                              <p className="font-medium text-primary">❄️ {tLocal('temp')}: {quote.temperatureRequired}</p>
                            )}
                          </div>
                        </div>

                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-200">
                            <div className="p-4">
                              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-primary"></span> {tLocal('loading')}
                              </p>
                              <p className="font-medium text-base mb-1">{quote.loadingLocation}</p>
                              {(quote.loadingDate || quote.loadingTime) && (
                                <p className="text-sm text-gray-600 flex items-center gap-1">
                                  📅 {formatDate(quote.loadingDate)} 🕒 {quote.loadingTime || '-'}
                                </p>
                              )}
                            </div>
                            <div className="p-4">
                              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span> {tLocal('unloading')}
                              </p>
                              <p className="font-medium text-base mb-1">{quote.unloadingLocation}</p>
                              {(quote.unloadingDate || quote.unloadingTime) && (
                                <p className="text-sm text-gray-600 flex items-center gap-1">
                                  📅 {formatDate(quote.unloadingDate)} 🕒 {quote.unloadingTime || '-'}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {quote.notes && (
                          <div className="p-3 bg-orange-50 text-orange-900 rounded-md text-sm border border-orange-100 mb-4">
                            <strong>{tLocal('client_notes')}:</strong> {quote.notes}
                          </div>
                        )}

                        {quote.attachmentUrl && (
                          <div className="flex items-center gap-3">
                            <a 
                              href={quote.attachmentUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 hover:bg-orange-100 text-primary text-sm font-medium rounded-lg transition-colors border border-orange-200"
                            >
                              <Eye className="w-4 h-4" />
                              {tLocal('view_file')}
                            </a>
                            <a 
                              href={quote.attachmentUrl} 
                              download
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors border border-gray-200"
                            >
                              <Download className="w-4 h-4" />
                              {tLocal('download_file')}
                            </a>
                          </div>
                        )}

                        <QuoteReplyForm 
                          quoteId={quote.id} 
                          replies={quote.replies} 
                          tLocal={tLocal} 
                          onReplyAdded={fetchQuotes} 
                        />
                      </div>
                      
                      <div className="p-6 lg:w-64 bg-white flex flex-col gap-2 relative z-10" onClick={(e) => e.stopPropagation()}>
                        <p className="text-xs text-gray-500 text-center mb-1 font-semibold uppercase">{tLocal('modify_status')}</p>
                        
                        <CustomSelect 
                          value={quote.status}
                          onChange={(val) => updateStatus(quote.id, val)}
                          options={statusOptions.filter(o => o.value !== 'all')}
                        />

                        {quote.status === 'accepted' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCreateTripFromQuote(quote);
                            }}
                            className="mt-4 w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                          >
                            <Truck className="w-4 h-4" />
                            {tLocal('create_transport')}
                          </button>
                        )}

                        <div className="mt-auto pt-4 border-t border-gray-200 text-center">
                          <p className="text-xs text-gray-400">{tLocal('received_at')}</p>
                          <p className="text-sm font-medium text-gray-600">
                            {createdAtDate ? `${createdAtDate.toLocaleDateString('en-GB')} ${createdAtDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default WebsiteQuotesPage;
