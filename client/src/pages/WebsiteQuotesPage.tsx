import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { useTranslation } from 'react-i18next';
import { Download, Filter, Calendar, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';

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
}

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
};

const WebsiteQuotesPage = () => {
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null);
  const { t } = useTranslation();

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

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800 border-blue-200',
      reviewing: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      contacted: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      quoted: 'bg-purple-100 text-purple-800 border-purple-200',
      accepted: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200'
    };
    
    const displayStatus = status || 'new';
    const statusTranslations: Record<string, string> = {
      new: t('status_new', 'Nou'),
      reviewing: t('status_reviewing', 'În analiză'),
      contacted: t('status_contacted', 'Contactat'),
      quoted: t('status_quoted', 'Ofertat'),
      accepted: t('status_accepted', 'Acceptat'),
      rejected: t('status_rejected', 'Respins'),
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colors[displayStatus] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
        {statusTranslations[displayStatus]?.toUpperCase() || displayStatus.toUpperCase()}
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
    { value: 'all', label: t('all_statuses', 'Toate statusurile') },
    { value: 'new', label: t('status_new', 'Nou') },
    { value: 'reviewing', label: t('status_reviewing', 'În analiză') },
    { value: 'contacted', label: t('status_contacted', 'Contactat') },
    { value: 'quoted', label: t('status_quoted', 'Ofertat') },
    { value: 'accepted', label: t('status_accepted', 'Acceptat') },
    { value: 'rejected', label: t('status_rejected', 'Respins') },
  ];

  if (loading) return <div className="p-8">{t('common.loading', 'Se încarcă cererile...')}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <span className="font-medium text-gray-700">{t('filter_requests', 'Filtrează cererile:')}</span>
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
              className="w-full sm:w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm bg-white cursor-pointer pl-10"
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
              className="text-sm text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap px-2"
            >
              {t('clear_filters', 'Șterge filtre')}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        {filteredQuotes.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-8 text-center text-gray-500">
              {t('no_requests_found', 'Nu a fost găsită nicio cerere cu aceste filtre.')}
            </div>
          </div>
        ) : (
          filteredQuotes.map((quote) => {
            const isExpanded = expandedQuoteId === quote.id;
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
                            {t('urgent', 'URGENT')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {formatDate(new Date(quote.createdAt).toISOString().split('T')[0])} • {quote.loadingLocation.split(',')[0]} ➔ {quote.unloadingLocation.split(',')[0]}
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
                            <p className="text-gray-500 mb-1 text-xs uppercase font-semibold">{t('contact', 'Contact')}</p>
                            <p className="font-medium">👤 {quote.contactPerson || quote.companyName}</p>
                            <p className="font-medium">📞 {quote.phone}</p>
                            <p className="font-medium">📧 {quote.email}</p>
                            <p className="text-gray-500 mt-1">{t('preference', 'Preferință')}: <span className="font-medium text-gray-700 capitalize">{quote.preferredContactMethod || t('unspecified', 'Nespecificat')}</span></p>
                          </div>
                          
                          <div>
                            <p className="text-gray-500 mb-1 text-xs uppercase font-semibold">{t('cargo_details', 'Detalii Marfă')}</p>
                            <p className="font-medium">📦 {t('type', 'Tip')}: {quote.cargoType || '-'}</p>
                            <p className="font-medium">⚖️ {t('weight', 'Greutate')}: {quote.cargoWeightKg ? `${quote.cargoWeightKg} kg` : '-'}</p>
                            <p className="font-medium">🏢 {t('pallets', 'Paleți')}: {quote.numberOfPallets || '-'}</p>
                            <p className="font-medium">📐 {t('volume', 'Volum')}: {quote.cargoVolumeM3 ? `${quote.cargoVolumeM3} m³` : '-'}</p>
                          </div>

                          <div>
                            <p className="text-gray-500 mb-1 text-xs uppercase font-semibold">{t('required_truck', 'Camion Necesar')}</p>
                            <p className="font-medium">🚚 {t('type', 'Tip')}: {quote.truckType || '-'}</p>
                            {quote.temperatureRequired && (
                              <p className="font-medium text-blue-600">❄️ {t('temp', 'Temp')}: {quote.temperatureRequired}</p>
                            )}
                          </div>
                        </div>

                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-200">
                            <div className="p-4">
                              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span> {t('loading', 'Încărcare')}
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
                                <span className="w-2 h-2 rounded-full bg-green-500"></span> {t('unloading', 'Descărcare')}
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
                          <div className="p-3 bg-blue-50 text-blue-900 rounded-md text-sm border border-blue-100 mb-4">
                            <strong>{t('client_notes', 'Observații client')}:</strong> {quote.notes}
                          </div>
                        )}

                        {quote.attachmentUrl && (
                          <div className="flex items-center gap-3">
                            <a 
                              href={quote.attachmentUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium rounded-lg transition-colors border border-blue-200"
                            >
                              <Eye className="w-4 h-4" />
                              {t('view_file', 'Vizualizare')}
                            </a>
                            <a 
                              href={quote.attachmentUrl} 
                              download
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors border border-gray-200"
                            >
                              <Download className="w-4 h-4" />
                              {t('download_file', 'Descarcă')}
                            </a>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-6 lg:w-64 bg-white flex flex-col gap-2 relative z-10" onClick={(e) => e.stopPropagation()}>
                        <p className="text-xs text-gray-500 text-center mb-1 font-semibold uppercase">{t('modify_status', 'Modifică Status')}</p>
                        
                        <CustomSelect 
                          value={quote.status}
                          onChange={(val) => updateStatus(quote.id, val)}
                          options={statusOptions.filter(o => o.value !== 'all')}
                        />

                        <div className="mt-auto pt-4 border-t border-gray-200 text-center">
                          <p className="text-xs text-gray-400">{t('received_at', 'Primită la:')}</p>
                          <p className="text-sm font-medium text-gray-600">
                            {quote.createdAt ? `${new Date(quote.createdAt).toLocaleDateString('en-GB')} ${new Date(quote.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}
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
