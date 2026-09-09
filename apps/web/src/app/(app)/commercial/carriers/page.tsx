'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function CarrierManagementPage() {
  return (
    <PlaceholderPage
      title="Carrier Management"
      description="Manage carrier relationships and charter operations."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Commercial' },
        { label: 'Carrier Management' },
      ]}
    />
  );
}

