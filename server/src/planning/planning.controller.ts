import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, NotFoundException, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlanningService, RouteValidationResult } from './planning.service';
import { PlanningProfile } from './planning-profile.entity';
import { TruckRoutePlan } from './truck-route-plan.entity';
import { RoutePlanStop } from './route-plan-stop.entity';
import { Shipment } from './shipment.entity';
import { PlanningAction } from './planning-action.entity';

@Controller('planning')
@UseGuards(JwtAuthGuard)
export class PlanningController {
  constructor(private readonly planningService: PlanningService) {}

  private userId(@Req() req: any): string | undefined {
    return req.user?.id ?? undefined;
  }

  private userCompanyId(@Req() req: any): string | undefined {
    return req.user?.companyId ?? undefined;
  }

  // ─── Planning Profiles ───

  @Get('profiles')
  async getProfiles(@Req() req: any, @Query('companyId') companyId?: string): Promise<PlanningProfile[]> {
    return this.planningService.getProfiles(this.userCompanyId(req));
  }

  @Get('profiles/default')
  async getDefaultProfile(@Req() req: any, @Query('companyId') companyId?: string): Promise<PlanningProfile> {
    return this.planningService.getDefaultProfile(this.userCompanyId(req));
  }

  @Post('profiles')
  async createProfile(@Req() req: any, @Body() data: Partial<PlanningProfile>): Promise<PlanningProfile> {
    return this.planningService.createProfile(data);
  }

  // ─── Truck Route Plans ───

  @Get('trucks/:truckId/route')
  async getRoutePlan(
    @Req() req: any,
    @Param('truckId') truckId: string,
    @Query('date') date?: string,
  ): Promise<TruckRoutePlan | null> {
    const planningDate = date || new Date().toISOString().split('T')[0];
    return this.planningService.getRoutePlan(truckId, planningDate, this.userCompanyId(req));
  }

  @Post('trucks/:truckId/route')
  async createOrGetRoutePlan(
    @Req() req: any,
    @Param('truckId') truckId: string,
    @Body() body: { date?: string; tripId?: string },
  ): Promise<TruckRoutePlan> {
    const planningDate = body.date || new Date().toISOString().split('T')[0];
    return this.planningService.getOrCreateRoutePlan(truckId, planningDate, body.tripId, this.userCompanyId(req));
  }

  @Post('trucks/:truckId/route/from-trip/:tripId')
  async createRoutePlanFromTrip(
    @Param('truckId') truckId: string,
    @Param('tripId') tripId: string,
  ): Promise<TruckRoutePlan> {
    return this.planningService.createRoutePlanFromTrip(tripId);
  }

  @Post('trucks/:truckId/optimize')
  async optimizeRoutePlan(
    @Req() req: any,
    @Param('truckId') truckId: string,
    @Body() body: { date?: string; profileId?: string },
  ): Promise<TruckRoutePlan> {
    const planningDate = body.date || new Date().toISOString().split('T')[0];
    const routePlan = await this.planningService.getRoutePlan(truckId, planningDate, this.userCompanyId(req));
    
    if (!routePlan) {
      throw new NotFoundException('No route plan found for this truck and date');
    }

    return this.planningService.optimizeRoutePlan(routePlan.id, body.profileId, this.userCompanyId(req));
  }

  @Post('trucks/:truckId/recalculate')
  async recalculateRoutePlan(
    @Req() req: any,
    @Param('truckId') truckId: string,
    @Body() body: { date?: string },
  ): Promise<TruckRoutePlan> {
    const planningDate = body.date || new Date().toISOString().split('T')[0];
    const routePlan = await this.planningService.getRoutePlan(truckId, planningDate, this.userCompanyId(req));
    
    if (!routePlan) {
      throw new NotFoundException('No route plan found for this truck and date');
    }

    return this.planningService.recalculateRoutePlan(routePlan.id, this.userCompanyId(req));
  }

  @Put('trucks/:truckId/route')
  async saveRoutePlan(
    @Req() req: any,
    @Param('truckId') truckId: string,
    @Body() routePlan: TruckRoutePlan & { auditAction?: string },
  ): Promise<TruckRoutePlan> {
    return this.planningService.saveRoutePlan(routePlan, this.userCompanyId(req), this.userId(req));
  }

  @Post('trucks/:truckId/validate')
  async validateRoutePlan(
    @Req() req: any,
    @Param('truckId') truckId: string,
    @Body() body: { date?: string },
  ): Promise<RouteValidationResult> {
    const planningDate = body.date || new Date().toISOString().split('T')[0];
    return this.planningService.validateRoutePlanForTruck(truckId, planningDate, this.userCompanyId(req));
  }

  @Get('trucks/:truckId/actions')
  async getAuditActions(
    @Req() req: any,
    @Param('truckId') truckId: string,
    @Query('date') date?: string,
  ): Promise<PlanningAction[]> {
    await this.planningService.getRoutePlan(truckId, date || new Date().toISOString().split('T')[0], this.userCompanyId(req));
    return this.planningService.getAuditActions(truckId, date);
  }

  @Post('trucks/:truckId/route/reorder')
  async reorderStops(
    @Req() req: any,
    @Param('truckId') truckId: string,
    @Body() body: { date?: string; stopIds: string[] },
  ): Promise<TruckRoutePlan> {
    const planningDate = body.date || new Date().toISOString().split('T')[0];
    const routePlan = await this.planningService.getRoutePlan(truckId, planningDate, this.userCompanyId(req));
    
    if (!routePlan) {
      throw new NotFoundException('No route plan found for this truck and date');
    }

    return this.planningService.reorderStops(routePlan.id, body.stopIds, this.userCompanyId(req));
  }

  @Post('trucks/:truckId/route/reset')
  async resetRoutePlan(
    @Req() req: any,
    @Param('truckId') truckId: string,
    @Body() body: { date?: string },
  ): Promise<TruckRoutePlan> {
    const planningDate = body.date || new Date().toISOString().split('T')[0];
    const routePlan = await this.planningService.getRoutePlan(truckId, planningDate, this.userCompanyId(req));
    
    if (!routePlan) {
      throw new NotFoundException('No route plan found for this truck and date');
    }

    return this.planningService.resetRoutePlan(routePlan.id, this.userCompanyId(req));
  }

  @Post('stops/:stopId/lock')
  async lockStop(
    @Req() req: any,
    @Param('stopId') stopId: string,
    @Body() body: { routePlanId: string; lockSequence?: boolean },
  ): Promise<RoutePlanStop> {
    return this.planningService.lockStop(body.routePlanId, stopId, body.lockSequence, this.userCompanyId(req));
  }

  @Post('stops/:stopId/unlock')
  async unlockStop(
    @Req() req: any,
    @Param('stopId') stopId: string,
    @Body() body: { routePlanId: string },
  ): Promise<RoutePlanStop> {
    return this.planningService.unlockStop(body.routePlanId, stopId, this.userCompanyId(req));
  }

  // ─── Shipments ───

  @Post('shipments/from-orders')
  async createShipmentsFromOrders(
    @Req() req: any,
    @Body() body: { orderIds: string[] },
  ): Promise<Shipment[]> {
    return this.planningService.createShipmentsFromOrders(body.orderIds);
  }

  @Post('shipments/:shipmentId/lock')
  async lockShipment(
    @Req() req: any,
    @Param('shipmentId') shipmentId: string,
  ): Promise<Shipment> {
    return this.planningService.lockShipment(shipmentId, this.userCompanyId(req));
  }

  @Post('shipments/:shipmentId/unlock')
  async unlockShipment(
    @Req() req: any,
    @Param('shipmentId') shipmentId: string,
  ): Promise<Shipment> {
    return this.planningService.unlockShipment(shipmentId, this.userCompanyId(req));
  }
}