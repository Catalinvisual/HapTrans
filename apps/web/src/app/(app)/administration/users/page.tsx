'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function UsersPage() {
  return (
    <PlaceholderPage
      title="Users"
      description="Manage user accounts and access."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Administration' },
        { label: 'Users' },
      ]}
    />
  );
}

