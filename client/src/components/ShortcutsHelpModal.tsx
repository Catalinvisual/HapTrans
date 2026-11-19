import { useTranslation } from 'react-i18next';
import { X, Keyboard } from 'lucide-react';
import { useShortcuts } from '../hooks/useShortcuts';
import { createPortal } from 'react-dom';

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
        { key: 'Ctrl / ⌘ + K', desc: t('sc_search', 'Caută/deschide orice: pagină, client, cursă, factură') },
        { key: 'Shift + K', desc: t('sc_search_alt', 'Aceeași căutare globală, variantă veche') },
        { key: '/', desc: t('sc_focus_search', 'Sari direct în căutarea paginii curente') },
        { key: 'N', desc: t('sc_new', 'Creează element nou în pagina curentă') },
        { key: 'Ctrl + S', desc: t('sc_save', 'Salvează formularul curent') },
        { key: 'Shift + ↑ / ↓', desc: t('sc_nav_sidebar', 'Navigare sus/jos prin meniul lateral') },
        { key: '?', desc: t('sc_f1', 'Deschide meniul cu shortcut-uri') },
        { key: 'Esc', desc: t('sc_esc', 'Închide modal/dropdown, altfel pasul anterior') },
        { key: 'F12', desc: t('sc_f12', 'Logout (cu confirmare)') },
      ],
    },
    {
      title: t('shortcuts_tables_title', 'În tabele / liste'),
      items: [
        { key: 'Tab', desc: t('sc_tbl_focus', 'Intră în tabel') },
        { key: '↑ / ↓', desc: t('sc_tbl_updown', 'Selectează rândul anterior/următor') },
        { key: 'Home / End', desc: t('sc_tbl_homeend', 'Primul / ultimul rând') },
        { key: 'Enter', desc: t('sc_tbl_enter', 'Deschide rândul selectat') },
        { key: 'Space', desc: t('sc_tbl_space', 'Bifează rândul selectat') },
        { key: 'Delete', desc: t('sc_tbl_delete', 'Șterge rândul selectat (cu confirmare)') },
        { key: 'Ctrl + C', desc: t('sc_tbl_copy', 'Copiază datele rândului selectat') },
      ],
    },
    {
      title: t('shortcuts_dropdown_title', 'În meniuri derulante și modale'),
      items: [
        { key: 'Enter / Space', desc: t('sc_dd_open', 'Deschide lista din câmpul curent') },
        { key: '↑ / ↓', desc: t('sc_dd_move', 'Mută selecția în listă (pagina nu se derulează)') },
        { key: 'Home / End', desc: t('sc_dd_homeend', 'Prima / ultima opțiune') },
        { key: t('sc_key_letters', 'Litere'), desc: t('sc_dd_type', 'Sari la opțiunea care începe cu ce ai tastat') },
        { key: 'Enter', desc: t('sc_dd_pick', 'Alege opțiunea și revine la câmp') },
        { key: 'Esc', desc: t('sc_dd_esc', 'Închide lista, apoi modalul') },
        { key: 'Ctrl + Enter', desc: t('sc_dd_save', 'Salvează comanda din wizard') },
        { key: 'Alt + ← / →', desc: t('sc_section_switch', 'Secțiunea anterioară/următoare (wizard, fișă comandă)') },
        { key: '← / →', desc: t('sc_tab_switch', 'Schimbă tab-ul când focusul e pe un tab') },
      ],
    },
    {
      title: t('shortcuts_forms_title', 'În formulare'),
      items: [
        { key: 'Tab', desc: t('sc_form_tab', 'Câmpul următor') },
        { key: 'Shift + Tab', desc: t('sc_form_shifttab', 'Câmpul anterior') },
        { key: 'Enter', desc: t('sc_form_enter', 'Închide câmpul curent (după el, ↑/↓ trec mai departe)') },
        { key: 'Ctrl + S', desc: t('sc_form_save', 'Salvează (și în wizard)') },
        { key: 'Ctrl + Enter', desc: t('sc_form_save_alt', 'Salvează comanda din wizard') },
        { key: 'Alt + →', desc: t('sc_form_next', 'Pasul următor în wizard (butonul Next)') },
        { key: 'Alt + ←', desc: t('sc_form_prev', 'Pasul anterior în wizard (butonul Back)') },
        { key: '↑ / ↓', desc: t('sc_form_arrows', 'Câmpul anterior/următor (inclusiv în câmpuri de sumă/dată, după Enter)') },
        { key: t('sc_key_tab_modal', 'Tab în modal'), desc: t('sc_form_trap', 'Rămâne în modal, ciclic') },
        { key: 'Esc', desc: t('sc_form_esc', 'Închide/anulează') },
      ],
    },
  ];

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
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
              {t(
                'shortcuts_info',
                'Cât timp folosești tastatura, un cursor portocaliu arată exact unde ești: câmpul, opțiunea din listă sau rândul din tabel. Dispare imediat ce folosești mouse-ul și se ascunde singur când elementul iese din ecran. N funcționează imediat după ce deschizi o pagină din meniu, fără să dai click în pagină. Shortcut-urile nu se declanșează când tastezi în câmpuri text, cu excepția Ctrl+S, Ctrl+Enter, Alt+←/→ și Esc. Într-un modal, tastele rămân în modal: săgețile derulează conținutul lui, nu pagina din spate.',
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
