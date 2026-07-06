import { Injectable } from '@nestjs/common';
import { TripsService } from '../trips/trips.service';
import { TrucksService } from '../trucks/trucks.service';
import { DriversService } from '../drivers/drivers.service';
import { InvoicesService } from '../invoices/invoices.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class DashboardService {
  constructor(
    private tripsService: TripsService,
    private trucksService: TrucksService,
    private driversService: DriversService,
    private invoicesService: InvoicesService,
    private notificationsService: NotificationsService,
  ) {}

  async getSummary() {
    const [stats, monthlyProfits, trucks, overdueInvoices, expiringTruckDocs, expiringDriverDocs, allTrips] = await Promise.all([
      this.tripsService.getStats(),
      this.tripsService.getMonthlyProfits(),
      this.trucksService.findAll(),
      this.invoicesService.getOverdue(),
      this.trucksService.getExpiringDocuments(30),
      this.driversService.getExpiringDocuments(30),
      this.tripsService.findAllForDashboard(),
    ]);
    const activeTrucks = trucks.filter(t => t.status === 'active' || t.status === 'in_trip').length;

    const routeProfits: Record<string, number> = {};
    const clientProfits: Record<string, { name: string, profit: number }> = {};

    allTrips.forEach(t => {
      // Using new Actual Profit
      const tripProfit = Number(t.actualProfit) || Number(t.estimatedProfit) || 0;

      if (tripProfit !== 0) {
        // Mock routing key since pickupAddress/dropoffAddress is gone from Trip
        const routeKey = `Origin ➔ Destination`;
        routeProfits[routeKey] = (routeProfits[routeKey] || 0) + tripProfit;

        // Trip no longer has direct client relation (it's on Order), so mocking client profit
        const cId = 'unknown';
        if (!clientProfits[cId]) clientProfits[cId] = { name: 'Multiple Orders / Unknown', profit: 0 };
        clientProfits[cId].profit += tripProfit;
      }
    });

    const profitByRoute = Object.entries(routeProfits)
      .map(([route, profit]) => ({ route, profit }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5); // top 5 routes

    const topClients = Object.values(clientProfits)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5); // top 5 clients

    // Aggregate expiring docs
    const expiringDocs: any[] = [];
    
    // Truck docs
    expiringTruckDocs.forEach(d => {
      expiringDocs.push({
        id: `td_${d.id}`,
        title: `${d.truck?.plateNumber} — ${d.type}`,
        expiryDate: d.expiryDate
      });
    });

    // Driver docs
    if (expiringDriverDocs.documents) {
      expiringDriverDocs.documents.forEach(d => {
        expiringDocs.push({
          id: `dd_${d.id}`,
          title: `${d.driver?.user?.name} — ${d.type}`,
          expiryDate: d.expiryDate
        });
      });
    }

    // Driver specific expiries (license, medical, tacho)
    if (expiringDriverDocs.drivers) {
      const future = new Date();
      future.setDate(future.getDate() + 30);
      
      expiringDriverDocs.drivers.forEach(d => {
        if (d.licenseExpiry && new Date(d.licenseExpiry) <= future) {
          expiringDocs.push({
            id: `dl_${d.id}`,
            title: `${d.user?.name} — Permis`,
            expiryDate: d.licenseExpiry
          });
        }
        if (d.medicalExpiry && new Date(d.medicalExpiry) <= future) {
          expiringDocs.push({
            id: `dm_${d.id}`,
            title: `${d.user?.name} — Aviz Medical`,
            expiryDate: d.medicalExpiry
          });
        }
        if (d.tachoCardExpiry && new Date(d.tachoCardExpiry) <= future) {
          expiringDocs.push({
            id: `dt_${d.id}`,
            title: `${d.user?.name} — Card Tahograf`,
            expiryDate: d.tachoCardExpiry
          });
        }
      });
    }

    // Sort all by expiry date
    expiringDocs.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    for (const doc of expiringDocs) {
      await this.notificationsService.create({
        type: 'document',
        title: 'notif_doc_expiring_title',
        message: doc.title,
        relatedId: doc.id,
      });
    }

    return { stats: { ...stats, activeTrucks }, monthlyProfits, overdueInvoices, expiringDocs, profitByRoute, topClients };
  }
}
