/**
 * Move the focus to the previous/next field of the form the user is in.
 *
 * Arrow keys used to be contested: a dropdown trigger reopened its list on the
 * first arrow after a selection, so the form could not be walked through from
 * the keyboard. Opening a list is Enter/Space; arrows always mean "move on".
 *
 * The scope is the open dialog when there is one, so a key never jumps into the
 * page behind a modal.
 */
const FIELD_SELECTOR = [
  'input:not([type="hidden"]):not([disabled]):not([readonly])',
  'textarea:not([disabled]):not([readonly])',
  'select:not([disabled])',
  'button[aria-haspopup]:not([disabled])',
  'button.input:not([disabled])',
].join(', ');

const isVisible = (el: HTMLElement) => {
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const style = window.getComputedStyle(el);
  return style.visibility !== 'hidden' && style.display !== 'none';
};

export function moveFieldFocus(direction: 1 | -1, from?: HTMLElement | null): boolean {
  if (typeof document === 'undefined') return false;
  const current = from || (document.activeElement as HTMLElement | null);
  if (!current) return false;

  const scope: ParentNode = current.closest('[role="dialog"][aria-modal="true"]') || document;
  const fields = Array.from(scope.querySelectorAll<HTMLElement>(FIELD_SELECTOR)).filter(isVisible);
  const index = fields.indexOf(current);
  if (index === -1) return false;

  const next = fields[index + direction];
  if (!next) return false;
  next.focus();
  return true;
}
