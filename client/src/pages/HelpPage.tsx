import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Banknote, BarChart3, BookOpen, CalendarDays, Check, CheckCircle2,
  ChevronRight, Container, ExternalLink, FileText, Globe, LayoutDashboard, LifeBuoy,
  Lightbulb, Map, Menu, Package, Printer, Rocket, Route, Search, Settings,
  ShieldCheck, Truck, UserCheck, UserCog, Users, Wallet, Wifi, X, Receipt, AlertTriangle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { HELP_CHAPTER_COUNT, HELP_CONTENT, HELP_STRUCTURE, helpText, resolveHelpLang } from '../lib/help';
import type { HelpBlock, HelpChapterText, HelpLocaleText } from '../lib/help';
import HelpDiagram from '../components/help/HelpDiagram';

const ICONS: Record<string, LucideIcon> = {
  Rocket, Truck, Container, Banknote, Globe, Settings, LifeBuoy, LayoutDashboard, Route,
  Package, CalendarDays, Map, FileText, UserCheck, Wifi, Receipt, Wallet, BarChart3, Users,
  ShieldCheck, ExternalLink, UserCog, BookOpen,
};

const READ_KEY = 'haptrans.guide.read.v1';

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l');

function blockToText(block: HelpBlock): string {
  switch (block.kind) {
    case 'p':
    case 'h':
    case 'tip':
    case 'warn':
      return block.text;
    case 'list':
    case 'steps':
      return block.items.join(' ');
    case 'table':
      return [block.head.join(' '), ...block.rows.map((row) => row.join(' '))].join(' ');
    case 'diagram':
      return [block.title, ...block.callouts].join(' ');
    default:
      return '';
  }
}

const chapterWords = (chapter: HelpChapterText) =>
  chapter.blocks.reduce((total, block) => total + blockToText(block).split(/\s+/).filter(Boolean).length, 0);

const chapterMinutes = (chapter: HelpChapterText) => Math.max(1, Math.round(chapterWords(chapter) / 190));

export default function HelpPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = resolveHelpLang(i18n.language);
  const content: HelpLocaleText = helpText(lang);
  const fallback = HELP_CONTENT.en;

  const flat = useMemo(
    () =>
      HELP_STRUCTURE.flatMap((category) =>
        category.chapters.map((chapter) => ({ chapter, category })),
      ),
    [],
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const [read, setRead] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(READ_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(READ_KEY, JSON.stringify(read));
    } catch {
      /* storage can be blocked; progress is not critical */
    }
  }, [read]);

  useEffect(() => {
    const main = document.querySelector<HTMLElement>('main[data-app-scroll]');
    if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setNavOpen(false);
  }, [activeId]);

  const categoryText = (id: string) => content.categories[id] || fallback.categories[id] || { title: id, summary: '' };
  const chapterText = (id: string): HelpChapterText =>
    content.chapters[id] || fallback.chapters[id] || { title: id, summary: '', blocks: [] };

  const active = activeId ? flat.find((item) => item.chapter.id === activeId) : undefined;
  const activeIndex = active ? flat.findIndex((item) => item.chapter.id === active.chapter.id) : -1;
  const prev = activeIndex > 0 ? flat[activeIndex - 1] : null;
  const next = activeIndex >= 0 && activeIndex < flat.length - 1 ? flat[activeIndex + 1] : null;

  const normalizedQuery = normalize(query.trim());
  const results = useMemo(() => {
    if (normalizedQuery.length < 2) return [];
    return flat.filter(({ chapter }) => {
      const text = chapterText(chapter.id);
      return normalize([text.title, text.summary, ...text.blocks.map(blockToText)].join(' ')).includes(normalizedQuery);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedQuery, content]);

  const toggleRead = (id: string) => {
    setRead((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const openChapter = (id: string) => {
    setActiveId(id);
    setQuery('');
  };

  const progress = Math.round((read.length / HELP_CHAPTER_COUNT) * 100);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-text-secondary">
            {t('guide_progress', 'Guide progress')}
          </span>
          <span className="text-[11px] font-bold text-primary">{progress}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-1.5 text-[10px] text-text-secondary">
          {read.length}/{HELP_CHAPTER_COUNT} {t('guide_read_chapters', 'chapters read')}
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto p-3">
        <button
          onClick={() => setActiveId(null)}
          className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-bold transition-colors ${
            activeId === null ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-surface hover:text-text'
          }`}
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          {t('guide_all', 'All chapters')}
        </button>

        {HELP_STRUCTURE.map((category) => {
          const CategoryIcon = ICONS[category.icon] || BookOpen;
          const cat = categoryText(category.id);
          return (
            <div key={category.id}>
              <div className="mb-1 flex items-center gap-1.5 px-2 text-[10px] font-black uppercase tracking-wider text-text-secondary">
                <CategoryIcon className="h-3 w-3 text-primary" />
                {cat.title}
              </div>
              <div className="space-y-0.5">
                {category.chapters.map((chapter) => {
                  const text = chapterText(chapter.id);
                  const isActive = chapter.id === activeId;
                  const isRead = read.includes(chapter.id);
                  return (
                    <button
                      key={chapter.id}
                      onClick={() => openChapter(chapter.id)}
                      className={`flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${
                        isActive ? 'bg-primary text-white' : 'text-text-secondary hover:bg-surface hover:text-text'
                      }`}
                    >
                      <span className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
                        isRead
                          ? isActive ? 'border-white bg-white text-primary' : 'border-emerald-500 bg-emerald-500 text-white'
                          : isActive ? 'border-white/60' : 'border-border'
                      }`}>
                        {isRead && <Check className="h-2.5 w-2.5" />}
                      </span>
                      <span className="leading-snug">{text.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <button
          onClick={() => {
            if (confirm(t('guide_reset', 'Reset progress') + '?')) setRead([]);
          }}
          className="text-[10px] font-semibold text-text-secondary hover:text-primary"
        >
          {t('guide_reset', 'Reset progress')}
        </button>
      </div>
    </div>
  );

  const renderBlock = (block: HelpBlock, index: number) => {
    switch (block.kind) {
      case 'p':
        return <p key={index} className="text-sm leading-relaxed text-text-secondary">{block.text}</p>;
      case 'h':
        return (
          <h3 key={index} className="flex items-center gap-2 pt-2 text-sm font-black uppercase tracking-wide text-text">
            <span className="h-3 w-1 rounded-full bg-primary" />
            {block.text}
          </h3>
        );
      case 'list':
        return (
          <ul key={index} className="space-y-1.5">
            {block.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-text-secondary">
                <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        );
      case 'steps':
        return (
          <ol key={index} className="space-y-2">
            {block.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-text-secondary">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-black text-white">
                  {i + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        );
      case 'table':
        return (
          <div key={index} className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[420px] text-left text-xs">
              <thead className="bg-surface">
                <tr>
                  {block.head.map((head, i) => (
                    <th key={i} className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-text-secondary">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, i) => (
                  <tr key={i} className="border-t border-border/70">
                    {row.map((cell, j) => (
                      <td key={j} className={`px-3 py-2 align-top leading-relaxed ${j === 0 ? 'font-semibold text-text' : 'text-text-secondary'}`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'tip':
        return (
          <div key={index} className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider">{t('guide_tip', 'Good to know')}</div>
              <p className="mt-0.5 text-xs leading-relaxed">{block.text}</p>
            </div>
          </div>
        );
      case 'warn':
        return (
          <div key={index} className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider">{t('guide_warning', 'Careful')}</div>
              <p className="mt-0.5 text-xs leading-relaxed">{block.text}</p>
            </div>
          </div>
        );
      case 'diagram':
        return <HelpDiagram key={index} variant={block.variant} title={block.title} callouts={block.callouts} />;
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] animate-fade-in">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .guide-print-area, .guide-print-area * { visibility: visible; }
          .guide-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
          .guide-no-print { display: none !important; }
        }
      `}</style>

      <div className="mb-4 flex items-center justify-between gap-2 md:hidden guide-no-print">
        <button
          onClick={() => setNavOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-text-secondary"
        >
          <Menu className="h-4 w-4" />
          {t('guide_open_menu', 'Open the chapter menu')}
        </button>
        <span className="text-[11px] font-bold text-text-secondary">{progress}%</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[268px_minmax(0,1fr)]">
        <aside className="guide-no-print hidden self-start overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:sticky lg:top-0 lg:block lg:max-h-[calc(100vh-7rem)]">
          {sidebar}
        </aside>

        {navOpen && (
          <div className="fixed inset-0 z-[80] lg:hidden guide-no-print">
            <div className="absolute inset-0 bg-black/50" onClick={() => setNavOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-[290px] max-w-[85vw] bg-card shadow-2xl">
              <div className="flex items-center justify-between border-b border-border p-3">
                <span className="text-sm font-bold text-text">{t('guide_title', 'Help & guide')}</span>
                <button onClick={() => setNavOpen(false)} className="rounded-lg p-1 text-text-secondary hover:bg-surface">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="h-[calc(100%-53px)]">{sidebar}</div>
            </div>
          </div>
        )}

        <div className="guide-print-area min-w-0">
          {!active ? (
            <div className="space-y-5">
              <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
                <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
                <div className="relative">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-primary">
                    <BookOpen className="h-3.5 w-3.5" />
                    HapCargo TMS · {HELP_CHAPTER_COUNT} {t('guide_chapters', 'chapters')}
                  </div>
                  <h1 className="text-2xl font-black tracking-tight text-text sm:text-3xl">
                    {t('guide_title', 'Help & guide')}
                  </h1>
                  <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-text-secondary">
                    {t('guide_subtitle', 'Everything you need to learn HapCargo, chapter by chapter')}
                  </p>

                  <div className="relative mt-4 max-w-2xl">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder={t('guide_search', 'Search the guide: page, feature, status…')}
                      aria-label={t('guide_search', 'Search the guide')}
                      className="w-full rounded-xl border border-border bg-surface/70 py-2.5 pl-9 pr-9 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    {query && (
                      <button
                        onClick={() => setQuery('')}
                        aria-label={t('guide_clear', 'Clear search')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-text-secondary hover:bg-card hover:text-text"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-[11px] text-text-secondary">{t('guide_shortcut_hint', 'Tip: press ? anywhere to see the keyboard shortcuts.')}</p>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-text-secondary">
                    <span className="rounded-full bg-surface px-2 py-1 font-semibold">
                      {read.length}/{HELP_CHAPTER_COUNT} {t('guide_read', 'Read')}
                    </span>
                    <span className="font-semibold">
                      {t('guide_language_note', 'Seven languages')}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-1 font-semibold">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      {t('guide_updated', 'Updated')}
                    </span>
                  </div>
                </div>
              </section>

              {normalizedQuery.length >= 2 ? (
                <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-black text-text">{t('guide_search_results', 'Search results')}</h2>
                    <span className="text-[11px] font-semibold text-text-secondary">
                      {results.length} {t('guide_results', 'results')}
                    </span>
                  </div>
                  {results.length === 0 ? (
                    <p className="py-6 text-center text-sm text-text-secondary">{t('guide_no_results', 'No chapter matches your search.')}</p>
                  ) : (
                    <div className="space-y-1.5">
                      {results.map(({ chapter, category }) => {
                        const text = chapterText(chapter.id);
                        const Icon = ICONS[chapter.icon] || BookOpen;
                        return (
                          <button
                            key={chapter.id}
                            onClick={() => openChapter(chapter.id)}
                            className="flex w-full items-center gap-3 rounded-xl border border-border/70 px-3 py-2 text-left transition hover:border-primary/40 hover:bg-primary/5"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-bold text-text">{text.title}</span>
                              <span className="block truncate text-xs text-text-secondary">{text.summary}</span>
                            </span>
                            <span className="hidden shrink-0 text-[10px] font-bold uppercase tracking-wide text-text-secondary sm:block">
                              {categoryText(category.id).title}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              ) : (
                <>
                  <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                    <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-text">
                      <Rocket className="h-4 w-4 text-primary" />
                      {t('guide_quick_start', 'New here? Follow these three steps')}
                    </h2>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {[
                        { id: 'welcome', n: 1 },
                        { id: 'first-day', n: 2 },
                        { id: 'orders', n: 3 },
                      ].map((step) => {
                        const chapter = flat.find((item) => item.chapter.id === step.id);
                        if (!chapter) return null;
                        return (
                          <button
                            key={step.id}
                            onClick={() => openChapter(step.id)}
                            className="group flex items-start gap-2.5 rounded-xl border border-border bg-card p-3 text-left transition hover:border-primary/40 hover:shadow-sm"
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-black text-white">
                              {step.n}
                            </span>
                            <span>
                              <span className="block text-xs font-bold text-text group-hover:text-primary">
                                {chapterText(step.id).title}
                              </span>
                              <span className="mt-0.5 block text-[11px] leading-snug text-text-secondary">
                                {chapterMinutes(chapterText(step.id))} {t('guide_minutes', 'min read')}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section>
                    <h2 className="mb-2 text-sm font-black uppercase tracking-wider text-text">{t('guide_categories', 'Categories')}</h2>
                    <div className="grid items-start gap-3 md:grid-cols-2">
                      {HELP_STRUCTURE.map((category) => {
                        const Icon = ICONS[category.icon] || BookOpen;
                        const cat = categoryText(category.id);
                        return (
                          <article key={category.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/30">
                            <div className="mb-2 flex items-start gap-2.5">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <Icon className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <h3 className="text-sm font-black text-text">{cat.title}</h3>
                                <p className="mt-0.5 text-[11px] leading-relaxed text-text-secondary">{cat.summary}</p>
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {category.chapters.map((chapter) => (
                                <button
                                  key={chapter.id}
                                  onClick={() => openChapter(chapter.id)}
                                  className="inline-flex items-center gap-1 rounded-full border border-border bg-surface/60 px-2 py-1 text-[10px] font-semibold text-text-secondary transition hover:border-primary/40 hover:text-primary"
                                >
                                  {read.includes(chapter.id) && <Check className="h-2.5 w-2.5 text-emerald-500" />}
                                  {chapterText(chapter.id).title}
                                </button>
                              ))}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                </>
              )}
            </div>
          ) : (
            (() => {
              const text = chapterText(active.chapter.id);
              const CategoryIcon = ICONS[active.category.icon] || BookOpen;
              const ChapterIcon = ICONS[active.chapter.icon] || BookOpen;
              const isRead = read.includes(active.chapter.id);
              const cat = categoryText(active.category.id);
              return (
                <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                  <div className="border-b border-border bg-surface/50 p-4 sm:p-6">
                    <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-secondary guide-no-print">
                      <button onClick={() => setActiveId(null)} className="inline-flex items-center gap-1 hover:text-primary">
                        <ArrowLeft className="h-3 w-3" />
                        {t('guide_back', 'Back to overview')}
                      </button>
                      <ChevronRight className="h-3 w-3" />
                      <button onClick={() => setActiveId(null)} className="inline-flex items-center gap-1 hover:text-primary">
                        <CategoryIcon className="h-3 w-3" />
                        {cat.title}
                      </button>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:flex">
                        <ChapterIcon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h1 className="text-xl font-black tracking-tight text-text sm:text-2xl">{text.title}</h1>
                        <p className="mt-1 text-sm leading-relaxed text-text-secondary">{text.summary}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-text-secondary">
                          <span>{t('guide_chapter', 'Chapter')} {activeIndex + 1}/{flat.length}</span>
                          <span className="h-1 w-1 rounded-full bg-border" />
                          <span>{chapterMinutes(text)} {t('guide_minutes', 'min read')}</span>
                          {isRead && (
                            <>
                              <span className="h-1 w-1 rounded-full bg-border" />
                              <span className="inline-flex items-center gap-1 text-emerald-600">
                                <CheckCircle2 className="h-3 w-3" />
                                {t('guide_read', 'Read')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 guide-no-print">
                      {active.chapter.page && (
                        <button
                          onClick={() => navigate(active.chapter.page!)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-primary-dark"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {t('guide_open_page', 'Open this page')}
                        </button>
                      )}
                      <button
                        onClick={() => toggleRead(active.chapter.id)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                          isRead
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                            : 'border-border bg-card text-text-secondary hover:border-primary/40 hover:text-primary'
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" />
                        {t('guide_mark_read', 'Mark as read')}
                      </button>
                      <button
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-bold text-text-secondary transition hover:border-primary/40 hover:text-primary"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        {t('guide_print', 'Print this chapter')}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 p-4 sm:p-6">
                    {text.blocks.map(renderBlock)}

                    <div className="mt-6 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between guide-no-print">
                      {prev ? (
                        <button
                          onClick={() => openChapter(prev.chapter.id)}
                          className="inline-flex items-start gap-2 rounded-xl border border-border px-3 py-2 text-left transition hover:border-primary/40 hover:bg-primary/5"
                        >
                          <ArrowLeft className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>
                            <span className="block text-[9px] font-black uppercase tracking-wider text-text-secondary">{t('guide_prev', 'Previous')}</span>
                            <span className="block text-xs font-bold text-text">{chapterText(prev.chapter.id).title}</span>
                          </span>
                        </button>
                      ) : <span />}
                      {next ? (
                        <button
                          onClick={() => openChapter(next.chapter.id)}
                          className="inline-flex items-start gap-2 rounded-xl border border-border px-3 py-2 text-right transition hover:border-primary/40 hover:bg-primary/5 sm:text-right"
                        >
                          <span className="flex-1">
                            <span className="block text-[9px] font-black uppercase tracking-wider text-text-secondary">{t('guide_next', 'Next')}</span>
                            <span className="block text-xs font-bold text-text">{chapterText(next.chapter.id).title}</span>
                          </span>
                          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        </button>
                      ) : <span />}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1 guide-no-print">
                      {active.chapter.page && (
                        <button
                          onClick={() => navigate(active.chapter.page!)}
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-surface/60 px-2.5 py-1 text-[10px] font-semibold text-text-secondary hover:border-primary/40 hover:text-primary"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {active.chapter.page}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
}
