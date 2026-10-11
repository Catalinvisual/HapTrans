import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArchivedPdf } from './archived-pdf.entity';
import { PdfArchivingService } from './pdf-archiving.service';
import { PdfArchivingController } from './pdf-archiving.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ArchivedPdf])],
  controllers: [PdfArchivingController],
  providers: [PdfArchivingService],
  exports: [PdfArchivingService],
})
export class PdfArchivingModule {}
