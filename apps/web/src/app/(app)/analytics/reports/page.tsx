'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function ReportBuilderPage() {
  return (
    <PlaceholderPage
      title="Report Builder"
      description="Create custom reports and dashboards."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Analytics' },
        { label: 'Report Builder' },
      ]}
    />
  );
}



