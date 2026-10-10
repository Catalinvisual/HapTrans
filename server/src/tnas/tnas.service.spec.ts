import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TnasService } from './tnas.service';

// Entities
import { Document } from '../documents/document.entity';
import { Invoice } from '../invoices/invoice.entity';
import { Expense } from '../expenses/expense.entity';
import { Trip } from '../trips/trip.entity';
import { Truck } from '../trucks/truck.entity';
import { Driver } from '../drivers/driver.entity';
import { Client } from '../clients/client.entity';
import { Maintenance } from '../maintenance/maintenance.entity';
import { User } from '../users/user.entity';

import { Order } from '../orders/order.entity';
import { CargoItem } from '../orders/cargo-item.entity';
import { OrderStop } from '../orders/order-stop.entity';

import { Trailer } from '../trucks/trailer.entity';
import { TelematicsDevice } from '../telematics/entities/telematics-device.entity';
import { Tachograph } from '../telematics/entities/tachograph.entity';
import { DriverTachographCard } from '../telematics/entities/driver-tachograph-card.entity';
import { TachographActivityEvent } from '../telematics/entities/tachograph-activity-event.entity';

import { TruckRoutePlan } from '../planning/truck-route-plan.entity';
import { Shipment } from '../planning/shipment.entity';
import { CrossDockTransfer } from '../planning/cross-dock-transfer.entity';
import { PlanningAction } from '../planning/planning-action.entity';

import { QuoteRequest } from '../quotes/quote.entity';
import { QuoteReply } from '../quotes/quote-reply.entity';
import { ClientRate } from '../clients/client-rate.entity';
import { ClientLocation } from '../clients/client-location.entity';

import { InvoiceItem } from '../invoices/invoice-item.entity';
import { Payment } from '../payments/payment.entity';
import { Payroll } from '../payroll/payroll.entity';
import { Settlement } from '../settlements/settlement.entity';

import { DriverDocument } from '../drivers/driver-document.entity';
import { TruckDocument } from '../trucks/truck-document.entity';
import { MaintenanceAttachment } from '../maintenance/maintenance-attachment.entity';

import { WebsiteCms } from '../website-cms/website-cms.entity';
import { Lead } from '../leads/lead.entity';
import { JobApplication } from '../job-applications/job-application.entity';
import { ContactMessage } from '../contact/contact.entity';

import { Company } from '../companies/company.entity';
import { SavedReport } from '../reports/saved-report.entity';
import { ScheduledReport } from '../reports/scheduled-report.entity';
import { Message } from '../chat/message.entity';

describe('TnasService Backup Methods', () => {
  let service: TnasService;
  let tripsRepo: { find: jest.Mock };
  let usersRepo: { find: jest.Mock };
  let trucksRepo: { find: jest.Mock };
  let driversRepo: { find: jest.Mock };
  let clientsRepo: { find: jest.Mock };
  let maintenanceRepo: { find: jest.Mock };
  let invoicesRepo: { find: jest.Mock };
  let expensesRepo: { find: jest.Mock };
  let docsRepo: { find: jest.Mock };

  let ordersRepo: { find: jest.Mock };
  let cargoItemsRepo: { find: jest.Mock };
  let orderStopsRepo: { find: jest.Mock };

  let trailersRepo: { find: jest.Mock };
  let telematicsDevicesRepo: { find: jest.Mock };
  let tachographsRepo: { find: jest.Mock };
  let driverTachoCardsRepo: { find: jest.Mock };
  let tachoEventsRepo: { find: jest.Mock };

  let routePlansRepo: { find: jest.Mock };
  let shipmentsRepo: { find: jest.Mock };
  let crossDocksRepo: { find: jest.Mock };
  let planningActionsRepo: { find: jest.Mock };

  let quotesRepo: { find: jest.Mock };
  let quoteRepliesRepo: { find: jest.Mock };
  let clientRatesRepo: { find: jest.Mock };
  let clientLocationsRepo: { find: jest.Mock };

  let invoiceItemsRepo: { find: jest.Mock };
  let paymentsRepo: { find: jest.Mock };
  let payrollsRepo: { find: jest.Mock };
  let settlementsRepo: { find: jest.Mock };

  let driverDocsRepo: { find: jest.Mock };
  let truckDocsRepo: { find: jest.Mock };
  let maintenanceAttachmentsRepo: { find: jest.Mock };

  let websiteCmsRepo: { find: jest.Mock };
  let leadsRepo: { find: jest.Mock };
  let jobAppsRepo: { find: jest.Mock };
  let contactsRepo: { find: jest.Mock };

  let companiesRepo: { find: jest.Mock };
  let savedReportsRepo: { find: jest.Mock };
  let scheduledReportsRepo: { find: jest.Mock };
  let messagesRepo: { find: jest.Mock };

  beforeEach(async () => {
    tripsRepo = { find: jest.fn() };
    usersRepo = { find: jest.fn() };
    trucksRepo = { find: jest.fn() };
    driversRepo = { find: jest.fn() };
    clientsRepo = { find: jest.fn() };
    maintenanceRepo = { find: jest.fn() };
    invoicesRepo = { find: jest.fn() };
    expensesRepo = { find: jest.fn() };
    docsRepo = { find: jest.fn() };

    ordersRepo = { find: jest.fn() };
    cargoItemsRepo = { find: jest.fn() };
    orderStopsRepo = { find: jest.fn() };

    trailersRepo = { find: jest.fn() };
    telematicsDevicesRepo = { find: jest.fn() };
    tachographsRepo = { find: jest.fn() };
    driverTachoCardsRepo = { find: jest.fn() };
    tachoEventsRepo = { find: jest.fn() };

    routePlansRepo = { find: jest.fn() };
    shipmentsRepo = { find: jest.fn() };
    crossDocksRepo = { find: jest.fn() };
    planningActionsRepo = { find: jest.fn() };

    quotesRepo = { find: jest.fn() };
    quoteRepliesRepo = { find: jest.fn() };
    clientRatesRepo = { find: jest.fn() };
    clientLocationsRepo = { find: jest.fn() };

    invoiceItemsRepo = { find: jest.fn() };
    paymentsRepo = { find: jest.fn() };
    payrollsRepo = { find: jest.fn() };
    settlementsRepo = { find: jest.fn() };

    driverDocsRepo = { find: jest.fn() };
    truckDocsRepo = { find: jest.fn() };
    maintenanceAttachmentsRepo = { find: jest.fn() };

    websiteCmsRepo = { find: jest.fn() };
    leadsRepo = { find: jest.fn() };
    jobAppsRepo = { find: jest.fn() };
    contactsRepo = { find: jest.fn() };

    companiesRepo = { find: jest.fn() };
    savedReportsRepo = { find: jest.fn() };
    scheduledReportsRepo = { find: jest.fn() };
    messagesRepo = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TnasService,
        { provide: getRepositoryToken(Document), useValue: docsRepo },
        { provide: getRepositoryToken(Invoice), useValue: invoicesRepo },
        { provide: getRepositoryToken(Expense), useValue: expensesRepo },
        { provide: getRepositoryToken(Trip), useValue: tripsRepo },
        { provide: getRepositoryToken(Truck), useValue: trucksRepo },
        { provide: getRepositoryToken(Driver), useValue: driversRepo },
        { provide: getRepositoryToken(Client), useValue: clientsRepo },
        { provide: getRepositoryToken(Maintenance), useValue: maintenanceRepo },
        { provide: getRepositoryToken(User), useValue: usersRepo },

        { provide: getRepositoryToken(Order), useValue: ordersRepo },
        { provide: getRepositoryToken(CargoItem), useValue: cargoItemsRepo },
        { provide: getRepositoryToken(OrderStop), useValue: orderStopsRepo },

        { provide: getRepositoryToken(Trailer), useValue: trailersRepo },
        { provide: getRepositoryToken(TelematicsDevice), useValue: telematicsDevicesRepo },
        { provide: getRepositoryToken(Tachograph), useValue: tachographsRepo },
        { provide: getRepositoryToken(DriverTachographCard), useValue: driverTachoCardsRepo },
        { provide: getRepositoryToken(TachographActivityEvent), useValue: tachoEventsRepo },

        { provide: getRepositoryToken(TruckRoutePlan), useValue: routePlansRepo },
        { provide: getRepositoryToken(Shipment), useValue: shipmentsRepo },
        { provide: getRepositoryToken(CrossDockTransfer), useValue: crossDocksRepo },
        { provide: getRepositoryToken(PlanningAction), useValue: planningActionsRepo },

        { provide: getRepositoryToken(QuoteRequest), useValue: quotesRepo },
        { provide: getRepositoryToken(QuoteReply), useValue: quoteRepliesRepo },
        { provide: getRepositoryToken(ClientRate), useValue: clientRatesRepo },
        { provide: getRepositoryToken(ClientLocation), useValue: clientLocationsRepo },

        { provide: getRepositoryToken(InvoiceItem), useValue: invoiceItemsRepo },
        { provide: getRepositoryToken(Payment), useValue: paymentsRepo },
        { provide: getRepositoryToken(Payroll), useValue: payrollsRepo },
        { provide: getRepositoryToken(Settlement), useValue: settlementsRepo },

        { provide: getRepositoryToken(DriverDocument), useValue: driverDocsRepo },
        { provide: getRepositoryToken(TruckDocument), useValue: truckDocsRepo },
        { provide: getRepositoryToken(MaintenanceAttachment), useValue: maintenanceAttachmentsRepo },

        { provide: getRepositoryToken(WebsiteCms), useValue: websiteCmsRepo },
        { provide: getRepositoryToken(Lead), useValue: leadsRepo },
        { provide: getRepositoryToken(JobApplication), useValue: jobAppsRepo },
        { provide: getRepositoryToken(ContactMessage), useValue: contactsRepo },

        { provide: getRepositoryToken(Company), useValue: companiesRepo },
        { provide: getRepositoryToken(SavedReport), useValue: savedReportsRepo },
        { provide: getRepositoryToken(ScheduledReport), useValue: scheduledReportsRepo },
        { provide: getRepositoryToken(Message), useValue: messagesRepo },
      ],
    }).compile();

    service = module.get<TnasService>(TnasService);
  });

  describe('backupTrips', () => {
    it('should map trips with populated stop and order fields without sensitive leak', async () => {
      const mockTrip = {
        id: 'trip-1',
        tripNumber: 'TR-2026-0001',
        trackingToken: 'SECRET_TRACK_TOKEN_DO_NOT_LEAK',
        status: 'in_progress',
        fleetType: 'own_fleet',
        distanceKm: 450,
        tollCost: 35.5,
        estimatedCost: 300,
        estimatedProfit: 100,
        actualProfit: 95,
        carrierNotes: 'Fragile cargo',
        plannedDeparture: new Date('2026-10-10T08:00:00Z'),
        plannedArrival: new Date('2026-10-10T18:00:00Z'),
        createdAt: new Date('2026-10-09T10:00:00Z'),
        updatedAt: new Date('2026-10-09T12:00:00Z'),
        truck: { plateNumber: 'B100HAP' },
        trailer: { plateNumber: 'B200HAP' },
        driver: {
          phone: '+40712345678',
          user: { name: 'Ion Popescu', email: 'ion@haptrans.ro', password: 'HASHED_PASSWORD_LEAK' },
        },
        dispatcher: {
          name: 'Dispatcher Dan',
          email: 'dan@haptrans.ro',
          password: 'DISPATCHER_HASHED_PASSWORD_LEAK',
          fcmToken: 'SECRET_FCM_TOKEN_DISPATCHER',
        },
        stops: [
          {
            sequence: 1,
            type: 'pickup',
            address: 'Strada Industriei 1',
            companyName: 'Fabrica A',
            country: 'RO',
            city: 'Bucuresti',
            timeWindowMin: new Date('2026-10-10T08:30:00Z'),
          },
          {
            sequence: 2,
            type: 'delivery',
            address: 'Havenlaan 50',
            companyName: 'Magazijn B',
            country: 'NL',
            city: 'Rotterdam',
            timeWindowMax: new Date('2026-10-11T14:00:00Z'),
          },
        ],
        orders: [
          {
            orderNumber: 'ORD-001',
            customerReference: 'CUST-REF-99',
            loadingReference: 'LOAD-REF-1',
            unloadingReference: 'UNLOAD-REF-1',
            client: { name: 'Acme Logistics' },
            cargoItems: [
              { quantity: 10, weightKg: 2500, volumeCbm: 15, unit: 'pallet' },
              { quantity: 5, weightKg: 1000, volumeCbm: 8, unit: 'pallet' },
            ],
          },
        ],
      };

      tripsRepo.find.mockResolvedValue([mockTrip]);

      const result = await service.backupTrips();

      expect(result).toHaveLength(1);
      const row = result[0];

      expect(row.tripNumber).toBe('TR-2026-0001');
      expect(row.referenceNumber).toBe('TR-2026-0001');
      expect(row.truckPlate).toBe('B100HAP');
      expect(row.trailerPlate).toBe('B200HAP');
      expect(row.driverName).toBe('Ion Popescu');
      expect(row.dispatcherName).toBe('Dispatcher Dan');

      expect(row.pickupAddress).toBe('Strada Industriei 1');
      expect(row.pickupCompanyName).toBe('Fabrica A');
      expect(row.dropoffAddress).toBe('Havenlaan 50');
      expect(row.dropoffCompanyName).toBe('Magazijn B');

      expect(row.clientName).toBe('Acme Logistics');
      expect(row.orderNumbers).toBe('ORD-001');
      expect(row.customerReferences).toBe('CUST-REF-99');
      expect(row.pallets).toBe(15);
      expect(row.weightKg).toBe(3500);
      expect(row.volumeCbm).toBe(23);

      expect((row as any).password).toBeUndefined();
      expect((row as any).fcmToken).toBeUndefined();
      expect((row as any).trackingToken).toBeUndefined();
    });

    it('should fallback cleanly if complex relational query fails', async () => {
      tripsRepo.find
        .mockRejectedValueOnce(new Error('Relation join syntax error'))
        .mockResolvedValueOnce([
          {
            id: 'trip-fallback-1',
            tripNumber: 'TR-FALLBACK-01',
            carrierTruckPlate: 'B99HAP',
            carrierDriverName: 'Fallback Driver',
            estimatedCost: 200,
            estimatedProfit: 50,
            status: 'planned',
          },
        ]);

      const result = await service.backupTrips();

      expect(result).toHaveLength(1);
      expect(result[0].tripNumber).toBe('TR-FALLBACK-01');
      expect(result[0].truckPlate).toBe('B99HAP');
      expect(result[0].driverName).toBe('Fallback Driver');
      expect(result[0].price).toBe(250);
    });
  });

  describe('backupUsers Security Whitelist', () => {
    it('should whitelist safe fields and NEVER export password or fcmToken', async () => {
      usersRepo.find.mockResolvedValue([
        {
          id: 'user-1',
          name: 'Admin User',
          email: 'admin@haptrans.ro',
          role: 'admin',
          language: 'ro',
          grossSalary: 5000,
          dailyRate: 150,
          isActive: true,
          password: 'HASHED_PASSWORD_VALUE',
          passwordHash: 'HASHED_PASSWORD_VALUE_2',
          fcmToken: 'SECRET_FCM_TOKEN_xyz',
          refreshToken: 'SECRET_REFRESH_TOKEN',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.backupUsers();

      expect(result).toHaveLength(1);
      const u = result[0];

      expect(u.name).toBe('Admin User');
      expect(u.email).toBe('admin@haptrans.ro');
      expect(u.role).toBe('admin');
      expect(u.grossSalary).toBe(5000);
      expect(u.isActive).toBe(true);

      expect((u as any).password).toBeUndefined();
      expect((u as any).passwordHash).toBeUndefined();
      expect((u as any).fcmToken).toBeUndefined();
      expect((u as any).refreshToken).toBeUndefined();
    });
  });

  describe('backupOrders', () => {
    it('should return orders, cargo items, and stops without leaking trackingToken', async () => {
      ordersRepo.find.mockResolvedValue([
        {
          id: 'ord-1',
          orderNumber: 'ORD-2026-001',
          customerReference: 'CR-100',
          trackingToken: 'SECRET_ORDER_TRACKING_TOKEN',
          status: 'planned',
          price: 1500,
          client: { name: 'Client A' },
          trip: { tripNumber: 'TR-100' },
          createdBy: { name: 'User Admin' },
        }
      ]);
      cargoItemsRepo.find.mockResolvedValue([
        { id: 'cargo-1', order: { orderNumber: 'ORD-2026-001' }, unit: 'pallet', quantity: 4 }
      ]);
      orderStopsRepo.find.mockResolvedValue([
        { id: 'stop-1', order: { orderNumber: 'ORD-2026-001' }, sequence: 1, type: 'pickup', city: 'Bucuresti' }
      ]);

      const res = await service.backupOrders();

      expect(res.orders).toHaveLength(1);
      expect(res.cargoItems).toHaveLength(1);
      expect(res.orderStops).toHaveLength(1);

      expect(res.orders[0].orderNumber).toBe('ORD-2026-001');
      expect(res.orders[0].clientName).toBe('Client A');
      expect((res.orders[0] as any).trackingToken).toBeUndefined();
    });
  });

  describe('backupFleetEquipment Security', () => {
    it('should return fleet equipment and strictly omit credentials_encrypted', async () => {
      trailersRepo.find.mockResolvedValue([{ id: 'tr-1', plateNumber: 'B10TRA' }]);
      telematicsDevicesRepo.find.mockResolvedValue([
        {
          id: 'dev-1',
          provider: 'stoneridge',
          providerDeviceId: 'DEV-001',
          credentialsEncrypted: 'SECRET_API_KEY_OR_PASSWORD_DO_NOT_LEAK',
          truck: { plateNumber: 'B10HAP' }
        }
      ]);
      tachographsRepo.find.mockResolvedValue([{ id: 'tg-1', brand: 'VDO', truck: { plateNumber: 'B10HAP' } }]);
      driverTachoCardsRepo.find.mockResolvedValue([{ id: 'card-1', cardNumber: 'CARD-1234' }]);
      tachoEventsRepo.find.mockResolvedValue([{ id: 'ev-1', activityType: 'driving' }]);

      const res = await service.backupFleetEquipment();

      expect(res.trailers).toHaveLength(1);
      expect(res.telematicsDevices).toHaveLength(1);
      expect(res.tachographs).toHaveLength(1);
      expect(res.driverTachoCards).toHaveLength(1);
      expect(res.tachographActivityEvents).toHaveLength(1);

      const device = res.telematicsDevices[0];
      expect(device.truckPlate).toBe('B10HAP');
      expect(device.provider).toBe('stoneridge');
      expect((device as any).credentialsEncrypted).toBeUndefined();
      expect((device as any).credentials_encrypted).toBeUndefined();
    });
  });

  describe('backupFinancePayroll Security', () => {
    it('should omit pdfData base64 and banking secrets in payroll', async () => {
      invoiceItemsRepo.find.mockResolvedValue([{ id: 'item-1', total: 100 }]);
      paymentsRepo.find.mockResolvedValue([{ id: 'pay-1', amount: 100 }]);
      payrollsRepo.find.mockResolvedValue([
        {
          id: 'pr-1',
          month: 10,
          year: 2026,
          grossSalary: 4000,
          netSalary: 2500,
          totalNetToPay: 3000,
          pdfData: 'BASE64_VERY_LARGE_PDF_BINARY_STRING_LEAK',
          user: { name: 'Driver Dan', email: 'dan@haptrans.ro' }
        }
      ]);
      settlementsRepo.find.mockResolvedValue([{ id: 'st-1', netPay: 2000 }]);
      invoicesRepo.find.mockResolvedValue([{ amount: 5000 }]);
      expensesRepo.find.mockResolvedValue([{ amount: 1000, category: 'fuel' }]);
      tripsRepo.find.mockResolvedValue([{ distanceKm: 500, stops: [{ country: 'NL' }] }]);

      const res = await service.backupFinancePayroll();

      expect(res.payroll).toHaveLength(1);
      const pr = res.payroll[0];
      expect(pr.userName).toBe('Driver Dan');
      expect(pr.grossSalary).toBe(4000);
      expect((pr as any).pdfData).toBeUndefined();
      expect((pr as any).bsn).toBeUndefined();

      expect(res.financialSummary).toHaveLength(1);
      expect(res.iftaSummary).toBeDefined();
    });
  });

  describe('backupWebsiteCms and SystemGovernance', () => {
    it('should sanitize leads trackingToken and mask private chat messages', async () => {
      websiteCmsRepo.find.mockResolvedValue([{ key: 'hero_title', value: 'HapTrans' }]);
      leadsRepo.find.mockResolvedValue([
        { id: 'lead-1', name: 'Potential Client', trackingToken: 'SECRET_LEAD_TRACKING_TOKEN' }
      ]);
      jobAppsRepo.find.mockResolvedValue([{ id: 'app-1', name: 'John Candidate' }]);
      contactsRepo.find.mockResolvedValue([{ id: 'c-1', name: 'Inquiry' }]);

      companiesRepo.find.mockResolvedValue([{ id: 'comp-1', name: 'HapTrans BV' }]);
      savedReportsRepo.find.mockResolvedValue([{ id: 'sr-1', name: 'Profitability' }]);
      scheduledReportsRepo.find.mockResolvedValue([{ id: 'scr-1', name: 'Weekly Invoices' }]);
      messagesRepo.find.mockResolvedValue([
        {
          id: 'msg-1',
          content: 'Confidential private message text body',
          trip: { tripNumber: 'TR-100' },
          sender: { name: 'Dispatcher Dan' },
        }
      ]);

      const cmsRes = await service.backupWebsiteCms();
      expect(cmsRes.leads).toHaveLength(1);
      expect((cmsRes.leads[0] as any).trackingToken).toBeUndefined();

      const govRes = await service.backupSystemGovernance();
      expect(govRes.chatAudit).toHaveLength(1);
      const audit = govRes.chatAudit[0];
      expect(audit.tripNumber).toBe('TR-100');
      expect((audit as any).content).toBeUndefined();
      expect(audit.auditNotice).toContain('Protected');
    });
  });

  describe('backupPlanning Resilience & Fallback (HTTP 500 Fix)', () => {
    it('should successfully return planning data when tables and relations are healthy', async () => {
      routePlansRepo.find.mockResolvedValue([
        {
          id: 'plan-1',
          planningDate: '2026-10-10',
          version: 1,
          isCurrent: true,
          isOptimized: true,
          feasibilityStatus: 'feasible',
          truck: { plateNumber: 'B10HAP' },
          driver: { user: { name: 'Dan Driver' } },
          trip: { tripNumber: 'TR-100' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      shipmentsRepo.find.mockResolvedValue([
        {
          id: 'ship-1',
          orderId: 'ord-1',
          reference: 'SHIP-REF-01',
          status: 'planned',
          priority: 1,
          pickupCity: 'Bucuresti',
          pickupCountry: 'RO',
          deliveryCity: 'Rotterdam',
          deliveryCountry: 'NL',
          weightKg: 12000,
          volumeCbm: 33,
          pallets: 20,
          client: { name: 'Transport SRL' },
        },
      ]);
      ordersRepo.find.mockResolvedValue([
        {
          id: 'ord-1',
          orderNumber: 'ORD-2026-0099',
        },
      ]);
      crossDocksRepo.find.mockResolvedValue([
        {
          id: 'cd-1',
          orderId: 'ord-1',
          facilityName: 'CrossDock Hub Arad',
          status: 'planned',
          pallets: 10,
        },
      ]);
      planningActionsRepo.find.mockResolvedValue([
        {
          id: 'act-1',
          action: 'optimize_route',
          truckId: 'trk-1',
          routePlanId: 'plan-1',
          user: { name: 'Planner Paul' },
        },
      ]);

      const res = await service.backupPlanning();

      expect(res.routePlans).toHaveLength(1);
      expect(res.routePlans[0].truckPlate).toBe('B10HAP');
      expect(res.routePlans[0].driverName).toBe('Dan Driver');

      expect(res.shipments).toHaveLength(1);
      expect(res.shipments[0].orderNumber).toBe('ORD-2026-0099');
      expect(res.shipments[0].clientName).toBe('Transport SRL');
      expect(res.shipments[0].cargoWeightKg).toBe(12000);

      expect(res.crossDockTransfers).toHaveLength(1);
      expect(res.crossDockTransfers[0].facilityName).toBe('CrossDock Hub Arad');

      expect(res.planningActions).toHaveLength(1);
      expect(res.planningActions[0].userName).toBe('Planner Paul');
    });

    it('should reproduce error condition (join failure or missing table) and fall back gracefully without throwing 500', async () => {
      // Simulate relational join failure on routePlansRepo
      routePlansRepo.find
        .mockRejectedValueOnce(new Error('Relation driver.user does not exist or has column mismatch'))
        .mockRejectedValueOnce(new Error('Relation truck/driver/trip failure'))
        .mockResolvedValueOnce([
          {
            id: 'plan-fallback',
            planningDate: '2026-10-10',
            version: 1,
            isCurrent: true,
            isOptimized: false,
            feasibilityStatus: 'feasible',
          },
        ]);

      // Simulate OneToOne relation crash on shipmentsRepo
      shipmentsRepo.find
        .mockRejectedValueOnce(new Error('QueryFailedError: operator does not exist: uuid = character varying'))
        .mockResolvedValueOnce([
          {
            id: 'ship-fallback',
            orderId: 'ord-unknown',
            reference: 'REF-FALLBACK',
            status: 'planned',
          },
        ]);

      // Simulate missing table on crossDocksRepo (relation "cross_dock_transfers" does not exist)
      crossDocksRepo.find.mockRejectedValue(new Error('QueryFailedError: relation "cross_dock_transfers" does not exist'));

      // Simulate failure on planningActionsRepo with successful un-joined fallback
      planningActionsRepo.find
        .mockRejectedValueOnce(new Error('Relation user not found'))
        .mockResolvedValueOnce([
          {
            id: 'act-fallback',
            action: 'manual_assign',
            truckId: 'trk-1',
          },
        ]);

      // Execution MUST NOT throw an error (which would cause HTTP 500 in NestJS)
      const res = await service.backupPlanning();

      expect(res).toBeDefined();
      expect(res.routePlans).toHaveLength(1);
      expect(res.routePlans[0].id).toBe('plan-fallback');

      expect(res.shipments).toHaveLength(1);
      expect(res.shipments[0].orderNumber).toBe('REF-FALLBACK');

      // Missing cross_dock_transfers table defaults to empty array
      expect(res.crossDockTransfers).toEqual([]);

      expect(res.planningActions).toHaveLength(1);
      expect(res.planningActions[0].action).toBe('manual_assign');
    });
  });
});
