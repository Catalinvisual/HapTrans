'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { PageHeader, Spinner } from '@hapcargo/ui';
import { NAMESPACES } from '@/i18n';
import { CustomerForm, type CustomerFormValues } from '../../customer-form';
import type { CustomerListItem } from '../../types';

async function fetchCustomer(id: string): Promise<CustomerListItem & { address?: string }> {
  const res = await fetch(`/api/customers/${id}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to load customer');
  return res.json();
}

async function updateCustomer(id: string, values: CustomerFormValues): Promise<void> {
  const res = await fetch(`/api/customers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(values),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message || 'Failed to update customer');
  }
}

export default function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = useTranslation(NAMESPACES);
  const router = useRouter();
  const [id, setId] = React.useState<string | null>(null);

  React.useEffect(() => {
    void params.then((p) => setId(p.id));
  }, [params]);

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => fetchCustomer(id!),
    enabled: !!id,
  });

  const mutation = useMutation({
    mutationFn: (values: CustomerFormValues) => updateCustomer(id!, values),
    onSuccess: () => {
      router.push(`/customers/${id}`);
    },
  });

  if (isLoading || !id || !customer) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner />
      </div>
    );
  }

  const c = customer;
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('customers:editTitle')}
        description={t('customers:editDescription')}
        breadcrumbs={[
          { label: t('nav:dashboard'), href: '/dashboard' },
          { label: t('nav:commercial') },
          { label: t('nav:customers'), href: '/customers' },
          { label: c.legalName, href: `/customers/${id}` },
          { label: t('common:edit') },
        ]}
      />
      <CustomerForm
        initialValues={{
          code: c.code,
          legalName: c.legalName,
          tradingName: c.tradingName ?? '',
          category: c.category,
          status: c.status,
          country: c.country ?? '',
          city: c.city ?? '',
          email: c.email ?? '',
          phone: c.phone ?? '',
        }}
        onSubmit={async (values) => {
          await mutation.mutateAsync(values);
        }}
        submitting={mutation.isPending}
        errorMessage={mutation.error?.message ?? t('customers:saveError')}
      />
    </div>
  );
}