import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Payroll, PayrollStatus } from './payroll.entity';
import { Trip, TripStatus } from '../trips/trip.entity';
import { User } from '../users/user.entity';

@Injectable()
export class PayrollService {
  constructor(
    @InjectRepository(Payroll) private readonly repo: Repository<Payroll>,
    @InjectRepository(Trip) private readonly tripsRepo: Repository<Trip>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {}

  async findAll(month?: number, year?: number) {
    const where: any = {};
    if (month) where.month = month;
    if (year) where.year = year;
    return this.repo.find({ where, relations: ['user'], order: { createdAt: 'DESC' } });
  }

  async generateForMonth(month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const users = await this.usersRepo.find();
    const results = [];

    for (const user of users) {
      let totalDaysWorked = 0;
      
      if (user.role === 'driver') {
        const trips = await this.tripsRepo.find({
          where: {
            driver: { user: { id: user.id } },
            status: TripStatus.COMPLETED,
            actualArrival: Between(startDate, endDate)
          },
          relations: ['driver', 'driver.user']
        });

        trips.forEach(t => {
           const pDate = t.actualDeparture || new Date();
           const dDate = t.actualArrival || new Date();
           const hours = (dDate.getTime() - pDate.getTime()) / (1000 * 60 * 60);
           const days = Math.max(1, Math.ceil(hours / 24));
           totalDaysWorked += days;
        });
      }

      if (!user.grossSalary && totalDaysWorked === 0) continue;

      let payroll = await this.repo.findOne({ where: { user: { id: user.id }, month, year } });
      if (!payroll) {
        payroll = this.repo.create({
          user: { id: user.id } as any,
          month,
          year,
          bonuses: 0,
          deductions: 0
        });
      }

      const grossSalary = Number(user.grossSalary) || 0;
      const dailyAllowanceRate = Number(user.dailyRate) || 0;
      
      const taxAmount = grossSalary * 0.3697;
      const netSalary = grossSalary - taxAmount;
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

    const totalNetToPay = Number(payroll.netSalary) + Number(payroll.totalAllowance) + Number(payroll.bonuses) - Number(payroll.deductions);
    payroll.totalNetToPay = totalNetToPay;

    return this.repo.save(payroll);
  }
}
