'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function PaymentsPage() {
  return (
    <PlaceholderPage
      title="Payments"
      description="Track incoming and outgoing payments."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Finance' },
        { label: 'Payments' },
      ]}
    />
  );
}


