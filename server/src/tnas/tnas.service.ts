import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { Document } from '../documents/document.entity';
import { Invoice } from '../invoices/invoice.entity';
import { Expense } from '../expenses/expense.entity';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class TnasService {
  constructor(
    @InjectRepository(Document) private docsRepo: Repository<Document>,
    @InjectRepository(Invoice) private invoicesRepo: Repository<Invoice>,
    @InjectRepository(Expense) private expensesRepo: Repository<Expense>,
  ) {}

  generateSignedUrl(entity: any, expiresInSeconds: number) {
    if (!entity.publicId) return entity.fileUrl || entity.pdfUrl || entity.receiptUrl;

    const options: any = {
      secure: true,
      sign_url: true,
      type: entity.cloudinaryType || 'authenticated',
      resource_type: entity.resourceType || 'raw',
      expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
    };
    
    if (entity.resourceType === 'image' && entity.format) {
      options.format = entity.format;
    }

    return cloudinary.url(entity.publicId, options);
  }

  async getPendingFiles() {
    const whereCondition = [
      { tnasDownloaded: false, publicId: Not(IsNull()) },
      { tnasDownloaded: IsNull() as any, publicId: Not(IsNull()) }
    ];

    const docs = await this.docsRepo.find({ where: whereCondition });
    const invs = await this.invoicesRepo.find({ where: whereCondition });
    const exps = await this.expensesRepo.find({ where: whereCondition });

    const results = [];

    for (const d of docs) {
      results.push({
        id: d.id,
        source: 'documents',
        filename: d.originalFilename || d.fileName,
        category: 'Documents',
        signedUrl: this.generateSignedUrl(d, 15 * 60),
        createdAt: d.createdAt,
      });
    }

    for (const i of invs) {
      results.push({
        id: i.id,
        source: 'invoices',
        filename: i.originalFilename || `Invoice_${i.invoiceNumber}.pdf`,
        category: 'Invoices',
        signedUrl: this.generateSignedUrl(i, 15 * 60),
        createdAt: i.createdAt,
      });
    }

    for (const e of exps) {
      results.push({
        id: e.id,
        source: 'expenses',
        filename: e.originalFilename || `Expense_${e.id.substring(0,8)}.pdf`,
        category: 'Expenses',
        signedUrl: this.generateSignedUrl(e, 15 * 60),
        createdAt: e.createdAt,
      });
    }

    return results;
  }

  async markDownloaded(source: string, id: string) {
    let repo: Repository<any>;
    if (source === 'documents') repo = this.docsRepo;
    else if (source === 'invoices') repo = this.invoicesRepo;
    else if (source === 'expenses') repo = this.expensesRepo;
    else throw new NotFoundException('Invalid source');

    const entity = await repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException();

    entity.tnasDownloaded = true;
    await repo.save(entity);

    return { success: true };
  }
}
