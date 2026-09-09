'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function CostsPage() {
  return (
    <PlaceholderPage
      title="Costs"
      description="Monitor operational costs and expenses."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Finance' },
        { label: 'Costs' },
      ]}
    />
  );
}


