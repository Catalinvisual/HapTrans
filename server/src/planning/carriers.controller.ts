import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlanningService } from './planning.service';

@Controller('carriers')
@UseGuards(JwtAuthGuard)
export class CarriersController {
  constructor(private readonly planningService: PlanningService) {}

  @Get()
  getCarriers(@Request() req: any) {
    return this.planningService.getCarriers(req.user);
  }
}
