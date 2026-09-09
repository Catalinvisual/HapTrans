'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function CustomerAnalyticsPage() {
  return (
    <PlaceholderPage
      title="Customer Analytics"
      description="Customer profitability, retention, and behavior."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Analytics' },
        { label: 'Customer Analytics' },
      ]}
    />
  );
}

