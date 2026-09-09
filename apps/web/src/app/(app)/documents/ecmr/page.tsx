'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function eCMRPage() {
  return (
    <PlaceholderPage
      title="eCMR"
      description="Electronic CMR management and exchange."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Documents' },
        { label: 'eCMR' },
      ]}
    />
  );
}

