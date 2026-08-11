import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { PlanningService } from './planning.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('planning')
@UseGuards(JwtAuthGuard)
export class PlanningController {
  constructor(private readonly planningService: PlanningService) {}

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

  @Post('trips/:tripId/confirm')
  confirmTrip(@Request() req: any, @Param('tripId') tripId: string) {
    return this.planningService.confirmTrip(req.user, tripId);
  }

  @Post('trips/:tripId/send-to-driver')
  sendToDriver(@Request() req: any, @Param('tripId') tripId: string, @Body() body: any) {
    return this.planningService.sendToDriver(req.user, tripId, body);
  }

  @Post('combine')
  combineTrips(@Request() req: any, @Body() body: any) {
    return this.planningService.combineTrips(req.user, body);
  }

  @Post('trips/:tripId/split')
  splitTrip(@Request() req: any, @Param('tripId') tripId: string, @Body() body: any) {
    return this.planningService.splitTrip(req.user, tripId, body);
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
}
