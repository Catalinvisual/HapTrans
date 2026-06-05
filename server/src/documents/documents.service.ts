import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './document.entity';
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
export class DocumentsService {
  constructor(@InjectRepository(Document) private repo: Repository<Document>) {}
  findAll() { return this.repo.find({ relations: ['trip', 'uploadedBy'] }); }
  findByTrip(tripId: string) { return this.repo.find({ where: { trip: { id: tripId } }, relations: ['uploadedBy'] }); }
  async create(dto: any): Promise<Document> {
    const hasTrip = dto.tripId && dto.tripId !== 'null' && dto.tripId !== '';
    const doc = this.repo.create({
      ...dto,
      trip: hasTrip ? ({ id: dto.tripId } as any) : null,
      uploadedBy: { id: dto.uploadedById } as any,
    });
    return this.repo.save(doc) as unknown as Promise<Document>;
  }
  async remove(id: string) {
    const doc = await this.repo.findOne({ where: { id } });
    if (doc && doc.fileUrl) {
      await deleteFromCloudinary(doc.fileUrl);
    }
    return this.repo.delete(id); 
  }
}
