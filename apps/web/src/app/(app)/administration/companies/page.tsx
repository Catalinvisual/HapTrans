'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function CompaniesPage() {
  return (
    <PlaceholderPage
      title="Companies"
      description="Manage company entities and hierarchies."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Administration' },
        { label: 'Companies' },
      ]}
    />
  );
}

