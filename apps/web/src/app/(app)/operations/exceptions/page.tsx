'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function ExceptionsPage() {
  return (
    <PlaceholderPage
      title="Exceptions"
      description="View and resolve operational exceptions and alerts."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Operations' },
        { label: 'Exceptions' },
      ]}
    />
  );
}

