'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function CustomersPage() {
  return (
    <PlaceholderPage
      title="Customers"
      description="Manage customer accounts, contacts, and relationships."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Commercial' },
        { label: 'Customers' },
      ]}
    />
  );
}

