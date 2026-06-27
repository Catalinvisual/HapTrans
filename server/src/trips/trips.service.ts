import { Injectable, Inject, forwardRef, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, LessThanOrEqual, MoreThanOrEqual, Not } from 'typeorm';
import { Trip, TripStatus } from './trip.entity';
import { Truck } from '../trucks/truck.entity';
import { Expense } from '../expenses/expense.entity';
import { TripCost } from './trip-cost.entity';
import { FirebaseService } from '../firebase/firebase.service';
import { ChatGateway } from '../chat/chat.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { InvoicesService } from '../invoices/invoices.service';
import { ResendService } from '../email/resend.service';
import { RoutingService } from '../routing/routing.service';

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(Trip) private repo: Repository<Trip>,
    @InjectRepository(TripCost) private costsRepo: Repository<TripCost>,
    private firebaseService: FirebaseService,
    @Inject(forwardRef(() => ChatGateway)) private chatGateway: ChatGateway,
    private notificationsService: NotificationsService,
    private invoicesService: InvoicesService,
    private resendService: ResendService,
    private routingService: RoutingService,
  ) {}

  findAll() {
    return this.repo.find({ relations: ['client', 'truck', 'driver', 'driver.user', 'costs', 'documents', 'invoices'] });
  }

  findOne(id: string) {
    return this.repo.findOne({ where: { id }, relations: ['client', 'truck', 'driver', 'driver.user', 'costs', 'documents', 'invoices', 'messages', 'clientRate'] });
  }

  findByTrackingToken(trackingToken: string) {
    return this.repo.findOne({ where: { trackingToken }, relations: ['documents'] });
  }

  async checkConflict(driverId: string, truckId: string, pickupDate: Date | string, dropoffDate: Date | string, excludeTripId?: string) {
    if (!pickupDate || !dropoffDate) return;
    
    const start = new Date(pickupDate);
    const end = new Date(dropoffDate);

    const query = this.repo.createQueryBuilder('trip')
      .where('trip.status NOT IN (:...statuses)', { statuses: [TripStatus.COMPLETED, TripStatus.CANCELLED] })
      .andWhere('trip.pickupDate <= :end', { end })
      .andWhere('trip.dropoffDate >= :start', { start });

    if (excludeTripId) {
      query.andWhere('trip.id != :excludeTripId', { excludeTripId });
    }

    query.andWhere('(trip.driverId = :driverId OR trip.truckId = :truckId)', { driverId, truckId });

    const conflict = await query.getOne();
    if (conflict) {
      throw new ConflictException(`err_trip_overlap:${conflict.referenceNumber || conflict.id}`);
    }
  }

  async findOneByRef(referenceNumber: string): Promise<Trip | null> {
    return this.repo.findOne({
      where: { referenceNumber },
      relations: ['client', 'truck', 'driver', 'costs'],
    });
  }

  async create(dto: any, user?: any) {
    await this.checkConflict(dto.driverId, dto.truckId, dto.pickupDate, dto.dropoffDate);
    
    const year = new Date().getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    const count = await this.repo.count({
      where: {
        createdAt: Between(startOfYear, endOfYear),
      },
    });

    const referenceNumber = `REF-${year}-${String(count + 1).padStart(4, '0')}`;

    // Generate a unique tracking token for this trip
    const crypto = require('crypto');
    const trackingToken = crypto.randomBytes(16).toString('hex');

    let dropoffLat: number | undefined;
    let dropoffLng: number | undefined;
    if (dto.dropoffAddress) {
      try {
        const geo = await this.routingService.geocode(dto.dropoffAddress);
        if (geo) {
          dropoffLat = geo.lat;
          dropoffLng = geo.lng;
        }
      } catch (e) {}
    }

    const tripPayload: any = {
      ...dto,
      referenceNumber,
      trackingToken,
      createdBy: user ? { id: user.id } : null,
      client: { id: dto.clientId },
      truck: { id: dto.truckId },
      driver: { id: dto.driverId },
      clientRate: dto.clientRateId ? { id: dto.clientRateId } : null,
      pickupCompanyName: dto.pickupCompanyName,
      pickupAddress: dto.pickupAddress,
      dropoffCompanyName: dto.dropoffCompanyName,
      dropoffAddress: dto.dropoffAddress,
      pickupDate: dto.pickupDate,
      price: dto.price ?? 0,
      estimatedCost: dto.estimatedCost ?? 0,
      realCost: dto.realCost ?? 0,
      agreedPrice: dto.agreedPrice ?? 0,
      fuelSurchargePercent: dto.fuelSurchargePercent ?? 0,
      tollCosts: dto.tollCosts ?? 0,
      extraCosts: dto.extraCosts ?? 0,
      distanceKm: dto.distanceKm ?? 0,
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
      appointmentFrom: dto.appointmentFrom || dto.dropoffDate,
      appointmentTo: dto.appointmentTo,
      estimatedLoadingMinutes: dto.estimatedLoadingMinutes,
      manualDelayMinutes: dto.manualDelayMinutes || 0,
      dropoffLat,
      dropoffLng,
      etaSource: 'planned',
    };

    const trip: Trip = this.repo.create(tripPayload) as any;
    const saved = await this.repo.save(trip);
    
    // Fetch full trip with driver.user to get FCM token and client to get email
    const fullTrip = await this.findOne(saved.id);
    
    if (fullTrip && fullTrip.driver && fullTrip.driver.user && fullTrip.driver.user.fcmToken) {
      await this.firebaseService.sendPushNotification(
        fullTrip.driver.user.fcmToken,
        'Cursă nouă adăugată',
        `Ați primit o cursă nouă: ${fullTrip.pickupAddress} -> ${fullTrip.dropoffAddress}`,
        { type: 'trip', tripId: fullTrip.id }
      );
    }
    
    if (fullTrip && fullTrip.client && fullTrip.client.contactEmail) {
      await this.resendService.sendTripStatusEmail(fullTrip, trackingToken, dto.company);
    }
    
    return saved;
  }

  async update(id: string, dto: any, user?: any) {
    const existingTrip = await this.findOne(id);
    
    // Check conflicts if dates, truck, or driver are changing
    const pDate = dto.pickupDate !== undefined ? dto.pickupDate : existingTrip?.pickupDate;
    const dDate = dto.dropoffDate !== undefined ? dto.dropoffDate : existingTrip?.dropoffDate;
    const dId = dto.driverId !== undefined ? dto.driverId : existingTrip?.driver?.id;
    const tId = dto.truckId !== undefined ? dto.truckId : existingTrip?.truck?.id;
    const isStatusChangingToCompletedOrCancelled = dto.status === TripStatus.COMPLETED || dto.status === TripStatus.CANCELLED;

    if (!isStatusChangingToCompletedOrCancelled && (dto.pickupDate || dto.dropoffDate || dto.driverId || dto.truckId)) {
      await this.checkConflict(dId, tId, pDate, dDate, id);
    }

    const updateData: any = {};
    if (dto.clientId !== undefined) updateData.client = { id: dto.clientId };
    if (dto.truckId !== undefined) updateData.truck = { id: dto.truckId };
    if (dto.driverId !== undefined) updateData.driver = { id: dto.driverId };
    if (dto.clientRateId !== undefined) updateData.clientRate = dto.clientRateId ? { id: dto.clientRateId } : null;
    if (dto.pickupCompanyName !== undefined) updateData.pickupCompanyName = dto.pickupCompanyName;
    if (dto.pickupAddress !== undefined) updateData.pickupAddress = dto.pickupAddress;
    if (dto.dropoffCompanyName !== undefined) updateData.dropoffCompanyName = dto.dropoffCompanyName;
    if (dto.dropoffAddress !== undefined) {
      updateData.dropoffAddress = dto.dropoffAddress;
      if (dto.dropoffAddress !== existingTrip?.dropoffAddress) {
        try {
          const geo = await this.routingService.geocode(dto.dropoffAddress);
          if (geo) {
            updateData.dropoffLat = geo.lat;
            updateData.dropoffLng = geo.lng;
          }
        } catch (e) {}
      }
    }

    if (dto.pickupDate !== undefined) updateData.pickupDate = dto.pickupDate;
    if (dto.dropoffDate !== undefined) updateData.dropoffDate = dto.dropoffDate;
    if (dto.price !== undefined) updateData.price = dto.price ?? 0;
    if (dto.estimatedCost !== undefined) updateData.estimatedCost = dto.estimatedCost ?? 0;
    if (dto.realCost !== undefined) updateData.realCost = dto.realCost ?? 0;
    if (dto.distanceKm !== undefined) updateData.distanceKm = dto.distanceKm ?? 0;
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
    if (dto.appointmentFrom !== undefined) updateData.appointmentFrom = dto.appointmentFrom;
    if (dto.appointmentTo !== undefined) updateData.appointmentTo = dto.appointmentTo;
    if (dto.estimatedLoadingMinutes !== undefined) updateData.estimatedLoadingMinutes = dto.estimatedLoadingMinutes;
    if (dto.manualDelayMinutes !== undefined) updateData.manualDelayMinutes = dto.manualDelayMinutes;
    if (dto.agreedPrice !== undefined) updateData.agreedPrice = dto.agreedPrice ?? 0;
    if (dto.fuelSurchargePercent !== undefined) updateData.fuelSurchargePercent = dto.fuelSurchargePercent ?? 0;
    if (dto.tollCosts !== undefined) updateData.tollCosts = dto.tollCosts ?? 0;
    if (dto.extraCosts !== undefined) updateData.extraCosts = dto.extraCosts ?? 0;
    
    // Reset delayed risk if manually changed
    if (dto.appointmentTo !== undefined || dto.dropoffDate !== undefined) {
      updateData.delayedRiskEmailSent = false;
    }

    if (dto.realCost !== undefined) updateData.realCost = dto.realCost;

    if (!existingTrip?.trackingToken) {
      const crypto = require('crypto');
      updateData.trackingToken = crypto.randomBytes(16).toString('hex');
    } else if (dto.trackingToken !== undefined) {
      updateData.trackingToken = dto.trackingToken;
    }

    await this.repo.update(id, updateData);
    const updatedTrip = await this.findOne(id);

    // Auto-generate invoice if trip completed
    if (dto.status === TripStatus.COMPLETED && updatedTrip?.client) {
      if (!updatedTrip.invoices || updatedTrip.invoices.length === 0) {
        const basePrice = Number(updatedTrip.agreedPrice) || Number(updatedTrip.price) || 0;
        const fuelPercent = Number(updatedTrip.fuelSurchargePercent) || 0;
        const tollIncluded = updatedTrip.clientRate ? updatedTrip.clientRate.tollIncluded : false;
        const tollCosts = !tollIncluded ? (Number(updatedTrip.tollCosts) || 0) : 0;
        const extraCosts = Number(updatedTrip.extraCosts) || 0;

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30); // Net 30 default
        await this.invoicesService.create({
          clientId: updatedTrip.client.id,
          tripId: updatedTrip.id,
          amount: basePrice,
          fuelSurcharge: fuelPercent,
          tollCosts,
          extraCosts,
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

      // Truck maintenance check using entity fields
      if (updatedTrip.truck && Number(updatedTrip.distanceKm) > 0) {
         const truck = await this.repo.manager.findOne(Truck, { where: { id: updatedTrip.truck.id } });
         if (truck) {
             const newTotalKm = Number(truck.totalMileage || 0) + Number(updatedTrip.distanceKm);
             const threshold = Number(truck.nextMaintenanceMileage || 50000);
             await this.repo.manager.update(Truck, truck.id, { totalMileage: newTotalKm });
             
             if (newTotalKm >= threshold) {
                await this.notificationsService.create({
                  type: 'system',
                  title: '🔧 Alertă Mentenanță Camion',
                  message: `Camionul ${truck.plateNumber} a ajuns la ${newTotalKm} km și a depășit limita de revizie (${threshold} km)!`,
                  relatedId: truck.id,
                });
             }
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
            message: `${updatedTrip.referenceNumber || id}|||${dto.status}|||${updatedTrip.pickupAddress}|||${updatedTrip.dropoffAddress}`,
            relatedId: id,
          });
        }
      } else {
        // Admin/Dispatcher updated -> Send push notification to driver, do NOT create dashboard notification
        if (updatedTrip.driver.user.fcmToken) {
          let title = 'Cursă modificată';
          let body = `Cursa ${updatedTrip.pickupAddress} -> ${updatedTrip.dropoffAddress} a fost modificată.`;
          
          if (dto.driverId !== undefined && existingTrip?.driver?.id !== dto.driverId) {
            title = 'Cursă nouă alocată';
            body = `V-a fost alocată o nouă cursă: ${updatedTrip.pickupAddress} -> ${updatedTrip.dropoffAddress}`;
          } else if (dto.status !== undefined && dto.status !== existingTrip?.status) {
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
    
    if (dto.status !== undefined && dto.status !== existingTrip?.status && updatedTrip?.client?.contactEmail) {
      await this.resendService.sendTripStatusEmail(updatedTrip, updatedTrip.trackingToken, dto.company);
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
    const trips = await this.findAll();
    const filtered = trips.filter(t => {
      if (!month || !year) return true;
      const d = new Date(t.createdAt);
      return d.getMonth() + 1 === Number(month) && d.getFullYear() === Number(year);
    });

    const totalRevenue = filtered.reduce((s, t) => s + (Number(t.agreedPrice) || Number(t.price) || 0), 0);
    const totalCost = filtered.reduce((s, t) => {
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
