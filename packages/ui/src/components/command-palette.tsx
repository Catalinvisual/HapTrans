'use client';

import * as React from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from './command';
import { useTranslation } from 'react-i18next';


interface CommandItemData {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  category: string;
  action: () => void;
  icon?: React.ReactNode;
}

export function CommandPalette({
  isOpen,
  onClose,
  items = [],
}: {
  isOpen: boolean;
  onClose: () => void;
  items?: CommandItemData[];
}) {
  const { t } = useTranslation();

  const defaultItems: CommandItemData[] = [
    {
      id: 'go-dashboard',
      label: t('nav.dashboard'),
      description: t('nav.dashboard'),
      shortcut: '⌘1',
      category: t('command.categories.navigation'),
      action: () => { window.location.href = '/dashboard'; onClose(); },
    },
    {
      id: 'go-settings',
      label: t('nav.settings'),
      description: t('nav.settings'),
      shortcut: '⌘,',
      category: t('command.categories.navigation'),
      action: () => { window.location.href = '/settings'; onClose(); },
    },
    {
      id: 'toggle-sidebar',
      label: t('accessibility.toggleSidebar'),
      description: t('accessibility.toggleSidebar'),
      shortcut: '⌘B',
      category: t('command.categories.shortcuts'),
      action: () => { onClose(); window.dispatchEvent(new CustomEvent('toggle-sidebar')); },
    },
    {
      id: 'open-search',
      label: t('search.placeholder'),
      description: t('search.shortcut'),
      shortcut: '⌘K',
      category: t('command.categories.shortcuts'),
      action: () => { onClose(); window.dispatchEvent(new CustomEvent('open-search')); },
    },
    {
      id: 'open-help',
      label: t('nav.help'),
      description: t('nav.help'),
      shortcut: '⌘/',
      category: t('command.categories.shortcuts'),
      action: () => { onClose(); window.dispatchEvent(new CustomEvent('open-help')); },
    },
  ];

  const allItems = [...defaultItems, ...items];
  const grouped = allItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    (acc[item.category] as CommandItemData[]).push(item);
    return acc;
  }, {} as Record<string, CommandItemData[]>);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (!isOpen) window.dispatchEvent(new CustomEvent('open-command-palette'));
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-start justify-center pt-16">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <Command className="w-full max-w-2xl">
        <CommandInput placeholder={t('command.placeholder')} className="text-base" />
        <CommandList className="max-h-[400px]">
          <CommandEmpty className="py-6 text-center text-muted-foreground">
            {t('command.noCommands')}
          </CommandEmpty>
          {Object.entries(grouped).map(([category, categoryItems]) => (
            <CommandGroup key={category} heading={category}>
              {categoryItems.map((item) => (
                <CommandItem
                  key={item.id}
                  onSelect={item.action}
                  className="px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    {item.icon && <span className="h-4 w-4 text-muted-foreground">{item.icon}</span>}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.label}</div>
                      {item.description && (
                        <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                      )}
                    </div>
                    {item.shortcut && (
                      <CommandShortcut className="text-xs text-muted-foreground">{item.shortcut}</CommandShortcut>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </div>
  );
}