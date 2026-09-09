import { Controller, Get, Post, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { ContactService } from './contact.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  async createMessage(@Body() body: any) {
    return this.contactService.create(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getMessages() {
    return this.contactService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/read')
  async markRead(@Param('id') id: string) {
    return this.contactService.markAsRead(id);
  }
}
