'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function CommunicationCenterPage() {
  return (
    <PlaceholderPage
      title="Communication Center"
      description="Centralized communication hub."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Communication' },
        { label: 'Communication Center' },
      ]}
    />
  );
}


