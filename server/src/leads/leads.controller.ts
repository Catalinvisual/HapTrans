import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  create(@Body() createLeadDto: CreateLeadDto) {
    return this.leadsService.create(createLeadDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/convert')
  convertToTrip(@Param('id') id: string) {
    return this.leadsService.convertToTrip(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/convert-quote')
  convertToQuote(@Param('id') id: string) {
    return this.leadsService.convertToQuote(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.leadsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLeadDto: UpdateLeadDto) {
    return this.leadsService.update(id, updateLeadDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.leadsService.remove(id);
  }
}
