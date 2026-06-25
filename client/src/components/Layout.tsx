import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
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
  '/website-cms': { ro: 'Conținut Website', en: 'Website Content', nl: 'Website Content' },
};

// Shared AudioContext to perfectly bypass browser autoplay restrictions
let sharedAudioCtx: AudioContext | null = null;
if (typeof window !== 'undefined') {
  const initAudio = () => {
    try {
      // @ts-ignore
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!sharedAudioCtx && AudioContextClass) {
        sharedAudioCtx = new AudioContextClass();
      } else if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
        sharedAudioCtx.resume();
      }
    } catch (e) {}
  };
  window.addEventListener('pointerdown', initAudio, { passive: true });
  window.addEventListener('keydown', initAudio, { passive: true });
}

const formatNotification = (n: any, lang: string, t: any) => {
  if (!n) return { title: '', message: '' };
  let title = n.title || '';
  let message = n.message || '';

  // 1. Translate Title
  if (title.startsWith('notif_')) {
    title = t(title) || title;
  } else if (title === 'Document Expirat / Expiră Curând' || title === 'Document Expiring Soon') {
    title = t('notif_doc_expiring_title') || title;
  } else if (title.includes('Document Nou de la')) {
    const parts = title.split(':');
    const name = parts.length > 1 ? parts[1].trim() : '';
    if (lang === 'ro') title = `Document Nou • ${name}`;
    else if (lang === 'en') title = `New Document • ${name}`;
    else if (lang === 'nl') title = `Nieuw Document • ${name}`;
    else if (lang === 'de') title = `Neues Dokument • ${name}`;
    else if (lang === 'fr') title = `Nouveau Document • ${name}`;
    else title = `New Document • ${name}`;
  } else if (title.includes('Mesaj de la')) {
    const parts = title.split(':');
    const name = parts.length > 1 ? parts[1].trim() : '';
    if (lang === 'ro') title = `Mesaj Nou • ${name}`;
    else if (lang === 'en') title = `New Message • ${name}`;
    else if (lang === 'nl') title = `Nieuw Bericht • ${name}`;
    else if (lang === 'de') title = `Neue Nachricht • ${name}`;
    else if (lang === 'fr') title = `Nouveau Message • ${name}`;
    else title = `New Message • ${name}`;
  } else if (title.startsWith('Status Cursă:')) {
    const statusPart = title.replace('Status Cursă:', '').trim();
    if (lang === 'ro') title = `Actualizare Cursă • ${statusPart}`;
    else if (lang === 'en') title = `Trip Update • ${statusPart}`;
    else if (lang === 'nl') title = `Rit Update • ${statusPart}`;
    else if (lang === 'de') title = `Fahrt Update • ${statusPart}`;
    else if (lang === 'fr') title = `Mise à jour du Trajet • ${statusPart}`;
    else title = `Trip Update • ${statusPart}`;
  }

  // 2. Translate Message
  if (message) {
    message = message.replace('Permis', t('doc_permis') || 'Permis')
                     .replace('Aviz Medical', t('doc_medical') || 'Aviz Medical')
                     .replace('Card Tahograf', t('doc_tacho') || 'Card Tahograf');
  }

  if (n.type === 'document' && message?.includes('|||')) {
    const [docType, tripId] = message.split('|||');
    const cleanTripId = tripId.length > 20 ? tripId.slice(0, 8).toUpperCase() : tripId;
    if (lang === 'ro') message = `Document nou (${docType}) pentru cursa #${cleanTripId}`;
    else if (lang === 'en') message = `New document (${docType}) for trip #${cleanTripId}`;
    else if (lang === 'nl') message = `Nieuw document (${docType}) voor rit #${cleanTripId}`;
    else if (lang === 'de') message = `Neues Dokument (${docType}) für Fahrt #${cleanTripId}`;
    else if (lang === 'fr') message = `Nouveau document (${docType}) pour le trajet #${cleanTripId}`;
    else message = `New document (${docType}) for trip #${cleanTripId}`;
  } else if (n.type === 'document' && message?.includes('Fișier') && message?.includes('încărcat pentru Cursa:')) {
    const match = message.match(/Fișier (.*?) încărcat pentru Cursa: (.*)/);
    if (match) {
      const docType = match[1];
      const tripRef = match[2];
      if (lang === 'ro') message = `Fișier ${docType} încărcat (Cursa: ${tripRef})`;
      else if (lang === 'en') message = `${docType} file uploaded (Trip: ${tripRef})`;
      else if (lang === 'nl') message = `${docType} bestand geüpload (Rit: ${tripRef})`;
      else if (lang === 'de') message = `${docType}-Datei hochgeladen (Fahrt: ${tripRef})`;
      else if (lang === 'fr') message = `Fichier ${docType} téléversé (Course: ${tripRef})`;
      else message = `${docType} file uploaded (Trip: ${tripRef})`;
    }
  } else if (n.type === 'chat' && message?.includes('(Cursa:')) {
    const parts = message.split('(Cursa:');
    const msgText = parts[0].trim();
    const tripRef = parts[1].replace(')', '').trim();
    if (lang === 'ro') message = `${msgText} (Cursa: ${tripRef})`;
    else if (lang === 'en') message = `${msgText} (Trip: ${tripRef})`;
    else if (lang === 'nl') message = `${msgText} (Rit: ${tripRef})`;
    else if (lang === 'de') message = `${msgText} (Fahrt: ${tripRef})`;
    else if (lang === 'fr') message = `${msgText} (Course: ${tripRef})`;
    else message = `${msgText} (Trip: ${tripRef})`;
  } else if (n.type === 'trip' && message?.includes('|||')) {
    const parts = message.split('|||');
    const tripId = parts[0];
    const cleanTripId = tripId.length > 20 ? tripId.slice(0, 8).toUpperCase() : tripId;
    const status = parts[1];
    const pickup = parts[2] || '';
    const dropoff = parts[3] || '';
    const statusKey = `notif_status_${status}`;
    const translatedStatus = t(statusKey) || status;
    if (pickup && dropoff) {
      const routeText = `${pickup} → ${dropoff}`;
      if (lang === 'ro') message = `Cursa ${routeText} a fost schimbată în: ${translatedStatus}`;
      else if (lang === 'en') message = `Trip ${routeText} has been changed to: ${translatedStatus}`;
      else if (lang === 'nl') message = `Rit ${routeText} is gewijzigd naar: ${translatedStatus}`;
      else if (lang === 'de') message = `Fahrt ${routeText} wurde geändert in: ${translatedStatus}`;
      else if (lang === 'fr') message = `Trajet ${routeText} a été changé en: ${translatedStatus}`;
      else message = `Trip ${routeText} has been changed to: ${translatedStatus}`;
    } else {
      if (lang === 'ro') message = `Cursa #${cleanTripId} a fost schimbată în: ${translatedStatus}`;
      else if (lang === 'en') message = `Trip #${cleanTripId} has been changed to: ${translatedStatus}`;
      else if (lang === 'nl') message = `Rit #${cleanTripId} is gewijzigd naar: ${translatedStatus}`;
      else if (lang === 'de') message = `Fahrt #${cleanTripId} wurde geändert in: ${translatedStatus}`;
      else if (lang === 'fr') message = `Trajet #${cleanTripId} a été changé en: ${translatedStatus}`;
      else message = `Trip #${cleanTripId} has been changed to: ${translatedStatus}`;
    }
  } else if (n.type === 'trip' && message?.includes('a fost schimbată în statusul:')) {
    const match = message.match(/Cursa (.*?) a fost schimbată în statusul: (.*?) de către (.*)/);
    if (match) {
      const tripRef = match[1];
      const statusPart = match[2];
      const driverName = match[3];
      if (lang === 'ro') message = `Cursa ${tripRef} a devenit: ${statusPart} (${driverName})`;
      else if (lang === 'en') message = `Trip ${tripRef} is now: ${statusPart} (${driverName})`;
      else if (lang === 'nl') message = `Rit ${tripRef} is nu: ${statusPart} (${driverName})`;
      else if (lang === 'de') message = `Fahrt ${tripRef} ist jetzt: ${statusPart} (${driverName})`;
      else if (lang === 'fr') message = `Course ${tripRef} est mtn: ${statusPart} (${driverName})`;
      else message = `Trip ${tripRef} is now: ${statusPart} (${driverName})`;
    }
  } else if (message === 'notif_chat_file') {
    message = t('notif_chat_file') || message;
  }

  return { title, message };
};

export default function Layout() {
  const { i18n, t } = useTranslation();
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const lang = i18n.language as string;
  const title = PAGE_TITLES[location.pathname]?.[lang] ?? 'HapCargo';

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [popupNotif, setPopupNotif] = useState<any | null>(null);
  const lastNotifIdRef = useRef<string | null>(null);

  const playNotificationSound = () => {
    try {
      if (!sharedAudioCtx) {
        // @ts-ignore
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) sharedAudioCtx = new AudioContextClass();
      }
      if (!sharedAudioCtx) return;
      if (sharedAudioCtx.state === 'suspended') {
        sharedAudioCtx.resume();
      }
      
      const ctx = sharedAudioCtx;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      gain1.gain.setValueAtTime(0.25, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.4);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12); // E5
      gain2.gain.setValueAtTime(0.25, ctx.currentTime + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.12);
      osc2.stop(ctx.currentTime + 0.6);
    } catch (e) {
      console.error('Audio playback error:', e);
    }
  };

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

        if (res.data.data && res.data.data.length > 0) {
          const latest = res.data.data[0];
          if (lastNotifIdRef.current !== null && latest.id !== lastNotifIdRef.current && !latest.isRead) {
            lastNotifIdRef.current = latest.id;
            setPopupNotif(latest);
            playNotificationSound();
            setTimeout(() => {
              setPopupNotif((current: any) => current?.id === latest.id ? null : current);
            }, 6000);
          } else if (lastNotifIdRef.current === null) {
            lastNotifIdRef.current = latest.id;
          }
        }
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
                        const { title: translatedTitle, message: translatedMessage } = formatNotification(n, lang, t);

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

      {/* Bottom-right Real-time Notification Popup Card */}
      {popupNotif && (() => {
        const n = popupNotif;
        const { title: translatedTitle, message: translatedMessage } = formatNotification(n, lang, t);

        const NotifIcon = n.type === 'document' ? FileText
          : n.type === 'chat' ? MessageSquare
          : n.type === 'trip' ? Truck
          : AlertTriangle;

        const iconColor = n.type === 'document' ? 'text-blue-500'
          : n.type === 'chat' ? 'text-green-500'
          : n.type === 'trip' ? 'text-orange-500'
          : 'text-red-500';

        return (
          <div 
            className="fixed bottom-6 right-6 z-[9999] w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-border p-4 animate-slide-in flex flex-col gap-2 cursor-pointer hover:scale-[1.02] transition-all duration-200"
            onClick={() => {
              if (!n.isRead) markAsRead(n.id);
              if (n.type === 'document') navigate('/documents');
              else if (n.type === 'chat') navigate('/chat');
              else if (n.type === 'trip') navigate('/trips');
              setPopupNotif(null);
            }}
          >
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center border border-border">
                  <NotifIcon className={`w-4 h-4 ${iconColor}`} />
                </div>
                <span className="font-bold text-text text-xs tracking-wide uppercase">{translatedTitle}</span>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setPopupNotif(null); }}
                className="text-text-secondary hover:text-text p-1 rounded-lg"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed font-medium">{translatedMessage}</p>
            <div className="w-full bg-surface h-1 rounded-full overflow-hidden mt-1">
              <div className="bg-primary h-full w-full animate-[progress_6s_linear]" />
            </div>
          </div>
        );
      })()}
    </div>
  );
}
