import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PortalUser, PortalUserStatus } from './portal-user.entity';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { ResendService } from '../email/resend.service';

@Injectable()
export class PortalUsersService {
  constructor(
    @InjectRepository(PortalUser)
    private repo: Repository<PortalUser>,
    private resendService: ResendService,
  ) {}

  async findAllForClient(clientId: string) {
    return this.repo.find({ where: { clientId } });
  }

  async findOne(id: string) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Portal user not found');
    return user;
  }

  async findByEmail(email: string) {
    return this.repo.findOne({ where: { email } });
  }

  async inviteUser(clientId: string, email: string, name?: string) {
    let user = await this.repo.findOne({ where: { email } });
    
    if (user && user.clientId !== clientId) {
      throw new BadRequestException('Email is already registered to another client');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(token, 10);
    const expires = new Date();
    expires.setHours(expires.getHours() + 48);

    if (!user) {
      user = this.repo.create({
        clientId,
        email,
        name,
        status: PortalUserStatus.PENDING,
      });
    }

    user.inviteToken = hashedToken;
    user.inviteTokenExpires = expires;
    user.inviteTokenUsedAt = null as any;

    await this.repo.save(user);

    const baseUrl = process.env.PUBLIC_WEBSITE_URL || 'https://exemplary-balance-production-c473.up.railway.app';
    const inviteLink = `${baseUrl}/portal/set-password?token=${token}&email=${encodeURIComponent(email)}`;
    
    await this.resendService.sendPortalInviteEmail(email, name || '', inviteLink);

    return { 
      message: 'Invitation created and email sent', 
      inviteLink: `/portal/set-password?token=${token}&email=${encodeURIComponent(email)}` 
    };
  }

  async updateStatus(id: string, status: PortalUserStatus) {
    const user = await this.findOne(id);
    user.status = status;
    return this.repo.save(user);
  }
}
