import { useEffect, useRef } from 'react';

type TableShortcutsConfig = {
  items: any[];
  selectedIndex: number;
  setSelectedIndex: (idx: number) => void;
  onOpen: (item: any) => void;
  onDelete: (item: any) => void;
  onToggleCheck?: (item: any) => void;
  isActive?: boolean;
};

export function useTableShortcuts({
  items,
  selectedIndex,
  setSelectedIndex,
  onOpen,
  onDelete,
  onToggleCheck,
  isActive = true
}: TableShortcutsConfig) {
  const latestConfig = useRef({ items, selectedIndex, setSelectedIndex, onOpen, onDelete, onToggleCheck });

  useEffect(() => {
    latestConfig.current = { items, selectedIndex, setSelectedIndex, onOpen, onDelete, onToggleCheck };
  }, [items, selectedIndex, setSelectedIndex, onOpen, onDelete, onToggleCheck]);

  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if we are inside an input, if so, ignore
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || 
                      target.tagName === 'TEXTAREA' || 
                      target.tagName === 'SELECT' || 
                      target.isContentEditable;
      
      if (isInput) return;

      const { items, selectedIndex, setSelectedIndex, onOpen, onDelete, onToggleCheck } = latestConfig.current;

      if (!items || items.length === 0) return;

      const key = e.key.toLowerCase();

      if (key === 'arrowdown') {
        e.preventDefault();
        setSelectedIndex(Math.min(selectedIndex + 1, items.length - 1));
      } else if (key === 'arrowup') {
        e.preventDefault();
        setSelectedIndex(Math.max(selectedIndex - 1, 0));
      } else if (key === 'enter') {
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < items.length) {
          onOpen(items[selectedIndex]);
        }
      } else if (key === ' ' || key === 'space') {
        if (onToggleCheck && selectedIndex >= 0 && selectedIndex < items.length) {
          e.preventDefault();
          onToggleCheck(items[selectedIndex]);
        }
      } else if (key === 'delete') {
        if (selectedIndex >= 0 && selectedIndex < items.length) {
          e.preventDefault();
          onDelete(items[selectedIndex]);
        }
      } else if (e.ctrlKey && key === 'c') {
        if (selectedIndex >= 0 && selectedIndex < items.length) {
          e.preventDefault();
          const item = items[selectedIndex];
          // Try to copy stringified object or specific formatted string
          const textToCopy = JSON.stringify(item, null, 2);
          navigator.clipboard.writeText(textToCopy).catch(() => {});
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);
}
