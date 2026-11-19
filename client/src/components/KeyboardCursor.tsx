import { useEffect, useRef, useState } from 'react';

type CursorState = {
  top: number;
  left: number;
  width: number;
  height: number;
  radius: number;
};

// Modifiers alone are not a position change, so they never wake the cursor.
const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'AltGraph', 'OS']);

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
 * overlay draws a single ring around that real keyboard position. It disappears
 * the moment a pointer is used.
 *
 * `data-kb-active="true"` lets a component publish "this is my keyboard
 * position" even when focus stays on its trigger (CustomSelect, OrderWizard) or
 * when the position is a row inside a focused table (DataTable).
 */
export default function KeyboardCursor() {
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

      const next: CursorState = {
        top: Math.max(2, rect.top - 3),
        left: Math.max(2, rect.left - 3),
        width: rect.width + 6,
        height: rect.height + 6,
        radius,
      };
      const nextSignature = `${Math.round(next.top)}|${Math.round(next.left)}|${Math.round(next.width)}|${Math.round(next.height)}`;
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
  }, []);

  if (!cursor) return null;

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
    </div>
  );
}
