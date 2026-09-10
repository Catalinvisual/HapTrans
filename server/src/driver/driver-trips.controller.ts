import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { DriverTripsService } from './driver-trips.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('driver')
@UseGuards(JwtAuthGuard)
export class DriverTripsController {
  constructor(private service: DriverTripsService) {}

  @Get('trips')
  getMyTrips(@Request() req: any) { return this.service.findMyTrips(req.user.id); }

  @Get('trips/:id')
  getMyTrip(@Request() req: any, @Param('id') id: string) { return this.service.findMyTrip(req.user.id, id); }

  @Patch('trips/:id/status')
  updateStatus(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.service.updateStatus(req.user.id, id, body?.status);
  }

  @Post('trips/:id/pod')
  submitPod(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.service.submitPod(req.user.id, id, body);
  }
}
