/**
 * Ctrl/Cmd+K is one shortcut with one palette.
 *
 * A page that has a palette of its own (the planning board) registers it here.
 * The shell opens the global search only when no page claimed the shortcut,
 * otherwise both palettes opened at the same time and the page one was buried
 * under the global one.
 */
type PageQuickCommand = () => void;

let pageQuickCommand: PageQuickCommand | null = null;

/** Called by a page on mount; the cleanup passes null. */
export function registerPageQuickCommand(handler: PageQuickCommand | null): void {
  pageQuickCommand = handler;
}

/** Runs the page palette when there is one and reports whether it handled the key. */
export function runPageQuickCommand(): boolean {
  if (!pageQuickCommand) return false;
  pageQuickCommand();
  return true;
}
