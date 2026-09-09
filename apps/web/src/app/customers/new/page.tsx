'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@hapcargo/ui';
import { NAMESPACES } from '@/i18n';
import { CustomerForm, type CustomerFormValues } from '../customer-form';

async function createCustomer(values: CustomerFormValues): Promise<{ id: string }> {
  const res = await fetch('/api/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(values),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message || 'Failed to create customer');
  }
  return res.json();
}

export default function NewCustomerPage() {
  const { t } = useTranslation(NAMESPACES);
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: (data) => {
      router.push(`/customers/${data.id}`);
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('customers:createTitle')}
        description={t('customers:createDescription')}
        breadcrumbs={[
          { label: t('nav:dashboard'), href: '/dashboard' },
          { label: t('nav:commercial') },
          { label: t('nav:customers'), href: '/customers' },
          { label: t('common:new') },
        ]}
      />
      <CustomerForm
        onSubmit={async (values) => {
          await mutation.mutateAsync(values);
        }}
        submitting={mutation.isPending}
        errorMessage={mutation.error?.message ?? t('customers:saveError')}
      />
    </div>
  );
}