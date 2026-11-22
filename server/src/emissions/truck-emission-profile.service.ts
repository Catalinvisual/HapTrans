import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Truck } from '../trucks/truck.entity';
import {
  TruckEmissionDocument, TruckEmissionProfile, TruckEmissionProfileVersion,
} from './emission-fleet.entity';
import { normalizeTruckFuelType } from '../trucks/fuel-type';

export interface TruckEmissionProfileDto {
  vehicleCategory?: string | null;
  fuelType?: string | null;
  euroClass?: string | null;
  co2Class?: string | null;
  co2ClassApplicable?: boolean;
  vectoVehicleSubgroup?: string | null;
  vectoMissionProfile?: string | null;
  technicalConfiguration?: string | null;
  officialCo2GKm?: number | null;
  officialEnergyConsumption?: number | null;
  officialEnergyUnit?: string | null;
  grossVehicleWeightKg?: number | null;
  payloadKg?: number | null;
  axleCount?: number | null;
  declaredConsumptionPer100Km?: number | null;
  firstRegistrationDate?: string | null;
  dataSource?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  notes?: string | null;
  reason?: string | null;
}

const PROFILE_FIELDS: Array<keyof TruckEmissionProfileDto> = [
  'vehicleCategory', 'fuelType', 'euroClass', 'co2Class', 'co2ClassApplicable',
  'vectoVehicleSubgroup', 'vectoMissionProfile', 'technicalConfiguration',
  'officialCo2GKm', 'officialEnergyConsumption', 'officialEnergyUnit',
  'grossVehicleWeightKg', 'payloadKg', 'axleCount', 'declaredConsumptionPer100Km',
  'firstRegistrationDate', 'dataSource', 'validFrom', 'validTo', 'notes',
];

@Injectable()
export class TruckEmissionProfileService {
  constructor(
    @InjectRepository(Truck) private readonly trucks: Repository<Truck>,
    @InjectRepository(TruckEmissionProfile) private readonly profiles: Repository<TruckEmissionProfile>,
    @InjectRepository(TruckEmissionDocument) private readonly documents: Repository<TruckEmissionDocument>,
    @InjectRepository(TruckEmissionProfileVersion) private readonly versions: Repository<TruckEmissionProfileVersion>,
  ) {}

  async list(companyId?: string | null) {
    const qb = this.profiles.createQueryBuilder('p')
      .leftJoinAndSelect('p.truck', 'truck')
      .leftJoinAndSelect('p.documents', 'documents')
      .orderBy('truck.plateNumber', 'ASC');
    if (companyId) qb.andWhere('(p.companyId = :companyId OR p.companyId IS NULL)', { companyId });
    const profiles = await qb.getMany();
    const trucks = await this.trucks.createQueryBuilder('t')
      .where('t.status != :inactive', { inactive: 'inactive' })
      .orderBy('t.plateNumber', 'ASC')
      .getMany();
    const byTruck = new Map(profiles.map((p) => [p.truckId, p]));
    return trucks.map((truck) => {
      const profile = byTruck.get(truck.id) || null;
      return { truck: this.truckSummary(truck), profile: profile ? this.present(profile) : null };
    });
  }

  private truckSummary(truck: Truck) {
    return {
      id: truck.id,
      plateNumber: truck.plateNumber,
      brand: truck.brand,
      model: truck.model,
      vin: truck.vin,
      year: truck.year,
      euronorm: truck.euronorm,
      fuelType: truck.fuelType,
      axleCount: truck.axleCount,
      maxWeightKg: truck.maxWeightKg,
      fuelConsumption: truck.fuelConsumption,
      registrationCountry: truck.registrationCountry,
      status: truck.status,
    };
  }

  private present(profile: TruckEmissionProfile) {
    return {
      ...profile,
      verificationStatus: this.effectiveVerification(profile),
      documents: (profile.documents || []).map((d) => ({
        ...d,
        expired: !!d.expiresAt && new Date(d.expiresAt).getTime() < Date.now(),
      })),
    };
  }

  /**
   * A profile is only "verified" when the official values it claims are backed
   * by a verified document. Missing values are reported as missing, never
   * inferred from another attribute.
   */
  effectiveVerification(profile: TruckEmissionProfile): string {
    const hasCore = !!(profile.fuelType && profile.vehicleCategory);
    if (!hasCore) return 'missing_data';
    if (profile.validTo && new Date(profile.validTo).getTime() < Date.now()) return 'expired';
    const verifiedDocs = (profile.documents || []).filter((d) => d.verificationStatus === 'verified');
    if (profile.verificationStatus === 'verified' && verifiedDocs.length > 0) return 'verified';
    if (profile.co2Class && profile.co2ClassApplicable && !verifiedDocs.some((d) => d.documentType === 'co2_class')) {
      return 'requires_review';
    }
    if (profile.verificationStatus === 'verified') return 'requires_review';
    return profile.verificationStatus || 'unverified';
  }

  async getByTruck(truckId: string) {
    const profile = await this.profiles.findOne({ where: { truckId }, relations: ['documents', 'truck'] });
    if (!profile) {
      const truck = await this.trucks.findOne({ where: { id: truckId } });
      if (!truck) throw new NotFoundException('Truck not found');
      return { truck: this.truckSummary(truck), profile: null };
    }
    return { truck: this.truckSummary(profile.truck), profile: this.present(profile) };
  }

  async upsert(truckId: string, dto: TruckEmissionProfileDto, user: any) {
    const truck = await this.trucks.findOne({ where: { id: truckId } });
    if (!truck) throw new NotFoundException('Truck not found');

    if (dto.fuelType && !normalizeTruckFuelType(dto.fuelType)) {
      throw new BadRequestException('Unknown fuel type');
    }
    if (dto.axleCount !== undefined && dto.axleCount !== null && dto.axleCount < 0) {
      throw new BadRequestException('Axle count cannot be negative');
    }

    let profile = await this.profiles.findOne({ where: { truckId }, relations: ['documents'] });
    const previousValues = profile ? this.snapshotValues(profile) : {};
    if (!profile) {
      profile = this.profiles.create({
        truckId,
        companyId: truck.companyId ?? user?.companyId ?? null,
        verificationStatus: 'unverified',
      });
    }

    for (const field of PROFILE_FIELDS) {
      if (dto[field] === undefined) continue;
      const value = field === 'fuelType' ? normalizeTruckFuelType(dto.fuelType) : dto[field];
      (profile as any)[field] = value;
    }
    if (dto.co2Class && dto.co2ClassApplicable === undefined) profile.co2ClassApplicable = true;
    if (!dto.co2Class && dto.co2ClassApplicable) profile.co2ClassApplicable = false;

    // A CO2 class is never derived from the Euro class or the vehicle model.
    if (profile.co2Class && !profile.dataSource) {
      profile.verificationStatus = 'requires_review';
    } else if (profile.verificationStatus === 'missing_data' && profile.fuelType) {
      profile.verificationStatus = 'unverified';
    }
    if (!profile.fuelType && !profile.vehicleCategory) profile.verificationStatus = 'missing_data';

    const saved = await this.profiles.save(profile);

    if (Object.keys(previousValues).length > 0) {
      const changed = PROFILE_FIELDS.some(
        (f) => (previousValues as any)[f] !== (saved as any)[f],
      );
      if (changed) {
        await this.versions.save(this.versions.create({
          profileId: saved.id,
          truckId,
          previousValues,
          newValues: this.snapshotValues(saved),
          changedByUserId: user?.id ?? null,
          reason: dto.reason ?? null,
        }));
      }
    }

    const full = await this.profiles.findOne({ where: { id: saved.id }, relations: ['documents', 'truck'] });
    return { truck: this.truckSummary(truck), profile: this.present(full!) };
  }

  async verify(truckId: string, user: any, reason?: string) {
    const profile = await this.profiles.findOne({ where: { truckId }, relations: ['documents'] });
    if (!profile) throw new NotFoundException('No environmental profile exists for this truck');
    const verifiedDocs = (profile.documents || []).filter((d) => d.verificationStatus === 'verified');
    if (!profile.fuelType || !profile.vehicleCategory) {
      throw new BadRequestException('Fuel type and vehicle category are required before verification');
    }
    if (profile.co2ClassApplicable && profile.co2Class && !verifiedDocs.some((d) => d.documentType === 'co2_class')) {
      throw new BadRequestException('A verified official CO2 class document is required for this profile');
    }
    const previous = this.snapshotValues(profile);
    profile.verificationStatus = 'verified';
    profile.verifiedAt = new Date().toISOString().slice(0, 10);
    profile.verifiedByUserId = user?.id ?? null;
    await this.profiles.save(profile);
    await this.versions.save(this.versions.create({
      profileId: profile.id,
      truckId,
      previousValues: previous,
      newValues: this.snapshotValues(profile),
      changedByUserId: user?.id ?? null,
      reason: reason || 'Profile verified',
    }));
    return this.getByTruck(truckId);
  }

  async listVersions(truckId: string) {
    const profile = await this.profiles.findOne({ where: { truckId } });
    if (!profile) return [];
    return this.versions.find({ where: { profileId: profile.id }, order: { createdAt: 'DESC' }, take: 100 });
  }

  async addDocument(truckId: string, dto: any, user: any) {
    let profile = await this.profiles.findOne({ where: { truckId } });
    if (!profile) {
      const truck = await this.trucks.findOne({ where: { id: truckId } });
      if (!truck) throw new NotFoundException('Truck not found');
      profile = await this.profiles.save(this.profiles.create({
        truckId,
        companyId: truck.companyId ?? null,
        verificationStatus: 'missing_data',
      }));
    }
    if (!dto?.documentType) throw new BadRequestException('documentType is required');
    const doc = await this.documents.save(this.documents.create({
      profileId: profile.id,
      documentType: dto.documentType,
      documentNumber: dto.documentNumber ?? null,
      issuedAt: dto.issuedAt ?? null,
      expiresAt: dto.expiresAt ?? null,
      fileUrl: dto.fileUrl ?? null,
      verificationStatus: dto.verificationStatus || 'unverified',
      verifiedAt: dto.verificationStatus === 'verified' ? new Date().toISOString().slice(0, 10) : null,
      uploadedByUserId: user?.id ?? null,
      notes: dto.notes ?? null,
    }));
    return doc;
  }

  async removeDocument(documentId: string) {
    const doc = await this.documents.findOne({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Document not found');
    await this.documents.remove(doc);
    return { deleted: true };
  }

  private snapshotValues(profile: TruckEmissionProfile) {
    const out: Record<string, unknown> = {};
    for (const field of PROFILE_FIELDS) out[field] = (profile as any)[field] ?? null;
    out.verificationStatus = profile.verificationStatus;
    return out;
  }
}
