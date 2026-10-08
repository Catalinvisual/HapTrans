import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, Request, Req, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlanningService } from './planning.service';
import { PlanningProfile } from './planning-profile.entity';
import { TruckRoutePlan } from './truck-route-plan.entity';
import { RoutePlanStop } from './route-plan-stop.entity';
import { Shipment } from './shipment.entity';

@Controller('planning')
@UseGuards(JwtAuthGuard)
export class PlanningController {
  constructor(private readonly planningService: PlanningService) {}

  private userCompanyId(req: any): string | undefined {
    return req.user?.companyId ?? undefined;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── FLEET-LEVEL PLANNING BOARD ENDPOINTS ──────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('board')
  getBoard(@Request() req: any, @Query() query: any) {
    return this.planningService.getBoard(req.user, query);
  }

  @Get('pool')
  pool(@Request() req: any, @Query() query: any) {
    return this.planningService.pool(req.user, query);
  }

  @Post('orders/validate')
  validateAssignment(@Request() req: any, @Body() body: any) {
    return this.planningService.validateAssignment(req.user, body);
  }

  @Post('orders/validate/:tripId')
  validateOrdersForTrip(@Param('tripId') tripId: string, @Body() body: any) {
    return this.planningService.validateOrdersForTrip(tripId, body.orderIds || []);
  }

  @Post('assign')
  assignOrders(@Request() req: any, @Body() body: any) {
    return this.planningService.assignOrders(req.user, body);
  }

  @Post('unplan')
  unplanOrders(@Request() req: any, @Body() body: any) {
    return this.planningService.unplanOrders(req.user, body);
  }

  @Post('move')
  moveOrder(@Request() req: any, @Body() body: any) {
    return this.planningService.moveOrder(req.user, body);
  }

  @Post('trips/:tripId/reorder')
  reorderStops(@Request() req: any, @Param('tripId') tripId: string, @Body() body: any) {
    return this.planningService.reorderStops(req.user, tripId, body);
  }

  @Post('trips/:tripId/recalculate')
  recalculateTrip(@Param('tripId') tripId: string) {
    return this.planningService.recalculateTrip(tripId);
  }

  @Post('trips/:tripId/auto-order')
  autoOrderStops(@Request() req: any, @Param('tripId') tripId: string) {
    return this.planningService.autoOrderStops(req.user, tripId);
  }

  @Put('trips/:tripId/reorder')
  reorderStopsPut(@Request() req: any, @Param('tripId') tripId: string, @Body() body: any) {
    return this.planningService.reorderStops(req.user, tripId, body);
  }

  @Put('trips/:tripId/recalculate')
  recalculateTripPut(@Param('tripId') tripId: string) {
    return this.planningService.recalculateTrip(tripId);
  }

  @Get('suggestions')
  suggestions(@Request() req: any, @Query() query: any) {
    return this.planningService.suggestions(req.user, query);
  }

  @Post('optimize')
  optimize(@Request() req: any, @Body() body: any) {
    return this.planningService.optimize(req.user, body);
  }

  @Post('optimize/apply')
  applyOptimization(@Request() req: any, @Body() body: any) {
    return this.planningService.applyOptimization(req.user, body);
  }

  @Post('trips/:tripId/status')
  updateTripStatus(@Request() req: any, @Param('tripId') tripId: string, @Body() body: any) {
    return this.planningService.updateTripStatus(req.user, tripId, body);
  }

  @Post('trips/:tripId/validate')
  validateTrip(@Request() req: any, @Param('tripId') tripId: string) {
    return this.planningService.validateTrip(req.user, tripId);
  }

  @Post('trips/:tripId/confirm')
  confirmTrip(@Request() req: any, @Param('tripId') tripId: string, @Body() body?: any) {
    return this.planningService.confirmTrip(req.user, tripId, body);
  }

  @Post('trips/:tripId/reopen')
  reopenPlanning(@Request() req: any, @Param('tripId') tripId: string) {
    return this.planningService.reopenPlanning(req.user, tripId);
  }

  @Post('trips/:tripId/send-to-driver')
  sendToDriver(@Request() req: any, @Param('tripId') tripId: string, @Body() body: any) {
    return this.planningService.sendToDriver(req.user, tripId, body);
  }

  @Post('trips/:tripId/unassign-order')
  unassignOrder(@Request() req: any, @Param('tripId') tripId: string, @Body() body: { orderId: string }) {
    return this.planningService.unassignOrder(req.user, tripId, body.orderId);
  }

  @Post('trips/:tripId/unplan')
  unplanTrip(@Request() req: any, @Param('tripId') tripId: string) {
    return this.planningService.unplanTrip(req.user, tripId);
  }

  @Post('trips/:tripId/driver-received')
  driverReceived(@Param('tripId') tripId: string) {
    return this.planningService.driverReceived(tripId);
  }

  @Post('trips/:tripId/driver-accepted')
  driverAccepted(@Param('tripId') tripId: string) {
    return this.planningService.driverAccepted(tripId);
  }

  @Get('trips/:tripId/route')
  getRoutePlanByTrip(@Request() req: any, @Param('tripId') tripId: string) {
    return this.planningService.getRoutePlanByTrip(tripId, req.user);
  }

  @Post('combine')
  combineTrips(@Request() req: any, @Body() body: any) {
    return this.planningService.combineTrips(req.user, body);
  }

  @Post('trips/:tripId/split')
  splitTrip(@Request() req: any, @Param('tripId') tripId: string, @Body() body: any) {
    return this.planningService.splitTrip(req.user, tripId, body);
  }

  @Get('map')
  getMap(@Request() req: any, @Query() query: any) {
    return this.planningService.getMapData(req.user, query);
  }

  @Get('map-data')
  getMapData(@Request() req: any, @Query() query: any) {
    return this.planningService.getMapData(req.user, query);
  }

  @Get('audit')
  getAudit(@Request() req: any, @Query() query: any) {
    return this.planningService.getAudit(req.user, query);
  }

  @Post('undo')
  undo(@Request() req: any, @Body() body: any) {
    return this.planningService.undo(req.user, body);
  }

  @Get('views')
  getViews(@Request() req: any) {
    return this.planningService.getViews(req.user);
  }

  @Post('views')
  saveView(@Request() req: any, @Body() body: any) {
    return this.planningService.saveView(req.user, body);
  }

  @Patch('views/:id')
  updateView(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.planningService.updateView(req.user, id, body);
  }

  @Delete('views/:id')
  deleteView(@Request() req: any, @Param('id') id: string) {
    return this.planningService.deleteView(req.user, id);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── NEW TRUCK ROUTE & LOAD OPTIMIZER ENDPOINTS ────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('profiles')
  async getProfiles(@Req() req: any): Promise<PlanningProfile[]> {
    return this.planningService.getProfiles(this.userCompanyId(req));
  }

  @Get('profiles/default')
  async getDefaultProfile(@Req() req: any): Promise<PlanningProfile> {
    return this.planningService.getDefaultProfile(this.userCompanyId(req));
  }

  @Post('profiles')
  async createProfile(@Req() req: any, @Body() data: Partial<PlanningProfile>): Promise<PlanningProfile> {
    return this.planningService.createProfile(data);
  }

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
    @Req() req: any,
    @Param('truckId') truckId: string,
    @Param('tripId') tripId: string,
  ): Promise<TruckRoutePlan> {
    return this.planningService.createRoutePlanFromTrip(tripId, this.userCompanyId(req), truckId);
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

  @Post('trucks/:truckId/reset')
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

  @Post('trucks/:truckId/route/reset')
  async resetRoutePlanAlt(
    @Req() req: any,
    @Param('truckId') truckId: string,
    @Body() body: { date?: string },
  ): Promise<TruckRoutePlan> {
    return this.resetRoutePlan(req, truckId, body);
  }

  @Post('trucks/:truckId/reorder')
  async reorderRouteStops(
    @Req() req: any,
    @Param('truckId') truckId: string,
    @Body() body: { date?: string; stopIds: string[] },
  ): Promise<TruckRoutePlan> {
    const planningDate = body.date || new Date().toISOString().split('T')[0];
    const routePlan = await this.planningService.getRoutePlan(truckId, planningDate, this.userCompanyId(req));
    if (!routePlan) {
      throw new NotFoundException('No route plan found for this truck and date');
    }
    return this.planningService.reorderRoutePlanStops(routePlan.id, body.stopIds, this.userCompanyId(req));
  }

  @Post('trucks/:truckId/route/reorder')
  async reorderRouteStopsAlt(
    @Req() req: any,
    @Param('truckId') truckId: string,
    @Body() body: { date?: string; stopIds: string[] },
  ): Promise<TruckRoutePlan> {
    return this.reorderRouteStops(req, truckId, body);
  }

  @Post('trucks/:truckId/validate')
  async validateRoutePlan(
    @Req() req: any,
    @Param('truckId') truckId: string,
    @Body() body: { date?: string },
  ) {
    const planningDate = body.date || new Date().toISOString().split('T')[0];
    return this.planningService.validateRoutePlanForTruck(truckId, planningDate, this.userCompanyId(req));
  }

  @Put('trucks/:truckId/route')
  async saveRoutePlan(
    @Req() req: any,
    @Param('truckId') truckId: string,
    @Body() body: { routePlan: TruckRoutePlan; auditAction?: string },
  ): Promise<TruckRoutePlan> {
    const payload: any = body.routePlan || body;
    if (body.auditAction) payload.auditAction = body.auditAction;
    return this.planningService.saveRoutePlan(payload, this.userCompanyId(req), req.user?.id);
  }

  @Get('trucks/:truckId/actions')
  async getTruckAuditActions(
    @Param('truckId') truckId: string,
    @Query('date') date?: string,
  ) {
    return this.planningService.getAuditActions(truckId, date);
  }

  @Post('routes/:routePlanId/lock-stop')
  async lockStop(
    @Req() req: any,
    @Param('routePlanId') routePlanId: string,
    @Body() body: { stopId: string; lockSequence?: boolean },
  ): Promise<RoutePlanStop> {
    return this.planningService.lockStop(routePlanId, body.stopId, body.lockSequence, this.userCompanyId(req));
  }

  @Post('stops/:stopId/lock')
  async lockStopByStopId(
    @Req() req: any,
    @Param('stopId') stopId: string,
    @Body() body: { routePlanId: string; lockSequence?: boolean },
  ): Promise<RoutePlanStop> {
    return this.planningService.lockStop(body.routePlanId, stopId, body.lockSequence, this.userCompanyId(req));
  }

  @Post('routes/:routePlanId/unlock-stop')
  async unlockStop(
    @Req() req: any,
    @Param('routePlanId') routePlanId: string,
    @Body() body: { stopId: string },
  ): Promise<RoutePlanStop> {
    return this.planningService.unlockStop(routePlanId, body.stopId, this.userCompanyId(req));
  }

  @Post('stops/:stopId/unlock')
  async unlockStopByStopId(
    @Req() req: any,
    @Param('stopId') stopId: string,
    @Body() body: { routePlanId: string },
  ): Promise<RoutePlanStop> {
    return this.planningService.unlockStop(body.routePlanId, stopId, this.userCompanyId(req));
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

  @Post('shipments/from-orders')
  async createShipmentsFromOrders(
    @Body() body: { orderIds: string[] },
  ): Promise<Shipment[]> {
    return this.planningService.createShipmentsFromOrders(body.orderIds || []);
  }
}