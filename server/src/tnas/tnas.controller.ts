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

  // ---- BACKUP ENDPOINTS ----
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
}
