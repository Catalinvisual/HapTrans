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

@Injectable()
export class InvoicesService implements OnModuleInit {
  constructor(@InjectRepository(Invoice) private repo: Repository<Invoice>) {}

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
        const trip = await tripRepo.findOne({ where: { id: tripId } });
        if (trip) {
          tripObj = trip;
          if (inv.trip) {
            const tripDesc = inv.trip.tripNumber || 'Trip';
            routeDesc = `Factură pentru cursa ${tripDesc}`;
          }
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
      const res = await this.repo.manager.query("SELECT `value` FROM website_cms WHERE `key` = 'tariff_settings'");
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

  findAll() { return this.repo.find({ relations: ['client', 'trip', 'items'] }); }
  findOne(id: string) { return this.repo.findOne({ where: { id }, relations: ['client', 'trip', 'items'] }); }

  async create(dto: any) {
    const payload: any = { ...dto, invoiceNumber: `INV-${Date.now()}` };
    if (dto.clientId) payload.client = { id: dto.clientId };
    if (dto.tripId) payload.trip = { id: dto.tripId };
    const inv = this.repo.create(payload) as any;
    return this.repo.save(inv);
  }

  async approve(id: string) {
    const inv = await this.repo.findOne({ where: { id } });
    if (!inv) throw new BadRequestException('Invoice not found');
    inv.status = InvoiceStatus.APPROVED;
    return this.repo.save(inv);
  }

  async update(id: string, dto: any) {
    const inv = await this.repo.findOne({ where: { id }, relations: ['client', 'trip', 'items'] });
    if (!inv) throw new BadRequestException('Invoice not found');
    Object.assign(inv, dto);
    return this.repo.save(inv);
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
