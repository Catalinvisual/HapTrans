'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function OrdersPage() {
  return (
    <PlaceholderPage
      title="Orders"
      description="Manage transport orders, track status, and coordinate shipments."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Operations' },
        { label: 'Orders' },
      ]}
    />
  );
}

