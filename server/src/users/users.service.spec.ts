import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserRole } from './user.entity';

describe('UsersService.revokeUserSessions', () => {
  const userRepo: any = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
  const sessionsRepo: any = { createQueryBuilder: jest.fn() };
  const driversRepo: any = { create: jest.fn(), save: jest.fn() };
  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    userRepo.create.mockImplementation((value: any) => ({ ...value, id: 'u2' }));
    userRepo.save.mockImplementation(async (value: any) => value);
    driversRepo.create.mockImplementation((value: any) => value);
    driversRepo.save.mockResolvedValue({ id: 'd1' });
    service = new UsersService(userRepo, sessionsRepo, driversRepo);
  });

  it('creates an active account with the selected language and permissions', async () => {
    userRepo.findOne.mockResolvedValue(null);

    const saved = await service.create({
      email: 'NEW@EXAMPLE.COM',
      password: 'secret123',
      name: 'New Dispatcher',
      role: UserRole.DISPATCHER,
      language: 'nl',
      allowedPages: ['orders'],
      isActive: true,
    });

    expect(userRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      email: 'new@example.com',
      name: 'New Dispatcher',
      role: UserRole.DISPATCHER,
      language: 'nl',
      allowedPages: ['orders'],
      isActive: true,
    }));
    expect(saved.password).not.toBe('secret123');
    expect(driversRepo.save).not.toHaveBeenCalled();
  });

  it('creates a driver profile for a driver account', async () => {
    userRepo.findOne.mockResolvedValue(null);

    await service.create({
      email: 'driver@example.com',
      password: 'secret123',
      name: 'New Driver',
      role: UserRole.DRIVER,
      language: 'ro',
      isActive: false,
    });

    expect(driversRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ user: expect.objectContaining({ email: 'driver@example.com' }) }),
    );
    expect(driversRepo.save).toHaveBeenCalled();
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
