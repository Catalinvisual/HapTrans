import { Injectable, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like } from 'typeorm';
import * as crypto from 'crypto';
import { Invoice, InvoiceStatus, InvoiceTransportDetails } from './invoice.entity';
import { InvoiceItem } from './invoice-item.entity';
import { Trip } from '../trips/trip.entity';
import { Order } from '../orders/order.entity';
import { v2 as cloudinary } from 'cloudinary';
import { computeAuditChanges } from '../action-logs/diff.util';

async function deleteFromCloudinary(fileUrl: string) {
  if (!fileUrl || !fileUrl.includes('cloudinary.com')) return;
  try {
    const parts = fileUrl.split('/');
    const uploadIndex = parts.findIndex(p => p === 'upload');
    if (uploadIndex === -1) return;
    
    const resourceType = parts[uploadIndex - 1]; 
    let publicIdParts = parts.slice(uploadIndex + 2); 
    let publicIdWithExt = publicIdParts.join('/');
    
    let publicId = publicIdWithExt;
    if (resourceType === 'image' || resourceType === 'video') {
       publicId = publicIdWithExt.replace(/\.[^/.]+$/, "");
    }
    
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (e) {
    console.error('Failed to delete from Cloudinary:', e);
  }
}

import { ActionLogsService } from '../action-logs/action-logs.service';

@Injectable()
export class InvoicesService implements OnModuleInit {
  constructor(
    @InjectRepository(Invoice) private repo: Repository<Invoice>,
    private actionLogs: ActionLogsService,
  ) {}

  private transportDate(value: any): string | null {
    if (!value) return null;
    if (typeof value === 'string') {
      const dateOnly = value.match(/^(\d{4}-\d{2}-\d{2})/);
      if (dateOnly) return dateOnly[1];
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private transportTime(value: any): string | null {
    if (!value) return null;
    if (typeof value === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
      const time = value.match(/(?:T|\s)(\d{2}:\d{2})/);
      if (time) return time[1];
      const timeOnly = value.match(/^(\d{2}:\d{2})/);
      if (timeOnly) return timeOnly[1];
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  private stopAddress(stop: any): string | null {
    if (!stop) return null;
    if (stop.address) return String(stop.address);
    const parts = [stop.city, stop.postalCode, stop.country].filter(Boolean);
    return parts.length ? parts.join(', ') : (stop.companyName || null);
  }

  private buildTransportDetailsFrom(order: any, trip: any): InvoiceTransportDetails | null {
    const orderStops = Array.isArray(order?.stops) ? [...order.stops] : [];
    const tripStops = Array.isArray(trip?.stops) ? [...trip.stops] : [];
    const sortStops = (stops: any[]) => stops.sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0));
    const isPickup = (stop: any) => ['pickup', 'loading', 'warehouse', 'terminal'].includes(String(stop?.type || '').toLowerCase());
    const isDelivery = (stop: any) => ['delivery', 'dropoff', 'unloading'].includes(String(stop?.type || '').toLowerCase());
    const sortedOrderStops = sortStops(orderStops);
    const sortedTripStops = sortStops(tripStops);
    const orderPickup = sortedOrderStops.find(isPickup) || sortedOrderStops[0];
    const orderDelivery = [...sortedOrderStops].reverse().find(isDelivery) || sortedOrderStops[sortedOrderStops.length - 1];
    const tripPickup = sortedTripStops.find(isPickup) || sortedTripStops[0];
    const tripDelivery = [...sortedTripStops].reverse().find(isDelivery) || sortedTripStops[sortedTripStops.length - 1];
    const pickupStop = orderPickup || tripPickup;
    const deliveryStop = orderDelivery || tripDelivery;
    const pickupTripStop = tripPickup;
    const deliveryTripStop = tripDelivery;

    const cargoItems = Array.isArray(order?.cargoItems) && order.cargoItems.length > 0
      ? order.cargoItems
      : Array.isArray(trip?.orders)
        ? trip.orders.flatMap((item: any) => item?.cargoItems || [])
        : [];
    const pallets = cargoItems
      .filter((item: any) => String(item.unit || 'pallet').toLowerCase() === 'pallet')
      .reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0)
      || Number(order?.pallets || order?.totalPallets || 0);
    const weightKg = cargoItems.reduce((sum: number, item: any) => sum + (Number(item.weightKg) || 0), 0);
    const volumeCbm = cargoItems.reduce((sum: number, item: any) => sum + (Number(item.volumeCbm) || 0), 0);
    const cargoDescription = [...new Set(cargoItems
      .map((item: any) => String(item.description || '').trim())
      .filter(Boolean))].join(', ') || null;

    const details: InvoiceTransportDetails = {
      loadingAddress: this.stopAddress(pickupStop),
      unloadingAddress: this.stopAddress(deliveryStop),
      loadingDate: this.transportDate(pickupStop?.dateFrom)
        || this.transportDate(pickupTripStop?.timeWindowMin)
        || this.transportDate(pickupTripStop?.ata)
        || this.transportDate(pickupTripStop?.completedAt),
      loadingTime: this.transportTime(pickupStop?.timeFrom)
        || this.transportTime(pickupTripStop?.timeWindowMin)
        || this.transportTime(pickupTripStop?.ata)
        || this.transportTime(pickupTripStop?.completedAt),
      unloadingDate: this.transportDate(deliveryStop?.dateFrom)
        || this.transportDate(deliveryTripStop?.timeWindowMin)
        || this.transportDate(deliveryTripStop?.ata)
        || this.transportDate(deliveryTripStop?.completedAt),
      unloadingTime: this.transportTime(deliveryStop?.timeFrom)
        || this.transportTime(deliveryTripStop?.timeWindowMin)
        || this.transportTime(deliveryTripStop?.ata)
        || this.transportTime(deliveryTripStop?.completedAt),
      loadingReference: order?.loadingReference || pickupStop?.reference || null,
      unloadingReference: order?.unloadingReference || deliveryStop?.reference || null,
      pallets: pallets || null,
      weightKg: weightKg || null,
      volumeCbm: volumeCbm || null,
      cargoDescription,
      vehicle: [trip?.truck?.plateNumber, trip?.trailer?.plateNumber].filter(Boolean).join(' / ')
        || trip?.carrierTruckPlate || null,
      driver: trip?.driver?.user?.name || trip?.carrierDriverName || null,
    };

    return Object.values(details).some((value) => value !== null && value !== '') ? details : null;
  }

  private async resolveTransportDetails(dto: any): Promise<InvoiceTransportDetails | null> {
    if (dto?.transportDetails && typeof dto.transportDetails === 'object') return dto.transportDetails;

    const orderId = dto?.orderId || (typeof dto?.order === 'object' ? dto.order?.id : null);
    const tripId = dto?.tripId || (typeof dto?.trip === 'object' ? dto.trip?.id : null);
    if (!orderId && !tripId) return null;

    try {
      let order: any = null;
      let trip: any = null;
      if (orderId) {
        order = await this.repo.manager.getRepository(Order).findOne({
          where: { id: orderId },
          relations: ['stops', 'cargoItems', 'trip', 'trip.stops', 'trip.truck', 'trip.trailer', 'trip.driver.user', 'trip.orders', 'trip.orders.cargoItems'],
        });
        trip = order?.trip || null;
      }
      if (!trip && tripId) {
        trip = await this.repo.manager.getRepository(Trip).findOne({
          where: { id: tripId },
          relations: ['stops', 'truck', 'trailer', 'driver.user', 'orders', 'orders.cargoItems'],
        });
      }
      if (!order && trip?.orders?.length === 1) order = trip.orders[0];
      return this.buildTransportDetailsFrom(order, trip);
    } catch (error: any) {
      console.warn('Could not build invoice transport details:', error?.message);
      return null;
    }
  }

  private async buildInvoiceItemsAndTotals(inv: Invoice, dto: any, tripRepo: Repository<Trip>) {
    const amount = dto.amount !== undefined ? Number(dto.amount) : Number(inv.amount || 0);
    const fuelSurcharge = dto.fuelSurcharge !== undefined ? Number(dto.fuelSurcharge) : Number(inv.fuelSurcharge || 0);
    const extraCosts = dto.extraCosts !== undefined ? Number(dto.extraCosts) : Number(inv.extraCosts || 0);
    const tollCosts = dto.tollCosts !== undefined ? Number(dto.tollCosts) : Number(inv.tollCosts || 0);
    const vatPercent = dto.vatPercent !== undefined ? Number(dto.vatPercent) : Number(inv.vatPercent || 19);
    const vatType = dto.vatType !== undefined ? dto.vatType : (inv.vatType || 'NORMAL');

    if (dto.items && Array.isArray(dto.items) && dto.items.length > 0) {
      const items = dto.items.map((it: any) => ({
        description: it.description || 'Service',
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        vatRate: vatType === 'NORMAL' ? vatPercent : 0,
        total: Number(it.total) || ((Number(it.quantity) || 1) * (Number(it.unitPrice) || 0))
      }));
      const subtotal = items.reduce((sum: number, it: any) => sum + it.total, 0);
      let vatAmount = 0;
      if (vatType === 'NORMAL') {
        vatAmount = Number(((subtotal * vatPercent) / 100).toFixed(2));
      }
      const total = subtotal + vatAmount;
      return {
        amount: dto.amount !== undefined ? Number(dto.amount) : subtotal,
        fuelSurcharge,
        extraCosts,
        tollCosts,
        vatPercent,
        vatType,
        subtotal,
        vatAmount,
        total,
        items
      };
    }

    let routeDesc = 'Road freight transport services';
    const tripId = dto.tripId !== undefined ? dto.tripId : (inv.trip ? inv.trip.id : null);
    let tripObj: any = null;
    if (tripId) {
      try {
        const trip = await tripRepo.findOne({ where: { id: tripId }, relations: ['stops'] });
        if (trip) {
          tripObj = trip;
          const pStop = trip.stops?.find((s: any) => s.type === 'pickup') || trip.stops?.[0];
          const dStop = trip.stops?.filter((s: any) => s.type === 'delivery' || s.type === 'dropoff').pop() || trip.stops?.[trip.stops?.length - 1];
          const pCity = pStop?.city || pStop?.address?.split(',')[0];
          const dCity = dStop?.city || dStop?.address?.split(',')[0];
          const tripNum = trip.tripNumber || 'Trip';
          routeDesc = pCity && dCity ? `Cursa ${tripNum}: ${pCity} – ${dCity}` : `Factură pentru cursa ${tripNum}`;
        }
      } catch (e) {
        console.error('Failed to fetch trip for route desc', e);
      }
    }

    let tariffs: any = {
      adrSurchargeFee: 100,
      nightSurchargeFee: 80,
      weekendSurchargeFee: 150,
      holidaySurchargeFee: 200
    };
    try {
      const res = await this.repo.manager.query('SELECT "value" FROM website_cms WHERE "key" = $1', ['tariff_settings']);
      if (res.length > 0 && res[0].value) {
        tariffs = { ...tariffs, ...JSON.parse(res[0].value) };
      }
    } catch (e) {
      console.error('Failed to load tariff settings in invoices service', e);
    }

    const items: any[] = [];
    let subtotal = 0;

    if (amount > 0) {
      items.push({
        description: routeDesc,
        quantity: 1,
        unitPrice: amount,
        vatRate: vatType === 'NORMAL' ? vatPercent : 0,
        total: amount
      });
      subtotal += amount;
    }

    if (fuelSurcharge > 0) {
      const fuelCost = Number(((amount * fuelSurcharge) / 100).toFixed(2));
      items.push({
        description: `Fuel Surcharge (${fuelSurcharge}%)`,
        quantity: 1,
        unitPrice: fuelCost,
        vatRate: vatType === 'NORMAL' ? vatPercent : 0,
        total: fuelCost
      });
      subtotal += fuelCost;
    }

    if (tollCosts > 0) {
      items.push({
        description: `Road tolls / Toll charges`,
        quantity: 1,
        unitPrice: tollCosts,
        vatRate: vatType === 'NORMAL' ? vatPercent : 0,
        total: tollCosts
      });
      subtotal += tollCosts;
    }

    if (extraCosts > 0) {
      items.push({
        description: `Extra charges`,
        quantity: 1,
        unitPrice: extraCosts,
        vatRate: vatType === 'NORMAL' ? vatPercent : 0,
        total: extraCosts
      });
      subtotal += extraCosts;
    }

    let vatAmount = 0;
    if (vatType === 'NORMAL') {
      vatAmount = Number(((subtotal * vatPercent) / 100).toFixed(2));
    }

    const total = subtotal + vatAmount;

    return {
      amount,
      fuelSurcharge,
      extraCosts,
      tollCosts,
      vatPercent,
      vatType,
      subtotal,
      vatAmount,
      total,
      items
    };
  }

  async onModuleInit() {
    try {
      await this.repo.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`).catch(() => {});
      await this.repo.query(`ALTER TABLE IF EXISTS "invoices" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()`).catch(() => {});
      await this.repo.query(`ALTER TABLE IF EXISTS "invoices" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT now()`).catch(() => {});
      await this.repo.query(`ALTER TABLE IF EXISTS "invoices" ALTER COLUMN "createdAt" SET DEFAULT now()`).catch(() => {});
      await this.repo.query(`ALTER TABLE IF EXISTS "invoices" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT now()`).catch(() => {});
      await this.repo.query(`ALTER TABLE IF EXISTS "invoices" ALTER COLUMN "updatedAt" SET DEFAULT now()`).catch(() => {});
      // Additive production safety for automatic order drafts. The migration
      // remains the source of truth; this only repairs pre-migration rows.
      await this.repo.query(`ALTER TABLE IF EXISTS "invoices" ADD COLUMN IF NOT EXISTS "orderId" uuid`).catch(() => {});
      await this.repo.query(`ALTER TABLE IF EXISTS "invoices" ADD COLUMN IF NOT EXISTS "transportDetails" jsonb`).catch(() => {});
      await this.repo.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_invoices_order_unique" ON "invoices" ("orderId") WHERE "orderId" IS NOT NULL`).catch(() => {});
      await this.repo.query(`UPDATE "invoices" SET "id" = gen_random_uuid() WHERE "id" IS NULL`).catch(() => {});
      await this.repo.query(`UPDATE "invoices" SET "createdAt" = now() WHERE "createdAt" IS NULL`).catch(() => {});
      await this.repo.query(`UPDATE "invoices" SET "updatedAt" = now() WHERE "updatedAt" IS NULL`).catch(() => {});
    } catch (e: any) {
      console.warn('Invoices onModuleInit note:', e?.message);
    }
  }

  async findAll() { 
    try {
      return await this.repo.createQueryBuilder('invoice')
        .leftJoinAndSelect('invoice.client', 'client')
        .leftJoinAndSelect('invoice.trip', 'trip')
        .leftJoinAndSelect('invoice.items', 'items')
        .leftJoinAndSelect('invoice.payments', 'payments')
        .orderBy('invoice.createdAt', 'DESC')
        .getMany();
    } catch (err: any) {
      console.error('QueryBuilder failed in InvoicesService.findAll, trying repo.find fallback:', err?.message);
      try {
        return await this.repo.find({
          relations: ['client', 'trip', 'items', 'payments'],
          order: { createdAt: 'DESC' }
        });
      } catch (err2: any) {
        console.error('repo.find with relations failed in findAll, returning base find:', err2?.message);
        return await this.repo.find({ order: { createdAt: 'DESC' } });
      }
    }
  }

  async findOne(id: string) { 
    try {
      return await this.repo.createQueryBuilder('invoice')
        .leftJoinAndSelect('invoice.client', 'client')
        .leftJoinAndSelect('invoice.trip', 'trip')
        .leftJoinAndSelect('invoice.items', 'items')
        .leftJoinAndSelect('invoice.payments', 'payments')
        .where('invoice.id = :id', { id })
        .getOne();
    } catch (err: any) {
      console.error('QueryBuilder failed in InvoicesService.findOne, trying repo.findOne fallback:', err?.message);
      return await this.repo.findOne({ where: { id }, relations: ['client', 'trip', 'items', 'payments'] });
    }
  }

  /** Loads an invoice and repairs its transport snapshot for older drafts. */
  async findOneForPdf(id: string) {
    const invoice = await this.findOne(id);
    if (!invoice) return null;
    if (!invoice.transportDetails) {
      const details = await this.resolveTransportDetails({ orderId: (invoice as any).orderId, tripId: invoice.trip?.id });
      if (details) {
        invoice.transportDetails = details;
        await this.repo.update(invoice.id, { transportDetails: details } as any).catch(() => undefined);
      }
    }
    return invoice;
  }

  async create(dto: any, user?: any) {
    const payload: any = { 
      ...dto, 
    };

    // Guarantee non-null primary key UUID and timestamp
    if (!payload.id || String(payload.id).trim() === '') {
      payload.id = crypto.randomUUID();
    }
    if (!payload.createdAt) {
      payload.createdAt = new Date();
    }
    if (!payload.updatedAt) {
      payload.updatedAt = new Date();
    }

    // Safely associate client relation
    if (dto.clientId && typeof dto.clientId === 'string' && dto.clientId.trim() !== '') {
      payload.client = { id: dto.clientId.trim() };
    } else if (dto.client?.id && typeof dto.client.id === 'string' && dto.client.id.trim() !== '') {
      payload.client = { id: dto.client.id.trim() };
    } else if (typeof dto.client === 'object' && dto.client !== null && dto.client.id) {
      payload.client = { id: dto.client.id };
    } else {
      payload.client = null;
    }
    delete payload.clientId;

    // Safely associate trip relation
    if (dto.tripId && typeof dto.tripId === 'string' && dto.tripId.trim() !== '') {
      payload.trip = { id: dto.tripId.trim() };
    } else if (dto.trip?.id && typeof dto.trip.id === 'string' && dto.trip.id.trim() !== '') {
      payload.trip = { id: dto.trip.id.trim() };
    } else if (typeof dto.trip === 'object' && dto.trip !== null && dto.trip.id) {
      payload.trip = { id: dto.trip.id };
    } else {
      payload.trip = null;
    }
    delete payload.tripId;

    if (!payload.transportDetails) {
      payload.transportDetails = await this.resolveTransportDetails(dto);
    }

    // Clean empty string dates to null for Postgres date columns
    if (payload.issueDate === '' || payload.issueDate === undefined) payload.issueDate = null;
    if (payload.dueDate === '' || payload.dueDate === undefined) payload.dueDate = null;

    // Generate unique invoice number if not provided
    if (!payload.invoiceNumber || String(payload.invoiceNumber).trim() === '') {
      const year = new Date().getFullYear();
      const count = await this.repo.count();
      payload.invoiceNumber = `INV-${year}-${String(count + 1).padStart(5, '0')}`;
    }

    if (dto.status) {
      payload.status = dto.status;
    }

    // Ensure totals are mathematically computed
    const pN = (v: any) => (v !== undefined && v !== null && v !== '') ? Number(v) : null;
    const baseAmount = pN(dto.amount) ?? 0;
    const fuelSurcharge = pN(dto.fuelSurcharge) ?? 0;
    const fuelCost = fuelSurcharge > 0 ? Number(((baseAmount * fuelSurcharge) / 100).toFixed(2)) : 0;
    const tollCosts = pN(dto.tollCosts) ?? 0;
    const extraCosts = pN(dto.extraCosts) ?? 0;
    const vatPercent = pN(dto.vatPercent) ?? 19;
    const vatType = dto.vatType || 'NORMAL';
    const isVat = vatType === 'NORMAL';

    const subtotal = pN(dto.subtotal) ?? (baseAmount + fuelCost + tollCosts + extraCosts);
    const vatAmount = pN(dto.vatAmount) ?? (isVat ? Number(((subtotal * vatPercent) / 100).toFixed(2)) : 0);
    const total = pN(dto.total) ?? (subtotal + vatAmount);

    payload.amount = baseAmount;
    payload.fuelSurcharge = fuelSurcharge;
    payload.tollCosts = tollCosts;
    payload.extraCosts = extraCosts;
    payload.vatPercent = vatPercent;
    payload.vatType = vatType;
    payload.subtotal = subtotal;
    payload.vatAmount = vatAmount;
    payload.total = total;

    // Ensure items exist
    if (!payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
      const itemDesc = payload.notes || 'Transport services';
      if (baseAmount > 0 || subtotal > 0) {
        payload.items = [
          {
            description: itemDesc,
            quantity: 1,
            unitPrice: baseAmount > 0 ? baseAmount : subtotal,
            vatRate: isVat ? vatPercent : 0,
            total: baseAmount > 0 ? baseAmount : subtotal,
          }
        ];
      }
    }

    const inv = this.repo.create(payload) as any;
    const saved = await this.repo.save(inv);
    if (user && saved?.id) {
      try {
        await this.actionLogs.logAction('Invoice', saved.id, 'CREATED', user, { invoiceNumber: saved.invoiceNumber });
        if (dto.tripId) {
          await this.actionLogs.logAction('Trip', dto.tripId, 'INVOICE_GENERATED', user, { invoiceNumber: saved.invoiceNumber });
        }
      } catch (err: any) {
        console.warn('Action log failed for invoice:', err?.message);
      }
    }
    return this.findOne(saved.id);
  }

  /**
   * Creates exactly one draft invoice for an operationally completed order.
   * Called from the same persisted delivery-completion transaction as the
   * stop/order update. It never finalises or sends the invoice.
   */
  async createDraftForCompletedOrder(orderId: string, user?: any): Promise<{ invoice: Invoice | null; created: boolean; reason?: string }> {
    const existing = await this.repo.findOne({ where: { orderId } });
    if (existing) return { invoice: existing, created: false, reason: 'already_invoiced' };

    const order = await this.repo.manager.getRepository(Order).findOne({
      where: { id: orderId },
      relations: ['client', 'trip', 'trip.stops', 'trip.truck', 'trip.trailer', 'trip.driver.user', 'trip.orders', 'trip.orders.cargoItems', 'cargoItems', 'stops'],
    });
    if (!order) return { invoice: null, created: false, reason: 'order_not_found' };

    const completedStatuses = ['delivered', 'pod_received', 'completed', 'ready_for_invoice'];
    if (!completedStatuses.includes(String(order.status || '').toLowerCase())) {
      return { invoice: null, created: false, reason: 'order_not_completed' };
    }
    if (!order.client?.id) {
      return { invoice: null, created: false, reason: 'client_missing' };
    }

    const amount = Number(order.price) || 0;
    const reference = order.orderNumber || order.id;
    const notes = amount > 0
      ? `Automatically generated from completed order ${reference}.`
      : `Automatically generated from completed order ${reference}. Freight rate is missing and must be entered before approval.`;
    const transportDetails = this.buildTransportDetailsFrom(order, order.trip);

    try {
      const invoice = await this.create({
        orderId,
        order: { id: orderId },
        tripId: order.trip?.id || null,
        clientId: order.client.id,
        amount,
        vatPercent: 19,
        vatType: 'NORMAL',
        status: InvoiceStatus.DRAFT,
        issueDate: new Date(),
        notes,
        transportDetails,
        items: amount > 0 ? [{
          description: `Transport order ${reference}${order.trip?.tripNumber ? ` · ${order.trip.tripNumber}` : ''}`,
          quantity: 1,
          unitPrice: amount,
          vatRate: 19,
          total: amount,
        }] : [],
      }, user);

      if (invoice?.id) {
        await this.actionLogs.logAction('Invoice', invoice.id, 'AUTO_DRAFT_CREATED', user, {
          orderId,
          orderNumber: reference,
          tripId: order.trip?.id || null,
          amount,
          missingRate: amount <= 0,
        }).catch(() => undefined);
      }
      return { invoice: invoice || null, created: true };
    } catch (error: any) {
      // A concurrent completion may have won the unique order index. Return the
      // existing invoice instead of failing the already-successful completion.
      const raced = await this.repo.findOne({ where: { orderId } }).catch(() => null);
      if (raced) return { invoice: raced, created: false, reason: 'concurrent_completion' };
      throw error;
    }
  }

  async approve(id: string, user?: any) {
    const inv = await this.findOneForPdf(id);
    if (!inv) throw new BadRequestException('Invoice not found');
    await this.repo.update(id, { status: InvoiceStatus.APPROVED } as any);
    if (user) {
      try {
        await this.actionLogs.logAction('Invoice', id, 'APPROVED', user);
      } catch (err: any) {
        console.warn('Action log failed for invoice approval:', err?.message);
      }
    }
    // The client immediately renders the final PDF from this response, so it
    // must include client, trip, items and the transport snapshot.
    return this.findOneForPdf(id);
  }

  async update(id: string, dto: any, user?: any) {
    const inv = await this.repo.findOne({ where: { id }, relations: ['client', 'trip', 'items'] });
    if (!inv) throw new BadRequestException('Invoice not found');
    // Compute the real diff BEFORE mutating the entity
    const { updatedFields, changes } = computeAuditChanges(inv, dto, {
      relations: { clientId: 'client', tripId: 'trip' },
      ignore: ['items', 'client', 'trip'],
    });
    Object.assign(inv, dto);
    const saved = await this.repo.save(inv);
    if (user && updatedFields.length > 0) {
      try {
        await this.actionLogs.logAction('Invoice', id, 'UPDATED', user, { updatedFields, changes });
      } catch (err: any) {
        console.warn('Action log failed for invoice update:', err?.message);
      }
    }
    return saved;
  }
  async remove(id: string) {
    return this.repo.delete(id); 
  }


  async getAgingSummary() {
    const invoices = await this.repo.createQueryBuilder('inv')
      .leftJoinAndSelect('inv.client', 'client')
      .leftJoinAndSelect('inv.items', 'items')
      .leftJoinAndSelect('inv.payments', 'payments')
      .where('inv.status != :paid', { paid: InvoiceStatus.PAID })
      .andWhere('inv.status != :cancelled', { cancelled: InvoiceStatus.CANCELLED })
      .getMany();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bucketKey = (dueDate: Date | null): string => {
      if (!dueDate) return 'current';
      const due = new Date(dueDate);
      due.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today.getTime() - due.getTime()) / 86400000);
      if (diffDays <= 0) return 'current';
      if (diffDays <= 30) return '1-30';
      if (diffDays <= 60) return '31-60';
      if (diffDays <= 90) return '61-90';
      return '90+';
    };

    const buckets: Record<string, { count: number; amount: number }> = {
      current: { count: 0, amount: 0 },
      '1-30': { count: 0, amount: 0 },
      '31-60': { count: 0, amount: 0 },
      '61-90': { count: 0, amount: 0 },
      '90+': { count: 0, amount: 0 },
    };

    const byClient: Record<string, any> = {};

    for (const inv of invoices) {
      const amount = Number(inv.total) || Number(inv.amount) || 0;
      const paidAmount = (inv.payments || []).reduce((sum: number, pm: any) => sum + (Number(pm.amount) || 0), 0);
      const remaining = Math.max(0, amount - paidAmount);
      const key = bucketKey(inv.dueDate);
      buckets[key].count += 1;
      buckets[key].amount += remaining;

      const clientId = inv.client?.id || 'unknown';
      const clientName = inv.client?.name || 'N/A';
      if (!byClient[clientId]) {
        byClient[clientId] = { id: clientId, name: clientName, email: inv.client?.contactEmail || '', total: 0, maxDays: 0, invoices: [] };
      }
      byClient[clientId].total += remaining;
      const due = inv.dueDate ? new Date(inv.dueDate) : null;
      if (due) {
        const d = Math.floor((today.getTime() - new Date(due.getTime()).setHours(0,0,0,0)) / 86400000);
        byClient[clientId].maxDays = Math.max(byClient[clientId].maxDays, d);
      }
      byClient[clientId].invoices.push({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amount: remaining,
        dueDate: inv.dueDate,
        status: inv.status,
      });
    }

    const order: string[] = ['current', '1-30', '31-60', '61-90', '90+'];
    const totalReceivable = Object.values(buckets).reduce((sum: number, b: any) => sum + b.amount, 0);

    return {
      totalReceivable,
      buckets: order.map((k) => ({ label: k, ...buckets[k] })),
      byClient: Object.values(byClient).sort((a: any, b: any) => b.total - a.total),
    };
  }

  getOverdue() {
    return this.repo.createQueryBuilder('inv')
      .leftJoinAndSelect('inv.client', 'client')
      .leftJoinAndSelect('inv.items', 'items')
      .where('inv.status != :paid', { paid: InvoiceStatus.PAID })
      .andWhere('inv.dueDate < :now', { now: new Date() })
      .getMany();
  }
}
