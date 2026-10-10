import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TnasController } from './tnas.controller';
import { TnasService } from './tnas.service';

// Core entities (Legacy 9 datasets)
import { Document } from '../documents/document.entity';
import { Invoice } from '../invoices/invoice.entity';
import { Expense } from '../expenses/expense.entity';
import { Trip } from '../trips/trip.entity';
import { Truck } from '../trucks/truck.entity';
import { Driver } from '../drivers/driver.entity';
import { Client } from '../clients/client.entity';
import { Maintenance } from '../maintenance/maintenance.entity';
import { User } from '../users/user.entity';

// Orders & Cargo
import { Order } from '../orders/order.entity';
import { CargoItem } from '../orders/cargo-item.entity';
import { OrderStop } from '../orders/order-stop.entity';

// Fleet & Telematics
import { Trailer } from '../trucks/trailer.entity';
import { TelematicsDevice } from '../telematics/entities/telematics-device.entity';
import { Tachograph } from '../telematics/entities/tachograph.entity';
import { DriverTachographCard } from '../telematics/entities/driver-tachograph-card.entity';
import { TachographActivityEvent } from '../telematics/entities/tachograph-activity-event.entity';

// Planning & Dispatch
import { TruckRoutePlan } from '../planning/truck-route-plan.entity';
import { Shipment } from '../planning/shipment.entity';
import { CrossDockTransfer } from '../planning/cross-dock-transfer.entity';
import { PlanningAction } from '../planning/planning-action.entity';

// Commercial & Quotes
import { QuoteRequest } from '../quotes/quote.entity';
import { QuoteReply } from '../quotes/quote-reply.entity';
import { ClientRate } from '../clients/client-rate.entity';
import { ClientLocation } from '../clients/client-location.entity';

// Finance & Payroll
import { InvoiceItem } from '../invoices/invoice-item.entity';
import { Payment } from '../payments/payment.entity';
import { Payroll } from '../payroll/payroll.entity';
import { Settlement } from '../settlements/settlement.entity';

// Documents Registry
import { DriverDocument } from '../drivers/driver-document.entity';
import { TruckDocument } from '../trucks/truck-document.entity';
import { MaintenanceAttachment } from '../maintenance/maintenance-attachment.entity';

// Website CMS & Leads
import { WebsiteCms } from '../website-cms/website-cms.entity';
import { Lead } from '../leads/lead.entity';
import { JobApplication } from '../job-applications/job-application.entity';
import { ContactMessage } from '../contact/contact.entity';

// System & Governance
import { Company } from '../companies/company.entity';
import { SavedReport } from '../reports/saved-report.entity';
import { ScheduledReport } from '../reports/scheduled-report.entity';
import { Message } from '../chat/message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Document, Invoice, Expense, Trip, Truck, Driver, Client, Maintenance, User,
      Order, CargoItem, OrderStop,
      Trailer, TelematicsDevice, Tachograph, DriverTachographCard, TachographActivityEvent,
      TruckRoutePlan, Shipment, CrossDockTransfer, PlanningAction,
      QuoteRequest, QuoteReply, ClientRate, ClientLocation,
      InvoiceItem, Payment, Payroll, Settlement,
      DriverDocument, TruckDocument, MaintenanceAttachment,
      WebsiteCms, Lead, JobApplication, ContactMessage,
      Company, SavedReport, ScheduledReport, Message,
    ]),
  ],
  controllers: [TnasController],
  providers: [TnasService],
  exports: [TnasService],
})
export class TnasModule {}
