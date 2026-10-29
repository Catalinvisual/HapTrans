import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// Payroll contains confidential salary data; access requires an
// authenticated user (same standard as settlements and financial modules).
@Controller('payrolls')
@UseGuards(JwtAuthGuard)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get()
  findAll(@Query('month') month?: string, @Query('year') year?: string) {
    return this.payrollService.findAll(month ? parseInt(month) : undefined, year ? parseInt(year) : undefined);
  }

  @Post('generate')
  generate(@Body('month') month: number, @Body('year') year: number) {
    return this.payrollService.generateForMonth(month, year);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateData: any) {
    return this.payrollService.update(id, updateData);
  }
}
