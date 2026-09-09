'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function AICopilotPage() {
  return (
    <PlaceholderPage
      title="AI Copilot"
      description="AI-powered operational assistant."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'AI' },
        { label: 'AI Copilot' },
      ]}
    />
  );
}


