import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PortalAuthService } from './portal-auth.service';

@Injectable()
export class PortalJwtStrategy extends PassportStrategy(Strategy, 'portal-jwt') {
  constructor(config: ConfigService, private authService: PortalAuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_SECRET') as string,
    });
  }

  async validate(payload: any) {
    if (payload.type !== 'portal') {
      throw new UnauthorizedException('Invalid token type');
    }
    return this.authService.validateUser(payload.sub);
  }
}
