import { createContext, useContext, useState, ReactNode } from 'react';

type ShortcutContextType = {
  registerShortcut: (key: string, action: () => void) => void;
  unregisterShortcut: (key: string) => void;
  pageShortcuts: Record<string, () => void>;
};

const ShortcutContext = createContext<ShortcutContextType | undefined>(undefined);

export function ShortcutProvider({ children }: { children: ReactNode }) {
  const [pageShortcuts, setPageShortcuts] = useState<Record<string, () => void>>({});

  const registerShortcut = (key: string, action: () => void) => {
    setPageShortcuts(prev => ({ ...prev, [key.toLowerCase()]: action }));
  };

  const unregisterShortcut = (key: string) => {
    setPageShortcuts(prev => {
      const newShortcuts = { ...prev };
      delete newShortcuts[key.toLowerCase()];
      return newShortcuts;
    });
  };

  return (
    <ShortcutContext.Provider value={{ registerShortcut, unregisterShortcut, pageShortcuts }}>
      {children}
    </ShortcutContext.Provider>
  );
}

export function useShortcutContext() {
  const context = useContext(ShortcutContext);
  if (!context) {
    throw new Error('useShortcutContext must be used within a ShortcutProvider');
  }
  return context;
}
