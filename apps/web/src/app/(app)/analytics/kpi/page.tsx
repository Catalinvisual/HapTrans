'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function KPICenterPage() {
  return (
    <PlaceholderPage
      title="KPI Center"
      description="Configure and monitor key performance indicators."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Analytics' },
        { label: 'KPI Center' },
      ]}
    />
  );
}


