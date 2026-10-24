import { Injectable, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like } from 'typeorm';
import { Invoice, InvoiceStatus } from './invoice.entity';
import { InvoiceItem } from './invoice-item.entity';
import { Trip } from '../trips/trip.entity';
import { v2 as cloudinary } from 'cloudinary';

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
    // Migration logic stub
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

  async create(dto: any, user?: any) {
    const payload: any = { 
      ...dto, 
    };

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

  async approve(id: string, user?: any) {
    const inv = await this.repo.findOne({ where: { id } });
    if (!inv) throw new BadRequestException('Invoice not found');
    inv.status = InvoiceStatus.APPROVED;
    const saved = await this.repo.save(inv);
    if (user) {
      try {
        await this.actionLogs.logAction('Invoice', id, 'APPROVED', user);
      } catch (err: any) {
        console.warn('Action log failed for invoice approval:', err?.message);
      }
    }
    return saved;
  }

  async update(id: string, dto: any, user?: any) {
    const inv = await this.repo.findOne({ where: { id }, relations: ['client', 'trip', 'items'] });
    if (!inv) throw new BadRequestException('Invoice not found');
    Object.assign(inv, dto);
    const saved = await this.repo.save(inv);
    if (user) {
      try {
        const updatedFields = Object.keys(dto);
        await this.actionLogs.logAction('Invoice', id, 'UPDATED', user, { updatedFields });
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
