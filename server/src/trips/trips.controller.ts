
import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query, Request, UseInterceptors, UploadedFile } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { TripsService } from "./trips.service";
import { TripScannerService } from "./trip-scanner.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateTripDto } from "./dto/create-trip.dto";
import { UpdateTripDto } from "./dto/update-trip.dto";

@Controller("trips")
@UseGuards(JwtAuthGuard)
export class TripsController {
  constructor(
    private service: TripsService,
    private scanner: TripScannerService,
  ) {}

  @Get() findAll(@Query("status") status?: string) { return this.service.findAll(status); }

  @Get("driver/trips")
  findDriverTrips(@Request() req: any) {
    return this.service.findForDriver(req.user);
  }

  @Post(":id/report-issue")
  reportIssue(@Param("id") id: string, @Body() body: any, @Request() req: any) {
    return this.service.reportIssue(id, req.user, body);
  }

  @Post(":id/report-delay")
  reportDelay(@Param("id") id: string, @Body() body: any, @Request() req: any) {
    return this.service.reportDelay(id, req.user, body);
  }

  @Post(":id/pod")
  savePod(@Param("id") id: string, @Body() body: any, @Request() req: any) {
    return this.service.savePod(id, req.user, body);
  }

  @Post("migrate-legacy") 
  migrateLegacy() { return this.service.migrateLegacyTrips(); }

  @Get("stats") getStats(@Query("month") m: number, @Query("year") y: number) { return this.service.getStats(m, y); }
  @Get("monthly-profits") getMonthly() { return this.service.getMonthlyProfits(); }
  @Get("ifta-report") getIftaReport(@Query("from") from?: string, @Query("to") to?: string) { return this.service.getIftaReport(from, to); }
  @Get(":id") findOne(@Param("id") id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: CreateTripDto, @Request() req: any) { return this.service.create(dto, req.user); }
  @Patch(":id") update(@Param("id") id: string, @Body() dto: UpdateTripDto, @Request() req: any) { return this.service.update(id, dto, req.user); }
  @Delete(":id") remove(@Param("id") id: string) { return this.service.remove(id); }
  @Get("debug/:ref") async getDebug(@Param("ref") ref: string) { return this.service.findOneByRef(ref); }
  @Post("scan")
  @UseInterceptors(FileInterceptor("file"))
  scanFile(@UploadedFile() file: Express.Multer.File) {
    return this.scanner.scanTripDocument(file.buffer, file.mimetype);
  }

  @Post("import")
  @UseInterceptors(FileInterceptor("file"))
  async importRateConfirmation(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    const extracted = await this.scanner.scanTripDocument(file.buffer, file.mimetype);
    return this.service.createFromScan(extracted, req.user);
  }

  @Post(":id/costs") addCost(@Param("id") id: string, @Body() dto: any) { return this.service.addCost(id, dto); }

  @Post(":id/assign-orders")
  assignOrders(@Param("id") id: string, @Body() body: { orderIds: string[] }) {
    return this.service.assignOrders(id, body.orderIds);
  }

  @Post(":id/optimize")
  optimizeRoute(@Param("id") id: string) {
    return this.service.optimizeRoute(id);
  }

  @Patch("stops/:stopId/status")
  updateStopStatus(@Param("stopId") stopId: string, @Body() body: any) {
    return this.service.updateStopStatus(stopId, body.status);
  }

  @Patch("tasks/:taskId/status")
  updateTaskStatus(@Param("taskId") taskId: string, @Body() body: any) {
    return this.service.updateTaskStatus(taskId, body.status);
  }

  @Post(":id/stops")
  createStop(@Param("id") id: string, @Body() dto: any) {
    return this.service.createStop(id, dto);
  }

  @Patch("stops/:stopId")
  updateStop(@Param("stopId") stopId: string, @Body() dto: any) {
    return this.service.updateStop(stopId, dto);
  }

  @Delete("stops/:stopId")
  deleteStop(@Param("stopId") stopId: string) {
    return this.service.deleteStop(stopId);
  }

  @Post("stops/:stopId/tasks")
  createTask(@Param("stopId") stopId: string, @Body() dto: any) {
    return this.service.createTask(stopId, dto);
  }

  @Patch("tasks/:taskId")
  updateTask(@Param("taskId") taskId: string, @Body() dto: any) {
    return this.service.updateTask(taskId, dto);
  }
}
