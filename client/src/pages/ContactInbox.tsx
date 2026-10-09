import { useState, useEffect, useMemo } from 'react';
import type { ElementType } from 'react';
import api from '../lib/api';
import { Mail, Inbox, CheckCheck, Timer, Check, Plus, Reply, ChevronLeft, ChevronRight, User, Phone, MapPin, CalendarDays } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import KpiStrip from '../components/ui/KpiStrip';
import OrderWizard from '../components/orders/OrderWizard';
interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const parseStructured = (msg: ContactMessage) => {
  const lines = (msg.message || '').split('\n').map(l => l.trim()).filter(Boolean);
  const find = (keys: string[]) => {
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (keys.some(k => lower.includes(k.toLowerCase()))) {
        const val = line.split(':').slice(1).join(':').replace(/^[\s📍🏁📅👤\-\u2022]+/, '').trim();
        return val || line;
      }
    }
    return null;
  };
  return {
    pickup: find(['📍 ridicare', 'ridicare', 'pickup address', 'pickup', 'de la']),
    delivery: find(['🏁 livrare', 'livrare', 'delivery address', 'delivery', 'dropoff', 'destinatie', 'destinație', 'până la']),
    date: find(['📅 data preferată', 'data preferata', 'data preferată', 'preferred date', 'data dorit', 'date dorit']),
    contact: find(['👤 contact', 'persoana de contact', 'persoana de contact', 'contact person', 'nume contact'])
  };
};

const Field = ({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string | null }) => {
  const missing = !value || value === '';
  return (
    <div className="rounded-lg border border-border/70 bg-surface/40 px-2.5 py-2">
      <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-0.5 flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className={`text-[12px] font-semibold truncate ${missing ? 'text-text-muted font-normal italic' : 'text-text'}`}>
        {missing ? 'Nespecificat' : value}
      </div>
    </div>
  );
};

export default function ContactInbox() {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [showOrder, setShowOrder] = useState(false);

  const fetchMessages = async () => {
    try {
      const { data } = await api.get('/contact');
      setMessages(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchMessages();
  }, []);

  const markAsRead = async (id: string) => {
    if (messages.find(m => m.id === id)?.isRead) return;
    try {
      await api.patch(`/contact/${id}/read`);
      setMessages(messages.map(m => m.id === id ? { ...m, isRead: true } : m));
    } catch (e) {
      console.error(e);
    }
  };

  const selected = useMemo(() => messages.find(m => m.id === selectedId) || null, [messages, selectedId]);

  const total = messages.length;
  const unread = messages.filter(m => !m.isRead).length;
  const handled = messages.filter(m => m.isRead).length;

  const pagedMessages = messages.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.max(1, Math.ceil(messages.length / itemsPerPage));
  const page = Math.min(currentPage, totalPages);

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    const loc = (i18n.language || 'ro').toLowerCase().startsWith('en') ? 'en-GB' : 'ro-RO';
    return d.toLocaleDateString(loc, { day: '2-digit', month: 'short' }) + ' · ' + d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
  };

  const replyEmail = () => {
    if (!selected) return;
    const subject = encodeURIComponent(`Re: ${selected.subject}`);
    const body = encodeURIComponent(`\n\n---\n${selected.message}\n\n(${selected.name}, ${selected.email})`);
    markAsRead(selected.id);
    window.location.href = `mailto:${selected.email}?subject=${subject}&body=${body}`;
  };

  if (loading) return <div className="p-8 text-center text-text-secondary">{t("jsx_seNcarcMesa")}</div>;

  const rich = selected ? parseStructured(selected) : null;

  return (
    <div className="space-y-4 animate-fade-in">
      <KpiStrip dense items={[
        { key: 'total', label: 'TOTAL MESAJE', value: total, icon: Mail, color: 'text-primary' },
        { key: 'unread', label: 'NECITITE', value: unread, icon: Inbox, color: 'text-error' },
        { key: 'handled', label: 'PRELUATE / CONVERTITE', value: handled, icon: CheckCheck, color: 'text-success' },
        { key: 'avg', label: 'TIMP MEDIU RĂSPUNS', value: '—', icon: Timer, color: 'text-blue-600' },
      ]} />

      <div className="grid lg:grid-cols-[340px_minmax(0,1fr)] bg-card border border-border rounded-xl overflow-hidden shadow-sm min-h-[560px]">
        {/* Master list */}
        <div className="bg-card flex flex-col border-b lg:border-b-0 lg:border-r border-border">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface/40">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Inbox Contact</span>
            {unread > 0 && <span className="text-[10px] font-bold text-error bg-error/10 px-1.5 py-0.5 rounded-full">{unread} necitite</span>}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[560px]">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Mail className="w-7 h-7 text-text-muted mb-2" />
                <p className="text-xs text-text-secondary">{t('noContactMessages') || 'Nu ai primit niciun mesaj încă.'}</p>
              </div>
            ) : pagedMessages.map(m => {
              const isSel = m.id === selectedId;
              return (
                <button
                  key={m.id}
                  onClick={() => { setSelectedId(m.id); markAsRead(m.id); }}
                  className={`w-full flex flex-col gap-0.5 px-3 py-2 text-left transition-colors border-l-2 ${isSel ? 'bg-primary/5 border-l-primary' : 'border-l-transparent hover:bg-surface/60'}`}
                >
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className={`text-[12px] truncate ${m.isRead ? 'font-semibold text-text' : 'font-black text-text'}`}>{m.name}</span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-text-secondary whitespace-nowrap">{fmtTime(m.createdAt)}</span>
                      {!m.isRead && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-text-secondary truncate">{m.subject || '—'}</span>
                  <span className="text-[10px] text-text-muted truncate">{m.message}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between px-3 py-1.5 border-t border-border bg-surface/40">
            <span className="text-[11px] text-text-secondary">{page} din {totalPages}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(Math.max(1, page - 1))} disabled={page <= 1} className="p-1 text-text-secondary hover:text-primary disabled:opacity-30" title="Pagina anterioară"><ChevronLeft className="w-3.5 h-3.5" /></button>
              <button onClick={() => setCurrentPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="p-1 text-text-secondary hover:text-primary disabled:opacity-30" title="Pagina următoare"><ChevronRight className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        </div>

        {/* Detail reader */}
        <div className="bg-card flex flex-col min-w-0">
          {!selected ? (
            <div className="flex flex-col items-center justify-center flex-1 py-16 px-4 text-center">
              <div className="w-14 h-14 bg-surface rounded-2xl flex items-center justify-center mb-3">
                <Mail className="w-6 h-6 text-text-muted" />
              </div>
              <p className="text-sm font-semibold text-text mb-1">{t('contactInboxTitle') || 'Inbox Mesaje Contact'}</p>
              <p className="text-xs text-text-secondary">Selectează un mesaj pentru a-l citi.</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-border flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-black shrink-0 ${selected.isRead ? 'bg-background text-text-secondary' : 'bg-primary/10 text-primary'}`}>
                    {(selected.name?.[0] || '?').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className={`text-[15px] truncate ${selected.isRead ? 'font-semibold text-text' : 'font-black text-text'}`}>{selected.name}</h4>
                    <p className="text-[11px] text-text-secondary truncate">{selected.email}{selected.phone ? ` • ${selected.phone}` : ''} • {fmtTime(selected.createdAt)}</p>
                  </div>
                </div>
                {!selected.isRead && <span className="text-[10px] font-bold text-error bg-error/10 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">Necitit</span>}
              </div>

              <div className="px-4 py-3 border-b border-border">
                <p className="text-[14px] font-bold text-text mb-3">{selected.subject}</p>
                {rich && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Field icon={MapPin} label="📍 Ridicare" value={rich.pickup} />
                    <Field icon={MapPin} label="🏁 Livrare" value={rich.delivery} />
                    <Field icon={CalendarDays} label="📅 Data preferată" value={rich.date} />
                    <Field icon={User} label="👤 Contact" value={rich.contact} />
                  </div>
                )}
              </div>

              <div className="px-4 py-3 flex-1 overflow-y-auto custom-scrollbar max-h-[300px]">
                <p className="text-[13px] text-text leading-relaxed whitespace-pre-wrap">{selected.message}</p>
              </div>

              <div className="px-4 py-2.5 border-t border-border flex items-center gap-2 flex-wrap bg-surface/30">
                <button onClick={() => setShowOrder(true)} className="btn-primary !py-1.5 !px-3 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-primary/20">
                  <Plus className="w-4 h-4" /> Transformă în Comandă
                </button>
                <button onClick={replyEmail} className="btn-secondary !py-1.5 !px-3 text-xs font-bold flex items-center gap-1.5">
                  <Reply className="w-4 h-4" /> Răspunde pe Email
                </button>
                {!selected.isRead && (
                  <button onClick={() => markAsRead(selected.id)} className="btn-secondary !py-1.5 !px-3 text-xs font-bold flex items-center gap-1.5">
                    <Check className="w-4 h-4" /> Marchează citit
                  </button>
                )}
                <div className="flex-1" />
                <span className="text-[10px] text-text-secondary flex items-center gap-1"><Phone className="w-3 h-3" />{selected.phone || '—'}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <OrderWizard
        isOpen={showOrder}
        isPortal
        onClose={() => setShowOrder(false)}
        onSaved={() => { setShowOrder(false); toast.success('Comanda a fost creată!'); }}
        prefill={selected ? {
          pickupAddress: rich?.pickup || undefined,
          deliveryAddress: rich?.delivery || undefined,
          pickupDate: rich?.date || undefined,
          contactPerson: selected.name,
          contactPhone: selected.phone,
          clientName: selected.name,
          notes: `Conversie din mesaj contact (${selected.email}):\n${selected.message}`,
        } : null}
      />
    </div>
  );
}