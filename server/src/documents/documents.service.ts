import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { Document } from './document.entity';
import { DocumentShare } from './document-share.entity';
import { v2 as cloudinary } from 'cloudinary';
import { randomBytes } from 'crypto';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document) private repo: Repository<Document>,
    @InjectRepository(DocumentShare) private shareRepo: Repository<DocumentShare>,
  ) {}

  findAll() { return this.repo.find({ relations: ['trip', 'uploadedBy'], order: { createdAt: 'DESC' } }); }
  
  getDebugDocs() {
    return this.repo.find({
      order: { uploadedAt: 'DESC' },
      take: 10,
    });
  }
  
  async fixTnasDocs() {
    // Seteaza manual tnasDownloaded = false pentru documentele cu true
    const res = await this.repo.update({ tnasDownloaded: true }, { tnasDownloaded: false });
    return { success: true, updated: res.affected };
  }

  findByTrip(tripId: string) { return this.repo.find({ where: { trip: { id: tripId } }, relations: ['uploadedBy'] }); }

  findByOrder(orderId: string) { return this.repo.find({ where: { order: { id: orderId } }, relations: ['uploadedBy'], order: { uploadedAt: 'DESC' } }); }
  
  async create(dto: any): Promise<Document> {
    const hasTrip = dto.tripId && dto.tripId !== 'null' && dto.tripId !== '';
    const hasOrder = dto.orderId && dto.orderId !== 'null' && dto.orderId !== '';

    // Normalize type to a valid enum value
    const rawType = (dto.type || dto.documentType || 'other').toString().toLowerCase().trim();
    const validTypes = ['cmr', 'invoice', 'pod', 'packing_list', 'photo', 'aviz', 'fuel', 'licence', 'other'];
    const normalizedType = validTypes.includes(rawType) ? rawType : 'other';

    const doc = this.repo.create({
      ...dto,
      type: rawType, // store raw string for display
      documentType: normalizedType as any,
      trip: hasTrip ? ({ id: dto.tripId } as any) : null,
      order: hasOrder ? ({ id: dto.orderId } as any) : null,
      uploadedBy: { id: dto.uploadedById } as any,
    });
    const saved: any = await this.repo.save(doc);
    const savedId = Array.isArray(saved) ? saved[0].id : saved.id;
    
    // Sync to driver_documents if no trip/order and it's uploaded by driver
    if (!hasTrip && !hasOrder && dto.uploadedById) {
      try {
        const fileUrlToSave = this.generateSignedUrl(saved, 365*24*60*60) || saved.fileUrl || saved.publicId;
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 5);
        await this.repo.manager.query(`
          INSERT INTO driver_documents (type, "documentNumber", "expiryDate", "fileUrl", "driverId")
          SELECT $1, $2, $3, $4, d.id
          FROM drivers d WHERE d."userId" = $5
        `, [
          rawType,
          'DOC-' + new Date().getTime().toString().substring(8),
          expiryDate,
          fileUrlToSave,
          dto.uploadedById
        ]);
      } catch (e) {
        console.error('Failed to sync to driver_documents:', e);
      }
    }

    return this.repo.findOne({ where: { id: savedId }, relations: ['trip', 'order', 'uploadedBy'] }) as unknown as Promise<Document>;
  }

  generateSignedUrl(document: Document, expiresInSeconds: number) {
    if (!document.publicId) {
      return document.fileUrl; // fallback for old files
    }

    const options: any = {
      secure: true,
      sign_url: true,
      type: document.cloudinaryType || 'authenticated',
      resource_type: document.resourceType || 'raw',
      expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
    };
    
    if (document.resourceType === 'image' && document.format) {
      options.format = document.format;
    }

    return cloudinary.url(document.publicId, options);
  }

  async getPreviewUrl(documentId: string) {
    const document = await this.repo.findOne({ where: { id: documentId } });
    if (!document) throw new NotFoundException('Document not found');

    return {
      url: this.generateSignedUrl(document, 60 * 60), // 1 hour
    };
  }

  async shareDocument(documentId: string, createdBy: string) {
    const document = await this.repo.findOne({ where: { id: documentId } });
    if (!document) throw new NotFoundException('Document not found');

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.shareRepo.save({
      document,
      token,
      expiresAt,
      createdBy,
    });

    return { token };
  }

  async getSharedDocument(token: string) {
    const share = await this.shareRepo.findOne({
      where: { token },
      relations: ['document'],
    });

    if (!share) throw new NotFoundException();
    if (share.revokedAt) throw new ForbiddenException('Link revoked');
    if (share.expiresAt && share.expiresAt < new Date()) {
      throw new ForbiddenException('Link expired');
    }

    return {
      filename: share.document.originalFilename || share.document.fileName,
      url: this.generateSignedUrl(share.document, 60 * 60), 
    };
  }

  async getPendingTnasDocuments() {
    const documents = await this.repo.find({ 
      where: [
        { tnasDownloaded: false, publicId: Not(IsNull()) },
        { tnasDownloaded: IsNull() as any, publicId: Not(IsNull()) }
      ] 
    });
    return documents.map(doc => ({
      id: doc.id,
      filename: doc.originalFilename || doc.fileName,
      signedUrl: this.generateSignedUrl(doc, 15 * 60), // 15 mins
      uploadedAt: doc.uploadedAt,
    }));
  }

  async markTnasDownloaded(id: string) {
    const document = await this.repo.findOne({ where: { id } });
    if (!document) throw new NotFoundException();
    document.tnasDownloaded = true;
    await this.repo.save(document);
    return { success: true };
  }

  async remove(id: string) {
    const doc = await this.repo.findOne({ where: { id } });
    if (!doc) return;

    if (doc.publicId) {
      try {
        await cloudinary.uploader.destroy(doc.publicId, {
          resource_type: doc.resourceType || 'raw',
          type: doc.cloudinaryType || 'authenticated',
        });
      } catch (e) { console.error('Failed to delete from Cloudinary:', e); }
    } else if (doc.fileUrl && doc.fileUrl.includes('cloudinary.com')) {
      try {
        const parts = doc.fileUrl.split('/');
        const uploadIndex = parts.findIndex(p => p === 'upload');
        if (uploadIndex !== -1) {
          const resourceType = parts[uploadIndex - 1]; 
          let publicIdParts = parts.slice(uploadIndex + 2); 
          let publicIdWithExt = publicIdParts.join('/');
          let publicId = publicIdWithExt;
          if (resourceType === 'image' || resourceType === 'video') {
             publicId = publicIdWithExt.replace(/\.[^/.]+$/, "");
          }
          await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
        }
      } catch (e) {}
    }
    
    return this.repo.delete(id); 
  }
}
