'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function CarrierAnalyticsPage() {
  return (
    <PlaceholderPage
      title="Carrier Analytics"
      description="Carrier performance and cost analysis."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Analytics' },
        { label: 'Carrier Analytics' },
      ]}
    />
  );
}

