'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function ClaimsPage() {
  return (
    <PlaceholderPage
      title="Claims"
      description="Process and track cargo claims and disputes."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Commercial' },
        { label: 'Claims' },
      ]}
    />
  );
}


