import { useEffect } from 'react';
import type { RefObject } from 'react';
import { stopFieldNavigation } from '../lib/fieldNavigation';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const SCROLL_KEYS = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];

/** First scrollable region inside the dialog (its body), if any. */
function findScroller(container: HTMLElement): HTMLElement | null {
  const candidates = [container, ...Array.from(container.querySelectorAll<HTMLElement>('*'))];
  for (const el of candidates) {
    if (el.scrollHeight - el.clientHeight < 8) continue;
    const style = window.getComputedStyle(el);
    if (/(auto|scroll)/.test(style.overflowY)) return el;
  }
  return null;
}

/**
 * Keyboard behaviour every dialog in the TMS needs:
 * - the page behind the dialog cannot scroll while it is open. The TMS scrolls
 *   inside <main>, not <body>, so going through `[data-app-scroll]` is what
 *   actually stops the background from moving under a modal;
 * - focus lands on the first field so typing works immediately;
 * - Tab / Shift+Tab cycle inside the dialog instead of escaping to the page;
 * - focus that disappears with the content it was on (a new wizard step, a
 *   refreshed panel) is pulled back into the dialog instead of falling to the
 *   page behind;
 * - arrows pressed while the dialog itself is focused scroll the dialog body,
 *   not the page;
 * - focus returns to the trigger when the dialog closes.
 */
export function useDialogKeyboard(isOpen: boolean, containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!isOpen) return;
    const container = containerRef.current;
    if (!container || typeof document === 'undefined') return;

    const previousFocus = document.activeElement as HTMLElement | null;
    stopFieldNavigation();

    // Lock every real scroll region of the app shell, not just <body>.
    const locked: Array<{ el: HTMLElement; overflow: string }> = [];
    const lock = (el: HTMLElement) => {
      if (locked.some((entry) => entry.el === el)) return;
      locked.push({ el, overflow: el.style.overflow });
      el.style.overflow = 'hidden';
    };
    lock(document.body);
    document.querySelectorAll<HTMLElement>('[data-app-scroll]').forEach(lock);

    const focusable = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );

    // Prefer the first real field over the header's close button: the point of
    // opening a dialog with the keyboard is to start typing immediately.
    const firstField =
      container.querySelector<HTMLElement>('[data-autofocus]') ||
      Array.from(
        container.querySelectorAll<HTMLElement>(
          'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), [aria-haspopup], [role="combobox"]',
        ),
      ).find((el) => el.offsetParent !== null) ||
      null;

    if (!container.contains(document.activeElement)) {
      const first = firstField || focusable()[0] || container;
      requestAnimationFrame(() => first?.focus());
    }

    const pullFocusBack = () => {
      if (container.contains(document.activeElement)) return;
      const target = firstField || focusable()[0] || container;
      target.focus();
    };

    const onFocusOut = (event: FocusEvent) => {
      // A related target of null means the focused node went away (a step
      // change) or the user clicked something inert: in a modal, focus belongs
      // inside, otherwise the arrows start scrolling the page behind.
      if (event.relatedTarget) return;
      requestAnimationFrame(pullFocusBack);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        const items = focusable();
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
        return;
      }

      // The dialog root itself holds focus (after a step change, or right after
      // opening a read-only panel): arrows must scroll the dialog, never the
      // page that happens to sit behind it.
      if (document.activeElement !== container) return;
      if (!SCROLL_KEYS.includes(event.key)) return;
      event.preventDefault();
      const scroller = findScroller(container);
      if (!scroller) return;
      const page = Math.max(120, scroller.clientHeight * 0.85);
      const delta = {
        ArrowUp: -48,
        ArrowDown: 48,
        PageUp: -page,
        PageDown: page,
        Home: -scroller.scrollHeight,
        End: scroller.scrollHeight,
        ' ': page,
      }[event.key] as number;
      scroller.scrollBy({ top: delta, behavior: 'auto' });
    };

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('focusout', onFocusOut, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('focusout', onFocusOut, true);
      locked.forEach(({ el, overflow }) => { el.style.overflow = overflow; });
      if (previousFocus && document.contains(previousFocus)) previousFocus.focus();
    };
  }, [isOpen, containerRef]);
}
