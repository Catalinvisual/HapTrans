'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function RatesTariffsPage() {
  return (
    <PlaceholderPage
      title="Rates & Tariffs"
      description="Configure pricing rules, tariffs, and rate cards."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Commercial' },
        { label: 'Rates & Tariffs' },
      ]}
    />
  );
}


