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

    // --- Profitability Analytics ---
    const routeProfits: Record<string, number> = {};
    const clientProfits: Record<string, { name: string, profit: number }> = {};

    allTrips.forEach(t => {
      // Calculate true cost
      const addedCosts = t.costs?.reduce((sc, c) => sc + Number(c.amount), 0) || 0;
      const tripCost = addedCosts > 0 ? addedCosts : (Number(t.realCost) || Number(t.estimatedCost) || 0);
      const basePrice = Number(t.agreedPrice) || Number(t.price) || 0;
      const tripProfit = basePrice - tripCost;

      // Only count if there's actual data
      if (tripProfit !== 0 || basePrice > 0) {
        // By Route (e.g., "RO -> DE")
        // Use regex to extract Country Code if formatted as "Strada, 12345 Oras, DE"
        // Since we don't strictly have dropoffCountry populated, we'll try to extract the last word from the address as Country
        const extractCountry = (address: string) => {
          if (!address) return '?';
          const parts = address.split(',');
          let lastPart = parts[parts.length - 1].trim().toUpperCase();
          
          const map: Record<string, string> = {
            'ROMÂNIA': 'RO', 'ROMANIA': 'RO', 'RO': 'RO',
            'NEDERLAND': 'NL', 'NETHERLANDS': 'NL', 'OLANDA': 'NL', 'NL': 'NL',
            'DEUTSCHLAND': 'DE', 'GERMANY': 'DE', 'GERMANIA': 'DE', 'DE': 'DE',
            'FRANCE': 'FR', 'FRANȚA': 'FR', 'FRANTA': 'FR', 'FR': 'FR',
            'BELGIQUE': 'BE', 'BELGIUM': 'BE', 'BELGIA': 'BE', 'BE': 'BE',
            'POLSKA': 'PL', 'POLAND': 'PL', 'POLONIA': 'PL', 'PL': 'PL',
            'MAGYARORSZÁG': 'HU', 'HUNGARY': 'HU', 'UNGARIA': 'HU', 'HU': 'HU',
            'ÖSTERREICH': 'AT', 'AUSTRIA': 'AT', 'AT': 'AT'
          };

          if (map[lastPart]) return map[lastPart];

          const words = lastPart.split(' ');
          const lastWord = words[words.length - 1];
          if (map[lastWord]) return map[lastWord];

          return lastWord.substring(0, 3);
        };

        let oC = t.pickupCountry || extractCountry(t.pickupAddress);
        let dC = t.dropoffCountry || extractCountry(t.dropoffAddress);
        const routeKey = `${oC} ➔ ${dC}`;

        routeProfits[routeKey] = (routeProfits[routeKey] || 0) + tripProfit;

        // By Client
        if (t.client) {
          const cId = t.client.id;
          if (!clientProfits[cId]) clientProfits[cId] = { name: t.client.name, profit: 0 };
          clientProfits[cId].profit += tripProfit;
        }
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
