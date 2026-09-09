'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function DriversPage() {
  return (
    <PlaceholderPage
      title="Drivers"
      description="Manage driver profiles, qualifications, and availability."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Fleet' },
        { label: 'Drivers' },
      ]}
    />
  );
}

