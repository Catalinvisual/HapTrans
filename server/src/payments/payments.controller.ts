
import { Controller, Get, Post, Delete, Param, Body, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PaymentsService } from "./payments.service";

@Controller("invoices")
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get(":id/payments")
  async findByInvoice(@Param("id") id: string) {
    return this.paymentsService.findByInvoice(id);
  }

  @Post(":id/payments")
  async createPayment(@Param("id") id: string, @Body() dto: { date: string; method: string; amount: number; reference?: string }) {
    return this.paymentsService.createPayment(id, dto);
  }

  @Delete("payments/:id")
  async removePayment(@Param("id") id: string) {
    return this.paymentsService.removePayment(id);
  }
}
