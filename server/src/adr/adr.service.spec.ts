import { AdrRulesEngine, AdrItemInput } from './adr-rules.engine';
import { OFFICIAL_ADR_2025_TABLE_A, getCatalogChecksum } from './adr-data';
import { validateAdrMatrix } from '../planning/validate-adr-matrix';

describe('ADR System — Definitive UNECE ADR 2025 Engine & Compliance Test Suite', () => {

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. NON-ADR & REGULAR ORDERS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('1. Non-ADR Shipments', () => {
    it('should correctly flag order as non-ADR when no hazardous goods are present', () => {
      const result = AdrRulesEngine.evaluateCargo([]);
      expect(result.isAdr).toBe(false);
      expect(result.status).toBe('none');
      expect(result.totalPoints).toBe(0);
      expect(result.driverCertRequired).toBe(false);
      expect(result.orangePlatesRequired).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. 1,000-POINT RULE (ADR 1.1.3.6) MULTIPLIERS & CALCULATION
  // ═══════════════════════════════════════════════════════════════════════════
  describe('2. ADR 1.1.3.6 Calculation & Multipliers', () => {
    it('should calculate points correctly for Transport Category 1 with factor 50', () => {
      // 10 kg of Category 1 substance (e.g. UN 1689 Sodium Cyanide PG I)
      const items: AdrItemInput[] = [
        {
          unNumber: 'UN 1689',
          adrClass: '6.1',
          packingGroup: 'I',
          transportCategory: 1,
          quantity: 10,
          grossMassKg: 10,
        },
      ];
      const result = AdrRulesEngine.evaluateCargo(items);
      expect(result.lines[0].multiplier).toBe(50);
      expect(result.lines[0].points).toBe(500); // 10 * 50 = 500
      expect(result.totalPoints).toBe(500);
      expect(result.eligible1136).toBe(true);
      expect(result.status).toBe('exempt_1136');
      expect(result.driverCertRequired).toBe(false); // Exempt from driver cert!
      expect(result.fireExtinguisherMinimumKg).toBe(2); // 1 x 2kg extinguisher
    });

    it('should calculate points correctly for Transport Category 2 with factor 3', () => {
      // 200 Litres of Category 2 (e.g. UN 1203 Gasoline PG II)
      const items: AdrItemInput[] = [
        {
          unNumber: 'UN 1203',
          properShippingName: 'GASOLINE',
          adrClass: '3',
          packingGroup: 'II',
          transportCategory: 2,
          volumeLiters: 200,
        },
      ];
      const result = AdrRulesEngine.evaluateCargo(items);
      expect(result.lines[0].multiplier).toBe(3);
      expect(result.lines[0].points).toBe(600); // 200 * 3 = 600
      expect(result.totalPoints).toBe(600);
      expect(result.status).toBe('exempt_1136');
      expect(result.driverCertRequired).toBe(false);
    });

    it('should calculate points correctly for Transport Category 3 with factor 1', () => {
      // 800 Litres of Category 3 (e.g. UN 1202 Diesel Fuel PG III)
      const items: AdrItemInput[] = [
        {
          unNumber: 'UN 1202',
          properShippingName: 'DIESEL FUEL',
          adrClass: '3',
          packingGroup: 'III',
          transportCategory: 3,
          volumeLiters: 800,
        },
      ];
      const result = AdrRulesEngine.evaluateCargo(items);
      expect(result.lines[0].multiplier).toBe(1);
      expect(result.lines[0].points).toBe(800); // 800 * 1 = 800
      expect(result.totalPoints).toBe(800);
      expect(result.status).toBe('exempt_1136');
      expect(result.driverCertRequired).toBe(false);
    });

    it('should calculate points correctly for Transport Category 4 with factor 0', () => {
      // Category 4 goods (e.g. UN 0012 small arms cartridges 1.4S)
      const items: AdrItemInput[] = [
        {
          unNumber: 'UN 0012',
          adrClass: '1',
          classificationCode: '1.4S',
          transportCategory: 4,
          quantity: 500,
          grossMassKg: 500,
        },
      ];
      const result = AdrRulesEngine.evaluateCargo(items);
      expect(result.lines[0].multiplier).toBe(0);
      expect(result.lines[0].points).toBe(0);
      expect(result.totalPoints).toBe(0);
      expect(result.status).toBe('exempt_1136');
      expect(result.driverCertRequired).toBe(false);
    });

    it('should calculate composite multi-line order and trigger full ADR when sum > 1,000 points', () => {
      // Line 1: Cat 2, 200 L * 3 = 600 points
      // Line 2: Cat 3, 500 L * 1 = 500 points
      // Total = 1,100 points (> 1,000 threshold) -> Full ADR applies!
      const items: AdrItemInput[] = [
        {
          unNumber: 'UN 1203',
          adrClass: '3',
          packingGroup: 'II',
          transportCategory: 2,
          volumeLiters: 200,
        },
        {
          unNumber: 'UN 1202',
          adrClass: '3',
          packingGroup: 'III',
          transportCategory: 3,
          volumeLiters: 500,
        },
      ];
      const result = AdrRulesEngine.evaluateCargo(items);
      expect(result.totalPoints).toBe(1100);
      expect(result.status).toBe('confirmed_full_adr');
      expect(result.badgeCode).toBe('ADR_OVER1000');
      expect(result.driverCertRequired).toBe(true); // Full ADR requires certified driver
      expect(result.orangePlatesRequired).toBe(true);
      expect(result.fireExtinguisherMinimumKg).toBe(12);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. INELIGIBILITY & SPECIAL TRANSPORT CASES
  // ═══════════════════════════════════════════════════════════════════════════
  describe('3. Ineligibility for 1.1.3.6 (Category 0 & Tanks)', () => {
    it('should reject 1.1.3.6 exemption if any Category 0 item is present', () => {
      const items: AdrItemInput[] = [
        {
          unNumber: 'UN 0004',
          adrClass: '1',
          transportCategory: 0,
          grossMassKg: 1,
        },
      ];
      const result = AdrRulesEngine.evaluateCargo(items);
      expect(result.eligible1136).toBe(false);
      expect(result.status).toBe('confirmed_full_adr');
      expect(result.driverCertRequired).toBe(true);
      expect(result.badgeCode).toBe('ADR_CAT0');
    });

    it('should reject 1.1.3.6 exemption when dangerous goods are transported in a tank', () => {
      const items: AdrItemInput[] = [
        {
          unNumber: 'UN 1202',
          adrClass: '3',
          transportCategory: 3,
          transportType: 'tank', // In tank -> 1.1.3.6 does not apply!
          volumeLiters: 500,
        },
      ];
      const result = AdrRulesEngine.evaluateCargo(items);
      expect(result.eligible1136).toBe(false);
      expect(result.status).toBe('confirmed_full_adr');
      expect(result.badgeCode).toBe('ADR_TANK');
      expect(result.driverCertRequired).toBe(true);
      expect(result.driverSpecializationsRequired).toContain('tanks');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. LIMITED QUANTITIES (ADR 3.4) & EXCEPTED QUANTITIES (ADR 3.5)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('4. Limited (LQ) & Excepted (EQ) Quantities', () => {
    it('should recognize ADR 3.4 Limited Quantities exemption', () => {
      const items: AdrItemInput[] = [
        {
          unNumber: 'UN 1950',
          properShippingName: 'AEROSOLS',
          adrClass: '2',
          limitedQuantity: true,
          quantity: 20,
        },
      ];
      const result = AdrRulesEngine.evaluateCargo(items);
      expect(result.status).toBe('limited_quantity');
      expect(result.exemptionType).toBe('lq');
      expect(result.driverCertRequired).toBe(false); // Exempt from driver cert
      expect(result.orangePlatesRequired).toBe(false);
    });

    it('should recognize ADR 3.5 Excepted Quantities exemption', () => {
      const items: AdrItemInput[] = [
        {
          unNumber: 'UN 1170',
          properShippingName: 'ETHANOL SOLUTION',
          adrClass: '3',
          exceptedQuantity: true,
          quantity: 10,
        },
      ];
      const result = AdrRulesEngine.evaluateCargo(items);
      expect(result.status).toBe('excepted_quantity');
      expect(result.exemptionType).toBe('eq');
      expect(result.driverCertRequired).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. BATTERIES & SPECIAL PROVISION 188 (UN 3480 / 3481)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('5. Lithium Batteries & SP 188 Logic', () => {
    it('should grant SP 188 exemption when lithium-ion batteries are <= 100 Wh', () => {
      const items: AdrItemInput[] = [
        {
          unNumber: 'UN 3480',
          properShippingName: 'LITHIUM ION BATTERIES',
          adrClass: '9',
          transportCategory: 2,
          quantity: 50,
          grossMassKg: 100,
          batteryDetails: {
            cellOrBattery: 'battery',
            chemistry: 'lithium_ion',
            wattHours: 65, // <= 100 Wh -> exempt for battery!
            condition: 'normal',
            packagingMode: 'standalone',
            unTestPassed: true,
            packageGrossMassKg: 10,
          },
        },
      ];
      const result = AdrRulesEngine.evaluateCargo(items);
      expect(result.status).toBe('special_exemption');
      expect(result.exemptionType).toBe('sp188');
      expect(result.driverCertRequired).toBe(false);
      expect(result.orangePlatesRequired).toBe(false);
    });

    it('should require full ADR when lithium-ion batteries exceed 100 Wh', () => {
      const items: AdrItemInput[] = [
        {
          unNumber: 'UN 3480',
          properShippingName: 'LITHIUM ION BATTERIES',
          adrClass: '9',
          transportCategory: 2,
          quantity: 10,
          grossMassKg: 200,
          batteryDetails: {
            chemistry: 'lithium_ion',
            wattHours: 450, // > 100 Wh -> full ADR!
            condition: 'normal',
            packagingMode: 'standalone',
          },
        },
      ];
      const result = AdrRulesEngine.evaluateCargo(items);
      expect(result.lines[0].exemptionApplied).toBe('none');
      expect(result.lines[0].points).toBe(600); // 200 * 3 = 600 pts
    });

    it('should forbid SP 188 and mandate human review/full ADR for damaged/defective batteries (SP 376)', () => {
      const items: AdrItemInput[] = [
        {
          unNumber: 'UN 3480',
          properShippingName: 'LITHIUM ION BATTERIES',
          adrClass: '9',
          transportCategory: 2,
          grossMassKg: 50,
          batteryDetails: {
            chemistry: 'lithium_ion',
            wattHours: 50,
            condition: 'damaged_defective', // SP 376 applies
          },
        },
      ];
      const result = AdrRulesEngine.evaluateCargo(items);
      expect(result.lines[0].exemptionApplied).toBe('none');
    });

    it('should flag "needs_review" when battery energy details are missing', () => {
      const items: AdrItemInput[] = [
        {
          unNumber: 'UN 3480',
          properShippingName: 'LITHIUM ION BATTERIES',
          adrClass: '9',
          transportCategory: 2,
          quantity: 10,
          // batteryDetails omitted
        },
      ];
      const result = AdrRulesEngine.evaluateCargo(items);
      expect(result.status).toBe('needs_review');
      expect(result.requiresVerification).toBe(true);
      expect(result.verificationReasons.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. OFFICIAL ADR 5.4 TRANSPORT DOCUMENT LINE GENERATION
  // ═══════════════════════════════════════════════════════════════════════════
  describe('6. Official Transport Document Line (ADR 5.4.1.1.1)', () => {
    it('should format standard hazardous declaration in official sequence', () => {
      const line = AdrRulesEngine.generateTransportDocLine({
        unNumber: 'UN 1203',
        properShippingName: 'BENZINĂ',
        adrClass: '3',
        packingGroup: 'II',
        tunnelRestrictionCode: '(D/E)',
        environmentalHazard: true,
      }, 'ro');

      expect(line).toContain('UN 1203, BENZINĂ, 3, GE II, (D/E), PERICULOS PENTRU MEDIU');
    });

    it('should include technical name in parentheses when required (SP 274)', () => {
      const line = AdrRulesEngine.generateTransportDocLine({
        unNumber: 'UN 1993',
        properShippingName: 'LICHID INFLAMABIL, N.S.A.',
        technicalName: 'conține etanol și acetonă',
        adrClass: '3',
        packingGroup: 'II',
        tunnelRestrictionCode: '(D/E)',
      }, 'ro');

      expect(line).toContain('UN 1993, LICHID INFLAMABIL, N.S.A. (conține etanol și acetonă), 3, GE II, (D/E)');
    });

    it('should prefix with "DEȘEU" when transporting hazardous waste (ADR 5.4.1.1.3)', () => {
      const line = AdrRulesEngine.generateTransportDocLine({
        unNumber: 'UN 1263',
        properShippingName: 'VOPSELE',
        adrClass: '3',
        packingGroup: 'II',
        waste: true,
      }, 'ro');

      expect(line).toContain('DEȘEU, UN 1263, VOPSELE, 3, GE II');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. CATALOG INTEGRITY & SHA-256 REPRODUCIBILITY
  // ═══════════════════════════════════════════════════════════════════════════
  describe('7. Catalog Data Integrity', () => {
    it('should provide authentic official ADR 2025 Table A items with deterministic hash', () => {
      expect(OFFICIAL_ADR_2025_TABLE_A.length).toBeGreaterThan(20);
      const hash = getCatalogChecksum(OFFICIAL_ADR_2025_TABLE_A);
      expect(hash).toBeDefined();
      expect(hash.length).toBe(64); // SHA-256 hex string
    });

    it('should verify all seed items have valid UN numbers, class, and transport category', () => {
      for (const item of OFFICIAL_ADR_2025_TABLE_A) {
        expect(item.unNumber).toMatch(/^UN \d{4}$/);
        expect(item.unNumberNumeric).toBeGreaterThan(0);
        expect(item.properShippingNameEn).toBeTruthy();
        expect(item.properShippingNameRo).toBeTruthy();
        expect(item.adrClass).toBeTruthy();
        expect([0, 1, 2, 3, 4]).toContain(item.transportCategory);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. NORMATIVE QUANTITIES & UNITS (ADR 1.1.3.6.3)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('8. Normative Quantities & Units (ADR 1.1.3.6.3)', () => {
    it('should require and compute Class 1 using Net Explosive Mass (NEM) in kg', () => {
      // UN 0336 Fireworks 1.4G, Cat 2 (factor 3)
      // Package gross mass = 50 kg, but NEM = 15 kg
      const items: AdrItemInput[] = [
        {
          unNumber: 'UN 0336',
          adrClass: '1',
          classificationCode: '1.4G',
          transportCategory: 2,
          grossMassKg: 50,
          netExplosiveMassKg: 15,
        },
      ];
      const result = AdrRulesEngine.evaluateCargo(items);
      expect(result.lines[0].normativeQuantityType).toBe('net_explosive_mass');
      expect(result.lines[0].quantityValue).toBe(15);
      expect(result.lines[0].points).toBe(45); // 15 kg NEM * 3 = 45 points (NOT 50 kg gross * 3 = 150!)
      expect(result.lines[0].quantityUnit).toBe('kg NEM');
      expect(result.eligible1136).toBe(true);
    });

    it('should flag verification when Class 1 lacks NEM net explosive mass', () => {
      const items: AdrItemInput[] = [
        {
          unNumber: 'UN 0336',
          adrClass: '1',
          classificationCode: '1.4G',
          transportCategory: 2,
          grossMassKg: 50, // NEM omitted
        },
      ];
      const result = AdrRulesEngine.evaluateCargo(items);
      expect(result.requiresVerification).toBe(true);
      expect(result.status).toBe('needs_review');
      expect(result.verificationReasons.some(r => r.includes('NEM'))).toBe(true);
    });

    it('should require and compute Compressed Gases using receptacle water capacity in litres', () => {
      // UN 1046 Helium compressed 1A, Cat 3 (factor 1)
      const items: AdrItemInput[] = [
        {
          unNumber: 'UN 1046',
          adrClass: '2',
          classificationCode: '1A',
          transportCategory: 3,
          receptacleCapacityLiters: 50, // 50 L water capacity
        },
      ];
      const result = AdrRulesEngine.evaluateCargo(items);
      expect(result.lines[0].normativeQuantityType).toBe('water_capacity');
      expect(result.lines[0].quantityValue).toBe(50);
      expect(result.lines[0].points).toBe(50); // 50 * 1 = 50 pts
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. CATEGORY 1 NOTE (A) FACTOR 20 VS FACTOR 50
  // ═══════════════════════════════════════════════════════════════════════════
  describe('9. Category 1 Multipliers: Note (a) Factor 20 vs Factor 50', () => {
    it('should apply factor 20 strictly to statutory Note (a) substances: UN 1005 (Ammonia)', () => {
      const items: AdrItemInput[] = [
        {
          unNumber: 'UN 1005',
          properShippingName: 'AMMONIA, ANHYDROUS',
          adrClass: '2',
          transportCategory: 1,
          netMassKg: 20,
        },
      ];
      const result = AdrRulesEngine.evaluateCargo(items);
      expect(result.lines[0].multiplier).toBe(20);
      expect(result.lines[0].points).toBe(400); // 20 * 20 = 400 pts
      expect(result.totalPoints).toBe(400);
      expect(result.status).toBe('exempt_1136');
    });

    it('should apply factor 20 strictly to statutory Note (a) substances: UN 1017 (Chlorine)', () => {
      const items: AdrItemInput[] = [
        {
          unNumber: 'UN 1017',
          properShippingName: 'CHLORINE',
          adrClass: '2',
          transportCategory: 1,
          netMassKg: 15,
        },
      ];
      const result = AdrRulesEngine.evaluateCargo(items);
      expect(result.lines[0].multiplier).toBe(20);
      expect(result.lines[0].points).toBe(300); // 15 * 20 = 300 pts
    });

    it('should apply factor 50 to standard Category 1 substances (e.g. UN 1689)', () => {
      const items: AdrItemInput[] = [
        {
          unNumber: 'UN 1689',
          adrClass: '6.1',
          transportCategory: 1,
          netMassKg: 20,
        },
      ];
      const result = AdrRulesEngine.evaluateCargo(items);
      expect(result.lines[0].multiplier).toBe(50);
      expect(result.lines[0].points).toBe(1000); // 20 * 50 = 1000 pts
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. EMPTY UNCLEANED PACKAGINGS REMAPPING (ADR 1.1.3.6.3)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('10. Empty Uncleaned Packagings (ADR 1.1.3.6.3)', () => {
    it('should remap empty uncleaned packagings of Category 1, 2, or 3 to Transport Category 4 (factor 0)', () => {
      // Empty uncleaned drums that contained Diesel (Cat 3, multiplier 1)
      const items: AdrItemInput[] = [
        {
          unNumber: 'UN 1202',
          properShippingName: 'DIESEL FUEL',
          adrClass: '3',
          packingGroup: 'III',
          transportCategory: 3,
          emptyUncleaned: true,
          quantity: 20,
          grossMassKg: 200,
        },
      ];
      const result = AdrRulesEngine.evaluateCargo(items);
      expect(result.lines[0].transportCategory).toBe(3);
      expect(result.lines[0].effectiveTransportCategory).toBe(4); // Remapped to Cat 4!
      expect(result.lines[0].multiplier).toBe(0);
      expect(result.lines[0].points).toBe(0);
      expect(result.totalPoints).toBe(0);
      expect(result.status).toBe('exempt_1136');
      expect(result.driverCertRequired).toBe(false);
    });

    it('should NOT remap empty uncleaned packagings of Category 0 (remains Cat 0, full ADR mandatory)', () => {
      const items: AdrItemInput[] = [
        {
          unNumber: 'UN 0004',
          adrClass: '1',
          transportCategory: 0,
          emptyUncleaned: true,
          quantity: 5,
        },
      ];
      const result = AdrRulesEngine.evaluateCargo(items);
      expect(result.lines[0].effectiveTransportCategory).toBe(0); // Remains Cat 0!
      expect(result.lines[0].isCategory0).toBe(true);
      expect(result.lines[0].points).toBe(Infinity);
      expect(result.eligible1136).toBe(false);
      expect(result.status).toBe('confirmed_full_adr');
      expect(result.driverCertRequired).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. LITHIUM BATTERIES GRANULAR NORMATIVE AUDIT (SP 188 / 376 / 377)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('11. Lithium Batteries Granular Normative Verification', () => {
    it('should exempt a lithium-ion CELL <= 20 Wh under SP 188 (a)', () => {
      const items: AdrItemInput[] = [
        {
          unNumber: 'UN 3480',
          adrClass: '9',
          transportCategory: 2,
          batteryDetails: {
            cellOrBattery: 'cell',
            chemistry: 'lithium_ion',
            wattHours: 18, // <= 20 Wh -> exempt
            condition: 'normal',
            packagingMode: 'standalone',
            unTestPassed: true,
            packageGrossMassKg: 5,
          },
        },
      ];
      const result = AdrRulesEngine.evaluateCargo(items);
      expect(result.status).toBe('special_exemption');
      expect(result.exemptionType).toBe('sp188');
      expect(result.driverCertRequired).toBe(false);
    });

    it('should REJECT a lithium-ion CELL > 20 Wh from SP 188 even if <= 100 Wh', () => {
      const items: AdrItemInput[] = [
        {
          unNumber: 'UN 3480',
          adrClass: '9',
          transportCategory: 2,
          quantity: 10,
          netMassKg: 10,
          batteryDetails: {
            cellOrBattery: 'cell',
            chemistry: 'lithium_ion',
            wattHours: 45, // > 20 Wh! For cell, this exceeds SP 188 limit
            condition: 'normal',
            packagingMode: 'standalone',
            unTestPassed: true,
          },
        },
      ];
      const result = AdrRulesEngine.evaluateCargo(items);
      expect(result.lines[0].exemptionApplied).toBe('none');
      expect(result.lines[0].points).toBe(30); // 10 * 3 = 30 pts under 1.1.3.6
    });

    it('should exempt a lithium-ion BATTERY <= 100 Wh under SP 188 (b)', () => {
      const items: AdrItemInput[] = [
        {
          unNumber: 'UN 3480',
          adrClass: '9',
          transportCategory: 2,
          batteryDetails: {
            cellOrBattery: 'battery',
            chemistry: 'lithium_ion',
            wattHours: 85, // <= 100 Wh -> exempt
            condition: 'normal',
            packagingMode: 'standalone',
            unTestPassed: true,
            packageGrossMassKg: 15,
          },
        },
      ];
      const result = AdrRulesEngine.evaluateCargo(items);
      expect(result.status).toBe('special_exemption');
      expect(result.exemptionType).toBe('sp188');
    });

    it('should flag verification when cellOrBattery is not specified for a 50 Wh item', () => {
      const items: AdrItemInput[] = [
        {
          unNumber: 'UN 3480',
          adrClass: '9',
          transportCategory: 2,
          batteryDetails: {
            // cellOrBattery omitted!
            chemistry: 'lithium_ion',
            wattHours: 50,
            condition: 'normal',
            unTestPassed: true,
          },
        },
      ];
      const result = AdrRulesEngine.evaluateCargo(items);
      expect(result.requiresVerification).toBe(true);
      expect(result.status).toBe('needs_review');
    });

    it('should REJECT from SP 188 when UN 38.3 test failed', () => {
      const items: AdrItemInput[] = [
        {
          unNumber: 'UN 3480',
          adrClass: '9',
          transportCategory: 2,
          batteryDetails: {
            cellOrBattery: 'battery',
            chemistry: 'lithium_ion',
            wattHours: 50,
            condition: 'normal',
            unTestPassed: false, // Failed UN 38.3 test!
          },
        },
      ];
      const result = AdrRulesEngine.evaluateCargo(items);
      expect(result.lines[0].exemptionApplied).toBe('none');
      expect(result.requiresVerification).toBe(true);
    });

    it('should REJECT from SP 188 when standalone package gross mass exceeds 30 kg (SP 188 e)', () => {
      const items: AdrItemInput[] = [
        {
          unNumber: 'UN 3480',
          adrClass: '9',
          transportCategory: 2,
          batteryDetails: {
            cellOrBattery: 'battery',
            chemistry: 'lithium_ion',
            wattHours: 50,
            condition: 'normal',
            packagingMode: 'standalone',
            unTestPassed: true,
            packageGrossMassKg: 35, // Exceeds 30 kg!
          },
        },
      ];
      const result = AdrRulesEngine.evaluateCargo(items);
      expect(result.lines[0].exemptionApplied).toBe('none');
    });

    it('should strictly prohibit SP 188 for waste/recycling batteries (SP 377)', () => {
      const items: AdrItemInput[] = [
        {
          unNumber: 'UN 3480',
          adrClass: '9',
          transportCategory: 2,
          batteryDetails: {
            cellOrBattery: 'battery',
            chemistry: 'lithium_ion',
            wattHours: 30,
            condition: 'waste', // SP 377
            unTestPassed: true,
          },
        },
      ];
      const result = AdrRulesEngine.evaluateCargo(items);
      expect(result.lines[0].exemptionApplied).toBe('none');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. LIMITED (ADR 3.4) & EXCEPTED (ADR 3.5) QUANTITIES NORMATIVE RESTRICTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('12. Limited & Excepted Quantities Normative Restrictions', () => {
    it('should REJECT LQ exemption when Table A Column 7a is 0 (prohibited from LQ)', () => {
      const items: AdrItemInput[] = [
        {
          unNumber: 'UN 3480',
          adrClass: '9',
          catalogLqLimit: '0', // Col 7a '0' = forbidden
          limitedQuantity: true,
          grossMassKg: 10,
        },
      ];
      const result = AdrRulesEngine.evaluateCargo(items);
      expect(result.lines[0].exemptionApplied).toBe('none');
      expect(result.requiresVerification).toBe(true);
    });

    it('should REJECT LQ exemption when package gross mass exceeds 30 kg (ADR 3.4.2)', () => {
      const items: AdrItemInput[] = [
        {
          unNumber: 'UN 1950',
          adrClass: '2',
          catalogLqLimit: '1 L',
          limitedQuantity: true,
          packageGrossMassKg: 35, // Exceeds 30 kg!
        },
      ];
      const result = AdrRulesEngine.evaluateCargo(items);
      expect(result.lines[0].exemptionApplied).toBe('none');
      expect(result.requiresVerification).toBe(true);
    });

    it('should REJECT EQ exemption when Table A Column 7b is E0 (prohibited from EQ)', () => {
      const items: AdrItemInput[] = [
        {
          unNumber: 'UN 1203',
          adrClass: '3',
          catalogEqCode: 'E0', // Forbidden
          exceptedQuantity: true,
        },
      ];
      const result = AdrRulesEngine.evaluateCargo(items);
      expect(result.lines[0].exemptionApplied).toBe('none');
      expect(result.requiresVerification).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 13. MIXED LOADING (ADR 7.5.2) & FOOD SEPARATION (ADR 7.5.4)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('13. Mixed Loading (ADR 7.5.2) & Food Separation (ADR 7.5.4)', () => {
    it('should flag mixed loading violation between Class 1 (Explosives) and Class 3 (Flammable) per Table 7.5.2.1', () => {
      const items: AdrItemInput[] = [
        {
          unNumber: 'UN 0004',
          adrClass: '1',
          classificationCode: '1.1D',
          transportCategory: 0,
          grossMassKg: 10,
        },
        {
          unNumber: 'UN 1203',
          adrClass: '3',
          packingGroup: 'II',
          transportCategory: 2,
          volumeLiters: 100,
        },
      ];
      const result = AdrRulesEngine.evaluateCargo(items);
      expect(result.mixedLoadingViolations.length).toBeGreaterThan(0);
      expect(result.mixedLoadingViolations[0]).toContain('7.5.2.1');
    });

    it('should ALLOW mixed loading of 1.4S with other dangerous goods per Table 7.5.2.1 Note a', () => {
      const items: AdrItemInput[] = [
        {
          unNumber: 'UN 0012',
          adrClass: '1',
          classificationCode: '1.4S',
          transportCategory: 4,
          grossMassKg: 100,
        },
        {
          unNumber: 'UN 1202',
          adrClass: '3',
          packingGroup: 'III',
          transportCategory: 3,
          volumeLiters: 200,
        },
      ];
      const result = AdrRulesEngine.evaluateCargo(items);
      expect(result.mixedLoadingViolations.length).toBe(0); // 1.4S permitted!
    });

    it('should flag food contamination warning when Toxic 6.1 is co-loaded with foodstuffs per ADR 7.5.4', () => {
      const items: AdrItemInput[] = [
        {
          unNumber: 'UN 1689',
          properShippingName: 'SODIUM CYANIDE, SOLID',
          adrClass: '6.1',
          packingGroup: 'I',
          transportCategory: 1,
          netMassKg: 10,
        },
      ];
      const generalCargo = [{ description: 'Paleti faina de grau si cereale alimentare' }];
      const evalResult = AdrRulesEngine.evaluateCargo(items);
      const warnings = AdrRulesEngine.checkFoodSeparation(evalResult.lines, generalCargo);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('7.5.4');
      expect(warnings[0]).toContain('6.1');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 14. PLANNING & DISPATCH INTEGRATION: validateAdrMatrix
  // ═══════════════════════════════════════════════════════════════════════════
  describe('14. Planning & Dispatch Integration: validateAdrMatrix', () => {
    const mockTripEnd = new Date('2026-11-01T12:00:00Z');

    it('should NOT require driver ADR certificate when shipment is legally exempt (1.1.3.6 <= 1000 pts)', () => {
      const trip = {
        id: 'trip-1',
        tripNumber: 'TR-1001',
        orders: [
          {
            id: 'ord-1',
            orderNumber: 'ORD-101',
            cargoItems: [
              {
                unNumber: 'UN 1202',
                adrClass: '3',
                packingGroup: 'III',
                transportCategory: 3,
                volumeLiters: 500, // 500 points <= 1000 -> exempt
              },
            ],
          },
        ],
      };
      const truck = { id: 'trk-1', plateNumber: 'B-100-HAP', features: ['adr'] };
      const trailer = { id: 'trl-1', plateNumber: 'B-200-HAP', features: ['adr', 'extinguisher'] };
      const driver = { id: 'drv-1', name: 'Standard Driver', documents: [] }; // No ADR cert

      const conflicts = validateAdrMatrix(trip, truck, trailer, driver, mockTripEnd);
      expect(conflicts.some(c => c.code === 'DRIVER_ADR_INVALID')).toBe(false);
      expect(conflicts.some(c => c.code === 'ADR_EXEMPTION_CONFIRMED')).toBe(true);
    });

    it('should trigger blocking conflict DRIVER_ADR_INVALID when full ADR shipment driver has no ADR certificate', () => {
      const trip = {
        id: 'trip-2',
        tripNumber: 'TR-1002',
        orders: [
          {
            id: 'ord-2',
            orderNumber: 'ORD-102',
            cargoItems: [
              {
                unNumber: 'UN 1203',
                adrClass: '3',
                packingGroup: 'II',
                transportCategory: 2,
                volumeLiters: 800, // 800 * 3 = 2400 points > 1000 -> Full ADR!
              },
            ],
          },
        ],
      };
      const truck = { id: 'trk-1', plateNumber: 'B-100-HAP', features: ['adr'] };
      const trailer = { id: 'trl-1', plateNumber: 'B-200-HAP', features: ['adr', 'extinguisher'] };
      const driver = { id: 'drv-1', name: 'Uncertified Driver', documents: [] };

      const conflicts = validateAdrMatrix(trip, truck, trailer, driver, mockTripEnd);
      expect(conflicts.some(c => c.code === 'DRIVER_ADR_INVALID' && c.level === 'blocking')).toBe(true);
    });

    it('should trigger blocking conflict DRIVER_ADR_EXPIRED when driver ADR certificate expires before trip completion', () => {
      const trip = {
        id: 'trip-3',
        tripNumber: 'TR-1003',
        orders: [
          {
            id: 'ord-3',
            orderNumber: 'ORD-103',
            cargoItems: [
              {
                unNumber: 'UN 1203',
                adrClass: '3',
                packingGroup: 'II',
                transportCategory: 2,
                volumeLiters: 800,
              },
            ],
          },
        ],
      };
      const truck = { id: 'trk-1', plateNumber: 'B-100-HAP', features: ['adr'] };
      const trailer = { id: 'trl-1', plateNumber: 'B-200-HAP', features: ['adr', 'extinguisher'] };
      const driver = {
        id: 'drv-2',
        name: 'Expired Cert Driver',
        documents: [
          {
            type: 'ADR Certificate',
            expiryDate: '2026-10-15', // Expired before mockTripEnd (2026-11-01)
          },
        ],
      };

      const conflicts = validateAdrMatrix(trip, truck, trailer, driver, mockTripEnd);
      expect(conflicts.some(c => c.code === 'DRIVER_ADR_EXPIRED' && c.level === 'blocking')).toBe(true);
    });

    it('should trigger blocking conflict DRIVER_ADR_INVALID when Class 1 explosives transport driver lacks Class 1 endorsement', () => {
      const trip = {
        id: 'trip-4',
        tripNumber: 'TR-1004',
        orders: [
          {
            id: 'ord-4',
            orderNumber: 'ORD-104',
            cargoItems: [
              {
                unNumber: 'UN 0004',
                adrClass: '1',
                classificationCode: '1.1D',
                transportCategory: 0,
                netExplosiveMassKg: 10,
              },
            ],
          },
        ],
      };
      const truck = { id: 'trk-1', plateNumber: 'B-100-HAP', features: ['adr', 'ex/ii'] };
      const trailer = { id: 'trl-1', plateNumber: 'B-200-HAP', features: ['adr', 'extinguisher'] };
      const driver = {
        id: 'drv-3',
        name: 'Basic ADR Driver',
        documents: [
          {
            type: 'ADR Basic Packages',
            expiryDate: '2027-01-01',
            notes: 'Basic package certification only', // Lacks Class 1 explosives specialization!
          },
        ],
      };

      const conflicts = validateAdrMatrix(trip, truck, trailer, driver, mockTripEnd);
      expect(conflicts.some(c => c.code === 'DRIVER_ADR_INVALID' && c.message.includes('Class 1'))).toBe(true);
    });

    it('should trigger blocking conflict ADR_CARGO_INCOMPATIBILITY when mixed loading Class 1 and Class 3 is planned', () => {
      const trip = {
        id: 'trip-5',
        tripNumber: 'TR-1005',
        orders: [
          {
            id: 'ord-5',
            cargoItems: [
              {
                unNumber: 'UN 0004',
                adrClass: '1',
                classificationCode: '1.1D',
                transportCategory: 0,
                netExplosiveMassKg: 10,
              },
              {
                unNumber: 'UN 1203',
                adrClass: '3',
                packingGroup: 'II',
                transportCategory: 2,
                volumeLiters: 100,
              },
            ],
          },
        ],
      };
      const truck = { id: 'trk-1', plateNumber: 'B-100-HAP', features: ['adr', 'ex/ii'] };
      const trailer = { id: 'trl-1', plateNumber: 'B-200-HAP', features: ['adr', 'extinguisher'] };
      const driver = {
        id: 'drv-4',
        name: 'Full Endorsement Driver',
        documents: [{ type: 'ADR Certificate', notes: 'class 1 class 7 tanks', expiryDate: '2027-01-01' }],
      };

      const conflicts = validateAdrMatrix(trip, truck, trailer, driver, mockTripEnd);
      expect(conflicts.some(c => c.code === 'ADR_CARGO_INCOMPATIBILITY' && c.level === 'blocking')).toBe(true);
    });
  });
});

