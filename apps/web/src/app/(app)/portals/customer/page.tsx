'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function CustomerPortalPage() {
  return (
    <PlaceholderPage
      title="Customer Portal"
      description="Customer-facing portal for orders and tracking."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Portals' },
        { label: 'Customer Portal' },
      ]}
    />
  );
}

