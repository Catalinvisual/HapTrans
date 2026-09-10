import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, EntityManager } from "typeorm";
import { Payment } from "./payment.entity";
import { Invoice, InvoiceStatus } from "../invoices/invoice.entity";

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
    @InjectRepository(Invoice) private invoiceRepo: Repository<Invoice>,
    private readonly manager: EntityManager
  ) {}

  async findByInvoice(invoiceId: string) {
    return this.paymentRepo.find({
      where: { invoice: { id: invoiceId } },
      order: { date: "DESC" }
    });
  }

  async createPayment(invoiceId: string, dto: { date: string; method: string; amount: number; reference?: string }) {
    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId },
      relations: ["payments"]
    });
    if (!invoice) throw new BadRequestException("Factură nu a fost găsită");

    const totalPaid = (invoice.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
    const remaining = Number(invoice.total) - totalPaid;
    const amount = Number(dto.amount);
    if (amount <= 0) throw new BadRequestException("Suma trebuie să fie pozitivă");
    if (amount > remaining + 0.01) throw new BadRequestException("Suma depășește restul de plată (" + remaining.toFixed(2) + " EUR)");

    const payment = await this.manager.create(Payment, {
      invoice: { id: invoice.id },
      date: dto.date ? new Date(dto.date) : new Date(),
      method: dto.method,
      amount: Number(dto.amount),
      reference: dto.reference,
      status: "completed"
    });
    await this.manager.save(Payment, payment);

    // Recalculate
    const updated = await this.invoiceRepo.findOne({ where: { id: invoice.id }, relations: ["payments"] });
    if (updated) {
      const newTotalPaid = (updated.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
      const newRemaining = Number(invoice.total) - newTotalPaid;
      if (newRemaining <= 0.01) {
        await this.invoiceRepo.update(invoice.id, { status: "paid" as any });
      }
    }

    return this.findByInvoice(invoice.id);
  }

  async removePayment(paymentId: string) {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId }, relations: ["invoice"] });
    if (!payment) throw new BadRequestException("Plată nu a fost găsită");
    const invoiceId = payment.invoice.id;
    await this.paymentRepo.remove(payment);

    const invoice = await this.invoiceRepo.findOne({ where: { id: payment.invoice.id }, relations: ["payments"] });
    if (invoice) {
      const totalPaid = (invoice.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
      if (Number(invoice.total) - totalPaid > 0.01) {
        await this.invoiceRepo.update(invoice.id, { status: "sent" as any });
      }
    }
    return this.findByInvoice(payment.invoice.id);
  }
}
