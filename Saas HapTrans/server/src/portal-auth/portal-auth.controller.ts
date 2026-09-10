import { Controller, Post, Body, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PortalAuthService } from './portal-auth.service';
import { PortalUsersService } from '../portal-users/portal-users.service';
import * as bcrypt from 'bcrypt';
import { PortalUserStatus } from '../portal-users/portal-user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { PortalUser } from '../portal-users/portal-user.entity';
import { Repository } from 'typeorm';

@Controller('portal-auth')
export class PortalAuthController {
  constructor(
    private readonly authService: PortalAuthService,
    private readonly usersService: PortalUsersService,
    @InjectRepository(PortalUser)
    private readonly repo: Repository<PortalUser>,
  ) {}

  @Post('login')
  async login(@Body() dto: any) {
    if (!dto.email || !dto.password) throw new BadRequestException('Email and password required');
    return this.authService.login(dto.email, dto.password);
  }

  @Post('set-password')
  async setPassword(@Body() dto: any) {
    if (!dto.email || !dto.token || !dto.password) {
      throw new BadRequestException('Missing required fields');
    }

    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new BadRequestException('Invalid email');

    if (!user.inviteToken || !user.inviteTokenExpires || user.inviteTokenExpires < new Date() || user.inviteTokenUsedAt) {
      throw new BadRequestException('Invalid or expired token');
    }

    const isValidToken = await bcrypt.compare(dto.token, user.inviteToken);
    if (!isValidToken) throw new BadRequestException('Invalid token');

    if (dto.password.length < 8) throw new BadRequestException('Password must be at least 8 characters');

    user.password = await bcrypt.hash(dto.password, 10);
    user.inviteTokenUsedAt = new Date();
    user.status = PortalUserStatus.ACTIVE;

    await this.repo.save(user);

    return { message: 'Password set successfully' };
  }
}
