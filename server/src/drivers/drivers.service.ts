import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver } from './driver.entity';
import { DriverDocument } from './driver-document.entity';
import { User } from '../users/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver) private repo: Repository<Driver>,
    @InjectRepository(DriverDocument) private docsRepo: Repository<DriverDocument>,
    @InjectRepository(User) private usersRepo: Repository<User>,
  ) {}

  findAll() { return this.repo.find({ relations: ['user', 'documents'] }); }
  findOne(id: string) { return this.repo.findOne({ where: { id }, relations: ['user', 'documents', 'trips'] }); }
  findByUserId(userId: string) { return this.repo.findOne({ where: { user: { id: userId } }, relations: ['user'] }); }

  async create(dto: any) {
    const exists = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already in use');
    
    const hashed = await bcrypt.hash(dto.password || 'Driver2024!', 10);
    const user = this.usersRepo.create({
      name: dto.name,
      email: dto.email,
      password: hashed,
      role: 'driver' as any
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
    return this.repo.save(driver);
  }

  async update(id: string, dto: any) {
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
      await this.usersRepo.save(driver.user);
    }

    if (dto.phone !== undefined) driver.phone = dto.phone;
    if (dto.licenseNumber !== undefined) driver.licenseNumber = dto.licenseNumber;
    if (dto.licenseExpiry !== undefined) driver.licenseExpiry = dto.licenseExpiry ? new Date(dto.licenseExpiry) : null as any;
    if (dto.medicalExpiry !== undefined) driver.medicalExpiry = dto.medicalExpiry ? new Date(dto.medicalExpiry) : null as any;
    if (dto.tachoCardExpiry !== undefined) driver.tachoCardExpiry = dto.tachoCardExpiry ? new Date(dto.tachoCardExpiry) : null as any;
    if (dto.status !== undefined) driver.status = dto.status;

    return this.repo.save(driver);
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
}
