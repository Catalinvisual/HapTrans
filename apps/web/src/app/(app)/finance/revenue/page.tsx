'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function RevenuePage() {
  return (
    <PlaceholderPage
      title="Revenue"
      description="Track revenue streams and billing."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Finance' },
        { label: 'Revenue' },
      ]}
    />
  );
}


