import { Injectable } from '@nestjs/common';
import { TripsService } from '../trips/trips.service';
import { TrucksService } from '../trucks/trucks.service';
import { DriversService } from '../drivers/drivers.service';
import { InvoicesService } from '../invoices/invoices.service';
import { OrdersService } from '../orders/orders.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class DashboardService {
  constructor(
    private tripsService: TripsService,
    private trucksService: TrucksService,
    private driversService: DriversService,
    private invoicesService: InvoicesService,
    private ordersService: OrdersService,
    private notificationsService: NotificationsService,
  ) {}

  async getRoleBasedSummary(role: string) {
    if (role === 'dispatcher') {
      return this.getDispatcherSummary();
    } else {
      return this.getManagerSummary(); // Default to Manager for admins/owners
    }
  }

  private async getDispatcherSummary() {
    const allOrders = await this.ordersService.findAll();
    const allTrucks = await this.trucksService.findAll();
    const allTrips = await this.tripsService.findAll();

    const ordersWaiting = allOrders.filter(o => ['draft', 'new', 'planned'].includes(o.status)).length;
    const ordersDelayed = allOrders.filter(o => o.delayMinutes > 30).length;
    
    const trucksAvailable = allTrucks.filter((t: any) => t.status === 'active' || t.status === 'idle').length;
    const tripsActive = allTrips.filter(t => ['started', 'driving', 'loading', 'partially_delivered'].includes(t.status)).length;
    const driversFree = (await this.driversService.findAll()).filter((d: any) => d.status === 'active' || d.status === 'available').length;

    return {
      role: 'dispatcher',
      ordersWaiting,
      ordersDelayed,
      trucksAvailable,
      tripsActive,
      driversFree,
      avgPlanningTime: '15m', // Mocked metric
    };
  }

  private async getManagerSummary() {
    const allOrders = await this.ordersService.findAll();
    const allTrucks = await this.trucksService.findAll();
    const overdueInvoices = await this.invoicesService.getOverdue();
    
    let revenueToday = 0;
    let profitToday = 0;
    let deliveredOrders = 0;
    let onTimeOrders = 0;

    const todayStr = new Date().toISOString().split('T')[0];

    allOrders.forEach(o => {
      // Assuming createdAt or updatedAt for today's revenue (simplified for demo)
      const orderDate = o.createdAt.toISOString().split('T')[0];
      if (orderDate === todayStr) {
        revenueToday += Number(o.price || 0);
        profitToday += Number(o.estimatedProfit || 0);
      }
      
      if (o.status === 'delivered') {
        deliveredOrders++;
        if (o.delayMinutes <= 30) {
          onTimeOrders++;
        }
      }
    });

    const activeTrucks = allTrucks.filter(t => t.status === 'active' || t.status === 'in_trip').length;
    const fleetUtilization = allTrucks.length > 0 ? Math.round((activeTrucks / allTrucks.length) * 100) : 0;
    const onTimeDeliveryRate = deliveredOrders > 0 ? Math.round((onTimeOrders / deliveredOrders) * 100) : 100;

    return {
      role: 'manager',
      revenueToday,
      profitToday,
      fleetUtilization,
      onTimeDeliveryRate,
      invoicesWaiting: overdueInvoices.length,
    };
  }
}
