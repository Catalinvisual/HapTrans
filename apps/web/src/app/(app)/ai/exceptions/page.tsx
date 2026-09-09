'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function AIExceptionAssistantPage() {
  return (
    <PlaceholderPage
      title="AI Exception Assistant"
      description="Automated exception detection and resolution."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'AI' },
        { label: 'AI Exception Assistant' },
      ]}
    />
  );
}

