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
        createdAt: d.uploadedAt,
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
    try {
      const data = await this.tripsRepo.find({
        order: { createdAt: 'DESC' },
        relations: [
          'truck',
          'trailer',
          'driver',
          'driver.user',
          'dispatcher',
          'stops',
          'orders',
          'orders.cargoItems',
        ],
      });

      return (data || []).map(t => {
        const stops = Array.isArray(t.stops) ? t.stops : [];
        const sortedStops = stops.slice().sort((a, b) => (Number(a.sequence) || 0) - (Number(b.sequence) || 0));
        const pickupStops = sortedStops.filter(s => s.type === 'pickup');
        const deliveryStops = sortedStops.filter(s => s.type === 'delivery');

        const firstPickup = pickupStops[0] || sortedStops[0] || null;
        const lastDelivery = deliveryStops[deliveryStops.length - 1] || sortedStops[sortedStops.length - 1] || null;

        const orders = Array.isArray(t.orders) ? t.orders : [];
        const clientName = orders.find((o: any) => o?.client?.name)?.client?.name || '';
        const orderNumbers = orders.map((o: any) => o?.orderNumber).filter(Boolean).join(', ');
        const customerRefs = orders.map((o: any) => o?.customerReference).filter(Boolean).join(', ');
        const loadingRef = orders.map((o: any) => o?.loadingReference).filter(Boolean).join(', ');
        const unloadingRef = orders.map((o: any) => o?.unloadingReference).filter(Boolean).join(', ');

        let totalPallets = 0;
        let totalWeightKg = 0;
        let totalVolumeCbm = 0;
        let palletType = '';

        for (const o of orders) {
          const items = Array.isArray(o?.cargoItems) ? o.cargoItems : [];
          for (const item of items) {
            if (item?.quantity) totalPallets += Number(item.quantity) || 0;
            if (item?.weightKg) totalWeightKg += Number(item.weightKg) || 0;
            if (item?.volumeCbm) totalVolumeCbm += Number(item.volumeCbm) || 0;
            if (item?.unit && !palletType) palletType = String(item.unit);
          }
        }

        const estCost = Number(t.estimatedCost) || 0;
        const estProfit = Number(t.estimatedProfit) || 0;
        const price = estCost + estProfit;

        return {
          id: t.id,
          referenceNumber: t.tripNumber || '',
          tripNumber: t.tripNumber || '',
          clientName,
          truckPlate: t.truck?.plateNumber || t.carrierTruckPlate || '',
          trailerPlate: t.trailer?.plateNumber || t.carrierTrailerPlate || '',
          driverName: t.driver?.user?.name || t.carrierDriverName || '',
          driverPhone: t.driver?.phone || t.carrierDriverPhone || '',
          dispatcherName: t.dispatcher?.name || '',

          pickupAddress: firstPickup?.address || '',
          pickupCompanyName: firstPickup?.companyName || '',
          pickupCountry: firstPickup?.country || '',
          pickupDate: firstPickup?.timeWindowMin || firstPickup?.eta || t.plannedDeparture || null,
          pickupTime: firstPickup?.timeWindowMin
            ? new Date(firstPickup.timeWindowMin).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
            : '',

          dropoffAddress: lastDelivery?.address || '',
          dropoffCompanyName: lastDelivery?.companyName || '',
          dropoffCountry: lastDelivery?.country || '',
          dropoffDate: lastDelivery?.timeWindowMax || lastDelivery?.eta || t.plannedArrival || null,
          dropoffTime: lastDelivery?.timeWindowMax
            ? new Date(lastDelivery.timeWindowMax).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
            : '',

          price,
          estimatedCost: estCost,
          realCost: Number(t.tollCost) || 0,
          estimatedProfit: estProfit,
          actualProfit: Number(t.actualProfit) || 0,
          distanceKm: Number(t.distanceKm) || 0,
          status: t.status || 'planning',
          fleetType: t.fleetType || 'own_fleet',

          pallets: totalPallets > 0 ? totalPallets : '',
          palletType: palletType || (totalPallets > 0 ? 'pallet' : ''),
          weightKg: totalWeightKg > 0 ? totalWeightKg : '',
          volumeCbm: totalVolumeCbm > 0 ? totalVolumeCbm : '',
          loadingReference: loadingRef,
          unloadingReference: unloadingRef,

          orderNumbers,
          customerReferences: customerRefs,
          totalStops: sortedStops.length,

          carrierName: t.carrierName || '',
          carrierRate: t.carrierRate != null ? Number(t.carrierRate) : null,
          carrierCurrency: t.carrierCurrency || 'EUR',

          plannedDeparture: t.plannedDeparture || null,
          actualDeparture: t.actualDeparture || null,
          plannedArrival: t.plannedArrival || null,
          actualArrival: t.actualArrival || null,

          notes: t.carrierNotes || '',
          driverNotes: '',
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        };
      });
    } catch (err: any) {
      // In case of any unexpected join error, fallback to safe base trip query without complex joins
      const fallbackData = await this.tripsRepo.find({ order: { createdAt: 'DESC' } });
      return (fallbackData || []).map(t => ({
        id: t.id,
        referenceNumber: t.tripNumber || '',
        tripNumber: t.tripNumber || '',
        clientName: '',
        truckPlate: t.carrierTruckPlate || '',
        trailerPlate: t.carrierTrailerPlate || '',
        driverName: t.carrierDriverName || '',
        driverPhone: t.carrierDriverPhone || '',
        dispatcherName: '',
        pickupAddress: '',
        pickupCompanyName: '',
        pickupCountry: '',
        pickupDate: t.plannedDeparture || null,
        pickupTime: '',
        dropoffAddress: '',
        dropoffCompanyName: '',
        dropoffCountry: '',
        dropoffDate: t.plannedArrival || null,
        dropoffTime: '',
        price: Number(t.estimatedCost || 0) + Number(t.estimatedProfit || 0),
        estimatedCost: Number(t.estimatedCost || 0),
        realCost: Number(t.tollCost || 0),
        estimatedProfit: Number(t.estimatedProfit || 0),
        actualProfit: Number(t.actualProfit || 0),
        distanceKm: Number(t.distanceKm) || 0,
        status: t.status || 'planning',
        fleetType: t.fleetType || 'own_fleet',
        pallets: '',
        palletType: '',
        weightKg: '',
        volumeCbm: '',
        loadingReference: '',
        unloadingReference: '',
        orderNumbers: '',
        customerReferences: '',
        totalStops: 0,
        carrierName: t.carrierName || '',
        carrierRate: t.carrierRate != null ? Number(t.carrierRate) : null,
        carrierCurrency: t.carrierCurrency || 'EUR',
        plannedDeparture: t.plannedDeparture || null,
        actualDeparture: t.actualDeparture || null,
        plannedArrival: t.plannedArrival || null,
        actualArrival: t.actualArrival || null,
        notes: t.carrierNotes || '',
        driverNotes: '',
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      }));
    }
  }

  async backupTrucks() {
    const data = await this.trucksRepo.find({ order: { plateNumber: 'ASC' } });
    return (data || []).map(t => ({
      id: t.id,
      plateNumber: t.plateNumber || '',
      brand: t.brand || '',
      model: t.model || '',
      year: t.year || null,
      payloadCapacity: t.payloadCapacity != null ? Number(t.payloadCapacity) : null,
      fuelConsumption: t.fuelConsumption != null ? Number(t.fuelConsumption) : null,
      status: t.status || '',
      currentLat: t.currentLat != null ? Number(t.currentLat) : null,
      currentLng: t.currentLng != null ? Number(t.currentLng) : null,
      totalMileage: t.totalMileage != null ? Number(t.totalMileage) : null,
      nextMaintenanceMileage: t.nextMaintenanceMileage != null ? Number(t.nextMaintenanceMileage) : null,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  }

  async backupDrivers() {
    const data = await this.driversRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['user']
    });
    return (data || []).map(d => ({
      id: d.id,
      name: d.user?.name || '',
      email: d.user?.email || '',
      phone: d.phone || '',
      licenseNumber: d.licenseNumber || '',
      licenseExpiry: d.licenseExpiry || null,
      medicalExpiry: d.medicalExpiry || null,
      tachoCardExpiry: d.tachoCardExpiry || null,
      status: d.status || '',
      currentLat: d.currentLat != null ? Number(d.currentLat) : null,
      currentLng: d.currentLng != null ? Number(d.currentLng) : null,
      lastSeen: d.lastSeen || null,
      payMode: d.payMode || '',
      payRate: d.payRate != null ? Number(d.payRate) : null,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));
  }

  async backupClients() {
    const data = await this.clientsRepo.find({ order: { name: 'ASC' } });
    return (data || []).map(c => ({
      id: c.id,
      name: c.name || '',
      cui: c.cui || '',
      address: c.address || '',
      contactName: c.contactName || '',
      contactEmail: c.contactEmail || '',
      phone: c.phone || '',
      country: c.country || '',
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  async backupMaintenance() {
    const data = await this.maintenanceRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['truck']
    });
    return (data || []).map(m => ({
      id: m.id,
      truckPlate: m.truck?.plateNumber || '',
      type: m.type || '',
      description: m.description || '',
      scheduledDate: m.scheduledDate || null,
      completedDate: m.completedDate || null,
      cost: m.cost != null ? Number(m.cost) : null,
      serviceProvider: m.serviceProvider || '',
      status: m.status || '',
      notes: m.notes || '',
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }));
  }

  async backupUsers() {
    const data = await this.usersRepo.find({ order: { createdAt: 'DESC' } });
    return (data || []).map(u => ({
      id: u.id,
      name: u.name || '',
      email: u.email || '',
      role: u.role || '',
      language: u.language || '',
      grossSalary: u.grossSalary != null ? Number(u.grossSalary) : null,
      dailyRate: u.dailyRate != null ? Number(u.dailyRate) : null,
      isActive: Boolean(u.isActive),
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));
  }

  async backupInvoices() {
    const data = await this.invoicesRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['client']
    });
    return (data || []).map(i => ({
      id: i.id,
      invoiceNumber: i.invoiceNumber || '',
      clientName: i.client?.name || '',
      amount: i.amount != null ? Number(i.amount) : 0,
      vatPercent: i.vatPercent != null ? Number(i.vatPercent) : 0,
      issueDate: i.issueDate || null,
      dueDate: i.dueDate || null,
      status: i.status || '',
      pdfUrl: i.pdfUrl || '',
      publicId: i.publicId || '',
      resourceType: i.resourceType || '',
      cloudinaryType: i.cloudinaryType || '',
      format: i.format || '',
      originalFilename: i.originalFilename || '',
      tnasDownloaded: Boolean(i.tnasDownloaded),
      notes: i.notes || '',
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    }));
  }

  async backupExpenses() {
    const data = await this.expensesRepo.find({ order: { createdAt: 'DESC' } });
    return (data || []).map(e => ({
      id: e.id,
      amount: e.amount != null ? Number(e.amount) : 0,
      currency: e.currency || 'EUR',
      category: e.category || '',
      description: e.description || '',
      date: e.date || null,
      receiptUrl: e.receiptUrl || '',
      publicId: e.publicId || '',
      resourceType: e.resourceType || '',
      cloudinaryType: e.cloudinaryType || '',
      format: e.format || '',
      originalFilename: e.originalFilename || '',
      tnasDownloaded: Boolean(e.tnasDownloaded),
      uploadedById: e.uploadedById || '',
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    }));
  }
}
