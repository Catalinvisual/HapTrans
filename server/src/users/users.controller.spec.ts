import { ForbiddenException } from '@nestjs/common';
import { UsersController } from './users.controller';

describe('UsersController permissions', () => {
  const service: any = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    revokeUserSessions: jest.fn(),
  };
  let controller: UsersController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new UsersController(service);
  });

  it('restricts the user list to administrators', () => {
    expect(() => controller.findAll({ user: { id: 'u1', role: 'accountant' } })).toThrow(
      ForbiddenException,
    );
    controller.findAll({ user: { id: 'a1', role: 'admin' } });
    expect(service.findAll).toHaveBeenCalled();
  });

  it('lets a user read only their own profile', () => {
    expect(() => controller.findOne('u2', { user: { id: 'u1', role: 'dispatcher' } })).toThrow(
      ForbiddenException,
    );
    controller.findOne('u1', { user: { id: 'u1', role: 'dispatcher' } });
    expect(service.findOne).toHaveBeenCalledWith('u1');
  });

  it('never lets a non-admin grant themselves pages, a role or activation', () => {
    const dto: any = { name: 'Self Edit', allowedPages: ['financial', 'invoices'], role: 'admin', isActive: true };

    controller.update('u1', dto, { user: { id: 'u1', role: 'dispatcher' } });

    expect(dto.allowedPages).toBeUndefined();
    expect(dto.role).toBeUndefined();
    expect(dto.isActive).toBeUndefined();
    expect(service.update).toHaveBeenCalledWith('u1', { name: 'Self Edit' });
  });

  it('keeps page permissions editable by administrators', () => {
    const dto: any = { role: 'accountant', allowedPages: ['invoices', 'financial'] };

    controller.update('u2', dto, { user: { id: 'a1', role: 'admin' } });

    expect(service.update).toHaveBeenCalledWith('u2', dto);
  });
});
