import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, NotFoundException } from '@nestjs/common';
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

  // ─── Planning Profiles ───

  @Get('profiles')
  async getProfiles(@Query('companyId') companyId?: string): Promise<PlanningProfile[]> {
    return this.planningService.getProfiles(companyId);
  }

  @Get('profiles/default')
  async getDefaultProfile(@Query('companyId') companyId?: string): Promise<PlanningProfile> {
    return this.planningService.getDefaultProfile(companyId);
  }

  @Post('profiles')
  async createProfile(@Body() data: Partial<PlanningProfile>): Promise<PlanningProfile> {
    return this.planningService.createProfile(data);
  }

  // ─── Truck Route Plans ───

  @Get('trucks/:truckId/route')
  async getRoutePlan(
    @Param('truckId') truckId: string,
    @Query('date') date?: string,
  ): Promise<TruckRoutePlan | null> {
    const planningDate = date || new Date().toISOString().split('T')[0];
    return this.planningService.getRoutePlan(truckId, planningDate);
  }

  @Post('trucks/:truckId/route')
  async createOrGetRoutePlan(
    @Param('truckId') truckId: string,
    @Body() body: { date?: string; tripId?: string },
  ): Promise<TruckRoutePlan> {
    const planningDate = body.date || new Date().toISOString().split('T')[0];
    return this.planningService.getOrCreateRoutePlan(truckId, planningDate, body.tripId);
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
    @Param('truckId') truckId: string,
    @Body() body: { date?: string; profileId?: string },
  ): Promise<TruckRoutePlan> {
    const planningDate = body.date || new Date().toISOString().split('T')[0];
    const routePlan = await this.planningService.getRoutePlan(truckId, planningDate);
    
    if (!routePlan) {
      throw new NotFoundException('No route plan found for this truck and date');
    }

    return this.planningService.optimizeRoutePlan(routePlan.id, body.profileId);
  }

  @Post('trucks/:truckId/recalculate')
  async recalculateRoutePlan(
    @Param('truckId') truckId: string,
    @Body() body: { date?: string },
  ): Promise<TruckRoutePlan> {
    const planningDate = body.date || new Date().toISOString().split('T')[0];
    const routePlan = await this.planningService.getRoutePlan(truckId, planningDate);
    
    if (!routePlan) {
      throw new NotFoundException('No route plan found for this truck and date');
    }

    return this.planningService.recalculateRoutePlan(routePlan.id);
  }

  @Put('trucks/:truckId/route')
  async saveRoutePlan(
    @Param('truckId') truckId: string,
    @Body() routePlan: TruckRoutePlan & { auditAction?: string },
  ): Promise<TruckRoutePlan> {
    return this.planningService.saveRoutePlan(routePlan, routePlan.auditAction);
  }

  @Post('trucks/:truckId/validate')
  async validateRoutePlan(
    @Param('truckId') truckId: string,
    @Body() body: { date?: string },
  ): Promise<RouteValidationResult> {
    const planningDate = body.date || new Date().toISOString().split('T')[0];
    return this.planningService.validateRoutePlanForTruck(truckId, planningDate);
  }

  @Get('trucks/:truckId/actions')
  async getAuditActions(
    @Param('truckId') truckId: string,
    @Query('date') date?: string,
  ): Promise<PlanningAction[]> {
    return this.planningService.getAuditActions(truckId, date);
  }

  @Post('trucks/:truckId/route/reorder')
  async reorderStops(
    @Param('truckId') truckId: string,
    @Body() body: { date?: string; stopIds: string[] },
  ): Promise<TruckRoutePlan> {
    const planningDate = body.date || new Date().toISOString().split('T')[0];
    const routePlan = await this.planningService.getRoutePlan(truckId, planningDate);
    
    if (!routePlan) {
      throw new NotFoundException('No route plan found for this truck and date');
    }

    return this.planningService.reorderStops(routePlan.id, body.stopIds);
  }

  @Post('trucks/:truckId/route/reset')
  async resetRoutePlan(
    @Param('truckId') truckId: string,
    @Body() body: { date?: string },
  ): Promise<TruckRoutePlan> {
    const planningDate = body.date || new Date().toISOString().split('T')[0];
    const routePlan = await this.planningService.getRoutePlan(truckId, planningDate);
    
    if (!routePlan) {
      throw new NotFoundException('No route plan found for this truck and date');
    }

    return this.planningService.resetRoutePlan(routePlan.id);
  }

  @Post('stops/:stopId/lock')
  async lockStop(
    @Param('stopId') stopId: string,
    @Body() body: { routePlanId: string; lockSequence?: boolean },
  ): Promise<RoutePlanStop> {
    return this.planningService.lockStop(body.routePlanId, stopId, body.lockSequence);
  }

  @Post('stops/:stopId/unlock')
  async unlockStop(
    @Param('stopId') stopId: string,
    @Body() body: { routePlanId: string },
  ): Promise<RoutePlanStop> {
    return this.planningService.unlockStop(body.routePlanId, stopId);
  }

  // ─── Shipments ───

  @Post('shipments/from-orders')
  async createShipmentsFromOrders(
    @Body() body: { orderIds: string[] },
  ): Promise<Shipment[]> {
    return this.planningService.createShipmentsFromOrders(body.orderIds);
  }

  @Post('shipments/:shipmentId/lock')
  async lockShipment(
    @Param('shipmentId') shipmentId: string,
  ): Promise<Shipment> {
    return this.planningService.lockShipment(shipmentId);
  }

  @Post('shipments/:shipmentId/unlock')
  async unlockShipment(
    @Param('shipmentId') shipmentId: string,
  ): Promise<Shipment> {
    return this.planningService.unlockShipment(shipmentId);
  }
}