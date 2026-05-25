import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Payroll, PayrollStatus } from './payroll.entity';
import { Trip, TripStatus } from '../trips/trip.entity';
import { Driver } from '../drivers/driver.entity';

@Injectable()
export class PayrollService {
  constructor(
    @InjectRepository(Payroll) private readonly repo: Repository<Payroll>,
    @InjectRepository(Trip) private readonly tripsRepo: Repository<Trip>,
    @InjectRepository(Driver) private readonly driversRepo: Repository<Driver>,
  ) {}

  async findAll(month?: number, year?: number) {
    const where: any = {};
    if (month) where.month = month;
    if (year) where.year = year;
    return this.repo.find({ where, relations: ['driver', 'driver.user'], order: { createdAt: 'DESC' } });
  }

  async generateForMonth(month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const drivers = await this.driversRepo.find({ relations: ['user'] });
    const results = [];

    for (const driver of drivers) {
      // Find trips completed by this driver in the given month
      const trips = await this.tripsRepo.find({
        where: {
          driver: { id: driver.id },
          status: TripStatus.COMPLETED,
          dropoffDate: Between(startDate, endDate)
        }
      });

      // Calculate total days worked in trips
      let totalDaysWorked = 0;
      trips.forEach(t => {
         const pDate = new Date(`${t.pickupDate}T${t.pickupTime || '00:00'}:00`);
         const dDate = new Date(`${t.dropoffDate}T${t.dropoffTime || '23:59'}:00`);
         const hours = (dDate.getTime() - pDate.getTime()) / (1000 * 60 * 60);
         const days = Math.max(1, Math.ceil(hours / 24));
         totalDaysWorked += days;
      });

      // We generate payroll only if the driver has a grossSalary or has worked trips
      if (!driver.grossSalary && totalDaysWorked === 0) continue;

      let payroll = await this.repo.findOne({ where: { driver: { id: driver.id }, month, year } });
      if (!payroll) {
        payroll = this.repo.create({
          driver: { id: driver.id } as any,
          month,
          year,
          bonuses: 0,
          deductions: 0
        });
      }

      const grossSalary = Number(driver.grossSalary) || 0;
      const dailyAllowanceRate = Number(driver.dailyRate) || 0;
      
      // Loonheffing ~36.97%
      const taxAmount = grossSalary * 0.3697;
      const netSalary = grossSalary - taxAmount;
      
      // Vakantiegeld 8%
      const holidayAllowance = grossSalary * 0.08;

      const totalAllowance = totalDaysWorked * dailyAllowanceRate;

      payroll.grossSalary = grossSalary;
      payroll.taxAmount = taxAmount;
      payroll.netSalary = netSalary;
      payroll.holidayAllowance = holidayAllowance;
      payroll.dailyAllowance = dailyAllowanceRate;
      payroll.daysWorked = totalDaysWorked;
      payroll.totalAllowance = totalAllowance;
      
      const totalNetToPay = netSalary + totalAllowance + Number(payroll.bonuses) - Number(payroll.deductions);
      payroll.totalNetToPay = totalNetToPay;

      await this.repo.save(payroll);
      results.push(payroll);
    }
    
    return results;
  }

  async update(id: string, dto: any) {
    const payroll = await this.repo.findOne({ where: { id } });
    if (!payroll) throw new Error('Payroll not found');

    if (dto.bonuses !== undefined) payroll.bonuses = dto.bonuses;
    if (dto.deductions !== undefined) payroll.deductions = dto.deductions;
    if (dto.status !== undefined) payroll.status = dto.status;
    if (dto.pdfData !== undefined) payroll.pdfData = dto.pdfData;

    // Recalculate net to pay if bonuses or deductions change
    const totalNetToPay = Number(payroll.netSalary) + Number(payroll.totalAllowance) + Number(payroll.bonuses) - Number(payroll.deductions);
    payroll.totalNetToPay = totalNetToPay;

    return this.repo.save(payroll);
  }
}
