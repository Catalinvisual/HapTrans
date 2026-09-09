'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function IntegrationsPage() {
  return (
    <PlaceholderPage
      title="Integrations"
      description="Configure third-party system integrations."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Administration' },
        { label: 'Integrations' },
      ]}
    />
  );
}


