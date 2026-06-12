import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';

const LANGS = [
  { code: 'ro', label: 'Română', flag: 'https://flagcdn.com/w40/ro.png' },
  { code: 'en', label: 'English', flag: 'https://flagcdn.com/w40/gb.png' },
  { code: 'nl', label: 'Nederlands', flag: 'https://flagcdn.com/w40/nl.png' },
  { code: 'de', label: 'Deutsch', flag: 'https://flagcdn.com/w40/de.png' },
  { code: 'fr', label: 'Français', flag: 'https://flagcdn.com/w40/fr.png' },
];

export default function LanguageDropdown() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANGS.find(l => l.code === i18n.language) || LANGS[0];

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const changeLang = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('hapcargo_lang', code);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-border rounded-xl
          hover:border-primary/50 hover:bg-orange-50 transition-all duration-150 shadow-sm
          text-sm font-medium text-text group"
        title={current.label}
      >
        <img 
          src={current.flag} 
          alt={current.label} 
          className="w-5 h-5 rounded-full object-cover border border-slate-200 shadow-sm select-none" 
        />
        <span className="text-text-secondary group-hover:text-primary transition-colors text-xs font-bold uppercase">{current.code}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-text-secondary transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-border rounded-xl shadow-lg
          overflow-hidden z-50 animate-fade-in">
          {LANGS.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLang(lang.code)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all duration-100
                ${i18n.language === lang.code
                  ? 'bg-orange-50 text-primary font-semibold'
                  : 'text-text hover:bg-surface'}`}
            >
              <img 
                src={lang.flag} 
                alt={lang.label} 
                className="w-5 h-5 rounded-full object-cover border border-slate-200 shadow-sm select-none" 
              />
              <span className="font-semibold">{lang.label}</span>
              {i18n.language === lang.code && (
                <span className="ml-auto w-2 h-2 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
