/**
 * HapCargo TMS — ADR Rules & Calculation Engine
 * 
 * Normative Reference: UNECE ADR 2025 (ECE/TRANS/352)
 * Chapters:
 *  - 1.1.3.6: Exemptions related to quantities carried per transport unit (1,000-Point Rule)
 *  - 3.4: Dangerous goods packed in limited quantities (LQ)
 *  - 3.5: Dangerous goods packed in excepted quantities (EQ)
 *  - 3.3: Special Provisions (SP 188, SP 230, SP 376, SP 377 for Lithium Batteries, SP 274 for technical names)
 *  - 5.4: Documentation (Dangerous Goods Transport Document Declaration - ADR 5.4.1)
 *  - 7.5.2: Mixed loading prohibitions (Table 7.5.2.1 & Table 7.5.2.2)
 *  - 7.5.4: Precautions with respect to foodstuffs, consumption articles and animal feedstuffs
 *  - 8.1.4: Fire-fighting equipment
 *  - 8.2: Driver Training Certificate Requirements & Specializations
 *  - 8.6: Tunnel restrictions
 */

export interface AdrItemInput {
  id?: string;
  unNumber: string; // e.g. "UN 1203" or "1203"
  properShippingName?: string;
  technicalName?: string; // Required when SP 274 applies
  adrClass?: string; // "1", "2", "3", "4.1", "4.2", "4.3", "5.1", "5.2", "6.1", "6.2", "7", "8", "9"
  classificationCode?: string; // e.g. "1.1D", "1.4S", "F1", "T1", "M4"
  packingGroup?: string | null; // "I", "II", "III"
  transportCategory?: number; // 0, 1, 2, 3, 4
  tunnelRestrictionCode?: string; // "(D/E)", "(E)", "(B1000C)", etc.
  dangerLabels?: string; // e.g. "3", "6.1", "1.4", "4.1+1", "5.2+1"
  quantity?: number; // quantity value
  unit?: string; // 'liters', 'kg', 'pallet', 'package', 'box', etc.
  grossMassKg?: number;
  netMassKg?: number;
  volumeLiters?: number;
  // Specific normative quantity fields per ADR 1.1.3.6.3
  netExplosiveMassKg?: number; // NEM / NEQ for Class 1 (mandatory for Class 1 1.1.3.6 calculation)
  receptacleCapacityLiters?: number; // Nominal water capacity in liters for compressed gases
  packageGrossMassKg?: number; // For LQ (max 30kg) and SP 188 (max 30kg) packaging checks
  innerPackagingQuantity?: number; // For LQ column 7a check and EQ limits
  innerPackagingUnit?: string; // 'ml', 'L', 'g', 'kg'
  totalPackagesCount?: number; // For EQ 1,000 package limit per transport unit (ADR 3.5.5)
  catalogLqLimit?: string; // Column 7a limit: '0', '1 L', '5 L', '500 g', '5 kg', etc.
  catalogEqCode?: string; // Column 7b code: 'E0', 'E1', 'E2', 'E3', 'E4', 'E5'
  transportType?: 'packages' | 'bulk' | 'tank';
  limitedQuantity?: boolean;
  exceptedQuantity?: boolean;
  environmentalHazard?: boolean;
  waste?: boolean; // ADR 5.4.1.1.3
  emptyUncleaned?: boolean; // ADR 1.1.3.6.3 & 5.4.1.1.6
  temperatureControlled?: boolean; // ADR 2.2.41.1.17, 2.2.52.1.15
  // Lithium battery details per SP 188, SP 376, SP 377
  batteryDetails?: {
    chemistry?: 'lithium_ion' | 'lithium_metal' | 'sodium_ion' | 'lead_acid' | 'other';
    cellOrBattery?: 'cell' | 'battery'; // SP 188(a) <= 20Wh/1g vs SP 188(b) <= 100Wh/2g
    wattHours?: number;
    lithiumGrams?: number;
    packagingMode?: 'standalone' | 'packed_with_equipment' | 'contained_in_equipment';
    condition?: 'normal' | 'damaged_defective' | 'waste' | 'recycling';
    unTestPassed?: boolean; // UN Manual of Tests and Criteria Part III 38.3
    packageGrossMassKg?: number;
  };
  aerosolDetails?: {
    capacityMl?: number; // <= 1000 ml
    flammable?: boolean;
  };
}

export interface AdrCalculationLine {
  unNumber: string;
  properShippingName: string;
  technicalName?: string;
  adrClass: string;
  classificationCode?: string;
  packingGroup: string | null;
  transportCategory: number;
  effectiveTransportCategory: number; // May change to Cat 4 for empty uncleaned packagings
  transportType: 'packages' | 'bulk' | 'tank';
  quantityValue: number;
  quantityUnit: string;
  normativeQuantityType: string; // 'net_explosive_mass' | 'water_capacity' | 'volume_liters' | 'net_mass_kg' | 'article_mass'
  multiplier: number;
  points: number;
  isCategory0: boolean;
  eligible1136: boolean;
  exemptionApplied: 'none' | '1.1.3.6' | 'lq' | 'eq' | 'sp188' | 'empty_uncleaned';
  exemptionReason?: string;
  tunnelCode: string;
  dangerLabels: string;
  declarationLine: string; // ADR 5.4 compliant line
}

export interface AdrEvaluationResult {
  isAdr: boolean;
  status: 'none' | 'needs_review' | 'confirmed_full_adr' | 'exempt_1136' | 'limited_quantity' | 'excepted_quantity' | 'special_exemption';
  statusLabelRo: string;
  statusLabelEn: string;
  badgeCode: string;
  badgeLevel: 'info' | 'warning' | 'danger' | 'success';
  totalPoints: number;
  pointsByCategory: { cat0: number; cat1: number; cat2: number; cat3: number; cat4: number };
  eligible1136: boolean;
  exemptionType: 'none' | '1.1.3.6' | 'lq' | 'eq' | 'sp188' | 'empty_uncleaned';
  driverCertRequired: boolean;
  driverSpecializationsRequired: string[]; // e.g. ['basic_packages', 'class1', 'class7', 'tanks']
  vehicleCertRequired: boolean; // EX/II, EX/III, FL, AT
  vehicleTypesRequired: string[];
  orangePlatesRequired: boolean;
  instructionsInWritingRequired: boolean;
  fireExtinguisherMinimumKg: number; // 2kg for 1.1.3.6 / LQ, 12kg for full transport unit > 7.5t
  lines: AdrCalculationLine[];
  requiresVerification: boolean;
  verificationReasons: string[];
  transportDocumentText: string;
  mixedLoadingViolations: string[];
  foodContaminationWarnings: string[];
  tunnelProhibitions: string[];
}

export class AdrRulesEngine {
  /**
   * Normalizes UN number to "UN XXXX"
   */
  public static normalizeUnNumber(un: string): string {
    if (!un) return '';
    const digits = un.replace(/\D/g, '').padStart(4, '0');
    return `UN ${digits}`;
  }

  /**
   * Returns standard multiplier factor according to ADR 1.1.3.6.4:
   *  - Transport Category 0: factor = N/A (cannot use 1.1.3.6, unlimited points/ineligible)
   *  - Transport Category 1: factor = 50
   *      Note a of 1.1.3.6.3: factor 20 (max quantity 50) applies ONLY to:
   *      UN 0081, 0082, 0084, 0241, 0331, 0332, 0482 (Class 1 1.1D, 1.5D explosives)
   *      UN 1005 (Ammonia, anhydrous), UN 1017 (Chlorine)
   *  - Transport Category 2: factor = 3
   *  - Transport Category 3: factor = 1
   *  - Transport Category 4: factor = 0 (unlimited quantity under 1.1.3.6)
   */
  public static getMultiplier(transportCategory: number, unNumber: string): number {
    const un = unNumber.replace(/\D/g, '');
    if (transportCategory === 0) return 0; // Handled separately as ineligible / Category 0
    if (transportCategory === 1) {
      const factor20UNs = ['0081', '0082', '0084', '0241', '0331', '0332', '0482', '1005', '1017'];
      if (factor20UNs.includes(un)) return 20;
      return 50;
    }
    if (transportCategory === 2) return 3;
    if (transportCategory === 3) return 1;
    if (transportCategory === 4) return 0;
    return 1;
  }

  /**
   * Evaluates Special Provision 188 for Lithium Batteries (UN 3480, 3481, 3090, 3091)
   * Verifies distinct cell vs battery thresholds, condition, UN 38.3 compliance, and gross mass.
   */
  public static evaluateSp188(item: AdrItemInput): { isExempt: boolean; reason?: string; needsVerification?: boolean; isProhibited?: boolean } {
    const normUN = this.normalizeUnNumber(item.unNumber);
    const isLithium = ['UN 3480', 'UN 3481', 'UN 3090', 'UN 3091'].includes(normUN);
    if (!isLithium) return { isExempt: false };

    const details = item.batteryDetails;
    if (!details) {
      return {
        isExempt: false,
        needsVerification: true,
        reason: 'Detalii baterie litiu lipsă (Wh, conținut litiu, celulă/baterie, stare, conformitate teste UN 38.3) — conformare normativă nespecificată, verificare ADR obligatorie.',
      };
    }

    // SP 376: Damaged or defective cells/batteries CANNOT be carried under SP 188
    if (details.condition === 'damaged_defective') {
      return {
        isExempt: false,
        isProhibited: true,
        reason: 'Baterii deteriorate sau defecte (ADR SP 376): scutirea SP 188 este interzisă de lege! Regim complet ADR obligatoriu cu ambalaje speciale P908/LP904 și notă în documentul de transport.',
      };
    }

    // SP 377: Waste batteries for disposal or recycling CANNOT use SP 188
    if (details.condition === 'waste' || details.condition === 'recycling' || item.waste) {
      return {
        isExempt: false,
        isProhibited: true,
        reason: 'Baterii deșeu/reciclare (ADR SP 377): scutirea SP 188 este interzisă de lege! Transport obligatoriu sub instrucțiunea P909/LP905.',
      };
    }

    // SP 188 (c): UN Manual of Tests and Criteria Part III, sub-section 38.3
    if (details.unTestPassed === false) {
      return {
        isExempt: false,
        isProhibited: true,
        reason: 'Bateriile nu au trecut testele UN 38.3 conform ADR SP 188 (c). Transportul sub regimul de scutire SP 188 este strict interzis.',
      };
    }

    // SP 188 (e): Package gross mass limit (max 30 kg for standalone cells/batteries)
    const pkgMass = details.packageGrossMassKg || item.packageGrossMassKg;
    if (details.packagingMode === 'standalone' && pkgMass !== undefined && pkgMass > 30) {
      return {
        isExempt: false,
        isProhibited: true,
        reason: `Masa brută a coletului de ${pkgMass} kg depășește limita legală de 30 kg prevăzută de ADR SP 188 (e) pentru baterii ambalate de sine stătătoare. Se aplică regimul complet ADR.`,
      };
    }

    const isCell = details.cellOrBattery === 'cell';
    const isBattery = details.cellOrBattery === 'battery';

    // Lithium Ion (UN 3480, UN 3481)
    if (normUN === 'UN 3480' || normUN === 'UN 3481') {
      const wh = Number(details.wattHours || 0);
      if (wh <= 0) {
        return {
          isExempt: false,
          needsVerification: true,
          reason: 'Capacitatea energetică în Watt-oră (Wh) este nespecificată sau invalidă pentru baterii/celule Li-Ion.',
        };
      }

      if (isCell) {
        // SP 188 (a): Cell <= 20 Wh
        if (wh <= 20) {
          return {
            isExempt: true,
            reason: `Scutire ADR SP 188 (a) confirmată: Celulă Li-ion <= 20 Wh (${wh} Wh). Scutit de certificat șofer și plăci portocalii.`,
          };
        } else {
          return {
            isExempt: false,
            reason: `Capacitatea celulei de ${wh} Wh depășește limita de 20 Wh conform ADR SP 188 (a). Regim complet ADR obligatoriu.`,
          };
        }
      } else if (isBattery) {
        // SP 188 (b): Battery <= 100 Wh
        if (wh <= 100) {
          return {
            isExempt: true,
            reason: `Scutire ADR SP 188 (b) confirmată: Baterie Li-ion <= 100 Wh (${wh} Wh). Scutit de certificat șofer și plăci portocalii.`,
          };
        } else {
          return {
            isExempt: false,
            reason: `Capacitatea bateriei de ${wh} Wh depășește limita de 100 Wh conform ADR SP 188 (b). Regim complet ADR obligatoriu.`,
          };
        }
      } else {
        // Cell or battery not specified: if <= 20Wh, safe for both; if > 20Wh and <= 100Wh, must require confirmation whether it is a cell or battery!
        if (wh <= 20) {
          return {
            isExempt: true,
            reason: `Scutire ADR SP 188 confirmată: ${wh} Wh (conform atât pentru celule <= 20Wh, cât și baterii <= 100Wh).`,
          };
        } else if (wh <= 100) {
          return {
            isExempt: false,
            needsVerification: true,
            reason: `Pentru capacități între 20 Wh și 100 Wh (${wh} Wh) este obligatorie specificarea dacă articolul este celulă (limită 20 Wh conform SP 188 a) sau baterie (limită 100 Wh conform SP 188 b). Verificare ADR obligatorie înainte de scutire.`,
          };
        } else {
          return {
            isExempt: false,
            reason: `Capacitatea de ${wh} Wh depășește limita maximă de 100 Wh conform ADR SP 188. Regim complet ADR obligatoriu.`,
          };
        }
      }
    }

    // Lithium Metal (UN 3090, UN 3091)
    if (normUN === 'UN 3090' || normUN === 'UN 3091') {
      const g = Number(details.lithiumGrams || 0);
      if (g <= 0) {
        return {
          isExempt: false,
          needsVerification: true,
          reason: 'Conținutul de litiu metalic (grame) este nespecificat sau invalid pentru baterii/celule Li-Metal.',
        };
      }

      if (isCell) {
        // SP 188 (a): Cell <= 1 g lithium
        if (g <= 1) {
          return {
            isExempt: true,
            reason: `Scutire ADR SP 188 (a) confirmată: Celulă Li-metal <= 1 g litiu (${g} g). Scutit de certificat șofer și plăci portocalii.`,
          };
        } else {
          return {
            isExempt: false,
            reason: `Conținutul de litiu al celulei de ${g} g depășește limita de 1 g conform ADR SP 188 (a). Regim complet ADR obligatoriu.`,
          };
        }
      } else if (isBattery) {
        // SP 188 (b): Battery <= 2 g lithium
        if (g <= 2) {
          return {
            isExempt: true,
            reason: `Scutire ADR SP 188 (b) confirmată: Baterie Li-metal <= 2 g litiu (${g} g). Scutit de certificat șofer și plăci portocalii.`,
          };
        } else {
          return {
            isExempt: false,
            reason: `Conținutul de litiu al bateriei de ${g} g depășește limita de 2 g conform ADR SP 188 (b). Regim complet ADR obligatoriu.`,
          };
        }
      } else {
        if (g <= 1) {
          return {
            isExempt: true,
            reason: `Scutire ADR SP 188 confirmată: ${g} g litiu (conform atât pentru celule <= 1g, cât și baterii <= 2g).`,
          };
        } else if (g <= 2) {
          return {
            isExempt: false,
            needsVerification: true,
            reason: `Pentru conținut de litiu între 1 g și 2 g (${g} g) este obligatorie specificarea dacă articolul este celulă (limită 1 g conform SP 188 a) sau baterie (limită 2 g conform SP 188 b). Verificare ADR obligatorie înainte de scutire.`,
          };
        } else {
          return {
            isExempt: false,
            reason: `Conținutul de litiu de ${g} g depășește limita de 2 g conform ADR SP 188. Regim complet ADR obligatoriu.`,
          };
        }
      }
    }

    return {
      isExempt: false,
      needsVerification: true,
      reason: 'Parametrii energetici ai bateriei cu litiu necesită verificare ADR.',
    };
  }

  /**
   * Evaluates Limited Quantities (ADR 3.4)
   * Enforces Table A Column 7a prohibition (when '0'), package gross mass (<= 30 kg combination, <= 20 kg shrink-wrapped), and inner packaging limits.
   */
  public static evaluateLq(item: AdrItemInput): { isExempt: boolean; reason?: string; needsVerification?: boolean; isProhibited?: boolean } {
    if (!item.limitedQuantity) return { isExempt: false };

    const lqLimit = String(item.catalogLqLimit || '').trim().toUpperCase();

    // Column 7a prohibition check: '0' means LQ is strictly forbidden!
    if (lqLimit === '0' || lqLimit === '0 KG' || lqLimit === '0 L') {
      return {
        isExempt: false,
        isProhibited: true,
        reason: `Substanța ${item.unNumber} are codul LQ '0' în Coloana 7a din Tabelul A ADR 2025. Transportul în cantități limitate (LQ) este strict interzis!`,
      };
    }

    // Package gross mass check (ADR 3.4.2 & 3.4.3): combination package <= 30 kg, shrink-wrapped trays <= 20 kg
    const pkgMass = item.packageGrossMassKg || item.grossMassKg;
    if (pkgMass !== undefined && pkgMass > 30) {
      return {
        isExempt: false,
        isProhibited: true,
        reason: `Masa brută a coletului (${pkgMass} kg) depășește limita legală de 30 kg prevăzută de ADR 3.4.2 pentru cantități limitate (LQ).`,
      };
    }

    // Check inner packaging limit if specified
    if (item.innerPackagingQuantity && lqLimit && lqLimit !== '') {
      // Parse numeric part from lqLimit e.g. "1 L" -> 1, "5 L" -> 5, "500 ML" -> 500
      const limitMatch = lqLimit.match(/(\d+(?:\.\d+)?)\s*(KG|G|L|ML)/i);
      if (limitMatch) {
        const limitVal = parseFloat(limitMatch[1]);
        const limitUnit = limitMatch[2].toUpperCase();
        let itemInnerVal = item.innerPackagingQuantity;
        const itemInnerUnit = (item.innerPackagingUnit || 'L').toUpperCase();

        // Normalize to common unit for comparison
        let limitNormalized = limitVal;
        let itemNormalized = itemInnerVal;
        if (limitUnit === 'KG') limitNormalized = limitVal * 1000; // in g
        if (itemInnerUnit === 'KG') itemNormalized = itemInnerVal * 1000; // in g
        if (limitUnit === 'L') limitNormalized = limitVal * 1000; // in ml
        if (itemInnerUnit === 'L') itemNormalized = itemInnerVal * 1000; // in ml

        if (itemNormalized > limitNormalized) {
          return {
            isExempt: false,
            isProhibited: true,
            reason: `Ambalajul interior (${item.innerPackagingQuantity} ${item.innerPackagingUnit}) depășește limita maximă autorizată de ${item.catalogLqLimit} conform Coloanei 7a Tabel A ADR.`,
          };
        }
      }
    }

    return {
      isExempt: true,
      reason: 'Transport conform ADR 3.4 (Cantități Limitate / LQ). Scutit de certificat șofer și plăci portocalii. Ambalaje marcate cu romb LQ.',
    };
  }

  /**
   * Evaluates Excepted Quantities (ADR 3.5)
   * Enforces Table A Column 7b code: E0 (prohibited), E1-E5 (inner/outer limits), and transport unit limit of 1,000 packages (ADR 3.5.5).
   */
  public static evaluateEq(item: AdrItemInput): { isExempt: boolean; reason?: string; needsVerification?: boolean; isProhibited?: boolean } {
    if (!item.exceptedQuantity) return { isExempt: false };

    const eqCode = String(item.catalogEqCode || '').trim().toUpperCase();

    // E0 check: Strictly forbidden
    if (eqCode === 'E0') {
      return {
        isExempt: false,
        isProhibited: true,
        reason: `Substanța ${item.unNumber} are codul EQ 'E0' în Coloana 7b din Tabelul A ADR 2025. Transportul în cantități exceptate (EQ) este interzis!`,
      };
    }

    // Transport unit package count check (ADR 3.5.5: max 1,000 packages per transport unit)
    if (item.totalPackagesCount !== undefined && item.totalPackagesCount > 1000) {
      return {
        isExempt: false,
        isProhibited: true,
        reason: `Numărul de colete (${item.totalPackagesCount}) depășește limita maximă autorizată de 1.000 colete per unitate de transport conform ADR 3.5.5.`,
      };
    }

    // Inner packaging limits check per ADR 3.5.1.2:
    // E1: inner <= 30g/ml, outer <= 1000g/ml
    // E2: inner <= 30g/ml, outer <= 500g/ml
    // E3: inner <= 30g/ml, outer <= 300g/ml
    // E4: inner <= 1g/ml, outer <= 500g/ml
    // E5: inner <= 1g/ml, outer <= 300g/ml
    if (item.innerPackagingQuantity) {
      let maxInnerGOrMl = 30;
      if (eqCode === 'E4' || eqCode === 'E5') maxInnerGOrMl = 1;

      let innerVal = item.innerPackagingQuantity;
      const unit = (item.innerPackagingUnit || 'g').toLowerCase();
      if (unit === 'kg' || unit === 'l') innerVal = innerVal * 1000;

      if (innerVal > maxInnerGOrMl) {
        return {
          isExempt: false,
          isProhibited: true,
          reason: `Cantitatea din ambalajul interior (${item.innerPackagingQuantity} ${item.innerPackagingUnit}) depășește limita de ${maxInnerGOrMl} g/ml prevăzută pentru codul ${eqCode} conform ADR 3.5.1.2.`,
        };
      }
    }

    return {
      isExempt: true,
      reason: `Transport conform ADR 3.5 (Cantități Exceptate / EQ Cod ${eqCode || 'E1-E5'}). Scutit de certificat șofer, plăci portocalii și document de transport standard.`,
    };
  }

  /**
   * Generates official ADR 5.4 dangerous goods transport document line according to ADR 5.4.1.1.1:
   * Sequence:
   * (a) UN number preceded by 'UN';
   * (b) Proper shipping name (supplemented by technical name in parentheses when SP 274 applies);
   * (c) Class number and subsidiary risk labels in parentheses;
   * (d) Packing group preceded by 'PG' or 'GE';
   * (e) Tunnel restriction code in parentheses;
   * Followed by mandatory statutory notations (WASTE, EMPTY UNCLEANED, ENVIRONMENTALLY HAZARDOUS, SP 376, SP 377).
   */
  public static generateTransportDocLine(item: AdrItemInput, lang: 'ro' | 'en' = 'ro'): string {
    const un = this.normalizeUnNumber(item.unNumber);
    const properName = item.properShippingName || 'DANGEROUS GOODS';
    const techName = item.technicalName ? ` (${item.technicalName})` : '';
    
    // Class and danger labels
    const cls = item.adrClass || '3';
    let labelPart = cls;
    if (item.dangerLabels && item.dangerLabels.includes('+')) {
      const subLabels = item.dangerLabels.split('+').slice(1).map(s => s.trim()).filter(Boolean);
      if (subLabels.length > 0) {
        labelPart = `${cls} (${subLabels.join(', ')})`;
      }
    }

    const pg = item.packingGroup ? (lang === 'ro' ? `, GE ${item.packingGroup}` : `, PG ${item.packingGroup}`) : '';
    const tunnel = item.tunnelRestrictionCode ? `, (${item.tunnelRestrictionCode.replace(/[()]/g, '')})` : '';
    const env = item.environmentalHazard ? (lang === 'ro' ? ', PERICULOS PENTRU MEDIU' : ', ENVIRONMENTALLY HAZARDOUS') : '';
    const waste = item.waste ? (lang === 'ro' ? 'DEȘEU, ' : 'WASTE, ') : '';
    const empty = item.emptyUncleaned ? (lang === 'ro' ? 'AMBALAJ GOL, NECURĂȚAT, ' : 'EMPTY PACKAGING, UNCLEANED, ') : '';

    // Special provisions statutory notations
    let spText = '';
    if (item.batteryDetails?.condition === 'damaged_defective') {
      spText = lang === 'ro' ? ', TRANSPORT ÎN CONFORMITATE CU DISPOZIȚIA SPECIALĂ 376' : ', CARRIAGE IN ACCORDANCE WITH SPECIAL PROVISION 376';
    } else if (item.batteryDetails?.condition === 'waste' || item.batteryDetails?.condition === 'recycling') {
      spText = lang === 'ro' ? ', BATERII CU LITIU PENTRU ELIMINARE / RECICLARE (SP 377)' : ', LITHIUM BATTERIES FOR DISPOSAL / RECYCLING (SP 377)';
    }

    return `${empty}${waste}${un}, ${properName}${techName}, ${labelPart}${pg}${tunnel}${env}${spText}`;
  }

  /**
   * Evaluates a full list of ADR cargo items for an order or trip according to UNECE ADR 2025.
   */
  public static evaluateCargo(items: AdrItemInput[]): AdrEvaluationResult {
    if (!items || items.length === 0) {
      return {
        isAdr: false,
        status: 'none',
        statusLabelRo: 'Fără marfă ADR',
        statusLabelEn: 'Non-ADR Cargo',
        badgeCode: 'NONE',
        badgeLevel: 'info',
        totalPoints: 0,
        pointsByCategory: { cat0: 0, cat1: 0, cat2: 0, cat3: 0, cat4: 0 },
        eligible1136: false,
        exemptionType: 'none',
        driverCertRequired: false,
        driverSpecializationsRequired: [],
        vehicleCertRequired: false,
        vehicleTypesRequired: [],
        orangePlatesRequired: false,
        instructionsInWritingRequired: false,
        fireExtinguisherMinimumKg: 0,
        lines: [],
        requiresVerification: false,
        verificationReasons: [],
        transportDocumentText: '',
        mixedLoadingViolations: [],
        foodContaminationWarnings: [],
        tunnelProhibitions: [],
      };
    }

    const lines: AdrCalculationLine[] = [];
    const verificationReasons: string[] = [];
    let totalPoints = 0;
    const pointsByCategory = { cat0: 0, cat1: 0, cat2: 0, cat3: 0, cat4: 0 };
    let containsCategory0 = false;
    let containsTankOrBulk = false;
    let allAreLq = true;
    let allAreEq = true;
    let allAreSp188 = true;
    let requiresHumanVerification = false;

    const specializationsNeeded = new Set<string>();
    const vehicleTypesNeeded = new Set<string>();
    const tunnelProhibitions: string[] = [];

    for (const item of items) {
      const normUN = this.normalizeUnNumber(item.unNumber);
      const cls = String(item.adrClass || '').trim();
      const baseCat = item.transportCategory !== undefined ? Number(item.transportCategory) : 3;
      const transportType = item.transportType || 'packages';
      const pg = item.packingGroup || null;

      // ADR 1.1.3.6.3: Empty uncleaned packagings assigned category logic:
      // Category 0 stays 0; all other categories (1, 2, 3) become Transport Category 4!
      let effectiveCat = baseCat;
      if (item.emptyUncleaned) {
        if (baseCat !== 0) {
          effectiveCat = 4;
        }
      }
      const isCat0 = effectiveCat === 0;

      if (transportType === 'tank' || transportType === 'bulk') {
        containsTankOrBulk = true;
      }

      // Determine required driver specializations per ADR 8.2.1
      if (transportType === 'packages') {
        specializationsNeeded.add('basic_packages');
      }
      if (transportType === 'tank') {
        specializationsNeeded.add('tanks');
        vehicleTypesNeeded.add(cls.startsWith('3') || cls.includes('2.1') ? 'FL' : 'AT');
      }
      // Class 1 (except 1.4S) requires specialized explosive driver endorsement
      const is14S = item.classificationCode === '1.4S' || (cls === '1.4' && item.dangerLabels === '1.4');
      if (cls.startsWith('1') && !is14S) {
        specializationsNeeded.add('class1');
        vehicleTypesNeeded.add('EX/II or EX/III');
      }
      // Class 7 (Radioactive) requires specialized radioactive driver endorsement (except excepted packages)
      if (cls.startsWith('7')) {
        specializationsNeeded.add('class7');
      }

      // Tunnel restriction evaluation (ADR 8.6)
      const tunnel = String(item.tunnelRestrictionCode || '').replace(/[()]/g, '').trim().toUpperCase();
      if (tunnel === 'E') tunnelProhibitions.push(`${normUN} (Cod Tunel E: acces strict interzis în tunele de categoria E)`);
      if (tunnel.includes('B') || tunnel.includes('C') || tunnel.includes('D')) {
        tunnelProhibitions.push(`${normUN} (Restricție Tunel ${tunnel})`);
      }

      // 1. Evaluate Special Provision 188 (Lithium batteries)
      const sp188Check = this.evaluateSp188(item);
      if (sp188Check.needsVerification) {
        requiresHumanVerification = true;
        verificationReasons.push(`${normUN}: ${sp188Check.reason}`);
      }
      if (sp188Check.isProhibited) {
        // Explicitly prohibited under SP 188 (e.g. damaged battery or UN 38.3 test failed)
        verificationReasons.push(`${normUN}: ${sp188Check.reason}`);
      }

      // 2. Evaluate Limited Quantities (ADR 3.4)
      const lqCheck = this.evaluateLq(item);
      if (lqCheck.isProhibited) {
        requiresHumanVerification = true;
        verificationReasons.push(`${normUN}: ${lqCheck.reason}`);
      }

      // 3. Evaluate Excepted Quantities (ADR 3.5)
      const eqCheck = this.evaluateEq(item);
      if (eqCheck.isProhibited) {
        requiresHumanVerification = true;
        verificationReasons.push(`${normUN}: ${eqCheck.reason}`);
      }

      let exemptionApplied: 'none' | '1.1.3.6' | 'lq' | 'eq' | 'sp188' | 'empty_uncleaned' = 'none';
      let exemptionReason: string | undefined;

      if (sp188Check.isExempt) {
        exemptionApplied = 'sp188';
        exemptionReason = sp188Check.reason;
      } else {
        allAreSp188 = false;
      }

      if (lqCheck.isExempt) {
        exemptionApplied = 'lq';
        exemptionReason = lqCheck.reason;
      } else {
        allAreLq = false;
      }

      if (eqCheck.isExempt) {
        exemptionApplied = 'eq';
        exemptionReason = eqCheck.reason;
      } else {
        allAreEq = false;
      }

      // Determine normative quantity unit according to ADR 1.1.3.6.3:
      //  - For articles of Class 1: net mass in kg of explosive substance (NEM/NEQ)
      //  - For compressed gases: water capacity of receptacle in litres
      //  - For liquids: total quantity in litres
      //  - For solids, liquefied/dissolved gases: net mass in kg
      //  - For other articles: gross mass of article without packaging in kg
      let qty = 0;
      let qtyUnit = 'kg';
      let normativeQtyType = 'net_mass_kg';

      const isClass1 = cls.startsWith('1');
      const isCompressedGas = cls.startsWith('2') && (item.classificationCode?.startsWith('1') || item.classificationCode === '1A' || item.classificationCode === '1O' || item.classificationCode === '1F');

      if (effectiveCat === 4) {
        normativeQtyType = 'unlimited_cat4';
        qtyUnit = isClass1 ? 'kg NEM' : 'kg';
        qty = item.netExplosiveMassKg || item.netMassKg || item.grossMassKg || item.quantity || 0;
      } else if (isClass1) {
        normativeQtyType = 'net_explosive_mass';
        qtyUnit = 'kg NEM';
        if (item.netExplosiveMassKg && item.netExplosiveMassKg > 0) {
          qty = item.netExplosiveMassKg;
        } else if (item.netMassKg && item.netMassKg > 0) {
          qty = item.netMassKg;
        } else {
          qty = item.quantity || 0;
          if (exemptionApplied === 'none' && !isCat0) {
            requiresHumanVerification = true;
            verificationReasons.push(`${normUN} (Clasa 1): Masa netă de substanță explozivă (NEM) în kg este obligatorie pentru calculul normativ ADR 1.1.3.6.3.`);
          }
        }
      } else if (isCompressedGas) {
        normativeQtyType = 'water_capacity';
        qtyUnit = 'L (capacitate recipient)';
        qty = item.receptacleCapacityLiters || item.volumeLiters || item.quantity || 0;
        if (qty <= 0 && exemptionApplied === 'none') {
          requiresHumanVerification = true;
          verificationReasons.push(`${normUN} (Gaze comprimate): Capacitatea de apă a recipientului în litri este obligatorie conform ADR 1.1.3.6.3.`);
        }
      } else if (item.volumeLiters && item.volumeLiters > 0) {
        normativeQtyType = 'volume_liters';
        qty = item.volumeLiters;
        qtyUnit = 'L';
      } else if (item.netMassKg && item.netMassKg > 0) {
        normativeQtyType = 'net_mass_kg';
        qty = item.netMassKg;
        qtyUnit = 'kg';
      } else if (item.grossMassKg && item.grossMassKg > 0) {
        normativeQtyType = 'gross_mass_kg';
        qty = item.grossMassKg;
        qtyUnit = 'kg';
      } else if (item.quantity && item.quantity > 0) {
        qty = item.quantity;
        qtyUnit = item.unit || 'buc';
      }

      if (qty <= 0 && exemptionApplied === 'none' && effectiveCat !== 4) {
        requiresHumanVerification = true;
        verificationReasons.push(`${normUN}: Cantitatea sau masa netă/litri nu este specificată pentru calculul ADR.`);
      }

      // Calculate points
      let multiplier = this.getMultiplier(effectiveCat, normUN);
      let points = 0;

      if (isCat0) {
        containsCategory0 = true;
        multiplier = 0;
        points = Infinity; // Category 0 cannot use 1.1.3.6
        pointsByCategory.cat0 = Infinity;
      } else if (exemptionApplied === 'none') {
        points = Math.round(qty * multiplier * 100) / 100;
        totalPoints += points;
        if (effectiveCat === 1) pointsByCategory.cat1 += points;
        if (effectiveCat === 2) pointsByCategory.cat2 += points;
        if (effectiveCat === 3) pointsByCategory.cat3 += points;
        if (effectiveCat === 4) pointsByCategory.cat4 += points;
      }

      const declarationLine = this.generateTransportDocLine(item, 'ro');

      lines.push({
        unNumber: normUN,
        properShippingName: item.properShippingName || 'MARFĂ PERICULOASĂ',
        technicalName: item.technicalName,
        adrClass: cls,
        classificationCode: item.classificationCode,
        packingGroup: pg,
        transportCategory: baseCat,
        effectiveTransportCategory: effectiveCat,
        transportType,
        quantityValue: qty,
        quantityUnit: qtyUnit,
        normativeQuantityType: normativeQtyType,
        multiplier,
        points: isCat0 ? Infinity : points,
        isCategory0: isCat0,
        eligible1136: !isCat0 && transportType === 'packages',
        exemptionApplied,
        exemptionReason,
        tunnelCode: tunnel,
        dangerLabels: item.dangerLabels || cls,
        declarationLine,
      });
    }

    // Mixed loading prohibitions check (ADR 7.5.2)
    const mixedViolations = this.checkMixedLoading(lines);

    // Food contamination check (ADR 7.5.4)
    const foodWarnings = this.checkFoodSeparation(lines, items);

    // 1.1.3.6 Eligibility: Must NOT contain Cat 0, must NOT be tank/bulk
    const eligible1136 = !containsCategory0 && !containsTankOrBulk && !requiresHumanVerification;
    const isExempt1136 = eligible1136 && totalPoints <= 1000 && lines.length > 0;

    // Determine final normative status
    let status: AdrEvaluationResult['status'] = 'confirmed_full_adr';
    let statusLabelRo = 'ADR — Cerințe aplicabile confirmate (Regim Complet)';
    let statusLabelEn = 'ADR — Full Requirements Confirmed';
    let badgeCode = 'ADR_FULL';
    let badgeLevel: AdrEvaluationResult['badgeLevel'] = 'danger';
    let finalExemptionType: AdrEvaluationResult['exemptionType'] = 'none';

    // Category 0 and Tank/Bulk are absolute legal bars to 1.1.3.6 exemption -> Definitively Full ADR!
    if (containsCategory0) {
      status = 'confirmed_full_adr';
      statusLabelRo = 'ADR — Regim complet (Conține Categoria 0 — scutire 1.1.3.6 interzisă)';
      statusLabelEn = 'ADR — Full Rules (Contains Category 0 — 1.1.3.6 prohibited)';
      badgeCode = 'ADR_CAT0';
      badgeLevel = 'danger';
    } else if (containsTankOrBulk) {
      status = 'confirmed_full_adr';
      statusLabelRo = 'ADR — Regim complet (Transport în cisternă sau vrac)';
      statusLabelEn = 'ADR — Full Rules (Tank/Bulk carriage)';
      badgeCode = 'ADR_TANK';
      badgeLevel = 'danger';
    } else if (requiresHumanVerification) {
      status = 'needs_review';
      statusLabelRo = 'ADR — Necesită verificare ADR (date lipsă / neconfirmate)';
      statusLabelEn = 'ADR — Verification Required';
      badgeCode = 'ADR_REVIEW';
      badgeLevel = 'warning';
    } else if (allAreSp188 && lines.length > 0) {
      status = 'special_exemption';
      statusLabelRo = 'ADR — Scutit conf. SP 188 (Baterii Litiu)';
      statusLabelEn = 'ADR — SP 188 Exempt (Lithium Batteries)';
      badgeCode = 'ADR_SP188';
      badgeLevel = 'success';
      finalExemptionType = 'sp188';
    } else if (allAreLq && lines.length > 0) {
      status = 'limited_quantity';
      statusLabelRo = 'ADR — Cantități Limitate (LQ conf. ADR 3.4)';
      statusLabelEn = 'ADR — Limited Quantities (LQ)';
      badgeCode = 'ADR_LQ';
      badgeLevel = 'info';
      finalExemptionType = 'lq';
    } else if (allAreEq && lines.length > 0) {
      status = 'excepted_quantity';
      statusLabelRo = 'ADR — Cantități Exceptate (EQ conf. ADR 3.5)';
      statusLabelEn = 'ADR — Excepted Quantities (EQ)';
      badgeCode = 'ADR_EQ';
      badgeLevel = 'info';
      finalExemptionType = 'eq';
    } else if (isExempt1136) {
      status = 'exempt_1136';
      statusLabelRo = `ADR — Scutire parțială 1.1.3.6 (${totalPoints} pct. <= 1.000)`;
      statusLabelEn = `ADR — Partial Exemption 1.1.3.6 (${totalPoints} pts)`;
      badgeCode = 'ADR_1136';
      badgeLevel = 'success';
      finalExemptionType = '1.1.3.6';
    } else if (containsCategory0) {
      status = 'confirmed_full_adr';
      statusLabelRo = 'ADR — Regim complet (Conține Categoria 0 — scutire 1.1.3.6 interzisă)';
      statusLabelEn = 'ADR — Full Rules (Contains Category 0 — 1.1.3.6 prohibited)';
      badgeCode = 'ADR_CAT0';
      badgeLevel = 'danger';
    } else if (containsTankOrBulk) {
      status = 'confirmed_full_adr';
      statusLabelRo = 'ADR — Regim complet (Transport în cisternă sau vrac)';
      statusLabelEn = 'ADR — Full Rules (Tank/Bulk carriage)';
      badgeCode = 'ADR_TANK';
      badgeLevel = 'danger';
    } else if (totalPoints > 1000) {
      status = 'confirmed_full_adr';
      statusLabelRo = `ADR — Peste limita celor 1.000 pct. (${totalPoints} pct.)`;
      statusLabelEn = `ADR — Above 1,000 Points Limit (${totalPoints} pts)`;
      badgeCode = 'ADR_OVER1000';
      badgeLevel = 'danger';
    }

    // Driver certificate requirement:
    // EXEMPT from driver certificate (ADR 8.2.1) ONLY IF under verified 1.1.3.6 exemption, verified LQ, verified EQ, or verified SP 188!
    const isExemptFromDriverCert = isExempt1136 || allAreLq || allAreEq || allAreSp188;
    const driverCertRequired = !isExemptFromDriverCert && (!requiresHumanVerification || containsCategory0 || containsTankOrBulk);

    // Orange plates (ADR 5.3.2):
    const orangePlatesRequired = !isExemptFromDriverCert && !requiresHumanVerification;

    // Written instructions (ADR 5.4.3):
    const instructionsInWritingRequired = !isExemptFromDriverCert;

    // Fire extinguisher requirement (ADR 8.1.4):
    // Under 1.1.3.6 -> 1 x 2kg dry powder extinguisher (ADR 8.1.4.2)
    // Full ADR:
    //  - Vehicle <= 3.5t: 1 x 2kg + 1 x 2kg = 4kg total
    //  - Vehicle 3.5t - 7.5t: 1 x 2kg + 1 x 6kg = 8kg total
    //  - Vehicle > 7.5t: 1 x 2kg + 1 x 6kg + other = 12kg total (with at least one 6kg extinguisher)
    const fireExtinguisherMinimumKg = isExemptFromDriverCert ? 2 : 12;

    // Build statutory ADR 5.4 transport document text
    const docLines = lines.map((l, i) => {
      const ptsInfo = l.points > 0 ? ` [${l.points} pct ADR 1.1.3.6, Cat. ${l.effectiveTransportCategory} × ${l.multiplier}]` : (l.isCategory0 ? ' [Cat. 0 — Regim Complet obligatoriu]' : '');
      return `${i + 1}. ${l.declarationLine} | Cantitate: ${l.quantityValue} ${l.quantityUnit}${ptsInfo}`;
    });

    if (isExempt1136) {
      docLines.push(`Calcul conform ADR 1.1.3.6: Valoare totală calculată = ${totalPoints} puncte (Sub limita de 1.000 puncte — Scutire parțială acordată conform 1.1.3.6.4).`);
    } else if (totalPoints > 1000) {
      docLines.push(`Calcul conform ADR 1.1.3.6: Valoare totală calculată = ${totalPoints} puncte (Depășește pragul de 1.000 puncte — Regim complet ADR obligatoriu).`);
    }

    const transportDocumentText = docLines.join('\n');

    return {
      isAdr: true,
      status,
      statusLabelRo,
      statusLabelEn,
      badgeCode,
      badgeLevel,
      totalPoints,
      pointsByCategory,
      eligible1136,
      exemptionType: finalExemptionType,
      driverCertRequired,
      driverSpecializationsRequired: Array.from(specializationsNeeded),
      vehicleCertRequired: vehicleTypesNeeded.size > 0,
      vehicleTypesRequired: Array.from(vehicleTypesNeeded),
      orangePlatesRequired,
      instructionsInWritingRequired,
      fireExtinguisherMinimumKg,
      lines,
      requiresVerification: requiresHumanVerification,
      verificationReasons,
      transportDocumentText,
      mixedLoadingViolations: mixedViolations,
      foodContaminationWarnings: foodWarnings,
      tunnelProhibitions: Array.from(new Set(tunnelProhibitions)),
    };
  }

  /**
   * Mixed loading prohibition verification according to ADR 7.5.2 (Table 7.5.2.1 & Table 7.5.2.2).
   * Verifies danger label compatibility and Class 1 compatibility groups.
   */
  public static checkMixedLoading(lines: AdrCalculationLine[]): string[] {
    const violations: string[] = [];
    if (lines.length <= 1) return violations;

    // Extract normalized primary and secondary danger labels
    const labels = lines.map(l => {
      const raw = l.dangerLabels || l.adrClass;
      return {
        un: l.unNumber,
        cls: l.adrClass,
        code: l.classificationCode || '',
        labels: raw.split(/[+,/ ]/).map(s => s.trim()).filter(Boolean),
      };
    });

    // 1. Check Class 1 (Explosives) compatibility with other classes (ADR Table 7.5.2.1)
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const a = labels[i];
        const b = labels[j];

        const aHasClass1 = a.labels.some(l => l.startsWith('1')) || a.cls.startsWith('1');
        const bHasClass1 = b.labels.some(l => l.startsWith('1')) || b.cls.startsWith('1');

        const aIs14S = a.code === '1.4S' || a.labels.includes('1.4S') || (a.labels.includes('1.4') && a.code.endsWith('S'));
        const bIs14S = b.code === '1.4S' || b.labels.includes('1.4S') || (b.labels.includes('1.4') && b.code.endsWith('S'));

        if (aHasClass1 && !bHasClass1) {
          // Label 1.4S is permitted to be co-loaded with other dangerous goods (except 1.4A)
          if (!aIs14S) {
            violations.push(`ADR 7.5.2.1: Interdicție de încărcare în comun! Substanța ${a.un} (Clasa 1 - Explozivi) nu poate fi încărcată în aceeași unitate de transport cu ${b.un} (Clasa ${b.cls}).`);
          }
        } else if (bHasClass1 && !aHasClass1) {
          if (!bIs14S) {
            violations.push(`ADR 7.5.2.1: Interdicție de încărcare în comun! Substanța ${b.un} (Clasa 1 - Explozivi) nu poate fi încărcată în aceeași unitate de transport cu ${a.un} (Clasa ${a.cls}).`);
          }
        } else if (aHasClass1 && bHasClass1) {
          // Class 1 mixed loading among compatibility groups (Table 7.5.2.2)
          const compA = a.code.slice(-1).toUpperCase();
          const compB = b.code.slice(-1).toUpperCase();

          if (compA && compB && compA !== compB) {
            // Group A cannot be co-loaded with any other group
            if (compA === 'A' || compB === 'A') {
              violations.push(`ADR 7.5.2.2: Grupa de compatibilitate A (${a.un} / ${b.un}) este strict interzisă la încărcare în comun cu orice altă grupă de explozivi!`);
            }
            // Group L cannot be co-loaded with other groups or different L types
            else if (compA === 'L' || compB === 'L') {
              violations.push(`ADR 7.5.2.2: Grupa de compatibilitate L (${a.un} / ${b.un}) nu poate fi încărcată în comun cu alte substanțe explozive.`);
            }
            // Group B can only be with B or S
            else if ((compA === 'B' && compB !== 'S') || (compB === 'B' && compA !== 'S')) {
              violations.push(`ADR 7.5.2.2: Grupa de compatibilitate B nu poate fi încărcată în comun cu Grupa ${compA === 'B' ? compB : compA}.`);
            }
          }
        }

        // 2. Class 4.1 + 1 (Self-reactive substances with explosive subsidiary label)
        const aHas41Sub1 = a.labels.includes('4.1') && a.labels.includes('1');
        const bHas41Sub1 = b.labels.includes('4.1') && b.labels.includes('1');
        if ((aHas41Sub1 && !bHasClass1 && !bIs14S) || (bHas41Sub1 && !aHasClass1 && !aIs14S)) {
          violations.push(`ADR 7.5.2.1: Substanțele cu etichetă 4.1+1 (autorreactive cu pericol secundar exploziv) sunt interzise la încărcare în comun cu mărfuri din alte clase.`);
        }

        // 3. Class 5.2 (Organic peroxides) compatibility
        const aIs52 = a.labels.some(l => l.startsWith('5.2')) || a.cls === '5.2';
        const bIs52 = b.labels.some(l => l.startsWith('5.2')) || b.cls === '5.2';
        if (aIs52 && !bIs52) {
          const incompatibleWith52 = ['2.1', '2.2', '2.3', '3', '4.1', '4.2', '4.3', '5.1', '7', '8', '9'];
          if (b.labels.some(l => incompatibleWith52.some(incomp => l.startsWith(incomp)))) {
            violations.push(`ADR 7.5.2.1: Interdicție încărcare în comun între Peroxizi Organici (Clasa 5.2 - ${a.un}) și mărfuri din Clasa ${b.cls} (${b.un}).`);
          }
        } else if (bIs52 && !aIs52) {
          const incompatibleWith52 = ['2.1', '2.2', '2.3', '3', '4.1', '4.2', '4.3', '5.1', '7', '8', '9'];
          if (a.labels.some(l => incompatibleWith52.some(incomp => l.startsWith(incomp)))) {
            violations.push(`ADR 7.5.2.1: Interdicție încărcare în comun între Peroxizi Organici (Clasa 5.2 - ${b.un}) și mărfuri din Clasa ${a.cls} (${a.un}).`);
          }
        }
      }
    }

    return Array.from(new Set(violations));
  }

  /**
   * Precautions with respect to foodstuffs, consumption articles and animal feedstuffs (ADR 7.5.4)
   */
  public static checkFoodSeparation(lines: AdrCalculationLine[], rawItems?: any[]): string[] {
    const warnings: string[] = [];

    // Check if any cargo item bears danger label 6.1, 6.2 or toxic Class 9 UNs (2212, 2590, 3151, 3152, 3245, 3432)
    const toxicUnNumbers = ['UN 2212', 'UN 2590', 'UN 3151', 'UN 3152', 'UN 3245', 'UN 3432'];
    const toxicLines = lines.filter(l => 
      l.adrClass.startsWith('6.1') || l.adrClass.startsWith('6.2') ||
      l.dangerLabels.includes('6.1') || l.dangerLabels.includes('6.2') ||
      toxicUnNumbers.includes(l.unNumber)
    );

    if (toxicLines.length > 0) {
      // Check if food, feed, or consumption items are in the shipment
      const hasFoodItem = (rawItems || []).some(item => {
        const desc = String(item.description || item.properShippingName || '').toLowerCase();
        return desc.includes('food') || desc.includes('aliment') || desc.includes('mancare') || desc.includes('cereale') || desc.includes('furaj') || desc.includes('beverage');
      });

      if (hasFoodItem) {
        warnings.push(
          `ADR 7.5.4: Interdicție încărcare în vecinătate! Coletele purtând etichete 6.1 (toxice), 6.2 (infecțioase) sau Clasa 9 (${toxicLines.map(t => t.unNumber).join(', ')}) nu pot fi așezate în imediata apropiere a produselor alimentare sau furajelor fără perete despărțitor etanș sau distanță minimă de separare de 0,8 m.`
        );
      }
    }

    return warnings;
  }
}
