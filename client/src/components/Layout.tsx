import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import { formatDate } from '../lib/dateUtils';
import Sidebar from './Sidebar';
import LanguageDropdown from './LanguageDropdown';
import { useAuthStore } from '../store/authStore';
import { Bell, LogOut, CheckCheck, FileText, MessageSquare, Truck, AlertTriangle, Menu, Keyboard, Search, User, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useShortcuts } from '../hooks/useShortcuts';
import ShortcutsHelpModal from './ShortcutsHelpModal';
import GlobalSearchModal from './GlobalSearchModal';
import ConfirmModal from './ConfirmModal';
import { navItems } from './Sidebar';

let deferredPrompt: any = null;
let installPromptListeners: Function[] = [];
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installPromptListeners.forEach(listener => listener(e));
  });
}

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

  // --- 1. TRANSLATE TITLE ---
  if (title === 'notif_trip_title' || title === 'Actualizare Status Cursă') {
    if (lang === 'ro') title = 'Actualizare Status Cursă';
    else if (lang === 'en') title = 'Trip Status Update';
    else if (lang === 'nl') title = 'Ritstatus Update';
    else if (lang === 'de') title = 'Fahrtstatus Aktualisierung';
    else if (lang === 'fr') title = 'Mise à jour du statut du trajet';
    else title = 'Trip Status Update';
  } else if (title.startsWith('notif_')) {
    title = t(title) || title;
  } else if (title === 'Document Expirat / Expiră Curând' || title === 'Document Expiring Soon' || title === 'notif_doc_expiring_title') {
    if (lang === 'ro') title = 'Document Expiră Curând';
    else if (lang === 'en') title = 'Document Expiring Soon';
    else if (lang === 'nl') title = 'Document Verloopt Binnenkort';
    else if (lang === 'de') title = 'Dokument läuft bald ab';
    else if (lang === 'fr') title = 'Document expirant bientôt';
    else title = 'Document Expiring Soon';
  } else if (title === 'Întârziat') {
    if (lang === 'ro') title = 'Cursă Întârziată';
    else if (lang === 'en') title = 'Trip Delayed';
    else if (lang === 'nl') title = 'Rit Vertraagd';
    else if (lang === 'de') title = 'Fahrt Verspätet';
    else if (lang === 'fr') title = 'Trajet Retardé';
    else title = 'Trip Delayed';
  } else if (title === 'Risc Întârziere') {
    if (lang === 'ro') title = 'Risc Întârziere Cursă';
    else if (lang === 'en') title = 'Trip Delay Risk';
    else if (lang === 'nl') title = 'Risico op Vertraging';
    else if (lang === 'de') title = 'Risiko von Verspätung';
    else if (lang === 'fr') title = 'Risque de Retard';
    else title = 'Trip Delay Risk';
  } else if (title === 'Factură draft veche (7+ zile)') {
    if (lang === 'ro') title = 'Factură Provizorie (7+ zile)';
    else if (lang === 'en') title = 'Draft Invoice (7+ days)';
    else if (lang === 'nl') title = 'Conceptfactuur (7+ dagen)';
    else if (lang === 'de') title = 'Entwurfsrechnung (7+ Tage)';
    else if (lang === 'fr') title = 'Facture Brouillon (7+ jours)';
    else title = 'Draft Invoice (7+ days)';
  } else if (title === 'Factură draft uitată (3 zile)') {
    if (lang === 'ro') title = 'Factură Provizorie (3 zile)';
    else if (lang === 'en') title = 'Draft Invoice (3 days)';
    else if (lang === 'nl') title = 'Conceptfactuur (3 dagen)';
    else if (lang === 'de') title = 'Entwurfsrechnung (3 Tage)';
    else if (lang === 'fr') title = 'Facture Brouillon (3 jours)';
    else title = 'Draft Invoice (3 days)';
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

  // --- 2. TRANSLATE MESSAGE ---
  if (message) {
    const permisText = lang === 'ro' ? 'Permis de Conducere' : lang === 'en' ? 'Driver License' : lang === 'nl' ? 'Rijbewijs' : lang === 'de' ? 'Führerschein' : 'Permis de conduire';
    const medicalText = lang === 'ro' ? 'Aviz Medical' : lang === 'en' ? 'Medical Certificate' : lang === 'nl' ? 'Medische Verklaring' : lang === 'de' ? 'Ärztliches Gutachten' : 'Certificat médical';
    const tachoText = lang === 'ro' ? 'Card Tahograf' : lang === 'en' ? 'Tachograph Card' : lang === 'nl' ? 'Bestuurderskaart' : lang === 'de' ? 'Fahrerkarte' : 'Carte de tachygraphe';
    
    message = message.replace('Permis', permisText)
                     .replace('Aviz Medical', medicalText)
                     .replace('Card Tahograf', tachoText);
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
    
    const statusMap: Record<string, Record<string, string>> = {
      pending: { ro: 'În Așteptare', en: 'Pending', nl: 'In Afwachting', de: 'Ausstehend', fr: 'En attente' },
      confirmed: { ro: 'Confirmată', en: 'Confirmed', nl: 'Bevestigd', de: 'Bestätigt', fr: 'Confirmé' },
      loading: { ro: 'La încărcare', en: 'Loading', nl: 'Aan het laden', de: 'Wird geladen', fr: 'En chargement' },
      in_progress: { ro: 'În desfășurare', en: 'In Progress', nl: 'Onderweg', de: 'Im Gange', fr: 'En cours' },
      completed: { ro: 'Finalizată', en: 'Completed', nl: 'Voltooid', de: 'Abgeschlossen', fr: 'Terminé' },
      cancelled: { ro: 'Anulată', en: 'Cancelled', nl: 'Geannuleerd', de: 'Abgebrochen', fr: 'Annulé' },
      delayed: { ro: 'Întârziată', en: 'Delayed', nl: 'Vertraagd', de: 'Verspätet', fr: 'Retardé' },
      active: { ro: 'Activă', en: 'Active', nl: 'Actief', de: 'Aktiv', fr: 'Actif' },
    };

    const cleanStatus = status.toLowerCase().trim();
    let translatedStatus = statusMap[cleanStatus]?.[lang];
    if (!translatedStatus) {
      const tVal = t(`notif_status_${status}`);
      translatedStatus = tVal.startsWith('notif_') ? status : tVal;
    }

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
      const rawStatus = match[2];
      const driverName = match[3];
      
      const statusMap: Record<string, Record<string, string>> = {
        pending: { ro: 'În Așteptare', en: 'Pending', nl: 'In Afwachting', de: 'Ausstehend', fr: 'En attente' },
        confirmed: { ro: 'Confirmată', en: 'Confirmed', nl: 'Bevestigd', de: 'Bestätigt', fr: 'Confirmé' },
        loading: { ro: 'La încărcare', en: 'Loading', nl: 'Aan het laden', de: 'Wird geladen', fr: 'En chargement' },
        in_progress: { ro: 'În desfășurare', en: 'In Progress', nl: 'Onderweg', de: 'Im Gange', fr: 'En cours' },
        completed: { ro: 'Finalizată', en: 'Completed', nl: 'Voltooid', de: 'Abgeschlossen', fr: 'Terminé' },
        cancelled: { ro: 'Anulată', en: 'Cancelled', nl: 'Geannuleerd', de: 'Abgebrochen', fr: 'Annulé' },
        delayed: { ro: 'Întârziată', en: 'Delayed', nl: 'Vertraagd', de: 'Verspätet', fr: 'Retardé' },
        active: { ro: 'Activă', en: 'Active', nl: 'Actief', de: 'Aktiv', fr: 'Actif' },
      };

      let cleanKey = rawStatus.toLowerCase().replace(/\(.*?\)/g, '').trim();
      if (cleanKey.includes('pending') || cleanKey.includes('așteptare')) cleanKey = 'pending';
      else if (cleanKey.includes('confirm')) cleanKey = 'confirmed';
      else if (cleanKey.includes('load') || cleanKey.includes('încărcare')) cleanKey = 'loading';
      else if (cleanKey.includes('progress') || cleanKey.includes('desfășurare')) cleanKey = 'in_progress';
      else if (cleanKey.includes('complet') || cleanKey.includes('finalizat')) cleanKey = 'completed';
      else if (cleanKey.includes('cancel') || cleanKey.includes('anulat')) cleanKey = 'cancelled';
      else if (cleanKey.includes('delay') || cleanKey.includes('întârziat')) cleanKey = 'delayed';
      
      const statusPart = statusMap[cleanKey]?.[lang] || rawStatus;

      if (lang === 'ro') message = `Cursa ${tripRef} a devenit: ${statusPart} (${driverName})`;
      else if (lang === 'en') message = `Trip ${tripRef} is now: ${statusPart} (${driverName})`;
      else if (lang === 'nl') message = `Rit ${tripRef} is nu: ${statusPart} (${driverName})`;
      else if (lang === 'de') message = `Fahrt ${tripRef} ist jetzt: ${statusPart} (${driverName})`;
      else if (lang === 'fr') message = `Course ${tripRef} est mtn: ${statusPart} (${driverName})`;
      else message = `Trip ${tripRef} is now: ${statusPart} (${driverName})`;
    }
  } else if (message?.includes('a depășit timpul limită programat pentru livrare')) {
    const match = message.match(/Cursa (.*?) a depășit timpul limită/);
    const tripRef = match ? match[1] : '';
    if (lang === 'ro') message = `Cursa ${tripRef} a depășit timpul limită programat pentru livrare.`;
    else if (lang === 'en') message = `Trip ${tripRef} has exceeded the scheduled delivery deadline.`;
    else if (lang === 'nl') message = `Rit ${tripRef} heeft de geplande levertijd overschreden.`;
    else if (lang === 'de') message = `Fahrt ${tripRef} hat die geplante Lieferzeit überschritten.`;
    else if (lang === 'fr') message = `Le trajet ${tripRef} a dépassé l'heure de livraison prévue.`;
  } else if (message?.includes('are risc major de întârziere')) {
    const match = message.match(/Cursa (.*?) are risc major de întârziere/);
    const tripRef = match ? match[1] : '';
    if (lang === 'ro') message = `Cursa ${tripRef} are risc major de întârziere (>60 min).`;
    else if (lang === 'en') message = `Trip ${tripRef} has a major delay risk (>60 min).`;
    else if (lang === 'nl') message = `Rit ${tripRef} heeft een groot risico op vertraging (>60 min).`;
    else if (lang === 'de') message = `Fahrt ${tripRef} hat ein hohes Verspätungsrisiko (>60 min).`;
    else if (lang === 'fr') message = `Le trajet ${tripRef} présente un risque de retard majeur (>60 min).`;
  } else if (message?.includes('a fost creată pe') && message?.includes('și trebuie aprobată')) {
    const match = message.match(/Factura provizorie (.*?) pentru clientul (.*?) a fost creată pe/);
    if (match) {
      const invNum = match[1];
      const clientName = match[2];
      if (lang === 'ro') message = `Factura provizorie ${invNum} (${clientName}) este mai veche de 7 zile și necesită aprobare.`;
      else if (lang === 'en') message = `Draft invoice ${invNum} (${clientName}) is older than 7 days and requires approval.`;
      else if (lang === 'nl') message = `Conceptfactuur ${invNum} (${clientName}) is ouder dan 7 dagen en vereist goedkeuring.`;
      else if (lang === 'de') message = `Entwurfsrechnung ${invNum} (${clientName}) ist älter als 7 Tage und erfordert eine Genehmigung.`;
      else if (lang === 'fr') message = `La facture brouillon ${invNum} (${clientName}) date de plus de 7 jours et nécessite une approbation.`;
    }
  } else if (message?.includes('Factura provizorie') && message?.includes('așteaptă aprobarea')) {
    const match = message.match(/Factura provizorie (.*?) pentru clientul (.*?) așteaptă aprobarea/);
    if (match) {
      const invNum = match[1];
      const clientName = match[2];
      if (lang === 'ro') message = `Factura provizorie ${invNum} (${clientName}) așteaptă aprobarea ta.`;
      else if (lang === 'en') message = `Draft invoice ${invNum} (${clientName}) is waiting for your approval.`;
      else if (lang === 'nl') message = `Conceptfactuur ${invNum} (${clientName}) wacht op uw goedkeuring.`;
      else if (lang === 'de') message = `Entwurfsrechnung ${invNum} (${clientName}) wartet auf Ihre Genehmigung.`;
      else if (lang === 'fr') message = `La facture brouillon ${invNum} (${clientName}) attend votre approbation.`;
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

  useEffect(() => {
    document.title = title;
  }, [title]);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [popupNotif, setPopupNotif] = useState<any | null>(null);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(deferredPrompt);
  const [isStandalone, setIsStandalone] = useState(
    typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches
  );
  
  const lastNotifIdRef = useRef<string | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const isDispatcher = user?.role === 'dispatcher';
  const restrictedKeys = ['financial', 'payroll', 'expenses', 'websiteCms', 'users', 'settings'];
  const filteredNavItems = navItems.filter(item => {
    if (user?.allowedPages && user.allowedPages.length > 0) {
      return user.allowedPages.includes(item.key);
    }
    if (isDispatcher && restrictedKeys.includes(item.key)) {
      return false;
    }
    return true;
  });

  const navigateSidebar = (direction: number) => {
    if (filteredNavItems.length === 0) return;
    const currentIndex = filteredNavItems.findIndex(item => item.to === location.pathname);
    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) nextIndex = filteredNavItems.length - 1;
    if (nextIndex >= filteredNavItems.length) nextIndex = 0;
    navigate(filteredNavItems[nextIndex].to);
  };

  useShortcuts({
    'shift+h': () => setIsShortcutsModalOpen(true),
    'f12': () => setIsLogoutModalOpen(true),
    'shift+arrowup': () => navigateSidebar(-1),
    'shift+arrowdown': () => navigateSidebar(1),
    'shift+k': () => setIsSearchOpen(true),
    'shift+n': () => {}, // Prevent default browser behavior if page has no handler
    'escape': () => {
      const hasOpenModal = document.querySelector('.fixed.inset-0, [role="dialog"]');
      if (!hasOpenModal) {
        window.history.back();
      }
    }
  });
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
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const listener = (e: any) => setInstallPrompt(e);
    installPromptListeners.push(listener);
    
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => setIsStandalone(e.matches);
    mediaQuery.addEventListener('change', handleMediaChange);

    return () => {
      installPromptListeners = installPromptListeners.filter(l => l !== listener);
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent | PointerEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('pointerdown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data) {
        // Only show unread notifications in the dropdown panel
        const unreadList = (res.data.data || []).filter((n: any) => !n.isRead);
        setNotifications(unreadList);
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
      if (id === 'all') {
        setNotifications([]);
        setUnreadCount(0);
      } else {
        setNotifications(prev => prev.filter(n => n.id !== id));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      await api.patch(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error('Logout error', e);
    }
    logout();
    navigate('/login');
  };

  const handleLogoutAll = async () => {
    try {
      await api.post('/auth/logout-all');
    } catch (e) {
      console.error('Logout all error', e);
    }
    logout();
    navigate('/login');
  };

  const handleInstallPWA = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        setInstallPrompt(null);
        deferredPrompt = null;
      });
    } else {
      alert(t('pwa_install_unavailable', 'Aplicația de desktop a fost deja activată în browser.\n\nDacă ai șters-o din greșeală, o poți reinstala dând click pe iconița de instalare din dreapta barei de adrese a browser-ului tău (sus) sau mergând la Meniul Browserului -> Instalare HAPCARGO / Create Shortcut.'));
    }
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
            {/* Desktop Install Button */}
            {!isStandalone && (
              <button 
                onClick={handleInstallPWA}
                title={t('install_app', 'Instalează aplicația pe Desktop')}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 hover:border-primary/40 transition-all text-primary"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
            {/* Global Search Icon */}
            <button 
              onClick={() => setIsSearchOpen(true)}
              title={t('sc_search', 'Caută/deschide orice (Shift+K)')}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-border hover:bg-surface hover:border-primary/40 transition-all text-text-secondary"
            >
              <Search className="w-4 h-4" />
            </button>
            {/* Shortcuts Help Icon */}
            <button 
              onClick={() => setIsShortcutsModalOpen(true)}
              title={t('shortcuts_title', 'Keyboard Shortcuts (F1)')}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-border hover:bg-surface hover:border-primary/40 transition-all text-text-secondary"
            >
              <Keyboard className="w-4 h-4" />
            </button>

            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
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
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(n.id);
                              }}
                              title={lang === 'ro' ? 'Marchează ca citit și șterge din panou' : 'Mark as read & dismiss'}
                              className="p-1 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors ml-1 flex-shrink-0 self-start"
                            >
                              <CheckCheck className="w-4 h-4" />
                            </button>
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

            {/* User Profile Dropdown */}
            <div className="relative pl-3 border-l border-border" ref={profileRef}>
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-surface transition-colors focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">{user?.name?.[0]?.toUpperCase()}</span>
                </div>
                <div className="hidden md:block text-left mr-1">
                  <div className="text-sm font-semibold text-text leading-tight">{user?.name}</div>
                  <div className="text-xs text-text-secondary capitalize">{user?.role}</div>
                </div>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-border shadow-xl rounded-xl overflow-hidden z-50 animate-fade-in origin-top-right">
                  <div className="p-1">
                    {/* PWA Install Button */}
                    {!isStandalone && (
                      <button 
                        onClick={handleInstallPWA}
                        className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-primary/5 rounded-lg transition-colors flex items-center gap-2 font-medium"
                      >
                        <Download className="w-4 h-4" />
                        {t('install_app', 'Install HAPCARGO')}
                      </button>
                    )}
                    
                    <button 
                      onClick={() => { setIsLogoutModalOpen(true); setIsProfileOpen(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-error hover:bg-error/5 rounded-lg transition-colors flex items-center gap-2 mt-1"
                    >
                      <LogOut className="w-4 h-4" />
                      {t('logout', 'Logout')}
                    </button>

                    <button 
                      onClick={() => { handleLogoutAll(); setIsProfileOpen(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-error hover:bg-error/5 rounded-lg transition-colors flex items-center gap-2 mt-1"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      {t('logout_all', 'Logout from all devices')}
                    </button>
                  </div>
                </div>
              )}
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

      <ShortcutsHelpModal 
        isOpen={isShortcutsModalOpen} 
        onClose={() => setIsShortcutsModalOpen(false)} 
      />

      <GlobalSearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />

      <ConfirmModal
        isOpen={isLogoutModalOpen}
        title={t('logout', 'Logout')}
        message={t('confirm_logout', 'Sunteți sigur că doriți să vă deconectați?')}
        onConfirm={handleLogout}
        onCancel={() => setIsLogoutModalOpen(false)}
      />
    </div>
  );
}
