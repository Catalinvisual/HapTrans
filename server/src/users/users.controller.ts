import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private service: UsersService) {}

  @Get()
  findAll(@Request() req: any) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only administrators can list users.');
    }
    return this.service.findAll();
  }

  @Post()
  create(@Body() dto: CreateUserDto, @Request() req: any) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only administrators can create users.');
    }
    return this.service.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    // Admins can read any profile; users can read their own.
    if (req.user.role !== 'admin' && req.user.id !== id) {
      throw new ForbiddenException('You can only read your own profile.');
    }
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Request() req: any) {
    // Only admin or the user themselves can update their profile
    if (req.user.role !== 'admin' && req.user.id !== id) {
      throw new ForbiddenException('You can only edit your own profile.');
    }
    // Page permissions, roles and activation are administrative decisions.
    // Dropping them here stops a user from granting themselves extra modules
    // through their own profile update.
    if (req.user.role !== 'admin') {
      delete dto.role;
      delete (dto as any).allowedPages;
      delete (dto as any).isActive;
    }
    return this.service.update(id, dto);
  }

  @Post(':id/revoke-sessions')
  revokeSessions(@Param('id') id: string, @Request() req: any) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only administrators can revoke sessions.');
    }
    return this.service.revokeUserSessions(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    // Only admin can delete users
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only administrators can delete users.');
    }
    return this.service.remove(id);
  }
}
