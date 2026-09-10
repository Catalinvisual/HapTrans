import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { SettlementsService } from './settlements.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('settlements')
@UseGuards(JwtAuthGuard)
export class SettlementsController {
  constructor(private service: SettlementsService) {}

  @Get() findAll(@Query('month') month?: number, @Query('year') year?: number) {
    return this.service.findAll(month ? Number(month) : undefined, year ? Number(year) : undefined);
  }

  @Post('generate') generate(@Body() body: { driverId: string; month: number; year: number; payMode?: string; payRate?: number }) {
    return this.service.generate(body.driverId, Number(body.month), Number(body.year), {
      payMode: body.payMode,
      payRate: body.payRate,
    });
  }

  @Patch(':id') update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Delete(':id') remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
