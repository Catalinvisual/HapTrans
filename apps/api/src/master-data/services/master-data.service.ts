import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';

export interface CurrentUser {
  id: string;
  email: string;
  companies: { id: string; name: string }[];
  roles: { name: string }[];
  permissions: { action: string; subject: string }[];
}

@Injectable()
export class MasterDataService {
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

  // Countries
  async listCountries(query: { search?: string; page: number; pageSize: number }) {
    const where: Prisma.CountryWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { codeAlpha2: { contains: query.search, mode: 'insensitive' } },
        { codeAlpha3: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.country.findMany({ where, skip: (query.page - 1) * query.pageSize, take: query.pageSize, orderBy: { name: 'asc' } }),
      this.prisma.country.count({ where }),
    ]);
    return { items, page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) };
  }

  async getCountry(id: string) {
    const country = await this.prisma.country.findUnique({ where: { id } });
    if (!country) throw new NotFoundException('Country not found');
    return country;
  }

  async createCountry(data: Record<string, unknown>) {
    return this.prisma.country.create({ data: data as Prisma.CountryCreateInput });
  }

  async updateCountry(id: string, data: Record<string, unknown>) {
    return this.prisma.country.update({ where: { id }, data: data as Prisma.CountryUpdateInput });
  }

  async deleteCountry(id: string) {
    return this.prisma.country.delete({ where: { id } });
  }

  // Currencies
  async listCurrencies(query: { search?: string; page: number; pageSize: number }) {
    const where: Prisma.CurrencyWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.currency.findMany({ where, skip: (query.page - 1) * query.pageSize, take: query.pageSize, orderBy: { code: 'asc' } }),
      this.prisma.currency.count({ where }),
    ]);
    return { items, page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) };
  }

  async getCurrency(id: string) {
    const currency = await this.prisma.currency.findUnique({ where: { id } });
    if (!currency) throw new NotFoundException('Currency not found');
    return currency;
  }

  async createCurrency(data: Record<string, unknown>) {
    return this.prisma.currency.create({ data: data as Prisma.CurrencyCreateInput });
  }

  async updateCurrency(id: string, data: Record<string, unknown>) {
    return this.prisma.currency.update({ where: { id }, data: data as Prisma.CurrencyUpdateInput });
  }

  async deleteCurrency(id: string) {
    return this.prisma.currency.delete({ where: { id } });
  }

  // UOMs
  async listUoms(query: { search?: string; category?: string; page: number; pageSize: number }) {
    const where: Prisma.UomWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.category) where.category = query.category;
    const [items, total] = await Promise.all([
      this.prisma.uom.findMany({ where, skip: (query.page - 1) * query.pageSize, take: query.pageSize, orderBy: { category: 'asc' } }),
      this.prisma.uom.count({ where }),
    ]);
    return { items, page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) };
  }

  async getUom(id: string) {
    const uom = await this.prisma.uom.findUnique({ where: { id } });
    if (!uom) throw new NotFoundException('UOM not found');
    return uom;
  }

  async createUom(data: Record<string, unknown>) {
    return this.prisma.uom.create({ data: data as Prisma.UomCreateInput });
  }

  async updateUom(id: string, data: Record<string, unknown>) {
    return this.prisma.uom.update({ where: { id }, data: data as Prisma.UomUpdateInput });
  }

  async deleteUom(id: string) {
    return this.prisma.uom.delete({ where: { id } });
  }

  // Transport Modes
  async listTransportModes(query: { search?: string; page: number; pageSize: number }) {
    const where: Prisma.TransportModeWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.transportMode.findMany({ where, skip: (query.page - 1) * query.pageSize, take: query.pageSize, orderBy: { name: 'asc' } }),
      this.prisma.transportMode.count({ where }),
    ]);
    return { items, page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) };
  }

  async getTransportMode(id: string) {
    const mode = await this.prisma.transportMode.findUnique({ where: { id } });
    if (!mode) throw new NotFoundException('Transport mode not found');
    return mode;
  }

  async createTransportMode(data: Record<string, unknown>) {
    return this.prisma.transportMode.create({ data: data as Prisma.TransportModeCreateInput });
  }

  async updateTransportMode(id: string, data: Record<string, unknown>) {
    return this.prisma.transportMode.update({ where: { id }, data: data as Prisma.TransportModeUpdateInput });
  }

  async deleteTransportMode(id: string) {
    return this.prisma.transportMode.delete({ where: { id } });
  }

  // Regions
  async listRegions(query: { search?: string; page: number; pageSize: number }) {
    const where: Prisma.RegionWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.region.findMany({ where, skip: (query.page - 1) * query.pageSize, take: query.pageSize, orderBy: { name: 'asc' } }),
      this.prisma.region.count({ where }),
    ]);
    return { items, page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) };
  }

  async getRegion(id: string) {
    const region = await this.prisma.region.findUnique({ where: { id } });
    if (!region) throw new NotFoundException('Region not found');
    return region;
  }

  async createRegion(data: Record<string, unknown>) {
    return this.prisma.region.create({ data: data as Prisma.RegionCreateInput });
  }

  async updateRegion(id: string, data: Record<string, unknown>) {
    return this.prisma.region.update({ where: { id }, data: data as Prisma.RegionUpdateInput });
  }

  async deleteRegion(id: string) {
    return this.prisma.region.delete({ where: { id } });
  }

  // Timezones
  async listTimezones(query: { search?: string; page: number; pageSize: number }) {
    const where: Prisma.TimezoneWhereInput = {};
    if (query.search) {
      where.OR = [
        { identifier: { contains: query.search, mode: 'insensitive' } },
        { displayName: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.timezone.findMany({ where, skip: (query.page - 1) * query.pageSize, take: query.pageSize, orderBy: { identifier: 'asc' } }),
      this.prisma.timezone.count({ where }),
    ]);
    return { items, page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) };
  }

  async getTimezone(id: string) {
    const timezone = await this.prisma.timezone.findUnique({ where: { id } });
    if (!timezone) throw new NotFoundException('Timezone not found');
    return timezone;
  }

  async createTimezone(data: Record<string, unknown>) {
    return this.prisma.timezone.create({ data: data as Prisma.TimezoneCreateInput });
  }

  async updateTimezone(id: string, data: Record<string, unknown>) {
    return this.prisma.timezone.update({ where: { id }, data: data as Prisma.TimezoneUpdateInput });
  }

  async deleteTimezone(id: string) {
    return this.prisma.timezone.delete({ where: { id } });
  }

  // Service Types (company-scoped)
  async listServiceTypes(user: CurrentUser, query: { search?: string; page: number; pageSize: number }) {
    const company = this.getCompanyContext(user);
    const where: Prisma.ServiceTypeWhereInput = { companyId: company.id };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.serviceType.findMany({ where, skip: (query.page - 1) * query.pageSize, take: query.pageSize, orderBy: { code: 'asc' } }),
      this.prisma.serviceType.count({ where }),
    ]);
    return { items, page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) };
  }

  async getServiceType(user: CurrentUser, id: string) {
    const company = this.getCompanyContext(user);
    const item = await this.prisma.serviceType.findFirst({ where: { id, companyId: company.id } });
    if (!item) throw new NotFoundException('Service type not found');
    return item;
  }

  async createServiceType(user: CurrentUser, data: Record<string, unknown>) {
    const company = this.getCompanyContext(user);
    return this.prisma.serviceType.create({ data: { ...data, companyId: company.id } as unknown as Prisma.ServiceTypeCreateInput });
  }

  async updateServiceType(user: CurrentUser, id: string, data: Record<string, unknown>) {
    const company = this.getCompanyContext(user);
    const existing = await this.prisma.serviceType.findFirst({ where: { id, companyId: company.id } });
    if (!existing) throw new NotFoundException('Service type not found');
    return this.prisma.serviceType.update({ where: { id }, data: data as unknown as Prisma.ServiceTypeUpdateInput });
  }

  async deleteServiceType(user: CurrentUser, id: string) {
    const company = this.getCompanyContext(user);
    const existing = await this.prisma.serviceType.findFirst({ where: { id, companyId: company.id } });
    if (!existing) throw new NotFoundException('Service type not found');
    return this.prisma.serviceType.delete({ where: { id } });
  }

  // Cargo Types (company-scoped)
  async listCargoTypes(user: CurrentUser, query: { search?: string; page: number; pageSize: number }) {
    const company = this.getCompanyContext(user);
    const where: Prisma.CargoTypeWhereInput = { companyId: company.id };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.cargoType.findMany({ where, skip: (query.page - 1) * query.pageSize, take: query.pageSize, orderBy: { code: 'asc' } }),
      this.prisma.cargoType.count({ where }),
    ]);
    return { items, page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) };
  }

  async getCargoType(user: CurrentUser, id: string) {
    const company = this.getCompanyContext(user);
    const item = await this.prisma.cargoType.findFirst({ where: { id, companyId: company.id } });
    if (!item) throw new NotFoundException('Cargo type not found');
    return item;
  }

  async createCargoType(user: CurrentUser, data: Record<string, unknown>) {
    const company = this.getCompanyContext(user);
    return this.prisma.cargoType.create({ data: { ...data, companyId: company.id } as unknown as Prisma.CargoTypeCreateInput });
  }

  async updateCargoType(user: CurrentUser, id: string, data: Record<string, unknown>) {
    const company = this.getCompanyContext(user);
    const existing = await this.prisma.cargoType.findFirst({ where: { id, companyId: company.id } });
    if (!existing) throw new NotFoundException('Cargo type not found');
    return this.prisma.cargoType.update({ where: { id }, data: data as unknown as Prisma.CargoTypeUpdateInput });
  }

  async deleteCargoType(user: CurrentUser, id: string) {
    const company = this.getCompanyContext(user);
    const existing = await this.prisma.cargoType.findFirst({ where: { id, companyId: company.id } });
    if (!existing) throw new NotFoundException('Cargo type not found');
    return this.prisma.cargoType.delete({ where: { id } });
  }

  // Vehicle Types (company-scoped)
  async listVehicleTypes(user: CurrentUser, query: { search?: string; page: number; pageSize: number }) {
    const company = this.getCompanyContext(user);
    const where: Prisma.VehicleTypeWhereInput = { companyId: company.id };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.vehicleType.findMany({ where, skip: (query.page - 1) * query.pageSize, take: query.pageSize, orderBy: { code: 'asc' } }),
      this.prisma.vehicleType.count({ where }),
    ]);
    return { items, page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) };
  }

  async getVehicleType(user: CurrentUser, id: string) {
    const company = this.getCompanyContext(user);
    const item = await this.prisma.vehicleType.findFirst({ where: { id, companyId: company.id } });
    if (!item) throw new NotFoundException('Vehicle type not found');
    return item;
  }

  async createVehicleType(user: CurrentUser, data: Record<string, unknown>) {
    const company = this.getCompanyContext(user);
    return this.prisma.vehicleType.create({ data: { ...data, companyId: company.id } as unknown as Prisma.VehicleTypeCreateInput });
  }

  async updateVehicleType(user: CurrentUser, id: string, data: Record<string, unknown>) {
    const company = this.getCompanyContext(user);
    const existing = await this.prisma.vehicleType.findFirst({ where: { id, companyId: company.id } });
    if (!existing) throw new NotFoundException('Vehicle type not found');
    return this.prisma.vehicleType.update({ where: { id }, data: data as unknown as Prisma.VehicleTypeUpdateInput });
  }

  async deleteVehicleType(user: CurrentUser, id: string) {
    const company = this.getCompanyContext(user);
    const existing = await this.prisma.vehicleType.findFirst({ where: { id, companyId: company.id } });
    if (!existing) throw new NotFoundException('Vehicle type not found');
    return this.prisma.vehicleType.delete({ where: { id } });
  }

  // Trailer Types (company-scoped)
  async listTrailerTypes(user: CurrentUser, query: { search?: string; page: number; pageSize: number }) {
    const company = this.getCompanyContext(user);
    const where: Prisma.TrailerTypeWhereInput = { companyId: company.id };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.trailerType.findMany({ where, skip: (query.page - 1) * query.pageSize, take: query.pageSize, orderBy: { code: 'asc' } }),
      this.prisma.trailerType.count({ where }),
    ]);
    return { items, page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) };
  }

  async getTrailerType(user: CurrentUser, id: string) {
    const company = this.getCompanyContext(user);
    const item = await this.prisma.trailerType.findFirst({ where: { id, companyId: company.id } });
    if (!item) throw new NotFoundException('Trailer type not found');
    return item;
  }

  async createTrailerType(user: CurrentUser, data: Record<string, unknown>) {
    const company = this.getCompanyContext(user);
    return this.prisma.trailerType.create({ data: { ...data, companyId: company.id } as unknown as Prisma.TrailerTypeCreateInput });
  }

  async updateTrailerType(user: CurrentUser, id: string, data: Record<string, unknown>) {
    const company = this.getCompanyContext(user);
    const existing = await this.prisma.trailerType.findFirst({ where: { id, companyId: company.id } });
    if (!existing) throw new NotFoundException('Trailer type not found');
    return this.prisma.trailerType.update({ where: { id }, data: data as unknown as Prisma.TrailerTypeUpdateInput });
  }

  async deleteTrailerType(user: CurrentUser, id: string) {
    const company = this.getCompanyContext(user);
    const existing = await this.prisma.trailerType.findFirst({ where: { id, companyId: company.id } });
    if (!existing) throw new NotFoundException('Trailer type not found');
    return this.prisma.trailerType.delete({ where: { id } });
  }

  // Status Definitions (company-scoped)
  async listStatusDefinitions(user: CurrentUser, query: { entityType?: string; search?: string; page: number; pageSize: number }) {
    const company = this.getCompanyContext(user);
    const where: Prisma.StatusDefinitionWhereInput = { companyId: company.id };
    if (query.entityType) where.entityType = query.entityType;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.statusDefinition.findMany({ where, skip: (query.page - 1) * query.pageSize, take: query.pageSize, orderBy: { entityType: 'asc', sortOrder: 'asc' } }),
      this.prisma.statusDefinition.count({ where }),
    ]);
    return { items, page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) };
  }

  async getStatusDefinition(user: CurrentUser, id: string) {
    const company = this.getCompanyContext(user);
    const item = await this.prisma.statusDefinition.findFirst({ where: { id, companyId: company.id } });
    if (!item) throw new NotFoundException('Status definition not found');
    return item;
  }

  async createStatusDefinition(user: CurrentUser, data: Record<string, unknown>) {
    const company = this.getCompanyContext(user);
    return this.prisma.statusDefinition.create({ data: { ...data, companyId: company.id } as unknown as Prisma.StatusDefinitionCreateInput });
  }

  async updateStatusDefinition(user: CurrentUser, id: string, data: Record<string, unknown>) {
    const company = this.getCompanyContext(user);
    const existing = await this.prisma.statusDefinition.findFirst({ where: { id, companyId: company.id } });
    if (!existing) throw new NotFoundException('Status definition not found');
    return this.prisma.statusDefinition.update({ where: { id }, data: data as unknown as Prisma.StatusDefinitionUpdateInput });
  }

  async deleteStatusDefinition(user: CurrentUser, id: string) {
    const company = this.getCompanyContext(user);
    const existing = await this.prisma.statusDefinition.findFirst({ where: { id, companyId: company.id } });
    if (!existing) throw new NotFoundException('Status definition not found');
    return this.prisma.statusDefinition.delete({ where: { id } });
  }

  // Document Types (company-scoped)
  async listDocumentTypes(user: CurrentUser, query: { search?: string; page: number; pageSize: number }) {
    const company = this.getCompanyContext(user);
    const where: Prisma.DocumentTypeWhereInput = { companyId: company.id };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.documentType.findMany({ where, skip: (query.page - 1) * query.pageSize, take: query.pageSize, orderBy: { code: 'asc' } }),
      this.prisma.documentType.count({ where }),
    ]);
    return { items, page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) };
  }

  async getDocumentType(user: CurrentUser, id: string) {
    const company = this.getCompanyContext(user);
    const item = await this.prisma.documentType.findFirst({ where: { id, companyId: company.id } });
    if (!item) throw new NotFoundException('Document type not found');
    return item;
  }

  async createDocumentType(user: CurrentUser, data: Record<string, unknown>) {
    const company = this.getCompanyContext(user);
    return this.prisma.documentType.create({ data: { ...data, companyId: company.id } as unknown as Prisma.DocumentTypeCreateInput });
  }

  async updateDocumentType(user: CurrentUser, id: string, data: Record<string, unknown>) {
    const company = this.getCompanyContext(user);
    const existing = await this.prisma.documentType.findFirst({ where: { id, companyId: company.id } });
    if (!existing) throw new NotFoundException('Document type not found');
    return this.prisma.documentType.update({ where: { id }, data: data as unknown as Prisma.DocumentTypeUpdateInput });
  }

  async deleteDocumentType(user: CurrentUser, id: string) {
    const company = this.getCompanyContext(user);
    const existing = await this.prisma.documentType.findFirst({ where: { id, companyId: company.id } });
    if (!existing) throw new NotFoundException('Document type not found');
    return this.prisma.documentType.delete({ where: { id } });
  }

  // Numbering Configs (company-scoped)
  async listNumberingConfigs(user: CurrentUser, query: { entityType?: string; page: number; pageSize: number }) {
    const company = this.getCompanyContext(user);
    const where: Prisma.NumberingConfigWhereInput = { companyId: company.id };
    if (query.entityType) where.entityType = query.entityType;
    const [items, total] = await Promise.all([
      this.prisma.numberingConfig.findMany({ where, skip: (query.page - 1) * query.pageSize, take: query.pageSize, orderBy: { entityType: 'asc' } }),
      this.prisma.numberingConfig.count({ where }),
    ]);
    return { items, page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) };
  }

  async getNumberingConfig(user: CurrentUser, id: string) {
    const company = this.getCompanyContext(user);
    const item = await this.prisma.numberingConfig.findFirst({ where: { id, companyId: company.id } });
    if (!item) throw new NotFoundException('Numbering config not found');
    return item;
  }

  async createNumberingConfig(user: CurrentUser, data: Record<string, unknown>) {
    const company = this.getCompanyContext(user);
    return this.prisma.numberingConfig.create({ data: { ...data, companyId: company.id } as unknown as Prisma.NumberingConfigCreateInput });
  }

  async updateNumberingConfig(user: CurrentUser, id: string, data: Record<string, unknown>) {
    const company = this.getCompanyContext(user);
    const existing = await this.prisma.numberingConfig.findFirst({ where: { id, companyId: company.id } });
    if (!existing) throw new NotFoundException('Numbering config not found');
    return this.prisma.numberingConfig.update({ where: { id }, data: data as unknown as Prisma.NumberingConfigUpdateInput });
  }

  async deleteNumberingConfig(user: CurrentUser, id: string) {
    const company = this.getCompanyContext(user);
    const existing = await this.prisma.numberingConfig.findFirst({ where: { id, companyId: company.id } });
    if (!existing) throw new NotFoundException('Numbering config not found');
    return this.prisma.numberingConfig.delete({ where: { id } });
  }

  // Locations (company-scoped)
  async listLocations(user: CurrentUser, query: { search?: string; type?: string; page: number; pageSize: number }) {
    const company = this.getCompanyContext(user);
    const where: Prisma.LocationWhereInput = { companyId: company.id };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.type) where.type = query.type;
    const [items, total] = await Promise.all([
      this.prisma.location.findMany({ where, skip: (query.page - 1) * query.pageSize, take: query.pageSize, orderBy: { code: 'asc' } }),
      this.prisma.location.count({ where }),
    ]);
    return { items, page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) };
  }

  async getLocation(user: CurrentUser, id: string) {
    const company = this.getCompanyContext(user);
    const item = await this.prisma.location.findFirst({ where: { id, companyId: company.id } });
    if (!item) throw new NotFoundException('Location not found');
    return item;
  }

  async createLocation(user: CurrentUser, data: Record<string, unknown>) {
    const company = this.getCompanyContext(user);
    return this.prisma.location.create({ data: { ...data, companyId: company.id } as unknown as Prisma.LocationCreateInput });
  }

  async updateLocation(user: CurrentUser, id: string, data: Record<string, unknown>) {
    const company = this.getCompanyContext(user);
    const existing = await this.prisma.location.findFirst({ where: { id, companyId: company.id } });
    if (!existing) throw new NotFoundException('Location not found');
    return this.prisma.location.update({ where: { id }, data: data as unknown as Prisma.LocationUpdateInput });
  }

  async deleteLocation(user: CurrentUser, id: string) {
    const company = this.getCompanyContext(user);
    const existing = await this.prisma.location.findFirst({ where: { id, companyId: company.id } });
    if (!existing) throw new NotFoundException('Location not found');
    return this.prisma.location.delete({ where: { id } });
  }

  // Departments (company-scoped)
  async listDepartments(user: CurrentUser, query: { search?: string; page: number; pageSize: number }) {
    const company = this.getCompanyContext(user);
    const where: Prisma.DepartmentWhereInput = { companyId: company.id };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.department.findMany({ where, skip: (query.page - 1) * query.pageSize, take: query.pageSize, orderBy: { code: 'asc' } }),
      this.prisma.department.count({ where }),
    ]);
    return { items, page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) };
  }

  async getDepartment(user: CurrentUser, id: string) {
    const company = this.getCompanyContext(user);
    const item = await this.prisma.department.findFirst({ where: { id, companyId: company.id } });
    if (!item) throw new NotFoundException('Department not found');
    return item;
  }

  async createDepartment(user: CurrentUser, data: Record<string, unknown>) {
    const company = this.getCompanyContext(user);
    return this.prisma.department.create({ data: { ...data, companyId: company.id } as unknown as Prisma.DepartmentCreateInput });
  }

  async updateDepartment(user: CurrentUser, id: string, data: Record<string, unknown>) {
    const company = this.getCompanyContext(user);
    const existing = await this.prisma.department.findFirst({ where: { id, companyId: company.id } });
    if (!existing) throw new NotFoundException('Department not found');
    return this.prisma.department.update({ where: { id }, data: data as unknown as Prisma.DepartmentUpdateInput });
  }

  async deleteDepartment(user: CurrentUser, id: string) {
    const company = this.getCompanyContext(user);
    const existing = await this.prisma.department.findFirst({ where: { id, companyId: company.id } });
    if (!existing) throw new NotFoundException('Department not found');
    return this.prisma.department.delete({ where: { id } });
  }

  // Branches (company-scoped)
  async listBranches(user: CurrentUser, query: { search?: string; page: number; pageSize: number }) {
    const company = this.getCompanyContext(user);
    const where: Prisma.BranchWhereInput = { companyId: company.id };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.branch.findMany({ where, skip: (query.page - 1) * query.pageSize, take: query.pageSize, orderBy: { code: 'asc' } }),
      this.prisma.branch.count({ where }),
    ]);
    return { items, page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) };
  }

  async getBranch(user: CurrentUser, id: string) {
    const company = this.getCompanyContext(user);
    const item = await this.prisma.branch.findFirst({ where: { id, companyId: company.id } });
    if (!item) throw new NotFoundException('Branch not found');
    return item;
  }

  async createBranch(user: CurrentUser, data: Record<string, unknown>) {
    const company = this.getCompanyContext(user);
    return this.prisma.branch.create({ data: { ...data, companyId: company.id } as unknown as Prisma.BranchCreateInput });
  }

  async updateBranch(user: CurrentUser, id: string, data: Record<string, unknown>) {
    const company = this.getCompanyContext(user);
    const existing = await this.prisma.branch.findFirst({ where: { id, companyId: company.id } });
    if (!existing) throw new NotFoundException('Branch not found');
    return this.prisma.branch.update({ where: { id }, data: data as unknown as Prisma.BranchUpdateInput });
  }

  async deleteBranch(user: CurrentUser, id: string) {
    const company = this.getCompanyContext(user);
    const existing = await this.prisma.branch.findFirst({ where: { id, companyId: company.id } });
    if (!existing) throw new NotFoundException('Branch not found');
    return this.prisma.branch.delete({ where: { id } });
  }
}
