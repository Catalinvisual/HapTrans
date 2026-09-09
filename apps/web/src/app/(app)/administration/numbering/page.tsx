'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function NumberingPage() {
  return (
    <PlaceholderPage
      title="Numbering"
      description="Configure document and entity numbering."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Administration' },
        { label: 'Numbering' },
      ]}
    />
  );
}


