import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TnasService } from './tnas.service';
import { Document } from '../documents/document.entity';
import { Invoice } from '../invoices/invoice.entity';
import { Expense } from '../expenses/expense.entity';
import { Trip } from '../trips/trip.entity';
import { Truck } from '../trucks/truck.entity';
import { Driver } from '../drivers/driver.entity';
import { Client } from '../clients/client.entity';
import { Maintenance } from '../maintenance/maintenance.entity';
import { User } from '../users/user.entity';

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

  beforeEach(async () => {
    tripsRepo = { find: jest.fn() };
    usersRepo = { find: jest.fn() };
    trucksRepo = { find: jest.fn() };
    driversRepo = { find: jest.fn() };
    clientsRepo = { find: jest.fn() };
    maintenanceRepo = { find: jest.fn() };
    invoicesRepo = { find: jest.fn() };
    expensesRepo = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TnasService,
        { provide: getRepositoryToken(Document), useValue: {} },
        { provide: getRepositoryToken(Invoice), useValue: invoicesRepo },
        { provide: getRepositoryToken(Expense), useValue: expensesRepo },
        { provide: getRepositoryToken(Trip), useValue: tripsRepo },
        { provide: getRepositoryToken(Truck), useValue: trucksRepo },
        { provide: getRepositoryToken(Driver), useValue: driversRepo },
        { provide: getRepositoryToken(Client), useValue: clientsRepo },
        { provide: getRepositoryToken(Maintenance), useValue: maintenanceRepo },
        { provide: getRepositoryToken(User), useValue: usersRepo },
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
            orderNumber: 'ORD-101',
            customerReference: 'CUST-REF-99',
            loadingReference: 'LOAD-01',
            unloadingReference: 'UNLOAD-01',
            client: { name: 'Client Logistics BV' },
            cargoItems: [
              { quantity: 10, weightKg: 2500, volumeCbm: 15, unit: 'pallet' },
              { quantity: 5, weightKg: 1000, volumeCbm: 8, unit: 'pallet' },
            ],
          },
        ],
      };

      tripsRepo.find.mockResolvedValueOnce([mockTrip]);

      const result = await service.backupTrips();

      expect(result).toHaveLength(1);
      const item = result[0];

      // Verifies schema drift fix: both referenceNumber and tripNumber are populated
      expect(item.referenceNumber).toBe('TR-2026-0001');
      expect(item.tripNumber).toBe('TR-2026-0001');
      expect(item.clientName).toBe('Client Logistics BV');
      expect(item.truckPlate).toBe('B100HAP');
      expect(item.trailerPlate).toBe('B200HAP');
      expect(item.driverName).toBe('Ion Popescu');
      expect(item.dispatcherName).toBe('Dispatcher Dan');

      // Verifies stop extraction
      expect(item.pickupAddress).toBe('Strada Industriei 1');
      expect(item.pickupCompanyName).toBe('Fabrica A');
      expect(item.pickupCountry).toBe('RO');
      expect(item.dropoffAddress).toBe('Havenlaan 50');
      expect(item.dropoffCompanyName).toBe('Magazijn B');
      expect(item.dropoffCountry).toBe('NL');

      // Verifies cargo calculation
      expect(item.pallets).toBe(15);
      expect(item.weightKg).toBe(3500);
      expect(item.volumeCbm).toBe(23);
      expect(item.orderNumbers).toBe('ORD-101');
      expect(item.customerReferences).toBe('CUST-REF-99');

      // Verifies financial calculations
      expect(item.price).toBe(400); // 300 + 100
      expect(item.estimatedCost).toBe(300);
      expect(item.realCost).toBe(35.5);

      // CRITICAL SECURITY ASSERTIONS: Prohibited fields must NEVER exist in exported object
      expect((item as any).password).toBeUndefined();
      expect((item as any).fcmToken).toBeUndefined();
      expect((item as any).trackingToken).toBeUndefined();
      expect((item as any).dispatcher?.password).toBeUndefined();
      expect((item as any).driver?.user?.password).toBeUndefined();
    });

    it('should safely fallback when full relation join fails without throwing HTTP 500', async () => {
      // First call (with relations) throws an error
      tripsRepo.find.mockRejectedValueOnce(new Error('Relation join Cartesian error or timeout'));
      // Fallback call (base entity find) returns bare trips
      tripsRepo.find.mockResolvedValueOnce([
        {
          id: 'fallback-trip-1',
          tripNumber: 'TR-FALLBACK',
          status: 'planned',
          carrierTruckPlate: 'IS01ABC',
          carrierDriverName: 'Driver Backup',
          estimatedCost: 150,
          estimatedProfit: 50,
          createdAt: new Date(),
        },
      ]);

      const result = await service.backupTrips();

      expect(result).toHaveLength(1);
      expect(result[0].tripNumber).toBe('TR-FALLBACK');
      expect(result[0].referenceNumber).toBe('TR-FALLBACK');
      expect(result[0].truckPlate).toBe('IS01ABC');
      expect(result[0].price).toBe(200);
    });

    it('should handle trips with null relations and null stops gracefully', async () => {
      tripsRepo.find.mockResolvedValueOnce([
        {
          id: 'trip-empty',
          tripNumber: 'TR-EMPTY',
          truck: null,
          trailer: null,
          driver: null,
          dispatcher: null,
          stops: null,
          orders: null,
        },
      ]);

      const result = await service.backupTrips();

      expect(result).toHaveLength(1);
      expect(result[0].tripNumber).toBe('TR-EMPTY');
      expect(result[0].clientName).toBe('');
      expect(result[0].truckPlate).toBe('');
      expect(result[0].driverName).toBe('');
      expect(result[0].pickupAddress).toBe('');
      expect(result[0].dropoffAddress).toBe('');
    });
  });

  describe('backupUsers security', () => {
    it('should strictly exclude fcmToken, password, and session credentials', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          name: 'Admin Catalin',
          email: 'catalin@haptrans.ro',
          password: '$2b$10$e8w4G2w.fakeHashedPasswordSecret',
          fcmToken: 'fcm-device-token-secret-123456789',
          role: 'admin',
          language: 'ro',
          grossSalary: 5000,
          dailyRate: 150,
          isActive: true,
          companyLogoUrl: 'https://cloudinary.com/logo.png',
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-02-01'),
        },
      ];

      usersRepo.find.mockResolvedValueOnce(mockUsers);

      const result = await service.backupUsers();

      expect(result).toHaveLength(1);
      const user = result[0];

      // Safe whitelisted fields must be present
      expect(user.id).toBe('user-1');
      expect(user.name).toBe('Admin Catalin');
      expect(user.email).toBe('catalin@haptrans.ro');
      expect(user.role).toBe('admin');
      expect(user.language).toBe('ro');
      expect(user.grossSalary).toBe(5000);
      expect(user.dailyRate).toBe(150);
      expect(user.isActive).toBe(true);

      // STRICT PROHIBITED FIELDS: Must NOT exist anywhere on the exported object
      expect((user as any).password).toBeUndefined();
      expect((user as any).fcmToken).toBeUndefined();
      expect((user as any).companyLogoUrl).toBeUndefined();
      expect(Object.keys(user)).not.toContain('password');
      expect(Object.keys(user)).not.toContain('fcmToken');
    });
  });

  describe('backupTrucks', () => {
    it('should map truck master fields accurately', async () => {
      trucksRepo.find.mockResolvedValueOnce([
        {
          id: 'truck-1',
          plateNumber: 'B99HAP',
          brand: 'Scania',
          model: 'R450',
          year: 2022,
          payloadCapacity: 24000,
          fuelConsumption: 28.5,
          status: 'active',
          currentLat: 44.43,
          currentLng: 26.1,
          totalMileage: 185000,
          nextMaintenanceMileage: 200000,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.backupTrucks();
      expect(result).toHaveLength(1);
      expect(result[0].plateNumber).toBe('B99HAP');
      expect(result[0].brand).toBe('Scania');
      expect(result[0].payloadCapacity).toBe(24000);
    });
  });

  describe('backupDrivers', () => {
    it('should map driver fields without leaking user password', async () => {
      driversRepo.find.mockResolvedValueOnce([
        {
          id: 'driver-1',
          phone: '+40722000000',
          licenseNumber: 'RO12345678',
          status: 'available',
          payMode: 'per_km',
          payRate: 0.15,
          user: { name: 'Mihai Sofer', email: 'mihai@haptrans.ro', password: 'HASHED_SECRET' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.backupDrivers();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Mihai Sofer');
      expect(result[0].email).toBe('mihai@haptrans.ro');
      expect(result[0].licenseNumber).toBe('RO12345678');
      expect((result[0] as any).password).toBeUndefined();
      expect((result[0] as any).user).toBeUndefined();
    });
  });
});
