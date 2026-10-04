import { WebsiteCmsService } from './website-cms.service';

describe('WebsiteCmsService country saves', () => {
  const initial = [{ key: 'about_RO', value: 'Existing' }];
  const repository = {
    find: jest.fn().mockResolvedValue(initial),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((item: unknown) => item),
    save: jest.fn(),
    upsert: jest.fn().mockResolvedValue(undefined),
  };
  const service = new WebsiteCmsService(repository as any);

  beforeEach(() => jest.clearAllMocks());

  it('inserts a new countries key and returns persisted countries', async () => {
    repository.find.mockResolvedValueOnce(initial).mockResolvedValueOnce([
      ...initial, { key: 'countries', value: 'RO, DE, FR' },
    ]);
    expect(await service.save({ countries: 'RO, DE, FR' })).toMatchObject({ countries: 'RO, DE, FR' });
    expect(repository.upsert).toHaveBeenCalledWith({ key: 'countries', value: 'RO, DE, FR' }, ['key']);
  });

  it('does not accept non-string values and does not change existing CMS content', async () => {
    await expect(service.save({ countries: undefined as unknown as string })).rejects.toThrow();
    expect(repository.upsert).not.toHaveBeenCalled();
  });
});
