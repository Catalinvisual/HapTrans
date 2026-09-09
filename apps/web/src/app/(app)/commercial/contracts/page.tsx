'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function ContractsPage() {
  return (
    <PlaceholderPage
      title="Contracts"
      description="Manage commercial contracts, terms, and renewals."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Commercial' },
        { label: 'Contracts' },
      ]}
    />
  );
}



