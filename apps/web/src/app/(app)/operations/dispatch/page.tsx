'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function DispatchPage() {
  return (
    <PlaceholderPage
      title="Dispatch"
      description="Assign drivers and vehicles to orders in real-time."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Operations' },
        { label: 'Dispatch' },
      ]}
    />
  );
}


