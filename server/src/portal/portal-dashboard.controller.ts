import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { PortalJwtAuthGuard } from '../portal-auth/portal-jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from '../orders/order.entity';
import { Invoice, InvoiceStatus } from '../invoices/invoice.entity';
import { Repository, In } from 'typeorm';

@Controller('portal/dashboard')
@UseGuards(PortalJwtAuthGuard)
export class PortalDashboardController {
  constructor(
    @InjectRepository(Order) private readonly ordersRepo: Repository<Order>,
    @InjectRepository(Invoice) private readonly invoicesRepo: Repository<Invoice>,
  ) {}

   @Get('stats')
  async getStats(@Request() req: any) {
    const clientId = req.user.client?.id || req.user.clientId;

    // Calculate Today's Shipments
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeOrders = await this.ordersRepo.count({
      where: { client: { id: clientId }, status: 'in-transit' },
    });

    const totalOrders = await this.ordersRepo.count({
      where: { client: { id: clientId } },
    });

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const completedThisMonth = await this.ordersRepo
      .createQueryBuilder('order')
      .where('order.clientId = :clientId', { clientId })
      .andWhere('order.status IN (:...statuses)', { statuses: ['delivered', 'pod_received'] })
      .andWhere('order.updatedAt >= :startOfMonth', { startOfMonth })
      .getCount();

    const outstandingInvoices = await this.invoicesRepo.find({
      where: { client: { id: clientId }, status: In([InvoiceStatus.SENT, InvoiceStatus.OVERDUE, InvoiceStatus.APPROVED]) },
    });

    const outstandingBalance = outstandingInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);

    // Recent activity: last 6 orders by updatedAt
    const recentActivity = await this.ordersRepo.find({
      where: { client: { id: clientId } },
      order: { updatedAt: 'DESC' },
      take: 6,
      select: ['id', 'orderNumber', 'status', 'updatedAt'],
    });

    return {
      activeOrders,
      outstandingBalance,
      invoicesDue: outstandingInvoices.length,
      totalOrders,
      completedThisMonth,
      recentActivity,
    };
  }
}
