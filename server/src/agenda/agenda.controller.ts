import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AgendaService } from './agenda.service';

@Controller('agenda')
@UseGuards(JwtAuthGuard)
export class AgendaController {
  constructor(private readonly agendaService: AgendaService) {}

  @Get()
  list(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.agendaService.list(req.user, from, to);
  }

  @Post('events')
  create(@Req() req: any, @Body() body: any) {
    return this.agendaService.create(req.user, body);
  }

  @Patch('events/:id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.agendaService.update(req.user, id, body);
  }

  @Delete('events/:id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.agendaService.remove(req.user, id);
  }

  @Patch('invites/:id')
  respond(@Req() req: any, @Param('id') id: string, @Body('status') status: string) {
    return this.agendaService.respond(req.user, id, status);
  }
}
