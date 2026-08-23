import { RowNormalizer } from './row-normalizer';
import { WorkbookAnalyzer } from './workbook-analyzer';

describe('Universal AI Excel Import Engine', () => {
  describe('RowNormalizer', () => {
    it('normalizes European dates correctly', () => {
      const result = RowNormalizer.normalizeRow({ pickupDate: '23.08.2026' }, 0, 1);
      expect(result.data.pickupDate).toBe('2026-08-23');
      expect(result.issues).toHaveLength(2); // warnings for missing locations
    });

    it('normalizes times correctly', () => {
      const result = RowNormalizer.normalizeRow({ pickupTimeFrom: '08:00-10:00' }, 0, 1);
      expect(result.data.pickupTimeFrom).toBe('08:00');
      expect(result.data.pickupTimeTo).toBe('10:00');
    });

    it('normalizes numbers correctly', () => {
      const result = RowNormalizer.normalizeRow({ weight: '1.234,56' }, 0, 1);
      expect(result.data.weight).toBe(1234.56);
    });
    
    it('catches chronologial errors', () => {
      const result = RowNormalizer.normalizeRow({
        pickupDate: '2026-08-25',
        deliveryDate: '2026-08-20',
        pickupCity: 'A',
        deliveryCity: 'B'
      }, 0, 1);
      expect(result.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining('before pickup date') })
      ]));
    });
  });
});
