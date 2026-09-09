'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function AIPlanningAssistantPage() {
  return (
    <PlaceholderPage
      title="AI Planning Assistant"
      description="Intelligent route and load optimization."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'AI' },
        { label: 'AI Planning Assistant' },
      ]}
    />
  );
}


