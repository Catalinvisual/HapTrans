'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function RolesPermissionsPage() {
  return (
    <PlaceholderPage
      title="Roles & Permissions"
      description="Configure role-based access control."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Administration' },
        { label: 'Roles & Permissions' },
      ]}
    />
  );
}

