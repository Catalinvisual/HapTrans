'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function AuditLogPage() {
  return (
    <PlaceholderPage
      title="Audit Log"
      description="View system audit trail and changes."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Administration' },
        { label: 'Audit Log' },
      ]}
    />
  );
}

