'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '@hapcargo/ui';
import { LocaleSwitcher } from './locale-switcher';
import { UserMenu } from './user-menu';
import { NotificationBell, NotificationCenter } from '@hapcargo/ui';
import { CommandPalette } from '@hapcargo/ui';
import { GlobalSearch } from '@hapcargo/ui';
import { Button } from '@hapcargo/ui';
import { NAMESPACES } from '@/i18n';

export function Topbar() {
  const pathname = usePathname();
  const { t } = useTranslation(NAMESPACES);
  const [notificationOpen, setNotificationOpen] = React.useState(false);
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);

  const breadcrumbs = React.useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return [{ label: t('nav:dashboard'), href: '/dashboard' }];

    const crumbs: Array<{ label: string; href?: string }> = [{ label: t('common:appName'), href: '/dashboard' }];
    let currentPath = '';

    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === segments.length - 1;
      const label = segment.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

      crumbs.push({ label, href: isLast ? undefined : currentPath });
    });

    return crumbs;
  }, [pathname, t]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b px-4">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => window.dispatchEvent(new CustomEvent('toggle-sidebar'))}
        aria-label={t('accessibility:openSidebar')}
      >
        <span className="text-lg">??</span>
      </Button>

      <Breadcrumb className="hidden sm:flex flex-1 min-w-0" aria-label={t('accessibility:breadcrumb')}>
        <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => (
            <BreadcrumbItem key={crumb.label || index}>
              {index === breadcrumbs.length - 1 ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : crumb.href ? (
                <>
                  <BreadcrumbLink asChild>
                    <a href={crumb.href}>{crumb.label}</a>
                  </BreadcrumbLink>
                  <BreadcrumbSeparator />
                </>
              ) : (
                <>
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  <BreadcrumbSeparator />
                </>
              )}
            </BreadcrumbItem>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex-1 sm:hidden" />

      <div className="flex items-center gap-2">
        <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
        <CommandPalette isOpen={commandOpen} onClose={() => setCommandOpen(false)} />
        <NotificationBell notifications={[]} onOpen={() => setNotificationOpen(true)} />
        <NotificationCenter
          isOpen={notificationOpen}
          onClose={() => setNotificationOpen(false)}
          notifications={[]}
        />
        <LocaleSwitcher />
        <UserMenu />
        <Button
          variant="ghost"
          size="icon"
          className="hidden sm:flex"
          onClick={() => setCommandOpen(true)}
          aria-label={t('accessibility:openCommandPalette')}
        >
          <span className="text-lg">??</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hidden sm:flex"
          onClick={() => window.dispatchEvent(new CustomEvent('open-help'))}
          aria-label={t('nav:help')}
        >
          <span className="text-lg">??</span>
        </Button>
      </div>
    </header>
  );
}



