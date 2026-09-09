'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function VehiclesPage() {
  return (
    <PlaceholderPage
      title="Vehicles"
      description="Manage vehicle registry, specifications, and assignments."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Fleet' },
        { label: 'Vehicles' },
      ]}
    />
  );
}

