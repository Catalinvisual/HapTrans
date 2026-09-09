'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function TachographPage() {
  return (
    <PlaceholderPage
      title="Tachograph"
      description="Manage driver hours, compliance, and tachograph data."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Fleet' },
        { label: 'Tachograph' },
      ]}
    />
  );
}


