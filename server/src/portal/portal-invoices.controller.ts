import { Controller, Get, UseGuards, Request, Param } from '@nestjs/common';
import { PortalJwtAuthGuard } from '../portal-auth/portal-jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Invoice } from '../invoices/invoice.entity';
import { Repository } from 'typeorm';

@Controller('portal/invoices')
@UseGuards(PortalJwtAuthGuard)
export class PortalInvoicesController {
  constructor(
    @InjectRepository(Invoice) private readonly repo: Repository<Invoice>,
  ) {}

  @Get()
  async findAll(@Request() req: any) {
    const clientId = req.user.client?.id || req.user.clientId;
    return this.repo.find({
      where: { client: { id: clientId } },
      order: { createdAt: 'DESC' },
      relations: ['order'],
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    const clientId = req.user.client?.id || req.user.clientId;
    return this.repo.findOne({
      where: { id, client: { id: clientId } },
      relations: ['order'],
    });
  }
}
