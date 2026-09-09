'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function TripsPage() {
  return (
    <PlaceholderPage
      title="Trips"
      description="Monitor active trips, track progress, and manage deliveries."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Operations' },
        { label: 'Trips' },
      ]}
    />
  );
}

