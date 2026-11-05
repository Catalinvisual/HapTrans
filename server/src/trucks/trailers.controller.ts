import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { TrailersService } from './trailers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTrailerDto, UpdateTrailerDto } from './dto/trailer.dto';

@Controller('trailers')
@UseGuards(JwtAuthGuard)
export class TrailersController {
  constructor(private service: TrailersService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: CreateTrailerDto, @Req() req: any) { return this.service.create(dto, req.user); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateTrailerDto, @Req() req: any) { return this.service.update(id, dto, req.user); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
