'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function ProfitabilityPage() {
  return (
    <PlaceholderPage
      title="Profitability"
      description="Analyze profitability by lane, customer, and service."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Finance' },
        { label: 'Profitability' },
      ]}
    />
  );
}


