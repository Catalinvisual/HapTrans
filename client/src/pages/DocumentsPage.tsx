import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, FileText, Trash2, Download, Share2 } from 'lucide-react';
import api from '../lib/api';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';
import { formatDate } from '../lib/dateUtils';
import CustomSelect from '../components/CustomSelect';

export default function DocumentsPage() {
  const { t, i18n } = useTranslation();
  const [docs, setDocs] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [tripId, setTripId] = useState('');
  const [docType, setDocType] = useState('CMR');
  const [notes, setNotes] = useState('');

  const executeDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/documents/${deleteId}`);
      toast.success(t('documentDeleted'));
      load();
    } catch {
      toast.error('Error');
    } finally {
      setDeleteId(null);
    }
  };
  const load = async () => {
    const [d, tr] = await Promise.all([api.get('/documents'), api.get('/trips')]);
    setDocs(d.data); setTrips(tr.data); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('tripId', tripId);
    fd.append('type', docType);
    if (notes) fd.append('notes', notes);
    try {
      await api.post('/documents/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(t('success') || 'Document încărcat!'); 
      setFile(null); 
      setNotes('');
      setShowForm(false);
      load();
    } catch { toast.error(t('uploadError')); }
  };

  const handleDownload = (doc: any) => {
    const serverUrl = api.defaults.baseURL?.replace('/api', '') || 'http://localhost:3001';
    const link = document.createElement("a");
    link.href = doc.fileUrl.startsWith('http') ? doc.fileUrl : `${serverUrl}${doc.fileUrl}`;
    link.download = doc.fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(t('documentDownloaded'));
  };

  const handleShare = async (doc: any) => {
    const serverUrl = api.defaults.baseURL?.replace('/api', '') || 'http://localhost:3001';
    const fileUrl = doc.fileUrl.startsWith('http') ? doc.fileUrl : `${serverUrl}${doc.fileUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: doc.fileName,
          text: `Document: ${doc.fileName}`,
          url: fileUrl,
        });
        toast.success(t('documentShared'));
      } catch (err: any) {
        if (err.name !== 'AbortError') toast.error(t('shareFailed'));
      }
    } else {
      navigator.clipboard.writeText(fileUrl);
      toast.success(t('copiedToClipboard'));
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">{t('documents')}</h1>
          <p className="text-text-secondary text-sm">{docs.length} {t('documents').toLowerCase()}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Upload className="w-4 h-4" /> {t('uploadDocument')}
        </button>
      </div>

      {showForm && (
        <div className="card animate-fade-in bg-white border border-border rounded-2xl p-6 shadow-md">
          <h3 className="font-bold text-lg text-text mb-5 text-primary border-b border-border pb-3">{t('uploadDocument')}</h3>
          <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label className="label">{t('trip')}</label>
            <CustomSelect
              value={tripId}
              onChange={val => setTripId(val)}
              placeholder={t('noTrip')}
              options={trips.map((tr: any) => ({
                value: tr.id,
                label: `${tr.pickupAddress?.slice(0,20)} → ${tr.dropoffAddress?.slice(0,20)}`
              }))}
            />
          </div>
          <div>
            <label className="label">{t('documentType')}</label>
            <CustomSelect
              value={docType}
              onChange={val => setDocType(val)}
              options={[
                { value: 'CMR', label: 'CMR' },
                { value: 'Aviz', label: t('aviz') },
                { value: 'Factură', label: t('invoices') },
                { value: 'Foto marfă', label: t('cargoPhoto') },
                { value: 'Altele', label: t('other') }
              ]}
            />
          </div>
          <div>
            <label className="label">{t('notes') || 'Comentarii'}</label>
            <input 
              type="text" 
              className="input py-2" 
              placeholder={t('notesPlaceholder') || 'Detalii opționale...'} 
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
            />
          </div>
          <div>
            <label className="label">{t('file')}</label>
            <div className="relative">
              <input 
                type="file" 
                id="file-upload" 
                className="hidden" 
                onChange={e => setFile(e.target.files?.[0] || null)} 
                required 
              />
              <label 
                htmlFor="file-upload" 
                className="input py-2 flex items-center justify-between cursor-pointer bg-white"
              >
                <span className={`truncate ${file ? 'text-text' : 'text-text-secondary'}`}>
                  {file ? file.name : t('noFileChosen') || 'Niciun fișier ales'}
                </span>
                <span className="btn-secondary px-3 py-1 text-xs font-semibold whitespace-nowrap ml-2">
                  {t('uploadFile') || 'Alege Fișier'}
                </span>
              </label>
            </div>
          </div>
          <button type="submit" className="btn-primary md:col-span-2 lg:col-span-4 justify-center mt-2">
            <Upload className="w-4 h-4" /> {t('uploadDocument')}
          </button>
          </form>
        </div>
      )}
      <div className="card p-0 overflow-hidden bg-white border border-border rounded-2xl shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface border-b border-border">
                {[t('file'), t('type'), t('trip'), t('uploadedBy'), t('date'), t('actions')].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="table-cell text-center py-8 text-text-secondary">{t('loading')}</td></tr>
              ) : docs.length === 0 ? (
                <tr><td colSpan={6} className="table-cell text-center py-8 text-text-secondary">{t('noData')}</td></tr>
              ) : docs.map(doc => {
                const serverUrl = api.defaults.baseURL?.replace('/api', '') || 'http://localhost:3001';
                return (
                  <tr key={doc.id} className="hover:bg-surface/60 transition-colors">
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                        <a href={doc.fileUrl.startsWith('http') ? doc.fileUrl : `${serverUrl}${doc.fileUrl}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm font-medium" title={doc.fileName}>
                          {doc.fileName?.length > 25 ? doc.fileName.substring(0, 15) + '...' + doc.fileName.slice(-7) : doc.fileName}
                        </a>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="badge-primary">
                          {doc.type === 'CMR' ? 'CMR' :
                           doc.type === 'Aviz' ? t('aviz') :
                           doc.type === 'Factură' ? t('invoices') :
                           doc.type === 'Foto marfă' ? t('cargoPhoto') :
                           doc.type === 'Altele' ? t('other') : doc.type}
                        </span>
                        {doc.notes && <span className="text-[11px] text-text-secondary italic max-w-[150px] truncate" title={doc.notes}>{doc.notes}</span>}
                      </div>
                    </td>
                    <td className="table-cell text-xs">{doc.trip?.pickupAddress?.slice(0,20) || '—'}</td>
                    <td className="table-cell text-xs">{doc.uploadedBy?.name || '—'}</td>
                    <td className="table-cell text-xs">{formatDate(doc.createdAt)}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDownload(doc)} className="p-1.5 text-text-secondary hover:text-success rounded-lg hover:bg-green-50 transition-all" title="Download">
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleShare(doc)} className="p-1.5 text-text-secondary hover:text-warning rounded-lg hover:bg-yellow-50 transition-all" title="Share">
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteId(doc.id)} className="p-1.5 text-text-secondary hover:text-error rounded-lg hover:bg-red-50 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={executeDelete}
        title={t('confirm')}
        message={t('confirm') || 'Esti sigur ca vrei sa stergi documentul?'}
      />
    </div>
  );
}
