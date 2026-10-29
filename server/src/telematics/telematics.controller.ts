import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../users/user.entity';
import { TelematicsService } from './services/telematics.service';
import { TachographSimulatorService } from './services/tachograph-simulator.service';
import { ProviderConfig } from './interfaces/tachograph-provider.interface';

@Controller('telematics')
export class TelematicsController {
  constructor(
    private telematicsService: TelematicsService,
    private simulatorService: TachographSimulatorService,
  ) {}

  // 1. Test Connection (admin-only: touches provider credentials)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('test-connection')
  testConnection(@Body() config: any) {
    return this.telematicsService.testConnection(config);
  }

  // 2. Get All Telematics Connections
  @UseGuards(JwtAuthGuard)
  @Get()
  getAllConnections() {
    return this.telematicsService.getAllTelematicsConnections();
  }

  // 3. Save / Activate Telematics Connection (admin-only: writes credentials)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('save-connection')
  saveConnection(@Request() req: any, @Body() dto: any) {
    return this.telematicsService.saveTelematicsConnection(req.user, dto);
  }

  // 4. Truck-specific Telematics & Tachograph View
  @UseGuards(JwtAuthGuard)
  @Get('trucks/:truckId')
  getTruckDetails(@Param('truckId') truckId: string) {
    return this.telematicsService.getTruckTelematicsDetails(truckId);
  }

  // 5. Fleet Tachograph Overview
  @UseGuards(JwtAuthGuard)
  @Get('tachograph/fleet')
  getFleetTachograph() {
    return this.telematicsService.getFleetTachographOverview();
  }

  // 6. Simulator Endpoints — admin-only: simulator data must never be
  // confusable with real telemetry by regular users (dev/test usage only).
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('simulator/trucks')
  getSimulatedTrucks() {
    return this.simulatorService.getAllSimulatedTrucks();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('simulator/:truckId/activity')
  setSimActivity(@Param('truckId') truckId: string, @Body() body: { activity: string }) {
    this.simulatorService.setActivity(truckId, body.activity);
    return { success: true, activity: body.activity };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('simulator/:truckId/scenario')
  triggerScenario(@Param('truckId') truckId: string, @Body() body: { scenarioId: number }) {
    this.simulatorService.triggerScenario(truckId, body.scenarioId);
    return { success: true, scenarioId: body.scenarioId };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('simulator/:truckId/speed')
  setSimSpeed(@Param('truckId') truckId: string, @Body() body: { speed: number }) {
    this.simulatorService.setSpeed(truckId, body.speed);
    return { success: true, speed: body.speed };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('simulator/:truckId/timescale')
  setTimeScale(@Param('truckId') truckId: string, @Body() body: { scale: number }) {
    this.simulatorService.setTimeScale(truckId, body.scale);
    return { success: true, scale: body.scale };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('simulator/:truckId/driver')
  setDriver(@Param('truckId') truckId: string, @Body() body: { driverId: string; driverName: string }) {
    this.simulatorService.setDriver(truckId, body.driverId, body.driverName);
    return { success: true, driverName: body.driverName };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('simulator/:truckId/disconnect')
  simulateDisconnect(@Param('truckId') truckId: string) {
    this.simulatorService.simulateConnectionLoss(truckId);
    return { success: true, status: 'OFFLINE' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('simulator/:truckId/reconnect')
  simulateReconnect(@Param('truckId') truckId: string) {
    this.simulatorService.simulateReconnect(truckId);
    return { success: true, status: 'LIVE' };
  }

  // 7. Mobile Driver App Telematics
  @UseGuards(JwtAuthGuard)
  @Get('mobile/my-truck')
  getMyTruck(@Request() req: any) {
    return this.telematicsService.getMyTruckForMobile(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mobile/my-tachograph')
  getMyTachograph(@Request() req: any) {
    return this.telematicsService.getMyTruckForMobile(req.user);
  }
}
