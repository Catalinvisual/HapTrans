import { useEffect } from 'react';
import type { RefObject } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Keyboard behaviour every dialog in the TMS needs:
 * - the page behind the dialog cannot scroll while it is open (arrow keys used
 *   to move the list behind the modal instead of the focused dropdown);
 * - focus lands on the first field so typing works immediately;
 * - Tab / Shift+Tab cycle inside the dialog instead of escaping to the page;
 * - focus returns to the trigger when the dialog closes.
 */
export function useDialogKeyboard(isOpen: boolean, containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!isOpen) return;
    const container = containerRef.current;
    if (!container || typeof document === 'undefined') return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

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

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
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
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      if (previousFocus && document.contains(previousFocus)) previousFocus.focus();
    };
  }, [isOpen, containerRef]);
}
