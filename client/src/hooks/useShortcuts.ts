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
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || 
                      target.tagName === 'TEXTAREA' || 
                      target.tagName === 'SELECT' || 
                      target.isContentEditable;

      let key = e.key.toLowerCase();
      
      // Normalize arrow keys
      if (key === 'up') key = 'arrowup';
      if (key === 'down') key = 'arrowdown';
      if (key === 'left') key = 'arrowleft';
      if (key === 'right') key = 'arrowright';
      if (key === ' ') key = 'space'; // Normalize space

      const keyString = [
        e.ctrlKey ? 'ctrl+' : '',
        e.altKey ? 'alt+' : '',
        e.shiftKey && key !== 'tab' ? 'shift+' : '', // Include shift except for Tab if not needed
        key
      ].join('');

      // ALWAYS prevent default for our crucial app shortcuts so the browser doesn't steal them
      if (keyString === 'f1' || keyString === 'ctrl+k' || keyString === 'ctrl+n' || keyString === 'ctrl+s') {
        e.preventDefault();
      }
      
      const keyStringFallback = [
        e.ctrlKey ? 'ctrl+' : '',
        e.altKey ? 'alt+' : '',
        key
      ].join('');

      // Check exceptions
      const isException = keyString === 'ctrl+s' || key === 'escape' || key === 'f1';

      if (isInput && !isException) {
        return; // Do not trigger shortcuts inside inputs
      }

      const action = shortcutsRef.current[keyString] || shortcutsRef.current[keyStringFallback];
      if (action) {
        e.preventDefault();
        action(e);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);
}
