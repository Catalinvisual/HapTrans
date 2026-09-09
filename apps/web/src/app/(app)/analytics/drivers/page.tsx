'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function DriverAnalyticsPage() {
  return (
    <PlaceholderPage
      title="Driver Analytics"
      description="Driver performance, safety, and compliance."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Analytics' },
        { label: 'Driver Analytics' },
      ]}
    />
  );
}

