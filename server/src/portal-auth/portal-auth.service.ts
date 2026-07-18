import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PortalUsersService } from '../portal-users/portal-users.service';
import { PortalUserStatus } from '../portal-users/portal-user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PortalAuthService {
  constructor(
    private readonly usersService: PortalUsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(id: string) {
    const user = await this.usersService.findOne(id);
    if (!user || user.status !== PortalUserStatus.ACTIVE) {
      throw new UnauthorizedException('User is not active');
    }
    return user;
  }

  async login(email: string, pass: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || user.status !== PortalUserStatus.ACTIVE || !user.password) {
      throw new UnauthorizedException('Invalid credentials or inactive account');
    }

    const isValid = await bcrypt.compare(pass, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.usersService.updateLoginDate(user.id);

    const payload = { sub: user.id, email: user.email, type: 'portal', clientId: user.clientId };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        clientId: user.clientId,
      },
    };
  }
}
