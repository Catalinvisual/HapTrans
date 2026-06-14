import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like } from 'typeorm';
import { Invoice, InvoiceStatus } from './invoice.entity';
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
export class InvoicesService {
  constructor(@InjectRepository(Invoice) private repo: Repository<Invoice>) {}

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

    const inv = this.repo.create({
      ...dto,
      invoiceNumber,
      client: { id: dto.clientId },
      trip: dto.tripId ? { id: dto.tripId } : null,
    });
    return this.repo.save(inv);
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
