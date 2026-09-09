'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader, EmptyState } from '@hapcargo/ui';
import { apiClient, NAMESPACES } from '@/i18n';

export default function MasterDataPage() {
  const { t } = useTranslation(NAMESPACES);
  const [items, setItems] = React.useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    apiClient.get('/master-data/countries').then((data: unknown) => {
      setItems((data as { items?: Record<string, unknown>[] }).items || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('masterData:title')}
        description={t('masterData:description')}
        primaryAction={
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary hover:underline">
            {t('actions:create')}
          </button>
        }
      />
      <div className="rounded-lg border">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">{t('common:loading')}</div>
        ) : items.length === 0 ? (
          <EmptyState size="sm" title={t('masterData:noData')} description={t('masterData:noDataDescription')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">{t('masterData:code')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('masterData:name')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('masterData:status')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: Record<string, unknown>) => (
                  <tr key={item.id as string} className="border-b">
                    <td className="px-4 py-3">{(item.codeAlpha2 || item.code) as string}</td>
                    <td className="px-4 py-3">{item.name as string}</td>
                    <td className="px-4 py-3">{(item.isActive ? t('masterData:active') : t('masterData:inactive')) as string}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
