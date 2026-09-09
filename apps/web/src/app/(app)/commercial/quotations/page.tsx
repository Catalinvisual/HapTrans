'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function QuotationsPage() {
  return (
    <PlaceholderPage
      title="Quotations"
      description="Create and manage customer quotations."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Commercial' },
        { label: 'Quotations' },
      ]}
    />
  );
}



