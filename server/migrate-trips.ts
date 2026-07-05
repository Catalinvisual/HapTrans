import * as dotenv from 'dotenv';
dotenv.config();
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Trip, TripStatus } from './src/trips/trip.entity';
import { Order, OrderStatus } from './src/orders/order.entity';
import { Stop, StopStatus } from './src/trips/stop.entity';
import { StopTask, TaskType, TaskStatus } from './src/trips/stop-task.entity';
import { Document } from './src/documents/document.entity';
import { Repository } from 'typeorm';

async function bootstrap() {
  console.log('Initializing application context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const tripRepo = app.get<Repository<Trip>>(getRepositoryToken(Trip));
  const orderRepo = app.get<Repository<Order>>(getRepositoryToken(Order));
  const stopRepo = app.get<Repository<Stop>>(getRepositoryToken(Stop));
  const stopTaskRepo = app.get<Repository<StopTask>>(getRepositoryToken(StopTask));
  const docRepo = app.get<Repository<Document>>(getRepositoryToken(Document));

  console.log('Fetching all trips...');
  const trips = await tripRepo.find({ relations: ['client', 'documents'] });
  console.log(`Found ${trips.length} trips to migrate.`);

  for (const trip of trips) {
    try {
      // Create an Order
      const order = new Order();
      order.client = trip.client;
      order.trip = trip;
      
      // Determine Order Status from Trip Status
      if (trip.status === TripStatus.COMPLETED) order.status = OrderStatus.DELIVERED;
      else if (trip.status === 'in_progress' as any || trip.status === TripStatus.ACTIVE) order.status = OrderStatus.PICKED_UP;
      else order.status = OrderStatus.ASSIGNED;

      // Copy cargo details
      order.pallets = trip.pallets;
      order.palletType = trip.palletType;
      order.weightKg = trip.weightKg;
      order.volumeCbm = trip.volumeCbm;

      // Copy addresses
      order.pickupAddress = trip.pickupAddress || '';
      order.pickupCompanyName = trip.pickupCompanyName;
      order.pickupCountry = trip.pickupCountry;
      order.pickupDateFrom = trip.pickupDate; // mapping exactly
      order.pickupDateTo = trip.pickupDate;
      
      order.dropoffAddress = trip.dropoffAddress || '';
      order.dropoffCompanyName = trip.dropoffCompanyName;
      order.dropoffCountry = trip.dropoffCountry;
      order.dropoffDateFrom = trip.dropoffDate;
      order.dropoffDateTo = trip.dropoffDate;

      order.loadingReference = trip.loadingReference;
      order.unloadingReference = trip.unloadingReference;
      order.cmrReference = trip.cmrReference;
      order.price = trip.price;
      order.notes = trip.notes;

      // Ensure reference number unique handling if needed, or omit.
      // order.referenceNumber = trip.referenceNumber;
      
      const savedOrder = await orderRepo.save(order);
      
      // Create Pickup Stop
      const pickupStop = new Stop();
      pickupStop.trip = trip;
      pickupStop.orderIndex = 1;
      pickupStop.address = trip.pickupAddress || '';
      pickupStop.companyName = trip.pickupCompanyName;
      pickupStop.country = trip.pickupCountry;
      
      if (trip.status === TripStatus.COMPLETED || trip.status === 'in_progress' as any || trip.status === TripStatus.ACTIVE) {
        pickupStop.status = StopStatus.COMPLETED;
      } else {
        pickupStop.status = StopStatus.PENDING;
      }
      
      const savedPickupStop = await stopRepo.save(pickupStop);

      // Create Pickup Task
      const pickupTask = new StopTask();
      pickupTask.stop = savedPickupStop;
      pickupTask.order = savedOrder;
      pickupTask.type = TaskType.PICKUP;
      pickupTask.status = pickupStop.status === StopStatus.COMPLETED ? TaskStatus.COMPLETED : TaskStatus.PENDING;
      pickupTask.pallets = trip.pallets;
      pickupTask.weightKg = trip.weightKg;
      const savedPickupTask = await stopTaskRepo.save(pickupTask);

      // Create Delivery Stop
      const dropoffStop = new Stop();
      dropoffStop.trip = trip;
      dropoffStop.orderIndex = 2;
      dropoffStop.address = trip.dropoffAddress || '';
      dropoffStop.companyName = trip.dropoffCompanyName;
      dropoffStop.country = trip.dropoffCountry;
      dropoffStop.lat = trip.dropoffLat;
      dropoffStop.lng = trip.dropoffLng;

      if (trip.status === TripStatus.COMPLETED) {
        dropoffStop.status = StopStatus.COMPLETED;
      } else {
        dropoffStop.status = StopStatus.PENDING;
      }
      const savedDropoffStop = await stopRepo.save(dropoffStop);

      // Create Delivery Task
      const dropoffTask = new StopTask();
      dropoffTask.stop = savedDropoffStop;
      dropoffTask.order = savedOrder;
      dropoffTask.type = TaskType.DELIVERY;
      dropoffTask.status = dropoffStop.status === StopStatus.COMPLETED ? TaskStatus.COMPLETED : TaskStatus.PENDING;
      dropoffTask.pallets = trip.pallets;
      dropoffTask.weightKg = trip.weightKg;
      const savedDropoffTask = await stopTaskRepo.save(dropoffTask);

      // Reassign Documents
      if (trip.documents && trip.documents.length > 0) {
        for (const doc of trip.documents) {
          if (doc.type === 'CMR') {
             doc.order = savedOrder;
             doc.stopTask = savedDropoffTask;
             await docRepo.save(doc);
          }
        }
      }

      console.log(`Migrated trip ${trip.id}`);
    } catch (err) {
      console.error(`Error migrating trip ${trip.id}:`, err);
    }
  }

  console.log('Migration completed.');
  await app.close();
}

bootstrap();
