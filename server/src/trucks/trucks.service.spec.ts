import { BadRequestException } from '@nestjs/common';
import { TrucksService } from './trucks.service';

describe('TrucksService fuel type persistence', () => {
  const repo = {
    findOne: jest.fn(),
    create: jest.fn((value: any) => value),
    save: jest.fn(async (value: any) => ({ ...value, id: 'truck-1' })),
    update: jest.fn(async () => ({ affected: 1 })),
  } as any;
  const docsRepo = {} as any;
  const actionLogs = { logAction: jest.fn() } as any;
  const service = new TrucksService(repo, docsRepo, actionLogs);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires an explicit fuel type for a new truck', async () => {
    await expect(service.create({ plateNumber: 'B-100-TEST' }, null)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('normalizes a known legacy alias before saving', async () => {
    const saved: any = await service.create({ plateNumber: 'B-101-TEST', fuelType: 'electric' }, null);
    expect(saved.fuelType).toBe('ELECTRIC');
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ fuelType: 'ELECTRIC' }));
  });

  it('rejects an invalid update value', async () => {
    await expect(service.update('truck-1', { fuelType: 'rocket-fuel' }, null)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('allows clearing a legacy value without assigning Diesel', async () => {
    repo.findOne.mockResolvedValue({ id: 'truck-1', plateNumber: 'B-102-TEST', fuelType: null });
    await service.update('truck-1', { fuelType: null }, null);
    expect(repo.update).toHaveBeenCalledWith('truck-1', expect.objectContaining({ fuelType: null }));
  });

  it('preserves a valid existing fuel type when another field is updated', async () => {
    repo.findOne.mockResolvedValue({ id: 'truck-1', plateNumber: 'B-103-TEST', fuelType: 'LNG' });
    await service.update('truck-1', { plateNumber: 'B-103-TEST' }, null);
    expect(repo.update).toHaveBeenCalledWith(
      'truck-1',
      expect.not.objectContaining({ fuelType: expect.anything() }),
    );
  });
});
