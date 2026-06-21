import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { useTranslation } from 'react-i18next';
import { Download, Filter, Calendar } from 'lucide-react';

interface QuoteRequest {
  id: string;
  companyName: string;
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

const WebsiteQuotesPage = () => {
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
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
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colors[displayStatus] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
        {displayStatus.toUpperCase()}
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

  if (loading) return <div className="p-8">{t('common.loading', 'Se încarcă cererile...')}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <span className="font-medium text-gray-700">Filtrează cererile:</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="all">Toate statusurile</option>
            <option value="new">NOU (New)</option>
            <option value="reviewing">ÎN ANALIZĂ (Reviewing)</option>
            <option value="contacted">CONTACTAT (Contacted)</option>
            <option value="quoted">OFERTAT (Quoted)</option>
            <option value="accepted">ACCEPTAT (Accepted)</option>
            <option value="rejected">RESPINS (Rejected)</option>
          </select>
          
          <div className="relative">
            <input 
              type="date" 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm pl-10"
            />
            <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
          
          {(statusFilter !== 'all' || dateFilter) && (
            <button 
              onClick={() => { setStatusFilter('all'); setDateFilter(''); }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap px-2"
            >
              Șterge filtre
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6">
        {filteredQuotes.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-8 text-center text-gray-500">
              Nu a fost găsită nicio cerere cu aceste filtre.
            </div>
          </div>
        ) : (
          filteredQuotes.map((quote) => (
            <div key={quote.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
              <div className="flex flex-col lg:flex-row">
                <div className="p-6 flex-1 border-b lg:border-b-0 lg:border-r border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{quote.companyName}</h3>
                      {quote.isUrgent && (
                        <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-0.5 rounded uppercase border border-red-200">
                          URGENT
                        </span>
                      )}
                    </div>
                    {getStatusBadge(quote.status)}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6 text-sm">
                    <div>
                      <p className="text-gray-500 mb-1 text-xs uppercase font-semibold">Contact</p>
                      <p className="font-medium">📞 {quote.phone}</p>
                      <p className="font-medium">📧 {quote.email}</p>
                      <p className="text-gray-500 mt-1">Preferință: <span className="font-medium text-gray-700 capitalize">{quote.preferredContactMethod || 'Nespecificat'}</span></p>
                    </div>
                    
                    <div>
                      <p className="text-gray-500 mb-1 text-xs uppercase font-semibold">Detalii Marfă</p>
                      <p className="font-medium">📦 Tip: {quote.cargoType || '-'}</p>
                      <p className="font-medium">⚖️ Greutate: {quote.cargoWeightKg ? `${quote.cargoWeightKg} kg` : '-'}</p>
                      <p className="font-medium">🏢 Paleți: {quote.numberOfPallets || '-'}</p>
                      <p className="font-medium">📐 Volum: {quote.cargoVolumeM3 ? `${quote.cargoVolumeM3} m³` : '-'}</p>
                    </div>

                    <div>
                      <p className="text-gray-500 mb-1 text-xs uppercase font-semibold">Camion Necesar</p>
                      <p className="font-medium">🚚 Tip: {quote.truckType || '-'}</p>
                      {quote.temperatureRequired && (
                        <p className="font-medium text-blue-600">❄️ Temp: {quote.temperatureRequired}</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden mb-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-200">
                      <div className="p-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span> Încărcare
                        </p>
                        <p className="font-medium text-base mb-1">{quote.loadingLocation}</p>
                        {(quote.loadingDate || quote.loadingTime) && (
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            📅 {quote.loadingDate || '-'} 🕒 {quote.loadingTime || '-'}
                          </p>
                        )}
                      </div>
                      <div className="p-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span> Descărcare
                        </p>
                        <p className="font-medium text-base mb-1">{quote.unloadingLocation}</p>
                        {(quote.unloadingDate || quote.unloadingTime) && (
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            📅 {quote.unloadingDate || '-'} 🕒 {quote.unloadingTime || '-'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {quote.notes && (
                    <div className="p-3 bg-blue-50 text-blue-900 rounded-md text-sm border border-blue-100 mb-4">
                      <strong>Observații client:</strong> {quote.notes}
                    </div>
                  )}

                  {quote.attachmentUrl && (
                    <a 
                      href={quote.attachmentUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors border border-gray-200"
                    >
                      <Download className="w-4 h-4" />
                      Descarcă Fișier Atașat
                    </a>
                  )}
                </div>
                
                <div className="p-6 lg:w-64 bg-gray-50 flex flex-col gap-2">
                  <p className="text-xs text-gray-500 text-center mb-1 font-semibold uppercase">Modifică Status</p>
                  
                  <select 
                    value={quote.status}
                    onChange={(e) => updateStatus(quote.id, e.target.value)}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 mb-4"
                  >
                    <option value="new">Nou</option>
                    <option value="reviewing">În analiză</option>
                    <option value="contacted">Contactat</option>
                    <option value="quoted">Ofertat</option>
                    <option value="accepted">Acceptat</option>
                    <option value="rejected">Respins</option>
                  </select>

                  <div className="mt-auto pt-4 border-t border-gray-200 text-center">
                    <p className="text-xs text-gray-400">Primită la:</p>
                    <p className="text-sm font-medium text-gray-600">
                      {quote.createdAt ? new Date(quote.createdAt).toLocaleString('ro-RO') : ''}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default WebsiteQuotesPage;
