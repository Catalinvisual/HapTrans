import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Mail, Check, Trash2, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Pagination from '../components/Pagination';
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
export default function ContactInbox() {
  const {
    t
  } = useTranslation();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const fetchMessages = async () => {
    try {
      const {
        data
      } = await api.get('/contact');
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
    try {
      await api.patch(`/contact/${id}/read`);
      setMessages(messages.map(m => m.id === id ? {
        ...m,
        isRead: true
      } : m));
    } catch (e) {
      console.error(e);
    }
  };
  if (loading) return <div className="p-8 text-center text-text-secondary">{t("jsx_seNcarcMesa")}</div>;
  return <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          {t('contactInboxTitle') || 'Inbox Mesaje Contact'}
        </h3>
        <span className="bg-primary/10 text-primary-dark text-xs font-semibold px-2.5 py-0.5 rounded-full">
          {messages.filter(m => !m.isRead).length} {t('unreadMessages') || 'Necitite'}
        </span>
      </div>

      {messages.length === 0 ? <div className="text-center py-12 border-2 border-dashed border-border rounded-xl text-text-secondary">
          {t('noContactMessages') || 'Nu ai primit niciun mesaj încă.'}
        </div> : <div className="space-y-4">
          {messages.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(msg => <div key={msg.id} className={`p-5 rounded-xl border transition-all ${msg.isRead ? 'bg-card border-border' : 'bg-primary/5 border-primary/20 shadow-sm'}`}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${msg.isRead ? 'bg-background' : 'bg-primary/10 text-primary'}`}>
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className={`text-base ${msg.isRead ? 'font-medium text-text' : 'font-bold text-text'}`}>{msg.name}</h4>
                    <p className="text-sm text-text-secondary">
                      {msg.email} {msg.phone && `• ${msg.phone}`} • {new Date(msg.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                {!msg.isRead && <button onClick={() => markAsRead(msg.id)} className="flex items-center gap-1 text-sm text-primary hover:text-primary-dark bg-primary/10 px-3 py-1 rounded-full font-medium transition-colors">
                    <Check className="w-4 h-4" /> {t('markAsRead') || 'Marchează citit'}
                  </button>}
              </div>
              <div className="pl-13 ml-13">
                <p className="font-semibold text-text mb-1">{t("jsx_subiect")}{msg.subject}</p>
                <p className="text-text-secondary whitespace-pre-wrap">{msg.message}</p>
              </div>
            </div>)}
        </div>}
      {messages.length > 0 && <div className="mt-6">
          <Pagination currentPage={currentPage} totalItems={messages.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
        </div>}
    </div>;
}