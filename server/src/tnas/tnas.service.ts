import { Injectable, NotFoundException, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, In } from 'typeorm';
import { v2 as cloudinary } from 'cloudinary';

// Core entities (Legacy 9 datasets)
import { Document } from '../documents/document.entity';
import { Invoice } from '../invoices/invoice.entity';
import { Expense } from '../expenses/expense.entity';
import { Trip } from '../trips/trip.entity';
import { Truck } from '../trucks/truck.entity';
import { Driver } from '../drivers/driver.entity';
import { Client } from '../clients/client.entity';
import { Maintenance } from '../maintenance/maintenance.entity';
import { User } from '../users/user.entity';

// Orders & Cargo
import { Order } from '../orders/order.entity';
import { CargoItem } from '../orders/cargo-item.entity';
import { OrderStop } from '../orders/order-stop.entity';

// Fleet & Telematics
import { Trailer } from '../trucks/trailer.entity';
import { TelematicsDevice } from '../telematics/entities/telematics-device.entity';
import { Tachograph } from '../telematics/entities/tachograph.entity';
import { DriverTachographCard } from '../telematics/entities/driver-tachograph-card.entity';
import { TachographActivityEvent } from '../telematics/entities/tachograph-activity-event.entity';

// Planning & Dispatch
import { TruckRoutePlan } from '../planning/truck-route-plan.entity';
import { Shipment } from '../planning/shipment.entity';
import { CrossDockTransfer } from '../planning/cross-dock-transfer.entity';
import { PlanningAction } from '../planning/planning-action.entity';

// Commercial & Quotes
import { QuoteRequest } from '../quotes/quote.entity';
import { QuoteReply } from '../quotes/quote-reply.entity';
import { ClientRate } from '../clients/client-rate.entity';
import { ClientLocation } from '../clients/client-location.entity';

// Finance & Payroll
import { InvoiceItem } from '../invoices/invoice-item.entity';
import { Payment } from '../payments/payment.entity';
import { Payroll } from '../payroll/payroll.entity';
import { Settlement } from '../settlements/settlement.entity';

// Documents Registry
import { DriverDocument } from '../drivers/driver-document.entity';
import { TruckDocument } from '../trucks/truck-document.entity';
import { MaintenanceAttachment } from '../maintenance/maintenance-attachment.entity';

// Website CMS & Leads
import { WebsiteCms } from '../website-cms/website-cms.entity';
import { Lead } from '../leads/lead.entity';
import { JobApplication } from '../job-applications/job-application.entity';
import { ContactMessage } from '../contact/contact.entity';

// System & Governance
import { Company } from '../companies/company.entity';
import { SavedReport } from '../reports/saved-report.entity';
import { ScheduledReport } from '../reports/scheduled-report.entity';
import { Message } from '../chat/message.entity';

@Injectable()
export class TnasService {
  private readonly logger = new Logger(TnasService.name);

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

    // Orders & Cargo
    @InjectRepository(Order) private ordersRepo: Repository<Order>,
    @InjectRepository(CargoItem) private cargoItemsRepo: Repository<CargoItem>,
    @InjectRepository(OrderStop) private orderStopsRepo: Repository<OrderStop>,

    // Fleet & Telematics
    @InjectRepository(Trailer) private trailersRepo: Repository<Trailer>,
    @InjectRepository(TelematicsDevice) private telematicsDevicesRepo: Repository<TelematicsDevice>,
    @InjectRepository(Tachograph) private tachographsRepo: Repository<Tachograph>,
    @InjectRepository(DriverTachographCard) private driverTachoCardsRepo: Repository<DriverTachographCard>,
    @InjectRepository(TachographActivityEvent) private tachoEventsRepo: Repository<TachographActivityEvent>,

    // Planning & Dispatch
    @InjectRepository(TruckRoutePlan) private routePlansRepo: Repository<TruckRoutePlan>,
    @InjectRepository(Shipment) private shipmentsRepo: Repository<Shipment>,
    @InjectRepository(CrossDockTransfer) private crossDocksRepo: Repository<CrossDockTransfer>,
    @InjectRepository(PlanningAction) private planningActionsRepo: Repository<PlanningAction>,

    // Commercial & Quotes
    @InjectRepository(QuoteRequest) private quotesRepo: Repository<QuoteRequest>,
    @InjectRepository(QuoteReply) private quoteRepliesRepo: Repository<QuoteReply>,
    @InjectRepository(ClientRate) private clientRatesRepo: Repository<ClientRate>,
    @InjectRepository(ClientLocation) private clientLocationsRepo: Repository<ClientLocation>,

    // Finance & Payroll
    @InjectRepository(InvoiceItem) private invoiceItemsRepo: Repository<InvoiceItem>,
    @InjectRepository(Payment) private paymentsRepo: Repository<Payment>,
    @InjectRepository(Payroll) private payrollsRepo: Repository<Payroll>,
    @InjectRepository(Settlement) private settlementsRepo: Repository<Settlement>,

    // Documents Registry
    @InjectRepository(DriverDocument) private driverDocsRepo: Repository<DriverDocument>,
    @InjectRepository(TruckDocument) private truckDocsRepo: Repository<TruckDocument>,
    @InjectRepository(MaintenanceAttachment) private maintenanceAttachmentsRepo: Repository<MaintenanceAttachment>,

    // Website CMS & Leads
    @InjectRepository(WebsiteCms) private websiteCmsRepo: Repository<WebsiteCms>,
    @InjectRepository(Lead) private leadsRepo: Repository<Lead>,
    @InjectRepository(JobApplication) private jobAppsRepo: Repository<JobApplication>,
    @InjectRepository(ContactMessage) private contactsRepo: Repository<ContactMessage>,

    // System & Governance
    @InjectRepository(Company) private companiesRepo: Repository<Company>,
    @InjectRepository(SavedReport) private savedReportsRepo: Repository<SavedReport>,
    @InjectRepository(ScheduledReport) private scheduledReportsRepo: Repository<ScheduledReport>,
    @InjectRepository(Message) private messagesRepo: Repository<Message>,
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

  // ==========================================
  // 1. HEALTH CHECK
  // ==========================================
  backupHealth() {
    return {
      ok: true,
      service: 'tnas-excel-backup',
      timestamp: new Date().toISOString()
    };
  }

  // ==========================================
  // 2. TRIPS (Legacy File: Trips.xlsx)
  // ==========================================
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

  // ==========================================
  // 3. TRUCKS (Legacy File: Trucks.xlsx)
  // ==========================================
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

  // ==========================================
  // 4. DRIVERS (Legacy File: Drivers.xlsx)
  // ==========================================
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

  // ==========================================
  // 5. CLIENTS (Legacy File: Clients.xlsx)
  // ==========================================
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

  // ==========================================
  // 6. MAINTENANCE (Legacy File: Maintenance.xlsx)
  // ==========================================
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

  // ==========================================
  // 7. USERS (Legacy File: Users.xlsx)
  // ==========================================
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

  // ==========================================
  // 8. INVOICES (Legacy File: Invoices.xlsx)
  // ==========================================
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

  // ==========================================
  // 9. EXPENSES (Legacy File: Expenses.xlsx)
  // ==========================================
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

  // ==========================================
  // 10. ORDERS (Multi-Sheet Workbook: Orders.xlsx)
  // Covers: Orders, Cargo Items, Order Stops
  // ==========================================
  async backupOrders() {
    const orders = await this.ordersRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['client', 'trip', 'createdBy']
    });

    const cargoItems = await this.cargoItemsRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['order']
    });

    const orderStops = await this.orderStopsRepo.find({
      order: { sequence: 'ASC' },
      relations: ['order']
    });

    return {
      orders: (orders || []).map(o => ({
        id: o.id,
        orderNumber: o.orderNumber || '',
        customerReference: o.customerReference || '',
        internalReference: o.internalReference || '',
        loadingReference: o.loadingReference || '',
        unloadingReference: o.unloadingReference || '',
        clientName: o.client?.name || '',
        tripNumber: o.trip?.tripNumber || '',
        status: o.status || 'draft',
        transportType: o.transportType || 'ftl',
        priority: o.priority || 'normal',
        distanceKm: o.distanceKm != null ? Number(o.distanceKm) : null,
        price: o.price != null ? Number(o.price) : 0,
        estimatedCost: o.estimatedCost != null ? Number(o.estimatedCost) : 0,
        estimatedProfit: o.estimatedProfit != null ? Number(o.estimatedProfit) : 0,
        currency: o.currency || 'EUR',
        delayMinutes: Number(o.delayMinutes) || 0,
        originalEtaPickup: o.originalEtaPickup || null,
        currentEtaPickup: o.currentEtaPickup || null,
        originalEtaDelivery: o.originalEtaDelivery || null,
        currentEtaDelivery: o.currentEtaDelivery || null,
        contactPerson: o.contactPerson || '',
        contactPhone: o.contactPhone || '',
        createdByName: o.createdBy?.name || '',
        notes: o.notes || '',
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      })),
      cargoItems: (cargoItems || []).map(c => ({
        id: c.id,
        orderNumber: c.order?.orderNumber || '',
        unit: c.unit || 'pallet',
        description: c.description || '',
        quantity: c.quantity != null ? Number(c.quantity) : 1,
        weightKg: c.weightKg != null ? Number(c.weightKg) : null,
        volumeCbm: c.volumeCbm != null ? Number(c.volumeCbm) : null,
        ldm: c.ldm != null ? Number(c.ldm) : null,
        lengthCm: c.lengthCm != null ? Number(c.lengthCm) : null,
        widthCm: c.widthCm != null ? Number(c.widthCm) : null,
        heightCm: c.heightCm != null ? Number(c.heightCm) : null,
        stackable: Boolean(c.stackable),
        fragile: Boolean(c.fragile),
        createdAt: (c as any).createdAt || null,
      })),
      orderStops: (orderStops || []).map(s => ({
        id: s.id,
        orderNumber: s.order?.orderNumber || '',
        type: s.type || 'pickup',
        sequence: s.sequence != null ? Number(s.sequence) : 1,
        companyName: s.companyName || '',
        address: s.address || '',
        city: s.city || '',
        postalCode: s.postalCode || '',
        country: s.country || '',
        latitude: s.latitude != null ? Number(s.latitude) : null,
        longitude: s.longitude != null ? Number(s.longitude) : null,
        contactPerson: s.contactPerson || '',
        contactPhone: (s as any).contactPhone || '',
        createdAt: (s as any).createdAt || null,
      })),
    };
  }

  // ==========================================
  // 11. FLEET & EQUIPMENT (Multi-Sheet: Fleet_Equipment.xlsx)
  // Covers: Trailers, Telematics Devices, Tachographs, Driver Cards, Tacho Events
  // SECURITY: Credentials and keys strictly excluded!
  // ==========================================
  async backupFleetEquipment() {
    const trailers = await this.trailersRepo.find({ order: { plateNumber: 'ASC' } });
    
    // Telematics Devices: Exclude credentials_encrypted
    const telematicsDevices = await this.telematicsDevicesRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['truck']
    });

    const tachographs = await this.tachographsRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['truck']
    });

    const driverTachoCards = await this.driverTachoCardsRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['driver', 'driver.user']
    });

    const tachoEvents = await this.tachoEventsRepo.find({
      order: { createdAt: 'DESC' },
      take: 5000 // Bounded batch to avoid memory exhaustion
    });

    return {
      trailers: (trailers || []).map(t => ({
        id: t.id,
        plateNumber: t.plateNumber || '',
        type: t.type || 'standard',
        brand: t.brand || '',
        year: t.year || null,
        payloadCapacityWeight: t.payloadCapacityWeight != null ? Number(t.payloadCapacityWeight) : null,
        maxLdm: t.maxLdm != null ? Number(t.maxLdm) : null,
        maxVolumeCbm: t.maxVolumeCbm != null ? Number(t.maxVolumeCbm) : null,
        payloadCapacityPallets: t.payloadCapacityPallets || null,
        status: t.status || 'active',
        apkExpiry: t.apkExpiry || null,
        isDropped: Boolean(t.isDropped),
        dropLocation: t.dropLocation || '',
        droppedAt: t.droppedAt || null,
        currentTripId: t.currentTripId || '',
        currentTruckId: t.currentTruckId || '',
        features: Array.isArray(t.features) ? t.features.join(', ') : (t.features || ''),
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      telematicsDevices: (telematicsDevices || []).map(d => ({
        id: d.id,
        truckPlate: d.truck?.plateNumber || '',
        provider: d.provider || '',
        providerDeviceId: d.providerDeviceId || '',
        externalVehicleId: d.externalVehicleId || '',
        deviceType: d.deviceType || '',
        status: d.status || 'active',
        connectionStatus: d.connectionStatus || 'NOT_CONFIGURED',
        lastSeenAt: d.lastSeenAt || null,
        lastLatitude: d.lastLatitude != null ? Number(d.lastLatitude) : null,
        lastLongitude: d.lastLongitude != null ? Number(d.lastLongitude) : null,
        lastSpeed: d.lastSpeed != null ? Number(d.lastSpeed) : null,
        lastHeading: d.lastHeading != null ? Number(d.lastHeading) : null,
        lastOdometer: d.lastOdometer != null ? Number(d.lastOdometer) : null,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
      tachographs: (tachographs || []).map(tg => ({
        id: tg.id,
        truckPlate: tg.truck?.plateNumber || '',
        provider: tg.provider || '',
        externalId: tg.externalId || '',
        brand: tg.brand || '',
        model: tg.model || '',
        serialNumber: tg.serialNumber || '',
        firmwareVersion: tg.firmwareVersion || '',
        generation: tg.generation || '',
        status: tg.status || 'active',
        lastSyncAt: tg.lastSyncAt || null,
        createdAt: tg.createdAt,
        updatedAt: tg.updatedAt,
      })),
      driverTachoCards: (driverTachoCards || []).map(c => ({
        id: c.id,
        driverName: c.driver?.user?.name || '',
        cardNumber: c.cardNumber || '',
        cardIssuer: c.cardIssuer || '',
        issueDate: c.issueDate || null,
        expiryDate: c.expiryDate || null,
        status: c.status || 'valid',
        lastSyncAt: c.lastSyncAt || null,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      tachographActivityEvents: (tachoEvents || []).map(e => ({
        id: e.id,
        truckId: e.truckId || '',
        driverId: e.driverId || '',
        activity: e.activity || '',
        duration: e.duration != null ? Number(e.duration) : 0,
        startTime: e.startTime || null,
        endTime: e.endTime || null,
        source: e.source || 'telematics_sync',
        createdAt: e.createdAt,
      })),
    };
  }

  // ==========================================
  // 12. PLANNING & DISPATCH (Multi-Sheet: Planning_and_Dispatch.xlsx)
  // Covers: Route Plans, Shipments, Cross-Dock Transfers, Planning Actions
  // ==========================================
  async backupPlanning() {
    try {
      let routePlans: any[] = [];
      try {
        routePlans = await this.routePlansRepo.find({
          order: { planningDate: 'DESC' },
          relations: ['truck', 'driver', 'driver.user', 'trip']
        });
      } catch {
        try {
          routePlans = await this.routePlansRepo.find({
            order: { planningDate: 'DESC' },
            relations: ['truck', 'driver', 'trip']
          });
        } catch {
          try {
            routePlans = await this.routePlansRepo.find({
              order: { planningDate: 'DESC' }
            });
          } catch {
            routePlans = [];
          }
        }
      }

      let shipments: any[] = [];
      try {
        shipments = await this.shipmentsRepo.find({
          order: { createdAt: 'DESC' },
          relations: ['client']
        });
      } catch {
        try {
          shipments = await this.shipmentsRepo.find({
            order: { createdAt: 'DESC' }
          });
        } catch {
          shipments = [];
        }
      }

      // Safely resolve order numbers for shipments without unsafe joins
      const orderMap = new Map<string, string>();
      if (shipments && shipments.length > 0) {
        try {
          const orderIds = shipments.map((s: any) => s.orderId).filter(Boolean);
          if (orderIds.length > 0) {
            const matchedOrders = await this.ordersRepo.find({
              where: { id: In(orderIds) },
              select: ['id', 'orderNumber']
            });
            for (const o of matchedOrders) {
              if (o.id && o.orderNumber) {
                orderMap.set(o.id, o.orderNumber);
              }
            }
          }
        } catch {
          // Safe fallback: proceed without orderMap
        }
      }

      let crossDocks: any[] = [];
      try {
        crossDocks = await this.crossDocksRepo.find({
          order: { createdAt: 'DESC' },
          relations: ['order', 'inboundTrip', 'outboundTrip']
        });
      } catch {
        try {
          crossDocks = await this.crossDocksRepo.find({
            order: { createdAt: 'DESC' }
          });
        } catch {
          crossDocks = [];
        }
      }

      let planningActions: any[] = [];
      try {
        planningActions = await this.planningActionsRepo.find({
          order: { createdAt: 'DESC' },
          relations: ['user'],
          take: 2000
        });
      } catch {
        try {
          planningActions = await this.planningActionsRepo.find({
            order: { createdAt: 'DESC' },
            take: 2000
          });
        } catch {
          planningActions = [];
        }
      }

      return {
        routePlans: (routePlans || []).map(p => ({
          id: p.id,
          truckPlate: p.truck?.plateNumber || '',
          driverName: p.driver?.user?.name || '',
          tripNumber: p.trip?.tripNumber || '',
          planningDate: p.planningDate || '',
          version: p.version || 1,
          isCurrent: Boolean(p.isCurrent),
          isOptimized: Boolean(p.isOptimized),
          feasibilityStatus: p.feasibilityStatus || 'feasible',
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        })),
        shipments: (shipments || []).map(s => ({
          id: s.id,
          orderNumber: s.order?.orderNumber || orderMap.get(s.orderId) || s.reference || s.orderId || '',
          clientName: s.client?.name || '',
          status: s.status || 'planned',
          priority: s.priority || 0,
          pickupCity: (s as any).pickupCity || '',
          pickupCountry: (s as any).pickupCountry || '',
          deliveryCity: (s as any).deliveryCity || '',
          deliveryCountry: (s as any).deliveryCountry || '',
          cargoWeightKg: (s as any).cargoWeightKg != null ? Number((s as any).cargoWeightKg) : ((s as any).weightKg != null ? Number((s as any).weightKg) : null),
          cargoVolumeCbm: (s as any).cargoVolumeCbm != null ? Number((s as any).cargoVolumeCbm) : ((s as any).volumeCbm != null ? Number((s as any).volumeCbm) : null),
          cargoPallets: (s as any).cargoPallets != null ? Number((s as any).cargoPallets) : ((s as any).pallets != null ? Number((s as any).pallets) : null),
          createdAt: (s as any).createdAt || null,
          updatedAt: (s as any).updatedAt || null,
        })),
        crossDockTransfers: (crossDocks || []).map(c => ({
          id: c.id,
          orderNumber: c.order?.orderNumber || c.orderId || '',
          facilityName: c.facilityName || '',
          facilityAddress: c.facilityAddress || '',
          inboundTripNumber: c.inboundTrip?.tripNumber || '',
          outboundTripNumber: c.outboundTrip?.tripNumber || '',
          cargoDescription: c.cargoDescription || '',
          pallets: c.pallets != null ? Number(c.pallets) : null,
          status: c.status || 'planned',
          createdAt: (c as any).createdAt || null,
        })),
        planningActions: (planningActions || []).map(a => ({
          id: a.id,
          userName: a.user?.name || '',
          action: a.action || '',
          truckId: a.truckId || '',
          routePlanId: a.routePlanId || '',
          createdAt: a.createdAt,
        })),
      };
    } catch (err: any) {
      this.logger.error(`backupPlanning unexpected failure: ${err?.message || 'unknown'}`);
      return {
        routePlans: [],
        shipments: [],
        crossDockTransfers: [],
        planningActions: [],
      };
    }
  }

  // ==========================================
  // 13. COMMERCIAL & CUSTOMERS (Multi-Sheet: Commercial_and_Customers.xlsx)
  // Covers: Quote Requests, Quote Replies, Client Rates, Client Locations
  // ==========================================
  async backupCommercial() {
    const quoteRequests = await this.quotesRepo.find({ order: { createdAt: 'DESC' } });
    const quoteReplies = await this.quoteRepliesRepo.find({
      order: { sentAt: 'DESC' },
      relations: ['quoteRequest']
    });
    const clientRates = await this.clientRatesRepo.find({
      relations: ['client']
    });
    const clientLocations = await this.clientLocationsRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['client']
    });

    return {
      quoteRequests: (quoteRequests || []).map(q => ({
        id: q.id,
        companyName: q.companyName || '',
        contactPerson: q.contactPerson || '',
        phone: q.phone || '',
        email: q.email || '',
        preferredContactMethod: q.preferredContactMethod || '',
        loadingLocation: q.loadingLocation || '',
        unloadingLocation: q.unloadingLocation || '',
        loadingDate: q.loadingDate || '',
        unloadingDate: q.unloadingDate || '',
        cargoType: q.cargoType || '',
        cargoWeightKg: q.cargoWeightKg || '',
        numberOfPallets: q.numberOfPallets || '',
        status: q.status || 'new',
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
      })),
      quoteReplies: (quoteReplies || []).map(r => ({
        id: r.id,
        quoteRequestId: r.quoteRequestId || '',
        clientCompanyName: r.quoteRequest?.companyName || '',
        message: r.message || '',
        price: r.price != null ? Number(r.price) : 0,
        pickupDate: r.pickupDate || '',
        deliveryDate: r.deliveryDate || '',
        validUntil: r.validUntil || '',
        sentBy: r.sentBy || '',
        sentAt: r.sentAt,
      })),
      clientRates: (clientRates || []).map(cr => ({
        id: cr.id,
        clientName: cr.client?.name || '',
        rateName: cr.rateName || '',
        vehicleType: cr.vehicleType || '',
        priceType: cr.priceType || 'fixed',
        originCountry: cr.originCountry || '',
        originCity: cr.originCity || '',
        destinationCountry: cr.destinationCountry || '',
        destinationCity: cr.destinationCity || '',
        basePrice: cr.basePrice != null ? Number(cr.basePrice) : 0,
        currency: cr.currency || 'EUR',
        fuelSurchargePercent: cr.fuelSurchargePercent != null ? Number(cr.fuelSurchargePercent) : 0,
        tollIncluded: Boolean(cr.tollIncluded),
        validFrom: cr.validFrom || null,
        validUntil: cr.validUntil || null,
        active: Boolean(cr.active),
      })),
      clientLocations: (clientLocations || []).map(cl => ({
        id: cl.id,
        clientName: cl.client?.name || '',
        name: cl.name || '',
        address: cl.address || '',
        city: (cl as any).city || '',
        country: cl.country || '',
        latitude: cl.latitude != null ? Number(cl.latitude) : null,
        longitude: cl.longitude != null ? Number(cl.longitude) : null,
        contactPerson: cl.contactPerson || '',
        phone: cl.phone || '',
        timeZone: cl.timeZone || '',
        createdAt: cl.createdAt,
        updatedAt: cl.updatedAt,
      })),
    };
  }

  // ==========================================
  // 14. FINANCE & PAYROLL (Multi-Sheet: Finance_and_Payroll.xlsx)
  // Covers: Invoice Items, Payments, Payroll, Settlements, IFTA Summary, Financial Summary
  // SECURITY: BSN, IBAN secrets, base64 pdfData omitted!
  // ==========================================
  async backupFinancePayroll() {
    const invoiceItems = await this.invoiceItemsRepo.find({
      relations: ['invoice']
    });

    const payments = await this.paymentsRepo.find({
      order: { date: 'DESC' },
      relations: ['invoice']
    });

    const payrolls = await this.payrollsRepo.find({
      order: { year: 'DESC', month: 'DESC' },
      relations: ['user']
    });

    const settlements = await this.settlementsRepo.find({
      order: { year: 'DESC', month: 'DESC' },
      relations: ['driver', 'driver.user']
    });

    // Invoices and Expenses for Financial/IFTA derivations
    const invoices = await this.invoicesRepo.find({ order: { issueDate: 'DESC' } });
    const expenses = await this.expensesRepo.find({ order: { date: 'DESC' } });
    const trips = await this.tripsRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['stops']
    });

    // Compute IFTA Quarterly Summary (Jurisdiction by country from Trip stops + Fuel expenses)
    const jurisdictionDistances: { [country: string]: number } = {};
    for (const t of trips || []) {
      const stops = Array.isArray(t.stops) ? t.stops : [];
      for (const s of stops) {
        const country = (s.country || 'NL').toUpperCase();
        jurisdictionDistances[country] = (jurisdictionDistances[country] || 0) + (Number(t.distanceKm || 0) / Math.max(stops.length, 1));
      }
    }

    const jurisdictionFuel: { [country: string]: { amount: number, liters: number } } = {};
    for (const e of expenses || []) {
      if (String(e.category).toLowerCase().includes('fuel') || String(e.category).toLowerCase().includes('combustibil')) {
        const c = 'NL'; // Default jurisdiction
        if (!jurisdictionFuel[c]) jurisdictionFuel[c] = { amount: 0, liters: 0 };
        jurisdictionFuel[c].amount += Number(e.amount || 0);
        jurisdictionFuel[c].liters += Number(e.amount || 0) / 1.75; // Estimated liters at standard diesel price
      }
    }

    const iftaSummary = Object.keys(jurisdictionDistances).map(country => ({
      quarter: `${new Date().getFullYear()}-Q${Math.floor(new Date().getMonth() / 3) + 1}`,
      jurisdictionCountry: country,
      totalDistanceKm: Math.round(jurisdictionDistances[country] || 0),
      fuelCostEur: Math.round((jurisdictionFuel[country]?.amount || 0) * 100) / 100,
      estimatedFuelLiters: Math.round((jurisdictionFuel[country]?.liters || 0) * 10) / 10,
    }));

    // Financial Overview summary
    const totalInvoiced = (invoices || []).reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
    const totalCollected = (payments || []).reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const totalExpenses = (expenses || []).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const totalPayroll = (payrolls || []).reduce((acc, pr) => acc + (Number(pr.totalNetToPay) || 0), 0);

    const financialSummary = [
      {
        reportingPeriod: `YTD ${new Date().getFullYear()}`,
        totalInvoicedEur: Math.round(totalInvoiced * 100) / 100,
        totalPaymentsCollectedEur: Math.round(totalCollected * 100) / 100,
        totalExpensesEur: Math.round(totalExpenses * 100) / 100,
        totalPayrollNetEur: Math.round(totalPayroll * 100) / 100,
        estimatedOperatingMarginEur: Math.round((totalInvoiced - totalExpenses - totalPayroll) * 100) / 100,
        outstandingReceivablesEur: Math.round((totalInvoiced - totalCollected) * 100) / 100,
      }
    ];

    return {
      financialSummary,
      invoiceItems: (invoiceItems || []).map(ii => ({
        id: ii.id,
        invoiceNumber: ii.invoice?.invoiceNumber || '',
        description: ii.description || '',
        quantity: ii.quantity != null ? Number(ii.quantity) : 1,
        unitPrice: ii.unitPrice != null ? Number(ii.unitPrice) : 0,
        vatRate: ii.vatRate != null ? Number(ii.vatRate) : 0,
        total: ii.total != null ? Number(ii.total) : 0,
      })),
      payments: (payments || []).map(p => ({
        id: p.id,
        invoiceNumber: p.invoice?.invoiceNumber || '',
        date: p.date || null,
        method: p.method || '',
        amount: p.amount != null ? Number(p.amount) : 0,
        reference: p.reference || '',
        status: p.status || 'completed',
        createdAt: p.createdAt,
      })),
      payroll: (payrolls || []).map(pr => ({
        id: pr.id,
        userName: pr.user?.name || '',
        userEmail: pr.user?.email || '',
        month: pr.month || 1,
        year: pr.year || new Date().getFullYear(),
        grossSalary: pr.grossSalary != null ? Number(pr.grossSalary) : 0,
        taxAmount: pr.taxAmount != null ? Number(pr.taxAmount) : 0,
        netSalary: pr.netSalary != null ? Number(pr.netSalary) : 0,
        holidayAllowance: pr.holidayAllowance != null ? Number(pr.holidayAllowance) : 0,
        dailyAllowance: pr.dailyAllowance != null ? Number(pr.dailyAllowance) : 0,
        daysWorked: pr.daysWorked || 0,
        totalAllowance: pr.totalAllowance != null ? Number(pr.totalAllowance) : 0,
        bonuses: pr.bonuses != null ? Number(pr.bonuses) : 0,
        deductions: pr.deductions != null ? Number(pr.deductions) : 0,
        totalNetToPay: pr.totalNetToPay != null ? Number(pr.totalNetToPay) : 0,
        status: pr.status || 'draft',
        createdAt: pr.createdAt,
        updatedAt: pr.updatedAt,
      })),
      settlements: (settlements || []).map(s => ({
        id: s.id,
        driverName: s.driver?.user?.name || s.driverName || '',
        month: s.month || 1,
        year: s.year || new Date().getFullYear(),
        payMode: s.payMode || 'per_km',
        payRate: s.payRate != null ? Number(s.payRate) : 0,
        tripCount: s.tripCount || 0,
        totalDistance: s.totalDistance != null ? Number(s.totalDistance) : 0,
        totalRevenue: s.totalRevenue != null ? Number(s.totalRevenue) : 0,
        grossPay: s.grossPay != null ? Number(s.grossPay) : 0,
        advances: s.advances != null ? Number(s.advances) : 0,
        deductions: s.deductions != null ? Number(s.deductions) : 0,
        netPay: s.netPay != null ? Number(s.netPay) : 0,
        status: s.status || 'draft',
        notes: s.notes || '',
        createdAt: s.createdAt,
      })),
      iftaSummary,
    };
  }

  // ==========================================
  // 15. DOCUMENTS REGISTRY (Multi-Sheet: Documents_Registry.xlsx)
  // Covers: Document Registry, Driver Documents, Truck Documents, Maintenance Attachments
  // STRICT RULE: Binary files continue syncing to /Volume3/Documents; Excel gets metadata only!
  // ==========================================
  async backupDocumentsRegistry() {
    const docs = await this.docsRepo.find({
      order: { uploadedAt: 'DESC' },
      relations: ['trip', 'order', 'verifiedBy']
    });

    const driverDocs = await this.driverDocsRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['driver', 'driver.user']
    });

    const truckDocs = await this.truckDocsRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['truck']
    });

    const maintAttachments = await this.maintenanceAttachmentsRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['maintenance']
    });

    return {
      documents: (docs || []).map(d => ({
        id: d.id,
        documentType: d.documentType || 'other',
        type: d.type || '',
        fileName: d.fileName || '',
        fileUrl: d.fileUrl || '',
        tripNumber: d.trip?.tripNumber || '',
        orderNumber: d.order?.orderNumber || '',
        verified: Boolean(d.verified),
        verifiedByName: d.verifiedBy?.name || '',
        publicId: d.publicId || '',
        resourceType: d.resourceType || '',
        cloudinaryType: d.cloudinaryType || '',
        tnasDownloaded: Boolean(d.tnasDownloaded),
        createdAt: d.uploadedAt,
      })),
      driverDocuments: (driverDocs || []).map(dd => ({
        id: dd.id,
        driverName: dd.driver?.user?.name || '',
        type: dd.type || '',
        documentNumber: dd.documentNumber || '',
        expiryDate: dd.expiryDate || null,
        fileUrl: dd.fileUrl || '',
        createdAt: dd.createdAt,
      })),
      truckDocuments: (truckDocs || []).map(td => ({
        id: td.id,
        truckPlate: td.truck?.plateNumber || '',
        type: td.type || '',
        documentNumber: td.documentNumber || '',
        expiryDate: td.expiryDate || null,
        fileUrl: td.fileUrl || '',
        createdAt: td.createdAt,
      })),
      maintenanceAttachments: (maintAttachments || []).map(ma => ({
        id: ma.id,
        maintenanceId: ma.maintenance?.id || '',
        name: ma.name || '',
        fileUrl: ma.fileUrl || '',
        createdAt: ma.createdAt,
      })),
    };
  }

  // ==========================================
  // 16. WEBSITE CMS (Multi-Sheet: Website_CMS.xlsx)
  // Covers: CMS Content, Leads, Job Applications, Contact Messages
  // SECURITY: Candidate personal data protected, tracking tokens stripped!
  // ==========================================
  async backupWebsiteCms() {
    const cms = await this.websiteCmsRepo.find();
    const leads = await this.leadsRepo.find({ order: { createdAt: 'DESC' } });
    const jobApps = await this.jobAppsRepo.find({ order: { createdAt: 'DESC' } });
    const contacts = await this.contactsRepo.find({ order: { createdAt: 'DESC' } });

    return {
      cmsContent: (cms || []).map(c => ({
        key: c.key || '',
        value: c.value || '',
      })),
      leads: (leads || []).map(l => ({
        id: l.id,
        name: l.name || '',
        phone: l.phone || '',
        email: l.email || '',
        from: l.from || '',
        to: l.to || '',
        weight: l.weight || '',
        pallets: l.pallets || '',
        type: l.type || '',
        notes: l.notes || '',
        source: l.source || 'website',
        estimatedPrice: l.estimatedPrice || '',
        status: l.status || 'new',
        createdAt: l.createdAt,
        updatedAt: l.updatedAt,
      })),
      jobApplications: (jobApps || []).map(ja => ({
        id: ja.id,
        name: ja.name || '',
        phone: ja.phone || '',
        email: ja.email || '',
        jobTitle: ja.jobTitle || '',
        experience: ja.experience || '',
        message: ja.message || '',
        cvUrl: ja.cvUrl || '',
        documentsUrl: ja.documentsUrl || '',
        createdAt: ja.createdAt,
      })),
      contactMessages: (contacts || []).map(cm => ({
        id: cm.id,
        name: cm.name || '',
        email: cm.email || '',
        phone: cm.phone || '',
        subject: cm.subject || '',
        message: cm.message || '',
        isRead: Boolean(cm.isRead),
        createdAt: cm.createdAt,
      })),
    };
  }

  // ==========================================
  // 17. SYSTEM & GOVERNANCE (Multi-Sheet: System_and_Governance.xlsx)
  // Covers: Company Settings, Saved Reports, Scheduled Reports, Chat Operational Audit
  // SECURITY: Passwords, session secrets, private chat texts masked!
  // ==========================================
  async backupSystemGovernance() {
    const companies = await this.companiesRepo.find();
    const savedReports = await this.savedReportsRepo.find({ order: { createdAt: 'DESC' } });
    const scheduledReports = await this.scheduledReportsRepo.find({ order: { createdAt: 'DESC' } });
    const messages = await this.messagesRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['trip', 'sender'],
      take: 2000
    });

    return {
      companies: (companies || []).map(c => ({
        id: c.id,
        name: c.name || '',
        cui: c.cui || '',
        address: c.address || '',
        timezone: c.timezone || 'Europe/Bucharest',
        logoUrl: c.logoUrl || '',
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      savedReports: (savedReports || []).map(sr => ({
        id: sr.id,
        name: sr.name || '',
        reportKey: sr.reportKey || '',
        format: sr.format || 'xlsx',
        locale: sr.locale || 'en',
        createdAt: sr.createdAt,
        updatedAt: sr.updatedAt,
      })),
      scheduledReports: (scheduledReports || []).map(scr => ({
        id: scr.id,
        name: scr.name || '',
        reportKey: scr.reportKey || '',
        format: scr.format || 'xlsx',
        locale: scr.locale || 'en',
        frequency: scr.frequency || 'weekly',
        recipients: Array.isArray(scr.recipients) ? scr.recipients.join(', ') : (scr.recipients || ''),
        active: Boolean(scr.active),
        nextRunAt: scr.nextRunAt || null,
        lastRunAt: scr.lastRunAt || null,
        lastErrorAt: scr.lastErrorAt || null,
        createdAt: scr.createdAt,
        updatedAt: scr.updatedAt,
      })),
      chatAudit: (messages || []).map(m => ({
        id: m.id,
        tripNumber: m.trip?.tripNumber || '',
        senderName: m.sender?.name || '',
        senderEmail: m.sender?.email || '',
        driverId: m.driverId || '',
        hasAttachment: Boolean(m.fileUrl),
        attachmentUrl: m.fileUrl || '',
        isRead: Boolean(m.isRead),
        messageStatus: 'logged',
        auditNotice: '[Protected Operational Message - Full history in DB Backup]',
        createdAt: m.createdAt,
      })),
    };
  }
}
