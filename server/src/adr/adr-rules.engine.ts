/**
 * HapCargo TMS — ADR Rules & Calculation Engine
 * 
 * Normative Reference: UNECE ADR 2025 (ECE/TRANS/352)
 * Chapters:
 *  - 1.1.3.6: Exemptions related to quantities carried per transport unit (1,000-Point Rule)
 *  - 3.4: Dangerous goods packed in limited quantities (LQ)
 *  - 3.5: Dangerous goods packed in excepted quantities (EQ)
 *  - 3.3: Special Provisions (e.g. SP 188 for Lithium Batteries)
 *  - 5.4: Documentation (Transport Document Declaration)
 *  - 7.5.2: Mixed loading prohibitions
 *  - 7.5.4: Precautions with respect to foodstuffs
 *  - 8.2: Driver Training Certificate Requirements
 *  - 8.6: Tunnel restrictions
 */

export interface AdrItemInput {
  id?: string;
  unNumber: string; // e.g. "UN 1203" or "1203"
  properShippingName?: string;
  technicalName?: string;
  adrClass?: string; // "1", "2", "3", "4.1", "5.1", "6.1", "7", "8", "9"
  classificationCode?: string;
  packingGroup?: string | null; // "I", "II", "III"
  transportCategory?: number; // 0, 1, 2, 3, 4
  tunnelRestrictionCode?: string; // "(D/E)", "(E)", etc.
  dangerLabels?: string;
  quantity?: number; // quantity value
  unit?: string; // 'liters', 'kg', 'pallet', 'package', 'box', etc.
  grossMassKg?: number;
  netMassKg?: number;
  volumeLiters?: number;
  transportType?: 'packages' | 'bulk' | 'tank';
  limitedQuantity?: boolean;
  exceptedQuantity?: boolean;
  environmentalHazard?: boolean;
  waste?: boolean;
  emptyUncleaned?: boolean;
  temperatureControlled?: boolean;
  // Specific article details
  batteryDetails?: {
    chemistry?: 'lithium_ion' | 'lithium_metal' | 'sodium_ion' | 'lead_acid' | 'other';
    wattHours?: number; // for Li-ion: <= 20Wh (cell) or <= 100Wh (battery) for SP 188
    lithiumGrams?: number; // for Li-metal: <= 1g (cell) or <= 2g (battery) for SP 188
    packagingMode?: 'standalone' | 'packed_with_equipment' | 'contained_in_equipment';
    condition?: 'normal' | 'damaged_defective' | 'waste' | 'recycling';
    unTestPassed?: boolean;
  };
  aerosolDetails?: {
    capacityMl?: number; // <= 1000 ml
    flammable?: boolean;
  };
}

export interface AdrCalculationLine {
  unNumber: string;
  properShippingName: string;
  adrClass: string;
  packingGroup: string | null;
  transportCategory: number;
  transportType: 'packages' | 'bulk' | 'tank';
  quantityValue: number;
  quantityUnit: string;
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
  eligible1136: boolean;
  exemptionType: 'none' | '1.1.3.6' | 'lq' | 'eq' | 'sp188' | 'empty_uncleaned';
  driverCertRequired: boolean;
  driverSpecializationsRequired: string[]; // e.g. ['class1', 'class7', 'tanks']
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
  tunnelProhibitions: string[];
}

export class AdrRulesEngine {
  /**
   * Returns standard multiplier factor according to ADR 1.1.3.6.4
   *  - Transport Category 0: factor = N/A (cannot use 1.1.3.6, multiplier 0 for calculation but flag as blocking)
   *  - Transport Category 1: factor = 50 (or 20 for special substances e.g. UN 0081, 0082, 0084, 0241, 0331, 0332, 0482, 1005, 1017)
   *  - Transport Category 2: factor = 3
   *  - Transport Category 3: factor = 1
   *  - Transport Category 4: factor = 0
   */
  public static getMultiplier(transportCategory: number, unNumber: string): number {
    const un = unNumber.replace(/\D/g, '');
    if (transportCategory === 0) return 0; // Handled separately as ineligible
    if (transportCategory === 1) {
      // Special substances in Category 1 with factor 20 (max quantity 50)
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
   * Normalizes UN number to "UN XXXX"
   */
  public static normalizeUnNumber(un: string): string {
    if (!un) return '';
    const digits = un.replace(/\D/g, '').padStart(4, '0');
    return `UN ${digits}`;
  }

  /**
   * Evaluates Special Provision 188 for Lithium Batteries (UN 3480, 3481, 3090, 3091)
   */
  public static evaluateSp188(item: AdrItemInput): { isExempt: boolean; reason?: string; needsVerification?: boolean } {
    const normUN = this.normalizeUnNumber(item.unNumber);
    const isLithium = ['UN 3480', 'UN 3481', 'UN 3090', 'UN 3091'].includes(normUN);
    if (!isLithium) return { isExempt: false };

    const details = item.batteryDetails;
    if (!details) {
      return {
        isExempt: false,
        needsVerification: true,
        reason: 'Detalii baterie litiu lipsă (Wh / g Li, stare, ambalare) — verificare necesară.',
      };
    }

    // Damaged or defective batteries (SP 376) CANNOT use SP 188
    if (details.condition === 'damaged_defective') {
      return {
        isExempt: false,
        reason: 'Baterii deteriorate/defecte (ADR SP 376) — supuse regimului complet ADR și ambalare P908/LP904.',
      };
    }

    // Waste batteries for disposal or recycling (SP 377) CANNOT use SP 188
    if (details.condition === 'waste' || details.condition === 'recycling' || item.waste) {
      return {
        isExempt: false,
        reason: 'Baterii deșeu/reciclare (ADR SP 377) — marcate "LITHIUM BATTERIES FOR DISPOSAL/RECYCLING".',
      };
    }

    // Lithium Ion (UN 3480, UN 3481) -> Wh threshold: battery <= 100 Wh, cell <= 20 Wh
    if (normUN === 'UN 3480' || normUN === 'UN 3481') {
      if (details.wattHours !== undefined && details.wattHours > 0) {
        if (details.wattHours <= 100) {
          return {
            isExempt: true,
            reason: `Scutire ADR SP 188 verificată: Baterie Li-ion <= 100 Wh (${details.wattHours} Wh). Nu necesită certificat ADR șofer și nici plăci portocalii.`,
          };
        } else {
          return {
            isExempt: false,
            reason: `Capacitate ${details.wattHours} Wh depășește limita de 100 Wh pentru SP 188. Regim complet ADR aplicabil.`,
          };
        }
      }
    }

    // Lithium Metal (UN 3090, UN 3091) -> Li content threshold: battery <= 2 g, cell <= 1 g
    if (normUN === 'UN 3090' || normUN === 'UN 3091') {
      if (details.lithiumGrams !== undefined && details.lithiumGrams > 0) {
        if (details.lithiumGrams <= 2) {
          return {
            isExempt: true,
            reason: `Scutire ADR SP 188 verificată: Baterie Li-metal <= 2 g Li (${details.lithiumGrams} g).`,
          };
        } else {
          return {
            isExempt: false,
            reason: `Conținut de litiu ${details.lithiumGrams} g depășește limita de 2 g pentru SP 188.`,
          };
        }
      }
    }

    return {
      isExempt: false,
      needsVerification: true,
      reason: 'Caracteristicile energetice (Wh sau g Li) nu sunt specificate cu certitudine.',
    };
  }

  /**
   * Generates official ADR 5.4 transport document text for an item
   * Example: "UN 1203 MOTOR SPIRIT, 3, PG II, (D/E), ENVIRONMENTALLY HAZARDOUS"
   */
  public static generateTransportDocLine(item: AdrItemInput, lang: 'ro' | 'en' = 'ro'): string {
    const un = this.normalizeUnNumber(item.unNumber);
    const properName = item.properShippingName || 'DANGEROUS GOODS';
    const techName = item.technicalName ? ` (${item.technicalName})` : '';
    const cls = item.adrClass || '3';
    const pg = item.packingGroup ? (lang === 'ro' ? `, GE ${item.packingGroup}` : `, PG ${item.packingGroup}`) : '';
    const tunnel = item.tunnelRestrictionCode ? `, (${item.tunnelRestrictionCode.replace(/[()]/g, '')})` : '';
    const env = item.environmentalHazard ? (lang === 'ro' ? ', PERICULOS PENTRU MEDIU' : ', ENVIRONMENTALLY HAZARDOUS') : '';
    const waste = item.waste ? (lang === 'ro' ? 'DEȘEU, ' : 'WASTE, ') : '';
    const empty = item.emptyUncleaned ? (lang === 'ro' ? 'AMBALAJ GOL, NECURĂȚAT, ' : 'EMPTY PACKAGING, UNCLEANED, ') : '';

    return `${empty}${waste}${un}, ${properName}${techName}, ${cls}${pg}${tunnel}${env}`;
  }

  /**
   * Evaluates a full list of ADR cargo items for an order or trip
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
        tunnelProhibitions: [],
      };
    }

    const lines: AdrCalculationLine[] = [];
    const verificationReasons: string[] = [];
    let totalPoints = 0;
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
      const cat = item.transportCategory !== undefined ? Number(item.transportCategory) : 3;
      const transportType = item.transportType || 'packages';
      const pg = item.packingGroup || null;

      if (transportType === 'tank' || transportType === 'bulk') {
        containsTankOrBulk = true;
      }

      // Check specializations
      if (cls.startsWith('1')) specializationsNeeded.add('class1');
      if (cls.startsWith('7')) specializationsNeeded.add('class7');
      if (transportType === 'tank') {
        specializationsNeeded.add('tanks');
        vehicleTypesNeeded.add(cls.startsWith('3') || cls.includes('2.1') ? 'FL' : 'AT');
      }
      if (cls.startsWith('1')) {
        vehicleTypesNeeded.add('EX/II or EX/III');
      }

      // Tunnel restriction evaluation
      const tunnel = String(item.tunnelRestrictionCode || '').replace(/[()]/g, '').trim().toUpperCase();
      if (tunnel === 'E') tunnelProhibitions.push(`${normUN} (Cod Tunel E: interzis categoria E)`);
      if (tunnel.includes('B') || tunnel.includes('C') || tunnel.includes('D')) {
        tunnelProhibitions.push(`${normUN} (Restricție Tunel ${tunnel})`);
      }

      // Check SP 188 for lithium batteries
      const sp188Check = this.evaluateSp188(item);
      if (sp188Check.needsVerification) {
        requiresHumanVerification = true;
        verificationReasons.push(`${normUN}: ${sp188Check.reason}`);
      }

      let exemptionApplied: 'none' | '1.1.3.6' | 'lq' | 'eq' | 'sp188' | 'empty_uncleaned' = 'none';
      let exemptionReason: string | undefined;

      if (sp188Check.isExempt) {
        exemptionApplied = 'sp188';
        exemptionReason = sp188Check.reason;
      } else {
        allAreSp188 = false;
      }

      // Check Limited Quantities (ADR 3.4)
      if (item.limitedQuantity) {
        exemptionApplied = 'lq';
        exemptionReason = 'Transport conform ADR 3.4 (Cantități Limitate / LQ)';
      } else {
        allAreLq = false;
      }

      // Check Excepted Quantities (ADR 3.5)
      if (item.exceptedQuantity) {
        exemptionApplied = 'eq';
        exemptionReason = 'Transport conform ADR 3.5 (Cantități Exceptate / EQ)';
      } else {
        allAreEq = false;
      }

      // Calculate quantity per ADR 1.1.3.6.3
      // For liquids: liters; for solids / gases: kg
      let qty = 0;
      let qtyUnit = 'kg';

      if (item.volumeLiters && item.volumeLiters > 0) {
        qty = item.volumeLiters;
        qtyUnit = 'L';
      } else if (item.netMassKg && item.netMassKg > 0) {
        qty = item.netMassKg;
        qtyUnit = 'kg';
      } else if (item.grossMassKg && item.grossMassKg > 0) {
        qty = item.grossMassKg;
        qtyUnit = 'kg';
      } else if (item.quantity && item.quantity > 0) {
        qty = item.quantity;
        qtyUnit = item.unit || 'buc';
      }

      if (qty <= 0 && exemptionApplied === 'none') {
        requiresHumanVerification = true;
        verificationReasons.push(`${normUN}: Cantitatea sau masa netă/litri nu este specificată pentru calculul ADR.`);
      }

      // Calculate points
      let multiplier = this.getMultiplier(cat, normUN);
      let points = 0;
      let isCat0 = cat === 0;

      if (isCat0) {
        containsCategory0 = true;
        multiplier = 0;
        points = 0;
      } else if (exemptionApplied === 'none') {
        points = Math.round(qty * multiplier * 100) / 100;
        totalPoints += points;
      }

      const declarationLine = this.generateTransportDocLine(item, 'ro');

      lines.push({
        unNumber: normUN,
        properShippingName: item.properShippingName || 'MARFĂ PERICULOASĂ',
        adrClass: cls,
        packingGroup: pg,
        transportCategory: cat,
        transportType,
        quantityValue: qty,
        quantityUnit: qtyUnit,
        multiplier,
        points,
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
    const classesPresent = new Set(lines.map(l => l.adrClass.charAt(0)));
    const hasToxicOrCorrosive = classesPresent.has('6') || classesPresent.has('8');

    // 1.1.3.6 Eligibility: Must NOT contain Cat 0, must NOT be tank/bulk
    const eligible1136 = !containsCategory0 && !containsTankOrBulk && !requiresHumanVerification;
    const isExempt1136 = eligible1136 && totalPoints <= 1000;

    // Determine final status
    let status: AdrEvaluationResult['status'] = 'confirmed_full_adr';
    let statusLabelRo = 'ADR — Cerințe aplicabile confirmate (Regim Complet)';
    let statusLabelEn = 'ADR — Full Requirements Confirmed';
    let badgeCode = 'ADR_FULL';
    let badgeLevel: AdrEvaluationResult['badgeLevel'] = 'danger';
    let finalExemptionType: AdrEvaluationResult['exemptionType'] = 'none';

    if (requiresHumanVerification) {
      status = 'needs_review';
      statusLabelRo = 'ADR — Necesită verificare ADR (date insuficiente)';
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
      statusLabelRo = 'ADR — Regim complet (Conține Categoria 0)';
      statusLabelEn = 'ADR — Full Rules (Contains Category 0)';
      badgeCode = 'ADR_CAT0';
      badgeLevel = 'danger';
    } else if (containsTankOrBulk) {
      status = 'confirmed_full_adr';
      statusLabelRo = 'ADR — Regim complet (Transport în cisternă/vrac)';
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
    // EXEMPT if under verified 1.1.3.6 exemption, LQ, EQ, or SP 188!
    const isExemptFromDriverCert = isExempt1136 || allAreLq || allAreEq || allAreSp188;
    const driverCertRequired = !isExemptFromDriverCert && !requiresHumanVerification;

    // Orange plates:
    const orangePlatesRequired = !isExemptFromDriverCert && !requiresHumanVerification;

    // Written instructions (ADR 5.4.3):
    const instructionsInWritingRequired = !isExemptFromDriverCert;

    // Fire extinguisher requirement:
    // ADR 8.1.4.2: Under 1.1.3.6 -> 1 x 2kg extinguisher
    // Full ADR: >= 7.5 tonnes -> 12kg total (with at least one 6kg); 3.5 - 7.5t -> 8kg; <= 3.5t -> 4kg.
    const fireExtinguisherMinimumKg = isExemptFromDriverCert ? 2 : 12;

    // Build transport document text
    const docLines = lines.map((l, i) => `${i + 1}. ${l.declarationLine} | Cantitate: ${l.quantityValue} ${l.quantityUnit}${l.points > 0 ? ` [${l.points} pct ADR 1.1.3.6]` : ''}`);
    if (isExempt1136) {
      docLines.push(`Calcul conform ADR 1.1.3.6: Valoare totală calculată = ${totalPoints} puncte (Sub limita de 1.000 puncte — Scutire parțială aplicată).`);
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
      tunnelProhibitions: Array.from(new Set(tunnelProhibitions)),
    };
  }

  /**
   * Mixed loading prohibition verification according to ADR 7.5.2
   */
  public static checkMixedLoading(lines: AdrCalculationLine[]): string[] {
    const violations: string[] = [];
    const classes = new Set(lines.map(l => l.adrClass.trim()));

    // Class 1 (Explosives) cannot be loaded with Class 2, 3, 4, 5, 7, 8, 9
    const hasClass1 = Array.from(classes).some(c => c.startsWith('1'));
    if (hasClass1) {
      const incompatibleWithClass1 = Array.from(classes).filter(c => 
        c.startsWith('2') || c.startsWith('3') || c.startsWith('4') || 
        c.startsWith('5') || c.startsWith('7') || c.startsWith('8') || c.startsWith('9')
      );
      if (incompatibleWithClass1.length > 0) {
        violations.push(`ADR 7.5.2: Interdicție de încărcare în comun! Substanțele din Clasa 1 (Explozivi) nu pot fi transportate în aceeași unitate de transport cu mărfuri din Clasa ${incompatibleWithClass1.join(', ')}.`);
      }
    }

    // Class 4.1 + Class 5.1 / 5.2 (Flammable solids + Oxidizers / Organic peroxides)
    const has41 = Array.from(classes).some(c => c === '4.1');
    const has5 = Array.from(classes).some(c => c.startsWith('5'));
    if (has41 && has5) {
      violations.push('ADR 7.5.2: Interdicție încărcare în comun între substanțe solide inflamabile (Clasa 4.1) și substanțe oxidante/peroxizi organici (Clasa 5).');
    }

    return violations;
  }
}
