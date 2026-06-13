import { Controller, Get, Patch, Delete, Param, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private service: UsersService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Request() req: any) {
    // Only admin or the user themselves can update their profile
    if (req.user.role !== 'admin' && req.user.id !== id) {
      throw new ForbiddenException('You can only edit your own profile.');
    }
    // Only admin can change roles
    if (dto.role && req.user.role !== 'admin') {
      delete dto.role;
    }
    return this.service.update(id, dto);
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
