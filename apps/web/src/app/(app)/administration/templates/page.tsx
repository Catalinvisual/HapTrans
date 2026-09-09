'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function DocumentTemplatesPage() {
  return (
    <PlaceholderPage
      title="Document Templates"
      description="Manage system-wide document templates."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Administration' },
        { label: 'Document Templates' },
      ]}
    />
  );
}

