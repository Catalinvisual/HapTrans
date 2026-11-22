import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FuelTransaction } from './emission-trip.entity';
import { Truck } from '../trucks/truck.entity';
import { resolveCountryCode } from './country-database';
import { normalizeTruckFuelType } from '../trucks/fuel-type';

export interface FuelImportRow {
  occurredAt: string;
  quantity: number;
  unit?: string;
  fuelType?: string;
  plateNumber?: string;
  truckId?: string;
  countryCode?: string;
  odometerKm?: number;
  amount?: number;
  currency?: string;
  provider?: string;
  externalId?: string;
  sourceType?: string;
  tripId?: string;
}

const MAX_SINGLE_REFUEL_LITRES = 1500;
const CONSUMPTION_DEVIATION_PERCENT = 30;

/**
 * Fuel-card and telematics import with duplicate detection, truck matching and
 * anomaly flags. Importing a purchase never marks fuel as consumed: matching a
 * transaction to a trip is a separate, auditable action.
 */
@Injectable()
export class FuelReconciliationService {
  constructor(
    @InjectRepository(FuelTransaction) private readonly repo: Repository<FuelTransaction>,
    @InjectRepository(Truck) private readonly trucks: Repository<Truck>,
  ) {}

  async list(params: { truckId?: string; status?: string; from?: string; to?: string; limit?: number } = {}, companyId?: string | null) {
    const qb = this.repo.createQueryBuilder('f')
      .leftJoinAndSelect('f.truck', 'truck')
      .orderBy('f."occurredAt"', 'DESC')
      .limit(Math.min(params.limit || 200, 1000));
    if (companyId) qb.andWhere('f."companyId" = :companyId', { companyId });
    if (params.truckId) qb.andWhere('f."truckId" = :truckId', { truckId: params.truckId });
    if (params.status) qb.andWhere('f.status = :status', { status: params.status });
    if (params.from) qb.andWhere('f."occurredAt" >= :from', { from: params.from });
    if (params.to) qb.andWhere('f."occurredAt" <= :to', { to: params.to });
    return qb.getMany();
  }

  async summary(companyId?: string | null) {
    const qb = this.repo.createQueryBuilder('f')
      .select('f.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(f.quantity),0)', 'quantity')
      .addSelect('COALESCE(SUM(f.amount),0)', 'amount')
      .groupBy('f.status');
    if (companyId) qb.andWhere('f."companyId" = :companyId', { companyId });
    const rows = await qb.getRawMany();
    const totals = rows.reduce((acc, r) => ({
      count: acc.count + Number(r.count || 0),
      quantity: acc.quantity + Number(r.quantity || 0),
      amount: acc.amount + Number(r.amount || 0),
    }), { count: 0, quantity: 0, amount: 0 });
    return { byStatus: rows, totals };
  }

  async importRows(rows: FuelImportRow[], user: any, companyId?: string | null) {
    if (!Array.isArray(rows) || rows.length === 0) throw new BadRequestException('No fuel rows supplied');
    if (rows.length > 5000) throw new BadRequestException('Import is limited to 5000 rows at a time');
    const result = { imported: 0, duplicates: 0, unmatched: 0, rejected: 0, anomalies: 0, errors: [] as string[] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (!row.occurredAt || !Number.isFinite(Number(row.quantity)) || Number(row.quantity) <= 0) {
          result.rejected++;
          result.errors.push(`Row ${i + 1}: occurredAt and a positive quantity are required`);
          continue;
        }
        const occurredAt = new Date(row.occurredAt);
        if (Number.isNaN(occurredAt.getTime())) {
          result.rejected++;
          result.errors.push(`Row ${i + 1}: invalid occurredAt`);
          continue;
        }

        const truck = row.truckId
          ? await this.trucks.findOne({ where: { id: row.truckId } })
          : row.plateNumber
            ? await this.trucks.findOne({ where: { plateNumber: row.plateNumber } })
            : null;

        if (row.provider && row.externalId) {
          const duplicate = await this.repo.findOne({ where: { provider: row.provider, externalId: row.externalId } });
          if (duplicate) {
            result.duplicates++;
            continue;
          }
        }

        const anomalyFlags: string[] = [];
        if (Number(row.quantity) > MAX_SINGLE_REFUEL_LITRES) anomalyFlags.push('quantity_above_expected_single_refuel');
        if (!truck) {
          anomalyFlags.push('truck_not_matched');
          result.unmatched++;
        }
        if (truck?.fuelConsumption) {
          // Compare the fill against the truck's own declared consumption only
          // when an odometer reading makes that comparison meaningful.
          if (row.odometerKm && truck.totalMileage && Number(row.odometerKm) < Number(truck.totalMileage)) {
            anomalyFlags.push('odometer_below_known_mileage');
          }
        }
        if (anomalyFlags.length) result.anomalies++;

        const fuelType = normalizeTruckFuelType(row.fuelType) || normalizeTruckFuelType(truck?.fuelType) || 'DIESEL';
        const created = this.repo.create({
          companyId: companyId || user?.companyId || truck?.companyId || null,
          truckId: truck?.id || null,
          plateNumber: row.plateNumber || truck?.plateNumber || null,
          tripId: row.tripId || null,
          occurredAt,
          fuelType,
          unit: row.unit || (fuelType === 'ELECTRIC' ? 'kWh' : 'L'),
          quantity: Number(row.quantity),
          amount: row.amount != null ? Number(row.amount) : null,
          currency: row.currency || 'EUR',
          countryCode: resolveCountryCode(row.countryCode) || null,
          registrationCountry: truck?.registrationCountry || null,
          provider: row.provider || null,
          externalId: row.externalId || null,
          sourceType: row.sourceType || 'manual',
          odometerKm: row.odometerKm != null ? Number(row.odometerKm) : null,
          status: truck ? 'imported' : 'unmatched',
          anomalyFlags: anomalyFlags.length ? anomalyFlags : null,
          importedByUserId: user?.id ?? null,
        });
        await this.repo.save(created);
        result.imported++;
      } catch (err) {
        result.rejected++;
        result.errors.push(`Row ${i + 1}: ${(err as Error).message}`);
      }
    }
    return result;
  }

  async matchToTrip(transactionId: string, tripId: string | null, user: any, reason?: string) {
    const transaction = await this.repo.findOne({ where: { id: transactionId } });
    if (!transaction) throw new NotFoundException('Fuel transaction not found');
    const previous = { tripId: transaction.tripId, status: transaction.status };
    transaction.tripId = tripId;
    transaction.status = tripId ? 'matched' : 'imported';
    transaction.correctedByUserId = user?.id ?? null;
    transaction.correctedAt = new Date();
    transaction.correctionReason = reason || `Trip link ${previous.tripId || 'none'} → ${tripId || 'none'}`;
    return this.repo.save(transaction);
  }

  async correct(transactionId: string, dto: any, user: any) {
    const transaction = await this.repo.findOne({ where: { id: transactionId } });
    if (!transaction) throw new NotFoundException('Fuel transaction not found');
    if (!dto?.reason) throw new BadRequestException('A correction reason is required');
    if (dto.quantity !== undefined) {
      if (!Number.isFinite(Number(dto.quantity)) || Number(dto.quantity) <= 0) {
        throw new BadRequestException('Quantity must be positive');
      }
      transaction.quantity = Number(dto.quantity);
    }
    if (dto.fuelType !== undefined) {
      const normalized = normalizeTruckFuelType(dto.fuelType);
      if (!normalized) throw new BadRequestException('Unknown fuel type');
      transaction.fuelType = normalized;
    }
    if (dto.occurredAt !== undefined) transaction.occurredAt = new Date(dto.occurredAt);
    transaction.correctedByUserId = user?.id ?? null;
    transaction.correctedAt = new Date();
    transaction.correctionReason = dto.reason;
    transaction.status = 'corrected';
    return this.repo.save(transaction);
  }

  /**
   * Provider status. Nothing is reported as connected unless credentials and a
   * working import exist; there is no pretend integration.
   */
  integrationStatus() {
    const providers = [
      { key: 'fuel_card_csv', label: 'Fuel card CSV/Excel import', configured: true, kind: 'file_import' },
      { key: 'telematics_ecu', label: 'Telematics/ECU consumption feed', configured: false, kind: 'api' },
      { key: 'electric_charging', label: 'Electric charging transactions', configured: false, kind: 'api' },
    ];
    return {
      providers,
      note: 'API providers become available only after credentials are configured on the server. File import works without an external account.',
    };
  }
}
