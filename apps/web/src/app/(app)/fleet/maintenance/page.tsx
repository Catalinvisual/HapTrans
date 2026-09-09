'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function MaintenancePage() {
  return (
    <PlaceholderPage
      title="Maintenance"
      description="Schedule and track vehicle maintenance and repairs."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Fleet' },
        { label: 'Maintenance' },
      ]}
    />
  );
}


