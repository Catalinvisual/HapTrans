'use client';

import * as React from 'react';
import { PageHeader, EmptyState, Button } from '@hapcargo/ui';

interface PlaceholderPageProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

export function PlaceholderPage({
  title,
  description,
  icon,
  actions,
  breadcrumbs,
}: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={breadcrumbs}
        primaryAction={actions}
      />
      <EmptyState
        icon={icon || <span className="text-lg">??</span>}
        title={title}
        description={description || 'This module is not yet implemented. It will be available in a future release.'}
        action={
          <Button variant="outline" onClick={() => window.history.back()}>
            Go Back
          </Button>
        }
        size="lg"
      />
    </div>
  );
}

export function ComingSoonPage({
  title,
  description,
  breadcrumbs,
}: {
  title: string;
  description?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={breadcrumbs}
      />
      <EmptyState
        icon={<span className="text-lg">??</span>}
        title="Coming Soon"
        description={description || 'This feature is currently under development and will be available in a future release.'}
        size="lg"
      />
    </div>
  );
}



