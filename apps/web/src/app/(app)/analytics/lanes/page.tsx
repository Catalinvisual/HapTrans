'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function LaneAnalyticsPage() {
  return (
    <PlaceholderPage
      title="Lane Analytics"
      description="Route and lane profitability analysis."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Analytics' },
        { label: 'Lane Analytics' },
      ]}
    />
  );
}


