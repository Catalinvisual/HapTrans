'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function FleetAnalyticsPage() {
  return (
    <PlaceholderPage
      title="Fleet Analytics"
      description="Vehicle utilization, maintenance, and performance."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Analytics' },
        { label: 'Fleet Analytics' },
      ]}
    />
  );
}

