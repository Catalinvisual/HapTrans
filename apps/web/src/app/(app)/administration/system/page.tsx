'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function SystemSettingsPage() {
  return (
    <PlaceholderPage
      title="System Settings"
      description="Global system configuration."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Administration' },
        { label: 'System Settings' },
      ]}
    />
  );
}

