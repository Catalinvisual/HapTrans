'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function FreightAuditPage() {
  return (
    <PlaceholderPage
      title="Freight Audit"
      description="Audit freight invoices for accuracy and compliance."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Finance' },
        { label: 'Freight Audit' },
      ]}
    />
  );
}

