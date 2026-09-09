'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function CMRPage() {
  return (
    <PlaceholderPage
      title="CMR"
      description="Generate and manage CMR consignment notes."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Documents' },
        { label: 'CMR' },
      ]}
    />
  );
}



