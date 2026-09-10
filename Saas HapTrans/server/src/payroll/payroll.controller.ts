import { Controller, Get, Post, Body, Param, Patch, Query } from '@nestjs/common';
import { PayrollService } from './payroll.service';

@Controller('payrolls')
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
