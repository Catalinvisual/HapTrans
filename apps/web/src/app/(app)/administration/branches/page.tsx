'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function BranchesDepotsPage() {
  return (
    <PlaceholderPage
      title="Branches / Depots"
      description="Manage operational locations."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Administration' },
        { label: 'Branches / Depots' },
      ]}
    />
  );
}


