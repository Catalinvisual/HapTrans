import { Controller, Get, Post, Param, Headers, UnauthorizedException } from '@nestjs/common';
import { TnasService } from './tnas.service';

@Controller('tnas')
export class TnasController {
  constructor(private service: TnasService) {}

  private checkKey(auth: string) {
    const key = process.env.TNAS_API_KEY;
    if (!key || auth !== `Bearer ${key}`) {
      throw new UnauthorizedException('Invalid or missing TNAS API KEY');
    }
  }

  @Get('pending')
  getPending(@Headers('authorization') auth: string) {
    this.checkKey(auth);
    return this.service.getPendingFiles();
  }

  @Post(':source/:id/downloaded')
  markDownloaded(
    @Param('source') source: string,
    @Param('id') id: string,
    @Headers('authorization') auth: string
  ) {
    this.checkKey(auth);
    return this.service.markDownloaded(source, id);
  }

  // ---- BACKUP ENDPOINTS (LEGACY WORKBOOKS) ----
  @Get('backup/health')
  backupHealth(@Headers('authorization') auth: string) {
    this.checkKey(auth);
    return this.service.backupHealth();
  }

  @Get('backup/trips')
  backupTrips(@Headers('authorization') auth: string) {
    this.checkKey(auth);
    return this.service.backupTrips();
  }

  @Get('backup/trucks')
  backupTrucks(@Headers('authorization') auth: string) {
    this.checkKey(auth);
    return this.service.backupTrucks();
  }

  @Get('backup/drivers')
  backupDrivers(@Headers('authorization') auth: string) {
    this.checkKey(auth);
    return this.service.backupDrivers();
  }

  @Get('backup/clients')
  backupClients(@Headers('authorization') auth: string) {
    this.checkKey(auth);
    return this.service.backupClients();
  }

  @Get('backup/maintenance')
  backupMaintenance(@Headers('authorization') auth: string) {
    this.checkKey(auth);
    return this.service.backupMaintenance();
  }

  @Get('backup/users')
  backupUsers(@Headers('authorization') auth: string) {
    this.checkKey(auth);
    return this.service.backupUsers();
  }

  @Get('backup/invoices')
  backupInvoices(@Headers('authorization') auth: string) {
    this.checkKey(auth);
    return this.service.backupInvoices();
  }

  @Get('backup/expenses')
  backupExpenses(@Headers('authorization') auth: string) {
    this.checkKey(auth);
    return this.service.backupExpenses();
  }

  // ---- BACKUP ENDPOINTS (COMPREHENSIVE MULTI-SHEET MODULES) ----
  @Get('backup/orders')
  backupOrders(@Headers('authorization') auth: string) {
    this.checkKey(auth);
    return this.service.backupOrders();
  }

  @Get('backup/fleet-equipment')
  backupFleetEquipment(@Headers('authorization') auth: string) {
    this.checkKey(auth);
    return this.service.backupFleetEquipment();
  }

  @Get('backup/planning')
  backupPlanning(@Headers('authorization') auth: string) {
    this.checkKey(auth);
    return this.service.backupPlanning();
  }

  @Get('backup/commercial')
  backupCommercial(@Headers('authorization') auth: string) {
    this.checkKey(auth);
    return this.service.backupCommercial();
  }

  @Get('backup/finance-payroll')
  backupFinancePayroll(@Headers('authorization') auth: string) {
    this.checkKey(auth);
    return this.service.backupFinancePayroll();
  }

  @Get('backup/documents-registry')
  backupDocumentsRegistry(@Headers('authorization') auth: string) {
    this.checkKey(auth);
    return this.service.backupDocumentsRegistry();
  }

  @Get('backup/website-cms')
  backupWebsiteCms(@Headers('authorization') auth: string) {
    this.checkKey(auth);
    return this.service.backupWebsiteCms();
  }

  @Get('backup/system-governance')
  backupSystemGovernance(@Headers('authorization') auth: string) {
    this.checkKey(auth);
    return this.service.backupSystemGovernance();
  }
}
