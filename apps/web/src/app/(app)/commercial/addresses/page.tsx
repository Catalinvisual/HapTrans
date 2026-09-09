'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function AddressesPage() {
  return (
    <PlaceholderPage
      title="Addresses"
      description="Manage pickup and delivery address master data."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Commercial' },
        { label: 'Addresses' },
      ]}
    />
  );
}


