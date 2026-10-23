import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, AlertTriangle, CheckCircle2, Info, Flame, AlertCircle } from 'lucide-react';

export interface AdrBadgeProps {
  status?: string; // 'none' | 'needs_review' | 'confirmed_full_adr' | 'exempt_1136' | 'limited_quantity' | 'excepted_quantity' | 'special_exemption' | 'driver_cert_missing' | 'driver_cert_required' | 'incomplete_docs'
  points?: number;
  exemptionType?: string;
  unNumber?: string;
  adrClass?: string;
  className?: string;
  showDetails?: boolean;
}

export const AdrBadge: React.FC<AdrBadgeProps> = ({
  status = 'none',
  points,
  exemptionType,
  unNumber,
  adrClass,
  className = '',
  showDetails = false,
}) => {
  const { t } = useTranslation();

  if (!status || status === 'none') {
    if (!unNumber && !adrClass) return null;
  }

  // Determine badge styling and text
  let bg = 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30';
  let icon = <ShieldAlert className="w-3 h-3 text-amber-600 shrink-0" />;
  let label = t('adr_badge_review', 'ADR — Verificare necesară');

  if (status === 'exempt_1136' || exemptionType === '1.1.3.6') {
    bg = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
    icon = <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />;
    label = points !== undefined
      ? t('adr_badge_1136_points', 'ADR — Scutire 1.1.3.6 ({{points}} pct)', { points })
      : t('adr_badge_1136', 'ADR — Scutire parțială 1.1.3.6');
  } else if (status === 'limited_quantity' || exemptionType === 'lq') {
    bg = 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30';
    icon = <Info className="w-3 h-3 text-blue-600 shrink-0" />;
    label = t('adr_badge_lq', 'ADR — Cantități limitate (LQ)');
  } else if (status === 'excepted_quantity' || exemptionType === 'eq') {
    bg = 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30';
    icon = <Info className="w-3 h-3 text-cyan-600 shrink-0" />;
    label = t('adr_badge_eq', 'ADR — Cantități exceptate (EQ)');
  } else if (status === 'special_exemption' || exemptionType === 'sp188') {
    bg = 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/30';
    icon = <CheckCircle2 className="w-3 h-3 text-teal-600 shrink-0" />;
    label = t('adr_badge_sp188', 'ADR — Baterii Litiu (Scutit SP 188)');
  } else if (status === 'confirmed_full_adr' || status === 'ADR_FULL' || status === 'ADR_OVER1000' || status === 'ADR_CAT0' || status === 'ADR_TANK') {
    bg = 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30';
    icon = <Flame className="w-3 h-3 text-red-600 shrink-0" />;
    label = t('adr_badge_full', 'ADR — Cerințe confirmate (Regim complet)');
  } else if (status === 'driver_cert_missing') {
    bg = 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/40';
    icon = <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />;
    label = t('adr_badge_driver_missing', 'ADR — Certificat / specializare lipsă');
  } else if (status === 'driver_cert_required') {
    bg = 'bg-orange-500/10 text-orange-800 dark:text-orange-300 border-orange-500/40';
    icon = <ShieldAlert className="w-3 h-3 text-orange-600 shrink-0" />;
    label = t('adr_badge_driver_required', 'ADR — Certificat șofer necesar');
  } else if (status === 'incomplete_docs') {
    bg = 'bg-yellow-500/10 text-yellow-800 dark:text-yellow-300 border-yellow-500/40';
    icon = <AlertTriangle className="w-3 h-3 text-yellow-600 shrink-0" />;
    label = t('adr_badge_docs_incomplete', 'ADR — Documente incomplete');
  } else if (unNumber || adrClass) {
    // Basic fallback when only UN or Class is provided
    label = `ADR ${adrClass ? `Cls ${adrClass}` : ''} ${unNumber ? `${unNumber}` : ''}`.trim();
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-bold tracking-tight shadow-sm transition-all ${bg} ${className}`}
      title={label}
    >
      {icon}
      <span>{label}</span>
      {showDetails && unNumber && (
        <span className="font-mono text-[10px] opacity-80 border-l border-current/30 pl-1">
          {unNumber}
        </span>
      )}
    </span>
  );
};

export default AdrBadge;
