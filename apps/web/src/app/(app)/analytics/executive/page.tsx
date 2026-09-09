'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function ExecutiveDashboardPage() {
  return (
    <PlaceholderPage
      title="Executive Dashboard"
      description="High-level KPI overview for leadership."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Analytics' },
        { label: 'Executive Dashboard' },
      ]}
    />
  );
}

