import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

describe('UsersService.revokeUserSessions', () => {
  const userRepo: any = { findOne: jest.fn() };
  const sessionsRepo: any = { createQueryBuilder: jest.fn() };
  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(userRepo, sessionsRepo);
  });

  it('revokes every active session for the user', async () => {
    userRepo.findOne.mockResolvedValue({ id: 'u1' });
    const execute = jest.fn().mockResolvedValue({ affected: 2 });
    const qb = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute,
    };
    sessionsRepo.createQueryBuilder.mockReturnValue(qb);

    await expect(service.revokeUserSessions('u1')).resolves.toEqual({ success: true });
    expect(qb.where).toHaveBeenCalledWith(
      'userId = :userId AND revokedAt IS NULL',
      { userId: 'u1' },
    );
    expect(execute).toHaveBeenCalled();
  });

  it('rejects an unknown user', async () => {
    userRepo.findOne.mockResolvedValue(null);

    await expect(service.revokeUserSessions('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(sessionsRepo.createQueryBuilder).not.toHaveBeenCalled();
  });
});
