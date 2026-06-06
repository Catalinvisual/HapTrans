import { Controller, Get, Post, Param, Headers, UnauthorizedException } from '@nestjs/common';
import { TnasService } from './tnas.service';

@Controller('tnas')
export class TnasController {
  constructor(private service: TnasService) {}

  private checkKey(auth: string) {
    const key = process.env.TNAS_API_KEY;
    if (!key || auth !== `Bearer ${key}`) {
      throw new UnauthorizedException('Invalid or missing TNAS API KEY');
    }
  }

  @Get('pending')
  getPending(@Headers('authorization') auth: string) {
    this.checkKey(auth);
    return this.service.getPendingFiles();
  }

  @Post(':source/:id/downloaded')
  markDownloaded(
    @Param('source') source: string,
    @Param('id') id: string,
    @Headers('authorization') auth: string
  ) {
    this.checkKey(auth);
    return this.service.markDownloaded(source, id);
  }
}
