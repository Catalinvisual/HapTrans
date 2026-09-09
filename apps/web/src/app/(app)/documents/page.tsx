'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function DocumentCenterPage() {
  return (
    <PlaceholderPage
      title="Document Center"
      description="Centralized document management and search."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Documents' },
        { label: 'Document Center' },
      ]}
    />
  );
}



