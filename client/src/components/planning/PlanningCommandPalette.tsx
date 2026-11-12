import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { CornerDownLeft, Search, X } from 'lucide-react';
import { commandScore } from '../../lib/planningPremium';

export interface PaletteAction {
  id: string;
  label: string;
  /** Small right-aligned context: view name, trip number, order number. */
  hint?: string;
  group?: string;
  keywords?: string;
  run: () => void;
}

/**
 * Ctrl+K palette.
 *
 * It only exposes actions the board already performs — switching the period,
 * opening a trip, planning an order, opening a panel — so it is a faster way to
 * reach existing behaviour, never a second, silent write path.
 */
export default function PlanningCommandPalette({
  open,
  onClose,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  actions: PaletteAction[];
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setFocused(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(timer);
  }, [open]);

  const results = useMemo(() => {
    const scored = actions
      .map((action) => ({
        action,
        score: Math.max(
          commandScore(query, action.label),
          action.keywords ? commandScore(query, action.keywords) * 0.9 : 0,
          action.hint ? commandScore(query, action.hint) * 0.8 : 0,
        ),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 40);
    return scored.map((entry) => entry.action);
  }, [actions, query]);

  useEffect(() => {
    if (focused >= results.length) setFocused(0);
  }, [results.length, focused]);

  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.children[focused] as HTMLElement | undefined;
    node?.scrollIntoView({ block: 'nearest' });
  }, [focused, open]);

  if (!open) return null;

  const activate = (action: PaletteAction | undefined) => {
    if (!action) return;
    onClose();
    // Let the dialog unmount before the action opens its own dialog, so two
    // focus traps never overlap.
    window.setTimeout(() => action.run(), 0);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setFocused((prev) => (results.length ? (prev + 1) % results.length : 0));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setFocused((prev) => (results.length ? (prev - 1 + results.length) % results.length : 0));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      activate(results[focused]);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[10050] flex items-start justify-center bg-slate-950/55 px-3 pt-[12vh] backdrop-blur-sm print:hidden"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t('pv_cmd_hint', 'Ctrl+K opens quick commands')}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl ring-1 ring-black/5"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 shrink-0 text-text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setFocused(0);
            }}
            placeholder={t('pv_cmd_placeholder', 'Search a trip, an order or an action…')}
            className="h-11 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
            aria-label={t('pv_cmd_placeholder', 'Search a trip, an order or an action…')}
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-text-muted transition-colors hover:bg-surface hover:text-text-primary"
            aria-label={t('pv_stop_close', 'Close')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-1 custom-scrollbar">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-text-secondary">{t('pv_cmd_empty', 'Nothing found.')}</p>
          ) : (
            results.map((action, index) => (
              <button
                key={action.id}
                type="button"
                onMouseEnter={() => setFocused(index)}
                onClick={() => activate(action)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors ${
                  index === focused ? 'bg-primary/10' : 'hover:bg-surface'
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-bold text-text-primary">{action.label}</span>
                  {(action.group || action.hint) && (
                    <span className="mt-0.5 flex items-center gap-1.5 truncate text-[10px] text-text-muted">
                      {action.group && <span className="font-black uppercase tracking-wide">{action.group}</span>}
                      {action.group && action.hint && <span aria-hidden>·</span>}
                      {action.hint && <span className="truncate">{action.hint}</span>}
                    </span>
                  )}
                </span>
                {index === focused && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-primary" />}
              </button>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border bg-surface/60 px-3 py-1.5 text-[10px] font-semibold text-text-muted">
          <span>{t('pv_cmd_hint', 'Ctrl+K opens quick commands')}</span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-card px-1">↑</kbd>
            <kbd className="rounded border border-border bg-card px-1">↓</kbd>
            <kbd className="rounded border border-border bg-card px-1">↵</kbd>
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
