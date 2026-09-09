'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function TrailersPage() {
  return (
    <PlaceholderPage
      title="Trailers"
      description="Track trailer inventory, maintenance, and utilization."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Fleet' },
        { label: 'Trailers' },
      ]}
    />
  );
}


