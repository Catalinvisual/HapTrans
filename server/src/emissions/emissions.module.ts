import { Injectable, Logger, Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Trip } from '../trips/trip.entity';
import { Order } from '../orders/order.entity';
import { Truck } from '../trucks/truck.entity';
import {
  CountryEmissionRule, CountryRoadChargingRule, EmissionCountry, EmissionFactor,
  EmissionRegulatorySource,
} from './emission-geo.entity';
import {
  TruckEmissionDocument, TruckEmissionProfile, TruckEmissionProfileVersion,
} from './emission-fleet.entity';
import {
  EmissionCalculationRun, EmissionSetting, FuelTransaction, TripEmissionAllocation,
  TripEmissionRecord, TripEmissionSegment, VehicleEnergyConsumption,
} from './emission-trip.entity';
import { EmissionReport, EmissionSimulation } from './emission-report.entity';
import { EmissionFactorService } from './emission-factor.service';
import { CountryEmissionService } from './country-emission.service';
import { RegulatorySourceService } from './regulatory-source.service';
import { TruckEmissionProfileService } from './truck-emission-profile.service';
import { TripEmissionService } from './trip-emission.service';
import { ManualCalculatorService } from './manual-calculator.service';
import { EmissionAnalyticsService } from './emission-analytics.service';
import { EmissionReportService } from './emission-report.service';
import { EmissionAuditService } from './emission-audit.service';
import { EmissionSettingsService } from './emission-settings.service';
import { FuelReconciliationService } from './fuel-reconciliation.service';
import { EmissionsController } from './emissions.controller';
import { PortalEmissionsController } from './portal-emissions.controller';
import { EmissionsScheduler } from './emissions.scheduler';

const ENTITIES = [
  EmissionCountry,
  EmissionFactor,
  CountryEmissionRule,
  CountryRoadChargingRule,
  EmissionRegulatorySource,
  TruckEmissionProfile,
  TruckEmissionDocument,
  TruckEmissionProfileVersion,
  TripEmissionRecord,
  TripEmissionSegment,
  TripEmissionAllocation,
  FuelTransaction,
  VehicleEnergyConsumption,
  EmissionCalculationRun,
  EmissionSetting,
  EmissionReport,
  EmissionSimulation,
  Trip,
  Order,
  Truck,
];

@Injectable()
export class EmissionsSeedService implements OnModuleInit {
  private readonly logger = new Logger(EmissionsSeedService.name);
  constructor(
    private readonly countries: CountryEmissionService,
    private readonly factors: EmissionFactorService,
    private readonly regulatory: RegulatorySourceService,
  ) {}

  async onModuleInit() {
    if (process.env.EMISSIONS_SEED === 'false') return;
    // Seeds are idempotent and never overwrite manually verified records.
    await this.countries.seedDefaults();
    await this.factors.seedDefaults();
    await this.regulatory.seedDefaults();
    this.logger.log('Emission registries ready (countries, factors, regulatory sources).');
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature(ENTITIES),
    ScheduleModule,
  ],
  controllers: [EmissionsController, PortalEmissionsController],
  providers: [
    EmissionsSeedService,
    EmissionsScheduler,
    EmissionFactorService,
    CountryEmissionService,
    RegulatorySourceService,
    TruckEmissionProfileService,
    TripEmissionService,
    ManualCalculatorService,
    EmissionAnalyticsService,
    EmissionReportService,
    EmissionAuditService,
    EmissionSettingsService,
    FuelReconciliationService,
  ],
  exports: [
    TripEmissionService,
    EmissionAnalyticsService,
    EmissionFactorService,
    EmissionReportService,
    TypeOrmModule,
  ],
})
export class EmissionsModule {}
