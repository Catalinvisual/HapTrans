
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Payment } from "./payment.entity";
import { Invoice } from "../invoices/invoice.entity";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { InvoicesModule } from "../invoices/invoices.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Invoice]),
  ],
  controllers: [],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
