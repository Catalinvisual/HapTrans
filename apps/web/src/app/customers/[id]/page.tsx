'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  PageHeader,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Badge,
  EmptyState,
  Spinner,
  Alert,
  AlertDescription,
} from '@hapcargo/ui';
import { NAMESPACES } from '@/i18n';
import type { CustomerStatus, CustomerCategory } from '../types';

interface CustomerContact {
  id: string;
  fullName: string;
  role?: string;
  email?: string;
  phone?: string;
  isMain?: boolean;
}

interface CustomerAddress {
  id: string;
  label?: string;
  city?: string;
  country?: string;
  isMain?: boolean;
}

interface CustomerTag {
  id: string;
  name: string;
  color?: string;
}

interface Customer360 {
  id: string;
  code: string;
  legalName: string;
  tradingName?: string;
  category: CustomerCategory;
  status: CustomerStatus;
  country?: string;
  city?: string;
  email?: string;
  phone?: string;
  accountManagerName?: string;
  mainContact?: CustomerContact;
  contacts: CustomerContact[];
  addresses: CustomerAddress[];
  tags: CustomerTag[];
  commercial?: {
    paymentTerms?: string;
    creditLimit?: number;
    currency?: string;
  };
  operational?: {
    defaultService?: string;
    defaultTransportMode?: string;
  };
  createdAt: string;
}

async function fetchCustomer360(id: string): Promise<Customer360> {
  const res = await fetch(`/api/customers/${id}/360`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to load customer');
  return res.json();
}

async function customerAction(id: string, action: 'activate' | 'deactivate' | 'archive'): Promise<void> {
  const res = await fetch(`/api/customers/${id}/${action}`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Failed to ${action} customer`);
}

async function addTag(id: string, tagId: string): Promise<void> {
  const res = await fetch(`/api/customers/${id}/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ tagId }),
  });
  if (!res.ok) throw new Error('Failed to add tag');
}

async function removeTag(id: string, tagId: string): Promise<void> {
  const res = await fetch(`/api/customers/${id}/tags/${tagId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to remove tag');
}

function statusBadgeVariant(status: CustomerStatus) {
  switch (status) {
    case 'active':
      return 'success' as const;
    case 'inactive':
      return 'secondary' as const;
    case 'archived':
      return 'warning' as const;
  }
}

export default function Customer360Page({ params }: { params: Promise<{ id: string }> }) {
  const { t } = useTranslation(NAMESPACES);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [id, setId] = React.useState<string | null>(null);
  const [tagInput, setTagInput] = React.useState('');

  React.useEffect(() => {
    void params.then((p) => setId(p.id));
  }, [params]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['customer-360', id],
    queryFn: () => fetchCustomer360(id!),
    enabled: !!id,
  });

  const actionMutation = useMutation({
    mutationFn: (action: 'activate' | 'deactivate' | 'archive') => customerAction(id!, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customer-360', id] }),
  });

  const addTagMutation = useMutation({
    mutationFn: (tagId: string) => addTag(id!, tagId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customer-360', id] }),
  });

  const removeTagMutation = useMutation({
    mutationFn: (tagId: string) => removeTag(id!, tagId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customer-360', id] }),
  });

  if (isLoading || !id) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{t('customers:loadError')}</AlertDescription>
      </Alert>
    );
  }

  const categoryLabel =
    data.category === 'prospect'
      ? t('customers:categoryProspect')
      : data.category === 'standard'
        ? t('customers:categoryStandard')
        : data.category === 'premium'
          ? t('customers:categoryPremium')
          : t('customers:categoryStrategic');

  const statusLabel =
    data.status === 'active'
      ? t('customers:statusActive')
      : data.status === 'inactive'
        ? t('customers:statusInactive')
        : t('customers:statusArchived');

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagInput.trim()) return;
    addTagMutation.mutate(tagInput.trim());
    setTagInput('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.legalName}
        description={
          data.tradingName ? `${data.tradingName} · ${data.code}` : data.code
        }
        breadcrumbs={[
          { label: t('nav:dashboard'), href: '/dashboard' },
          { label: t('nav:commercial') },
          { label: t('nav:customers'), href: '/customers' },
          { label: data.legalName },
        ]}
        primaryAction={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push(`/customers/${id}/edit`)}>
              <span className="text-lg">??</span>
              {t('customers:edit')}
            </Button>
            {data.status !== 'active' && (
              <Button
                variant="outline"
                onClick={() => actionMutation.mutate('activate')}
                disabled={actionMutation.isPending}
              >
                {t('customers:activate')}
              </Button>
            )}
            {data.status === 'active' && (
              <Button
                variant="outline"
                onClick={() => actionMutation.mutate('deactivate')}
                disabled={actionMutation.isPending}
              >
                {t('customers:deactivate')}
              </Button>
            )}
            {data.status !== 'archived' && (
              <Button
                variant="outline"
                onClick={() => actionMutation.mutate('archive')}
                disabled={actionMutation.isPending}
              >
                <span className="text-lg">??</span>
                {t('customers:archive')}
              </Button>
            )}
          </div>
        }
      />

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={statusBadgeVariant(data.status)}>{statusLabel}</Badge>
                <Badge variant="outline">{categoryLabel}</Badge>
              </div>
              <h2 className="text-xl font-semibold">{data.legalName}</h2>
              <p className="text-sm text-muted-foreground">{data.code}</p>
              {data.country && (
                <p className="text-sm text-muted-foreground mt-1">
                  {[data.city, data.country].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {data.email && (
                <div className="flex items-center gap-2">
                  <span className="text-lg">??</span>
                  <span>{data.email}</span>
                </div>
              )}
              {data.phone && (
                <div className="flex items-center gap-2">
                  <span className="text-lg">??</span>
                  <span>{data.phone}</span>
                </div>
              )}
              {data.mainContact && (
                <div className="flex items-center gap-2">
                  <span className="text-lg">??</span>
                  <span>{data.mainContact.fullName}</span>
                </div>
              )}
              {data.accountManagerName && (
                <div className="flex items-center gap-2">
                  <span className="text-lg">??</span>
                  <span className="text-muted-foreground">{t('customers:accountManager')}:</span>
                  <span>{data.accountManagerName}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t('customers:tabsOverview')}</TabsTrigger>
          <TabsTrigger value="contacts">
            {t('customers:tabsContacts')} ({data.contacts.length})
          </TabsTrigger>
          <TabsTrigger value="addresses">
            {t('customers:tabsAddresses')} ({data.addresses.length})
          </TabsTrigger>
          <TabsTrigger value="tags">
            {t('customers:tabsTags')} ({data.tags.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('customers:contactsSummary')}</CardTitle>
              </CardHeader>
              <CardContent>
                {data.contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('customers:noContacts')}</p>
                ) : (
                  <ul className="space-y-2">
                    {data.contacts.slice(0, 5).map((c) => (
                      <li key={c.id} className="text-sm flex items-center gap-2">
                        <span className="text-lg">??</span>
                        <span className="font-medium">{c.fullName}</span>
                        {c.role && <span className="text-muted-foreground">· {c.role}</span>}
                        {c.isMain && <Badge variant="info">{t('customers:mainContact')}</Badge>}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('customers:addressesSummary')}</CardTitle>
              </CardHeader>
              <CardContent>
                {data.addresses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('customers:noAddresses')}</p>
                ) : (
                  <ul className="space-y-2">
                    {data.addresses.slice(0, 5).map((a) => (
                      <li key={a.id} className="text-sm flex items-center gap-2">
                        <span className="text-lg">??</span>
                        <span>{[a.city, a.country].filter(Boolean).join(', ') || a.label}</span>
                        {a.isMain && <Badge variant="info">Main</Badge>}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('customers:commercialSummary')}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                {data.commercial?.paymentTerms && (
                  <p>
                    <span className="text-muted-foreground">{t('customers:paymentTerms')}:</span>{' '}
                    {data.commercial.paymentTerms}
                  </p>
                )}
                {data.commercial?.creditLimit !== undefined && (
                  <p>
                    <span className="text-muted-foreground">{t('customers:creditLimit')}:</span>{' '}
                    {data.commercial.creditLimit} {data.commercial.currency ?? ''}
                  </p>
                )}
                {!data.commercial?.paymentTerms && data.commercial?.creditLimit === undefined && (
                  <p className="text-muted-foreground">—</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('customers:operationalSummary')}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                {data.operational?.defaultService && (
                  <p>
                    <span className="text-muted-foreground">{t('customers:defaultService')}:</span>{' '}
                    {data.operational.defaultService}
                  </p>
                )}
                {data.operational?.defaultTransportMode && (
                  <p>
                    <span className="text-muted-foreground">{t('customers:defaultMode')}:</span>{' '}
                    {data.operational.defaultTransportMode}
                  </p>
                )}
                {!data.operational?.defaultService && !data.operational?.defaultTransportMode && (
                  <p className="text-muted-foreground">—</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('customers:tabsContacts')}</CardTitle>
              <Button variant="outline" size="sm">
                <span className="text-lg">??</span>
                {t('customers:addContact')}
              </Button>
            </CardHeader>
            <CardContent>
              {data.contacts.length === 0 ? (
                <EmptyState title={t('customers:noContacts')} />
              ) : (
                <ul className="divide-y">
                  {data.contacts.map((c) => (
                    <li key={c.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">??</span>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {c.fullName}
                            {c.isMain && <Badge variant="info">{t('customers:mainContact')}</Badge>}
                          </div>
                          {c.role && <div className="text-xs text-muted-foreground">{c.role}</div>}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground flex flex-col items-end">
                        {c.email && <span>{c.email}</span>}
                        {c.phone && <span>{c.phone}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="addresses" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('customers:tabsAddresses')}</CardTitle>
            </CardHeader>
            <CardContent>
              {data.addresses.length === 0 ? (
                <EmptyState title={t('customers:noAddresses')} />
              ) : (
                <ul className="divide-y">
                  {data.addresses.map((a) => (
                    <li key={a.id} className="py-3 flex items-center gap-3">
                      <span className="text-lg">??</span>
                      <div className="flex-1">
                        <div className="font-medium">
                          {a.label ?? [a.city, a.country].filter(Boolean).join(', ')}
                          {a.isMain && (
                            <Badge variant="info" className="ml-2">
                              Main
                            </Badge>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tags" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('customers:tabsTags')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleAddTag} className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder={t('customers:addTag')}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <Button type="submit" size="sm" disabled={addTagMutation.isPending}>
                  <span className="text-lg">??</span>
                  {t('customers:addTag')}
                </Button>
              </form>
              {data.tags.length === 0 ? (
                <EmptyState title={t('customers:noTags')} />
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {data.tags.map((tag) => (
                    <li key={tag.id}>
                      <Badge variant="secondary" className="gap-1.5 py-1 px-2">
                        <span className="text-lg">??</span>
                        {tag.name}
                        <button
                          type="button"
                          onClick={() => removeTagMutation.mutate(tag.id)}
                          className="ml-1 text-muted-foreground hover:text-destructive"
                          aria-label={t('customers:removeTag')}
                        >
                          ×
                        </button>
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

















