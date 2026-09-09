'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function FuelPage() {
  return (
    <PlaceholderPage
      title="Fuel"
      description="Monitor fuel consumption, costs, and efficiency."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Fleet' },
        { label: 'Fuel' },
      ]}
    />
  );
}


