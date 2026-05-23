import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './document.entity';

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
  remove(id: string) { return this.repo.delete(id); }
}
