'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function MessagesPage() {
  return (
    <PlaceholderPage
      title="Messages"
      description="Internal and external messaging center."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Communication' },
        { label: 'Messages' },
      ]}
    />
  );
}


