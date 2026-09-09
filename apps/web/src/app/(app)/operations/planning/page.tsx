'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function PlanningPage() {
  return (
    <PlaceholderPage
      title="Planning"
      description="Plan and optimize routes, loads, and schedules."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Operations' },
        { label: 'Planning' },
      ]}
    />
  );
}


