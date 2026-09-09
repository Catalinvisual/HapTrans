import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Users, User, Clock, MessageSquare, Paperclip, FileText, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import api from '../lib/api';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function ChatPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>('general');
  const [selectedTripName, setSelectedTripName] = useState<string>('');
  const [text, setText] = useState('');
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const socketRef = useRef<any>(null);

  // Set default room name dynamically once translation hook is ready
  useEffect(() => {
    if (!selectedTripName && selectedTripId === 'general') {
      setSelectedTripName(t('generalChatDispatcher'));
    }
  }, [t, selectedTripId]);

  // Load drivers/rooms
  const loadDrivers = async () => {
    try {
      const res = await api.get('/drivers');
      setDrivers(res.data);
    } catch {
      toast.error(t('error') || 'Eroare la încărcarea șoferilor.');
    } finally {
      setLoadingDrivers(false);
    }
  };

  // Load messages for selected room
  const loadMessages = async (tripId: string, silent = false) => {
    if (!silent) setLoadingMsgs(true);
    try {
      const res = await api.get(`/chat/${tripId}`);
      setMessages(res.data);
    } catch {
      if (!silent) toast.error(t('error') || 'Eroare la încărcarea mesajelor.');
    } finally {
      if (!silent) setLoadingMsgs(false);
    }
  };

  useEffect(() => {
    loadDrivers();
    // Connect WebSocket for real-time chat (replaces 3s polling)
    const apiUrl = import.meta.env.VITE_API_URL || 'https://haptrans-production.up.railway.app/api';
    const baseUrl = apiUrl.replace('/api', '');
    const socket = io(baseUrl, { transports: ['websocket','polling'], reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 1000 });
    socketRef.current = socket;
    socket.on('newMessage', (msg) => setMessages((prev) => [...prev, msg]));
    return () => { socket.off('newMessage'); socket.disconnect(); };
  }, []);
  // Join the active room whenever the selection changes
  useEffect(() => {
    if (socketRef.current) socketRef.current.emit('joinTrip', { tripId: selectedTripId });
    loadMessages(selectedTripId, false);
    return () => { if (socketRef.current) socketRef.current.emit('leaveTrip', { tripId: selectedTripId }); };
  }, [selectedTripId]);

  // Scroll to bottom whenever new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = text.trim();
    if (!cleanText && !attachment) return;

    let fileUrl: string | undefined;
    if (attachment) {
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append('file', attachment);
        const up = await api.post('/chat/upload', fd);
        fileUrl = up.data.fileUrl;
      } catch {
        toast.error(t('chatUploadError') || 'Eroare la încărcarea fișierului.');
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    try {
      await api.post(`/chat/${selectedTripId}`, {
        senderId: user?.id,
        content: cleanText,
        fileUrl,
      });
      setText('');
      setAttachment(null);
    } catch {
      toast.error(t('error') || 'Eroare la trimiterea mesajului.');
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-8.5rem)] rounded-2xl overflow-hidden bg-card border border-border shadow-sm animate-fade-in">
      
      {/* LEFT SIDEBAR: List of rooms */}
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-border flex flex-col bg-surface/30 flex-shrink-0 h-40 md:h-full">
        <div className="p-3 md:p-4 border-b border-border bg-card flex-shrink-0">
          <h2 className="font-bold text-text flex items-center gap-2 text-sm md:text-base">
            <MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-primary" /> {t('chatChannels')}
          </h2>
          <p className="text-[10px] md:text-xs text-text-secondary mt-1 hidden md:block">{t('selectDriverOrGeneral')}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-2 md:p-3 space-y-1.5 md:space-y-2">
          
          {/* General Support Chat room button */}
          <button
            onClick={() => {
              setSelectedTripId('general');
              setSelectedTripName(t('generalChatDispatcher'));
            }}
            className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
              selectedTripId === 'general'
                ? 'bg-primary border-primary text-white shadow-md shadow-primary/20'
                : 'bg-card border-border text-text hover:bg-surface'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedTripId === 'general' ? 'bg-card/20' : 'bg-primary-light'}`}>
              <Users className={`w-5 h-5 ${selectedTripId === 'general' ? 'text-white' : 'text-primary'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate">{t('generalSupport')}</div>
              <div className={`text-[10px] truncate ${selectedTripId === 'general' ? 'text-white/80' : 'text-text-secondary'}`}>
                {t('allDriversInNetwork')}
              </div>
            </div>
          </button>

          <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider px-2 pt-3 pb-1">
            {t('drivers')}
          </div>

          {loadingDrivers ? (
            <div className="text-center py-6 text-text-secondary text-xs">{t('loading')}</div>
          ) : drivers.length === 0 ? (
            <div className="text-center py-6 text-text-secondary text-xs">{t('noDriversRegistered') || 'Niciun șofer înregistrat'}</div>
          ) : (
            drivers.map(drv => {
              const driverName = drv.user?.name || 'Șofer';
              const isSelected = selectedTripId === `driver_${drv.user?.id}`;
              return (
                <button
                  key={drv.id}
                  onClick={() => {
                    setSelectedTripId(`driver_${drv.user?.id}`);
                    setSelectedTripName(t('chatWith', { name: driverName }) || `Chat cu ${driverName}`);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-primary border-primary text-white shadow-md shadow-primary/20'
                      : 'bg-card border-border text-text hover:bg-surface'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? 'bg-card/20' : 'bg-primary-light'}`}>
                    <User className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-primary'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{driverName}</div>
                    <div className={`text-[10px] truncate ${isSelected ? 'text-white/80' : 'text-text-secondary'}`}>
                      {drv.phone || t('noPhoneNumber')}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT SIDEBAR: Chat room view */}
      <div className="flex-1 flex flex-col bg-surface/10">
        
        {/* Header of selected room */}
        <div className="h-16 border-b border-border bg-card flex items-center px-6 flex-shrink-0 justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-success rounded-full animate-pulse" />
            <h3 className="font-bold text-text text-sm">{selectedTripName}</h3>
          </div>
          {selectedTripId !== 'general' && (
            <span className="text-[10px] font-bold text-primary uppercase bg-primary-light px-2.5 py-1 rounded-lg border border-primary/10">
              {t('directDriver')}
            </span>
          )}
        </div>

        {/* Message area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {loadingMsgs && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-secondary">
              <MessageSquare className="w-12 h-12 text-border mb-3" />
              <p className="text-sm font-medium">{t('noMessagesInRoom')}</p>
              <p className="text-xs">{t('sendMessageToStartConversation')}</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isAdmin = msg.sender?.role === 'admin' || msg.sender?.role === 'dispatcher';
              const isMe = msg.sender?.id === user?.id;
              const isSaaSUser = isMe || isAdmin;
              const senderName = msg.sender?.name || msg.sender?.username || (isSaaSUser ? 'Admin' : 'Șofer');
              const isDriverActive = msg.sender?.isActive !== false; // defaults to true if undefined

              return (
                <div key={msg.id || i} className={`flex ${isSaaSUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-sm border ${
                    isSaaSUser
                      ? 'bg-primary border-primary text-white rounded-br-none'
                      : 'bg-card border-border text-text rounded-bl-none'
                  }`}>
                    {/* Header: Name and Status */}
                    {isSaaSUser ? (
                      <div className="text-[10px] font-bold text-white/90 mb-1 flex items-center justify-end gap-1">
                        {senderName} <User className="w-3 h-3" />
                      </div>
                    ) : (
                      <div className="text-[10px] font-bold text-primary mb-1 flex items-center gap-1.5">
                        <User className="w-3 h-3" /> {senderName}
                        <div className={`w-1.5 h-1.5 rounded-full ${isDriverActive ? 'bg-success' : 'bg-error'}`} />
                      </div>
                    )}
                    
                    {msg.fileUrl && (
                      <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="block my-2">
                        {msg.fileUrl && /image\/(png|jpe?g|gif|webp)|.(png|jpe?g|gif|webp)(\?|$)/i.test(msg.fileUrl) ? (
                          <img src={msg.fileUrl} alt="attachment" className="max-h-52 rounded-xl border border-border/50 shadow-sm" />
                        ) : (
                          <span className={`flex items-center gap-2 text-xs px-3 py-2 rounded-xl border ${isSaaSUser ? 'bg-white/10 border-white/20 text-white' : 'bg-surface border-border text-primary'} font-semibold`}>
                            <FileText className="w-4 h-4" /> {t('attachment')}
                          </span>
                        )}
                      </a>
                    )}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    
                    <div className={`text-[9px] text-right mt-1.5 flex items-center justify-end gap-1 ${isSaaSUser ? 'text-white/70' : 'text-text-secondary'}`}>
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(msg.createdAt).toLocaleDateString(i18n.language, { day: '2-digit', month: '2-digit', year: 'numeric' })} • {new Date(msg.createdAt).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Text Input area */}
        <div className="p-4 border-t border-border bg-card flex-shrink-0">
          {attachment && (
            <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl bg-surface border border-border text-sm">
              <FileText className="w-4 h-4 text-primary shrink-0" />
              <span className="truncate flex-1">{attachment.name}</span>
              <button type="button" onClick={() => setAttachment(null)} className="text-text-secondary hover:text-error">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <form onSubmit={handleSend} className="flex gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-11 h-11 bg-surface border border-border text-text-secondary rounded-full flex items-center justify-center hover:text-primary hover:border-primary/50 transition-all flex-shrink-0"
              title={t('attachFile') || 'Atașează fișier'}
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) setAttachment(f);
                e.target.value = '';
              }}
            />
            <input
              type="text"
              className="input flex-1 rounded-full pl-5"
              placeholder={t('typeMessage')}
              value={text}
              onChange={e => setText(e.target.value)}
            />
            <button
              type="submit"
              disabled={uploading}
              className="w-11 h-11 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary-dark shadow-md shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex-shrink-0"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
