import { describe, it, expect, beforeEach } from 'vitest';
import { MasterDataService } from './services/master-data.service';
import { PrismaService } from '../database/prisma.service';

describe('MasterDataService', () => {
  let service: MasterDataService;
  let prisma: PrismaService;

  beforeEach(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    service = new MasterDataService(prisma);
  });

  describe('listCountries', () => {
    it('should return paginated countries', async () => {
      const result = await service.listCountries({ page: 1, pageSize: 10 });
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('pageSize', 10);
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should filter by search query', async () => {
      const result = await service.listCountries({ page: 1, pageSize: 10, search: 'Romania' });
      expect(result.items.some((c: any) => c.name === 'Romania')).toBe(true);
    });
  });

  describe('listCurrencies', () => {
    it('should return paginated currencies', async () => {
      const result = await service.listCurrencies({ page: 1, pageSize: 10 });
      expect(result).toHaveProperty('items');
      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  describe('listUoms', () => {
    it('should return paginated UOMs', async () => {
      const result = await service.listUoms({ page: 1, pageSize: 10 });
      expect(result).toHaveProperty('items');
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should filter by category', async () => {
      const result = await service.listUoms({ page: 1, pageSize: 10, category: 'weight' });
      expect(result.items.every((u: any) => u.category === 'weight')).toBe(true);
    });
  });

  describe('listTransportModes', () => {
    it('should return paginated transport modes', async () => {
      const result = await service.listTransportModes({ page: 1, pageSize: 10 });
      expect(result).toHaveProperty('items');
      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  describe('listRegions', () => {
    it('should return paginated regions', async () => {
      const result = await service.listRegions({ page: 1, pageSize: 10 });
      expect(result).toHaveProperty('items');
      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  describe('listTimezones', () => {
    it('should return paginated timezones', async () => {
      const result = await service.listTimezones({ page: 1, pageSize: 10 });
      expect(result).toHaveProperty('items');
      expect(Array.isArray(result.items)).toBe(true);
    });
  });
});
