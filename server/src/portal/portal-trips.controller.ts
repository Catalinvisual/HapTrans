import { Controller, Get, UseGuards, Request, Param } from '@nestjs/common';
import { PortalJwtAuthGuard } from '../portal-auth/portal-jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Trip } from '../trips/trip.entity';
import { Repository } from 'typeorm';

@Controller('portal/trips')
@UseGuards(PortalJwtAuthGuard)
export class PortalTripsController {
  constructor(
    @InjectRepository(Trip) private readonly repo: Repository<Trip>,
  ) {}

  @Get()
  async findAll(@Request() req) {
    const clientId = req.user.client?.id || req.user.clientId;
    // We only want trips that have an order belonging to this client.
    // We can use query builder for this.
    return this.repo.createQueryBuilder('trip')
      .innerJoinAndSelect('trip.orders', 'order')
      .innerJoin('order.client', 'client', 'client.id = :clientId', { clientId })
      .leftJoinAndSelect('trip.driver', 'driver')
      .leftJoinAndSelect('trip.truck', 'truck')
      .leftJoinAndSelect('trip.trailer', 'trailer')
      .orderBy('trip.createdAt', 'DESC')
      .getMany();
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    const clientId = req.user.client?.id || req.user.clientId;
    return this.repo.createQueryBuilder('trip')
      .innerJoinAndSelect('trip.orders', 'order')
      .innerJoin('order.client', 'client', 'client.id = :clientId', { clientId })
      .leftJoinAndSelect('trip.driver', 'driver')
      .leftJoinAndSelect('trip.truck', 'truck')
      .leftJoinAndSelect('trip.trailer', 'trailer')
      .leftJoinAndSelect('trip.locations', 'location')
      .where('trip.id = :id', { id })
      .getOne();
  }
}
