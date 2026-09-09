import { Controller, Get, Post, Patch, Delete, Query, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomersService } from './services/customers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersSchema,
} from './dto';
import type { CreateCustomerDto, UpdateCustomerDto, ListCustomersDto } from './dto';

@ApiTags('customers')
@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Get()
  @Permissions({ action: 'view', subject: 'customers' })
  @ApiOperation({ summary: 'List customers' })
  async list(@CurrentUser() user: any, @Query() query: ListCustomersDto) {
    const ctx = listCustomersSchema.parse(query ?? {});
    const context = await this.service.getUserContext(user.id);
    return this.service.listCustomers(context, ctx);
  }

  @Get(':id')
  @Permissions({ action: 'view', subject: 'customers' })
  @ApiOperation({ summary: 'Get customer detail' })
  async getOne(@CurrentUser() user: any, @Param('id') id: string) {
    const context = await this.service.getUserContext(user.id);
    return this.service.getCustomer(context, id);
  }

  @Post()
  @Permissions({ action: 'manage', subject: 'customers' })
  @ApiOperation({ summary: 'Create customer' })
  async create(@CurrentUser() user: any, @Body(new ZodValidationPipe(createCustomerSchema)) body: CreateCustomerDto) {
    const context = await this.service.getUserContext(user.id);
    return this.service.createCustomer(context, body);
  }

  @Patch(':id')
  @Permissions({ action: 'manage', subject: 'customers' })
  @ApiOperation({ summary: 'Update customer' })
  async update(@CurrentUser() user: any, @Param('id') id: string, @Body(new ZodValidationPipe(updateCustomerSchema)) body: UpdateCustomerDto) {
    const context = await this.service.getUserContext(user.id);
    return this.service.updateCustomer(context, id, body);
  }

  @Post(':id/activate')
  @Permissions({ action: 'manage', subject: 'customers' })
  @ApiOperation({ summary: 'Activate customer' })
  async activate(@CurrentUser() user: any, @Param('id') id: string) {
    const context = await this.service.getUserContext(user.id);
    return this.service.activateCustomer(context, id);
  }

  @Post(':id/deactivate')
  @Permissions({ action: 'manage', subject: 'customers' })
  @ApiOperation({ summary: 'Deactivate customer' })
  async deactivate(@CurrentUser() user: any, @Param('id') id: string) {
    const context = await this.service.getUserContext(user.id);
    return this.service.deactivateCustomer(context, id);
  }

  @Post(':id/archive')
  @Permissions({ action: 'manage', subject: 'customers' })
  @ApiOperation({ summary: 'Archive customer' })
  async archive(@CurrentUser() user: any, @Param('id') id: string) {
    const context = await this.service.getUserContext(user.id);
    return this.service.archiveCustomer(context, id);
  }

  @Get(':id/360')
  @Permissions({ action: 'view', subject: 'customers' })
  @ApiOperation({ summary: 'Customer 360 view' })
  async get360(@CurrentUser() user: any, @Param('id') id: string) {
    const context = await this.service.getUserContext(user.id);
    return this.service.getCustomer360(context, id);
  }

  @Get(':id/tags')
  @Permissions({ action: 'view', subject: 'customers' })
  @ApiOperation({ summary: 'List customer tags' })
  async listTags(@CurrentUser() user: any, @Param('id') id: string) {
    const context = await this.service.getUserContext(user.id);
    return this.service.listCustomerTags(context, id);
  }

  @Post(':id/tags')
  @Permissions({ action: 'manage', subject: 'customers' })
  @ApiOperation({ summary: 'Assign tag to customer' })
  async assignTag(@CurrentUser() user: any, @Param('id') id: string, @Body('tagId') tagId: string) {
    const context = await this.service.getUserContext(user.id);
    return this.service.assignTag(context, id, tagId);
  }

  @Delete(':id/tags/:tagId')
  @Permissions({ action: 'manage', subject: 'customers' })
  @ApiOperation({ summary: 'Remove tag from customer' })
  async removeTag(@CurrentUser() user: any, @Param('id') id: string, @Param('tagId') tagId: string) {
    const context = await this.service.getUserContext(user.id);
    return this.service.removeTag(context, id, tagId);
  }
}
