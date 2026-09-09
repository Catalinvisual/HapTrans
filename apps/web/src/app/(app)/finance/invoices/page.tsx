'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function InvoicesPage() {
  return (
    <PlaceholderPage
      title="Invoices"
      description="Manage invoice generation, tracking, and collection."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Finance' },
        { label: 'Invoices' },
      ]}
    />
  );
}



