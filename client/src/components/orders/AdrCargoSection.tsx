import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  FileCheck,
  Gauge,
  Copy,
  Check,
  Package,
  X,
  Sparkles,
  SlidersHorizontal
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

// Quick selection presets for frequent dangerous goods with language-specific proper shipping names
const QUICK_PRESETS = [
  {
    key: 'flammable',
    unNumber: 'UN 1202',
    nameEn: 'DIESEL FUEL',
    nameNl: 'DIESELOLIE / GASOLIE',
    nameRo: 'COMBUSTIBIL DIESEL',
    nameDe: 'DIESELKRAFTSTOFF',
    nameFr: 'CARBURANT DIESEL (GAZOIL)',
    nameEs: 'COMBUSTIBLE PARA MOTORES DIESEL',
    namePl: 'OLEJ NAPĘDOWY',
    class: '3',
    pg: 'III',
    cat: 3,
    tunnel: '(D/E)',
    icon: Flame,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/30 hover:border-amber-500',
    labelKey: 'adr_quick_cat_flammable'
  },
  {
    key: 'batteries',
    unNumber: 'UN 3480',
    nameEn: 'LITHIUM ION BATTERIES',
    nameNl: 'LITHIUM-IONENBATTERIJEN',
    nameRo: 'BATERII CU IONI DE LITIU',
    nameDe: 'LITHIUM-IONEN-BATTERIEN',
    nameFr: 'BATTERIES AU LITHIUM IONIQUE',
    nameEs: 'BATERÍAS DE ION LITIO',
    namePl: 'BATERIE LITOWO-JONOWE',
    class: '9',
    pg: null,
    cat: 2,
    tunnel: '(E)',
    icon: Battery,
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/30 hover:border-blue-500',
    labelKey: 'adr_quick_cat_batteries'
  },
  {
    key: 'gases',
    unNumber: 'UN 1950',
    nameEn: 'AEROSOLS, flammable',
    nameNl: 'SPUITBUSSEN (AEROSOLEN), brandbaar',
    nameRo: 'AEROSOLI, inflamabili',
    nameDe: 'DRUCKGASPACKUNGEN (AEROSOLE), entzündbar',
    nameFr: 'AÉROSOLS, inflammables',
    nameEs: 'AEROSOLES, inflamables',
    namePl: 'AEROZOLE, palne',
    class: '2',
    pg: null,
    cat: 2,
    tunnel: '(D)',
    icon: Sparkles,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500',
    labelKey: 'adr_quick_cat_gases'
  },
  {
    key: 'corrosive',
    unNumber: 'UN 1789',
    nameEn: 'HYDROCHLORIC ACID',
    nameNl: 'CHLOORWATERSTOFZUUR (ZOUTZUUR)',
    nameRo: 'ACID CLORHIDRIC',
    nameDe: 'CHLORWASSERSTOFFSÄURE (SALZSÄURE)',
    nameFr: 'ACIDE CHLORHYDRIQUE',
    nameEs: 'ÁCIDO CLORHÍDRICO',
    namePl: 'KWAS CHLOROWODOROWY (SOLNY)',
    class: '8',
    pg: 'II',
    cat: 2,
    tunnel: '(E)',
    icon: ShieldAlert,
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/30 hover:border-purple-500',
    labelKey: 'adr_quick_cat_corrosive'
  },
  {
    key: 'toxic',
    unNumber: 'UN 2810',
    nameEn: 'TOXIC LIQUID, ORGANIC, N.O.S.',
    nameNl: 'GIFTIGE VLOEISTOF, ORGANISCH, N.E.G.',
    nameRo: 'LICHID TOXIC, ORGANIC, N.S.A.',
    nameDe: 'GIFTIGER ORGANISCHER FLÜSSIGER STOFF, N.A.G.',
    nameFr: 'LIQUIDE TOXIQUE ORGANIQUE, N.S.A.',
    nameEs: 'LÍQUIDO TÓXICO, ORGÁNICO, N.E.P.',
    namePl: 'MATERIAŁ TRUJĄCY CIEKŁY ORGANICZNY, I.N.O.',
    class: '6.1',
    pg: 'II',
    cat: 2,
    tunnel: '(D/E)',
    icon: AlertTriangle,
    color: 'text-rose-500 bg-rose-500/10 border-rose-500/30 hover:border-rose-500',
    labelKey: 'adr_quick_cat_toxic'
  }
];

export const AdrCargoSection: React.FC<AdrCargoSectionProps> = ({ item, onChange, isPortal: _isPortal }) => {
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language || 'en').toLowerCase().split('-')[0];

  const [searchQuery, setSearchQuery] = useState(item.unNumber || '');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [confirmDeactivateOpen, setConfirmDeactivateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'exemptions' | 'declaration' | 'special_regimes' | 'batteries'>('exemptions');
  const [copiedDeclaration, setCopiedDeclaration] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Sync search input when item.unNumber changes externally
  useEffect(() => {
    if (item.unNumber && item.unNumber !== searchQuery) {
      setSearchQuery(item.unNumber);
    }
  }, [item.unNumber]);

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
    let localizedName = catalogItem.properShippingNameEn;
    if (currentLang === 'nl') localizedName = catalogItem.properShippingNameNl || catalogItem.nameNl || catalogItem.properShippingNameEn;
    else if (currentLang === 'de') localizedName = catalogItem.properShippingNameDe || catalogItem.nameDe || catalogItem.properShippingNameEn;
    else if (currentLang === 'fr') localizedName = catalogItem.properShippingNameFr || catalogItem.nameFr || catalogItem.properShippingNameEn;
    else if (currentLang === 'es') localizedName = catalogItem.properShippingNameEs || catalogItem.nameEs || catalogItem.properShippingNameEn;
    else if (currentLang === 'pl') localizedName = catalogItem.properShippingNamePl || catalogItem.namePl || catalogItem.properShippingNameEn;
    else if (currentLang === 'ro') localizedName = catalogItem.properShippingNameRo || catalogItem.nameRo || catalogItem.properShippingNameEn;
    else localizedName = catalogItem.properShippingNameEn || catalogItem.nameEn || catalogItem.name;

    setSearchQuery(catalogItem.unNumber);
    setIsDropdownOpen(false);

    const isBattery = catalogItem.batteryCategory || ['UN 3480', 'UN 3481', 'UN 3090', 'UN 3091'].some((u: string) => catalogItem.unNumber?.includes(u));

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
      adrBatteryDetails: isBattery
        ? {
            cellOrBattery: 'battery',
            chemistry: (catalogItem.batteryCategory === 'lithium_metal' || catalogItem.unNumber?.includes('3090') || catalogItem.unNumber?.includes('3091')) ? 'lithium_metal' : 'lithium_ion',
            packagingMode: 'standalone',
            condition: 'normal',
            unTestPassed: true,
            wattHours: 0,
            lithiumGrams: 0,
          }
        : undefined,
    });

    if (isBattery) {
      setActiveTab('batteries');
    }
  };

  // Quick preset button click
  const handleQuickPreset = (preset: typeof QUICK_PRESETS[0]) => {
    setSearchQuery(preset.unNumber);
    handleSelectCatalogItem({
      unNumber: preset.unNumber,
      properShippingNameEn: preset.nameEn,
      nameEn: preset.nameEn,
      properShippingNameNl: preset.nameNl,
      nameNl: preset.nameNl,
      properShippingNameRo: preset.nameRo,
      nameRo: preset.nameRo,
      properShippingNameDe: preset.nameDe,
      properShippingNameFr: preset.nameFr,
      properShippingNameEs: preset.nameEs,
      properShippingNamePl: preset.namePl,
      adrClass: preset.class,
      packingGroup: preset.pg,
      transportCategory: preset.cat,
      tunnelRestrictionCode: preset.tunnel,
      dangerLabels: preset.class,
      batteryCategory: preset.key === 'batteries' ? 'lithium_ion' : undefined
    });
  };

  const handleToggleAdr = (checked: boolean) => {
    if (!checked && item.isAdr && item.unNumber) {
      setConfirmDeactivateOpen(true);
      return;
    }
    onChange({ isAdr: checked });
  };

  const confirmDeactivation = () => {
    setConfirmDeactivateOpen(false);
    setSearchQuery('');
    onChange({
      isAdr: false,
      unNumber: undefined,
      properShippingName: undefined,
      technicalName: undefined,
      adrClass: undefined,
      classificationCode: undefined,
      packingGroup: undefined,
      tunnelRestrictionCode: undefined,
      transportCategory: undefined,
      dangerLabels: undefined,
      specialProvisions: undefined,
      limitedQuantity: false,
      exceptedQuantity: false,
      environmentalHazard: false,
      adrTransportType: 'packages',
      adrPackagingCode: undefined,
      adrPackagingDescription: undefined,
      adrPackagingCount: undefined,
      adrNetMassKg: undefined,
      adrGrossMassKg: undefined,
      adrVolumeLiters: undefined,
      netExplosiveMassKg: undefined,
      receptacleCapacityLiters: undefined,
      adrWaste: false,
      adrEmptyUncleaned: false,
      adrBatteryDetails: undefined,
    });
  };

  // ADR 1.1.3.6 Calculation Engine Logic
  const transportCat = item.transportCategory !== undefined ? Number(item.transportCategory) : 3;
  const isCat0 = transportCat === 0;

  // Multiplier mapping
  let multiplier = 1;
  if (isCat0) multiplier = Infinity;
  else if (transportCat === 1) multiplier = 50;
  else if (transportCat === 2) multiplier = 3;
  else if (transportCat === 3) multiplier = 1;
  else if (transportCat === 4) multiplier = 0;

  // Empty uncleaned packaging remapping (ADR 1.1.3.6.3)
  if (item.adrEmptyUncleaned) {
    if ([1, 2, 3].includes(transportCat)) {
      multiplier = 0;
    }
  }

  const isClass1 = (item.adrClass || '').startsWith('1');
  const isCompressedGas = (item.adrClass || '').startsWith('2') && ['1A', '1O', '1F', '1'].some(c => (item.classificationCode || '').includes(c));

  let calculatedQty = 0;
  let calculatedQtyUnit = 'kg';

  if (isClass1 && Number(item.netExplosiveMassKg || 0) > 0) {
    calculatedQty = Number(item.netExplosiveMassKg);
    calculatedQtyUnit = 'kg NEM';
  } else if (isCompressedGas && Number(item.receptacleCapacityLiters || 0) > 0) {
    calculatedQty = Number(item.receptacleCapacityLiters);
    calculatedQtyUnit = 'L';
  } else if (Number(item.adrVolumeLiters || 0) > 0) {
    calculatedQty = Number(item.adrVolumeLiters);
    calculatedQtyUnit = currentLang === 'ro' ? 'Litri' : currentLang === 'nl' ? 'Liters' : 'L';
  } else {
    calculatedQty = Number(item.adrNetMassKg || 0) || Number(item.adrGrossMassKg || 0) || Number(item.weightKg || 0);
    calculatedQtyUnit = 'kg';
  }

  const calculatedPoints = isCat0 ? Infinity : Math.round(calculatedQty * multiplier * 100) / 100;
  const pointsRemaining = isCat0 ? 0 : Math.max(0, 1000 - calculatedPoints);
  const gaugePercent = isCat0 ? 100 : Math.min(100, Math.round((calculatedPoints / 1000) * 100));

  const isTankOrBulk = item.adrTransportType === 'tank' || item.adrTransportType === 'bulk';
  const isLithium = Boolean(item.unNumber && ['UN 3480', 'UN 3481', 'UN 3090', 'UN 3091'].some(u => item.unNumber?.includes(u)));

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

  // Generate official ADR 5.4 transport document line
  const declarationLine = useMemo(() => {
    if (!item.unNumber) return '';
    const parts: string[] = [];
    if (item.adrWaste) parts.push(currentLang === 'nl' ? 'AFVAL' : currentLang === 'ro' ? 'DEȘEU' : 'WASTE');
    parts.push(item.unNumber);
    parts.push((item.properShippingName || '').toUpperCase());
    if (item.technicalName) parts.push(`(${item.technicalName})`);
    if (item.adrClass) parts.push(item.adrClass);
    if (item.packingGroup) parts.push(item.packingGroup);
    if (item.tunnelRestrictionCode) parts.push(`(${item.tunnelRestrictionCode})`);
    if (item.environmentalHazard) parts.push(currentLang === 'nl' ? 'MILIEUGEVAARLIJK' : currentLang === 'ro' ? 'POLUANT PENTRU MEDIU' : 'ENVIRONMENTALLY HAZARDOUS');
    if (item.limitedQuantity) parts.push(currentLang === 'nl' ? 'BEPERKTE HOEVEELHEID (LQ)' : 'LIMITED QUANTITY (LQ)');
    if (item.exceptedQuantity) parts.push(currentLang === 'nl' ? 'UITGEZONDERDE HOEVEELHEID (EQ)' : 'EXCEPTED QUANTITY (EQ)');
    if (item.adrEmptyUncleaned) parts.push(currentLang === 'nl' ? 'LEGE ONGEREINIGDE VERPAKKING' : 'EMPTY UNCLEANED PACKAGING');
    if (is1136Exempt) parts.push(`ADR 1.1.3.6 (${calculatedPoints} pts)`);
    return parts.filter(Boolean).join(', ');
  }, [item, is1136Exempt, calculatedPoints, currentLang]);

  const handleCopyDeclaration = () => {
    if (!declarationLine) return;
    navigator.clipboard.writeText(declarationLine);
    setCopiedDeclaration(true);
    setTimeout(() => setCopiedDeclaration(false), 2500);
  };

  return (
    <div className="space-y-3">
      {/* 1. Header Activation Toggle Card */}
      <div className={`p-4 rounded-2xl border transition-all duration-300 ${
        item.isAdr
          ? 'bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-orange-500/10 border-amber-500/40 shadow-sm ring-1 ring-amber-500/20'
          : 'bg-surface/50 border-border/70 hover:border-amber-500/30'
      }`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <label className="flex items-center gap-3.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={Boolean(item.isAdr)}
              onChange={e => handleToggleAdr(e.target.checked)}
              className="checkbox checkbox-warning scale-110"
            />
            <div>
              <div className="text-sm font-bold text-amber-950 dark:text-amber-200 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span>{t('adr_hazardous_cargo_toggle', 'Dangerous goods according to ADR regulations')}</span>
              </div>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                {t('adr_toggle_subtitle', 'Activate official UNECE ADR 2025 catalog, automatic rules, and legal exemptions')}
              </p>
            </div>
          </label>

          {item.isAdr && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full bg-amber-500 text-white shadow-sm flex items-center gap-1.5 animate-in fade-in">
                <Sparkles className="w-3.5 h-3.5" />
                {t('adr_badge_active', 'ADR 2025 ACTIVE')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog when deactivating ADR */}
      {confirmDeactivateOpen && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 my-3 animate-in fade-in">
          <div className="flex items-start gap-3 text-xs font-semibold text-red-900 dark:text-red-200">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold">{t('adr_confirm_deactivate_title', 'Confirm deactivation of ADR classification?')}</p>
              <p className="text-xs font-normal text-red-700 dark:text-red-300 mt-1">
                {t('adr_confirm_deactivate_desc', 'All entered ADR data (UN number, proper shipping name, 1,000-point calculation, packaging) will be removed.')}
              </p>
              <div className="flex gap-2.5 mt-3">
                <button
                  type="button"
                  onClick={confirmDeactivation}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors shadow-sm"
                >
                  {t('adr_confirm_deactivate_yes', 'Yes, remove ADR data')}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeactivateOpen(false)}
                  className="px-3 py-1.5 bg-surface border border-border rounded-lg text-xs font-semibold hover:bg-card transition-colors"
                >
                  {t('adr_confirm_deactivate_cancel', 'Cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main ADR Enterprise Workspace */}
      {item.isAdr && (
        <div className="mt-3.5 space-y-4 bg-surface/60 border border-border/80 rounded-2xl p-4 shadow-sm backdrop-blur-sm animate-in fade-in">
          
          {/* Quick Presets Bar (Pills) for instant selection */}
          <div>
            <div className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>{t('adr_quick_categories', 'Quick categories & common substances')}</span>
              <span className="text-[10px] text-text-secondary font-normal font-mono">UNECE ADR 2025 Table A</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {QUICK_PRESETS.map((p) => {
                const Icon = p.icon;
                const isSelected = item.unNumber === p.unNumber;
                const displayName = currentLang === 'nl' ? p.nameNl : currentLang === 'ro' ? p.nameRo : p.nameEn;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => handleQuickPreset(p)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all duration-200 text-left ${
                      isSelected
                        ? 'ring-2 ring-primary border-primary bg-primary/10 shadow-sm'
                        : `${p.color}`
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <div className="overflow-hidden leading-tight">
                      <div className="font-bold truncate text-[11px]">{t(p.labelKey, displayName)}</div>
                      <div className="text-[10px] opacity-75 font-mono">{p.unNumber} · Cls {p.class}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Official Catalog Search & Autocomplete */}
          <div className="relative pt-1" ref={searchContainerRef}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-text-primary flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" />
                {t('adr_search_label', 'ADR Catalog Search (UN Number or Proper Shipping Name)')}
              </label>
              <span className="text-[11px] text-text-secondary font-normal">
                {t('adr_catalog_ref', 'Reference: UNECE ADR 2025 Table A')}
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setIsDropdownOpen(true);
                }}
                placeholder={t('adr_search_placeholder', 'e.g. UN 1202, UN 3480, Diesel fuel, Lithium...')}
                className="input w-full pl-3.5 pr-20 py-2.5 text-xs font-mono font-medium rounded-xl border-border bg-card shadow-inner focus:ring-2 focus:ring-primary/30"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-text-secondary">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="p-1 hover:text-text-primary rounded"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Search className="w-4 h-4" />}
              </div>
            </div>

            {/* Live Autocomplete Dropdown */}
            {isDropdownOpen && searchResults.length > 0 && (
              <div className="absolute z-50 left-0 right-0 mt-1.5 bg-card border border-border/80 rounded-2xl shadow-2xl max-h-72 overflow-y-auto custom-scrollbar divide-y divide-border/40 backdrop-blur-md">
                {searchResults.map((res: any) => {
                  let title = res.properShippingNameEn;
                  if (currentLang === 'nl') title = res.properShippingNameNl || res.properShippingNameEn;
                  else if (currentLang === 'de') title = res.properShippingNameDe || res.properShippingNameEn;
                  else if (currentLang === 'fr') title = res.properShippingNameFr || res.properShippingNameEn;
                  else if (currentLang === 'es') title = res.properShippingNameEs || res.properShippingNameEn;
                  else if (currentLang === 'pl') title = res.properShippingNamePl || res.properShippingNameEn;
                  else if (currentLang === 'ro') title = res.properShippingNameRo || res.properShippingNameEn;

                  return (
                    <div
                      key={res.id || res.unNumber}
                      onClick={() => handleSelectCatalogItem(res)}
                      className="p-3 hover:bg-primary/10 cursor-pointer transition-colors flex items-center justify-between text-xs group"
                    >
                      <div className="pr-3">
                        <div className="font-bold text-text-primary flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-300 font-mono text-[11px] font-black border border-amber-500/30">
                            {res.unNumber}
                          </span>
                          <span className="group-hover:text-primary transition-colors">{title}</span>
                        </div>
                        <div className="text-[11px] text-text-secondary mt-1 flex flex-wrap items-center gap-3 font-mono">
                          <span className="px-1.5 py-0.2 bg-black/5 dark:bg-white/5 rounded">Class {res.adrClass}</span>
                          {res.packingGroup && <span className="px-1.5 py-0.2 bg-black/5 dark:bg-white/5 rounded">PG {res.packingGroup}</span>}
                          <span className="px-1.5 py-0.2 bg-black/5 dark:bg-white/5 rounded">Cat {res.transportCategory}</span>
                          {res.tunnelRestrictionCode && <span className="px-1.5 py-0.2 bg-black/5 dark:bg-white/5 rounded">Tunnel {res.tunnelRestrictionCode}</span>}
                          {res.limitedQuantity && <span className="text-blue-600 dark:text-blue-400 font-semibold">LQ: {res.limitedQuantity}</span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold shrink-0 group-hover:bg-primary group-hover:text-white transition-all shadow-sm"
                      >
                        {t('adr_select_btn', 'Select')}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Classified Item Bar & Hazard Placard */}
          {item.unNumber && (
            <div className="bg-card border border-border/80 rounded-2xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3 pb-3 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-mono font-black text-amber-600 text-sm shadow-inner">
                    {item.adrClass || 'ADR'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-text-primary bg-amber-500/10 px-2 py-0.5 rounded text-amber-800 dark:text-amber-300">
                        {item.unNumber}
                      </span>
                      <span className="font-bold text-sm text-text-primary">
                        {item.properShippingName}
                      </span>
                    </div>
                    <div className="text-[11px] text-text-secondary mt-0.5 flex items-center gap-2">
                      <span>{t('adr_col_class', 'ADR Class')}: <strong>{item.adrClass}</strong></span>
                      <span>·</span>
                      <span>{t('adr_col_packing_group', 'PG')}: <strong>{item.packingGroup || '—'}</strong></span>
                      <span>·</span>
                      <span>{t('adr_col_transport_cat', 'Cat')}: <strong>{transportCat} (x{multiplier})</strong></span>
                      <span>·</span>
                      <span>{t('adr_col_tunnel', 'Tunnel')}: <strong>{item.tunnelRestrictionCode || '(-)'}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      onChange({ unNumber: undefined, properShippingName: undefined });
                    }}
                    className="text-xs text-text-secondary hover:text-red-500 px-2.5 py-1 rounded-lg border border-border/60 hover:border-red-500/40 transition-colors"
                  >
                    {t('adr_clear_selection', 'Change substance / New search')}
                  </button>
                </div>
              </div>

              {/* ================= PRIMARY ADR INPUTS (PACKAGING & QUANTITIES PER UN CODE) ================= */}
              <div className="bg-amber-500/5 dark:bg-amber-500/10 border-2 border-amber-500/30 rounded-xl p-4 mb-4 shadow-sm">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-amber-500/20">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <h4 className="font-bold text-xs text-amber-950 dark:text-amber-200 uppercase tracking-wide">
                      {t('adr_substance_qty_title', 'Cantități & Ambalaje Substanță Periculoasă')} ({item.unNumber})
                    </h4>
                  </div>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300">
                    Cat. {transportCat} · Factor x{multiplier === Infinity ? '∞' : multiplier}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {/* 1. Number of Packages/Boxes */}
                  <div>
                    <label className="block text-[11px] font-bold text-text-primary mb-1">
                      {t('adr_pkg_count', 'Număr de colete / cutii')} <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={item.adrPackagingCount || ''}
                      onChange={e => onChange({ adrPackagingCount: e.target.value ? parseInt(e.target.value) : undefined })}
                      placeholder={t('adr_pkg_count_placeholder', 'ex: 20 colete / bidoane')}
                      className="input w-full font-bold text-xs bg-card"
                    />
                    <span className="text-[10px] text-text-secondary mt-0.5 block">
                      {t('adr_pkg_count_hint', 'Număr cutii/bidoane/colete din acest cod UN')}
                    </span>
                  </div>

                  {/* 2. Packaging Type/Description */}
                  <div>
                    <label className="block text-[11px] font-bold text-text-primary mb-1">
                      {t('adr_pkg_type', 'Tip ambalaj (ADR Cap. 6)')}
                    </label>
                    <input
                      type="text"
                      value={item.adrPackagingDescription || ''}
                      onChange={e => onChange({ adrPackagingDescription: e.target.value })}
                      placeholder={t('adr_pkg_type_placeholder', 'ex: Cutii 4G, Butoaie 1A1, IBC')}
                      className="input w-full text-xs bg-card"
                    />
                    <span className="text-[10px] text-text-secondary mt-0.5 block">
                      {t('adr_pkg_type_hint', 'ex: Cutii 4G, Butoaie 1A1, Canistre 3H1, IBC')}
                    </span>
                  </div>

                  {/* 3. Dangerous Goods Volume (Liters) */}
                  <div>
                    <label className="block text-[11px] font-bold text-text-primary mb-1 flex items-center justify-between">
                      <span>{t('adr_volume_liters', 'Volum în litri (L)')}</span>
                      <span className="text-[10px] text-text-secondary font-normal">(lichide)</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={item.adrVolumeLiters || ''}
                      onChange={e => onChange({ adrVolumeLiters: e.target.value })}
                      placeholder={t('adr_volume_placeholder', 'ex: 500 L')}
                      className="input w-full font-bold text-xs bg-card border-amber-500/40"
                    />
                    <span className="text-[10px] text-text-secondary mt-0.5 block">
                      {t('adr_volume_liters_hint', 'Volum lichid substanță periculoasă')}
                    </span>
                  </div>

                  {/* 4. Dangerous Goods Net Mass (kg) */}
                  <div>
                    <label className="block text-[11px] font-bold text-text-primary mb-1 flex items-center justify-between">
                      <span>{t('adr_net_mass', 'Masă netă substanță (kg)')}</span>
                      <span className="text-[10px] text-text-secondary font-normal">(solide/subst.)</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={item.adrNetMassKg || ''}
                      onChange={e => onChange({ adrNetMassKg: e.target.value })}
                      placeholder={t('adr_mass_placeholder', 'ex: 250 kg')}
                      className="input w-full font-bold text-xs bg-card border-amber-500/40"
                    />
                    <span className="text-[10px] text-text-secondary mt-0.5 block">
                      {t('adr_net_mass_hint', 'Kg net substanță periculoasă (fără ambalaj)')}
                    </span>
                  </div>
                </div>

                {/* Transport configuration row & Live Item Points */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 pt-3 border-t border-amber-500/20 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                      {t('adr_transport_mode', 'Configurație transport')}
                    </label>
                    <select
                      value={item.adrTransportType || 'packages'}
                      onChange={e => onChange({ adrTransportType: e.target.value as any })}
                      className="input w-full text-xs font-semibold bg-card"
                    >
                      <option value="packages">📦 {t('adr_type_packages', 'Colete / Ambalaje (Packages)')}</option>
                      <option value="tank">🛢️ {t('adr_type_tank', 'Cisternă (Tank)')}</option>
                      <option value="bulk">⛰️ {t('adr_type_bulk', 'Vrac (Bulk)')}</option>
                    </select>
                  </div>

                  {/* Class 1 NEM or Compressed Gas Water Capacity if applicable */}
                  {isClass1 && (
                    <div>
                      <label className="block text-[11px] font-bold text-red-600 dark:text-red-400 mb-1">
                        {t('adr_nem_label', 'Masă Netă Exploziv (NEM/NEQ kg)')}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.netExplosiveMassKg || ''}
                        onChange={e => onChange({ netExplosiveMassKg: e.target.value })}
                        placeholder={t('adr_nem_placeholder', 'NEM in kg (Class 1)')}
                        className="input w-full font-bold text-xs bg-card"
                      />
                    </div>
                  )}

                  {isCompressedGas && (
                    <div>
                      <label className="block text-[11px] font-bold text-blue-600 dark:text-blue-400 mb-1">
                        {t('adr_receptacle_cap_label', 'Capacitate recipient apă (L)')}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={item.receptacleCapacityLiters || ''}
                        onChange={e => onChange({ receptacleCapacityLiters: e.target.value })}
                        placeholder={t('adr_gas_capacity_placeholder', 'Capacity in L (Gases)')}
                        className="input w-full font-bold text-xs bg-card"
                      />
                    </div>
                  )}

                  {/* Live Points Feedback for this UN substance */}
                  <div className={`${(isClass1 || isCompressedGas) ? 'md:col-span-1' : 'md:col-span-2'} flex items-center justify-between p-2.5 rounded-lg bg-card border border-border`}>
                    <div className="flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-primary" />
                      <div>
                        <div className="font-bold text-xs">
                          {t('adr_calc_points_item', 'Puncte ADR 1.1.3.6')} :{' '}
                          <span className={calculatedPoints <= 1000 ? 'text-green-600 dark:text-green-400 font-black' : 'text-red-600 dark:text-red-400 font-black'}>
                            {isCat0 ? `∞ (${t('adr_cat0_label', 'Categoria 0')})` : `${calculatedPoints} ${t('adr_points_unit', 'puncte')}`}
                          </span>
                        </div>
                        <div className="text-[10px] text-text-secondary font-mono">
                          {calculatedQty} {calculatedQtyUnit} × {multiplier === Infinity ? '∞' : multiplier} factor = {calculatedPoints} {t('adr_points_unit_short', 'pct')}
                        </div>
                      </div>
                    </div>
                    <div>
                      {calculatedPoints <= 1000 && !isCat0 ? (
                        <span className="text-[10px] px-2 py-1 rounded bg-green-500/20 text-green-700 dark:text-green-300 font-bold">
                          ✓ {t('adr_substance_under_1000', 'Sub 1.000 pct (Scutit)')}
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-1 rounded bg-red-500/20 text-red-700 dark:text-red-300 font-bold">
                          ⚠️ {t('adr_substance_over_1000', 'ADR Complet Obligatoriu')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sub-Tabs Navigation for Advanced ADR Details */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-3 scrollbar-none border-b border-border/40">
                <button
                  type="button"
                  onClick={() => setActiveTab('exemptions')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'exemptions'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-text-secondary hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <Gauge className="w-3.5 h-3.5" />
                  {t('adr_tab_exemptions', '1. Scutiri & Regula 1.000 Puncte')}
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${calculatedPoints <= 1000 ? 'bg-green-500/20 text-green-700 dark:text-green-300' : 'bg-red-500/20 text-red-700 dark:text-red-300'}`}>
                    {calculatedPoints} pts
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('declaration')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'declaration'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-text-secondary hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  {t('adr_tab_declaration', '2. Declarație Oficială ADR 5.4')}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('special_regimes')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'special_regimes'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-text-secondary hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  {t('adr_tab_tech_special', '3. Regimuri Speciale & Clasificare Avansată')}
                </button>

                {isLithium && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('batteries')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      activeTab === 'batteries'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20'
                    }`}
                  >
                    <Battery className="w-3.5 h-3.5" />
                    {t('adr_tab_batteries', '4. Baterii cu Litiu (SP 188)')}
                    {isSp188Exempt && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                  </button>
                )}
              </div>

              {/* TAB: SPECIAL REGIMES & ADVANCED CLASSIFICATION */}
              {activeTab === 'special_regimes' && (
                <div className="space-y-3.5 animate-in fade-in">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                        {t('adr_col_un', 'UN Number')}
                      </label>
                      <input
                        type="text"
                        value={item.unNumber || ''}
                        readOnly
                        className="input w-full bg-black/5 dark:bg-white/5 font-mono font-bold text-amber-700 dark:text-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                        {t('adr_col_class', 'ADR Class')}
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
                        {t('adr_col_packing_group', 'Packing Group (PG)')}
                      </label>
                      <select
                        value={item.packingGroup || ''}
                        onChange={e => onChange({ packingGroup: e.target.value || null })}
                        className="input w-full text-xs font-semibold"
                      >
                        <option value="">{t('adr_pg_none', 'No PG (N/A)')}</option>
                        <option value="I">{t('adr_pg_i', 'PG I (High danger)')}</option>
                        <option value="II">{t('adr_pg_ii', 'PG II (Medium danger)')}</option>
                        <option value="III">{t('adr_pg_iii', 'PG III (Low danger)')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                        {t('adr_col_tunnel', 'Tunnel Restriction Code')}
                      </label>
                      <input
                        type="text"
                        value={item.tunnelRestrictionCode || '(-)'}
                        readOnly
                        className="input w-full bg-black/5 dark:bg-white/5 font-mono"
                      />
                    </div>

                    <div className="col-span-2 md:col-span-4">
                      <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                        {t('adr_col_proper_name', 'Proper Shipping Name (ADR 3.1.2)')}
                      </label>
                      <input
                        type="text"
                        value={item.properShippingName || ''}
                        onChange={e => onChange({ properShippingName: e.target.value })}
                        className="input w-full font-medium"
                      />
                    </div>

                    <div className="col-span-2 md:col-span-4">
                      <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                        {t('adr_tech_name', 'Technical Name (required for N.O.S. entries under SP 274)')}
                      </label>
                      <input
                        type="text"
                        value={item.technicalName || ''}
                        onChange={e => onChange({ technicalName: e.target.value })}
                        placeholder={t('adr_tech_name_placeholder', 'e.g. contains ethanol and acetone')}
                        className="input w-full text-xs"
                      />
                    </div>
                  </div>

                  {/* Special Regime Checkboxes */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-border/50 text-xs">
                    <label className="flex items-center gap-2 p-2 rounded-lg border border-border/60 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(item.limitedQuantity)}
                        onChange={e => onChange({ limitedQuantity: e.target.checked })}
                        className="checkbox checkbox-sm"
                      />
                      <span className="font-semibold text-text-primary text-[11px]">
                        {t('adr_lq_label', 'Limited Quantities (LQ ADR 3.4)')}
                      </span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg border border-border/60 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(item.exceptedQuantity)}
                        onChange={e => onChange({ exceptedQuantity: e.target.checked })}
                        className="checkbox checkbox-sm"
                      />
                      <span className="font-semibold text-text-primary text-[11px]">
                        {t('adr_eq_label', 'Excepted Quantities (EQ ADR 3.5)')}
                      </span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg border border-border/60 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(item.adrWaste)}
                        onChange={e => onChange({ adrWaste: e.target.checked })}
                        className="checkbox checkbox-sm"
                      />
                      <span className="font-semibold text-text-primary text-[11px]">
                        {t('adr_waste_label', 'Hazardous Waste (WASTE)')}
                      </span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg border border-border/60 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer" title="ADR 1.1.3.6.3: Categories 1, 2, 3 remapped to Category 4 (0 pts)">
                      <input
                        type="checkbox"
                        checked={Boolean(item.adrEmptyUncleaned)}
                        onChange={e => onChange({ adrEmptyUncleaned: e.target.checked })}
                        className="checkbox checkbox-sm"
                      />
                      <span className="font-semibold text-text-primary text-[11px]">
                        {t('adr_empty_uncleaned_label', 'Empty Uncleaned Packaging (0 pts)')}
                      </span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg border border-border/60 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer col-span-2">
                      <input
                        type="checkbox"
                        checked={Boolean(item.environmentalHazard)}
                        onChange={e => onChange({ environmentalHazard: e.target.checked })}
                        className="checkbox checkbox-sm"
                      />
                      <span className="font-semibold text-text-primary text-[11px]">
                        {t('adr_env_hazard', 'Environmentally Hazardous (Marine Pollutant)')}
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 3: EXEMPTIONS & 1,000 POINTS GAUGE */}
              {activeTab === 'exemptions' && (
                <div className="space-y-3.5 animate-in fade-in">
                  {/* Real-time Interactive 1,000 Points Gauge */}
                  <div className="p-4 rounded-xl border bg-black/5 dark:bg-white/5 border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-text-primary flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-primary" />
                        {t('adr_points_card_title', 'ADR 1.1.3.6 Point Calculation (1,000-Point Rule)')}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-xs font-black px-2.5 py-1 rounded-lg ${
                          isCat0
                            ? 'bg-red-500 text-white'
                            : calculatedPoints <= 800
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                            : calculatedPoints <= 1000
                            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                            : 'bg-red-500/20 text-red-700 dark:text-red-300'
                        }`}>
                          {isCat0 ? 'CAT 0 (∞)' : `${calculatedPoints} / 1,000 ${t('adr_points_unit', 'points')}`}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar Gauge */}
                    <div className="w-full bg-black/10 dark:bg-white/10 h-3 rounded-full overflow-hidden my-2.5">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          isCat0 || calculatedPoints > 1000
                            ? 'bg-red-500'
                            : calculatedPoints > 800
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${gaugePercent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-text-secondary font-mono">
                      <span>0 pts</span>
                      <span>
                        {isCat0
                          ? t('adr_cat0_regime_required', 'Transport Category 0 — Full ADR regime mandatory regardless of quantity')
                          : `${pointsRemaining} ${t('adr_points_remaining', 'points remaining before full ADR regime')}`}
                      </span>
                      <span>1,000 pts</span>
                    </div>

                    {/* Mathematical Formula Breakdown */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] bg-card p-3 rounded-xl border border-border/60 mt-3">
                      <div>
                        <span className="text-text-secondary block">{t('adr_calc_cat', 'Category')}</span>
                        <span className="font-bold">{t('adr_calc_cat', 'Category')} {transportCat}</span>
                      </div>
                      <div>
                        <span className="text-text-secondary block">{t('adr_calc_multiplier', 'Factor')}</span>
                        <span className="font-bold font-mono">x {multiplier}</span>
                      </div>
                      <div>
                        <span className="text-text-secondary block">{t('adr_calc_qty', 'Calculated quantity')}</span>
                        <span className="font-bold">{calculatedQty} {calculatedQtyUnit}</span>
                      </div>
                      <div>
                        <span className="text-text-secondary block">{t('adr_calc_points', 'Item points contribution')}</span>
                        <span className="font-black text-primary font-mono">{calculatedPoints} pts</span>
                      </div>
                    </div>

                    {/* Legal Exemption Status Banner */}
                    <div className="mt-3">
                      {isSp188Exempt ? (
                        <div className="p-3 rounded-xl bg-green-500/10 text-green-700 dark:text-green-300 text-xs font-semibold flex items-center gap-2.5 border border-green-500/20">
                          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                          <span>{t('adr_res_sp188', 'Exempt under Special Provision 188 (Low power lithium battery). No orange plates or driver ADR certificate required.')}</span>
                        </div>
                      ) : isLqExempt ? (
                        <div className="p-3 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center gap-2.5 border border-blue-500/20">
                          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>{t('adr_res_lq', 'Exempt under ADR Chapter 3.4 (Limited Quantities LQ). Standard ADR driver certificate not required.')}</span>
                        </div>
                      ) : isEqExempt ? (
                        <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center gap-2.5 border border-indigo-500/20">
                          <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span>{t('adr_res_eq', 'Exempt under ADR Chapter 3.5 (Excepted Quantities EQ).')}</span>
                        </div>
                      ) : isCat0 ? (
                        <div className="p-3 rounded-xl bg-red-500/10 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2.5 border border-red-500/20">
                          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                          <span>{t('adr_res_cat0', 'Transport Category 0: Full ADR regime mandatory regardless of quantity (no 1.1.3.6 exemption permitted).')}</span>
                        </div>
                      ) : isTankOrBulk ? (
                        <div className="p-3 rounded-xl bg-red-500/10 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2.5 border border-red-500/20">
                          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                          <span>{t('adr_res_tank', 'Bulk / Tank Transport: Full ADR regime mandatory. Orange plates and specialized ADR driver certification required.')}</span>
                        </div>
                      ) : is1136Exempt ? (
                        <div className="p-3 rounded-xl bg-green-500/10 text-green-700 dark:text-green-300 text-xs font-semibold flex items-center gap-2.5 border border-green-500/20">
                          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                          <span>
                            {t('adr_res_1136_exempt', 'Partial exemption under ADR 1.1.3.6 verified ({{points}} pts <= 1,000). Driver ADR certificate and orange plates exempt. Minimum equipment: one 2kg extinguisher.', { points: calculatedPoints })}
                          </span>
                        </div>
                      ) : calculatedPoints > 1000 ? (
                        <div className="p-3 rounded-xl bg-red-500/10 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2.5 border border-red-500/20">
                          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                          <span>
                            {t('adr_res_over1000', 'Exceeds 1,000-point threshold ({{points}} pts). Full ADR regime mandatory: Driver certificate, orange plates, and full safety equipment required.', { points: calculatedPoints })}
                          </span>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center gap-2.5 border border-amber-500/20">
                          <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>{t('adr_res_need_data', 'Enter volume or mass to calculate ADR 1.1.3.6 points.')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: LITHIUM BATTERY ASSESSMENT (SP 188 / 376 / 377) */}
              {isLithium && activeTab === 'batteries' && (
                <div className="space-y-3 animate-in fade-in bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 text-xs">
                  <div className="font-bold text-blue-900 dark:text-blue-200 flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2 text-sm">
                      <Battery className="w-4 h-4 text-blue-600" />
                      {t('adr_battery_specs_title', 'Lithium Battery Assessment (Special Provisions 188 / 376 / 377)')}
                    </span>
                    <span className="text-[10px] text-blue-700 dark:text-blue-300 font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20">
                      UNECE ADR 2025 SP 188
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                        {t('adr_battery_type', 'Element Type')}
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
                        <option value="battery">{t('adr_battery_pack', 'Battery (max 100 Wh / 2g Li)')}</option>
                        <option value="cell">{t('adr_battery_cell', 'Cell (max 20 Wh / 1g Li)')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                        {t('adr_battery_chemistry', 'Battery Chemistry')}
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
                        <option value="lithium_ion">{t('adr_ion', 'Lithium-Ion (Li-Ion)')}</option>
                        <option value="lithium_metal">{t('adr_metal', 'Lithium-Metal (Li-Metal)')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                        {item.adrBatteryDetails?.chemistry === 'lithium_metal'
                          ? (item.adrBatteryDetails?.cellOrBattery === 'cell' ? 'Cell Li mass (max 1g)' : 'Battery Li mass (max 2g)')
                          : (item.adrBatteryDetails?.cellOrBattery === 'cell' ? 'Cell capacity (max 20 Wh)' : 'Battery capacity (max 100 Wh)')}
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
                        placeholder={item.adrBatteryDetails?.chemistry === 'lithium_metal' ? 'e.g. 1.5 g' : 'e.g. 85 Wh'}
                        className="input w-full font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                        {t('adr_battery_condition', 'Battery Condition')}
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
                        <option value="normal">{t('adr_condition_normal', 'Normal (New / Undamaged)')}</option>
                        <option value="damaged_defective">{t('adr_condition_damaged', 'Damaged / Defective (SP 376)')}</option>
                        <option value="waste">{t('adr_condition_waste', 'Waste for disposal (SP 377)')}</option>
                        <option value="recycling">{t('adr_condition_recycling', 'Destined for recycling (SP 377)')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                        {t('adr_battery_pkg_mode', 'Packaging Mode')}
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
                        <option value="standalone">{t('adr_standalone', 'Batteries Only (max 30 kg/package)')}</option>
                        <option value="contained_in_equipment">{t('adr_in_equipment', 'Contained in Equipment')}</option>
                        <option value="packed_with_equipment">{t('adr_with_equipment', 'Packed with Equipment')}</option>
                      </select>
                    </div>
                  </div>

                  {/* UN 38.3 Test Compliance Checkbox */}
                  <div className="pt-2 flex items-center justify-between border-t border-blue-500/20">
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
                        className="checkbox checkbox-primary checkbox-sm"
                      />
                      <span className="font-semibold text-[11px] text-text-primary">
                        {t('adr_un383_test_passed', 'Compliant with UN Manual of Tests and Criteria Part III, sub-section 38.3 (Mandatory for SP 188 c)')}
                      </span>
                    </label>
                  </div>

                  {/* Live SP 188 Status Alert */}
                  {isSp188Exempt ? (
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300 font-semibold text-xs bg-green-500/10 p-3 rounded-xl border border-green-500/20">
                      <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                      <span>{t('adr_sp188_eligible', 'Eligible for Special Provision 188 Exemption (Below cell/battery threshold). Driver ADR certificate and orange plates NOT required.')}</span>
                    </div>
                  ) : sp188NeedVerification ? (
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-xs bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                      <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{t('adr_sp188_need_verify', 'Verification required: specify cell vs battery and enter exact Wh or g Li capacity.')}</span>
                    </div>
                  ) : item.adrBatteryDetails?.condition === 'damaged_defective' ? (
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-semibold text-xs bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{t('adr_sp376_alert', 'Damaged / defective batteries (SP 376) — SP 188 exemption strictly prohibited! Subject to full ADR regime and packaging P908/LP904.')}</span>
                    </div>
                  ) : item.adrBatteryDetails?.unTestPassed === false ? (
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-semibold text-xs bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{t('adr_sp188_un383_failed', 'Batteries failing UN 38.3 tests are strictly prohibited under SP 188 exemption regime!')}</span>
                    </div>
                  ) : null}
                </div>
              )}

              {/* TAB 5: OFFICIAL ADR 5.4 DECLARATION */}
              {activeTab === 'declaration' && (
                <div className="space-y-3 animate-in fade-in">
                  <div className="p-4 rounded-xl border border-border bg-black/5 dark:bg-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-text-primary flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-primary" />
                        {t('adr_declaration_preview', 'ADR 5.4 Transport Document Declaration Line Preview')}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyDeclaration}
                        className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                      >
                        {copiedDeclaration ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedDeclaration ? t('adr_declaration_copied', 'Copied!') : t('adr_declaration_copy', 'Copy declaration text')}
                      </button>
                    </div>

                    <div className="p-3 bg-card border border-border/80 rounded-xl font-mono text-xs text-text-primary select-all break-all leading-relaxed shadow-inner">
                      {declarationLine || '—'}
                    </div>

                    <p className="text-[11px] text-text-secondary mt-2">
                      {t('adr_declaration_footnote', 'Mandatory standard format according to UNECE ADR 5.4.1.1.1 for CMR and consignment notes.')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default AdrCargoSection;
