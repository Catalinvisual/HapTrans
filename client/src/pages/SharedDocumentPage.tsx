import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/api';
import { useTranslation } from 'react-i18next';
export default function SharedDocumentPage() {
  const { t } = useTranslation();
  const {
    token
  } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [doc, setDoc] = useState<{
    filename: string;
    url: string;
  } | null>(null);
  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const res = await api.get(`/documents/shared/${token}`);
        setDoc(res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Documentul nu a putut fi încarcat. Linkul poate fi expirat sau invalid.');
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [token]);
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>;
  }
  if (error || !doc) {
    return <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="card bg-card p-8 max-w-md w-full text-center shadow-lg rounded-2xl">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </div>
          <h2 className="text-xl font-bold text-text mb-2">{t("jsx_eroareAcces")}</h2>
          <p className="text-text-secondary mb-6">{error}</p>
        </div>
      </div>;
  }
  const isPdf = doc.url.toLowerCase().includes('.pdf');
  const isImage = doc.url.match(/\.(jpeg|jpg|gif|png)$/) != null;
  return <div className="min-h-screen flex flex-col bg-surface">
      <div className="bg-card shadow-sm px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text truncate max-w-2xl">{doc.filename}</h1>
        <a href={doc.url} download={doc.filename} className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>{t("jsx_descarcaDocume")}</a>
      </div>
      <div className="flex-1 p-4 flex justify-center items-start overflow-auto">
        <div className="bg-card shadow-lg rounded-xl overflow-hidden w-full max-w-5xl" style={{
        height: 'calc(100vh - 100px)'
      }}>
          {isPdf || !isImage ? <iframe src={doc.url} className="w-full h-full border-0" title={doc.filename} /> : <div className="w-full h-full flex items-center justify-center bg-surface p-4">
              <img src={doc.url} alt={doc.filename} className="max-w-full max-h-full object-contain" />
            </div>}
        </div>
      </div>
    </div>;
}