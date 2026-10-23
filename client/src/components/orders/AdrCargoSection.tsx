import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Search,
  Battery,
  Flame,
  ShieldAlert,
  Loader2,
  Trash2,
  FileCheck,
  Scale,
  Gauge
} from 'lucide-react';
import api from '../../lib/api';

export interface AdrCargoItemData {
  isAdr?: boolean;
  unNumber?: string;
  properShippingName?: string;
  technicalName?: string;
  adrClass?: string;
  classificationCode?: string;
  packingGroup?: string | null;
  tunnelRestrictionCode?: string;
  transportCategory?: number;
  dangerLabels?: string;
  specialProvisions?: string;
  limitedQuantity?: boolean;
  exceptedQuantity?: boolean;
  environmentalHazard?: boolean;
  adrTransportType?: 'packages' | 'bulk' | 'tank';
  adrPackagingCode?: string;
  adrPackagingDescription?: string;
  adrPackagingCount?: number;
  adrNetMassKg?: number | string;
  adrGrossMassKg?: number | string;
  adrVolumeLiters?: number | string;
  netExplosiveMassKg?: number | string;
  receptacleCapacityLiters?: number | string;
  packageGrossMassKg?: number | string;
  weightKg?: number | string;
  volumeCbm?: number | string;
  adrWaste?: boolean;
  adrEmptyUncleaned?: boolean;
  adrBatteryDetails?: {
    cellOrBattery?: 'cell' | 'battery';
    chemistry?: 'lithium_ion' | 'lithium_metal';
    wattHours?: number;
    lithiumGrams?: number;
    packagingMode?: 'standalone' | 'contained_in_equipment' | 'packed_with_equipment';
    condition?: 'normal' | 'damaged_defective' | 'waste' | 'recycling';
    unTestPassed?: boolean;
    packageGrossMassKg?: number;
  };
  temperatureMin?: number | string;
  temperatureMax?: number | string;
  requiresTemperatureControl?: boolean;
}

interface AdrCargoSectionProps {
  item: AdrCargoItemData;
  onChange: (patch: Partial<AdrCargoItemData>) => void;
  isPortal?: boolean;
}

export const AdrCargoSection: React.FC<AdrCargoSectionProps> = ({ item, onChange, isPortal }) => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'ro';

  const [searchQuery, setSearchQuery] = useState(item.unNumber || '');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [confirmDeactivateOpen, setConfirmDeactivateOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search hitting ADR catalog API
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2 || !item.isAdr) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await api.get('/adr/catalog', {
          params: { q: searchQuery.trim(), lang: currentLang, limit: 15 },
        });
        setSearchResults(res.data?.items || []);
        setIsDropdownOpen(true);
      } catch (err) {
        console.warn('ADR catalog search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, currentLang, item.isAdr]);

  // Handle item selection from catalog
  const handleSelectCatalogItem = (catalogItem: any) => {
    const localizedName =
      (currentLang === 'ro' && catalogItem.properShippingNameRo) ||
      (currentLang === 'de' && catalogItem.properShippingNameDe) ||
      (currentLang === 'fr' && catalogItem.properShippingNameFr) ||
      (currentLang === 'nl' && catalogItem.properShippingNameNl) ||
      (currentLang === 'es' && catalogItem.properShippingNameEs) ||
      (currentLang === 'pl' && catalogItem.properShippingNamePl) ||
      catalogItem.properShippingNameEn;

    setSearchQuery(catalogItem.unNumber);
    setIsDropdownOpen(false);

    onChange({
      unNumber: catalogItem.unNumber,
      properShippingName: localizedName,
      adrClass: catalogItem.adrClass,
      classificationCode: catalogItem.classificationCode || '',
      packingGroup: catalogItem.packingGroup || null,
      tunnelRestrictionCode: catalogItem.tunnelRestrictionCode || '',
      transportCategory: catalogItem.transportCategory !== undefined ? catalogItem.transportCategory : 3,
      dangerLabels: catalogItem.dangerLabels || catalogItem.adrClass,
      specialProvisions: catalogItem.specialProvisions || '',
      adrTransportType: 'packages',
      adrBatteryDetails: catalogItem.batteryCategory
        ? {
            cellOrBattery: 'battery',
            chemistry: catalogItem.batteryCategory === 'lithium_metal' ? 'lithium_metal' : 'lithium_ion',
            packagingMode: 'standalone',
            condition: 'normal',
            unTestPassed: true,
            wattHours: 0,
            lithiumGrams: 0,
          }
        : undefined,
    });
  };

  // Toggle ADR active state with safety confirmation if turning off
  const handleToggleAdr = (checked: boolean) => {
    if (!checked && item.unNumber) {
      setConfirmDeactivateOpen(true);
    } else {
      onChange({ isAdr: checked });
    }
  };

  const confirmDeactivation = () => {
    setConfirmDeactivateOpen(false);
    onChange({
      isAdr: false,
      unNumber: '',
      properShippingName: '',
      technicalName: '',
      adrClass: '',
      classificationCode: '',
      packingGroup: null,
      tunnelRestrictionCode: '',
      transportCategory: undefined,
      dangerLabels: '',
      specialProvisions: '',
      adrBatteryDetails: undefined,
      adrWaste: false,
      adrEmptyUncleaned: false,
      netExplosiveMassKg: undefined,
      receptacleCapacityLiters: undefined,
    });
    setSearchQuery('');
  };

  // Live calculation of 1,000 points per ADR 1.1.3.6
  const rawCat = item.transportCategory !== undefined ? Number(item.transportCategory) : 3;
  // ADR 1.1.3.6.3: Empty uncleaned packagings of Cat 1, 2, or 3 are remapped to Transport Category 4!
  const effectiveCat = item.adrEmptyUncleaned && rawCat !== 0 ? 4 : rawCat;
  const isCat0 = effectiveCat === 0;

  // Cat 1 Note (a) UNs that use factor 20 instead of 50
  const normUN = (item.unNumber || '').toUpperCase().trim();
  const isCat1Factor20 = ['UN 0081', 'UN 0082', 'UN 0084', 'UN 0241', 'UN 0331', 'UN 0332', 'UN 0482', 'UN 1005', 'UN 1017'].includes(normUN);
  const multiplier = isCat0 ? 0 : (effectiveCat === 1 ? (isCat1Factor20 ? 20 : 50) : effectiveCat === 2 ? 3 : effectiveCat === 3 ? 1 : 0);

  // Quantity per ADR 1.1.3.6.3
  const isClass1 = (item.adrClass || '').startsWith('1');
  const isCompressedGas = (item.adrClass || '').startsWith('2') && ['1A', '1O', '1F', '1'].some(c => (item.classificationCode || '').includes(c));

  let calculatedQty = 0;
  let calculatedQtyUnit = 'kg';

  if (isClass1 && Number(item.netExplosiveMassKg || 0) > 0) {
    calculatedQty = Number(item.netExplosiveMassKg);
    calculatedQtyUnit = 'kg NEM';
  } else if (isCompressedGas && Number(item.receptacleCapacityLiters || 0) > 0) {
    calculatedQty = Number(item.receptacleCapacityLiters);
    calculatedQtyUnit = 'L apă recipient';
  } else if (Number(item.adrVolumeLiters || 0) > 0) {
    calculatedQty = Number(item.adrVolumeLiters);
    calculatedQtyUnit = 'Litri';
  } else {
    calculatedQty = Number(item.adrNetMassKg || 0) || Number(item.adrGrossMassKg || 0) || Number(item.weightKg || 0);
    calculatedQtyUnit = 'kg';
  }

  const calculatedPoints = isCat0 ? Infinity : Math.round(calculatedQty * multiplier * 100) / 100;

  const isTankOrBulk = item.adrTransportType === 'tank' || item.adrTransportType === 'bulk';
  const isLithium = item.unNumber && ['UN 3480', 'UN 3481', 'UN 3090', 'UN 3091'].some(u => item.unNumber?.includes(u));

  // Check SP 188 for lithium batteries
  const bDet = item.adrBatteryDetails;
  const isCell = bDet?.cellOrBattery === 'cell';
  const isBattery = bDet?.cellOrBattery === 'battery';
  const wh = Number(bDet?.wattHours || 0);
  const liG = Number(bDet?.lithiumGrams || 0);
  const unTestOk = bDet?.unTestPassed !== false;
  const conditionNormal = bDet?.condition === 'normal';

  let isSp188Exempt = false;
  let sp188NeedVerification = false;

  if (isLithium) {
    if (!bDet || !conditionNormal || !unTestOk) {
      isSp188Exempt = false;
    } else if (bDet.chemistry === 'lithium_ion') {
      if (wh <= 0) {
        sp188NeedVerification = true;
      } else if (isCell && wh <= 20) {
        isSp188Exempt = true;
      } else if (isBattery && wh <= 100) {
        isSp188Exempt = true;
      } else if (!isCell && !isBattery && wh <= 20) {
        isSp188Exempt = true;
      } else if (!isCell && !isBattery && wh <= 100) {
        sp188NeedVerification = true;
      }
    } else if (bDet.chemistry === 'lithium_metal') {
      if (liG <= 0) {
        sp188NeedVerification = true;
      } else if (isCell && liG <= 1) {
        isSp188Exempt = true;
      } else if (isBattery && liG <= 2) {
        isSp188Exempt = true;
      } else if (!isCell && !isBattery && liG <= 1) {
        isSp188Exempt = true;
      } else if (!isCell && !isBattery && liG <= 2) {
        sp188NeedVerification = true;
      }
    }
  }

  const isLqExempt = Boolean(item.limitedQuantity);
  const isEqExempt = Boolean(item.exceptedQuantity);
  const is1136Exempt = !isCat0 && !isTankOrBulk && calculatedPoints <= 1000 && calculatedQty > 0 && !isSp188Exempt && !isLqExempt && !isEqExempt;

  return (
    <div className="mt-3 border-t border-border/60 pt-3">
      {/* ADR Activation Toggle */}
      <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-3">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(item.isAdr)}
            onChange={e => handleToggleAdr(e.target.checked)}
            className="checkbox checkbox-warning"
          />
          <div>
            <div className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              {t('adr_hazardous_cargo_toggle', 'Marfă periculoasă conform normelor ADR')}
            </div>
            <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80">
              {t('adr_toggle_subtitle', 'Activare catalog oficial UNECE ADR 2025, reguli automate și scutiri legale')}
            </p>
          </div>
        </label>
        {item.isAdr && (
          <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-amber-500 text-white shadow-sm">
            ADR 2025 ACTIVE
          </span>
        )}
      </div>

      {/* Confirmation Dialog when deactivating ADR */}
      {confirmDeactivateOpen && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-3 animate-in fade-in">
          <div className="flex items-start gap-2 text-xs font-semibold text-red-800 dark:text-red-200">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p>{t('adr_confirm_deactivate_title', 'Confirmați dezactivarea clasificării ADR?')}</p>
              <p className="text-[11px] font-normal text-red-700 dark:text-red-300 mt-0.5">
                {t('adr_confirm_deactivate_desc', 'Toate datele oficiale completate (Nr. UN, Denumire, Puncte ADR, Ambalaje) vor fi eliminate din această poziție.')}
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={confirmDeactivation}
                  className="px-2.5 py-1 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-700 transition-colors"
                >
                  {t('adr_confirm_deactivate_yes', 'Da, elimină datele ADR')}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeactivateOpen(false)}
                  className="px-2.5 py-1 bg-surface border border-border rounded text-xs font-semibold hover:bg-card transition-colors"
                >
                  {t('adr_confirm_deactivate_cancel', 'Anulează')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full ADR Configuration Form */}
      {item.isAdr && (
        <div className="space-y-3 bg-surface/40 border border-border/80 rounded-xl p-3">
          {/* 1. Official UN Search and Selection */}
          <div className="relative" ref={searchContainerRef}>
            <label className="block text-xs font-bold text-text-primary mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-primary" />
                {t('adr_search_label', 'Căutare Catalog ADR (Număr UN sau Denumire oficială)')}
              </span>
              <span className="text-[10px] text-text-secondary font-normal">
                {t('adr_catalog_ref', 'Referință: UNECE ADR 2025 Tabelul A')}
              </span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setIsDropdownOpen(true);
                }}
                placeholder={t('adr_search_placeholder', 'Tastați UN (ex: UN 1203, UN 3480) sau substanța (ex: Benzină, Baterii, Vopsele)...')}
                className="input w-full pr-8 text-xs font-mono font-medium"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary">
                {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> : <Search className="w-3.5 h-3.5" />}
              </div>
            </div>

            {/* Autocomplete Dropdown */}
            {isDropdownOpen && searchResults.length > 0 && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-2xl max-h-64 overflow-y-auto custom-scrollbar divide-y divide-border/40">
                {searchResults.map((res: any) => {
                  const title =
                    (currentLang === 'ro' && res.properShippingNameRo) ||
                    (currentLang === 'de' && res.properShippingNameDe) ||
                    (currentLang === 'fr' && res.properShippingNameFr) ||
                    (currentLang === 'nl' && res.properShippingNameNl) ||
                    (currentLang === 'es' && res.properShippingNameEs) ||
                    (currentLang === 'pl' && res.properShippingNamePl) ||
                    res.properShippingNameEn;

                  return (
                    <div
                      key={res.id}
                      onClick={() => handleSelectCatalogItem(res)}
                      className="p-2.5 hover:bg-primary/10 cursor-pointer transition-colors flex items-center justify-between text-xs"
                    >
                      <div className="pr-2">
                        <div className="font-bold text-text-primary flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 font-mono text-[11px]">
                            {res.unNumber}
                          </span>
                          <span>{title}</span>
                        </div>
                        <div className="text-[11px] text-text-secondary mt-0.5 flex items-center gap-2 font-mono">
                          <span>Clasa {res.adrClass}</span>
                          {res.packingGroup && <span>GE {res.packingGroup}</span>}
                          <span>Cat. transp. {res.transportCategory}</span>
                          {res.tunnelRestrictionCode && <span>Tunel {res.tunnelRestrictionCode}</span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="px-2 py-1 rounded bg-primary/10 text-primary text-[11px] font-bold shrink-0 hover:bg-primary hover:text-white transition-colors"
                      >
                        {t('adr_select_btn', 'Selectează')}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Official Fields Auto-filled */}
          {item.unNumber && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-border/50 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                  {t('adr_col_un', 'Număr UN')}
                </label>
                <input
                  type="text"
                  value={item.unNumber}
                  readOnly
                  className="input w-full bg-black/5 dark:bg-white/5 font-mono font-bold text-amber-700 dark:text-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                  {t('adr_col_class', 'Clasă ADR')}
                </label>
                <input
                  type="text"
                  value={item.adrClass || ''}
                  readOnly
                  className="input w-full bg-black/5 dark:bg-white/5 font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                  {t('adr_col_packing_group', 'Grupă Ambalare (GE)')}
                </label>
                <select
                  value={item.packingGroup || ''}
                  onChange={e => onChange({ packingGroup: e.target.value || null })}
                  className="input w-full text-xs font-semibold"
                >
                  <option value="">Fără GE (N/A)</option>
                  <option value="I">GE I (Pericol mare)</option>
                  <option value="II">GE II (Pericol mediu)</option>
                  <option value="III">GE III (Pericol mic)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                  {t('adr_col_transport_cat', 'Categorie Transport (1.1.3.6)')}
                </label>
                <input
                  type="text"
                  value={`Categoria ${transportCat} (Factor x${multiplier})`}
                  readOnly
                  className="input w-full bg-black/5 dark:bg-white/5 font-bold text-primary"
                />
              </div>

              <div className="col-span-2 md:col-span-3">
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                  {t('adr_col_proper_name', 'Denumire oficială de transport (ADR 3.1.2)')}
                </label>
                <input
                  type="text"
                  value={item.properShippingName || ''}
                  onChange={e => onChange({ properShippingName: e.target.value })}
                  className="input w-full font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                  {t('adr_col_tunnel', 'Cod Restricție Tunel')}
                </label>
                <input
                  type="text"
                  value={item.tunnelRestrictionCode || '(-)'}
                  readOnly
                  className="input w-full bg-black/5 dark:bg-white/5 font-mono"
                />
              </div>
            </div>
          )}

          {/* 3. Transport Type & Packaging Configuration */}
          {item.unNumber && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-border/50 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                  {t('adr_transport_mode', 'Configurație transport')}
                </label>
                <select
                  value={item.adrTransportType || 'packages'}
                  onChange={e => onChange({ adrTransportType: e.target.value as any })}
                  className="input w-full text-xs font-semibold"
                >
                  <option value="packages">{t('adr_type_packages', 'Colete (Packages)')}</option>
                  <option value="tank">{t('adr_type_tank', 'Cisternă (Tank)')}</option>
                  <option value="bulk">{t('adr_type_bulk', 'Vrac (Bulk)')}</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                  {t('adr_pkg_type', 'Tip ambalaj (ADR Cap. 6)')}
                </label>
                <input
                  type="text"
                  value={item.adrPackagingDescription || ''}
                  onChange={e => onChange({ adrPackagingDescription: e.target.value })}
                  placeholder="Ex: Butoaie oțel 1A1, Cutii 4G, IBC"
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                  {t('adr_volume_liters', 'Cantitate lichid (Litri)')}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={item.adrVolumeLiters || ''}
                  onChange={e => onChange({ adrVolumeLiters: e.target.value })}
                  placeholder="Ex: 500 L"
                  className="input w-full font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                  {t('adr_net_mass', 'Masă netă / substanță (kg)')}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={item.adrNetMassKg || ''}
                  onChange={e => onChange({ adrNetMassKg: e.target.value })}
                  placeholder="Ex: 250 kg"
                  className="input w-full font-bold"
                />
              </div>
            </div>
          )}

          {/* 4. Technical Name (if SP 274 applies or N.O.S.) */}
          {item.unNumber && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2 border-t border-border/50 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                  {t('adr_tech_name', 'Denumire tehnică (obligatorie pentru N.S.A. conform DS 274)')}
                </label>
                <input
                  type="text"
                  value={item.technicalName || ''}
                  onChange={e => onChange({ technicalName: e.target.value })}
                  placeholder="Ex: conține etanol și acetonă"
                  className="input w-full"
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(item.limitedQuantity)}
                    onChange={e => onChange({ limitedQuantity: e.target.checked })}
                    className="checkbox"
                  />
                  <span className="font-semibold text-text-primary">{t('adr_lq_label', 'Cantități Limitate (LQ ADR 3.4)')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(item.adrWaste)}
                    onChange={e => onChange({ adrWaste: e.target.checked })}
                    className="checkbox"
                  />
                  <span className="font-semibold text-text-primary">{t('adr_waste_label', 'Deșeu periculos')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(item.adrEmptyUncleaned)}
                    onChange={e => onChange({ adrEmptyUncleaned: e.target.checked })}
                    className="checkbox"
                  />
                  <span className="font-semibold text-text-primary" title="ADR 1.1.3.6.3: Categoriile 1, 2, 3 reîncadrate în Categoria 4 (0 pct)">
                    {t('adr_empty_uncleaned_label', 'Ambalaje goale necurățate (ADR 1.1.3.6.3)')}
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(item.environmentalHazard)}
                    onChange={e => onChange({ environmentalHazard: e.target.checked })}
                    className="checkbox"
                  />
                  <span className="font-semibold text-text-primary">{t('adr_env_hazard', 'Poluant mediu')}</span>
                </label>
              </div>
            </div>
          )}

          {/* 4b. Normative Quantities for Class 1 (NEM) and Compressed Gases (Water capacity) */}
          {item.unNumber && (isClass1 || isCompressedGas) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2 border-t border-border/50 text-xs bg-amber-500/5 p-2 rounded-lg">
              {isClass1 && (
                <div>
                  <label className="block text-[11px] font-bold text-amber-800 dark:text-amber-300 mb-1">
                    {t('adr_nem_label', 'Masă netă exploziv NEM / NEQ (kg) — ADR 1.1.3.6.3')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.netExplosiveMassKg || ''}
                    onChange={e => onChange({ netExplosiveMassKg: e.target.value })}
                    placeholder="Obligatoriu NEM în kg pentru Clasa 1"
                    className="input w-full font-bold"
                  />
                </div>
              )}
              {isCompressedGas && (
                <div>
                  <label className="block text-[11px] font-bold text-amber-800 dark:text-amber-300 mb-1">
                    {t('adr_receptacle_cap_label', 'Capacitate recipient în litri de apă (L) — ADR 1.1.3.6.3')}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={item.receptacleCapacityLiters || ''}
                    onChange={e => onChange({ receptacleCapacityLiters: e.target.value })}
                    placeholder="Obligatoriu litri capacitate recipient pt gaze comprimate"
                    className="input w-full font-bold"
                  />
                </div>
              )}
            </div>
          )}

          {/* 5. Special Battery Questions (UN 3480, 3481, 3090, 3091) */}
          {isLithium && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 space-y-2.5 text-xs">
              <div className="font-bold text-blue-900 dark:text-blue-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Battery className="w-4 h-4 text-blue-600" />
                  {t('adr_battery_specs_title', 'Chestionar specific baterii cu litiu (Dispoziția Specială 188 / 376 / 377)')}
                </span>
                <span className="text-[10px] text-blue-600 font-normal">UNECE ADR 2025 SP 188</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                    {t('adr_battery_type', 'Tip element')}
                  </label>
                  <select
                    value={item.adrBatteryDetails?.cellOrBattery || 'battery'}
                    onChange={e =>
                      onChange({
                        adrBatteryDetails: {
                          ...item.adrBatteryDetails,
                          cellOrBattery: e.target.value as any,
                        },
                      })
                    }
                    className="input w-full text-xs font-semibold"
                  >
                    <option value="battery">Baterie (max 100 Wh / 2g Li)</option>
                    <option value="cell">Celulă (max 20 Wh / 1g Li)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                    {t('adr_battery_chemistry', 'Chimie')}
                  </label>
                  <select
                    value={item.adrBatteryDetails?.chemistry || 'lithium_ion'}
                    onChange={e =>
                      onChange({
                        adrBatteryDetails: {
                          ...item.adrBatteryDetails,
                          chemistry: e.target.value as any,
                        },
                      })
                    }
                    className="input w-full text-xs font-semibold"
                  >
                    <option value="lithium_ion">Ion de litiu (Li-ion)</option>
                    <option value="lithium_metal">Litiu metalic (Li-metal)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                    {item.adrBatteryDetails?.chemistry === 'lithium_metal'
                      ? (item.adrBatteryDetails?.cellOrBattery === 'cell' ? 'Gramaj Li celulă (max 1g)' : 'Gramaj Li baterie (max 2g)')
                      : (item.adrBatteryDetails?.cellOrBattery === 'cell' ? 'Energie celulă (max 20 Wh)' : 'Energie baterie (max 100 Wh)')}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={
                      item.adrBatteryDetails?.chemistry === 'lithium_metal'
                        ? item.adrBatteryDetails?.lithiumGrams || ''
                        : item.adrBatteryDetails?.wattHours || ''
                    }
                    onChange={e =>
                      onChange({
                        adrBatteryDetails: {
                          ...item.adrBatteryDetails,
                          wattHours:
                            item.adrBatteryDetails?.chemistry === 'lithium_metal'
                              ? undefined
                              : parseFloat(e.target.value) || 0,
                          lithiumGrams:
                            item.adrBatteryDetails?.chemistry === 'lithium_metal'
                              ? parseFloat(e.target.value) || 0
                              : undefined,
                        },
                      })
                    }
                    placeholder={item.adrBatteryDetails?.chemistry === 'lithium_metal' ? 'Ex: 1.5 g' : 'Ex: 85 Wh'}
                    className="input w-full font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                    {t('adr_battery_condition', 'Stare baterie')}
                  </label>
                  <select
                    value={item.adrBatteryDetails?.condition || 'normal'}
                    onChange={e =>
                      onChange({
                        adrBatteryDetails: {
                          ...item.adrBatteryDetails,
                          condition: e.target.value as any,
                        },
                      })
                    }
                    className="input w-full text-xs font-semibold"
                  >
                    <option value="normal">Normală (nouă / funcțională)</option>
                    <option value="damaged_defective">Deteriorată / Defectă (DS 376)</option>
                    <option value="waste">Deșeu pentru eliminare (DS 377)</option>
                    <option value="recycling">Destinată reciclării (DS 377)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                    {t('adr_battery_pkg_mode', 'Montaj / Ambalare')}
                  </label>
                  <select
                    value={item.adrBatteryDetails?.packagingMode || 'standalone'}
                    onChange={e =>
                      onChange({
                        adrBatteryDetails: {
                          ...item.adrBatteryDetails,
                          packagingMode: e.target.value as any,
                        },
                      })
                    }
                    className="input w-full text-xs font-semibold"
                  >
                    <option value="standalone">Baterii separate (max 30 kg/colet)</option>
                    <option value="contained_in_equipment">Montate în echipament</option>
                    <option value="packed_with_equipment">Ambalate cu echipamentul</option>
                  </select>
                </div>
              </div>

              {/* UN 38.3 Test Compliance Checkbox */}
              <div className="pt-1 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.adrBatteryDetails?.unTestPassed !== false}
                    onChange={e =>
                      onChange({
                        adrBatteryDetails: {
                          ...item.adrBatteryDetails,
                          unTestPassed: e.target.checked,
                        },
                      })
                    }
                    className="checkbox checkbox-primary"
                  />
                  <span className="font-semibold text-[11px] text-text-primary">
                    {t('adr_un383_test_passed', 'Conform testelor UN Manual of Tests and Criteria Partea III, sub-secțiunea 38.3 (obligatoriu SP 188 c)')}
                  </span>
                </label>
              </div>

              {/* Live SP 188 Exemption Status */}
              {isSp188Exempt ? (
                <div className="flex items-center gap-1.5 text-green-700 dark:text-green-300 font-semibold text-[11px] bg-green-500/10 p-2 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                  <span>
                    {t(
                      'adr_sp188_eligible',
                      'Eligibil pentru Scutirea Specială ADR 188 (Sub limita normativă celulă/baterie). Certificatul ADR al șoferului și plăcile portocalii NU sunt cerute.'
                    )}
                  </span>
                </div>
              ) : sp188NeedVerification ? (
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-semibold text-[11px] bg-amber-500/10 p-2 rounded-lg">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    {t(
                      'adr_sp188_need_verify',
                      'Necesită verificare ADR: specificați dacă este celulă sau baterie și introduceți valoarea exactă Wh sau g Li.'
                    )}
                  </span>
                </div>
              ) : item.adrBatteryDetails?.condition === 'damaged_defective' ? (
                <div className="flex items-center gap-1.5 text-red-700 dark:text-red-300 font-semibold text-[11px] bg-red-500/10 p-2 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span>
                    {t(
                      'adr_sp376_alert',
                      'Baterii deteriorate/defecte (DS 376) — Scutirea SP 188 este interzisă! Supuse regimului complet ADR și ambalării P908/LP904. Necesită șofer certificat ADR.'
                    )}
                  </span>
                </div>
              ) : item.adrBatteryDetails?.unTestPassed === false ? (
                <div className="flex items-center gap-1.5 text-red-700 dark:text-red-300 font-semibold text-[11px] bg-red-500/10 p-2 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span>
                    {t(
                      'adr_sp188_un383_failed',
                      'Bateriile care nu au trecut testele UN 38.3 sunt strict interzise sub regimul de scutire SP 188!'
                    )}
                  </span>
                </div>
              ) : null}
            </div>
          )}

          {/* 6. Live 1,000 Points Calculation Card */}
          {item.unNumber && (
            <div className="bg-black/5 dark:bg-white/5 border border-border rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-primary" />
                  {t('adr_points_card_title', 'Calcul automat conform ADR 1.1.3.6 (Regula celor 1.000 de puncte)')}
                </span>
                <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-primary/20 text-primary">
                  {calculatedPoints} {t('adr_points_unit', 'puncte')}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] bg-card p-2 rounded-lg border border-border/60">
                <div>
                  <span className="text-text-secondary block">{t('adr_calc_cat', 'Categorie')}</span>
                  <span className="font-bold">Categoria {transportCat}</span>
                </div>
                <div>
                  <span className="text-text-secondary block">{t('adr_calc_multiplier', 'Factor multiplicare')}</span>
                  <span className="font-bold font-mono">x {multiplier}</span>
                </div>
                <div>
                  <span className="text-text-secondary block">{t('adr_calc_qty', 'Cantitate calcul')}</span>
                  <span className="font-bold">{calculatedQty} {qtyLiters > 0 ? 'Litri' : 'kg'}</span>
                </div>
                <div>
                  <span className="text-text-secondary block">{t('adr_calc_points', 'Contribuție poziție')}</span>
                  <span className="font-black text-primary font-mono">{calculatedPoints} pct</span>
                </div>
              </div>

              {/* Status Banner */}
              <div className="mt-2.5">
                {isSp188Exempt ? (
                  <div className="p-2 rounded-lg bg-green-500/10 text-green-700 dark:text-green-300 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                    <span>{t('adr_res_sp188', 'Scutire specială verificată conform ADR SP 188 (Baterii Litiu).')}</span>
                  </div>
                ) : isLqExempt ? (
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>{t('adr_res_lq', 'Scutire Cantități Limitate conform ADR 3.4 (LQ).')}</span>
                  </div>
                ) : isCat0 ? (
                  <div className="p-2 rounded-lg bg-red-500/10 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{t('adr_res_cat0', 'Categoria de transport 0 — NU este eligibilă pentru scutire. Regim complet ADR obligatoriu.')}</span>
                  </div>
                ) : isTankOrBulk ? (
                  <div className="p-2 rounded-lg bg-red-500/10 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{t('adr_res_tank', 'Transport în cisternă sau vrac — Regula celor 1.000 de puncte NU se aplică.')}</span>
                  </div>
                ) : is1136Exempt ? (
                  <div className="p-2 rounded-lg bg-green-500/10 text-green-700 dark:text-green-300 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                    <span>
                      {t('adr_res_1136_exempt', 'Scutire parțială conform ADR 1.1.3.6 — condiții verificate ({{points}} pct <= 1.000). Certificat șofer scutit. Echipare minimă: 1 extinctor 2kg.', { points: calculatedPoints })}
                    </span>
                  </div>
                ) : calculatedPoints > 1000 ? (
                  <div className="p-2 rounded-lg bg-red-500/10 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>
                      {t('adr_res_over1000', 'Peste limita celor 1.000 de puncte ({{points}} pct). Se aplică regimul complet ADR: certificat șofer obligatoriu, plăci portocalii, echipare completă.', { points: calculatedPoints })}
                    </span>
                  </div>
                ) : (
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{t('adr_res_need_data', 'Introduceți cantitatea în litri sau kilograme pentru finalizarea calculului celor 1.000 de puncte.')}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdrCargoSection;
