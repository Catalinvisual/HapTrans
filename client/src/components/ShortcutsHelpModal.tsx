import { useTranslation } from 'react-i18next';
import { X, Keyboard } from 'lucide-react';
import { useShortcuts } from '../hooks/useShortcuts';

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShortcutsHelpModal({ isOpen, onClose }: ShortcutsHelpModalProps) {
  const { t } = useTranslation();

  useShortcuts({
    'escape': onClose
  }, isOpen);

  if (!isOpen) return null;

  const sections = [
    {
      title: t('shortcuts_global_title', 'Globale'),
      items: [
        { key: 'Shift + K', desc: t('sc_search', 'Caută/deschide orice: pagină, client, cursă, factură') },
        { key: 'Shift + N', desc: t('sc_new', 'Creează element nou în pagina curentă') },
        { key: 'Ctrl + S', desc: t('sc_save', 'Salvează formularul curent') },
        { key: 'Shift + ↑ / ↓', desc: t('sc_nav_sidebar', 'Navigare sus/jos prin meniul lateral') },
        { key: 'Shift + ← / →', desc: t('sc_nav_tabs', 'Navigare între taburile paginii curente') },
        { key: 'Esc', desc: t('sc_esc', 'Închide modal/dropdown/panel') },
        { key: 'Shift + H', desc: t('sc_f1', 'Deschide meniul cu shortcut-uri') },
        { key: 'F12', desc: t('sc_f12', 'Logout (cu confirmare)') },
      ],
    },
    {
      title: t('shortcuts_tables_title', 'În tabele / liste'),
      items: [
        { key: '↑ / ↓', desc: t('sc_tbl_updown', 'Selectează rândul anterior/următor') },
        { key: 'Enter', desc: t('sc_tbl_enter', 'Deschide rândul selectat') },
        { key: 'Space', desc: t('sc_tbl_space', 'Selectează checkbox-ul rândului') },
        { key: 'Delete', desc: t('sc_tbl_delete', 'Șterge/arhivează (cu confirmare)') },
        { key: 'Ctrl + C', desc: t('sc_tbl_copy', 'Copiază informațiile rândului selectat') },
      ],
    },
    {
      title: t('shortcuts_forms_title', 'În formulare'),
      items: [
        { key: 'Tab', desc: t('sc_form_tab', 'Câmpul următor') },
        { key: 'Shift + Tab', desc: t('sc_form_shifttab', 'Câmpul anterior') },
        { key: 'Enter', desc: t('sc_form_enter', 'Confirmă (unde are sens)') },
        { key: 'Ctrl + S', desc: t('sc_form_save', 'Salvează') },
        { key: 'Esc', desc: t('sc_form_esc', 'Închide/anulează') },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div 
        className="bg-card rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-border bg-surface">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Keyboard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text tracking-tight">{t('shortcuts_title', 'Keyboard Shortcuts')}</h2>
              <p className="text-sm text-text-secondary">{t('shortcuts_subtitle', 'Navighează rapid folosind tastatura')}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text hover:bg-black/5 rounded-xl transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-card">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sections.map((section, idx) => (
              <div key={idx} className="space-y-4">
                <h3 className="font-bold text-text border-b border-border pb-2 text-base">{section.title}</h3>
                <div className="space-y-3">
                  {section.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-start gap-4">
                      <span className="text-sm text-text-secondary mt-0.5 flex-1">{item.desc}</span>
                      <kbd className="px-2.5 py-1 bg-surface border border-border rounded-lg text-xs font-mono font-medium text-text whitespace-nowrap shadow-sm">
                        {item.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3">
            <div className="text-blue-500 font-bold mt-0.5">ℹ</div>
            <div className="text-sm text-blue-900 leading-relaxed">
              {t('shortcuts_info', 'Shortcut-urile nu vor funcționa dacă tastați în câmpuri text, cu excepția Ctrl+S, Esc și Shift+H.')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
