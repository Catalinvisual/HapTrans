'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  PageHeader,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  EmptyState,
  Spinner,
} from '@hapcargo/ui';
import { NAMESPACES } from '@/i18n';
import type {
  CustomerCategory,
  CustomerListItem,
  CustomerListParams,
  CustomerListResponse,
  CustomerStatus,
} from './types';

export type { CustomerCategory, CustomerListItem, CustomerListParams, CustomerListResponse, CustomerStatus };

const STATUS_OPTIONS: CustomerStatus[] = ['active', 'inactive', 'archived'];
const CATEGORY_OPTIONS: CustomerCategory[] = ['prospect', 'standard', 'premium', 'strategic'];

async function fetchCustomers(params: CustomerListParams): Promise<CustomerListResponse> {
  const search = new URLSearchParams();
  search.set('page', String(params.page));
  search.set('pageSize', String(params.pageSize));
  if (params.search) search.set('search', params.search);
  if (params.status) search.set('status', params.status);
  if (params.category) search.set('category', params.category);
  if (params.country) search.set('country', params.country);
  if (params.accountManagerId) search.set('accountManagerId', params.accountManagerId);
  if (params.activeOnly) search.set('activeOnly', 'true');
  if (params.inactiveOnly) search.set('inactiveOnly', 'true');
  if (params.dateFrom) search.set('dateFrom', params.dateFrom);
  if (params.dateTo) search.set('dateTo', params.dateTo);
  if (params.sortBy) search.set('sortBy', params.sortBy);
  if (params.sortOrder) search.set('sortOrder', params.sortOrder);

  const res = await fetch(`/api/customers?${search.toString()}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to load customers');
  return res.json();
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

function formatDate(value: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale).format(new Date(value));
  } catch {
    return value;
  }
}

export default function CustomersListPage() {
  const { t, i18n } = useTranslation(NAMESPACES);
  const router = useRouter();
  const locale = i18n.language || 'en';

  const [params, setParams] = React.useState<CustomerListParams>({
    page: 1,
    pageSize: 25,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [searchInput, setSearchInput] = React.useState('');
  const [showFilters, setShowFilters] = React.useState(false);

  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['customers', params],
    queryFn: () => fetchCustomers(params),
    placeholderData: (prev) => prev,
  });

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setParams((p) => ({ ...p, page: 1, search: searchInput || undefined }));
  };

  const setFilter = <K extends keyof CustomerListParams>(
    key: K,
    value: CustomerListParams[K] | undefined
  ) => {
    setParams((p) => ({ ...p, page: 1, [key]: value }));
  };

  const clearFilters = () => {
    setParams({
      page: 1,
      pageSize: params.pageSize,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    setSearchInput('');
  };

  const hasActiveFilters =
    !!params.status ||
    !!params.category ||
    !!params.country ||
    !!params.accountManagerId ||
    !!params.activeOnly ||
    !!params.inactiveOnly ||
    !!params.dateFrom ||
    !!params.dateTo;

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const statusLabel = (s: CustomerStatus) =>
    s === 'active'
      ? t('customers:statusActive')
      : s === 'inactive'
        ? t('customers:statusInactive')
        : t('customers:statusArchived');

  const categoryLabel = (c: CustomerCategory) => {
    switch (c) {
      case 'prospect':
        return t('customers:categoryProspect');
      case 'standard':
        return t('customers:categoryStandard');
      case 'premium':
        return t('customers:categoryPremium');
      case 'strategic':
        return t('customers:categoryStrategic');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('customers:listTitle')}
        description={t('customers:listDescription')}
        breadcrumbs={[
          { label: t('nav:dashboard'), href: '/dashboard' },
          { label: t('nav:commercial') },
          { label: t('nav:customers') },
        ]}
        primaryAction={
          <Button onClick={() => router.push('/customers/new')}>
            <span className="text-lg">??</span>
            {t('customers:create')}
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4">
          <form onSubmit={onSearch} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <span className="text-lg">??</span>
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('customers:searchPlaceholder')}
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="default">
              {t('common:search')}
            </Button>
            <Button
              type="button"
              variant={showFilters ? 'default' : 'outline'}
              onClick={() => setShowFilters((v) => !v)}
            >
              <span className="text-lg">??</span>
              {t('customers:filters')}
            </Button>
            {hasActiveFilters && (
              <Button type="button" variant="ghost" onClick={clearFilters}>
                <span className="text-lg">??</span>
                {t('customers:clearFilters')}
              </Button>
            )}
          </form>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 border-t pt-4">
              <div className="space-y-1.5">
                <Label>{t('customers:filterStatus')}</Label>
                <Select
                  value={params.status ?? ''}
                  onValueChange={(v) =>
                    setFilter('status', (v || undefined) as CustomerStatus | undefined)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('common:select')} />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {statusLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('customers:filterCategory')}</Label>
                <Select
                  value={params.category ?? ''}
                  onValueChange={(v) =>
                    setFilter('category', (v || undefined) as CustomerCategory | undefined)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('common:select')} />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {categoryLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('customers:filterCountry')}</Label>
                <Input
                  value={params.country ?? ''}
                  onChange={(e) => setFilter('country', e.target.value || undefined)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('customers:filterAccountManager')}</Label>
                <Input
                  value={params.accountManagerId ?? ''}
                  onChange={(e) => setFilter('accountManagerId', e.target.value || undefined)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('customers:filterDateRange')}</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={params.dateFrom ?? ''}
                    onChange={(e) => setFilter('dateFrom', e.target.value || undefined)}
                  />
                  <Input
                    type="date"
                    value={params.dateTo ?? ''}
                    onChange={(e) => setFilter('dateTo', e.target.value || undefined)}
                  />
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                <Label>{t('common:status')}</Label>
                <div className="flex items-center gap-3 pt-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!params.activeOnly}
                      onChange={(e) => {
                        setFilter('activeOnly', e.target.checked || undefined);
                        if (e.target.checked) setFilter('inactiveOnly', undefined);
                      }}
                    />
                    {t('customers:filterActiveOnly')}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!params.inactiveOnly}
                      onChange={(e) => {
                        setFilter('inactiveOnly', e.target.checked || undefined);
                        if (e.target.checked) setFilter('activeOnly', undefined);
                      }}
                    />
                    {t('customers:filterInactiveOnly')}
                  </label>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading && !data ? (
            <div className="flex items-center justify-center p-12">
              <Spinner />
            </div>
          ) : error ? (
            <div className="p-6 text-center text-destructive">
              {t('customers:loadError')}
            </div>
          ) : data && data.data.length > 0 ? (
            <>
              <div className="px-4 py-2 border-b text-sm text-muted-foreground">
                {t('customers:totalCount', { count: data.total })}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('customers:code')}</TableHead>
                    <TableHead>{t('customers:name')}</TableHead>
                    <TableHead>{t('customers:category')}</TableHead>
                    <TableHead>{t('customers:country')}</TableHead>
                    <TableHead>{t('customers:email')}</TableHead>
                    <TableHead>{t('customers:phone')}</TableHead>
                    <TableHead>{t('customers:accountManager')}</TableHead>
                    <TableHead>{t('customers:status')}</TableHead>
                    <TableHead>{t('customers:createdAt')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((c) => (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/customers/${c.id}`)}
                    >
                      <TableCell className="font-mono text-xs">{c.code}</TableCell>
                      <TableCell className="font-medium">
                        <div>{c.legalName}</div>
                        {c.tradingName && (
                          <div className="text-xs text-muted-foreground">{c.tradingName}</div>
                        )}
                      </TableCell>
                      <TableCell>{categoryLabel(c.category)}</TableCell>
                      <TableCell>
                        {[c.city, c.country].filter(Boolean).join(', ') || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{c.email ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{c.phone ?? '—'}</TableCell>
                      <TableCell>{c.accountManagerName ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(c.status)}>
                          {statusLabel(c.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(c.createdAt, locale)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
                <span className="text-muted-foreground">
                  {t('customers:pageOf', { page: data.page, total: totalPages })}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={data.page <= 1}
                    onClick={() => setParams((p) => ({ ...p, page: p.page - 1 }))}
                  >
                    {t('common:previous')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={data.page >= totalPages}
                    onClick={() => setParams((p) => ({ ...p, page: p.page + 1 }))}
                  >
                    {t('common:next')}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              icon={<span className="text-lg">??</span>}
              title={t('customers:emptyTitle')}
              description={t('customers:emptyDescription')}
              action={
                <Button onClick={() => router.push('/customers/new')}>
                  <span className="text-lg">??</span>
                  {t('customers:create')}
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}




