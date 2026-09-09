'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function NotificationsPage() {
  return (
    <PlaceholderPage
      title="Notifications"
      description="Manage notification preferences and history."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Communication' },
        { label: 'Notifications' },
      ]}
    />
  );
}

