import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver } from './driver.entity';
import { DriverDocument } from './driver-document.entity';
import { DriverHos } from './driver-hos.entity';
import { Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { User } from '../users/user.entity';
import { Truck } from '../trucks/truck.entity';
import * as bcrypt from 'bcrypt';
import { ActionLogsService } from '../action-logs/action-logs.service';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver) private repo: Repository<Driver>,
    @InjectRepository(DriverDocument) private docsRepo: Repository<DriverDocument>,
    @InjectRepository(DriverHos) private hosRepo: Repository<DriverHos>,
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(Truck) private trucksRepo: Repository<Truck>,
    private actionLogs: ActionLogsService,
  ) {}

  findAll() { return this.repo.find({ relations: ['user', 'documents', 'trucks'] }); }
  findOne(id: string) { return this.repo.findOne({ where: { id }, relations: ['user', 'documents', 'trips', 'trucks'] }); }
  findByUserId(userId: string) { return this.repo.findOne({ where: { user: { id: userId } }, relations: ['user', 'trucks'] }); }

  async create(dto: any, userParam?: any) {
    const exists = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already in use');
    
    const hashed = await bcrypt.hash(dto.password || 'Driver2024!', 10);
    const user = this.usersRepo.create({
      name: dto.name,
      email: dto.email,
      password: hashed,
      role: 'driver' as any,
      grossSalary: dto.grossSalary ? Number(dto.grossSalary) : null as any,
      dailyRate: dto.dailyRate ? Number(dto.dailyRate) : null as any
    });
    const savedUser = await this.usersRepo.save(user);

    const driver = this.repo.create({
      user: savedUser as any,
      phone: dto.phone,
      licenseNumber: dto.licenseNumber,
      licenseExpiry: dto.licenseExpiry ? new Date(dto.licenseExpiry) : null as any,
      medicalExpiry: dto.medicalExpiry ? new Date(dto.medicalExpiry) : null as any,
      tachoCardExpiry: dto.tachoCardExpiry ? new Date(dto.tachoCardExpiry) : null as any,
      status: dto.status || 'available'
    } as any);
    const savedDriver = await this.repo.save(driver);

    if (dto.truckId) {
      await this.trucksRepo.update(dto.truckId, { driver: { id: (savedDriver as any).id } as any });
    }

    if (userParam) {
      await this.actionLogs.logAction('Driver', (savedDriver as any).id, 'CREATED', userParam, {});
    }

    return savedDriver;
  }

  async update(id: string, dto: any, userParam?: any) {
    const driver = await this.repo.findOne({ where: { id }, relations: ['user'] });
    if (!driver) throw new Error('Driver not found');

    if (driver.user) {
      if (dto.name) driver.user.name = dto.name;
      if (dto.email) {
        const emailExists = await this.usersRepo.findOne({ where: { email: dto.email } });
        if (emailExists && emailExists.id !== driver.user.id) {
          throw new ConflictException('Email already in use');
        }
        driver.user.email = dto.email;
      }
      if (dto.password) {
        driver.user.password = await bcrypt.hash(dto.password, 10);
      }
      if (dto.grossSalary !== undefined) driver.user.grossSalary = dto.grossSalary ? Number(dto.grossSalary) : null as any;
      if (dto.dailyRate !== undefined) driver.user.dailyRate = dto.dailyRate ? Number(dto.dailyRate) : null as any;
      await this.usersRepo.save(driver.user);
    }

    if (dto.payMode !== undefined) driver.payMode = dto.payMode;
    if (dto.payRate !== undefined) driver.payRate = dto.payRate ? Number(dto.payRate) : null as any;
    if (dto.phone !== undefined) driver.phone = dto.phone;
    if (dto.licenseNumber !== undefined) driver.licenseNumber = dto.licenseNumber;
    if (dto.licenseExpiry !== undefined) driver.licenseExpiry = dto.licenseExpiry ? new Date(dto.licenseExpiry) : null as any;
    if (dto.medicalExpiry !== undefined) driver.medicalExpiry = dto.medicalExpiry ? new Date(dto.medicalExpiry) : null as any;
    if (dto.tachoCardExpiry !== undefined) driver.tachoCardExpiry = dto.tachoCardExpiry ? new Date(dto.tachoCardExpiry) : null as any;
    if (dto.status !== undefined) driver.status = dto.status;

    const savedDriver = await this.repo.save(driver);

    if ('truckId' in dto) {
      // First, remove this driver from any existing truck
      await this.trucksRepo.update({ driver: { id: (savedDriver as any).id } as any }, { driver: null } as any);
      
      // Then assign to the new truck if provided
      if (dto.truckId) {
        await this.trucksRepo.update(dto.truckId, { driver: { id: (savedDriver as any).id } as any });
      }
    }

    if (userParam) {
      const updatedFields = Object.keys(dto);
      if (updatedFields.length > 0) {
        await this.actionLogs.logAction('Driver', id, 'UPDATED', userParam, { updatedFields });
      }
    }

    return savedDriver;
  }

  remove(id: string) { return this.repo.delete(id); }

  addDocument(driverId: string, doc: Partial<DriverDocument>) {
    const d = this.docsRepo.create({ ...doc, driver: { id: driverId } as any });
    return this.docsRepo.save(d);
  }

  async findActiveTruckId(driverId: string): Promise<string | null> {
    const driver = await this.repo.findOne({
      where: { id: driverId },
      relations: ['trips', 'trips.truck'],
    });
    if (!driver || !driver.trips) return null;
    const activeTrip = driver.trips.find(
      t => ['in_progress', 'confirmed', 'pending'].includes(t.status)
    );
    return activeTrip && activeTrip.truck ? activeTrip.truck.id : null;
  }

  async updateLocation(id: string, lat: number, lng: number) {
    let driver = await this.repo.findOne({ where: { id } });
    if (!driver) {
      driver = await this.repo.findOne({ where: { user: { id } } });
    }
    if (driver) {
      await this.repo.update(driver.id, { currentLat: lat, currentLng: lng, lastSeen: new Date() });
      return driver;
    }
    return null;
  }

  async getExpiringDocuments(days = 30) {
    const future = new Date();
    future.setDate(future.getDate() + days);
    
    // Check main driver fields
    const expiringDrivers = await this.repo.createQueryBuilder('driver')
      .leftJoinAndSelect('driver.user', 'user')
      .where('driver.licenseExpiry <= :future', { future })
      .orWhere('driver.medicalExpiry <= :future', { future })
      .orWhere('driver.tachoCardExpiry <= :future', { future })
      .getMany();

    // Check custom documents
    const expiringDocs = await this.docsRepo.createQueryBuilder('d')
      .leftJoinAndSelect('d.driver', 'driver')
      .leftJoinAndSelect('driver.user', 'user')
      .where('d.expiryDate <= :future', { future })
      .getMany();

    return { drivers: expiringDrivers, documents: expiringDocs };
  }


  async getHos(driverId: string, from?: string, to?: string) {
    const where: any = { driver: { id: driverId } };
    if (from && to) {
      where.date = Between(from, to);
    } else {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 14);
      where.date = MoreThanOrEqual(weekAgo.toISOString().slice(0, 10));
    }
    const rows = await this.hosRepo.find({ where, order: { date: 'ASC' } });
    const summary = this.computeHosSummary(rows);
    return { rows, summary };
  }

  computeHosSummary(rows: DriverHos[]) {
    const maxDaily = 9;
    const maxDailyExtended = 10;
    const maxWeekly = 56;
    const maxTwoWeek = 90;
    const totalDriving = rows.reduce((s, r) => s + Number(r.drivingHours || 0), 0);
    const totalWork = rows.reduce((s, r) => s + Number(r.workHours || 0), 0);
    const overDaily = rows.filter(r => Number(r.drivingHours) > maxDaily).length;
    const overExtended = rows.filter(r => Number(r.drivingHours) > maxDailyExtended).length;
    const weeklyDriving = +rows.slice(-7).reduce((s, r) => s + Number(r.drivingHours || 0), 0).toFixed(2);
    return {
      totalDriving: +totalDriving.toFixed(2),
      totalWork: +totalWork.toFixed(2),
      maxDaily,
      maxDailyExtended,
      maxWeekly,
      maxTwoWeek,
      overDaily,
      overExtended,
      weeklyDriving,
      weeklyRemaining: Math.max(0, +(maxWeekly - weeklyDriving).toFixed(2)),
    };
  }

  async saveHos(driverId: string, dto: any) {
    const date = dto.date;
    const existing = await this.hosRepo.findOne({ where: { driver: { id: driverId }, date } });
    const data = {
      drivingHours: Number(dto.drivingHours || 0),
      workHours: Number(dto.workHours || 0),
      breakMinutes: Number(dto.breakMinutes || 0),
      restHours: Number(dto.restHours || 0),
      notes: dto.notes,
    };
    if (existing) {
      Object.assign(existing, data);
      return this.hosRepo.save(existing);
    }
    return this.hosRepo.save(this.hosRepo.create({ ...data, driver: { id: driverId } as any, date }));
  }

  removeHos(id: string) { return this.hosRepo.delete(id); }

  async getHosSummaryAll() {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const from = weekAgo.toISOString().slice(0, 10);
    const rows = await this.hosRepo.find({ where: { date: MoreThanOrEqual(from) }, relations: ['driver'] });
    const byDriver: Record<string, number> = {};
    for (const r of rows) {
      const driverId = (r.driver as any)?.id;
      if (driverId) byDriver[driverId] = (byDriver[driverId] || 0) + Number(r.drivingHours || 0);
    }
    return Object.entries(byDriver).map(([driverId, weeklyDriving]) => ({
      driverId,
      weeklyDriving: +weeklyDriving.toFixed(2),
      remaining: Math.max(0, +(56 - weeklyDriving).toFixed(2)),
      over: weeklyDriving > 56,
    }));
  }

}
