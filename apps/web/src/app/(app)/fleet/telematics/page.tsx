'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function TelematicsPage() {
  return (
    <PlaceholderPage
      title="Telematics"
      description="Real-time vehicle tracking and telemetry data."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Fleet' },
        { label: 'Telematics' },
      ]}
    />
  );
}


