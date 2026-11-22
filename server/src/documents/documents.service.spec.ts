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
      { createOnce: jest.fn() } as any,
      { logAction: jest.fn() } as any,
      { sendPushNotification: jest.fn() } as any,
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
      expect(service.buildCleanBaseName('POD', 'ORD-2026-0001')).toBe('POD - ORD-2026-0001');
      expect(service.buildCleanBaseName('POD', 'TRP-2026-0001')).toBe('POD - TRP-2026-0001');
    });

    it('deduplicates POD prefix if reference already has POD', () => {
      expect(service.buildCleanBaseName('POD', 'POD_ORD-2026-0001')).toBe('POD ORD-2026-0001');
      expect(service.buildCleanBaseName('POD', 'POD-1002')).toBe('POD-1002');
    });

    it('deduplicates CMR prefix if reference already has CMR', () => {
      expect(service.buildCleanBaseName('CMR', 'CMR-2026-0001')).toBe('CMR-2026-0001');
      expect(service.buildCleanBaseName('CMR', 'ORD-2026-0001')).toBe('CMR - ORD-2026-0001');
    });

    it('creates clean driver license document with driver human name', () => {
      expect(service.buildCleanBaseName('LICENSE', 'Ion Popescu')).toBe('LICENSE - Ion Popescu');
      expect(service.buildCleanBaseName('LICENSE', 'Jan de Vries')).toBe('LICENSE - Jan de Vries');
    });

    it('turns separators into spaces instead of underscores', () => {
      expect(service.buildCleanBaseName('CMR', 'ORD/2026@001#A')).toBe('CMR - ORD 2026 001 A');
      expect(service.buildCleanBaseName('PACKING_LIST', 'TRP-2026-0007')).toBe('PACKING LIST - TRP-2026-0007');
    });
  });

  describe('humanizeLegacyDocumentFileName', () => {
    it('rewrites legacy underscore names into readable ones', () => {
      expect(service.humanizeLegacyDocumentFileName('PACKING_LIST_TRP-2026-0007.jpg')).toBe('PACKING LIST - TRP-2026-0007.jpg');
      expect(service.humanizeLegacyDocumentFileName('CMR_TRP-2026-0007.jpg')).toBe('CMR - TRP-2026-0007.jpg');
      expect(service.humanizeLegacyDocumentFileName('POD_ORD-2026-000033_3.jpg')).toBe('POD - ORD-2026-000033 (3).jpg');
    });

    it('leaves already readable names untouched', () => {
      expect(service.humanizeLegacyDocumentFileName('CMR - TRP-2026-0007.jpg')).toBe('CMR - TRP-2026-0007.jpg');
      expect(service.humanizeLegacyDocumentFileName('ORD-2026-000035.pdf')).toBe('ORD-2026-000035.pdf');
    });
  });
});
