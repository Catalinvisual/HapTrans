import { Controller, Get, Post, Body, Param, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { PortalJwtAuthGuard } from '../portal-auth/portal-jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from '../orders/order.entity';
import { Repository } from 'typeorm';
import { OrdersService } from '../orders/orders.service';

@Controller('portal/orders')
@UseGuards(PortalJwtAuthGuard)
export class PortalOrdersController {
  constructor(
    @InjectRepository(Order)
    private readonly repo: Repository<Order>,
    private readonly ordersService: OrdersService,
  ) {}

  @Post()
  async create(@Request() req: any, @Body() body: any) {
    const clientId = req.user.client?.id || req.user.clientId;
    // Overwrite any clientId submitted with the authenticated user's clientId
    body.clientId = clientId;
    // We don't pass req.user because OrdersService expects a TMS User, which would fail FK constraints in action_logs
    return this.ordersService.create(body, undefined);
  }

  @Get()
  async findAll(@Request() req: any) {
    const clientId = req.user.client?.id || req.user.clientId;
    return this.repo.find({
      where: { client: { id: clientId } },
      order: { createdAt: 'DESC' },
      relations: ['trip', 'trip.driver', 'trip.truck'],
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    const clientId = req.user.client?.id || req.user.clientId;
    const order = await this.repo.findOne({
      where: { id, client: { id: clientId } },
      relations: ['trip', 'trip.driver', 'trip.truck', 'trip.trailer', 'stops'],
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }
}
