'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { cn } from '@hapcargo/ui';
import { Sheet, SheetContent, SheetTrigger } from '@hapcargo/ui';
import { NAMESPACES } from '@/i18n';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
  const { t } = useTranslation(NAMESPACES);

  React.useEffect(() => {
    const handleToggle = () => setMobileSidebarOpen(true);
    window.addEventListener('toggle-sidebar', handleToggle);
    return () => window.removeEventListener('toggle-sidebar', handleToggle);
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Mobile sidebar trigger */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetTrigger asChild>
          <button className="lg:hidden fixed top-4 left-4 z-50 h-10 w-10 rounded-lg bg-background border shadow-md" aria-label={t('accessibility:openMenu')}>
            <span className="text-lg">??</span>
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] h-full p-0 max-w-[85vw]">
          <div className="flex h-full flex-col">
            <div className="flex h-14 items-center justify-between border-b px-4">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-primary text-primary-foreground text-sm font-bold">
                HC
              </div>
              <span className="text-sm font-semibold">HAP CARGO TMS</span>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="h-10 w-10 rounded-lg hover:bg-accent"
                aria-label={t('accessibility:closeMenu')}
              >
                <span className="text-lg">??</span>
              </button>
            </div>
            <Sidebar />
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col" aria-label={t('accessibility:mainNavigation')}>
        <Sidebar />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden lg:pl-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className={cn('mx-auto w-full max-w-[1400px]')}>{children}</div>
        </main>
      </div>
    </div>
  );
}

