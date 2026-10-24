import { DocumentsService } from './documents.service';

describe('DocumentsService - Clean Filename Resolution & Deduplication', () => {
  let service: DocumentsService;

  beforeEach(() => {
    // Instantiate with mock repositories
    service = new DocumentsService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  describe('buildCleanBaseName', () => {
    it('removes redundant ORDER prefix when reference already starts with ORD-', () => {
      expect(service.buildCleanBaseName('ORDER', 'ORD-2026-0001')).toBe('ORD-2026-0001');
      expect(service.buildCleanBaseName('ORDER', 'ORDER-2026-0001')).toBe('ORDER-2026-0001');
      expect(service.buildCleanBaseName('DOCUMENT', 'ORD-2026-0001')).toBe('ORD-2026-0001');
    });

    it('removes redundant INVOICE prefix when reference already starts with INV-', () => {
      expect(service.buildCleanBaseName('INVOICE', 'INV-2026-0001')).toBe('INV-2026-0001');
      expect(service.buildCleanBaseName('INVOICE', 'INVOICE-2026-0001')).toBe('INVOICE-2026-0001');
      expect(service.buildCleanBaseName('DOCUMENT', 'INV-2026-0001')).toBe('INV-2026-0001');
    });

    it('removes redundant TRIP prefix when reference already starts with TRP-', () => {
      expect(service.buildCleanBaseName('TRIP', 'TRP-2026-0001')).toBe('TRP-2026-0001');
      expect(service.buildCleanBaseName('TRIP', 'TRIP-2026-0001')).toBe('TRIP-2026-0001');
      expect(service.buildCleanBaseName('DOCUMENT', 'TRP-2026-0001')).toBe('TRP-2026-0001');
    });

    it('creates specific POD name when reference is an order or trip number', () => {
      expect(service.buildCleanBaseName('POD', 'ORD-2026-0001')).toBe('POD_ORD-2026-0001');
      expect(service.buildCleanBaseName('POD', 'TRP-2026-0001')).toBe('POD_TRP-2026-0001');
    });

    it('deduplicates POD prefix if reference already has POD', () => {
      expect(service.buildCleanBaseName('POD', 'POD_ORD-2026-0001')).toBe('POD_ORD-2026-0001');
      expect(service.buildCleanBaseName('POD', 'POD-1002')).toBe('POD-1002');
    });

    it('deduplicates CMR prefix if reference already has CMR', () => {
      expect(service.buildCleanBaseName('CMR', 'CMR-2026-0001')).toBe('CMR-2026-0001');
      expect(service.buildCleanBaseName('CMR', 'ORD-2026-0001')).toBe('CMR_ORD-2026-0001');
    });

    it('creates clean driver license document with driver human name', () => {
      expect(service.buildCleanBaseName('LICENSE', 'Ion_Popescu')).toBe('LICENSE_Ion_Popescu');
      expect(service.buildCleanBaseName('LICENSE', 'Jan_de_Vries')).toBe('LICENSE_Jan_de_Vries');
    });

    it('sanitizes illegal characters and double underscores', () => {
      expect(service.buildCleanBaseName('CMR', 'ORD/2026@001#A')).toBe('CMR_ORD_2026_001_A');
    });
  });
});
