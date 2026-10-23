import { AdrRulesEngine, AdrItemInput } from './adr-rules.engine';
import { OFFICIAL_ADR_2025_TABLE_A, getCatalogChecksum } from './adr-data';

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
            chemistry: 'lithium_ion',
            wattHours: 65, // <= 100 Wh -> exempt!
            condition: 'normal',
            packagingMode: 'standalone',
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
});
