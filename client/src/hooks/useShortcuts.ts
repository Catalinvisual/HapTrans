import { useEffect, useRef } from 'react';

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

      // Handle input navigation with simple Arrows (no shift)
      if (isInput && !e.shiftKey && (key === 'arrowdown' || key === 'arrowup' || key === 'arrowleft' || key === 'arrowright')) {
        const isSelectOrNumber = target.tagName === 'SELECT' || (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'number');
        const isTextArea = target.tagName === 'TEXTAREA';
        
        if (!(isSelectOrNumber || isTextArea)) {
          const inputs = Array.from(document.querySelectorAll('input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), button.input:not([disabled])')) as HTMLElement[];
          const visibleInputs = inputs.filter(el => {
             const rect = el.getBoundingClientRect();
             return rect.width > 0 && rect.height > 0;
          });
          
          const currentIndex = visibleInputs.indexOf(target);
          if (currentIndex !== -1) {
            if (key === 'arrowdown' || key === 'arrowright') {
              const next = visibleInputs[currentIndex + 1];
              if (next) { e.preventDefault(); next.focus(); return; }
            } else if (key === 'arrowup' || key === 'arrowleft') {
              const prev = visibleInputs[currentIndex - 1];
              if (prev) { e.preventDefault(); prev.focus(); return; }
            }
          }
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
