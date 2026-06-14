import { Injectable, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like } from 'typeorm';
import { Invoice, InvoiceStatus } from './invoice.entity';
import { InvoiceItem } from './invoice-item.entity';
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

  async onModuleInit() {
    const invoices = await this.repo.find({ relations: ['items'] });
    let migratedCount = 0;
    for (const inv of invoices) {
      if (inv.amount > 0 && (!inv.items || inv.items.length === 0)) {
        const item = new InvoiceItem();
        item.description = 'Transport service';
        item.quantity = 1;
        item.unitPrice = Number(inv.amount);
        item.vatRate = Number(inv.vatPercent || 19);
        item.total = Number(inv.amount);
        
        inv.subtotal = Number(inv.amount);
        inv.vatAmount = Number((inv.amount * (inv.vatPercent || 19)) / 100);
        inv.total = Number(inv.subtotal) + Number(inv.vatAmount);
        inv.items = [item];
        
        await this.repo.save(inv);
        migratedCount++;
      }
    }
    if (migratedCount > 0) {
      console.log(`Migrated ${migratedCount} old invoices to the new InvoiceItem structure.`);
    }
  }

  findAll() { return this.repo.find({ relations: ['client', 'trip'] }); }
  findOne(id: string) { return this.repo.findOne({ where: { id }, relations: ['client', 'trip'] }); }

  async create(dto: any) {
    const year = new Date().getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    let invoiceNumber = '';
    
    if (dto.status === InvoiceStatus.DRAFT || dto.status === 'draft') {
      const draftCount = await this.repo.count({
        where: { createdAt: Between(startOfYear, endOfYear), invoiceNumber: Like('DRAFT-%') },
      });
      invoiceNumber = `DRAFT-${year}-${String(draftCount + 1).padStart(6, '0')}`;
    } else {
      const count = await this.repo.count({
        where: { createdAt: Between(startOfYear, endOfYear), invoiceNumber: Like('HC-%') },
      });
      invoiceNumber = `HC-${year}-${String(count + 1).padStart(4, '0')}`;
    }

    const payload: any = {
      ...dto,
      invoiceNumber,
      client: { id: dto.clientId },
      trip: dto.tripId ? { id: dto.tripId } : null,
    };
    const inv = this.repo.create(payload) as any;
    const saved = await this.repo.save(inv);
    return this.findOne(saved.id);
  }

  async approve(id: string) {
    const inv = await this.repo.findOne({ where: { id } });
    if (!inv) throw new BadRequestException('Invoice not found');
    if (inv.status !== InvoiceStatus.DRAFT) throw new BadRequestException('Only draft invoices can be approved');

    const year = new Date().getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    const count = await this.repo.count({
      where: { createdAt: Between(startOfYear, endOfYear), invoiceNumber: Like('HC-%') },
    });
    
    inv.invoiceNumber = `HC-${year}-${String(count + 1).padStart(4, '0')}`;
    inv.status = InvoiceStatus.SENT;
    
    return this.repo.save(inv);
  }

  async update(id: string, dto: Partial<Invoice>) {
    const inv = await this.repo.findOne({ where: { id } });
    if (!inv) throw new BadRequestException('Invoice not found');

    if (inv.status !== InvoiceStatus.DRAFT) {
      const allowedKeys = ['status', 'pdfUrl', 'pdfData', 'publicId', 'resourceType', 'cloudinaryType', 'format', 'originalFilename', 'tnasDownloaded'];
      const keys = Object.keys(dto);
      const isEditingData = keys.some(k => !allowedKeys.includes(k));
      if (isEditingData) {
        throw new BadRequestException('Approved invoices cannot be edited directly. Only status and PDF attachments can be updated.');
      }
    }

    return this.repo.update(id, dto);
  }
  async remove(id: string) {
    const inv = await this.repo.findOne({ where: { id } });
    if (inv && inv.pdfUrl) {
      await deleteFromCloudinary(inv.pdfUrl);
    }
    return this.repo.delete(id); 
  }

  getOverdue() {
    return this.repo.createQueryBuilder('inv')
      .leftJoinAndSelect('inv.client', 'client')
      .where('inv.status != :paid', { paid: InvoiceStatus.PAID })
      .andWhere('inv.dueDate < :now', { now: new Date() })
      .getMany();
  }
}
