import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CustomerStatus, Prisma } from '@prisma/client';

export interface CurrentUser {
  id: string;
  email: string;
  companies: { id: string; name: string }[];
  roles: { name: string }[];
  permissions: { action: string; subject: string }[];
}

export interface ListQuery {
  search?: string;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
  status?: CustomerStatus;
  categoryId?: string;
  isActive?: boolean;
  page: number;
  pageSize: number;
}

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserContext(userId: string): Promise<CurrentUser> {
    const [user, companyUsers, userRoles] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.companyUser.findMany({
        where: { userId },
        include: { company: { select: { id: true, name: true } } },
      }),
      this.prisma.userRole.findMany({
        where: { userId },
        include: { role: { include: { permissions: { include: { permission: true } } } } },
      }),
    ]);

    if (!user || user.status === 'DISABLED' || user.status === 'LOCKED') {
      throw new BadRequestException('User is not active');
    }

    const companies = companyUsers.map((cu) => ({ id: cu.company.id, name: cu.company.name }));
    const roles = userRoles.map((ur) => ({ name: ur.role.name }));
    const permissions: { action: string; subject: string }[] = [];
    const seen = new Set<string>();
    for (const ur of userRoles) {
      for (const rp of ur.role.permissions) {
        const key = `${rp.permission.action}:${rp.permission.subject}`;
        if (!seen.has(key)) {
          seen.add(key);
          permissions.push({ action: rp.permission.action, subject: rp.permission.subject });
        }
      }
    }

    return { id: user.id, email: user.email, companies, roles, permissions };
  }

  getCompanyContext(user: CurrentUser) {
    const company = user.companies[0];
    if (!company) throw new BadRequestException('User has no company context');
    return company;
  }

  ensurePermission(user: CurrentUser, action: string, subject: string) {
    const has = user.permissions.some((p) => p.action === action && p.subject === subject);
    if (!has) throw new BadRequestException('Insufficient permissions');
  }

  private buildSortOrder(sortBy?: string): Prisma.CustomerOrderByWithRelationInput {
    if (!sortBy) return { code: 'asc' };
    const field = sortBy as keyof (typeof Prisma.ModelName);
    return { [field]: 'asc' };
  }

  async listCustomers(user: CurrentUser, query: ListQuery) {
    const company = this.getCompanyContext(user);
    const where: Prisma.CustomerWhereInput = {
      companyId: company.id,
      deletedAt: null,
    };

    if (query.search) {
      const search = query.search;
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { legalName: { contains: search, mode: 'insensitive' } },
        { tradingName: { contains: search, mode: 'insensitive' } },
        { vatNumber: { contains: search, mode: 'insensitive' } },
        { registrationNumber: { contains: search, mode: 'insensitive' } },
        { mainEmail: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (query.status) where.status = query.status;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (typeof query.isActive === 'boolean') where.isActive = query.isActive;

    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: this.buildSortOrder(query.sortBy),
        include: {
          category: { select: { id: true, code: true, name: true, color: true } },
          salesOwner: { select: { id: true, firstName: true, lastName: true, email: true } },
          accountManager: { select: { id: true, firstName: true, lastName: true, email: true } },
          defaultServiceType: { select: { id: true, code: true, name: true } },
          preferredTransportMode: { select: { id: true, code: true, name: true } },
          tagAssignments: { include: { tag: { select: { id: true, name: true, color: true } } } },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  async getCustomer(user: CurrentUser, id: string) {
    const company = this.getCompanyContext(user);
    const customer = await this.prisma.customer.findFirst({
      where: { id, companyId: company.id, deletedAt: null },
      include: {
        category: { select: { id: true, code: true, name: true, color: true } },
        salesOwner: { select: { id: true, firstName: true, lastName: true, email: true } },
        accountManager: { select: { id: true, firstName: true, lastName: true, email: true } },
        defaultServiceType: { select: { id: true, code: true, name: true } },
        preferredTransportMode: { select: { id: true, code: true, name: true } },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async createCustomer(user: CurrentUser, data: Record<string, unknown>) {
    const company = this.getCompanyContext(user);
    const existing = await this.prisma.customer.findFirst({
      where: { companyId: company.id, code: data.code as string },
    });
    if (existing) {
      throw new ConflictException('Customer code already exists for this company');
    }

    const customer = await this.prisma.customer.create({
      data: { ...data, companyId: company.id } as any,
      include: {
        category: { select: { id: true, code: true, name: true, color: true } },
        salesOwner: { select: { id: true, firstName: true, lastName: true, email: true } },
        accountManager: { select: { id: true, firstName: true, lastName: true, email: true } },
        defaultServiceType: { select: { id: true, code: true, name: true } },
        preferredTransportMode: { select: { id: true, code: true, name: true } },
      },
    });

    await this.createAuditLog({
      companyId: company.id,
      actorUserId: user.id,
      actorEmail: user.email,
      action: 'CREATE',
      entityType: 'Customer',
      entityId: customer.id,
      afterJson: customer,
    });

    return customer;
  }

  async updateCustomer(user: CurrentUser, id: string, data: Record<string, unknown>) {
    const company = this.getCompanyContext(user);
    const existing = await this.prisma.customer.findFirst({
      where: { id, companyId: company.id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Customer not found');

    if (data.code && data.code !== existing.code) {
      const codeExists = await this.prisma.customer.findFirst({
        where: { companyId: company.id, code: data.code as string, id: { not: id } },
      });
      if (codeExists) {
        throw new ConflictException('Customer code already exists for this company');
      }
    }

    const beforeJson = { ...existing } as unknown as Record<string, unknown>;
    delete beforeJson.createdAt;
    delete beforeJson.updatedAt;
    delete beforeJson.deletedAt;

    const updated = await this.prisma.customer.update({
      where: { id },
      data: data as any,
      include: {
        category: { select: { id: true, code: true, name: true, color: true } },
        salesOwner: { select: { id: true, firstName: true, lastName: true, email: true } },
        accountManager: { select: { id: true, firstName: true, lastName: true, email: true } },
        defaultServiceType: { select: { id: true, code: true, name: true } },
        preferredTransportMode: { select: { id: true, code: true, name: true } },
      },
    });

    await this.createAuditLog({
      companyId: company.id,
      actorUserId: user.id,
      actorEmail: user.email,
      action: 'UPDATE',
      entityType: 'Customer',
      entityId: id,
      beforeJson,
      afterJson: updated,
    });

    return updated;
  }

  async activateCustomer(user: CurrentUser, id: string) {
    const company = this.getCompanyContext(user);
    const existing = await this.prisma.customer.findFirst({
      where: { id, companyId: company.id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Customer not found');

    const updated = await this.prisma.customer.update({
      where: { id },
      data: { status: 'ACTIVE', isActive: true },
    });

    await this.createAuditLog({
      companyId: company.id,
      actorUserId: user.id,
      actorEmail: user.email,
      action: 'STATUS_CHANGE',
      entityType: 'Customer',
      entityId: id,
      afterJson: { status: 'ACTIVE', isActive: true },
    });

    return updated;
  }

  async deactivateCustomer(user: CurrentUser, id: string) {
    const company = this.getCompanyContext(user);
    const existing = await this.prisma.customer.findFirst({
      where: { id, companyId: company.id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Customer not found');

    const updated = await this.prisma.customer.update({
      where: { id },
      data: { isActive: false },
    });

    await this.createAuditLog({
      companyId: company.id,
      actorUserId: user.id,
      actorEmail: user.email,
      action: 'STATUS_CHANGE',
      entityType: 'Customer',
      entityId: id,
      afterJson: { isActive: false },
    });

    return updated;
  }

  async archiveCustomer(user: CurrentUser, id: string) {
    const company = this.getCompanyContext(user);
    const existing = await this.prisma.customer.findFirst({
      where: { id, companyId: company.id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Customer not found');

    const updated = await this.prisma.customer.update({
      where: { id },
      data: { status: 'ARCHIVED', isActive: false, archivedAt: new Date() },
    });

    await this.createAuditLog({
      companyId: company.id,
      actorUserId: user.id,
      actorEmail: user.email,
      action: 'ARCHIVE',
      entityType: 'Customer',
      entityId: id,
      afterJson: { status: 'ARCHIVED', isActive: false, archivedAt: updated.archivedAt },
    });

    return updated;
  }

  async getCustomer360(user: CurrentUser, id: string) {
    const company = this.getCompanyContext(user);
    const customer = await this.prisma.customer.findFirst({
      where: { id, companyId: company.id, deletedAt: null },
      include: {
        category: { select: { id: true, code: true, name: true, color: true } },
        salesOwner: { select: { id: true, firstName: true, lastName: true, email: true } },
        accountManager: { select: { id: true, firstName: true, lastName: true, email: true } },
        defaultServiceType: { select: { id: true, code: true, name: true } },
        preferredTransportMode: { select: { id: true, code: true, name: true } },
        contacts: true,
        locations: {
          include: {
            location: {
              include: {
                country: true,
                region: true,
              },
            },
          },
        },
        tagAssignments: { include: { tag: { select: { id: true, name: true, color: true } } } },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async listCustomerTags(user: CurrentUser, customerId: string) {
    const company = this.getCompanyContext(user);
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, companyId: company.id, deletedAt: null },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const tags = await this.prisma.customerTagAssignment.findMany({
      where: { customerId },
      include: { tag: true },
    });
    return tags.map((t) => t.tag);
  }

  async assignTag(user: CurrentUser, customerId: string, tagId: string) {
    const company = this.getCompanyContext(user);
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, companyId: company.id, deletedAt: null },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const tag = await this.prisma.customerTag.findFirst({
      where: { id: tagId, companyId: company.id },
    });
    if (!tag) throw new NotFoundException('Tag not found');

    await this.prisma.customerTagAssignment.upsert({
      where: { customerId_tagId: { customerId, tagId } },
      create: { customerId, tagId },
      update: {},
    });

    return tag;
  }

  async removeTag(user: CurrentUser, customerId: string, tagId: string) {
    const company = this.getCompanyContext(user);
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, companyId: company.id, deletedAt: null },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const assignment = await this.prisma.customerTagAssignment.findUnique({
      where: { customerId_tagId: { customerId, tagId } },
    });
    if (!assignment) throw new NotFoundException('Tag assignment not found');

    await this.prisma.customerTagAssignment.delete({
      where: { customerId_tagId: { customerId, tagId } },
    });

    return { deleted: true };
  }

  private async createAuditLog(data: {
    companyId: string;
    actorUserId: string;
    actorEmail: string;
    action: string;
    entityType: string;
    entityId: string;
    beforeJson?: Record<string, unknown>;
    afterJson?: Record<string, unknown>;
  }) {
    await this.prisma.auditLog.create({
      data: {
        companyId: data.companyId,
        actorUserId: data.actorUserId,
        actorEmail: data.actorEmail,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        beforeJson: data.beforeJson as any,
        afterJson: data.afterJson as any,
      },
    });
  }
}
