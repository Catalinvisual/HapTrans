import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';

type CursorState = {
  top: number;
  left: number;
  width: number;
  height: number;
  radius: number;
  name: string;
  hint: string;
  placement: 'above' | 'below';
};

// Modifiers alone are not a position change, so they never wake the cursor.
const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'AltGraph', 'OS']);

const clean = (value?: string | null) => (value || '').replace(/\s+/g, ' ').trim();

/** Flatten a ReactNode label (icons, fragments, spans) into readable text. */
function nodeText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join(' ');
  if (typeof node === 'object' && 'props' in (node as any)) return nodeText((node as any).props?.children);
  return '';
}

function accessibleName(el: HTMLElement): string {
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const text = clean(
      labelledBy
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent)
        .join(' '),
    );
    if (text) return text;
  }

  const ariaLabel = clean(el.getAttribute('aria-label'));
  if (ariaLabel) return ariaLabel;

  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    const label = clean(el.labels?.[0]?.textContent);
    if (label) return label;
    if ('placeholder' in el) {
      const placeholder = clean((el as HTMLInputElement).placeholder);
      if (placeholder) return placeholder;
    }
    // Field grids in this app put the text in a <label> next to the input
    // instead of wrapping it, so look one container up before giving up.
    let container = el.parentElement;
    for (let depth = 0; depth < 2 && container; depth += 1, container = container.parentElement) {
      const nearby = clean(container.querySelector('label')?.textContent);
      if (nearby) return nearby;
    }
    const value = clean((el as HTMLInputElement).value);
    if (value) return value;
  }

  const title = clean(el.getAttribute('title'));
  if (title) return title;

  return clean(nodeText(el.textContent));
}

function isVisible(el: HTMLElement): boolean {
  if (!el.isConnected) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return false;
  const style = window.getComputedStyle(el);
  return style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity) !== 0;
}

/**
 * The on-screen position indicator for keyboard use.
 *
 * A browser focus ring only says "something here is focused". While an operator
 * works through a form with the keyboard they need to see exactly which field,
 * which option inside an open dropdown and which table row they are on. This
 * overlay draws one ring around the real keyboard position and names it, so the
 * answer is always visible: the field label, the highlighted menu option, the
 * active row. It disappears the moment a pointer is used.
 *
 * `data-kb-active="true"` lets a component publish "this is my keyboard
 * position" even when focus stays on its trigger (CustomSelect, OrderWizard) or
 * when the position is a row inside a focused table (DataTable).
 */
export default function KeyboardCursor() {
  const { t } = useTranslation();
  const [cursor, setCursor] = useState<CursorState | null>(null);
  const keyboardMode = useRef(false);
  const frame = useRef(0);
  const timer = useRef(0);
  const poll = useRef(0);
  const signature = useRef('');

  useEffect(() => {
    const clear = () => {
      signature.current = '';
      setCursor(null);
    };

    const measure = () => {
      if (!keyboardMode.current || document.hidden) {
        clear();
        return;
      }

      const focused = document.activeElement as HTMLElement | null;
      const focusIsBody = !focused || focused === document.body || focused === document.documentElement;
      const openListbox =
        Array.from(document.querySelectorAll<HTMLElement>('[role="listbox"]')).find(isVisible) || null;
      // A component can publish its own keyboard position; that only counts
      // while something really holds focus (an open menu, or a focused table).
      // With focus on the document itself a marker is just "whatever was last
      // highlighted", not where the operator is.
      const marker = openListbox
        ? openListbox.querySelector<HTMLElement>('[data-kb-active="true"]')
        : !focusIsBody
        ? focused?.querySelector?.<HTMLElement>('[data-kb-active="true"]') || null
        : null;
      const target = marker && isVisible(marker) ? marker : focused;

      if (
        !keyboardMode.current ||
        !target ||
        target === document.body ||
        target === document.documentElement ||
        !isVisible(target)
      ) {
        clear();
        return;
      }

      const rect = target.getBoundingClientRect();
      const radius = Math.min(parseFloat(window.getComputedStyle(target).borderTopLeftRadius) || 8, 28);
      const rawName = accessibleName(target);
      const name = rawName.length > 48 ? `${rawName.slice(0, 47)}…` : rawName;

      const hint = openListbox
        ? t('kb_hint_list', '↑↓ alege · Enter confirmă · Esc închide')
        : target.getAttribute('aria-haspopup')
        ? t('kb_hint_open', 'Enter deschide lista')
        : target.closest('[role="dialog"], [aria-modal="true"]')
        ? t('kb_hint_dialog', 'Tab câmpul următor · Ctrl+Enter salvează')
        : t('kb_hint_page', 'Tab / ↑↓ mută · Enter deschide');

      const top = Math.max(2, rect.top - 3);
      const left = Math.max(2, rect.left - 3);
      const width = rect.width + 6;
      const height = rect.height + 6;
      const placement: 'above' | 'below' = top > 40 ? 'above' : 'below';

      const next: CursorState = {
        top,
        left,
        width,
        height,
        radius,
        name: name || t('kb_here', 'Aici ești'),
        hint,
        placement,
      };
      const nextSignature = `${Math.round(top)}|${Math.round(left)}|${Math.round(width)}|${Math.round(height)}|${next.name}|${hint}`;
      if (nextSignature !== signature.current) {
        signature.current = nextSignature;
        setCursor(next);
      }
    };

    const schedule = () => {
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        frame.current = requestAnimationFrame(measure);
      });
    };

    // Dialogs animate in, panels scroll and lists grow after a key press, so a
    // single measurement would leave the ring around where the field used to
    // be. A slow poll keeps it on the real position without a render loop.
    const startPolling = () => {
      if (poll.current) return;
      poll.current = window.setInterval(measure, 150);
    };

    const stopPolling = () => {
      if (!poll.current) return;
      window.clearInterval(poll.current);
      poll.current = 0;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      // Any key means the operator is on the keyboard — including a letter
      // shortcut such as N that opens a dialog. That is exactly when the ring
      // needs to say where the focus just landed.
      if (MODIFIER_KEYS.has(event.key)) return;
      keyboardMode.current = true;
      schedule();
      startPolling();
      // A menu that renders as a result of the key lands a frame or two later.
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(measure, 90);
    };

    const onPointer = () => {
      if (!keyboardMode.current) return;
      keyboardMode.current = false;
      stopPolling();
      clear();
    };

    window.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('focusin', schedule, true);
    document.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    window.addEventListener('pointerdown', onPointer, true);
    window.addEventListener('wheel', onPointer, { passive: true, capture: true });

    return () => {
      cancelAnimationFrame(frame.current);
      window.clearTimeout(timer.current);
      stopPolling();
      window.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('focusin', schedule, true);
      document.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('pointerdown', onPointer, true);
      window.removeEventListener('wheel', onPointer, { capture: true } as EventListenerOptions);
    };
  }, [t]);

  if (!cursor) return null;

  const labelTop =
    cursor.placement === 'above'
      ? Math.max(4, cursor.top - 26)
      : Math.min(window.innerHeight - 30, cursor.top + cursor.height + 4);
  const labelLeft = Math.max(4, Math.min(cursor.left, window.innerWidth - 340));

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[2147483000] select-none">
      <div
        className="absolute border-2 border-primary transition-all duration-75 ease-out"
        style={{
          top: cursor.top,
          left: cursor.left,
          width: cursor.width,
          height: cursor.height,
          borderRadius: cursor.radius,
          boxShadow: '0 0 0 3px rgba(249, 115, 22, 0.16), 0 0 16px rgba(249, 115, 22, 0.32)',
        }}
      />
      <div className="absolute flex max-w-[340px] items-center gap-1.5" style={{ top: labelTop, left: labelLeft }}>
        <span className="max-w-[190px] truncate rounded-md bg-slate-900 px-2 py-1 text-[10px] font-black text-white shadow-lg">
          {cursor.name}
        </span>
        <span className="whitespace-nowrap rounded-md bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 shadow ring-1 ring-slate-900/10">
          {cursor.hint}
        </span>
      </div>
    </div>
  );
}
