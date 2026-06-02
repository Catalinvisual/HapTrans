import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Message } from './message.entity';

@Injectable()
export class ChatService {
  constructor(@InjectRepository(Message) private repo: Repository<Message>) {}

  async getMessages(tripId: string) {
    if (!tripId || tripId === 'general' || tripId === '00000000-0000-0000-0000-000000000000') {
      return this.repo.find({ where: { trip: IsNull(), driverId: IsNull() }, relations: ['sender'], order: { createdAt: 'ASC' } });
    }
    if (tripId.startsWith('driver_')) {
      const dId = tripId.replace('driver_', '');
      return this.repo.find({ where: { driverId: dId }, relations: ['sender'], order: { createdAt: 'ASC' } });
    }
    return this.repo.find({ where: { trip: { id: tripId } }, relations: ['sender'], order: { createdAt: 'ASC' } });
  }

  async saveMessage(tripId: string, senderId: string, content: string, fileUrl?: string) {
    const isGeneral = !tripId || tripId === 'general' || tripId === '00000000-0000-0000-0000-000000000000';
    const isDriverChat = tripId && tripId.startsWith('driver_');
    const msg = this.repo.create({
      trip: (isGeneral || isDriverChat) ? null : ({ id: tripId } as any),
      sender: { id: senderId } as any,
      content,
      fileUrl,
      driverId: isDriverChat ? tripId.replace('driver_', '') : null,
    } as any);
    const saved = await this.repo.save(msg);
    return this.repo.findOne({ where: { id: saved.id }, relations: ['sender'] });
  }
}
