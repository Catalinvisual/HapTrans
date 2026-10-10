import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, FileText, Trash2, Download, Share2, Search, File as FileIcon, Image as ImageIcon } from 'lucide-react';
import api from '../lib/api';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';
import CustomSelect from '../components/CustomSelect';
import Pagination from '../components/Pagination';
import DataTable from '../components/ui/DataTable';
import type { Column } from '../components/ui/DataTable';
export default function DocumentsPage({
  embeddedClientId
}: {
  embeddedClientId?: string;
}) {
  const {
    t,
    i18n
  } = useTranslation();
  const [docs, setDocs] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [tripId, setTripId] = useState('');
  const [docType, setDocType] = useState('CMR');
  const [notes, setNotes] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [refFilter, setRefFilter] = useState('ALL');
  const executeDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/documents/${deleteId}`);
      toast.success(t('documentDeleted'));
      load();
    } catch {
      toast.error(t("toast_error"));
    } finally {
      setDeleteId(null);
    }
  };
  const load = async () => {
    const [d, tr] = await Promise.all([api.get('/documents'), api.get('/trips')]);
    setDocs(d.data);
    setTrips(tr.data);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const fd = new FormData();
    const selectedTrip = trips.find((t: any) => t.id === tripId);
    const ref = selectedTrip?.tripNumber || selectedTrip?.referenceNumber || '';
    
    fd.append('file', file);
    if (tripId) fd.append('tripId', tripId);
    if (ref) fd.append('reference', ref);
    fd.append('type', docType);
    if (notes) fd.append('notes', notes);
    setUploading(true);
    try {
      await api.post('/documents/upload', fd, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success(t('success') || 'Document încărcat!');
      setFile(null);
      setNotes('');
      setShowForm(false);
      load();
    } catch {
      toast.error(t('uploadError'));
    } finally {
      setUploading(false);
    }
  };
  const handlePreview = async (doc: any) => {
    try {
      const res = await api.get(`/documents/${doc.id}/preview-url`);
      window.open(res.data.url, '_blank');
    } catch {
      toast.error(t("toast_errorLoadingD"));
    }
  };
  const handleDownload = async (doc: any) => {
    try {
      const res = await api.get(`/documents/${doc.id}/preview-url`);
      const link = document.createElement("a");
      link.href = res.data.url;
      link.download = doc.fileName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(t('documentDownloaded'));
    } catch {
      toast.error(t("toast_errorDownloadi"));
    }
  };
  const handleShare = async (doc: any) => {
    try {
      const res = await api.post(`/documents/${doc.id}/share`);
      const origin = window.location.origin;
      const shareUrl = `${origin}/shared/documents/${res.data.token}`;
      if (navigator.share) {
        try {
          await navigator.share({
            title: doc.fileName,
            text: `Document: ${doc.fileName}`,
            url: shareUrl
          });
          toast.success(t('documentShared'));
        } catch (err: any) {
          if (err.name !== 'AbortError') toast.error(t('shareFailed'));
        }
      } else {
        navigator.clipboard.writeText(shareUrl);
        toast.success(t('copiedToClipboard') || 'Link copiat!');
      }
    } catch {
      toast.error(t("toast_errorGeneratin"));
    }
  };
  const displayDocs = embeddedClientId ? docs.filter(doc => {
    const trip = trips.find((t: any) => t.id === doc.trip?.id);
    return trip?.client?.id === embeddedClientId;
  }) : docs;

  const getRef = (doc: any) => doc.reference || doc.trip?.tripNumber || doc.trip?.referenceNumber || '—';
  const typeLabel = (tval: string) => {
    const v = tval.toLowerCase();
    if (['cmr'].includes(v)) return 'CMR';
    if (['aviz', 'delivery_note', 'delivery note', 'waybill'].includes(v)) return t('aviz') !== 'aviz' ? t('aviz') : 'Aviz';
    if (['pod'].includes(v)) return 'POD';
    if (['fuel', 'combustibil', 'fuel_receipt'].includes(v)) return t('fuel') !== 'fuel' ? t('fuel') : 'Combustibil';
    if (['licence', 'license'].includes(v)) return t('license') !== 'license' ? t('license') : 'Licență';
    if (['invoice', 'factura', 'factură'].includes(v)) return t('invoices') !== 'invoices' ? t('invoices') : 'Factură';
    if (['photo', 'foto încărcare', 'foto marfă', 'packing_list', 'cargo_photo', 'loading_photo'].includes(v)) return tval || 'Foto';
    if (['other', 'altele', 'document'].includes(v)) return t('other') !== 'other' ? t('other') : 'Altele';
    return (tval || '—').toUpperCase();
  };
  const fileIcon = (name: string) => {
    if (/\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name || '')) return <ImageIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />;
    if (/\.pdf$/i.test(name || '')) return <FileText className="w-3.5 h-3.5 text-red-500 shrink-0" />;
    return <FileIcon className="w-3.5 h-3.5 text-text-secondary shrink-0" />;
  };
  const typeOptions = [
    { value: 'ALL', label: t('all_types') || 'Toate Tipurile' },
    ...Array.from(new Set(displayDocs.map(d => (d.type || d.documentType || '').toString()).filter(Boolean))).map(tv => ({ value: tv, label: typeLabel(tv) })),
  ];
  const refOptions = [
    { value: 'ALL', label: t('all_refs', 'Toate Referințele') },
    ...Array.from(new Set(displayDocs.map(d => getRef(d)).filter(r => r && r !== '—'))).map(r => ({ value: r, label: r })),
  ];
  const filteredDocs = displayDocs.filter(doc => {
    const q = search.toLowerCase().trim();
    if (q) {
      const hay = [doc.fileName, getRef(doc), doc.uploadedBy?.name, doc.uploadedBy?.email, doc.notes].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    const tval = (doc.type || doc.documentType || '').toString();
    if (typeFilter !== 'ALL' && tval !== typeFilter) return false;
    if (refFilter !== 'ALL' && getRef(doc) !== refFilter) return false;
    return true;
  });
  const currentTableItems = filteredDocs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const columns: Column<any>[] = [
    {
      key: 'file', label: t('file') + ' & ' + (t('reference') || 'Referință'), width: '360px',
      render: (doc: any) => {
        const ref = getRef(doc);
        const author = doc.uploadedBy?.name || doc.uploadedBy?.email || '';
        return (
          <div className="leading-tight min-w-0 max-w-[360px]">
            <div className="flex items-center gap-2 min-w-0">
              {fileIcon(doc.fileName)}
              <button onClick={() => handlePreview(doc)} className="text-[13px] font-semibold text-primary hover:underline truncate" title={doc.fileName}>{doc.fileName || '—'}</button>
            </div>
            {(ref !== '—' || author) && (
              <div className="text-[11px] text-text-secondary truncate pl-[22px]">
                {ref !== '—' ? <span className="font-semibold">{ref}</span> : null}{ref !== '—' && author ? ' • ' : ''}{author ? '👤 ' + author : ''}
              </div>
            )}
            {doc.notes ? <div className="text-[11px] text-text-muted italic truncate pl-[22px]" title={doc.notes}>{doc.notes}</div> : null}
          </div>
        );
      },
    },
    {
      key: 'type', label: t('type') || 'Tip', align: 'center',
      render: (doc: any) => <span className="badge-primary whitespace-nowrap text-[11px]">{typeLabel((doc.type || doc.documentType || '').toString())}</span>,
    },
    {
      key: 'date', label: t('date') || 'Data', align: 'center',
      render: (doc: any) => <span className="text-xs text-text-secondary whitespace-nowrap">{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString(i18n.language || 'ro-RO', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</span>,
    },
    {
      key: 'actions', label: t('actions') || 'Acțiuni', align: 'right', sticky: 'right', width: '100px',
      render: (doc: any) => (
        <div className="flex items-center justify-end gap-0.5">
          <button onClick={() => handleDownload(doc)} className="p-1 text-text-secondary hover:text-success rounded-lg hover:bg-green-50 transition-all" title="Download"><Download className="w-3.5 h-3.5" /></button>
          <button onClick={() => handleShare(doc)} className="p-1 text-text-secondary hover:text-warning rounded-lg hover:bg-yellow-50 transition-all" title="Share"><Share2 className="w-3.5 h-3.5" /></button>
          <button onClick={() => setDeleteId(doc.id)} className="p-1 text-text-secondary hover:text-error rounded-lg hover:bg-red-50 transition-all" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      ),
    },
  ];
  return <div className="space-y-4 animate-fade-in">

      {showForm && !embeddedClientId && <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <div className="card w-full max-w-3xl bg-card border border-border rounded-2xl p-6 shadow-xl animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-lg text-text text-primary">{t('uploadDocument')}</h3>
              <button onClick={() => { setShowForm(false); setFile(null); setTripId(''); setNotes(''); }} className="p-1.5 text-text-secondary hover:text-error rounded-lg hover:bg-red-50 transition-colors text-sm" title={t('cancel') || 'Cancel'}>✕</button>
            </div>
          <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-end">
          <div>
            <label className="label">{t('reference') || 'Referinta'}</label>
            <CustomSelect value={tripId} onChange={val => setTripId(val)} placeholder={t('noTrip')} options={trips.map((tr: any) => {
              const ref = tr.tripNumber || tr.referenceNumber;
              return {
                value: tr.id,
                label: ref ? `${ref} | ${tr.pickupAddress?.slice(0, 20) || ''}...` : `${tr.pickupAddress?.slice(0, 20) || ''}...`
              };
            })} />
          </div>
          <div>
            <label className="label">{t('documentType')}</label>
            <CustomSelect value={docType} onChange={val => setDocType(val)} options={[{
            value: 'CMR',
            label: 'CMR'
          }, {
            value: 'Aviz',
            label: t('aviz') !== 'aviz' ? `${t('aviz').charAt(0).toUpperCase() + t('aviz').slice(1)} (Delivery Note)` : 'Aviz (Delivery Note)'
          }, {
            value: 'POD',
            label: 'POD'
          }, {
            value: 'Factură',
            label: `${t('invoices') || 'Factură'} (Invoice)`
          }, {
            value: 'Combustibil',
            label: `${t('fuel') || 'Combustibil'} (Fuel Receipt)`
          }, {
            value: 'Licență',
            label: `${t('license') || 'Licență'} (License)`
          }, {
            value: 'Foto încărcare',
            label: t('loadingPhoto') || 'Foto încărcare'
          }, {
            value: 'Foto marfă',
            label: t('cargoPhoto') || 'Foto marfă'
          }, {
            value: 'Altele',
            label: `${t('other') || 'Altele'} (Document)`
          }]} />
          </div>
          <div>
            <label className="label">{t('notes') || 'Comentarii'}</label>
            <input type="text" className="input py-2" placeholder={t('notesPlaceholder') !== 'notesPlaceholder' ? t('notesPlaceholder') : 'Detalii opționale...'} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div>
            <label className="label">{t('file')}</label>
            <div className="relative">
              <input type="file" id="file-upload" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} required />
              <label htmlFor="file-upload" className="input py-2 flex items-center justify-between cursor-pointer bg-card">
                <span className={`truncate ${file ? 'text-text' : 'text-text-secondary'}`}>
                  {file ? file.name : t('noFileChosen') || 'Niciun fișier ales'}
                </span>
                <span className="btn-secondary px-3 py-1 text-xs font-semibold whitespace-nowrap ml-2">
                  {t('uploadFile') || 'Alege Fișier'}
                </span>
              </label>
            </div>
          </div>
            <div className="flex gap-3 col-span-1 md:col-span-2 lg:col-span-4 pt-3 border-t border-border mt-2">
              <button type="submit" disabled={!file || uploading} className="btn-primary !px-4 !py-1.5 text-sm font-bold shadow-md shadow-primary/20">
                <Upload className="w-4 h-4" /> {t('save') || 'Salveaza'}
              </button>
              <button type="button" onClick={() => {
            setShowForm(false);
            setFile(null);
            setTripId('');
            setNotes('');
          }} className="btn-secondary !px-4 !py-1.5 text-sm font-bold">
                {t('cancel') || 'Anuleaza'}
              </button>
            </div>
          </form>
        </div>
      </div>}
      <div className="card p-0 overflow-hidden bg-card border border-border rounded-2xl shadow-sm">
        <div className="px-2.5 py-2 border-b border-border flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-1 min-w-[340px]">
            <div className="relative w-[230px] shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
              <input className="input pl-8 pr-3 py-1.5 text-xs w-full" placeholder={t('searchDocs', 'Caută fișier, referință, autor...')} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="w-[150px] shrink-0">
              <CustomSelect size="sm" value={typeFilter} onChange={v => { setTypeFilter(v); setCurrentPage(1); }} options={typeOptions} />
            </div>
            <div className="w-[170px] shrink-0">
              <CustomSelect size="sm" value={refFilter} onChange={v => { setRefFilter(v); setCurrentPage(1); }} options={refOptions} />
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-semibold text-text-secondary whitespace-nowrap">{filteredDocs.length} {t('results') || 'rezultate'}</span>
            {!embeddedClientId && <button onClick={() => setShowForm(!showForm)} className="btn-primary px-2.5 py-1.5 flex items-center gap-1.5 text-xs font-semibold">
              <Upload className="w-3.5 h-3.5" /> {t('uploadDocument')}
            </button>}
          </div>
        </div>

        <DataTable
          columns={columns}
          data={currentTableItems}
          rowKey={(doc: any) => doc.id}
          minWidth="760px"
          loading={loading}
          dense
          emptyState={
            <div className="p-16 text-center">
              <FileText className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-40" />
              <h3 className="text-lg font-bold text-text-primary mb-1">{t('noData')}</h3>
              <p className="text-text-secondary">{t('noResult') || 'No documents found.'}</p>
            </div>
          }
        />
        <Pagination currentPage={currentPage} totalItems={filteredDocs.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
      </div>
    
      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={executeDelete} type="danger" />
    </div>;
}
