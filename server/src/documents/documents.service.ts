import * as dotenv from 'dotenv';
dotenv.config();
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, Like } from 'typeorm';
import { Document, DocumentType } from './document.entity';
import { DocumentShare } from './document-share.entity';
import { Trip } from '../trips/trip.entity';
import { Order } from '../orders/order.entity';
import { Driver } from '../drivers/driver.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { v2 as cloudinary } from 'cloudinary';
import { randomBytes } from 'crypto';
import { Readable } from 'stream';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document) private repo: Repository<Document>,
    @InjectRepository(DocumentShare) private shareRepo: Repository<DocumentShare>,
    @InjectRepository(Trip) private tripRepo: Repository<Trip>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(Driver) private driverRepo: Repository<Driver>,
    private notificationsService: NotificationsService,
  ) {}

  findAll() {
    return this.repo.find({ relations: ['trip', 'order', 'uploadedBy'], order: { uploadedAt: 'DESC' } });
  }

  getDebugDocs() {
    return this.repo.find({
      order: { uploadedAt: 'DESC' },
      take: 10,
    });
  }

  async fixTnasDocs() {
    const res = await this.repo.update({ tnasDownloaded: true }, { tnasDownloaded: false });
    return { success: true, updated: res.affected };
  }

  findByTrip(tripId: string) {
    return this.repo.find({ where: { trip: { id: tripId } }, relations: ['uploadedBy', 'order'] });
  }

  findByOrder(orderId: string) {
    return this.repo.find({ where: { order: { id: orderId } }, relations: ['uploadedBy', 'trip'], order: { uploadedAt: 'DESC' } });
  }

  /**
   * Resolves raw document types to clean English uppercase prefixes, normalized enums, and labels.
   */
  resolveDocType(rawType?: string): {
    englishPrefix: string;
    normalizedType: DocumentType;
    displayType: string;
  } {
    const clean = (rawType || 'other').toString().trim().toLowerCase();

    switch (clean) {
      case 'cmr':
        return { englishPrefix: 'CMR', normalizedType: DocumentType.CMR, displayType: 'CMR' };
      case 'aviz':
      case 'delivery_note':
      case 'delivery note':
      case 'waybill':
      case 'leveringsbon':
      case 'lieferschein':
        return { englishPrefix: 'DELIVERY_NOTE', normalizedType: DocumentType.AVIZ, displayType: 'Delivery Note' };
      case 'pod':
        return { englishPrefix: 'POD', normalizedType: DocumentType.POD, displayType: 'POD' };
      case 'factura':
      case 'factură':
      case 'invoice':
      case 'invoices':
      case 'factuur':
      case 'rechnung':
        return { englishPrefix: 'INVOICE', normalizedType: DocumentType.INVOICE, displayType: 'Invoice' };
      case 'licenta':
      case 'licență':
      case 'licence':
      case 'license':
      case 'driving_license':
      case 'rijbewijs':
        return { englishPrefix: 'LICENSE', normalizedType: DocumentType.LICENCE, displayType: 'License' };
      case 'fuel':
      case 'combustibil':
      case 'fuel_receipt':
      case 'bon_combustibil':
      case 'brandstof':
        return { englishPrefix: 'FUEL_RECEIPT', normalizedType: DocumentType.FUEL, displayType: 'Fuel Receipt' };
      case 'packing_list':
      case 'packing list':
      case 'packinglist':
      case 'pakbon':
        return { englishPrefix: 'PACKING_LIST', normalizedType: DocumentType.PACKING_LIST, displayType: 'Packing List' };
      case 'loading_photo':
      case 'foto încărcare':
      case 'foto incarcare':
      case 'loadingphoto':
        return { englishPrefix: 'LOADING_PHOTO', normalizedType: DocumentType.PHOTO, displayType: 'Loading Photo' };
      case 'cargo_photo':
      case 'foto marfă':
      case 'foto marfa':
      case 'cargophoto':
        return { englishPrefix: 'CARGO_PHOTO', normalizedType: DocumentType.PHOTO, displayType: 'Cargo Photo' };
      case 'photo':
      case 'foto':
        return { englishPrefix: 'PHOTO', normalizedType: DocumentType.PHOTO, displayType: 'Photo' };
      case 'tachograph':
      case 'tacho':
      case 'tahograf':
        return { englishPrefix: 'TACHOGRAPH', normalizedType: DocumentType.OTHER, displayType: 'Tachograph' };
      case 'weight_ticket':
      case 'tichet cantar':
      case 'cantar':
        return { englishPrefix: 'WEIGHT_TICKET', normalizedType: DocumentType.OTHER, displayType: 'Weight Ticket' };
      case 'other':
      case 'altele':
      case 'alte documente':
      case 'doc':
      case 'document':
      default:
        return { englishPrefix: 'DOCUMENT', normalizedType: DocumentType.OTHER, displayType: 'Document' };
    }
  }

  private async uploadToCloudinary(
    buffer: Buffer,
    options: {
      folder: string;
      public_id: string;
      resource_type: 'image' | 'raw';
      type: string;
      overwrite: boolean;
    },
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload stream error:', error);
            return reject(error);
          }
          resolve(result);
        },
      );
      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);
      stream.pipe(uploadStream);
    });
  }

  /**
   * Constructs the final English filename before Cloudinary, uploads to Cloudinary,
   * stores document in database and triggers notifications.
   */
  async uploadAndCreate(file: Express.Multer.File, dto: UploadDocumentDto, user?: any): Promise<Document> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file uploaded or file buffer empty');
    }

    // 1. Resolve Document Type & English Prefix
    const { englishPrefix, normalizedType, displayType } = this.resolveDocType(dto.type);

    // 2. Resolve Reference
    let resolvedTrip: Trip | null = null;
    let resolvedOrder: Order | null = null;
    let reference = (dto.reference || dto.referenceNumber || '').trim();

    if (!reference && dto.tripId && dto.tripId !== 'null' && dto.tripId !== '') {
      try {
        resolvedTrip = await this.tripRepo.findOne({
          where: [{ id: dto.tripId }, { tripNumber: dto.tripId }],
          relations: ['orders'],
        });
        if (resolvedTrip?.tripNumber) {
          reference = resolvedTrip.tripNumber;
        } else if (resolvedTrip?.id) {
          reference = resolvedTrip.id;
        }
      } catch (err) {
        console.warn('Could not resolve trip for doc upload:', err);
      }
    }

    if (!reference && dto.orderId && dto.orderId !== 'null' && dto.orderId !== '') {
      try {
        resolvedOrder = await this.orderRepo.findOne({
          where: [{ id: dto.orderId }, { orderNumber: dto.orderId }],
        });
        if (resolvedOrder?.orderNumber) {
          reference = resolvedOrder.orderNumber;
        } else if (resolvedOrder?.internalReference) {
          reference = resolvedOrder.internalReference;
        } else if (resolvedOrder?.id) {
          reference = resolvedOrder.id;
        }
      } catch (err) {
        console.warn('Could not resolve order for doc upload:', err);
      }
    }

    // If still no reference and we have a trip with orders, fallback to first order or trip ref
    if (!reference && resolvedTrip?.orders?.length) {
      reference = resolvedTrip.orders[0].orderNumber || resolvedTrip.tripNumber || 'TRP';
    }

    // If driver document (e.g. LICENSE) or uploaded by a driver without trip/order
    if (!reference && (normalizedType === DocumentType.LICENCE || user?.role === 'driver')) {
      try {
        if (user?.id) {
          const driver = await this.driverRepo.findOne({
            where: [{ user: { id: user.id } }, { id: user.id }],
          });
          if (driver?.licenseNumber) {
            reference = `DRV-${driver.licenseNumber}`;
          } else if (driver?.id) {
            reference = `DRV-${driver.id.slice(0, 8).toUpperCase()}`;
          }
        }
      } catch (err) {
        console.warn('Could not resolve driver for doc upload:', err);
      }
      if (!reference && user?.id) {
        reference = `DRV-${user.id.slice(0, 8).toUpperCase()}`;
      }
    }

    // Default fallback reference
    if (!reference) {
      reference = `DOC-${Date.now().toString().slice(-6)}`;
    }

    // Sanitize reference for filenames (letters, numbers, hyphens, underscores)
    const cleanRef = reference.replace(/[^a-zA-Z0-9_-]/g, '_');

    // 3. File extension & Resource Type
    const originalName = file.originalname || 'document.pdf';
    const extMatch = originalName.match(/\.([^/.]+)$/);
    let ext = extMatch ? extMatch[1].toLowerCase() : '';
    if (!ext) {
      ext = file.mimetype?.includes('image') ? 'jpg' : 'pdf';
    }
    const isImageExt = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
    const treatAsImage = (file.mimetype && file.mimetype.startsWith('image/')) || isImageExt;
    const resourceType: 'image' | 'raw' = treatAsImage ? 'image' : 'raw';

    // 4. Construct unique filename & public_id before sending to Cloudinary
    const baseName = `${englishPrefix}_${cleanRef}`;
    const existingCount = await this.repo.count({
      where: [
        { fileName: Like(`${baseName}%`) },
        { publicId: Like(`%${baseName}%`) },
      ],
    });

    const uniqueBase = existingCount > 0 ? `${baseName}_${existingCount + 1}` : baseName;
    const finalFileName = `${uniqueBase}.${ext}`;
    // For images Cloudinary manages extensions; for raw (PDF/doc) public_id must include extension
    const cloudinaryPublicId = treatAsImage ? uniqueBase : finalFileName;

    // 5. Upload buffer directly to Cloudinary
    const uploadResult = await this.uploadToCloudinary(file.buffer, {
      folder: 'hapcargo_documents',
      public_id: cloudinaryPublicId,
      resource_type: resourceType,
      type: 'authenticated',
      overwrite: true,
    });

    // 6. Save in DB
    const doc = this.repo.create({
      trip: resolvedTrip ? ({ id: resolvedTrip.id } as any) : (dto.tripId && dto.tripId !== 'null' ? ({ id: dto.tripId } as any) : null),
      order: resolvedOrder ? ({ id: resolvedOrder.id } as any) : (dto.orderId && dto.orderId !== 'null' ? ({ id: dto.orderId } as any) : null),
      type: displayType,
      documentType: normalizedType,
      fileName: finalFileName,
      fileUrl: uploadResult.secure_url || uploadResult.url,
      publicId: uploadResult.public_id,
      resourceType: uploadResult.resource_type || resourceType,
      cloudinaryType: uploadResult.type || 'authenticated',
      format: uploadResult.format || ext,
      originalFilename: finalFileName,
      bytes: uploadResult.bytes || file.size,
      cloudinaryAssetId: uploadResult.asset_id,
      tnasDownloaded: false,
      notes: dto.notes,
      uploadedBy: user?.id ? ({ id: user.id } as any) : null,
    });

    const saved: any = await this.repo.save(doc);
    const savedId = Array.isArray(saved) ? saved[0].id : saved.id;

    // 7. Sync to driver_documents if driver document without trip/order
    if (!resolvedTrip && !resolvedOrder && user?.id) {
      try {
        const fileUrlToSave = this.generateSignedUrl(saved, 365 * 24 * 60 * 60) || saved.fileUrl || saved.publicId;
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 5);
        await this.repo.manager.query(`
          INSERT INTO driver_documents (type, "documentNumber", "expiryDate", "fileUrl", "driverId")
          SELECT $1, $2, $3, $4, d.id
          FROM drivers d WHERE d."userId" = $5
        `, [
          displayType,
          cleanRef,
          expiryDate,
          fileUrlToSave,
          user.id,
        ]);
      } catch (e) {
        console.error('Failed to sync to driver_documents:', e);
      }
    }

    // 8. Notifications
    if (user) {
      const uName = user.name || 'Utilizator';
      const roleLabel = user.role === 'driver' ? 'Șofer' : (user.role === 'client' ? 'Client' : 'Dispecerat / Admin');
      const tripRef = resolvedTrip?.tripNumber || dto.tripId || 'N/A';
      if (roleLabel === 'Șofer' || roleLabel === 'Client') {
        try {
          await this.notificationsService.create({
            type: 'document',
            title: `Document Nou de la ${roleLabel}: ${uName}`,
            message: `Fișier ${displayType} (${finalFileName}) încărcat pentru: ${tripRef}`,
            relatedId: savedId,
          });
        } catch (nErr) {
          console.warn('Could not create notification:', nErr);
        }
      }
    }

    return this.repo.findOne({
      where: { id: savedId },
      relations: ['trip', 'order', 'uploadedBy'],
    }) as unknown as Promise<Document>;
  }

  async create(dto: any): Promise<Document> {
    const hasTrip = dto.tripId && dto.tripId !== 'null' && dto.tripId !== '';
    const hasOrder = dto.orderId && dto.orderId !== 'null' && dto.orderId !== '';

    const { englishPrefix, normalizedType, displayType } = this.resolveDocType(dto.type || dto.documentType);

    const doc = this.repo.create({
      ...dto,
      type: displayType,
      documentType: normalizedType,
      trip: hasTrip ? ({ id: dto.tripId } as any) : null,
      order: hasOrder ? ({ id: dto.orderId } as any) : null,
      uploadedBy: dto.uploadedById ? ({ id: dto.uploadedById } as any) : null,
    });
    const saved: any = await this.repo.save(doc);
    const savedId = Array.isArray(saved) ? saved[0].id : saved.id;

    if (!hasTrip && !hasOrder && dto.uploadedById) {
      try {
        const fileUrlToSave = this.generateSignedUrl(saved, 365 * 24 * 60 * 60) || saved.fileUrl || saved.publicId;
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 5);
        await this.repo.manager.query(`
          INSERT INTO driver_documents (type, "documentNumber", "expiryDate", "fileUrl", "driverId")
          SELECT $1, $2, $3, $4, d.id
          FROM drivers d WHERE d."userId" = $5
        `, [
          displayType,
          'DOC-' + new Date().getTime().toString().substring(8),
          expiryDate,
          fileUrlToSave,
          dto.uploadedById,
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
        { tnasDownloaded: IsNull() as any, publicId: Not(IsNull()) },
      ],
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
      } catch (e) {
        console.error('Failed to delete from Cloudinary:', e);
      }
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
            publicId = publicIdWithExt.replace(/\.[^/.]+$/, '');
          }
          await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
        }
      } catch (e) {}
    }

    return this.repo.delete(id);
  }
}
