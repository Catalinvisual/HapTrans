import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { Document } from '../documents/document.entity';
import { Invoice } from '../invoices/invoice.entity';
import { Expense } from '../expenses/expense.entity';
import { Trip } from '../trips/trip.entity';
import { Truck } from '../trucks/truck.entity';
import { Driver } from '../drivers/driver.entity';
import { Client } from '../clients/client.entity';
import { Maintenance } from '../maintenance/maintenance.entity';
import { User } from '../users/user.entity';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class TnasService {
  constructor(
    @InjectRepository(Document) private docsRepo: Repository<Document>,
    @InjectRepository(Invoice) private invoicesRepo: Repository<Invoice>,
    @InjectRepository(Expense) private expensesRepo: Repository<Expense>,
    @InjectRepository(Trip) private tripsRepo: Repository<Trip>,
    @InjectRepository(Truck) private trucksRepo: Repository<Truck>,
    @InjectRepository(Driver) private driversRepo: Repository<Driver>,
    @InjectRepository(Client) private clientsRepo: Repository<Client>,
    @InjectRepository(Maintenance) private maintenanceRepo: Repository<Maintenance>,
    @InjectRepository(User) private usersRepo: Repository<User>,
  ) {}

  generateSignedUrl(entity: any, expiresInSeconds: number) {
    if (!entity.publicId) return entity.fileUrl || entity.pdfUrl || entity.receiptUrl;

    const options: any = {
      secure: true,
      sign_url: true,
      type: entity.cloudinaryType || 'authenticated',
      resource_type: entity.resourceType || 'raw',
      expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
    };
    
    if (entity.resourceType === 'image' && entity.format) {
      options.format = entity.format;
    }

    return cloudinary.url(entity.publicId, options);
  }

  async getPendingFiles() {
    const whereCondition = [
      { tnasDownloaded: false, publicId: Not(IsNull()) },
      { tnasDownloaded: IsNull() as any, publicId: Not(IsNull()) }
    ];

    const docs = await this.docsRepo.find({ where: whereCondition });
    const invs = await this.invoicesRepo.find({ where: whereCondition });
    const exps = await this.expensesRepo.find({ where: whereCondition });

    const results = [];

    for (const d of docs) {
      results.push({
        id: d.id,
        source: 'documents',
        filename: d.originalFilename || d.fileName,
        category: 'Documents',
        signedUrl: this.generateSignedUrl(d, 15 * 60),
        createdAt: d.createdAt,
      });
    }

    for (const i of invs) {
      results.push({
        id: i.id,
        source: 'invoices',
        filename: i.originalFilename || `Invoice_${i.invoiceNumber}.pdf`,
        category: 'Invoices',
        signedUrl: this.generateSignedUrl(i, 15 * 60),
        createdAt: i.createdAt,
      });
    }

    for (const e of exps) {
      results.push({
        id: e.id,
        source: 'expenses',
        filename: e.originalFilename || `Expense_${e.id.substring(0,8)}.pdf`,
        category: 'Expenses',
        signedUrl: this.generateSignedUrl(e, 15 * 60),
        createdAt: e.createdAt,
      });
    }

    return results;
  }

  async markDownloaded(source: string, id: string) {
    let repo: Repository<any>;
    if (source === 'documents') repo = this.docsRepo;
    else if (source === 'invoices') repo = this.invoicesRepo;
    else if (source === 'expenses') repo = this.expensesRepo;
    else throw new NotFoundException('Invalid source');

    const entity = await repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException();

    entity.tnasDownloaded = true;
    await repo.save(entity);

    return { success: true };
  }

  // ---- BACKUP LOGIC ----

  backupHealth() {
    return {
      ok: true,
      service: 'tnas-excel-backup',
      timestamp: new Date().toISOString()
    };
  }

  async backupTrips() {
    const data = await this.tripsRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['client', 'truck', 'driver', 'driver.user']
    });
    return data.map(t => {
      const { client, truck, driver, costs, invoices, documents, messages, ...rest } = t as any;
      return {
        ...rest,
        clientName: client?.name || '',
        truckPlate: truck?.plateNumber || '',
        driverName: driver?.user ? `${driver.user.firstName} ${driver.user.lastName}` : '',
      };
    }) || [];
  }

  async backupTrucks() {
    const data = await this.trucksRepo.find({ order: { plateNumber: 'ASC' } });
    return data.map(t => {
      const { trips, maintenanceRecords, documents, ...rest } = t as any;
      return rest;
    }) || [];
  }

  async backupDrivers() {
    const data = await this.driversRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['user']
    });
    return data.map(d => {
      const { user, trips, documents, ...rest } = d as any;
      return {
        ...rest,
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
      };
    }) || [];
  }

  async backupClients() {
    const data = await this.clientsRepo.find({ order: { name: 'ASC' } });
    return data.map(c => {
      const { trips, invoices, ...rest } = c as any;
      return rest;
    }) || [];
  }

  async backupMaintenance() {
    const data = await this.maintenanceRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['truck']
    });
    return data.map(m => {
      const { truck, ...rest } = m as any;
      return {
        ...rest,
        truckPlate: truck?.plateNumber || '',
      };
    }) || [];
  }

  async backupUsers() {
    const data = await this.usersRepo.find({ order: { createdAt: 'DESC' } });
    return data.map(u => {
      const { password, ...rest } = u as any;
      return rest;
    }) || [];
  }

  async backupInvoices() {
    const data = await this.invoicesRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['client']
    });
    return data.map(i => {
      const { client, trip, ...rest } = i as any;
      return {
        ...rest,
        clientName: client?.name || '',
      };
    }) || [];
  }

  async backupExpenses() {
    const data = await this.expensesRepo.find({ order: { createdAt: 'DESC' } });
    return data || [];
  }
}
