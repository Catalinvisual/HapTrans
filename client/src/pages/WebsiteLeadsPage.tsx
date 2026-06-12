import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';

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
  status: 'new' | 'contacted' | 'quoted' | 'accepted' | 'rejected';
  source: string;
  createdAt: string;
}

const WebsiteLeadsPage = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const fetchLeads = async () => {
    try {
      const { data } = await api.get('/leads');
      setLeads(data);
    } catch (error) {
      console.error('Failed to fetch leads', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      if (status === 'accepted') {
        const { data } = await api.post(`/leads/${id}/convert`);
        if (data && data.tripId) {
          navigate(`/trips`); // the trip is created, go to trips list or edit
          // navigate(`/trips/edit/${data.tripId}`); // if edit page exists
        }
      } else {
        await api.patch(`/leads/${id}`, { status });
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
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colors[status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  if (loading) return <div className="p-8">Se încarcă cererile...</div>;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Cereri Website (Leads)</h1>
        <p className="text-gray-500 mt-2">Gestionează cererile de ofertă venite de pe site-ul public hapcargo.com.</p>
      </div>

      <div className="grid gap-6">
        {leads.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              Nu există nicio cerere momentan.
            </CardContent>
          </Card>
        ) : (
          leads.map((lead) => (
            <Card key={lead.id} className="overflow-hidden border-gray-200">
              <div className="flex flex-col lg:flex-row">
                <div className="p-6 flex-1 border-b lg:border-b-0 lg:border-r border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{lead.name}</h3>
                    {getStatusBadge(lead.status)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-gray-500 mb-1">Contact</p>
                      <p className="font-medium">📞 {lead.phone}</p>
                      <p className="font-medium">📧 {lead.email}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Detalii Marfă</p>
                      <p className="font-medium">⚖️ {lead.weight}</p>
                      <p className="font-medium">📦 {lead.type || 'Nespecificat'}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">De la</p>
                        <p className="font-medium">{lead.from}</p>
                      </div>
                      <div className="text-gray-400">➔</div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Până la</p>
                        <p className="font-medium">{lead.to}</p>
                      </div>
                    </div>
                  </div>

                  {lead.notes && (
                    <div className="mt-4 p-3 bg-blue-50 text-blue-900 rounded-md text-sm border border-blue-100">
                      <strong>Observații:</strong> {lead.notes}
                    </div>
                  )}
                </div>
                
                <div className="p-6 lg:w-64 bg-gray-50 flex flex-col justify-center gap-3">
                  <p className="text-xs text-gray-500 text-center mb-2">Acțiuni Rapide</p>
                  
                  {lead.status === 'new' && (
                    <Button onClick={() => updateStatus(lead.id, 'contacted')} className="w-full bg-blue-600 hover:bg-blue-700">
                      📞 Marchează "Sunat"
                    </Button>
                  )}
                  
                  {['new', 'contacted'].includes(lead.status) && (
                    <Button onClick={() => updateStatus(lead.id, 'quoted')} className="w-full bg-purple-600 hover:bg-purple-700">
                      📝 Trimite Ofertă
                    </Button>
                  )}
                  
                  {['contacted', 'quoted'].includes(lead.status) && (
                    <Button onClick={() => updateStatus(lead.id, 'accepted')} className="w-full bg-green-600 hover:bg-green-700">
                      ✅ Transformă în Comandă
                    </Button>
                  )}

                  {!['accepted', 'rejected'].includes(lead.status) && (
                    <Button onClick={() => updateStatus(lead.id, 'rejected')} variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50">
                      ❌ Respins
                    </Button>
                  )}

                  {['accepted', 'rejected'].includes(lead.status) && (
                    <div className="text-center text-sm font-medium text-gray-500 mt-2">
                      Cerere finalizată
                    </div>
                  )}
                  
                  <div className="text-center text-xs text-gray-400 mt-auto pt-4">
                    Primită: {new Date(lead.createdAt).toLocaleString('ro-RO')}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default WebsiteLeadsPage;
