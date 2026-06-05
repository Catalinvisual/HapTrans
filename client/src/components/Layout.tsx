import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { formatDate } from '../lib/dateUtils';
import Sidebar from './Sidebar';
import LanguageDropdown from './LanguageDropdown';
import { useAuthStore } from '../store/authStore';
import { Bell, LogOut, CheckCheck, FileText, MessageSquare, Truck, AlertTriangle, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const PAGE_TITLES: Record<string, Record<string, string>> = {
  '/dashboard': { ro: 'Panou de Control', en: 'Dashboard', nl: 'Dashboard' },
  '/trips': { ro: 'Curse', en: 'Trips', nl: 'Ritten' },
  '/trucks': { ro: 'Camioane', en: 'Trucks', nl: 'Vrachtwagens' },
  '/drivers': { ro: 'Șoferi', en: 'Drivers', nl: 'Chauffeurs' },
  '/clients': { ro: 'Clienți', en: 'Clients', nl: 'Klanten' },
  '/map': { ro: 'Hartă Live', en: 'Live Map', nl: 'Live Kaart' },
  '/documents': { ro: 'Documente', en: 'Documents', nl: 'Documenten' },
  '/invoices': { ro: 'Facturi', en: 'Invoices', nl: 'Facturen' },
  '/financial': { ro: 'Financiar', en: 'Financial', nl: 'Financieel' },
  '/payroll': { ro: 'Salarii (NL)', en: 'Payroll (NL)', nl: 'Salarissen' },
  '/maintenance': { ro: 'Mentenanță', en: 'Maintenance', nl: 'Onderhoud' },
  '/settings': { ro: 'Setări', en: 'Settings', nl: 'Instellingen' },
  '/users': { ro: 'Utilizatori', en: 'Users', nl: 'Gebruikers' },
  '/planning': { ro: 'Planificare', en: 'Planning', nl: 'Planning' },
  '/chat': { ro: 'Chat Dispecerat', en: 'Dispatch Chat', nl: 'Dispatch Chat' },
};

export default function Layout() {
  const { i18n, t } = useTranslation();
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const lang = i18n.language as string;
  const title = PAGE_TITLES[location.pathname]?.[lang] ?? 'HapTrans';

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data) {
        setNotifications(res.data.data);
        setUnreadCount(res.data.unreadCount);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-surface relative">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-border flex items-center justify-between px-4 md:px-6 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden p-2 -ml-2 text-text-secondary hover:bg-surface rounded-lg"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h2 className="text-base font-semibold text-text">{title}</h2>
              <p className="text-xs text-text-secondary hidden sm:block">
                {formatDate(new Date().toISOString())}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <div className="relative">
              <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative w-9 h-9 flex items-center justify-center rounded-xl border border-border hover:bg-surface hover:border-primary/40 transition-all"
              >
                <Bell className="w-4 h-4 text-text-secondary" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
                )}
              </button>
              
              {isNotifOpen && (
                <div className="absolute top-12 right-0 w-80 bg-white rounded-xl shadow-xl border border-border overflow-hidden z-50 flex flex-col max-h-[420px]">
                  <div className="p-3 border-b border-border flex justify-between items-center bg-surface">
                    <span className="font-semibold text-text text-sm">{t('notif_title')}</span>
                    {unreadCount > 0 && (
                      <button onClick={() => markAsRead('all')} className="text-xs text-primary hover:underline flex items-center gap-1">
                        <CheckCheck className="w-3 h-3" /> {t('notif_mark_all_read')}
                      </button>
                    )}
                  </div>
                  <div className="overflow-y-auto flex-1 p-2">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-sm text-text-secondary flex flex-col items-center gap-2">
                        <Bell className="w-8 h-8 text-border" />
                        {t('notif_no_notifications')}
                      </div>
                    ) : (
                      notifications.map(n => {
                        // Translate title key
                        let translatedTitle = n.title?.startsWith('notif_') ? t(n.title) : n.title;
                        if (n.title === 'Document Expirat / Expiră Curând' || n.title === 'Document Expiring Soon') {
                          translatedTitle = t('notif_doc_expiring_title') || n.title;
                        }

                        // Smart message parsing: type|||param1|||param2
                        let translatedMessage = n.message;
                        if (translatedMessage) {
                          translatedMessage = translatedMessage.replace('Permis', t('doc_permis') || 'Permis')
                                                               .replace('Aviz Medical', t('doc_medical') || 'Aviz Medical')
                                                               .replace('Card Tahograf', t('doc_tacho') || 'Card Tahograf');
                        }
                        if (n.type === 'document' && n.message?.includes('|||')) {
                          const [docType, tripId] = n.message.split('|||');
                          translatedMessage = t('notif_document_msg', { type: docType, tripId });
                        } else if (n.type === 'trip' && n.message?.includes('|||')) {
                          const parts = n.message.split('|||');
                          const tripId = parts[0];
                          const status = parts[1];
                          const pickup = parts[2] || '';
                          const dropoff = parts[3] || '';
                          const statusKey = `notif_status_${status}`;
                          if (pickup && dropoff) {
                            const routeText = `${pickup} → ${dropoff}`;
                            translatedMessage = lang === 'ro' 
                              ? `Cursa ${routeText} a fost schimbată în: ${t(statusKey) || status}`
                              : `Trip ${routeText} has been changed to: ${t(statusKey) || status}`;
                          } else {
                            translatedMessage = t('notif_trip_msg', { tripId, status: t(statusKey) || status });
                          }
                        } else if (n.message === 'notif_chat_file') {
                          translatedMessage = t('notif_chat_file');
                        }

                        // Icon by type
                        const NotifIcon = n.type === 'document' ? FileText
                          : n.type === 'chat' ? MessageSquare
                          : n.type === 'trip' ? Truck
                          : AlertTriangle;

                        const iconColor = n.type === 'document' ? 'text-blue-500'
                          : n.type === 'chat' ? 'text-green-500'
                          : n.type === 'trip' ? 'text-orange-500'
                          : 'text-red-500';

                        const localeMap: Record<string,string> = { ro:'ro-RO', en:'en-GB', nl:'nl-NL', de:'de-DE', fr:'fr-FR' };

                        return (
                          <div
                            key={n.id}
                            onClick={() => { 
                              if (!n.isRead) markAsRead(n.id); 
                              if (n.type === 'document') navigate('/documents');
                              else if (n.type === 'chat') navigate('/chat');
                              else if (n.type === 'trip') navigate('/trips');
                              setIsNotifOpen(false);
                            }}
                            className={`flex gap-3 p-3 rounded-lg mb-1 cursor-pointer transition-colors ${
                              n.isRead ? 'opacity-60 hover:bg-surface' : 'bg-primary/5 border border-primary/15 hover:bg-primary/10'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-surface border border-border`}>
                              <NotifIcon className={`w-4 h-4 ${iconColor}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <span className="font-semibold text-text text-xs leading-tight">{translatedTitle}</span>
                                {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary mt-0.5 flex-shrink-0 ml-1" />}
                              </div>
                              <p className="text-xs text-text-secondary line-clamp-2 mt-0.5 leading-snug">{translatedMessage}</p>
                              <span className="text-[10px] text-text-secondary/50 mt-1 block">
                                {new Date(n.createdAt).toLocaleString(localeMap[lang] || 'en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Language Dropdown */}
            <LanguageDropdown />

            {/* User Avatar & Logout */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-border">
              <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold text-sm">{user?.name?.[0]?.toUpperCase()}</span>
              </div>
              <div className="hidden md:block mr-2">
                <div className="text-sm font-semibold text-text leading-tight">{user?.name}</div>
                <div className="text-xs text-text-secondary capitalize">{user?.role}</div>
              </div>
              <button 
                onClick={handleLogout} 
                title={t('logout')} 
                className="p-1.5 text-text-secondary hover:text-error hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
          <div className="p-4 md:p-6 w-full mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
