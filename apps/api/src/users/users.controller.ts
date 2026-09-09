import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { createUserSchema, updateUserSchema } from './dto/users.dto';
import type { CreateUserDto, UpdateUserDto } from './dto/users.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Permissions({ action: 'view', subject: 'administration' })
  @ApiOperation({ summary: 'List users' })
  findAll(@CurrentUser() user: any, @Query() query: any) {
    return this.usersService.findAll(user.id, query);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Permissions({ action: 'view', subject: 'administration' })
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.usersService.findOne(user.id, id);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Permissions({ action: 'manage_users', subject: 'administration' })
  @ApiOperation({ summary: 'Create user' })
  create(@CurrentUser() user: any, @Body(new ZodValidationPipe(createUserSchema)) body: CreateUserDto) {
    return this.usersService.create(user.id, body);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Permissions({ action: 'manage_users', subject: 'administration' })
  @ApiOperation({ summary: 'Update user' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body(new ZodValidationPipe(updateUserSchema)) body: UpdateUserDto) {
    return this.usersService.update(user.id, id, body);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Permissions({ action: 'manage_users', subject: 'administration' })
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete user' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.usersService.remove(user.id, id);
  }
}
