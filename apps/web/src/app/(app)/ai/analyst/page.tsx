'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function AIBusinessAnalystPage() {
  return (
    <PlaceholderPage
      title="AI Business Analyst"
      description="AI-driven insights and recommendations."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'AI' },
        { label: 'AI Business Analyst' },
      ]}
    />
  );
}


