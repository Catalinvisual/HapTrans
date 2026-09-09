import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PasswordService } from '../auth/password/password.service';
import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyId: z.string().uuid(),
  roleIds: z.array(z.string().uuid()).min(1),
  branchId: z.string().uuid().optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  status: z.enum(['ACTIVE', 'INVITED', 'PENDING_VERIFICATION', 'DISABLED', 'LOCKED']).optional(),
  companyId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  roleIds: z.array(z.string().uuid()).optional(),
});

export const listUsersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService, private readonly passwordService: PasswordService) {}

  async findAll(requesterId: string, query: z.infer<typeof listUsersSchema>) {
    // TODO: Implement proper company-scoped user listing
    const where: any = {};
    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({ where, skip, take: query.pageSize, select: { id: true, email: true, firstName: true, lastName: true, status: true, createdAt: true } }),
      this.prisma.user.count({ where }),
    ]);
    return { items, page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) };
  }

  async findOne(requesterId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, status: true, emailVerified: true, lastLoginAt: true, createdAt: true, updatedAt: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(requesterId: string, body: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (existing) throw new BadRequestException('Email already exists');

    const passwordHash = await this.passwordService.hash(body.password);
    const user = await this.prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        passwordHash,
        firstName: body.firstName,
        lastName: body.lastName,
        status: 'ACTIVE',
      },
    });

    await this.prisma.companyUser.create({
      data: { userId: user.id, companyId: body.companyId, branchId: body.branchId, isPrimary: true },
    });

    for (const roleId of body.roleIds) {
      await this.prisma.userRole.create({
        data: { userId: user.id, roleId, companyId: body.companyId, branchId: body.branchId },
      });
    }

    return { id: user.id, email: user.email };
  }

  async update(requesterId: string, userId: string, body: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const data: any = {};
    if (body.email) data.email = body.email.toLowerCase();
    if (body.firstName !== undefined) data.firstName = body.firstName;
    if (body.lastName !== undefined) data.lastName = body.lastName;
    if (body.status) data.status = body.status;

    const updated = await this.prisma.user.update({ where: { id: userId }, data });

    if (body.companyId) {
      await this.prisma.companyUser.upsert({
        where: { userId_companyId: { userId, companyId: body.companyId } },
        update: { branchId: body.branchId },
        create: { userId, companyId: body.companyId, branchId: body.branchId, isPrimary: true },
      });
    }

    if (body.roleIds) {
      await this.prisma.userRole.deleteMany({ where: { userId } });
      for (const roleId of body.roleIds) {
        await this.prisma.userRole.create({
          data: { userId, roleId, companyId: body.companyId ?? '', branchId: body.branchId },
        });
      }
    }

    return { id: updated.id, email: updated.email };
  }

  async remove(requesterId: string, userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { status: 'DISABLED' } });
  }
}
