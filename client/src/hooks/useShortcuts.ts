import { useEffect, useRef } from 'react';
import { moveFieldFocus } from '../lib/fieldNavigation';

type ShortcutAction = (e: KeyboardEvent) => void;

type ShortcutMap = {
  [key: string]: ShortcutAction;
};

export function useShortcuts(shortcuts: ShortcutMap, isActive: boolean = true) {
  const shortcutsRef = useRef(shortcuts);

  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e || typeof e.key !== 'string') return;
      const target = e.target as HTMLElement;
      const isInput = target?.tagName === 'INPUT' || 
                      target?.tagName === 'TEXTAREA' || 
                      target?.tagName === 'SELECT' || 
                      target?.isContentEditable;

      let key = e.key.toLowerCase();
      
      // Normalize arrow keys
      if (key === 'up') key = 'arrowup';
      if (key === 'down') key = 'arrowdown';
      if (key === 'left') key = 'arrowleft';
      if (key === 'right') key = 'arrowright';
      if (key === ' ') key = 'space'; // Normalize space

      const keyString = [
        e.ctrlKey ? 'ctrl+' : '',
        e.metaKey ? 'meta+' : '',
        e.altKey ? 'alt+' : '',
        e.shiftKey && key !== 'tab' ? 'shift+' : '', // Include shift except for Tab if not needed
        key
      ].join('');

      // Arrow keys first belong to whatever the user just opened: an open
      // dropdown owns ↑↓ until it closes, and left/right must stay a caret move
      // inside a text field. Only ↑/↓ jump between fields, as the help modal says.
      const popupOwnsArrows = !!target?.closest?.(
        '[aria-expanded="true"], [role="listbox"], [role="menu"], [role="combobox"][aria-expanded="true"]',
      );
      if (isInput && !e.shiftKey && !popupOwnsArrows && (key === 'arrowdown' || key === 'arrowup')) {
        // Controls that own their arrows natively (select, textarea caret, number
        // spinners, date segments) keep them; everything else walks the form.
        const nativeTypes = new Set([
          'number', 'date', 'time', 'datetime-local', 'month', 'week', 'range', 'color', 'checkbox', 'radio',
        ]);
        const ownsArrows =
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA' ||
          (target.tagName === 'INPUT' && nativeTypes.has((target as HTMLInputElement).type));

        // A control that already claimed the arrow (an open suggestion list, a
        // calendar, a menu) keeps it; we only walk the form when nothing did.
        if (!ownsArrows && !e.defaultPrevented && moveFieldFocus(key === 'arrowdown' ? 1 : -1, target)) {
          e.preventDefault();
          return;
        }
      }

      const keyStringFallback = [
        e.ctrlKey ? 'ctrl+' : '',
        e.metaKey ? 'meta+' : '',
        e.altKey ? 'alt+' : '',
        key
      ].join('');

      // Check exceptions
      const isException = keyString === 'ctrl+s' || key === 'escape' || key === 'shift+h' || keyString.startsWith('shift+arrow');

      if (isInput && !isException) {
        return; // Do not trigger shortcuts inside inputs
      }

      // "N" alone is the shortcut people try first for a new record; pages keep
      // registering Shift+N, so map the bare key onto it instead of asking every
      // page to declare both.
      const plainNew = !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && key === 'n'
        ? shortcutsRef.current['shift+n']
        : undefined;

      const action = shortcutsRef.current[keyString] || shortcutsRef.current[keyStringFallback] || plainNew;
      if (action) {
        e.preventDefault();
        action(e);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);
}
