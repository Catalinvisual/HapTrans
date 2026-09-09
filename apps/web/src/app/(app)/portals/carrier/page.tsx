'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function CarrierPortalPage() {
  return (
    <PlaceholderPage
      title="Carrier Portal"
      description="Carrier-facing portal for assignments and POD."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Portals' },
        { label: 'Carrier Portal' },
      ]}
    />
  );
}

