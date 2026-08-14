import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import api from '../lib/api';

export default function ActivityTimeline({ entityType, entityId, createdAt, createdBy }: { entityType: string; entityId: string; createdAt?: string; createdBy?: string }) {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!entityId || !entityType) return;
    setLoading(true);
    setError(false);
    api.get(`/action-logs/${entityType}/${entityId}`)
      .then(res => setLogs(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [entityId, entityType]);

  if (loading) {
    return (
      <div className="bg-surface/40 rounded-xl p-4 border border-border">
        <div className="text-[10px] font-bold uppercase text-text-secondary mb-3">{t('timestamps', 'Timestamps')}</div>
        <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-surface/40 rounded-xl p-4 border border-border">
        <div className="text-[10px] font-bold uppercase text-text-secondary mb-3">{t('timestamps', 'Timestamps')}</div>
        <div className="text-sm text-red-500">{t('error_loading', 'Error loading timeline.')}</div>
      </div>
    );
  }

  const displayLogs = [...logs];
  const hasCreatedLog = displayLogs.some((l: any) => l.action === 'CREATED');
  
  if (!hasCreatedLog && createdAt) {
    displayLogs.push({
      id: 'synthetic-created',
      action: 'CREATED',
      createdAt: createdAt,
      user: { name: createdBy || 'System' }
    });
  }

  // Sort chronological: oldest (creation) first, newest updates at the bottom
  displayLogs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <div className="bg-surface/40 rounded-xl p-4 border border-border flex flex-col max-h-80">
      <div className="text-[10px] font-bold uppercase text-text-secondary mb-3 shrink-0">{t('timestamps', 'Timestamps')}</div>
      <div className="flex-1 overflow-y-auto min-h-0 pr-2 space-y-4 custom-scrollbar">
        {displayLogs.length === 0 ? (
          <div className="text-sm text-text-muted">{t('no_activity_recorded', 'No activity recorded yet.')}</div>
        ) : (
          displayLogs.map((log: any, idx: number) => (
            <div key={log.id || idx} className="flex gap-3">
              <div className="w-2 mt-1.5 shrink-0 flex flex-col items-center">
                <div className="w-2 h-2 rounded-full bg-primary" />
                {idx < displayLogs.length - 1 && <div className="w-px h-full bg-border mt-1" />}
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <div className="text-sm font-semibold text-text-primary">
                  {log.action === 'CREATED' ? t('action_created', 'Created') : t('action_updated', 'Updated')}
                </div>
                <div className="text-xs text-text-secondary mt-0.5">
                  {t('by', 'by')} {log.user?.name || log.user?.email || 'System'} · {new Date(log.createdAt).toLocaleString()}
                </div>
                {log.action === 'UPDATED' && log.details?.updatedFields && (
                  <div className="text-[10px] text-text-muted mt-1 uppercase tracking-wide">
                    {t('edited_fields', 'Edited')}: {log.details.updatedFields.join(', ')}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
