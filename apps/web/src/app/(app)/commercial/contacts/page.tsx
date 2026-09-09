'use client';

import { PlaceholderPage } from '@/components/shell/placeholder-page';

export default function ContactsPage() {
  return (
    <PlaceholderPage
      title="Contacts"
      description="Maintain contact database for customers and partners."
      icon={<span className="text-lg">??</span>}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Commercial' },
        { label: 'Contacts' },
      ]}
    />
  );
}

