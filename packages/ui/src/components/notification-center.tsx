'use client';

import * as React from 'react';
import { cn } from '../lib/cn';
import { Button } from './button';
import { ScrollArea } from './scroll-area';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from './dropdown-menu';
import { useTranslation } from 'react-i18next';
import { Bell, Check, X, MoreHorizontal } from './icons';

export interface Notification {
  id: string;
  title: string;
  description?: string;
  timestamp: Date | string;
  category: 'operational' | 'exception' | 'document' | 'financial' | 'system' | 'communication';
  priority: 'low' | 'normal' | 'high' | 'critical';
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  link?: string;
}

const categoryColors = {
  operational: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
  exception: 'text-destructive bg-destructive-muted',
  document: 'text-primary bg-primary-muted',
  financial: 'text-success bg-success-muted',
  system: 'text-muted-foreground bg-muted',
  communication: 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30',
};

const priorityStyles = {
  low: 'border-l-transparent',
  normal: 'border-l-transparent',
  high: 'border-l-warning',
  critical: 'border-l-destructive',
};

function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function NotificationCenter({
  isOpen,
  onClose,
  notifications = [],
  onMarkRead,
  onMarkAllRead,
}: {
  isOpen: boolean;
  onClose: () => void;
  notifications?: Notification[];
  onMarkRead?: (id: string) => void;
  onMarkAllRead?: () => void;
}) {
  const { t } = useTranslation();
  const [filter, setFilter] = React.useState<'all' | 'unread'>('all');

  const filteredNotifications = React.useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((n) => !n.read);
    }
    return notifications;
  }, [notifications, filter]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-start justify-end pt-16">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm h-[calc(100vh-4rem)] flex flex-col bg-popover border-l shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-semibold">{t('notifications.title')}</h2>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={onMarkAllRead}>
                {t('notifications.markAllRead')}
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-2 border-b px-4 py-2">
          <Button
            variant={filter === 'all' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1"
            onClick={() => setFilter('all')}
          >
            {t('common.all')}
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1"
            onClick={() => setFilter('unread')}
          >
            {t('notifications.unread')} {unreadCount > 0 && <span className="ml-1 bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
          </Button>
        </div>

        <ScrollArea className="flex-1">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">{filter === 'unread' ? t('notifications.noUnread') : t('notifications.noNotifications')}</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg transition-colors hover:bg-accent',
                    'border-l-4',
                    priorityStyles[notification.priority],
                    categoryColors[notification.category],
                    !notification.read && 'bg-accent/50'
                  )}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <div className={cn('h-2 w-2 rounded-full', !notification.read && 'bg-primary')}>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('font-medium text-sm', notification.read ? '' : 'font-semibold')}>
                        {notification.title}
                      </p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTimeAgo(notification.timestamp)}
                      </span>
                    </div>
                    {notification.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{notification.description}</p>
                    )}
                    {notification.action && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-xs h-7 px-2"
                        onClick={notification.action.onClick}
                      >
                        {notification.action.label}
                      </Button>
                    )}
                    {notification.link && !notification.action && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-xs h-7 px-2"
                        onClick={() => window.location.href = notification.link!}
                      >
                        View
                      </Button>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {!notification.read && (
                        <DropdownMenuItem onSelect={() => onMarkRead?.(notification.id)}>
                          <Check className="h-3 w-3 mr-2" />
                          {t('common.markRead')}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onSelect={() => {
                          if (notification.link) window.location.href = notification.link;
                        }}
                      >
                        {t('actions.view')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

export function NotificationBell({
  notifications = [],
  onOpen,
}: {
  notifications?: Notification[];
  onOpen: () => void;
}) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Button variant="ghost" size="icon" onClick={onOpen} className="relative">
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-medium">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Button>
  );
}