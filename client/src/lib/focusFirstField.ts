/**
 * Put the caret in the first editable field of a form that just appeared.
 *
 * Pressing N opens an editor; without this the focus stays on the page, arrow
 * keys do nothing and the keyboard cursor has nothing to point at. Two frames
 * give React time to mount the form before the lookup.
 */
export function focusFirstField(scope?: ParentNode | null) {
  if (typeof document === 'undefined') return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const dialog = document.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]');
      // Editors usually live in their own <form>; without this the first input
      // in the document would be the page's search box.
      const forms = Array.from(document.querySelectorAll<HTMLFormElement>('form')).filter(
        (form) => form.offsetParent !== null,
      );
      const root: ParentNode = dialog || scope || forms[forms.length - 1] || document;
      const field = root.querySelector<HTMLElement>(
        '[data-autofocus], input:not([type="hidden"]):not([disabled]):not([readonly]), textarea:not([disabled]), select:not([disabled])',
      );
      field?.focus();
      if (field instanceof HTMLInputElement && field.type === 'text') field.select();
    });
  });
}
