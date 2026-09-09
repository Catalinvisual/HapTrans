'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Button,
} from '@hapcargo/ui';
import { apiClient, NAMESPACES } from '@/i18n';

export function UserMenu() {
  const { t } = useTranslation(NAMESPACES);
  const [user, setUser] = React.useState<{ email: string; firstName: string | null; lastName: string | null } | null>(null);

  React.useEffect(() => {
    apiClient.get('/auth/me')
      .then((data: unknown) => setUser(data as { email: string; firstName: string | null; lastName: string | null }))
      .catch(() => setUser(null));
  }, []);

  const initials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U' : 'U';
  const displayName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email : 'User';

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 rounded-full">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            {initials}
          </span>
          <span className="text-sm">{displayName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>{t('nav:profile')}</DropdownMenuItem>
        <DropdownMenuItem>{t('settings:security')}</DropdownMenuItem>
        <DropdownMenuItem>{t('settings:sessions')}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleLogout}>{t('auth:signOut')}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
