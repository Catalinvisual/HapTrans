import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Trip, TripStatus } from './trip.entity';
import { TripCost } from './trip-cost.entity';
import { FirebaseService } from '../firebase/firebase.service';
import { ChatGateway } from '../chat/chat.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { InvoicesService } from '../invoices/invoices.service';

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(Trip) private repo: Repository<Trip>,
    @InjectRepository(TripCost) private costsRepo: Repository<TripCost>,
    private firebaseService: FirebaseService,
    @Inject(forwardRef(() => ChatGateway)) private chatGateway: ChatGateway,
    private notificationsService: NotificationsService,
    private invoicesService: InvoicesService,
  ) {}

  findAll() {
    return this.repo.find({ relations: ['client', 'truck', 'driver', 'driver.user', 'costs', 'documents', 'invoices'] });
  }

  findOne(id: string) {
    return this.repo.findOne({ where: { id }, relations: ['client', 'truck', 'driver', 'driver.user', 'costs', 'documents', 'invoices', 'messages'] });
  }

  async create(dto: any) {
    const trip = this.repo.create({
      client: { id: dto.clientId },
      truck: { id: dto.truckId },
      driver: { id: dto.driverId },
      pickupAddress: dto.pickupAddress,
      dropoffAddress: dto.dropoffAddress,
      pickupDate: dto.pickupDate,
      dropoffDate: dto.dropoffDate,
      price: dto.price,
      estimatedCost: dto.estimatedCost,
      realCost: dto.realCost,
      distanceKm: dto.distanceKm,
      notes: dto.notes,
      pickupTime: dto.pickupTime,
      dropoffTime: dto.dropoffTime,
      pallets: dto.pallets,
      palletType: dto.palletType,
      weightKg: dto.weightKg,
      volumeCbm: dto.volumeCbm,
      loadingReference: dto.loadingReference,
      unloadingReference: dto.unloadingReference,
      status: TripStatus.PENDING,
    });
    const saved = await this.repo.save(trip);
    
    // Fetch full trip with driver.user to get FCM token
    const fullTrip = await this.findOne(saved.id);
    if (fullTrip && fullTrip.driver && fullTrip.driver.user && fullTrip.driver.user.fcmToken) {
      await this.firebaseService.sendPushNotification(
        fullTrip.driver.user.fcmToken,
        'Cursă nouă adăugată',
        `Ați primit o cursă nouă: ${fullTrip.pickupAddress} -> ${fullTrip.dropoffAddress}`,
        { type: 'trip', tripId: fullTrip.id }
      );
    }
    
    return saved;
  }

  async update(id: string, dto: any, user?: any) {
    const updateData: any = {};
    if (dto.clientId !== undefined) updateData.client = { id: dto.clientId };
    if (dto.truckId !== undefined) updateData.truck = { id: dto.truckId };
    if (dto.driverId !== undefined) updateData.driver = { id: dto.driverId };
    if (dto.pickupAddress !== undefined) updateData.pickupAddress = dto.pickupAddress;
    if (dto.dropoffAddress !== undefined) updateData.dropoffAddress = dto.dropoffAddress;
    if (dto.pickupDate !== undefined) updateData.pickupDate = dto.pickupDate;
    if (dto.dropoffDate !== undefined) updateData.dropoffDate = dto.dropoffDate;
    if (dto.price !== undefined) updateData.price = dto.price;
    if (dto.estimatedCost !== undefined) updateData.estimatedCost = dto.estimatedCost;
    if (dto.distanceKm !== undefined) updateData.distanceKm = dto.distanceKm;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.pickupTime !== undefined) updateData.pickupTime = dto.pickupTime;
    if (dto.dropoffTime !== undefined) updateData.dropoffTime = dto.dropoffTime;
    if (dto.pallets !== undefined) updateData.pallets = dto.pallets;
    if (dto.palletType !== undefined) updateData.palletType = dto.palletType;
    if (dto.weightKg !== undefined) updateData.weightKg = dto.weightKg;
    if (dto.volumeCbm !== undefined) updateData.volumeCbm = dto.volumeCbm;
    if (dto.loadingReference !== undefined) updateData.loadingReference = dto.loadingReference;
    if (dto.unloadingReference !== undefined) updateData.unloadingReference = dto.unloadingReference;
    if (dto.realCost !== undefined) updateData.realCost = dto.realCost;

    await this.repo.update(id, updateData);
    const updatedTrip = await this.findOne(id);

    // Auto-generate invoice if trip completed
    if (dto.status === TripStatus.COMPLETED && updatedTrip?.client) {
      if (!updatedTrip.invoices || updatedTrip.invoices.length === 0) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30); // Net 30 default
        await this.invoicesService.create({
          clientId: updatedTrip.client.id,
          tripId: updatedTrip.id,
          amount: updatedTrip.price || 0,
          status: 'draft',
          issueDate: new Date(),
          dueDate: dueDate,
        });
        
        // Notify dispatch
        await this.notificationsService.create({
          type: 'invoice',
          title: 'Factură generată automat',
          message: `Factură draft generată pentru cursa ${updatedTrip.pickupAddress.split(',')[0]} -> ${updatedTrip.dropoffAddress.split(',')[0]}`,
          relatedId: updatedTrip.id,
        });
      }

      // Truck maintenance check (Alert every 50,000 km)
      if (updatedTrip.truck) {
         const allTruckTrips = await this.repo.find({ where: { truck: { id: updatedTrip.truck.id }, status: TripStatus.COMPLETED } });
         const totalKm = allTruckTrips.reduce((sum, t) => sum + (Number(t.distanceKm) || 0), 0);
         const maintenanceThreshold = 50000;
         
         const prevTotalKm = totalKm - (Number(updatedTrip.distanceKm) || 0);
         if (Math.floor(totalKm / maintenanceThreshold) > Math.floor(prevTotalKm / maintenanceThreshold)) {
            await this.notificationsService.create({
              type: 'system',
              title: '🔧 Alertă Mentenanță Camion',
              message: `Camionul ${updatedTrip.truck.plateNumber || 'ID: ' + updatedTrip.truck.id} a depășit pragul de ${Math.floor(totalKm / maintenanceThreshold) * maintenanceThreshold} km și necesită revizie / schimb de ulei!`,
              relatedId: updatedTrip.truck.id,
            });
         }
      }
    }
    
    const isDriver = user?.role === 'driver';

    if (updatedTrip && updatedTrip.driver && updatedTrip.driver.user) {
      if (isDriver) {
        // Driver updated status -> Only create a dashboard notification for SaaS, do NOT send push to driver
        if (dto.status !== undefined) {
          await this.notificationsService.create({
            type: 'trip',
            title: 'notif_trip_title',
            message: `${id}|||${dto.status}|||${updatedTrip.pickupAddress}|||${updatedTrip.dropoffAddress}`,
            relatedId: id,
          });
        }
      } else {
        // Admin/Dispatcher updated -> Send push notification to driver, do NOT create dashboard notification
        if (updatedTrip.driver.user.fcmToken) {
          let title = 'Cursă modificată';
          let body = `Cursa ${updatedTrip.pickupAddress} -> ${updatedTrip.dropoffAddress} a fost modificată.`;
          
          if (dto.status !== undefined) {
            title = 'Status cursă modificat';
            body = `Cursa ${updatedTrip.pickupAddress} -> ${updatedTrip.dropoffAddress} este acum: ${dto.status}.`;
            if (dto.status === 'cancelled') {
              title = 'Cursă anulată';
              body = `Cursa ${updatedTrip.pickupAddress} -> ${updatedTrip.dropoffAddress} a fost anulată!`;
            }
          }
          
          await this.firebaseService.sendPushNotification(
            updatedTrip.driver.user.fcmToken,
            title,
            body,
            { type: 'trip', tripId: updatedTrip.id }
          );
        }
      }
    }
    
    // Broadcast via Socket.IO so mobile app catches it even in background
    try {
      this.chatGateway.broadcastTripUpdate(
        id,
        updatedTrip?.status ?? dto.status ?? '',
        updatedTrip?.driver?.user?.id,
        isDriver
      );
    } catch (e) { /* gateway might not be ready */ }
    
    return updatedTrip;
  }

  async remove(id: string) { 
    const trip = await this.findOne(id);
    if (trip && trip.driver && trip.driver.user && trip.driver.user.fcmToken) {
      await this.firebaseService.sendPushNotification(
        trip.driver.user.fcmToken,
        'Cursă ștearsă',
        `Cursa ${trip.pickupAddress} -> ${trip.dropoffAddress} a fost ștearsă din sistem!`,
        { type: 'trip', tripId: id }
      );
    }
    return this.repo.delete(id); 
  }

  addCost(tripId: string, dto: Partial<TripCost>) {
    const cost = this.costsRepo.create({ ...dto, trip: { id: tripId } as any });
    return this.costsRepo.save(cost);
  }

  async getStats(month?: number, year?: number) {
    const now = new Date();
    const m = month ?? now.getMonth() + 1;
    const y = year ?? now.getFullYear();
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);
    const trips = await this.repo.find({ where: { pickupDate: Between(start, end) }, relations: ['costs'] });
    const totalRevenue = trips.reduce((s, t) => s + Number(t.price || 0), 0);
    const totalCost = trips.reduce((s, t) => {
      const addedCosts = t.costs?.reduce((sc, c) => sc + Number(c.amount), 0) || 0;
      return s + (addedCosts > 0 ? addedCosts : (Number(t.realCost) || Number(t.estimatedCost) || 0));
    }, 0);
    const profit = totalRevenue - totalCost;
    const totalKm = trips.reduce((s, t) => s + Number(t.distanceKm || 0), 0);
    const costPerKm = totalKm > 0 ? totalCost / totalKm : 0;
    const active = await this.repo.count({ 
      where: { status: In([TripStatus.IN_PROGRESS, TripStatus.PENDING, TripStatus.CONFIRMED]) } 
    });
    return { totalRevenue, totalCost, profit, totalKm, costPerKm, active, tripsCount: trips.length };
  }

  async getMonthlyProfits() {
    const results = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const stats = await this.getStats(d.getMonth() + 1, d.getFullYear());
      results.push({ month: d.toLocaleString('ro', { month: 'short' }), ...stats });
    }
    return results;
  }
}
