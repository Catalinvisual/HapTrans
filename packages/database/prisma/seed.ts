/**
 * Deterministic development seed (TASK 05 + TASK 06).
 *
 * Creates:
 * - authentication foundation
 * - master data foundation
 */
import {
  PrismaClient,
  CustomerStatus,
  DriverStatus,
  InvoiceStatus,
  OrderStatus,
  PaymentMethod,
  TripStatus,
  VehicleStatus,
} from '@prisma/client';
import * as argon2 from 'argon2';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const DEV_SUPERADMIN_PASSWORD = process.env.DEV_SUPERADMIN_PASSWORD || 'SuperAdmin123!';
const DEV_ADMIN_PASSWORD = process.env.DEV_ADMIN_PASSWORD || 'Admin123!';

async function main() {
  // --- Auth foundation ---
  const company = await prisma.company.upsert({
    where: { code: 'HAPCARGO' },
    update: {},
    create: {
      code: 'HAPCARGO',
      name: 'HAP CARGO SRL',
      legalName: 'HAP CARGO SRL',
      country: 'RO',
      currency: 'EUR',
      timezone: 'Europe/Bucharest',
      locale: 'en',
    },
  });

  const branch = await prisma.branch.upsert({
    where: { companyId_code: { companyId: company.id, code: 'HQ' } },
    update: {},
    create: {
      companyId: company.id,
      name: 'Headquarters',
      code: 'HQ',
      type: 'HQ',
      timezone: 'Europe/Bucharest',
      isDefault: true,
    },
  });

  const superAdminRole = await prisma.role.upsert({
    where: { companyId_name: { companyId: company.id, name: 'SUPER_ADMIN' } },
    update: {},
    create: { companyId: company.id, name: 'SUPER_ADMIN', description: 'Full system access', isSystem: true },
  });

  const adminRole = await prisma.role.upsert({
    where: { companyId_name: { companyId: company.id, name: 'ADMIN' } },
    update: {},
    create: { companyId: company.id, name: 'ADMIN', description: 'Administrative access', isSystem: true },
  });

  const baseActions = ['view', 'create', 'edit', 'delete', 'approve', 'export', 'print', 'assign', 'plan', 'invoice', 'manage_users', 'manage_settings'];
  const subjects = ['customers', 'orders', 'planning', 'trips', 'dispatch', 'fleet', 'finance', 'documents', 'analytics', 'communication', 'portals', 'AI', 'administration'];

  for (const action of baseActions) {
    for (const subject of subjects) {
      await prisma.permission.upsert({
        where: { action_subject: { action, subject } },
        update: {},
        create: { action, subject },
      });
    }
  }

  for (const action of baseActions) {
    for (const subject of subjects) {
      const perm = await prisma.permission.findUnique({ where: { action_subject: { action, subject } } });
      if (perm) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: perm.id } },
          update: {},
          create: { roleId: superAdminRole.id, permissionId: perm.id, scope: 'company' },
        });
      }
    }
  }

  const adminPerms = ['view', 'create', 'edit', 'delete', 'export', 'print', 'assign', 'plan', 'invoice'];
  for (const action of adminPerms) {
    for (const subject of subjects) {
      const perm = await prisma.permission.findUnique({ where: { action_subject: { action, subject } } });
      if (perm) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
          update: {},
          create: { roleId: adminRole.id, permissionId: perm.id, scope: 'company' },
        });
      }
    }
  }

  const superAdminHash = await argon2.hash(DEV_SUPERADMIN_PASSWORD, { type: argon2.argon2id });
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@hapcargo.local' },
    update: { passwordHash: superAdminHash, status: 'ACTIVE', emailVerified: true },
    create: { email: 'superadmin@hapcargo.local', passwordHash: superAdminHash, firstName: 'Super', lastName: 'Admin', status: 'ACTIVE', emailVerified: true },
  });

  const adminHash = await argon2.hash(DEV_ADMIN_PASSWORD, { type: argon2.argon2id });
  const admin = await prisma.user.upsert({
    where: { email: 'admin@hapcargo.local' },
    update: { passwordHash: adminHash, status: 'ACTIVE', emailVerified: true },
    create: { email: 'admin@hapcargo.local', passwordHash: adminHash, firstName: 'Admin', lastName: 'User', status: 'ACTIVE', emailVerified: true },
  });

  const admin2Hash = await argon2.hash('admin', { type: argon2.argon2id });
  const admin2 = await prisma.user.upsert({
    where: { email: 'admin@hapcargo.com' },
    update: { passwordHash: admin2Hash, status: 'ACTIVE', emailVerified: true },
    create: { email: 'admin@hapcargo.com', passwordHash: admin2Hash, firstName: 'Admin', lastName: 'Com', status: 'ACTIVE', emailVerified: true },
  });

  await prisma.companyUser.upsert({
    where: { userId_companyId: { userId: superAdmin.id, companyId: company.id } },
    update: { branchId: branch.id, isPrimary: true },
    create: { userId: superAdmin.id, companyId: company.id, branchId: branch.id, isPrimary: true },
  });

  await prisma.companyUser.upsert({
    where: { userId_companyId: { userId: admin.id, companyId: company.id } },
    update: { branchId: branch.id, isPrimary: true },
    create: { userId: admin.id, companyId: company.id, branchId: branch.id, isPrimary: true },
  });

  await prisma.companyUser.upsert({
    where: { userId_companyId: { userId: admin2.id, companyId: company.id } },
    update: { branchId: branch.id, isPrimary: true },
    create: { userId: admin2.id, companyId: company.id, branchId: branch.id, isPrimary: true },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId_companyId: { userId: superAdmin.id, roleId: superAdminRole.id, companyId: company.id } },
    update: {},
    create: { userId: superAdmin.id, roleId: superAdminRole.id, companyId: company.id, branchId: branch.id },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId_companyId: { userId: admin.id, roleId: adminRole.id, companyId: company.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id, companyId: company.id, branchId: branch.id },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId_companyId: { userId: admin2.id, roleId: superAdminRole.id, companyId: company.id } },
    update: {},
    create: { userId: admin2.id, roleId: superAdminRole.id, companyId: company.id, branchId: branch.id },
  });

  // --- Master Data seed ---
  const countries = [
    { codeAlpha2: 'RO', codeAlpha3: 'ROU', numericCode: '642', name: 'Romania', isEuMember: true, isSchengen: true },
    { codeAlpha2: 'NL', codeAlpha3: 'NLD', numericCode: '528', name: 'Netherlands', isEuMember: true, isSchengen: true },
    { codeAlpha2: 'PL', codeAlpha3: 'POL', numericCode: '616', name: 'Poland', isEuMember: true, isSchengen: true },
    { codeAlpha2: 'FR', codeAlpha3: 'FRA', numericCode: '250', name: 'France', isEuMember: true, isSchengen: true },
    { codeAlpha2: 'ES', codeAlpha3: 'ESP', numericCode: '724', name: 'Spain', isEuMember: true, isSchengen: true },
    { codeAlpha2: 'DE', codeAlpha3: 'DEU', numericCode: '276', name: 'Germany', isEuMember: true, isSchengen: true },
    { codeAlpha2: 'IT', codeAlpha3: 'ITA', numericCode: '380', name: 'Italy', isEuMember: true, isSchengen: true },
    { codeAlpha2: 'BE', codeAlpha3: 'BEL', numericCode: '056', name: 'Belgium', isEuMember: true, isSchengen: true },
    { codeAlpha2: 'AT', codeAlpha3: 'AUT', numericCode: '040', name: 'Austria', isEuMember: true, isSchengen: true },
    { codeAlpha2: 'HU', codeAlpha3: 'HUN', numericCode: '348', name: 'Hungary', isEuMember: true, isSchengen: true },
    { codeAlpha2: 'CZ', codeAlpha3: 'CZE', numericCode: '203', name: 'Czech Republic', isEuMember: true, isSchengen: true },
    { codeAlpha2: 'SK', codeAlpha3: 'SVK', numericCode: '703', name: 'Slovakia', isEuMember: true, isSchengen: true },
    { codeAlpha2: 'BG', codeAlpha3: 'BGR', numericCode: '100', name: 'Bulgaria', isEuMember: true, isSchengen: false },
    { codeAlpha2: 'HR', codeAlpha3: 'HRV', numericCode: '191', name: 'Croatia', isEuMember: true, isSchengen: true },
    { codeAlpha2: 'PT', codeAlpha3: 'PRT', numericCode: '620', name: 'Portugal', isEuMember: true, isSchengen: true },
  ];

  for (const c of countries) {
    await prisma.country.upsert({
      where: { codeAlpha2: c.codeAlpha2 },
      update: c,
      create: c,
    });
  }

  const currencies = [
    { code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2 },
    { code: 'RON', name: 'Romanian Leu', symbol: 'lei', decimalPlaces: 2 },
    { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', decimalPlaces: 2 },
    { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', decimalPlaces: 0 },
    { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', decimalPlaces: 2 },
  ];

  for (const cur of currencies) {
    await prisma.currency.upsert({
      where: { code: cur.code },
      update: cur,
      create: cur,
    });
  }

  const timezones = [
    { identifier: 'Europe/Bucharest', displayName: 'Bucharest (EET/EEST)', offset: '+02:00' },
    { identifier: 'Europe/Amsterdam', displayName: 'Amsterdam (CET/CEST)', offset: '+01:00' },
    { identifier: 'Europe/Warsaw', displayName: 'Warsaw (CET/CEST)', offset: '+01:00' },
    { identifier: 'Europe/Paris', displayName: 'Paris (CET/CEST)', offset: '+01:00' },
    { identifier: 'Europe/Madrid', displayName: 'Madrid (CET/CEST)', offset: '+01:00' },
    { identifier: 'Europe/Berlin', displayName: 'Berlin (CET/CEST)', offset: '+01:00' },
    { identifier: 'Europe/Rome', displayName: 'Rome (CET/CEST)', offset: '+01:00' },
  ];

  for (const tz of timezones) {
    await prisma.timezone.upsert({
      where: { identifier: tz.identifier },
      update: tz,
      create: tz,
    });
  }

  const uoms = [
    { code: 'KG', name: 'Kilogram', category: 'weight', conversionFactor: 1 },
    { code: 'TON', name: 'Tonne', category: 'weight', conversionFactor: 1000 },
    { code: 'M3', name: 'Cubic Metre', category: 'volume', conversionFactor: 1 },
    { code: 'LITRE', name: 'Litre', category: 'volume', conversionFactor: 0.001 },
    { code: 'KM', name: 'Kilometre', category: 'distance', conversionFactor: 1 },
    { code: 'M', name: 'Metre', category: 'length', conversionFactor: 1 },
    { code: 'PALLET', name: 'Pallet', category: 'freight', conversionFactor: 1 },
    { code: 'PKG', name: 'Package', category: 'freight', conversionFactor: 1 },
    { code: 'PARCEL', name: 'Parcel', category: 'freight', conversionFactor: 1 },
    { code: 'LM', name: 'Loading Metre', category: 'freight', conversionFactor: 1 },
    { code: 'STOP', name: 'Stop', category: 'freight', conversionFactor: 1 },
    { code: 'MIN', name: 'Minute', category: 'time', conversionFactor: 1 },
    { code: 'HOUR', name: 'Hour', category: 'time', conversionFactor: 60 },
    { code: 'DAY', name: 'Day', category: 'time', conversionFactor: 1440 },
  ];

  for (const uom of uoms) {
    await prisma.uom.upsert({
      where: { code: uom.code },
      update: uom,
      create: uom,
    });
  }

  const transportModes = [
    { code: 'ROAD', name: 'Road', isActive: true },
    { code: 'RAIL', name: 'Rail', isActive: true },
    { code: 'SEA', name: 'Sea', isActive: true },
    { code: 'AIR', name: 'Air', isActive: true },
    { code: 'MULTIMODAL', name: 'Multimodal', isActive: true },
  ];

  for (const tm of transportModes) {
    await prisma.transportMode.upsert({
      where: { code: tm.code },
      update: tm,
      create: tm,
    });
  }

  const roadMode = await prisma.transportMode.findUnique({ where: { code: 'ROAD' } });

  const serviceTypes = [
    { companyId: company.id, code: 'FTL', name: 'Full Truck Load', transportModeId: roadMode?.id ?? null, isActive: true },
    { companyId: company.id, code: 'LTL', name: 'Less Than Truck Load', transportModeId: roadMode?.id ?? null, isActive: true },
    { companyId: company.id, code: 'GROUPAGE', name: 'Groupage', transportModeId: roadMode?.id ?? null, isActive: true },
    { companyId: company.id, code: 'EXPRESS', name: 'Express', transportModeId: roadMode?.id ?? null, isActive: true },
    { companyId: company.id, code: 'STANDARD', name: 'Standard', transportModeId: roadMode?.id ?? null, isActive: true },
    { companyId: company.id, code: 'DEDICATED', name: 'Dedicated', transportModeId: roadMode?.id ?? null, isActive: true },
    { companyId: company.id, code: 'DISTRIBUTION', name: 'Distribution', transportModeId: roadMode?.id ?? null, isActive: true },
  ];

  for (const st of serviceTypes) {
    await prisma.serviceType.upsert({
      where: { companyId_code: { companyId: st.companyId, code: st.code } },
      update: st,
      create: st,
    });
  }

  const cargoTypes = [
    { companyId: company.id, code: 'GENERAL', name: 'General Cargo', isActive: true },
    { companyId: company.id, code: 'PALLETIZED', name: 'Palletized Goods', isActive: true },
    { companyId: company.id, code: 'PARCELS', name: 'Parcels', isActive: true },
    { companyId: company.id, code: 'ADR', name: 'Dangerous Goods', isAdr: true, isActive: true },
    { companyId: company.id, code: 'REEFER', name: 'Temperature Controlled', isTemperatureControlled: true, isActive: true },
    { companyId: company.id, code: 'FRAGILE', name: 'Fragile', isActive: true },
    { companyId: company.id, code: 'OVERSIZED', name: 'Oversized', isActive: true },
  ];

  for (const ct of cargoTypes) {
    await prisma.cargoType.upsert({
      where: { companyId_code: { companyId: ct.companyId, code: ct.code } },
      update: ct,
      create: ct,
    });
  }

  const vehicleTypes = [
    { companyId: company.id, code: 'VAN', name: 'Van', payloadKg: 1500, volumeM3: 12, isActive: true },
    { companyId: company.id, code: 'BOX_TRUCK', name: 'Box Truck', payloadKg: 5000, volumeM3: 30, isActive: true },
    { companyId: company.id, code: 'CURTAINSIDER', name: 'Curtainsider', payloadKg: 25000, volumeM3: 90, isActive: true },
    { companyId: company.id, code: 'TRACTOR', name: 'Tractor', payloadKg: 0, volumeM3: 0, isActive: true },
    { companyId: company.id, code: 'REEFER', name: 'Refrigerated Truck', payloadKg: 25000, volumeM3: 90, isTemperatureControlled: true, isActive: true },
  ];

  for (const vt of vehicleTypes) {
    await prisma.vehicleType.upsert({
      where: { companyId_code: { companyId: vt.companyId, code: vt.code } },
      update: vt,
      create: vt,
    });
  }

  const trailerTypes = [
    { companyId: company.id, code: 'CURTAINSIDER', name: 'Curtainsider', payloadKg: 25000, volumeM3: 90, isActive: true },
    { companyId: company.id, code: 'BOX', name: 'Box', payloadKg: 25000, volumeM3: 90, isActive: true },
    { companyId: company.id, code: 'REEFER', name: 'Reefer', payloadKg: 25000, volumeM3: 90, isTemperatureControlled: true, isActive: true },
    { companyId: company.id, code: 'MEGA', name: 'Mega', payloadKg: 25000, volumeM3: 100, isActive: true },
  ];

  for (const tt of trailerTypes) {
    await prisma.trailerType.upsert({
      where: { companyId_code: { companyId: tt.companyId, code: tt.code } },
      update: tt,
      create: tt,
    });
  }

  const statusEntities = ['customer', 'quotation', 'order', 'trip', 'document', 'invoice', 'payment'];
  for (const entity of statusEntities) {
    await prisma.statusDefinition.upsert({
      where: { companyId_entityType_code: { companyId: company.id, entityType: entity, code: 'DRAFT' } },
      update: {},
      create: { companyId: company.id, entityType: entity, code: 'DRAFT', name: 'Draft', sortOrder: 1, isSystem: true },
    });
    await prisma.statusDefinition.upsert({
      where: { companyId_entityType_code: { companyId: company.id, entityType: entity, code: 'ACTIVE' } },
      update: {},
      create: { companyId: company.id, entityType: entity, code: 'ACTIVE', name: 'Active', sortOrder: 2, isSystem: true },
    });
    await prisma.statusDefinition.upsert({
      where: { companyId_entityType_code: { companyId: company.id, entityType: entity, code: 'ARCHIVED' } },
      update: {},
      create: { companyId: company.id, entityType: entity, code: 'ARCHIVED', name: 'Archived', sortOrder: 3, isSystem: true },
    });
  }

  const documentTypes = [
    { companyId: company.id, code: 'CMR', name: 'CMR', category: 'transport', isRequired: false },
    { companyId: company.id, code: 'ECMR', name: 'eCMR', category: 'transport', isRequired: false },
    { companyId: company.id, code: 'POD', name: 'Proof of Delivery', category: 'transport', isRequired: true },
    { companyId: company.id, code: 'INVOICE', name: 'Invoice', category: 'finance', isRequired: false },
    { companyId: company.id, code: 'CONTRACT', name: 'Contract', category: 'commercial', isRequired: false },
  ];

  for (const dt of documentTypes) {
    await prisma.documentType.upsert({
      where: { companyId_code: { companyId: dt.companyId, code: dt.code } },
      update: dt,
      create: dt,
    });
  }

  const numberingConfigs = [
    { companyId: company.id, branchId: branch.id, entityType: 'ORDER', prefix: 'ORD', minDigits: 8 },
    { companyId: company.id, branchId: branch.id, entityType: 'TRIP', prefix: 'TRP', minDigits: 8 },
    { companyId: company.id, branchId: branch.id, entityType: 'QUOTATION', prefix: 'QTE', minDigits: 8 },
    { companyId: company.id, branchId: branch.id, entityType: 'INVOICE', prefix: 'INV', minDigits: 8 },
  ];

  for (const nc of numberingConfigs) {
    const existing = await prisma.numberingConfig.findFirst({
      where: { companyId: nc.companyId, branchId: nc.branchId, entityType: nc.entityType },
    });
    if (!existing) {
      await prisma.numberingConfig.create({ data: nc });
    }
  }

  console.log(`Seed complete: company=${company.code} branch=${branch.code}`);
  console.log(`Dev accounts:`);
  console.log(`  SUPER_ADMIN: superadmin@hapcargo.local / ${DEV_SUPERADMIN_PASSWORD}`);
  console.log(`  ADMIN: admin@hapcargo.local / ${DEV_ADMIN_PASSWORD}`);
  console.log(`  SUPER_ADMIN: admin@hapcargo.com / admin`);

  // --- Customer Management seed (TASK 07) ---
  const categories = [
    { code: 'KEY_ACCOUNT', name: 'Key Account', color: '#dc2626', sortOrder: 1, isSystem: true },
    { code: 'STANDARD', name: 'Standard', color: '#2563eb', sortOrder: 2, isSystem: true },
    { code: 'SME', name: 'SME', color: '#16a34a', sortOrder: 3, isSystem: true },
    { code: 'STRATEGIC', name: 'Strategic', color: '#9333ea', sortOrder: 4, isSystem: true },
    { code: 'PROSPECT', name: 'Prospect', color: '#737373', sortOrder: 5, isSystem: true },
    { code: 'INTERNATIONAL', name: 'International', color: '#0891b2', sortOrder: 6, isSystem: true },
    { code: 'DOMESTIC', name: 'Domestic', color: '#ca8a04', sortOrder: 7, isSystem: true },
  ];

  for (const cat of categories) {
    await prisma.customerCategory.upsert({
      where: { companyId_code: { companyId: company.id, code: cat.code } },
      update: cat,
      create: { ...cat, companyId: company.id },
    });
  }

  const tags = [
    { name: 'ADR', color: '#dc2626' },
    { name: 'Reefer', color: '#3b82f6' },
    { name: 'High Volume', color: '#16a34a' },
    { name: 'International', color: '#0891b2' },
    { name: 'Priority', color: '#f59e0b' },
    { name: 'Key Account', color: '#9333ea' },
  ];

  for (const tag of tags) {
    await prisma.customerTag.upsert({
      where: { companyId_name: { companyId: company.id, name: tag.name } },
      update: tag,
      create: { ...tag, companyId: company.id },
    });
  }

  const keyAccountCategory = await prisma.customerCategory.findFirst({ where: { companyId: company.id, code: 'KEY_ACCOUNT' } });
  const standardCategory = await prisma.customerCategory.findFirst({ where: { companyId: company.id, code: 'STANDARD' } });
  const prospectCategory = await prisma.customerCategory.findFirst({ where: { companyId: company.id, code: 'PROSPECT' } });
  const smeCategory = await prisma.customerCategory.findFirst({ where: { companyId: company.id, code: 'SME' } });
  const strategicCategory = await prisma.customerCategory.findFirst({ where: { companyId: company.id, code: 'STRATEGIC' } });

  const customers = [
    { code: 'CUS-000001', legalName: 'EuroTrans Manufacturing GmbH', tradingName: 'EuroTrans', shortName: 'ETM', registrationNumber: 'DE123456789', vatNumber: 'DE123456789', taxNumber: '123/456/78901', legalForm: 'GmbH', country: 'DE', defaultLanguage: 'en', defaultCurrency: 'EUR', timezone: 'Europe/Berlin', mainEmail: 'info@eurotrans.de', billingEmail: 'billing@eurotrans.de', phone: '+49 30 12345678', mobile: '+49 170 1234567', website: 'https://eurotrans.de', paymentTerms: 'Net 30', creditLimit: 50000, categoryId: keyAccountCategory?.id, salesOwnerId: admin.id, accountManagerId: admin.id, commercialStatus: 'ACTIVE', defaultServiceTypeId: (await prisma.serviceType.findFirst({ where: { companyId: company.id, code: 'FTL' } }))?.id, preferredTransportModeId: roadMode?.id, operationalInstructions: 'Require advance notice for ADR shipments', specialHandlingRequirements: 'Fragile electronics', isAdrRelevant: false, isTemperatureControlled: false, status: 'ACTIVE', isActive: true },
    { code: 'CUS-000002', legalName: 'Benelux Fresh Logistics BV', tradingName: 'FreshLogistics', shortName: 'FLB', registrationNumber: 'NL987654321', vatNumber: 'NL987654321B01', taxNumber: '987654321', legalForm: 'BV', country: 'NL', defaultLanguage: 'nl', defaultCurrency: 'EUR', timezone: 'Europe/Amsterdam', mainEmail: 'ops@freshlogistics.nl', billingEmail: 'ap@freshlogistics.nl', phone: '+31 20 1234567', mobile: '+31 6 12345678', website: 'https://freshlogistics.nl', paymentTerms: 'Net 14', creditLimit: 75000, categoryId: strategicCategory?.id, salesOwnerId: admin.id, accountManagerId: admin.id, commercialStatus: 'ACTIVE', defaultServiceTypeId: (await prisma.serviceType.findFirst({ where: { companyId: company.id, code: 'REEFER' } }))?.id, preferredTransportModeId: roadMode?.id, operationalInstructions: 'Temperature controlled 2-8°C', specialHandlingRequirements: 'Reefer required', isAdrRelevant: false, isTemperatureControlled: true, status: 'ACTIVE', isActive: true },
    { code: 'CUS-000003', legalName: 'Polskie Przemysł Sp. z o.o.', tradingName: 'PolPrzemysł', shortName: 'PP', registrationNumber: 'PL1234567890', vatNumber: 'PL1234567890', taxNumber: '123-45-67-890', legalForm: 'Sp. z o.o.', country: 'PL', defaultLanguage: 'pl', defaultCurrency: 'EUR', timezone: 'Europe/Warsaw', mainEmail: 'kontakt@polprzemysl.pl', billingEmail: 'faktury@polprzemysl.pl', phone: '+48 22 1234567', mobile: '+48 501 234567', website: 'https://polprzemysl.pl', paymentTerms: 'Net 45', creditLimit: 30000, categoryId: smeCategory?.id, salesOwnerId: admin.id, accountManagerId: admin.id, commercialStatus: 'ACTIVE', defaultServiceTypeId: (await prisma.serviceType.findFirst({ where: { companyId: company.id, code: 'LTL' } }))?.id, preferredTransportModeId: roadMode?.id, operationalInstructions: 'Loading dock required', specialHandlingRequirements: 'Heavy pallets', isAdrRelevant: false, isTemperatureControlled: false, status: 'ACTIVE', isActive: true },
    { code: 'CUS-000004', legalName: 'RetailConnect France SAS', tradingName: 'RetailConnect', shortName: 'RCF', registrationNumber: 'FR987654321', vatNumber: 'FR98765432101', taxNumber: '987654321', legalForm: 'SAS', country: 'FR', defaultLanguage: 'fr', defaultCurrency: 'EUR', timezone: 'Europe/Paris', mainEmail: 'logistique@retailconnect.fr', billingEmail: 'compta@retailconnect.fr', phone: '+33 1 23 45 67 89', mobile: '+33 6 12 34 56 78', website: 'https://retailconnect.fr', paymentTerms: 'Net 60', creditLimit: 100000, categoryId: keyAccountCategory?.id, salesOwnerId: admin.id, accountManagerId: admin.id, commercialStatus: 'ACTIVE', defaultServiceTypeId: (await prisma.serviceType.findFirst({ where: { companyId: company.id, code: 'DISTRIBUTION' } }))?.id, preferredTransportModeId: roadMode?.id, operationalInstructions: 'Time-sensitive deliveries', specialHandlingRequirements: 'Cross-docking', isAdrRelevant: false, isTemperatureControlled: false, status: 'ACTIVE', isActive: true },
    { code: 'CUS-000005', legalName: 'Iberian Pharma Distribución SL', tradingName: 'IberPharma', shortName: 'IPD', registrationNumber: 'ESB12345678', vatNumber: 'ESB12345678', taxNumber: 'B12345678', legalForm: 'S.L.', country: 'ES', defaultLanguage: 'es', defaultCurrency: 'EUR', timezone: 'Europe/Madrid', mainEmail: 'info@iberpharma.es', billingEmail: 'facturacion@iberpharma.es', phone: '+34 91 123 45 67', mobile: '+34 612 345 678', website: 'https://iberpharma.es', paymentTerms: 'Net 30', creditLimit: 60000, categoryId: standardCategory?.id, salesOwnerId: admin.id, accountManagerId: admin.id, commercialStatus: 'ACTIVE', defaultServiceTypeId: (await prisma.serviceType.findFirst({ where: { companyId: company.id, code: 'REEFER' } }))?.id, preferredTransportModeId: roadMode?.id, operationalInstructions: 'GMP compliance required', specialHandlingRequirements: 'Pharma grade handling', isAdrRelevant: false, isTemperatureControlled: true, status: 'ACTIVE', isActive: true },
    { code: 'CUS-000006', legalName: 'Chemical Solutions Europe NV', tradingName: 'ChemSol', shortName: 'CSE', registrationNumber: 'BE0123456789', vatNumber: 'BE0123456789', taxNumber: '0123456789', legalForm: 'NV', country: 'BE', defaultLanguage: 'en', defaultCurrency: 'EUR', timezone: 'Europe/Brussels', mainEmail: 'dispatch@chemsol.eu', billingEmail: 'finance@chemsol.eu', phone: '+32 2 123 45 67', mobile: '+32 470 12 34 56', website: 'https://chemsol.eu', paymentTerms: 'Net 45', creditLimit: 80000, categoryId: prospectCategory?.id, salesOwnerId: admin.id, accountManagerId: admin.id, commercialStatus: 'PROSPECT', defaultServiceTypeId: (await prisma.serviceType.findFirst({ where: { companyId: company.id, code: 'FTL' } }))?.id, preferredTransportModeId: roadMode?.id, operationalInstructions: 'ADR classification required', specialHandlingRequirements: 'Hazardous materials', isAdrRelevant: true, isTemperatureControlled: false, status: 'PROSPECT', isActive: true },
  ];

  for (const c of customers) {
    const customerData = {
      ...c,
      status: c.status as CustomerStatus,
      categoryId: c.categoryId ?? null,
      salesOwnerId: c.salesOwnerId ?? null,
      accountManagerId: c.accountManagerId ?? null,
      defaultServiceTypeId: c.defaultServiceTypeId ?? null,
      preferredTransportModeId: c.preferredTransportModeId ?? null,
    };
    await prisma.customer.upsert({
      where: { companyId_code: { companyId: company.id, code: c.code } },
      update: customerData,
      create: { ...customerData, companyId: company.id },
    });
  }

  // Assign tags
  const adrTag = await prisma.customerTag.findFirst({ where: { companyId: company.id, name: 'ADR' } });
  const reeferTag = await prisma.customerTag.findFirst({ where: { companyId: company.id, name: 'Reefer' } });
  const highVolumeTag = await prisma.customerTag.findFirst({ where: { companyId: company.id, name: 'High Volume' } });
  const internationalTag = await prisma.customerTag.findFirst({ where: { companyId: company.id, name: 'International' } });
  const priorityTag = await prisma.customerTag.findFirst({ where: { companyId: company.id, name: 'Priority' } });
  const keyAccountTag = await prisma.customerTag.findFirst({ where: { companyId: company.id, name: 'Key Account' } });

  const tagAssignments = [
    { customerCode: 'CUS-000001', tagId: keyAccountTag?.id, tagId2: highVolumeTag?.id },
    { customerCode: 'CUS-000002', tagId: reeferTag?.id, tagId2: internationalTag?.id },
    { customerCode: 'CUS-000003', tagId: internationalTag?.id },
    { customerCode: 'CUS-000004', tagId: keyAccountTag?.id, tagId2: priorityTag?.id },
    { customerCode: 'CUS-000005', tagId: reeferTag?.id, tagId2: internationalTag?.id },
    { customerCode: 'CUS-000006', tagId: adrTag?.id, tagId2: internationalTag?.id },
  ];

  for (const ta of tagAssignments) {
    const customer = await prisma.customer.findFirst({ where: { companyId: company.id, code: ta.customerCode } });
    if (customer && ta.tagId) {
      await prisma.customerTagAssignment.upsert({
        where: { customerId_tagId: { customerId: customer.id, tagId: ta.tagId } },
        update: {},
        create: { customerId: customer.id, tagId: ta.tagId },
      });
    }
    if (customer && ta.tagId2) {
      await prisma.customerTagAssignment.upsert({
        where: { customerId_tagId: { customerId: customer.id, tagId: ta.tagId2 } },
        update: {},
        create: { customerId: customer.id, tagId: ta.tagId2 },
      });
    }
  }

  // -------------------------------------------------------------------------
  // Operations & Analytics seed (TASK 08)
  // Populates locations, vehicles, drivers and 12 months of order / trip /
  // invoice / payment history so Dashboard & Financial analytics are real.
  // -------------------------------------------------------------------------

  const mulberry32 = (seed: number) => {
    let a = seed >>> 0;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const rng = mulberry32(20260909);
  const now = new Date();
  const randInt = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
  const randDec = (min: number, max: number) => min + rng() * (max - min);
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)] as T;
  const pickWeighted = <T>(pairs: Array<[number, T]>): T => {
    const total = pairs.reduce((sum, [w]) => sum + w, 0);
    let r = rng() * total;
    for (const [w, v] of pairs) {
      r -= w;
      if (r <= 0) return v;
    }
    return (pairs[pairs.length - 1] as [number, T])[1];
  };

  const CITIES = [
    { city: 'Bucharest', country: 'RO', lat: 44.43, lon: 26.1 },
    { city: 'Cluj-Napoca', country: 'RO', lat: 46.77, lon: 23.6 },
    { city: 'Timisoara', country: 'RO', lat: 45.75, lon: 21.23 },
    { city: 'Arad', country: 'RO', lat: 46.18, lon: 21.31 },
    { city: 'Budapest', country: 'HU', lat: 47.5, lon: 19.04 },
    { city: 'Vienna', country: 'AT', lat: 48.21, lon: 16.37 },
    { city: 'Prague', country: 'CZ', lat: 50.08, lon: 14.44 },
    { city: 'Bratislava', country: 'SK', lat: 48.15, lon: 17.11 },
    { city: 'Warsaw', country: 'PL', lat: 52.23, lon: 21.01 },
    { city: 'Katowice', country: 'PL', lat: 50.26, lon: 19.02 },
    { city: 'Wroclaw', country: 'PL', lat: 51.11, lon: 17.04 },
    { city: 'Berlin', country: 'DE', lat: 52.52, lon: 13.41 },
    { city: 'Hamburg', country: 'DE', lat: 53.55, lon: 9.99 },
    { city: 'Munich', country: 'DE', lat: 48.14, lon: 11.58 },
    { city: 'Duisburg', country: 'DE', lat: 51.43, lon: 6.76 },
    { city: 'Amsterdam', country: 'NL', lat: 52.37, lon: 4.9 },
    { city: 'Rotterdam', country: 'NL', lat: 51.92, lon: 4.48 },
    { city: 'Utrecht', country: 'NL', lat: 52.09, lon: 5.12 },
    { city: 'Brussels', country: 'BE', lat: 50.85, lon: 4.35 },
    { city: 'Paris', country: 'FR', lat: 48.86, lon: 2.35 },
    { city: 'Lille', country: 'FR', lat: 50.63, lon: 3.06 },
    { city: 'Milan', country: 'IT', lat: 45.46, lon: 9.19 },
    { city: 'Rome', country: 'IT', lat: 41.9, lon: 12.5 },
    { city: 'Madrid', country: 'ES', lat: 40.42, lon: -3.7 },
    { city: 'Barcelona', country: 'ES', lat: 41.39, lon: 2.17 },
    { city: 'Lisbon', country: 'PT', lat: 38.72, lon: -9.14 },
    { city: 'Zagreb', country: 'HR', lat: 45.81, lon: 15.98 },
    { city: 'Sofia', country: 'BG', lat: 42.7, lon: 23.32 },
  ] as const;

  const haversineKm = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
    const R = 6371;
    const rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad;
    const dLon = (b.lon - a.lon) * rad;
    const lat1 = a.lat * rad;
    const lat2 = b.lat * rad;
    const h =
      Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.asin(Math.sqrt(h)) * 1.2;
  };

  // Wipe operational tables (dev seed regenerates them deterministically).
  await prisma.$transaction([
    prisma.trip.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.order.deleteMany(),
    prisma.driver.deleteMany(),
    prisma.vehicle.deleteMany(),
  ]);

  const vtList = await prisma.vehicleType.findMany({ where: { companyId: company.id } });
  const vtByCode = new Map(vtList.map((v) => [v.code, v.id]));
  const trailerList = await prisma.trailerType.findMany({ where: { companyId: company.id } });
  const trByCode = new Map(trailerList.map((t) => [t.code, t.id]));
  const serviceList = await prisma.serviceType.findMany({ where: { companyId: company.id } });
  const stByCode = new Map(serviceList.map((s) => [s.code, s.id]));
  const cargoList = await prisma.cargoType.findMany({ where: { companyId: company.id } });
  const ctByCode = new Map(cargoList.map((c) => [c.code, c.id]));
  const roadModeId = roadMode?.id ?? null;

  const vehicleDefs: Array<{
    code: string;
    plate: string;
    type: 'CURTAINSIDER' | 'BOX_TRUCK' | 'REEFER' | 'VAN';
    trailer: 'CURTAINSIDER' | 'BOX' | 'REEFER' | 'MEGA' | null;
    fuel: number;
    year: number;
  }> = [
    { code: 'TRK-001', plate: 'B 101 ABC', type: 'CURTAINSIDER', trailer: 'CURTAINSIDER', fuel: 32, year: 2021 },
    { code: 'TRK-002', plate: 'B 102 ABC', type: 'CURTAINSIDER', trailer: 'CURTAINSIDER', fuel: 31, year: 2022 },
    { code: 'TRK-003', plate: 'B 103 ABC', type: 'CURTAINSIDER', trailer: 'MEGA', fuel: 33, year: 2020 },
    { code: 'TRK-004', plate: 'B 104 ABC', type: 'CURTAINSIDER', trailer: 'CURTAINSIDER', fuel: 30, year: 2023 },
    { code: 'TRK-005', plate: 'B 105 ABC', type: 'CURTAINSIDER', trailer: null, fuel: 31, year: 2019 },
    { code: 'TRK-006', plate: 'B 106 ABC', type: 'CURTAINSIDER', trailer: 'CURTAINSIDER', fuel: 34, year: 2021 },
    { code: 'TRK-007', plate: 'B 107 ABC', type: 'CURTAINSIDER', trailer: 'MEGA', fuel: 32, year: 2022 },
    { code: 'TRK-008', plate: 'B 108 ABC', type: 'CURTAINSIDER', trailer: 'CURTAINSIDER', fuel: 31, year: 2020 },
    { code: 'TRK-009', plate: 'B 201 DEE', type: 'BOX_TRUCK', trailer: 'BOX', fuel: 28, year: 2022 },
    { code: 'TRK-010', plate: 'B 202 DEE', type: 'BOX_TRUCK', trailer: null, fuel: 27, year: 2021 },
    { code: 'TRK-011', plate: 'B 203 DEE', type: 'BOX_TRUCK', trailer: 'BOX', fuel: 29, year: 2023 },
    { code: 'TRK-012', plate: 'B 204 DEE', type: 'BOX_TRUCK', trailer: 'BOX', fuel: 28, year: 2019 },
    { code: 'TRK-013', plate: 'B 301 FRR', type: 'REEFER', trailer: 'REEFER', fuel: 36, year: 2021 },
    { code: 'TRK-014', plate: 'B 302 FRR', type: 'REEFER', trailer: 'REEFER', fuel: 35, year: 2022 },
    { code: 'TRK-015', plate: 'B 303 FRR', type: 'REEFER', trailer: 'REEFER', fuel: 37, year: 2020 },
    { code: 'TRK-016', plate: 'B 304 FRR', type: 'REEFER', trailer: 'REEFER', fuel: 34, year: 2023 },
    { code: 'TRK-017', plate: 'B 305 FRR', type: 'REEFER', trailer: 'REEFER', fuel: 36, year: 2021 },
    { code: 'TRK-018', plate: 'CTY 401 GHJ', type: 'BOX_TRUCK', trailer: null, fuel: 26, year: 2020 },
    { code: 'TRK-019', plate: 'CTY 402 GHJ', type: 'BOX_TRUCK', trailer: null, fuel: 27, year: 2021 },
    { code: 'TRK-020', plate: 'CTY 403 GHJ', type: 'BOX_TRUCK', trailer: null, fuel: 25, year: 2019 },
    { code: 'TRK-021', plate: 'CTY 501 KLM', type: 'VAN', trailer: null, fuel: 14, year: 2022 },
    { code: 'TRK-022', plate: 'CTY 502 KLM', type: 'VAN', trailer: null, fuel: 13, year: 2023 },
    { code: 'TRK-023', plate: 'CTY 503 KLM', type: 'VAN', trailer: null, fuel: 15, year: 2020 },
    { code: 'TRK-024', plate: 'CTY 504 KLM', type: 'VAN', trailer: null, fuel: 14, year: 2021 },
    { code: 'TRK-025', plate: 'CTY 505 KLM', type: 'VAN', trailer: null, fuel: 13, year: 2022 },
    { code: 'TRK-026', plate: 'CTY 601 NOP', type: 'BOX_TRUCK', trailer: 'BOX', fuel: 27, year: 2023 },
  ];

  const vehiclePayload = { CURTAINSIDER: 25000, BOX_TRUCK: 8500, REEFER: 25000, VAN: 1200 };
  const vehicleVolume = { CURTAINSIDER: 90, BOX_TRUCK: 40, REEFER: 90, VAN: 10 };

  const statusWeights: Array<[number, VehicleStatus]> = [
    [28, 'AVAILABLE'],
    [48, 'IN_TRANSIT'],
    [14, 'IN_MAINTENANCE'],
    [8, 'OFF_ROAD'],
    [2, 'DECOMMISSIONED'],
  ];

  const vehicleSeeds = vehicleDefs.map((v) => {
    const city = pick(CITIES as unknown as Array<{ city: string; country: string; lat: number; lon: number }>);
    const status = pickWeighted(statusWeights);
    return {
      companyId: company.id,
      branchId: branch.id,
      code: v.code,
      registrationPlate: v.plate,
      vehicleTypeId: vtByCode.get(v.type) ?? null,
      trailerTypeId: v.trailer ? (trByCode.get(v.trailer) ?? null) : null,
      manufacturer: v.type === 'VAN' ? 'Ford' : 'Scania',
      model: v.type === 'VAN' ? 'Transit' : 'R 450',
      year: v.year,
      fuelType: v.type === 'VAN' ? 'Diesel' : 'Diesel',
      fuelConsumptionL100km: v.fuel,
      odometerKm: randInt(15000, 420000),
      status,
      currentCity: city.city,
      currentCountry: city.country,
      payloadKg: vehiclePayload[v.type],
      volumeM3: vehicleVolume[v.type],
      isAdrCertified: v.type === 'CURTAINSIDER' && rng() > 0.5,
      isTemperatureControlled: v.type === 'REEFER',
      isActive: status !== 'DECOMMISSIONED',
    };
  });

  const driverNames: Array<[string, string]> = [
    ['Jan', 'de Vries'], ['Marco', 'Bakker'], ['Piotr', 'Jansen'], ['Kristof', 'Mulder'],
    ['Sander', 'Visser'], ['Lukasz', 'Smit'], ['Tobias', 'de Groot'], ['Andreas', 'Hendriks'],
    ['Emil', 'Ionescu'], ['Ionut', 'Popescu'], ['Mihai', 'Dumitru'], ['Adrian', 'Stanescu'],
    ['Bogdan', 'Tudor'], ['Catalin', 'Marin'], ['Florin', 'Radu'], ['Gabriel', 'Moldovan'],
    ['Stefan', 'Constantin'], ['Vasile', 'Ungureanu'], ['Laszlo', 'Kovacs'], ['Antal', 'Nagy'],
    ['Zoltan', 'Szabo'], ['Petar', 'Horvat'], ['Nikolai', 'Ivanov'], ['Karol', 'Nowak'],
    ['Michal', 'Wisniewski'], ['Stefan', 'Muller'], ['Luca', 'Rossi'], ['Mateo', 'Lopez'],
    ['Fred', 'Vermeulen'], ['Hans', 'Peeters'],
  ];

  const driverStatuses: Array<[number, DriverStatus]> = [
    [82, 'ACTIVE'],
    [11, 'ON_LEAVE'],
    [4, 'SUSPENDED'],
    [3, 'INACTIVE'],
  ];

  const driverSeeds = driverNames.map(([first, last], i) => {
    const status = pickWeighted(driverStatuses);
    return {
      companyId: company.id,
      branchId: branch.id,
      code: `DRV-${String(i + 1).padStart(3, '0')}`,
      firstName: first,
      lastName: last,
      phone: `+40 7${randInt(20, 99)} ${String(randInt(100, 999))} ${String(randInt(100, 999))}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@hapcargo.local`,
      licenseNumber: `RO${randInt(100000000, 999999999)}`,
      licenseExpiry: new Date(now.getFullYear() + randInt(1, 4), randInt(0, 11), randInt(1, 28)),
      status,
      rating: randDec(3.4, 5.0),
      hiredAt: new Date(now.getFullYear() - randInt(1, 8), randInt(0, 11), randInt(1, 28)),
      isActive: status !== 'INACTIVE',
      totalTrips: 0,
      totalKm: 0,
      onTimeRate: 0,
    };
  });

  await prisma.vehicle.createMany({ data: vehicleSeeds });
  await prisma.driver.createMany({ data: driverSeeds });
  console.log(`[ops-seed] vehicles=${vehicleSeeds.length} drivers=${driverSeeds.length} created`);

  const vehicles = await prisma.vehicle.findMany({ where: { companyId: company.id } });
  const drivers = await prisma.driver.findMany({ where: { companyId: company.id } });
  const customersAll = await prisma.customer.findMany({ where: { companyId: company.id, status: 'ACTIVE' } });
  const customerPool: Array<[number, (typeof customersAll)[number]]> = customersAll.map((c, i) => [
    Math.max(1, 8 - Math.floor(i / 1.5)),
    c,
  ]);

  const CITY_BY_COUNTRY = new Map<string, Array<{ city: string; country: string; lat: number; lon: number }>>();
  for (const c of CITIES) {
    const list = CITY_BY_COUNTRY.get(c.country) ?? [];
    list.push({ city: c.city, country: c.country, lat: c.lat, lon: c.lon });
    CITY_BY_COUNTRY.set(c.country, list);
  }

  const countryWeights: Array<[number, string]> = [
    [30, 'RO'], [16, 'DE'], [14, 'NL'], [10, 'FR'], [10, 'BE'], [7, 'PL'], [8, 'HU'], [6, 'AT'], [4, 'IT'], [3, 'CZ'], [2, 'ES'], [2, 'PT'], [2, 'HR'], [1, 'BG'],
  ];
  const destWeights: Array<[number, string]> = [
    [14, 'RO'], [18, 'DE'], [15, 'NL'], [12, 'FR'], [11, 'BE'], [8, 'PL'], [6, 'IT'], [5, 'ES'], [5, 'HU'], [4, 'AT'], [3, 'CZ'], [2, 'PT'], [2, 'HR'], [1, 'BG'],
  ];

  const serviceWeights: Array<[number, string]> = [
    [30, 'FTL'], [24, 'LTL'], [10, 'GROUPAGE'], [10, 'DEDICATED'], [12, 'DISTRIBUTION'], [7, 'EXPRESS'], [7, 'STANDARD'],
  ];
  const cargoWeights: Array<[number, string]> = [
    [30, 'GENERAL'], [28, 'PALLETIZED'], [8, 'PARCELS'], [6, 'ADR'], [12, 'REEFER'], [8, 'FRAGILE'], [8, 'OVERSIZED'],
  ];
  const goodsPool = [
    'Packaged goods (pallets)', 'General freight', 'Automotive parts', 'Chemicals (ADR)', 'Fresh produce',
    'Pharmaceuticals', 'Industrial machinery', 'Fashion & retail goods', 'Construction materials', 'Dry foodstuffs',
  ];
  const rateTable: Record<string, [number, number, number, number]> = {
    FTL: [1.35, 0.45, 120, 24000],
    LTL: [1.05, 0.4, 90, 7000],
    GROUPAGE: [0.9, 0.35, 110, 15000],
    DEDICATED: [1.5, 0.4, 150, 20000],
    DISTRIBUTION: [1.2, 0.4, 100, 9000],
    EXPRESS: [1.8, 0.6, 220, 2500],
    STANDARD: [1.0, 0.35, 80, 12000],
  };

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthsBack = 11;
  const start = new Date(today.getFullYear(), today.getMonth() - monthsBack, 1);
  const seasonFactor = [1.05, 1.0, 1.12, 1.02, 1.16, 1.06, 0.85, 0.8, 1.18, 1.28, 1.14, 1.1];

  interface OrderSeed {
    companyId: string;
    branchId: string;
    customerId: string;
    orderNumber: string;
    serviceTypeId: string;
    cargoTypeId: string | null;
    transportModeId: string | null;
    originCity: string;
    originCountry: string;
    destinationCity: string;
    destinationCountry: string;
    goodsDescription: string;
    weightKg: number;
    volumeM3: number;
    pallets: number;
    loadingMeters: number;
    isAdr: boolean;
    isTemperatureControlled: boolean;
    status: OrderStatus;
    requestedPickupAt: Date;
    requestedDeliveryAt: Date;
    promisedDeliveryAt: Date | null;
    actualPickupAt: Date | null;
    actualDeliveryAt: Date | null;
    isLate: boolean;
    lateMinutes: number;
    createdById: string;
    createdAt: Date;
  }

  interface TripSeed {
    companyId: string;
    tripNumber: string;
    vehicleId: string;
    driverId: string;
    status: TripStatus;
    plannedStartAt: Date;
    plannedEndAt: Date;
    actualStartAt: Date | null;
    actualEndAt: Date | null;
    distanceKm: number;
    actualDistanceKm: number;
    revenueAmount: number;
    costAmount: number;
    marginAmount: number;
    marginRate: number;
    fuelCost: number;
    tollsCost: number;
    driverCost: number;
    maintenanceCost: number;
    otherCost: number;
    isOnTime: boolean;
    lateMinutes: number;
    waitingMinutes: number;
    startCity: string;
    endCity: string;
    createdById: string;
    createdAt: Date;
  }

  interface InvoiceSeed {
    companyId: string;
    invoiceNumber: string;
    customerId: string;
    currency: string;
    subtotalAmount: number;
    taxAmount: number;
    totalAmount: number;
    issueDate: Date;
    dueDate: Date;
    createdById: string;
    createdAt: Date;
    status: InvoiceStatus;
    paidAmount: number;
    paidAt: Date | null;
    payment: { amount: number; method: PaymentMethod; reference: string; receivedAt: Date };
  }

  let numeric = 1;
  const orderSeeds: OrderSeed[] = [];
  const tripSeeds: (TripSeed | null)[] = [];
  const invoiceSeeds: InvoiceSeed[] = [];

  const d = new Date(start);
  while (d <= today) {
    const weekday = d.getDay();
    const isWeekend = weekday === 0 || weekday === 6;
    const season = seasonFactor[d.getMonth()] ?? 1;
    let count = Math.max(1, Math.round((isWeekend ? randInt(2, 4) : randInt(5, 9)) * season));
    const isToday = d.getTime() === today.getTime();
    const isYesterday = d.getTime() === today.getTime() - 86400000;

    for (let o = 0; o < count; o++) {
      const customer = pickWeighted(customerPool);
      const originCountry = pickWeighted(countryWeights);
      const originCities = CITY_BY_COUNTRY.get(originCountry) ?? [...CITIES];
      const origin = pick(originCities);

      let destCountry = pickWeighted(destWeights);
      let destCities = CITY_BY_COUNTRY.get(destCountry) ?? [...CITIES];
      let dest = pick(destCities);
      let guard = 0;
      while (dest.city === origin.city && guard++ < 50) {
        if (destCities.length <= 1) {
          destCountry = pickWeighted(destWeights);
          destCities = CITY_BY_COUNTRY.get(destCountry) ?? [...CITIES];
        }
        dest = pick(destCities);
      }
      if (dest.city === origin.city) {
        const others = [...CITIES].filter((c) => c.city !== origin.city && c.country !== origin.country);
        dest = pick(others.length > 0 ? others : [...CITIES]);
        destCountry = dest.country;
      }

      const distance = Math.round(haversineKm(origin, dest));
      const serviceCode = pickWeighted(serviceWeights);
      const cargoCode = pickWeighted(cargoWeights);
      const cargoTypeId = ctByCode.get(cargoCode) ?? null;
      const isAdr = cargoCode === 'ADR';
      const isTemp = cargoCode === 'REEFER';
      const [rateLo, rateJit, baseCharge, maxWeight] = rateTable[serviceCode] ?? [1.2, 0.4, 100, 15000];
      const weightKg = Math.round((maxWeight * 0.05 + rng() * maxWeight * 0.95) / 50) * 50;
      const pallets = Math.min(33, Math.max(1, Math.round(weightKg / 750)));
      const volumeM3 = round2((weightKg / 640) * (1 + rng() * 0.6));
      const loadingMeters = round2(Math.min(13.6, pallets * 1.6));

      const pickup = new Date(d.getFullYear(), d.getMonth(), d.getDate(), randInt(3, 22), randInt(0, 59), 0, 0);
      const durationDays = Math.max(1, distance / 650 + (originCountry !== destCountry ? 0.6 : 0.15));
      const delivery = new Date(pickup.getTime() + Math.round(durationDays * 24) * 3600000);
      const promised = new Date(delivery.getTime() + randInt(-24, 12) * 3600000);

      let status: OrderStatus;
      if (isToday) {
        const r = rng();
        status = r < 0.38 ? OrderStatus.IN_TRANSIT : r < 0.68 ? OrderStatus.CONFIRMED : OrderStatus.PLANNED;
      } else if (isYesterday) {
        status = rng() < 0.55 ? OrderStatus.DELIVERED : OrderStatus.IN_TRANSIT;
      } else {
        status = rng() < 0.94 ? OrderStatus.DELIVERED : OrderStatus.CANCELLED;
      }

      let actualPickup: Date | null = null;
      let actualDelivery: Date | null = null;
      let isLate = false;
      let lateMinutes = 0;

      if (status === OrderStatus.DELIVERED) {
        actualPickup = new Date(pickup.getTime() + randInt(0, 3) * 3600000);
        actualDelivery = new Date(delivery.getTime() + randInt(-14, 40) * 3600000);
        lateMinutes = Math.max(0, Math.round((actualDelivery.getTime() - promised.getTime()) / 60000));
        isLate = actualDelivery.getTime() > promised.getTime();
      } else if (status === OrderStatus.IN_TRANSIT && actualPickup === null) {
        actualPickup = new Date(pickup.getTime() + randInt(-1, 4) * 3600000);
      }

      const orderNumber = `ORD-${String(numeric).padStart(8, '0')}`;
      const createdAt = new Date(pickup.getTime() - randInt(0, 2) * 86400000);

      orderSeeds.push({
        companyId: company.id,
        branchId: branch.id,
        customerId: customer.id,
        orderNumber,
        serviceTypeId: stByCode.get(serviceCode) as string,
        cargoTypeId,
transportModeId: roadModeId,
        originCity: origin.city,
        originCountry: origin.country,
        destinationCity: dest.city,
        destinationCountry: dest.country,
        goodsDescription: pick(goodsPool),
        weightKg,
        volumeM3,
        pallets,
        loadingMeters,
        isAdr,
        isTemperatureControlled: isTemp,
        status,
        requestedPickupAt: pickup,
        requestedDeliveryAt: delivery,
        promisedDeliveryAt: promised,
        actualPickupAt: actualPickup,
        actualDeliveryAt: actualDelivery,
        isLate,
        lateMinutes,
        createdById: admin.id,
        createdAt,
      });

      numeric += 1;

      if (status === OrderStatus.CANCELLED) {
        tripSeeds.push(null);
        continue;
      }

      const tripStatus: TripStatus =
        status === OrderStatus.DELIVERED
          ? TripStatus.COMPLETED
          : status === OrderStatus.IN_TRANSIT
            ? TripStatus.IN_TRANSIT
            : TripStatus.PLANNED;

      let revenue = baseCharge + distance * (rateLo + rng() * rateJit);
      if (isAdr) revenue *= 1.08;
      if (isTemp) revenue *= 1.12;
      revenue = round2(revenue);
      const marginRate = 0.085 + rng() * 0.09;
      const cost = round2(revenue * (1 - marginRate));
      const fuelCost = round2(cost * (0.3 + rng() * 0.1));
      const driverCost = round2(cost * (0.27 + rng() * 0.09));
      const tollsCost = round2(cost * (0.09 + rng() * 0.07));
      const maintenanceCost = round2(cost * (0.05 + rng() * 0.04));
      const otherCost = round2(Math.max(0, cost - fuelCost - driverCost - tollsCost - maintenanceCost));

      tripSeeds.push({
        companyId: company.id,
        tripNumber: `TRP-${String(numeric - 1).padStart(8, '0')}`,
        vehicleId: pick(vehicles).id,
        driverId: pick(drivers).id,
        status: tripStatus,
        plannedStartAt: pickup,
        plannedEndAt: delivery,
        actualStartAt: actualPickup,
        actualEndAt: actualDelivery,
        distanceKm: distance,
        actualDistanceKm: round2(distance * (0.95 + rng() * 0.2)),
        revenueAmount: revenue,
        costAmount: cost,
        marginAmount: round2(revenue - cost),
        marginRate: round2(((revenue - cost) / revenue) * 100),
        fuelCost,
        tollsCost,
        driverCost,
        maintenanceCost,
        otherCost,
        isOnTime: !isLate,
        lateMinutes,
        waitingMinutes: randInt(0, 240),
        startCity: origin.city,
        endCity: dest.city,
        createdById: admin.id,
        createdAt,
      });

      if (status === OrderStatus.DELIVERED && rng() < 0.97) {
        const issueDate = new Date((actualDelivery ?? delivery).getTime() + randInt(1, 5) * 86400000);
        const termsMatch = /(\d+)/.exec(customer.paymentTerms ?? 'Net 30');
        const netDays = termsMatch ? Number(termsMatch[1]) : 30;
        const dueDate = new Date(issueDate.getTime() + netDays * 86400000);
        const ageDays = (today.getTime() - issueDate.getTime()) / 86400000;

        let invStatus: InvoiceStatus;
        let paidAmount = 0;
        let paidAt: Date | null = null;
        let partial = false;
        if (ageDays > 75) {
          invStatus = rng() < 0.05 ? InvoiceStatus.ISSUED : InvoiceStatus.PAID;
        } else if (ageDays > 40) {
          const r = rng();
          invStatus = r < 0.5 ? InvoiceStatus.PAID : r < 0.62 ? InvoiceStatus.PARTIALLY_PAID : InvoiceStatus.ISSUED;
        } else if (ageDays > 18) {
          const r = rng();
          invStatus = r < 0.2 ? InvoiceStatus.PAID : r < 0.35 ? InvoiceStatus.PARTIALLY_PAID : InvoiceStatus.ISSUED;
        } else {
          const r = rng();
          invStatus = r < 0.08 ? InvoiceStatus.PAID : r < 0.14 ? InvoiceStatus.PARTIALLY_PAID : InvoiceStatus.ISSUED;
        }
        if (invStatus === InvoiceStatus.PAID) {
          paidAmount = revenue;
          paidAt = new Date(Math.min(issueDate.getTime() + randInt(8, netDays + 12) * 86400000, today.getTime()));
        } else if (invStatus === InvoiceStatus.PARTIALLY_PAID) {
          paidAmount = round2(revenue * randDec(0.4, 0.7));
          paidAt = new Date(Math.min(issueDate.getTime() + randInt(6, netDays) * 86400000, today.getTime()));
          partial = true;
        }
        const payMethod: PaymentMethod = pickWeighted<PaymentMethod>([
          [80, PaymentMethod.BANK_TRANSFER],
          [8, PaymentMethod.SEPA_DIRECT_DEBIT],
          [6, PaymentMethod.CARD],
          [4, PaymentMethod.CASH],
          [2, PaymentMethod.OTHER],
        ]);
        invoiceSeeds.push({
          companyId: company.id,
          invoiceNumber: `INV-${String(invoiceSeeds.length + 1).padStart(8, '0')}`,
          customerId: customer.id,
          currency: 'EUR',
          subtotalAmount: revenue,
          taxAmount: 0,
          totalAmount: revenue,
          issueDate,
          dueDate,
          createdById: admin.id,
          createdAt: issueDate,
          status: invStatus,
          paidAmount,
          paidAt,
          payment:
            paidAmount > 0
              ? {
                  amount: partial ? paidAmount : paidAmount,
                  method: payMethod,
                  reference: `PAY-${String(invoiceSeeds.length + 1).padStart(8, '0')}`,
                  receivedAt: paidAt ?? issueDate,
                }
              : { amount: 0, method: PaymentMethod.BANK_TRANSFER, reference: '', receivedAt: issueDate },
        });
      }
    }
    d.setDate(d.getDate() + 1);
  }

  console.log(`[ops-seed] generated ${orderSeeds.length} orders / ${tripSeeds.filter((v) => v !== null).length} trips / ${invoiceSeeds.length} invoices`);

  const chunksOf = <T,>(arr: T[], size: number): T[][] => {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };

  let createdOrders: Awaited<ReturnType<typeof prisma.order.createManyAndReturn>> = [];
  for (const chunk of chunksOf(orderSeeds, 500)) {
    const rows = await prisma.order.createManyAndReturn({ data: chunk });
    createdOrders = createdOrders.concat(rows);
    console.log(`[ops-seed] orders inserted ${createdOrders.length}/${orderSeeds.length}`);
  }
  const orderIdByNumber = new Map(createdOrders.map((o) => [o.orderNumber, o.id]));

  const tripQuads: Array<TripSeed & { orderId: string }> = [];
  for (let i = 0; i < tripSeeds.length; i++) {
    const t = tripSeeds[i];
    if (!t) continue;
    const order = orderSeeds[i];
    if (!order) continue;
    const orderId = orderIdByNumber.get(order.orderNumber);
    if (orderId) tripQuads.push({ ...t, orderId });
  }

  let createdTrips: Awaited<ReturnType<typeof prisma.trip.createManyAndReturn>> = [];
  for (const chunk of chunksOf(tripQuads, 500)) {
    const rows = await prisma.trip.createManyAndReturn({ data: chunk });
    createdTrips = createdTrips.concat(rows);
    console.log(`[ops-seed] trips inserted ${createdTrips.length}/${tripQuads.length}`);
  }

  const invoiceRows = invoiceSeeds.map((i) => ({
    companyId: i.companyId,
    invoiceNumber: i.invoiceNumber,
    customerId: i.customerId,
    status: i.status,
    currency: i.currency,
    subtotalAmount: i.subtotalAmount,
    taxAmount: i.taxAmount,
    totalAmount: i.totalAmount,
    paidAmount: i.paidAmount,
    issueDate: i.issueDate,
    dueDate: i.dueDate,
    paidAt: i.paidAt,
    createdById: i.createdById,
    createdAt: i.createdAt,
  }));
  let createdInvoices: Awaited<ReturnType<typeof prisma.invoice.createManyAndReturn>> = [];
  for (const chunk of chunksOf(invoiceRows, 500)) {
    const rows = await prisma.invoice.createManyAndReturn({ data: chunk });
    createdInvoices = createdInvoices.concat(rows);
    console.log(`[ops-seed] invoices inserted ${createdInvoices.length}/${invoiceRows.length}`);
  }

  const invoiceIdByNumber = new Map(createdInvoices.map((i) => [i.invoiceNumber, i.id]));
  const paymentSeeds = invoiceSeeds
    .filter((i) => i.payment.amount > 0)
    .flatMap((i) => {
      const invoiceId = invoiceIdByNumber.get(i.invoiceNumber);
      if (!invoiceId) return [];
      return [
        {
          companyId: i.companyId,
          invoiceId,
          customerId: i.customerId,
          amount: i.payment.amount,
          method: i.payment.method,
          reference: i.payment.reference,
          receivedAt: i.payment.receivedAt,
        },
      ];
    });
  let paymentsCreated = 0;
  for (const chunk of chunksOf(paymentSeeds, 500)) {
    await prisma.payment.createMany({ data: chunk });
    paymentsCreated += chunk.length;
    console.log(`[ops-seed] payments inserted ${paymentsCreated}/${paymentSeeds.length}`);
  }

  // Recompute driver aggregates + vehicle status from generated trips.
  const driverStats = new Map<string, { trips: number; km: number; onTime: number }>();
  for (const t of createdTrips) {
    if (t.status === TripStatus.CANCELLED || !t.driverId) continue;
    const s = driverStats.get(t.driverId) ?? { trips: 0, km: 0, onTime: 0 };
    s.trips += 1;
    s.km += Number(t.actualDistanceKm ?? t.distanceKm);
    if (t.status === TripStatus.COMPLETED) {
      if (t.isOnTime) s.onTime += 1;
    }
    driverStats.set(t.driverId, s);
  }
  for (const d of drivers) {
    const s = driverStats.get(d.id);
    if (!s) continue;
    const onTimeRate = s.trips ? round2((s.onTime / s.trips) * 100) : 0;
    await prisma.driver.update({
      where: { id: d.id },
      data: { totalTrips: s.trips, totalKm: s.km, onTimeRate },
    });
  }

  const inTransitTripCounts = new Map<string, number>();
  for (const t of createdTrips) {
    if ((t.status === TripStatus.IN_TRANSIT || t.status === TripStatus.DISPATCHED || t.status === TripStatus.PICKUP) && t.vehicleId) {
      inTransitTripCounts.set(t.vehicleId, (inTransitTripCounts.get(t.vehicleId) ?? 0) + 1);
    }
  }
  for (const [i, v] of vehicles.entries()) {
    let status: VehicleStatus = (inTransitTripCounts.get(v.id) ?? 0) > 0 ? VehicleStatus.IN_TRANSIT : VehicleStatus.AVAILABLE;
    if (i % 11 === 7) status = VehicleStatus.IN_MAINTENANCE;
    if (i % 17 === 13) status = VehicleStatus.OFF_ROAD;
    await prisma.vehicle.update({ where: { id: v.id }, data: { status } });
  }

  console.log(
    `Operations seed complete: vehicles=${vehicleSeeds.length} drivers=${driverSeeds.length} ` +
      `orders=${createdOrders.length} trips=${createdTrips.length} invoices=${createdInvoices.length} payments=${paymentsCreated}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
