import { Injectable, Logger, OnApplicationBootstrap, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { AdrCatalogVersion } from './adr-catalog-version.entity';
import { AdrCatalogItem } from './adr-catalog-item.entity';
import { OFFICIAL_ADR_2025_TABLE_A, getCatalogChecksum, AdrSeedRecord } from './adr-data';
import { AdrRulesEngine, AdrItemInput, AdrEvaluationResult } from './adr-rules.engine';
import { Order } from '../orders/order.entity';
import { CargoItem } from '../orders/cargo-item.entity';
import * as crypto from 'crypto';

@Injectable()
export class AdrService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdrService.name);

  constructor(
    @InjectRepository(AdrCatalogVersion)
    private readonly versionRepo: Repository<AdrCatalogVersion>,
    @InjectRepository(AdrCatalogItem)
    private readonly itemRepo: Repository<AdrCatalogItem>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(CargoItem)
    private readonly cargoRepo: Repository<CargoItem>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedDefaultCatalogIfEmpty();
  }

  /**
   * Automatically initializes the official ADR 2025 Table A database if not present
   */
  public async seedDefaultCatalogIfEmpty(): Promise<AdrCatalogVersion> {
    const existing = await this.versionRepo.findOne({
      where: { edition: 'ADR 2025' },
      relations: ['items'],
    });

    if (existing && existing.totalEntries > 0) {
      this.logger.log(`ADR 2025 Table A catalog verified: ${existing.totalEntries} entries active.`);
      return existing;
    }

    this.logger.log('Seeding official UNECE ADR 2025 Table A dangerous goods catalog...');
    const hash = getCatalogChecksum(OFFICIAL_ADR_2025_TABLE_A);

    let version = existing;
    if (!version) {
      version = this.versionRepo.create({
        edition: 'ADR 2025',
        versionNumber: '2025.1.0',
        effectiveDate: new Date('2025-01-01'),
        sourceDocument: 'UNECE ADR 2025 (ECE/TRANS/352) Table A Chapter 3.2',
        sourceUrl: 'https://unece.org/adr-2025-files',
        sourceFile: 'adr-2025-table-a-normative.json',
        fileHash: hash,
        isActive: true,
        importNotes: 'Official seed of high-frequency dangerous goods items and complete UN scope.',
      });
      version = await this.versionRepo.save(version);
    }

    // Save curated official records
    let savedCount = 0;
    for (const seed of OFFICIAL_ADR_2025_TABLE_A) {
      const existingItem = await this.itemRepo.findOne({
        where: { version: { id: version.id }, unNumber: seed.unNumber, packingGroup: seed.packingGroup ?? undefined },
      });

      if (!existingItem) {
        const item = this.itemRepo.create({
          version,
          ...seed,
          packingGroup: seed.packingGroup ?? undefined,
        } as any);
        await this.itemRepo.save(item);
        savedCount++;
      }
    }

    // Update version statistics
    version.totalEntries = await this.itemRepo.count({ where: { version: { id: version.id } } });
    version.rejectedEntries = 0;
    await this.versionRepo.save(version);

    this.logger.log(`ADR 2025 Table A catalog seeded successfully with ${version.totalEntries} entries.`);
    return version;
  }

  /**
   * Search ADR catalog with high performance query, filtering, and multilingual support
   */
  async searchCatalog(params: {
    query?: string;
    adrClass?: string;
    page?: number;
    limit?: number;
    lang?: string;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const qb = this.itemRepo.createQueryBuilder('item')
      .leftJoinAndSelect('item.version', 'version')
      .where('version.isActive = :isActive', { isActive: true });

    if (params.adrClass) {
      qb.andWhere('item.adrClass = :adrClass', { adrClass: params.adrClass });
    }

    if (params.query && params.query.trim()) {
      const q = params.query.trim();
      const numMatch = q.replace(/\D/g, '');

      if (numMatch && numMatch.length >= 2) {
        qb.andWhere(
          '(item.unNumberNumeric = :num OR item.unNumber ILIKE :qLike OR item.properShippingNameEn ILIKE :qLike OR item.properShippingNameRo ILIKE :qLike)',
          { num: parseInt(numMatch, 10), qLike: `%${q}%` }
        );
      } else {
        qb.andWhere(
          '(item.unNumber ILIKE :qLike OR item.properShippingNameEn ILIKE :qLike OR item.properShippingNameRo ILIKE :qLike OR item.properShippingNameDe ILIKE :qLike OR item.properShippingNameFr ILIKE :qLike OR item.properShippingNameNl ILIKE :qLike OR item.properShippingNameEs ILIKE :qLike OR item.properShippingNamePl ILIKE :qLike)',
          { qLike: `%${q}%` }
        );
      }
    }

    qb.orderBy('item.unNumberNumeric', 'ASC')
      .addOrderBy('item.packingGroup', 'ASC')
      .skip(skip)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get detailed ADR item by UN Number (and optional packing group)
   */
  async findByUnNumber(unNumber: string, packingGroup?: string) {
    const norm = AdrRulesEngine.normalizeUnNumber(unNumber);
    const where: any = { unNumber: norm };
    if (packingGroup) {
      where.packingGroup = packingGroup;
    }
    const items = await this.itemRepo.find({
      where,
      relations: ['version'],
    });

    if (!items || items.length === 0) {
      throw new NotFoundException(`UN number ${norm} not found in active ADR catalog`);
    }

    return items;
  }

  /**
   * Calculate 1,000 points and evaluate full exemptions according to ADR 1.1.3.6, ADR 3.4, ADR 3.5, SP 188
   */
  calculatePoints(items: AdrItemInput[]): AdrEvaluationResult {
    return AdrRulesEngine.evaluateCargo(items);
  }

  /**
   * Evaluates and updates an existing Order with full ADR status and point calculation
   */
  async evaluateOrder(orderId: string): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['cargoItems'],
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const cargoItems = order.cargoItems || [];
    const adrCargoItems = cargoItems.filter(c => c.adrClass || c.unNumber);

    if (adrCargoItems.length === 0) {
      order.isAdr = false;
      order.adrStatus = 'none';
      order.adrTotalPoints = 0;
      order.adr1136Eligible = false;
      order.adrExemptionApplied = 'none';
      order.adrSummary = '';
      return this.orderRepo.save(order);
    }

    const inputItems: AdrItemInput[] = adrCargoItems.map(c => ({
      id: c.id,
      unNumber: c.unNumber,
      properShippingName: c.properShippingName || c.description,
      technicalName: c.technicalName,
      adrClass: c.adrClass,
      packingGroup: c.packingGroup,
      transportCategory: c.transportCategory,
      tunnelRestrictionCode: c.tunnelRestrictionCode,
      quantity: c.quantity,
      unit: c.unit,
      grossMassKg: c.adrGrossMassKg ? Number(c.adrGrossMassKg) : (c.weightKg ? Number(c.weightKg) : undefined),
      netMassKg: c.adrNetMassKg ? Number(c.adrNetMassKg) : undefined,
      volumeLiters: c.adrVolumeLiters ? Number(c.adrVolumeLiters) : (c.volumeCbm ? Number(c.volumeCbm) * 1000 : undefined),
      transportType: (c.adrTransportType as any) || 'packages',
      limitedQuantity: c.limitedQuantity,
      exceptedQuantity: c.exceptedQuantity,
      environmentalHazard: c.environmentalHazard,
      waste: c.adrWaste,
      emptyUncleaned: c.adrEmptyUncleaned,
      batteryDetails: c.adrBatteryDetails ? JSON.parse(c.adrBatteryDetails) : undefined,
    }));

    const evaluation = AdrRulesEngine.evaluateCargo(inputItems);

    // Update each cargo item with calculated points and declaration lines
    for (let i = 0; i < adrCargoItems.length; i++) {
      const cargo = adrCargoItems[i];
      const line = evaluation.lines[i];
      if (line) {
        cargo.adrPoints = line.points;
        cargo.adrFactor = line.multiplier;
        cargo.adrExemptionType = line.exemptionApplied;
        cargo.adrExemptionDetails = line.exemptionReason || '';
        cargo.adrDeclarationText = line.declarationLine;
        cargo.adrStatus = evaluation.status;
        await this.cargoRepo.save(cargo);
      }
    }

    // Update order with aggregate ADR evaluation
    order.isAdr = true;
    order.adrStatus = evaluation.status;
    order.adrTotalPoints = evaluation.totalPoints;
    order.adr1136Eligible = evaluation.eligible1136;
    order.adrExemptionApplied = evaluation.exemptionType;
    order.adrSummary = JSON.stringify({
      status: evaluation.status,
      statusLabelRo: evaluation.statusLabelRo,
      statusLabelEn: evaluation.statusLabelEn,
      badgeCode: evaluation.badgeCode,
      totalPoints: evaluation.totalPoints,
      eligible1136: evaluation.eligible1136,
      exemptionType: evaluation.exemptionType,
      driverCertRequired: evaluation.driverCertRequired,
      driverSpecializationsRequired: evaluation.driverSpecializationsRequired,
      vehicleCertRequired: evaluation.vehicleCertRequired,
      vehicleTypesRequired: evaluation.vehicleTypesRequired,
      orangePlatesRequired: evaluation.orangePlatesRequired,
      fireExtinguisherMinimumKg: evaluation.fireExtinguisherMinimumKg,
      verificationReasons: evaluation.verificationReasons,
      mixedLoadingViolations: evaluation.mixedLoadingViolations,
      tunnelProhibitions: evaluation.tunnelProhibitions,
    });

    return this.orderRepo.save(order);
  }

  /**
   * Versioned & idempotent catalog import with validation and audit logging
   */
  async importCatalogEdition(dto: {
    edition: string; // e.g. "ADR 2025"
    versionNumber: string; // "2025.2.0"
    effectiveDate: string; // "2025-01-01"
    sourceDocument?: string;
    sourceUrl?: string;
    items: AdrSeedRecord[];
  }) {
    if (!dto.edition || !dto.items || !Array.isArray(dto.items)) {
      throw new BadRequestException('Invalid import payload: edition and items array are required');
    }

    const jsonStr = JSON.stringify(dto.items);
    const hash = crypto.createHash('sha256').update(jsonStr).digest('hex');

    let version = await this.versionRepo.findOne({ where: { edition: dto.edition } });
    if (!version) {
      version = this.versionRepo.create({
        edition: dto.edition,
        versionNumber: dto.versionNumber,
        effectiveDate: new Date(dto.effectiveDate),
        sourceDocument: dto.sourceDocument || 'Custom ADR Import',
        sourceUrl: dto.sourceUrl || '',
        fileHash: hash,
        isActive: true,
      });
      version = await this.versionRepo.save(version);
    } else {
      version.versionNumber = dto.versionNumber;
      version.fileHash = hash;
      version.effectiveDate = new Date(dto.effectiveDate);
      await this.versionRepo.save(version);
    }

    let imported = 0;
    let rejected = 0;
    const errors: string[] = [];

    for (const record of dto.items) {
      if (!record.unNumber || !record.properShippingNameEn || !record.adrClass) {
        rejected++;
        errors.push(`Record missing UN or Name or Class: ${JSON.stringify(record).slice(0, 50)}`);
        continue;
      }

      const normUN = AdrRulesEngine.normalizeUnNumber(record.unNumber);
      const unNum = parseInt(normUN.replace(/\D/g, ''), 10);

      let item = await this.itemRepo.findOne({
        where: { version: { id: version.id }, unNumber: normUN, packingGroup: record.packingGroup ?? undefined },
      });

      if (!item) {
        item = this.itemRepo.create({
          version,
          unNumber: normUN,
          unNumberNumeric: unNum,
          properShippingNameEn: record.properShippingNameEn,
          properShippingNameRo: record.properShippingNameRo || record.properShippingNameEn,
          properShippingNameDe: record.properShippingNameDe,
          properShippingNameFr: record.properShippingNameFr,
          properShippingNameNl: record.properShippingNameNl,
          properShippingNameEs: record.properShippingNameEs,
          properShippingNamePl: record.properShippingNamePl,
          adrClass: record.adrClass,
          classificationCode: record.classificationCode,
          packingGroup: record.packingGroup ?? undefined,
          dangerLabels: record.dangerLabels || record.adrClass,
          specialProvisions: record.specialProvisions || '',
          limitedQuantity: record.limitedQuantity || '0',
          limitedQuantityGramsOrMl: record.limitedQuantityGramsOrMl || 0,
          exceptedQuantity: record.exceptedQuantity || 'E0',
          packingInstructions: record.packingInstructions || '',
          specialPackingProvisions: record.specialPackingProvisions,
          mixedPacking: record.mixedPacking,
          portableTanksInstructions: record.portableTanksInstructions,
          portableTanksSpecialProvisions: record.portableTanksSpecialProvisions,
          adrTankCode: record.adrTankCode,
          adrTankSpecialProvisions: record.adrTankSpecialProvisions,
          vehicleForTankCarriage: record.vehicleForTankCarriage,
          transportCategory: record.transportCategory !== undefined ? record.transportCategory : 3,
          tunnelRestrictionCode: record.tunnelRestrictionCode || '(E)',
          hazardIdentificationNumber: record.hazardIdentificationNumber,
          technicalNameRequired: Boolean(record.technicalNameRequired),
          batteryCategory: record.batteryCategory,
        } as any) as unknown as AdrCatalogItem;
      } else {
        item.properShippingNameEn = record.properShippingNameEn;
        item.properShippingNameRo = record.properShippingNameRo || item.properShippingNameRo;
        item.adrClass = record.adrClass;
        item.classificationCode = record.classificationCode;
        item.transportCategory = record.transportCategory !== undefined ? record.transportCategory : item.transportCategory;
        item.tunnelRestrictionCode = record.tunnelRestrictionCode || item.tunnelRestrictionCode;
      }

      if (item) {
        await this.itemRepo.save(item);
        imported++;
      }
    }

    version.totalEntries = await this.itemRepo.count({ where: { version: { id: version.id } } });
    version.rejectedEntries = rejected;
    version.importNotes = `Imported ${imported} records, rejected ${rejected}. Errors: ${errors.slice(0, 5).join('; ')}`;
    await this.versionRepo.save(version);

    return {
      version,
      imported,
      rejected,
      errors,
      checksum: hash,
    };
  }

  /**
   * List all registered catalog versions
   */
  async listVersions() {
    return this.versionRepo.find({
      order: { effectiveDate: 'DESC' },
    });
  }
}
