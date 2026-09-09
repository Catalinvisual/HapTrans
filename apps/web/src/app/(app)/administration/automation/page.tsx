'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function AutomationPage() {
  return (
    <PlaceholderPage
      title="Automation"
      description="Workflow automation and business rules."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Administration' },
        { label: 'Automation' },
      ]}
    />
  );
}


