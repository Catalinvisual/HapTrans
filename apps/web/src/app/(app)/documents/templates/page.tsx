'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function DocumentTemplatesPage() {
  return (
    <PlaceholderPage
      title="Document Templates"
      description="Manage document templates and layouts."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Documents' },
        { label: 'Document Templates' },
      ]}
    />
  );
}

