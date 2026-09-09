import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Settlement, SettlementStatus } from './settlement.entity';
import { Driver } from '../drivers/driver.entity';
import { Trip, TripStatus } from '../trips/trip.entity';
import { Order } from '../orders/order.entity';

@Injectable()
export class SettlementsService {
  constructor(
    @InjectRepository(Settlement) private readonly repo: Repository<Settlement>,
    @InjectRepository(Driver) private readonly driversRepo: Repository<Driver>,
    @InjectRepository(Trip) private readonly tripsRepo: Repository<Trip>,
    @InjectRepository(Order) private readonly ordersRepo: Repository<Order>,
  ) {}

  async findAll(month?: number, year?: number) {
    const where: any = {};
    if (month) where.month = month;
    if (year) where.year = year;
    return this.repo.find({ where, relations: ['driver', 'driver.user'], order: { createdAt: 'DESC' } });
  }

  async generate(driverId: string, month: number, year: number, opts?: { payMode?: string; payRate?: number }) {
    const driver = await this.driversRepo.findOne({ where: { id: driverId }, relations: ['user'] });
    if (!driver) throw new NotFoundException('Driver not found');

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const trips = await this.tripsRepo.find({
      where: {
        driver: { id: driverId },
        status: TripStatus.COMPLETED,
        actualArrival: Between(startDate, endDate),
      },
      relations: ['orders'],
    });

    const payMode = opts?.payMode || driver.payMode || 'per_km';
    const payRate = opts?.payRate !== undefined ? Number(opts.payRate) : (Number(driver.payRate) || (payMode === 'percent' ? 10 : 0.25));

    const breakdown = trips.map((trip) => {
      const revenue = (trip.orders || []).reduce((sum: number, o) => sum + (Number(o.price) || 0), 0);
      const distance = Number(trip.distanceKm) || 0;
      const amount = payMode === 'percent'
        ? Number(((revenue * payRate) / 100).toFixed(2))
        : Number((distance * payRate).toFixed(2));
      return {
        id: trip.id,
        tripNumber: trip.tripNumber || `TR-${trip.id.slice(0, 8).toUpperCase()}`,
        distanceKm: distance,
        revenue,
        amount,
      };
    });

    const totalDistance = breakdown.reduce((sum: number, t) => sum + (t.distanceKm || 0), 0);
    const totalRevenue = breakdown.reduce((sum: number, t) => sum + (t.revenue || 0), 0);
    const grossPay = breakdown.reduce((sum: number, t) => sum + (t.amount || 0), 0);

    let settlement = await this.repo.findOne({ where: { driver: { id: driverId }, month, year } });
    if (!settlement) {
      settlement = this.repo.create({
        driver: { id: driverId } as any,
        month,
        year,
        advances: 0,
        deductions: 0,
        status: SettlementStatus.DRAFT,
      });
    }

    settlement.driverName = driver.user?.name || 'Driver';
    settlement.payMode = payMode;
    settlement.payRate = payRate;
    settlement.tripCount = breakdown.length;
    settlement.totalDistance = totalDistance;
    settlement.totalRevenue = totalRevenue;
    settlement.grossPay = grossPay;
    settlement.trips = breakdown;
    settlement.netPay = grossPay - Number(settlement.advances || 0) - Number(settlement.deductions || 0);

    return this.repo.save(settlement);
  }

  async update(id: string, dto: any) {
    const settlement = await this.repo.findOne({ where: { id } });
    if (!settlement) throw new NotFoundException('Settlement not found');

    if (dto.advances !== undefined) settlement.advances = dto.advances;
    if (dto.deductions !== undefined) settlement.deductions = dto.deductions;
    if (dto.status !== undefined) settlement.status = dto.status;
    if (dto.notes !== undefined) settlement.notes = dto.notes;

    settlement.netPay = Number(settlement.grossPay) - Number(settlement.advances || 0) - Number(settlement.deductions || 0);
    return this.repo.save(settlement);
  }

  async remove(id: string) {
    return this.repo.delete(id);
  }
}
