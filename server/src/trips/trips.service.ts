import { Injectable, Inject, Optional, forwardRef, ConflictException, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between } from 'typeorm';
import { Trip, TripStatus } from './trip.entity';
import { Order } from '../orders/order.entity';
import { Stop, StopStatus } from './stop.entity';
import { Truck } from '../trucks/truck.entity';
import { TripCost } from './trip-cost.entity';
import { FirebaseService } from '../firebase/firebase.service';
import { ChatGateway } from '../chat/chat.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { InvoicesService } from '../invoices/invoices.service';
import { ResendService } from '../email/resend.service';
import { RoutingService } from '../routing/routing.service';
import { aggregateLegTolls } from './toll-aggregation';
import { PlanningEngine } from '../engines/planning.engine';
import { PricingEngine } from '../engines/pricing.engine';
import { CostEngine } from '../engines/cost.engine';
import { ActionLogsService } from '../action-logs/action-logs.service';
import { DocumentsService } from '../documents/documents.service';
import { DocumentType } from '../documents/document.entity';
import { DeliveryIncident } from './delivery-incident.entity';
import { localizeStopEvent, localizeTripEvent, localizeScheduleChange } from './trip-notification-i18n';
import { diffStopChanges, localizeStopChange } from './stop-change';
import {
  deriveOperationalStatus,
  deriveOrderOperationalStatus,
  orderDeliveryProgress,
  normalizeTripOperationalStatus,
  operationalStatusForIncident,
  operationalStatusFromLegacy,
  incidentBlocksCompletion,
  isDeliveryIncidentReason,
  isDeliveryIncidentOutcome,
  isDeliveryResolution,
  DeliveryIncidentOutcome,
  OperationalStatus,
} from './operational-status';
import { computeAuditChanges } from '../action-logs/diff.util';
import { randomUUID, createHash } from 'crypto';
import { resolveTripDriver, resolveTripDriverAssignment, resolveTripTrailer } from './driver-assignment';
import {
  STOP_STATUSES,
  assertActorMayOperateTrip,
  assertStopTransition,
  deriveOrderStatusForStop,
  deriveTripStatus,
  isDriverActor,
  isStopStatus,
  normalizeStopStatus,
  normalizeStopType,
  driverActionForStop,
  driverTripAction,
  isTripAccepted,
  driverTripPriority,
  sortDriverTrips,
  resolveStatusSource,
  timestampsForStop,
} from './trip-progress';

const TRIP_STATUS_FLOW: Record<string, string[]> = {
  [TripStatus.PLANNING]: [TripStatus.PLANNED, TripStatus.ASSIGNED, TripStatus.DISPATCHED, TripStatus.CANCELLED],
  [TripStatus.PLANNED]: [TripStatus.PLANNING, TripStatus.ASSIGNED, TripStatus.DISPATCHED, TripStatus.CANCELLED],
  [TripStatus.ASSIGNED]: [TripStatus.PLANNING, TripStatus.PLANNED, TripStatus.DISPATCHED, TripStatus.CANCELLED],
  [TripStatus.DISPATCHED]: [TripStatus.PLANNING, TripStatus.PLANNED, TripStatus.ASSIGNED, TripStatus.DRIVER_ACCEPTED, TripStatus.STARTED, TripStatus.CANCELLED],
  [TripStatus.DRIVER_ACCEPTED]: [TripStatus.DISPATCHED, TripStatus.STARTED, TripStatus.CANCELLED],
  [TripStatus.STARTED]: [TripStatus.AT_PICKUP, TripStatus.LOADING, TripStatus.DRIVING, TripStatus.PARTIALLY_DELIVERED, TripStatus.COMPLETED, TripStatus.CANCELLED],
  [TripStatus.AT_PICKUP]: [TripStatus.LOADING, TripStatus.CANCELLED],
  [TripStatus.LOADING]: [TripStatus.DRIVING, TripStatus.CANCELLED],
  [TripStatus.DRIVING]: [TripStatus.AT_DELIVERY, TripStatus.UNLOADING, TripStatus.PARTIALLY_DELIVERED, TripStatus.COMPLETED, TripStatus.CANCELLED],
  [TripStatus.AT_DELIVERY]: [TripStatus.UNLOADING, TripStatus.CANCELLED],
  [TripStatus.UNLOADING]: [TripStatus.PARTIALLY_DELIVERED, TripStatus.COMPLETED, TripStatus.CANCELLED],
  [TripStatus.PARTIALLY_DELIVERED]: [TripStatus.DRIVING, TripStatus.COMPLETED, TripStatus.CANCELLED],
  [TripStatus.COMPLETED]: [TripStatus.CLOSED, TripStatus.CANCELLED],
  [TripStatus.CLOSED]: [],
  [TripStatus.CANCELLED]: [TripStatus.PLANNING, TripStatus.PLANNED],
  // Lifecycle aliases for TRP sync
  confirmed: [TripStatus.PLANNING, TripStatus.PLANNED, TripStatus.DISPATCHED, TripStatus.CANCELLED],
  in_transit: [TripStatus.DRIVING, TripStatus.COMPLETED, TripStatus.CANCELLED],
  driver_received: [TripStatus.DRIVER_ACCEPTED, TripStatus.DISPATCHED, TripStatus.CANCELLED],
  unplanned: [TripStatus.PLANNING, TripStatus.PLANNED, TripStatus.CANCELLED],
};

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(Trip) private repo: Repository<Trip>,
    @InjectRepository(TripCost) private costsRepo: Repository<TripCost>,
    private firebaseService: FirebaseService,
    @Inject(forwardRef(() => ChatGateway)) private chatGateway: ChatGateway,
    private notificationsService: NotificationsService,
    private invoicesService: InvoicesService,
    private resendService: ResendService,
    private routingService: RoutingService,
    private planningEngine: PlanningEngine,
    private pricingEngine: PricingEngine,
    private costEngine: CostEngine,
    private actionLogs: ActionLogsService,
    @Optional() private documentsService?: DocumentsService,
    @Optional() @InjectRepository(DeliveryIncident) private incidentsRepo?: Repository<DeliveryIncident>,
  ) {}

  async findAll(status?: string, truckId?: string, activeOnly = false) {
    const findOptions: any = { 
      relations: ['truck', 'truck.driver', 'truck.driver.user', 'driver', 'driver.user', 'trailer', 'stops', 'orders', 'orders.cargoItems', 'costs', 'dispatcher'],
      order: { createdAt: 'DESC' }
    };
    const where: any = {};
    if (status) {
      const statuses = status.split(',');
      where.status = In(statuses);
    }
    if (truckId) {
      where.truck = { id: truckId };
    }
    if (activeOnly && !status) {
      where.status = In([
        'planning', 'planned', 'confirmed', 'assigned', 'dispatched',
        'driver_received', 'driver_accepted', 'started', 'at_pickup', 'loading',
        'driving', 'at_delivery', 'unloading', 'partially_delivered', 'in_transit',
      ]);
    }
    if (Object.keys(where).length > 0) {
      findOptions.where = where;
    }
    const trips = await this.repo.find(findOptions);
    // The stored canonical column is a cache. Every read derives it from the
    // stops and the persisted legacy stage, so an old row can never surface
    // as Accepted in the TMS or on the phone.
    for (const trip of trips) normalizeTripOperationalStatus(trip);
    return trips;
  }

  async findForDriver(user: any) {
    if (!user) return [];
    const userId = user.id;
    if (user.role === 'admin' || user.role === 'dispatcher') {
      // Same decorated shape as a driver gets, so the TMS previews and any
      // support call see exactly the state the phone works from.
      return this.decorateDriverTrips(await this.attachLastStatusEvents(await this.findAll()));
    }
    // A trip can be assigned through its own driver record or through the
    // driver of the truck it runs on. Both must reach the phone; scoping by the
    // authenticated user id keeps other drivers' trips out of the response.
    const trips = await this.repo.createQueryBuilder('trip')
      .leftJoinAndSelect('trip.truck', 'truck')
      .leftJoinAndSelect('truck.trailer', 'truckTrailer')
      .leftJoinAndSelect('truck.driver', 'truckDriver')
      .leftJoinAndSelect('truckDriver.user', 'truckDriverUser')
      .leftJoinAndSelect('trip.trailer', 'trailer')
      .leftJoinAndSelect('trip.driver', 'driver')
      .leftJoinAndSelect('driver.user', 'driverUser')
      .leftJoinAndSelect('trip.stops', 'stops')
      .leftJoinAndSelect('stops.tasks', 'tasks')
      .leftJoinAndSelect('tasks.order', 'taskOrder')
      .leftJoinAndSelect('trip.orders', 'orders')
      .leftJoinAndSelect('orders.cargoItems', 'cargoItems')
      .leftJoinAndSelect('orders.stops', 'orderStops')
      .leftJoinAndSelect('orders.client', 'orderClient')
      .leftJoinAndSelect('orders.documents', 'orderDocuments')
      .leftJoinAndSelect('trip.documents', 'documents')
      .leftJoinAndSelect('documents.order', 'documentOrder')
      .leftJoinAndSelect('trip.costs', 'costs')
      .where('driverUser.id = :userId OR driver.id = :userId OR truckDriverUser.id = :userId', { userId })
      .orderBy('trip.createdAt', 'DESC')
      .getMany();
    return this.decorateDriverTrips(await this.attachLastStatusEvents(trips));
  }

  /**
   * Gives the driver app one authoritative view per stop: normalised type and
   * status, the single action the server will accept next, the orders carried
   * by that stop and its own documents. Planning the UI from this payload (and
   * validating the same rule on PATCH) is what stops "Start loading" from
   * appearing at a delivery address.
   */
  private async decorateDriverTrips(trips: Trip[]) {
    for (const trip of trips || []) {
      // A trip may be assigned through its own driver or through the driver of
      // its assigned truck. Expose one effective driver and its source so the
      // driver app never has to guess (or fall back to the logged-in driver).
      const assignment = resolveTripDriverAssignment(trip);
      if (!(trip as any).driver && assignment.driver) {
        (trip as any).driver = assignment.driver;
      }
      (trip as any).driverAssignment = assignment.driver
        ? { source: assignment.source, confirmed: true, driverId: assignment.driver.id }
        : null;

      const orders = ((trip as any).orders || []) as any[];

      // Documents are attached to either the trip or one of its orders; the
      // driver must see both, deduplicated, because a CMR usually hangs off the
      // order while a POD hangs off the trip.
      const orderDocuments = orders.flatMap((o) => ((o.documents || []) as any[]));
      const byId = new Map<string, any>();
      for (const doc of [...(((trip as any).documents || []) as any[]), ...orderDocuments]) {
        if (doc?.id) byId.set(String(doc.id), doc);
      }
      let documents = [...byId.values()];

      // The TMS list does not join documents, so load them here when the caller
      // arrived without them. A CMR on the order must still reach the driver.
      if (documents.length === 0) {
        try {
          const orderIds = orders.map((o) => o.id).filter(Boolean);
          const where: any[] = [{ trip: { id: trip.id } }];
          if (orderIds.length > 0) where.push({ order: { id: In(orderIds) } });
          documents = (await this.repo.manager.find('Document', {
            where,
            relations: ['order', 'trip'],
          })) as any[];
        } catch (e: any) {
          console.warn(`Document enrichment skipped: ${e?.message}`);
        }
      }
      (trip as any).documents = documents;

      // A trip stage must never contradict the stops the driver already worked
      // (for example "loading" while the truck is at the delivery address).
      const operational = ['started', 'at_pickup', 'loading', 'driving', 'at_delivery', 'unloading', 'partially_delivered', 'in_transit'];
      const derivedStage = deriveTripStatus(((trip as any).stops || []) as any[]);
      if (operational.includes(String((trip as any).status)) && derivedStage) {
        (trip as any).status = derivedStage;
      }
      // The canonical code is the only badge the driver app and TMS render.
      // It is derived from the stops, so a cached legacy trip flag can never
      // make the phone say "driving" at an unloading address.
      (trip as any).operationalStatus = deriveOperationalStatus(
        ((trip as any).stops || []) as any[],
        (trip as any).status,
      );
      for (const stop of ((trip as any).stops || []) as any[]) {
        stop.type = normalizeStopType(stop.type, stop.sequence);
        stop.status = normalizeStopStatus(stop.status);
        stop.lat = stop.latitude ?? null;
        stop.lng = stop.longitude ?? null;

        const taskOrderIds = new Set(
          ((stop.tasks || []) as any[]).map((t) => t?.order?.id).filter(Boolean).map(String),
        );
        let stopOrders = orders.filter((o) => {
          if (taskOrderIds.has(String(o.id))) return true;
          return ((o.stops || []) as any[]).some((s) => String(s.id) === String(stop.id));
        });
        // Single-order trips have no ambiguity, so the card still shows the
        // order and its cargo even when the TMS never linked it to the stop.
        if (stopOrders.length === 0 && orders.length === 1) stopOrders = orders;
        stop.orders = stopOrders;

        const action = driverActionForStop(stop);
        stop.allowedActions = action ? [action] : [];

        const orderIds = new Set(stopOrders.map((o) => String(o.id)));
        stop.documents = documents.filter((d) => {
          if (d?.order && orderIds.has(String(d.order.id))) return true;
          return !d?.order && orderIds.size === 1; // trip-level CMR on a single-order trip
        });
      }

      // The trip-level action is authoritative. Stop actions are exposed only
      // after acceptance/start, so the driver app cannot pair an ACCEPTED trip
      // with "Accept trip" or with a stop action that precedes starting.
      const nextAction = driverTripAction(trip, ((trip as any).stops || []) as any[]);
      (trip as any).nextAction = nextAction;
      (trip as any).allowedActions = nextAction ? [nextAction] : [];
      (trip as any).acceptanceRequired = nextAction?.kind === 'accept';
      (trip as any).assignmentStatus = isTripAccepted(trip) ? 'accepted' : 'pending';
      (trip as any).completionEligibility = {
        eligible: (trip as any).operationalStatus === 'COMPLETED',
        hasOpenIncident: Boolean((trip as any).hasOpenIncident),
        podRequired: Boolean((trip as any).podRequired),
      };
      if (nextAction?.kind !== 'arrive_pickup' && nextAction?.kind !== 'start_loading' &&
          nextAction?.kind !== 'complete_loading' && nextAction?.kind !== 'arrive_delivery' &&
          nextAction?.kind !== 'start_unloading' && nextAction?.kind !== 'complete_delivery') {
        for (const stop of ((trip as any).stops || []) as any[]) stop.allowedActions = [];
      } else {
        for (const stop of ((trip as any).stops || []) as any[]) {
          if (String(stop.id) !== String(nextAction.stopId)) stop.allowedActions = [];
        }
      }
    }

    // The backend decides which trip is the driver's current job. A trip that
    // is already being unloaded always outranks a newer future assignment.
    const ordered = sortDriverTrips(trips);
    let currentMarked = false;
    for (const trip of ordered) {
      const isCurrent = !currentMarked && driverTripPriority(trip) < 3;
      (trip as any).isCurrentTrip = isCurrent;
      (trip as any).tripPriority = driverTripPriority(trip);
      if (isCurrent) currentMarked = true;
    }
    return ordered;
  }

  /**
   * Adds the most recent status event (and who produced it) to each trip so the
   * driver app can show "updated from the driver app at 14:32" without a second
   * request per trip. Audit enrichment must never break job retrieval.
   */
  private async attachLastStatusEvents(trips: Trip[]) {
    const ids = (trips || []).map((t) => t.id).filter(Boolean);
    if (ids.length === 0) return trips;
    try {
      const rows = await this.repo.manager.query(
        `SELECT DISTINCT ON (l."entityId") l."entityId" AS "tripId", l."createdAt" AS "at",
                COALESCE(l."source", 'tms') AS "source",
                l."details"->>'newStatus' AS "status",
                u."name" AS "actorName"
           FROM "action_logs" l LEFT JOIN "users" u ON u."id" = l."userId"
          WHERE l."entityType" = 'Trip' AND l."action" = 'STATUS_CHANGED'
            AND l."entityId" = ANY($1::uuid[])
          ORDER BY l."entityId", l."createdAt" DESC`,
        [ids],
      );
      const map = new Map<string, any>(rows.map((r: any) => [String(r.tripId), r]));
      for (const trip of trips) (trip as any).lastStatusEvent = map.get(String(trip.id)) || null;
    } catch (e: any) {
      console.warn(`Status event enrichment skipped: ${e?.message}`);
    }
    return trips;
  }

  async getStatusHistory(tripId: string) {
    const logs = await this.actionLogs.getLogsForEntity('Trip', tripId);
    return logs
      .filter((l: any) => ['STATUS_CHANGED', 'POD_SAVED', 'ISSUE_REPORTED', 'DELAY_REPORTED', 'DELIVERY_INCIDENT_REPORTED', 'DELIVERY_INCIDENT_RESOLVED'].includes(l.action))
      .map((l: any) => ({
        id: l.id,
        action: l.action,
        status: l.details?.newStatus ?? null,
        previousStatus: l.details?.previousStatus ?? null,
        source: l.source || l.details?.source || 'tms',
        at: l.createdAt,
        actorName: l.user?.name || l.user?.email || null,
        scope: l.details?.scope ?? null,
        stopId: l.details?.stopId ?? null,
        orderId: l.details?.orderId ?? null,
        notes: l.details?.notes ?? l.details?.description ?? null,
      }));
  }

  private incidentRepo() {
    return this.incidentsRepo || this.repo.manager.getRepository(DeliveryIncident);
  }

  private async decorateIncident(incident: DeliveryIncident) {
    const ids = (incident.photoIds || []).filter(Boolean).map(String);
    let photos: any[] = [];
    if (ids.length > 0) {
      const docs = (await this.repo.manager.find('Document', {
        where: { id: In(ids) },
        relations: ['trip', 'order'],
      })) as any[];
      photos = docs.map((doc) => ({
        id: doc.id,
        fileName: doc.fileName || doc.originalFilename || null,
        url: this.documentsService?.generateSignedUrl(doc, 3600) || doc.fileUrl || null,
      }));
    }
    // Evidence is only useful when dispatch can identify the exact stop and
    // order it belongs to. These are read-only projections, not copies of the
    // operational state.
    const stop = incident.stopId
      ? await this.repo.manager.findOne('Stop', { where: { id: incident.stopId } }) as any
      : null;
    const order = incident.orderId
      ? await this.repo.manager.findOne('Order', { where: { id: incident.orderId }, relations: ['client'] }) as any
      : null;
    const resolver = incident.resolvedByUserId
      ? await this.repo.manager.findOne('User', { where: { id: incident.resolvedByUserId } }) as any
      : null;
    const driver = incident.driverUserId
      ? await this.repo.manager.findOne('User', { where: { id: incident.driverUserId } }) as any
      : null;
    let resolutionHistory: any[] = [];
    try {
      const logs = await this.actionLogs.getLogsForEntity('Trip', incident.tripId);
      resolutionHistory = logs
        .filter((log: any) => log.action === 'DELIVERY_INCIDENT_RESOLVED'
          && String(log.details?.incidentId || '') === String(incident.id))
        .map((log: any) => ({
          id: log.id,
          resolutionCode: log.details?.resolutionCode || null,
          resolutionNotes: log.details?.resolutionNotes || null,
          at: log.createdAt,
          actorName: log.user?.name || log.user?.email || null,
        }));
    } catch {
      resolutionHistory = [];
    }
    return {
      ...incident,
      photos,
      stop: stop ? { id: stop.id, sequence: stop.sequence, type: stop.type, city: stop.city, address: stop.address } : null,
      order: order ? { id: order.id, orderNumber: order.orderNumber, clientName: order.client?.name || null } : null,
      resolvedBy: resolver ? { id: resolver.id, name: resolver.name || resolver.email || null } : null,
      driver: driver ? { id: driver.id, name: driver.name || driver.email || null } : null,
      resolutionHistory,
    };
  }

  /** Delivery incidents are scoped to the trip, never to a caller-supplied id. */
  async getDeliveryIncidents(tripId: string, user: any) {
    const trip = await this.findOne(tripId);
    if (!trip) throw new NotFoundException('Trip not found');
    assertActorMayOperateTrip(trip, user);
    const incidents = await this.incidentRepo().find({
      where: { tripId },
      order: { createdAt: 'DESC' },
    });
    return Promise.all(incidents.map((incident) => this.decorateIncident(incident)));
  }

  async reportDeliveryIncident(tripId: string, user: any, data: any) {
    const trip = await this.findOne(tripId);
    if (!trip) throw new NotFoundException('Trip not found');
    assertActorMayOperateTrip(trip, user);

    // The driver's own words are the reason. A category is optional and only
    // used for indexing; it is never invented on the driver's behalf.
    const reasonRequested = String(data?.reasonCode || 'OTHER').toUpperCase();
    const reasonCode = isDeliveryIncidentReason(reasonRequested) ? reasonRequested : 'OTHER';
    const outcome = String(data?.outcome || 'FULL_REJECTION').toUpperCase();
    if (!isDeliveryIncidentOutcome(outcome)) {
      throw new BadRequestException('Unknown delivery incident outcome');
    }
    const description = String(data?.reason || data?.description || '').trim();
    if (description.length < 3) throw new BadRequestException('The rejection reason is required');
    if (description.length > 4000) throw new BadRequestException('The rejection reason is too long');

    const stopId = data?.stopId ? String(data.stopId) : null;
    const stop = stopId
      ? ((trip as any).stops || []).find((s: any) => String(s.id) === stopId)
      : ((trip as any).stops || [])
          .filter((s: any) => normalizeStopType(s.type, s.sequence) === 'delivery')
          .sort((a: any, b: any) => Number(b.sequence) - Number(a.sequence))[0];
    if (!stop) throw new BadRequestException('Delivery stop not found');
    if (normalizeStopType(stop.type, stop.sequence) !== 'delivery') {
      throw new BadRequestException('Delivery incidents can only be reported at a delivery stop');
    }
    const stopStatus = normalizeStopStatus(stop.status);
    if (!['arrived', 'unloading', 'completed'].includes(stopStatus)) {
      throw new ConflictException('Report a delivery incident after arriving at the delivery stop');
    }

    const clientRequestId = data?.clientRequestId ? String(data.clientRequestId).slice(0, 128) : null;
    if (clientRequestId) {
      const existing = await this.incidentRepo().findOne({ where: { tripId, clientRequestId } });
      if (existing) return this.decorateIncident(existing);
    }

    const photoIds = [...new Set((Array.isArray(data?.photoIds) ? data.photoIds : []).map(String).filter(Boolean))];
    if (photoIds.length > 12) throw new BadRequestException('A maximum of 12 photographs is allowed');
    if (photoIds.length > 0) {
      const docs = (await this.repo.manager.find('Document', {
        where: { id: In(photoIds) },
        relations: ['trip'],
      })) as any[];
      if (docs.length !== photoIds.length) throw new BadRequestException('One or more photographs were not found');
      if (docs.some((doc) => String(doc.trip?.id || '') !== String(tripId))) {
        throw new ForbiddenException('A photograph does not belong to this trip');
      }
    }

    const explicitOrder = data?.orderId ? String(data.orderId) : null;
    const orderId = explicitOrder || this.orderIdsForStop(stop, trip)[0] || null;
    if (explicitOrder && !((trip as any).orders || []).some((o: any) => String(o.id) === explicitOrder)) {
      throw new ForbiddenException('Order does not belong to this trip');
    }

    const operationalStatus = operationalStatusForIncident(outcome as DeliveryIncidentOutcome);
    const incident = this.incidentRepo().create({
      companyId: (trip as any).company?.id || user?.companyId || null,
      tripId,
      orderId,
      stopId: stop.id,
      driverUserId: user?.id || null,
      reasonCode,
      outcome,
      affectedPallets: data?.affectedPallets !== undefined && data?.affectedPallets !== null && data?.affectedPallets !== ''
        ? Math.max(0, Number(data.affectedPallets) || 0)
        : null,
      affectedQuantity: data?.affectedQuantity !== undefined && data?.affectedQuantity !== null && data?.affectedQuantity !== ''
        ? Math.max(0, Number(data.affectedQuantity) || 0)
        : null,
      quantityUnit: data?.quantityUnit ? String(data.quantityUnit).slice(0, 24) : null,
      description,
      driverNotes: data?.notes ? String(data.notes).trim().slice(0, 4000) : null,
      customerExplanation: data?.customerExplanation ? String(data.customerExplanation) : null,
      customerName: data?.customerName ? String(data.customerName).slice(0, 255) : null,
      signatureRefused: Boolean(data?.signatureRefused),
      photoIds: photoIds as string[],
      clientRequestId,
      status: 'OPEN',
      latitude: Number.isFinite(Number(data?.latitude)) ? Number(data.latitude) : null,
      longitude: Number.isFinite(Number(data?.longitude)) ? Number(data.longitude) : null,
    } as any) as unknown as DeliveryIncident;
    const saved = (await this.incidentRepo().save(incident)) as unknown as DeliveryIncident;

    await this.repo.update(tripId, {
      operationalStatus,
      deliveryOutcome: outcome,
      hasOpenIncident: true,
    });
    if (orderId) {
      await this.repo.manager.update('Order', { id: orderId }, {
        operationalStatus,
        deliveryOutcome: outcome,
        hasOpenIncident: true,
      });
    }

    // The allocation is the auditable quantity record. Persist the reported
    // rejection next to the order/stop it belongs to; never treat it as
    // delivered and never replace earlier allocations on other trips.
    const rejected = Number(saved.affectedQuantity ?? saved.affectedPallets ?? 0);
    if (orderId && Number.isFinite(rejected) && rejected > 0) {
      await this.repo.manager
        .createQueryBuilder()
        .update('StopTask')
        .set({
          rejectedQuantity: rejected,
          rejectionReason: description,
          rejectionPhotoUrls: photoIds,
        })
        .where('"stopId" = :stopId', { stopId: stop.id })
        .andWhere('"orderId" = :orderId', { orderId })
        .execute();
    }

    const source = resolveStatusSource(user);
    await this.actionLogs.logAction('Trip', tripId, 'DELIVERY_INCIDENT_REPORTED', user, {
      incidentId: saved.id,
      reasonCode,
      outcome,
      description,
      driverNotes: saved.driverNotes,
      affectedPallets: saved.affectedPallets,
      affectedQuantity: saved.affectedQuantity,
      quantityUnit: saved.quantityUnit,
      customerExplanation: saved.customerExplanation,
      customerName: saved.customerName,
      signatureRefused: saved.signatureRefused,
      photoIds,
      stopId: stop.id,
      orderId,
      operationalStatus,
      source,
    }, undefined, source);

    try {
      await this.notificationsService.create({
        type: 'trip',
        title: 'Delivery issue reported',
        message: `A delivery issue was reported for trip ${trip.tripNumber || tripId}. Dispatch review is required.`,
        relatedId: tripId,
      });
    } catch (e) {
      console.warn('Delivery incident notification failed:', e);
    }

    this.chatGateway?.broadcastOperationalUpdate?.({
      tripId,
      operationalStatus,
      deliveryOutcome: outcome,
      hasOpenIncident: true,
      incidentId: saved.id,
      stopId: stop.id,
      event: 'DELIVERY_INCIDENT_REPORTED',
    });

    return this.decorateIncident(saved);
  }

  async resolveDeliveryIncident(tripId: string, incidentId: string, user: any, data: any) {
    if (isDriverActor(user)) throw new ForbiddenException('Only a dispatcher can resolve a delivery incident');
    const trip = await this.findOne(tripId);
    if (!trip) throw new NotFoundException('Trip not found');
    const incident = await this.incidentRepo().findOne({ where: { id: incidentId, tripId } });
    if (!incident) throw new NotFoundException('Delivery incident not found');
    const userCompany = user?.companyId || user?.company?.id;
    if (userCompany && incident.companyId && String(userCompany) !== String(incident.companyId)) {
      throw new ForbiddenException('Incident does not belong to this company');
    }
    const resolutionCode = String(data?.resolutionCode || '').trim().toUpperCase();
    const resolutionNotes = String(data?.resolutionNotes || '').trim();
    if (!isDeliveryResolution(resolutionCode)) throw new BadRequestException('Unknown resolution');
    if (!resolutionNotes) throw new BadRequestException('Resolution instructions are required');
    if (incident.status === 'RESOLVED') return this.decorateIncident(incident);
    incident.status = 'RESOLVED';
    incident.resolutionCode = resolutionCode.slice(0, 64);
    incident.resolutionNotes = resolutionNotes || null;
    incident.resolvedByUserId = user?.id || null;
    incident.resolvedAt = new Date();
    const saved = await this.incidentRepo().save(incident);

    const otherOpen = await this.incidentRepo().count({ where: { tripId, status: 'OPEN' } });
    let operationalStatus = (trip as any).operationalStatus || 'DELIVERY_EXCEPTION';
    if (otherOpen === 0) {
      // Resolving the rejection clears the blocking outcome, but it does not
      // complete the delivery. The stop/trip lifecycle decides what work comes
      // next (unloading, redelivery, return), so dispatch cannot mark goods as
      // delivered just by closing the incident.
      const stops = ((await this.findOne(tripId)) as any)?.stops || [];
      const legacy = (trip as any).status;
      operationalStatus = deriveOperationalStatus(stops, legacy);
      const patch: any = { hasOpenIncident: false, operationalStatus };
      await this.repo.update(tripId, patch);
    }
    if (incident.orderId) {
      // An incident on one order must not leave a different order flagged, and
      // resolving the last incident for this order must clear its own flag even
      // when another order on the trip still has an open incident.
      const otherOpenForOrder = await this.incidentRepo().count({
        where: { tripId, orderId: incident.orderId, status: 'OPEN' },
      });
      if (otherOpenForOrder === 0) {
        const stop = ((trip as any).stops || []).find((s: any) => String(s.id) === String(incident.stopId));
        await this.repo.manager.update('Order', { id: incident.orderId }, {
          hasOpenIncident: false,
          operationalStatus: deriveOrderOperationalStatus(
            String(stop?.type || 'delivery'),
            String(stop?.status || 'unloading'),
          ),
        });
      }
    }

    await this.actionLogs.logAction('Trip', tripId, 'DELIVERY_INCIDENT_RESOLVED', user, {
      incidentId,
      resolutionCode: saved.resolutionCode,
      resolutionNotes: saved.resolutionNotes,
      driverOriginalDescription: saved.description,
      photoIds: saved.photoIds,
      source: 'tms',
    }, undefined, 'tms');

    this.chatGateway?.broadcastOperationalUpdate?.({
      tripId,
      operationalStatus,
      incidentId,
      deliveryOutcome: saved.outcome,
      hasOpenIncident: otherOpen > 0,
      event: 'DELIVERY_INCIDENT_RESOLVED',
    });
    return this.decorateIncident(saved);
  }

  async reportIssue(tripId: string, user: any, data: { category: string; description: string; stopId?: string; photoUrls?: string[] }) {
    const trip = await this.findOne(tripId);
    if (!trip) throw new NotFoundException('Trip not found');
    await this.actionLogs.logAction('Trip', tripId, 'ISSUE_REPORTED', user, {
      category: data.category,
      description: data.description,
      stopId: data.stopId,
      photoUrls: data.photoUrls,
    });
    return { success: true, message: 'Issue reported successfully' };
  }

  async reportDelay(tripId: string, user: any, data: { reason: string; estimatedDelayMinutes: number; stopId?: string }) {
    const trip = await this.findOne(tripId);
    if (!trip) throw new NotFoundException('Trip not found');
    await this.actionLogs.logAction('Trip', tripId, 'DELAY_REPORTED', user, {
      reason: data.reason,
      estimatedDelayMinutes: data.estimatedDelayMinutes,
      stopId: data.stopId,
    });
    return { success: true, message: 'Delay reported successfully' };
  }

  /**
   * Open full/partial rejection prevents that delivery stop from being marked
   * complete. The block is scoped to the affected stop so other orders on the
   * same trip can still be delivered while dispatch resolves the incident.
   */
  private async openBlockingIncident(tripId: string, stopId?: string): Promise<DeliveryIncident | null> {
    if (!this.incidentsRepo) return null;
    const where: any = {
      tripId,
      status: 'OPEN',
      outcome: In(['FULL_REJECTION', 'PARTIAL_REJECTION']),
    };
    if (stopId) where.stopId = String(stopId);
    return this.incidentsRepo.findOne({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  private async podDocumentsFor(tripId: string): Promise<any[]> {
    try {
      const docs = await this.repo.manager.find('Document', {
        where: { trip: { id: tripId } },
        relations: ['trip', 'order'],
      }) as any[];
      return docs.filter((d) => String(d.documentType || d.type || '').toLowerCase() === 'pod');
    } catch {
      return [];
    }
  }

  private orderIdsForStop(stop: any, trip: any, explicitOrderId?: string): string[] {
    const ids = new Set<string>();
    for (const task of stop?.tasks || []) {
      if (task?.order?.id) ids.add(String(task.order.id));
    }
    if (ids.size === 0 && explicitOrderId) ids.add(String(explicitOrderId));
    if (ids.size === 0 && (trip?.orders || []).length === 1) ids.add(String(trip.orders[0].id));
    return [...ids];
  }

  /** Human operational label used in notifications, never a raw enum. */
  private stopEventLabel(previous: string, next: string, stopType: string): string {
    return localizeStopEvent(previous, next, stopType, 'en');
  }

  /** Deterministic event key used for persistent notification dedupe. */
  private notificationKey(...parts: unknown[]): string {
    return createHash('sha256')
      .update(parts.map((part) => String(part ?? '')).join('|'))
      .digest('hex');
  }

  /**
   * Origin-aware notification. A driver action notifies the TMS; it never sends
   * the driver an echo or a contradictory push about their own tap. A TMS action
   * notifies the assigned driver only when the change needs their attention.
   */
  private async notifyOperationalEvent(
    trip: any,
    stop: any,
    previous: string,
    next: string,
    stopType: string,
    user: any,
  ) {
    const source = resolveStatusSource(user);
    const label = this.stopEventLabel(previous, next, stopType);
    const driverName = trip?.driver?.user?.name || trip?.truck?.driver?.user?.name || 'Driver';
    const eventId = this.notificationKey('stop', trip?.id, stop?.id, previous, next);
    if (source === 'mobile') {
      try {
        await this.notificationsService.createOnce({
          type: 'trip',
          title: `${driverName}: ${label}`,
          message: `${trip?.tripNumber || 'Trip'}${stop?.city ? ` · ${stop.city}` : ''}: ${label}.`,
          relatedId: trip?.id,
          eventId,
          origin: 'DRIVER_APP',
          audience: 'tms',
        });
      } catch (e: any) {
        // The operational event is already persisted. A notification failure
        // must never roll it back.
        console.warn(`TMS notification failed: ${e?.message}`);
      }
      return;
    }
    if (source === 'tms') {
      const driverUser = trip?.driver?.user || trip?.truck?.driver?.user;
      const token = driverUser?.fcmToken;
      if (!token) return;
      const driverLabel = localizeStopEvent(previous, next, stopType, driverUser?.language);
      try {
        const delivered = await this.notificationsService.createOnce({
          type: 'trip',
          title: driverLabel,
          message: `${trip?.tripNumber || 'Trip'}${stop?.city ? ` · ${stop.city}` : ''}: ${driverLabel}.`,
          relatedId: trip?.id,
          eventId: this.notificationKey('tms-stop', trip?.id, stop?.id, previous, next),
          origin: 'TMS_DISPATCH',
          audience: 'driver',
        });
        if (!delivered.created) return;
        await this.firebaseService.sendPushNotification(
          token,
          driverLabel,
          `${trip?.tripNumber || 'Trip'}${stop?.city ? ` · ${stop.city}` : ''}: ${driverLabel}.`,
          { tripId: trip?.id, stopId: stop?.id },
        );
      } catch (e: any) {
        console.warn(`Driver push failed: ${e?.message}`);
      }
    }
  }

  /** Pushes schedule, address, reference and assignment changes to the driver. */
  private async notifyScheduleChange(trip: any, fields: string[]) {
    if (!trip || fields.length === 0) return;
    const driverUser = trip?.driver?.user || trip?.truck?.driver?.user;
    const token = driverUser?.fcmToken;
    if (!token) return;
    const label = localizeScheduleChange(driverUser?.language, fields);
    try {
      const delivered = await this.notificationsService.createOnce({
        type: 'trip',
        title: label,
        message: `${trip.tripNumber || 'Trip'}: ${label}.`,
        relatedId: trip.id,
        eventId: this.notificationKey('tms-schedule', trip.id, fields.join(','), trip.plannedDeparture, trip.plannedArrival, trip.driver?.id, trip.truck?.id, trip.trailer?.id),
        origin: 'TMS_DISPATCH',
        audience: 'driver',
      });
      if (!delivered.created) return;
      await this.firebaseService.sendPushNotification(
        token,
        label,
        `${trip.tripNumber || 'Trip'}: ${label}.`,
        { tripId: trip.id },
      );
    } catch (e: any) {
      console.warn(`Driver schedule push failed: ${e?.message}`);
    }
  }

  /** True only when every delivery allocation for this order is completed. */
  private async orderDeliveryProgress(tripId: string, orderId: string, fallbackType?: string, fallbackStatus?: string) {
    const tasks = (await this.repo.manager.find('StopTask', {
      where: { order: { id: orderId }, stop: { trip: { id: tripId } } },
      relations: ['stop'],
    })) as any[];
    const deliveryTasks = tasks.filter((task) =>
      ['unload', 'delivery', 'dropoff'].includes(String(task.type || '').toLowerCase()),
    );
    if (deliveryTasks.length === 0) {
      return {
        allDeliveriesDone: fallbackType === 'delivery' && fallbackStatus === 'completed',
        operationalStatus: deriveOrderOperationalStatus(fallbackType || 'delivery', fallbackStatus || 'pending'),
      };
    }
    return orderDeliveryProgress(deliveryTasks.map((task) => task.stop));
  }

  /**
   * Automatic draft invoice for one completed order. Idempotent at the service
   * and database levels. A financial failure is surfaced to the TMS but never
   * rolls back the operational completion that already happened.
   */
  private async ensureDraftInvoice(orderId: string, user: any) {
    try {
      const result = await this.invoicesService.createDraftForCompletedOrder(orderId, user);
      return result;
    } catch (e: any) {
      console.error(`Automatic draft invoice failed for order ${orderId}:`, e?.message);
      try {
        await this.notificationsService.create({
          type: 'alert',
          title: 'Draft invoice could not be generated',
          message: `Order ${orderId} is operationally complete, but its draft invoice failed: ${e?.message || 'unknown error'}. Retry from Invoices after correcting the data.`,
          relatedId: orderId,
        });
      } catch { /* notification failure is non-fatal */ }
      return { invoice: null, created: false, reason: 'invoice_failed' as const };
    }
  }

  async savePod(tripId: string, user: any, data: { orderId?: string; stopId?: string; recipientName: string; signatureBase64?: string; photoUrls?: string[]; notes?: string }) {
    const trip = await this.findOne(tripId);
    if (!trip) throw new NotFoundException('Trip not found');
    assertActorMayOperateTrip(trip, user);
    const at = new Date();

    const stops = ((trip as any).stops || []) as any[];
    const target = data.stopId
      ? stops.find((s) => s.id === data.stopId)
      : stops.filter((s) => normalizeStopType(s.type, s.sequence) === 'delivery' && s.status !== 'completed')
          .sort((a, b) => Number(a.sequence) - Number(b.sequence))[0];
    if (!target) throw new BadRequestException('Delivery stop not found');
    if (normalizeStopType(target.type, target.sequence) !== 'delivery') {
      throw new BadRequestException('POD can only be submitted for a delivery stop');
    }
    if (target.status === 'completed') return this.findOne(tripId);

    const blocking = await this.openBlockingIncident(tripId, target.id);
    if (blocking) {
      throw new ConflictException('Delivery is rejected. The dispatcher must resolve the incident before completion.');
    }
    if (String(target.status) !== 'unloading') {
      throw new ConflictException('Start unloading before submitting the POD');
    }

    // Save the signature as POD evidence when the driver did not already upload
    // a POD photo/document. A failed save must never complete the trip.
    let existingPod = await this.podDocumentsFor(tripId);
    if (existingPod.length === 0) {
      if (!data.signatureBase64 && !(data.photoUrls || []).length) {
        throw new BadRequestException('POD evidence is required before delivery can be completed');
      }
      try {
        const docRepo = this.repo.manager.getRepository('Document');
        const orderId = this.orderIdsForStop(target, trip, data.orderId)[0] || null;
        const doc = docRepo.create({
          trip: { id: tripId },
          order: orderId ? { id: orderId } : null,
          documentType: DocumentType.POD,
          type: 'POD',
          fileName: `POD_${trip.tripNumber || tripId}.png`,
          fileUrl: data.signatureBase64 || (data.photoUrls || [])[0] || null,
          notes: data.notes || `POD — ${data.recipientName}`,
          uploadedBy: user?.id ? { id: user.id } : null,
        } as any);
        await docRepo.save(doc);
        existingPod = [doc];
      } catch (e: any) {
        throw new BadRequestException(`POD could not be saved: ${e?.message || 'unknown error'}`);
      }
    }
    if (trip.podRequired !== false && existingPod.length === 0) {
      throw new BadRequestException('A POD is required before delivery can be completed');
    }

    await this.repo.manager.update('Stop', { id: target.id }, { status: 'completed', completedAt: at });
    const refreshed = stops.map((s) => (s.id === target.id ? { ...s, status: 'completed' } : s));
    const derived = deriveTripStatus(refreshed);
    const operational = deriveOperationalStatus(refreshed, derived);
    const tripPatch: any = { operationalStatus: operational };
    if (derived && derived !== trip.status) tripPatch.status = derived;
    if (derived === 'completed' && !trip.actualArrival) tripPatch.actualArrival = at;
    await this.repo.update(tripId, tripPatch);

    const orderIds = this.orderIdsForStop(target, trip, data.orderId);
    for (const orderId of orderIds) {
      const progress = await this.orderDeliveryProgress(tripId, orderId, 'delivery', 'completed');
      const orderPatch: any = { operationalStatus: progress.operationalStatus };
      // Completion is the only point where the commercial fulfilment status
      // becomes delivered. Other delivery stops may still be outstanding.
      if (progress.allDeliveriesDone) orderPatch.status = 'delivered';
      await this.repo.manager.update('Order', { id: orderId }, orderPatch);
      if (progress.allDeliveriesDone) {
        await this.ensureDraftInvoice(orderId, user);
      }
    }

    const source = resolveStatusSource(user);
    await this.actionLogs.logAction('Trip', tripId, 'POD_SAVED', user, {
      recipientName: data.recipientName,
      orderId: data.orderId,
      stopId: target.id,
      notes: data.notes,
      previousStatus: target.status,
      newStatus: 'completed',
      operationalStatus: operational,
      source,
      scope: 'stop',
    }, undefined, source);
    this.chatGateway?.broadcastOperationalUpdate?.({
      tripId,
      operationalStatus: operational,
      status: derived,
      stopId: target.id,
      event: 'POD_SUBMITTED',
    });
    await this.notifyOperationalEvent(trip, target, String(target.status), 'completed', 'delivery', user);
    return { success: true, message: 'POD saved successfully', operationalStatus: operational };
  }

  async onModuleInit() {
    try {
      await this.repo.query(`
        ALTER TABLE "stops" ADD COLUMN IF NOT EXISTS "loadingStartedAt" timestamp;
        ALTER TABLE "stops" ADD COLUMN IF NOT EXISTS "unloadingStartedAt" timestamp;
        ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "operationalStatus" varchar(40) NOT NULL DEFAULT 'PLANNING';
        ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "deliveryOutcome" varchar(40);
        ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "hasOpenIncident" boolean NOT NULL DEFAULT false;
        ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "podRequired" boolean NOT NULL DEFAULT true;
        ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "operationalStatus" varchar(40) NOT NULL DEFAULT 'PLANNING';
        ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "deliveryOutcome" varchar(40);
        ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "hasOpenIncident" boolean NOT NULL DEFAULT false;
        CREATE TABLE IF NOT EXISTS "delivery_incidents" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "companyId" uuid,
          "tripId" uuid NOT NULL,
          "orderId" uuid,
          "stopId" uuid,
          "driverUserId" uuid,
          "reasonCode" varchar(64) NOT NULL,
          "outcome" varchar(40) NOT NULL,
          "affectedPallets" int,
          "affectedQuantity" decimal(12,3),
          "quantityUnit" varchar(24),
          "description" text NOT NULL,
          "driverNotes" text,
          "customerExplanation" text,
          "customerName" varchar(255),
          "signatureRefused" boolean NOT NULL DEFAULT false,
          "photoIds" text,
          "clientRequestId" varchar(128),
          "status" varchar(24) NOT NULL DEFAULT 'OPEN',
          "resolutionCode" varchar(64),
          "resolutionNotes" text,
          "resolvedByUserId" uuid,
          "resolvedAt" timestamptz,
          "latitude" decimal(10,7),
          "longitude" decimal(10,7),
          "createdAt" timestamptz NOT NULL DEFAULT now(),
          "updatedAt" timestamptz NOT NULL DEFAULT now()
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "IDX_delivery_incident_request"
          ON "delivery_incidents" ("tripId", "clientRequestId")
          WHERE "clientRequestId" IS NOT NULL;
        CREATE INDEX IF NOT EXISTS "IDX_delivery_incident_trip" ON "delivery_incidents" ("tripId");
        ALTER TABLE "delivery_incidents" ADD COLUMN IF NOT EXISTS "driverNotes" text;
        ALTER TABLE "stop_tasks" ADD COLUMN IF NOT EXISTS "loadedQuantity" decimal(10,2);
        ALTER TABLE "stop_tasks" ADD COLUMN IF NOT EXISTS "deliveredQuantity" decimal(10,2);
        ALTER TABLE "stop_tasks" ADD COLUMN IF NOT EXISTS "rejectedQuantity" decimal(10,2);
        ALTER TABLE "stop_tasks" ADD COLUMN IF NOT EXISTS "rejectionReason" text;
        ALTER TABLE "stop_tasks" ADD COLUMN IF NOT EXISTS "rejectionPhotoUrls" jsonb;
      `);
    } catch (e: any) {
      console.warn(`Failed to auto-migrate stop milestones: ${e?.message}`);
    }

    // Existing trips can carry a stale operational status (for example
    // "driving" while a delivery stop is already unloading). Re-derive it from
    // the stops once so TMS, Planning and the phone read the same record.
    try {
      const stale = await this.repo.find({
        where: { status: In(['started', 'loading', 'driving', 'partially_delivered', 'in_transit']) },
        relations: ['stops'],
      });
      let repaired = 0;
      for (const trip of stale) {
        const derived = deriveTripStatus(((trip as any).stops || []) as any[]);
        if (derived && derived !== trip.status) {
          await this.repo.update(trip.id, { status: derived });
          repaired++;
        }
      }
      if (repaired > 0) console.log(`Trip statuses re-derived from stops: ${repaired}`);

      // Additive backfill for existing production trips. The legacy status is
      // preserved; only the new canonical column is populated.
      const all = await this.repo.find({ relations: ['stops'] });
      for (const trip of all) {
        const operational = deriveOperationalStatus((trip as any).stops || [], trip.status);
        if (trip.operationalStatus !== operational) {
          await this.repo.update(trip.id, { operationalStatus: operational });
        }
      }
    } catch (e: any) {
      console.warn(`Trip status reconciliation skipped: ${e?.message}`);
    }
  }

  findAllForDashboard() {
    // Return trip data enriched with relations needed for dashboard breakdowns
    return this.repo.find({
      select: ['id', 'tripNumber', 'createdAt', 'status', 'distanceKm', 'estimatedProfit', 'actualProfit'],
      relations: ['costs', 'truck', 'driver', 'driver.user', 'trailer', 'stops', 'orders', 'orders.client']
    });
  }

  async findOne(id: string) {
    const trip = await this.repo.findOne({
      where: { id },
      relations: [
        'truck',
        'truck.driver',
        'truck.driver.user',
        'truck.trailer',
        'driver',
        'driver.user',
        'trailer',
        'costs',
        'documents',
        'invoices',
        'messages',
        'stops',
        'stops.tasks',
        'stops.tasks.order',
        'orders',
        'orders.client',
        'orders.cargoItems',
        'orders.stops',
        'dispatcher',
      ],
    });
    return trip ? normalizeTripOperationalStatus(trip) : trip;
  }

  async findByTrackingToken(trackingToken: string): Promise<Trip | null> {
    return this.repo.findOne({
      where: { trackingToken },
      relations: ['truck', 'driver', 'driver.user', 'trailer', 'stops', 'stops.tasks', 'stops.tasks.order', 'orders', 'orders.cargoItems', 'orders.stops', 'company']
    });
  }

  async checkConflict(driverId: string, truckId: string, pickupDate: Date | string, dropoffDate: Date | string, excludeTripId?: string) {
    // Stub
  }

  async findOneByRef(referenceNumber: string): Promise<Trip | null> {
    return this.repo.findOne({
      where: { tripNumber: referenceNumber },
      relations: ['truck', 'driver', 'costs'],
    });
  }

  async create(dto: any, user?: any): Promise<Trip> {
    const count = await this.repo.count();
    const seq = String(count + 1).padStart(6, '0');
    const year = new Date().getFullYear();
    const generatedTripNumber = `TR-${year}-${seq}`;
    const tripNumber = dto.referenceNumber || dto.tripNumber || generatedTripNumber;
    
    const trackingToken = `${tripNumber}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const tripPayload: any = {
      id: dto.id || randomUUID(),
      ...dto,
      tripNumber,
      trackingToken,
      company: dto.companyId ? { id: dto.companyId } : (user?.companyId ? { id: user.companyId } : null),
      truck: dto.truckId ? { id: dto.truckId } : null,
      driver: dto.driverId ? { id: dto.driverId } : null,
      dispatcher: user?.id ? { id: user.id } : null,
      status: TripStatus.PLANNED,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const trip = this.repo.create(tripPayload);
    const saved = await this.repo.save(trip) as any as Promise<Trip>;

    if (user) {
      await this.actionLogs.logAction('Trip', (await saved).id, 'CREATED', user, {});
    }

    return saved;
  }
  async createFromScan(dto: any, user?: any): Promise<Trip | null> {
    const toDate = (date?: string, time?: string) => {
      if (!date) return null;
      const d = new Date(date);
      if (time) {
        const [h, min] = time.split(':').map(Number);
        if (!isNaN(h)) d.setHours(h || 0, min || 0, 0, 0);
      }
      return isNaN(d.getTime()) ? null : d;
    };

    const trip = await this.create({}, user);
    const pickupStop = await this.createStop(trip.id, {
      type: 'pickup',
      companyName: dto.pickupCompanyName || null,
      address: dto.pickupAddress || null,
      timeWindowMin: toDate(dto.pickupDate, dto.pickupTime),
      timeWindowMax: toDate(dto.pickupDate, dto.pickupTime),
      notes: [dto.loadingReference ? `Loading ref: ${dto.loadingReference}` : null, dto.notes ? `Note: ${dto.notes}` : null].filter(Boolean).join('\n') || null,
    });

    const deliveryStop = await this.createStop(trip.id, {
      type: 'delivery',
      companyName: dto.dropoffCompanyName || null,
      address: dto.dropoffAddress || null,
      timeWindowMin: toDate(dto.dropoffDate, dto.dropoffTime),
      timeWindowMax: toDate(dto.dropoffDate, dto.dropoffTime),
      notes: [dto.unloadingReference ? `Unloading ref: ${dto.unloadingReference}` : null, dto.weightKg ? `Greutate: ${dto.weightKg} kg` : null, dto.pallets ? `Paleți: ${dto.pallets}` : null, dto.volumeCbm ? `Volum: ${dto.volumeCbm} m³` : null].filter(Boolean).join('\n') || null,
    });

    const tripId = trip.id;
    const pricingData: any = {};
    if (dto.price) pricingData.price = dto.price;
    if (dto.weightKg) pricingData.weightKg = dto.weightKg;
    if (dto.pallets) pricingData.pallets = dto.pallets;
    if (dto.volumeCbm) pricingData.volumeCbm = dto.volumeCbm;
    try {
      await this.recalculateFinancials(tripId);
    } catch (e) {
      console.warn('Financial recalculation failed on AI import:', e.message);
    }
    return this.findOne(tripId);
  }


  findByTripNumber(tripNumber: string) {
    return this.repo.findOne({
      where: { tripNumber },
      relations: ['orders', 'stops'],
    });
  }

  async assignOrders(tripId: string, orderIds: string[]) {
    // Idempotency guard: retries (or a recovery after a crash between trip
    // creation and assignment) must not duplicate stop tasks or emails.
    const trip = await this.repo.findOne({ where: { id: tripId }, relations: ['orders'] });
    if (!trip) throw new NotFoundException('Trip not found');

    const alreadyAssigned = new Set((trip.orders || []).map(o => o.id));
    const pendingOrderIds = orderIds.filter(id => !alreadyAssigned.has(id));

    if (pendingOrderIds.length === 0) {
      return this.findOne(tripId);
    }

    const result = await this.planningEngine.assignOrdersToTrip(tripId, pendingOrderIds);
    await this.recalculateTripMetrics(tripId);
    await this.recalculateFinancials(tripId);
    
    // Send tracking email to clients of newly assigned orders
    const updatedTrip = await this.findOne(tripId);
    if (updatedTrip && updatedTrip.trackingToken && updatedTrip.orders) {
      for (const order of updatedTrip.orders) {
        // Only send for the orders we just assigned
        if (pendingOrderIds.includes(order.id) && order.client?.contactEmail) {
          const tripPayload = {
            status: updatedTrip.status,
            referenceNumber: updatedTrip.tripNumber,
            pickupAddress: updatedTrip.stops?.find(s => s.tasks?.some(t => t.type === 'load'))?.address || 'N/A',
            dropoffAddress: updatedTrip.stops?.find(s => s.tasks?.some(t => t.type === 'unload'))?.address || 'N/A',
            client: order.client
          };
          await this.resendService.sendTripStatusEmail(tripPayload, updatedTrip.trackingToken, updatedTrip.company)
            .catch(err => console.error('Failed to send tracking email on assign:', err));
        }
      }
    }
    
    return result;
  }

  async update(id: string, dto: any, user?: any) {
    const updateData: any = { ...dto };
    delete updateData.client;
    delete updateData.pickupAddress;
    delete updateData.dropoffAddress;

    if ('driverId' in updateData) {
      updateData.driver = updateData.driverId ? { id: updateData.driverId } : null;
      delete updateData.driverId;
    }
    if ('truckId' in updateData) {
      updateData.truck = updateData.truckId ? { id: updateData.truckId } : null;
      delete updateData.truckId;
    }

    const existing = await this.findOne(id);
    if (!existing) throw new NotFoundException('Trip not found');

    // A driver may only touch the operational state of their own trip, and may
    // never reassign vehicles, drivers or prices through this route.
    if (isDriverActor(user)) {
      assertActorMayOperateTrip(existing, user);
      // Starting, arriving, loading and unloading are stop-level operations.
      // A driver may never jump the lifecycle by PATCHing a later status here.
      const driverStatuses = ['driver_received', 'driver_accepted', 'started'];
      if (updateData.status && !driverStatuses.includes(String(updateData.status))) {
        throw new ForbiddenException('Șoferul poate actualiza doar starea operațională a cursei proprii');
      }
      for (const field of ['driverId', 'driver', 'truckId', 'truck', 'trailerId', 'trailer', 'price', 'companyId', 'dispatcherId', 'locked', 'validationStatus']) {
        delete updateData[field];
      }
    }

    // Acceptance is a driver decision, never a dispatch-side status edit.
    // A dispatcher may send/reassign a trip, but cannot manufacture consent.
    if (updateData.status === 'driver_accepted' && !isDriverActor(user)) {
      throw new ForbiddenException('Only the assigned driver can accept a trip.');
    }
    if (updateData.status === 'driver_accepted') {
      if (isTripAccepted(existing)) return existing;
      if (!updateData.driverAcceptedAt) updateData.driverAcceptedAt = new Date();
    }

    // Driver acceptance is idempotent, and starting is impossible before the
    // driver has accepted. These guards are authoritative: hiding a button in
    // the app is never the control.
    if (isDriverActor(user) && updateData.status === 'started') {
      if (!isTripAccepted(existing)) {
        throw new ConflictException('Trip must be accepted before it can be started.');
      }
      const progressed = ((existing as any).stops || []).some(
        (stop: any) => normalizeStopStatus(stop.status) !== 'pending',
      );
      if (progressed) {
        throw new ConflictException('Trip has already progressed beyond the start stage.');
      }
    }

    // 0. Enforce the status state machine
    if (updateData.status && updateData.status !== existing.status) {
      const allowed = TRIP_STATUS_FLOW[existing.status] || [
        TripStatus.PLANNING,
        TripStatus.PLANNED,
        TripStatus.ASSIGNED,
        TripStatus.DISPATCHED,
        TripStatus.CANCELLED,
      ];
      const isCancellation = updateData.status === 'cancelled' && existing.status !== 'closed';
      const isDispatch = updateData.status === 'dispatched' && ['planning', 'planned', 'assigned', 'confirmed', 'driver_received', 'dispatched'].includes(existing.status);

      if (!allowed.includes(updateData.status) && !isCancellation && !isDispatch) {
        throw new ConflictException(`Invalid transition from ${existing.status} to ${updateData.status}`);
      }
    }

    if (updateData.status) {
      updateData.operationalStatus = operationalStatusFromLegacy(updateData.status);
    }

    // 1. Generate Tracking Token & Dispatch Fields on Dispatch
    if (dto.status === 'dispatched') {
      if (!existing.trackingToken) {
        const refCode = existing.tripNumber || existing.orders?.[0]?.orderNumber || 'HC-TRIP';
        const cleanRef = refCode.startsWith('HC-') ? refCode : `HC-${refCode}`;
        const token = `${cleanRef}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        updateData.trackingToken = token;
      }
      updateData.dispatchVersion = (existing.dispatchVersion || 0) + 1;
      updateData.dispatchedAt = new Date();
      if (user?.id) {
        updateData.dispatchedBy = { id: user.id } as any;
      }
      // Persist the effective assignment so the driver app can resolve the
      // trip from its own account instead of relying on the truck relation.
      const dispatchDriver = resolveTripDriver(existing);
      if (dispatchDriver && !existing.driver) updateData.driver = dispatchDriver;
      const dispatchTrailer = resolveTripTrailer(existing);
      if (dispatchTrailer && !existing.trailer) updateData.trailer = dispatchTrailer;
    }

    await this.repo.update(id, updateData);

    // Every status change is attributable: who did it, from where and when.
    if (updateData.status && updateData.status !== existing.status) {
      const source = resolveStatusSource(user);
      if (['started', 'in_transit'].includes(String(updateData.status)) && !existing.actualDeparture) {
        await this.repo.update(id, { actualDeparture: new Date() });
      }
      const opStatus = updateData.operationalStatus;
      if (['driver_accepted', 'started', 'in_transit', 'cancelled'].includes(String(updateData.status))) {
        for (const order of (existing as any).orders || []) {
          if (order?.id) {
            await this.repo.manager.update('Order', { id: order.id }, {
              operationalStatus: opStatus,
              ...(updateData.status === 'cancelled' ? { status: 'cancelled' } : {}),
            });
          }
        }
      }
      await this.actionLogs.logAction('Trip', id, 'STATUS_CHANGED', user, {
        previousStatus: existing.status,
        newStatus: updateData.status,
        operationalStatus: opStatus,
        source,
        scope: 'trip',
      }, undefined, source);
      this.chatGateway?.broadcastOperationalUpdate?.({
        tripId: id,
        operationalStatus: opStatus,
        status: updateData.status,
        event: 'TRIP_STATUS_CHANGED',
      });
      if (source === 'mobile') {
        const driverName = (existing as any).driver?.user?.name || (existing as any).truck?.driver?.user?.name || 'Driver';
        await this.notificationsService.createOnce({
          type: 'trip',
          title: `${driverName}: ${updateData.status === 'started' ? 'Trip started' : updateData.status === 'driver_accepted' ? 'Trip accepted' : updateData.status}`,
          message: `${existing.tripNumber || 'Trip'}: ${updateData.status}.`,
          relatedId: id,
          eventId: this.notificationKey('trip-status', id, updateData.status),
          origin: 'DRIVER_APP',
          audience: 'tms',
        }).catch((e: any) => console.warn(`TMS notification failed: ${e?.message}`));
      } else if (source === 'tms' && ['dispatched', 'assigned', 'cancelled'].includes(String(updateData.status))) {
        const driverUser = (existing as any).driver?.user || (existing as any).truck?.driver?.user;
        const token = driverUser?.fcmToken;
        if (token) {
          const driverLabel = localizeTripEvent(updateData.status, driverUser?.language);
          const delivered = await this.notificationsService.createOnce({
            type: 'trip',
            title: driverLabel,
            message: `${existing.tripNumber || 'Trip'}: ${driverLabel}.`,
            relatedId: id,
            eventId: this.notificationKey('trip-status', id, updateData.status),
            origin: 'TMS_DISPATCH',
            audience: 'driver',
          });
          if (delivered.created) await this.firebaseService.sendPushNotification(
            token,
            driverLabel,
            `${existing.tripNumber || 'Trip'}: ${driverLabel}.`,
            { tripId: id },
          ).catch((e: any) => console.warn(`Driver push failed: ${e?.message}`));
        }
      }
    }

    // 2. Real financial recalculation (CostEngine + PricingEngine)
    // Financial recalculation is a TMS concern; a driver changing an
    // operational stage must never fail because cost data is incomplete.
    if (!isDriverActor(user) && (updateData.distanceKm !== undefined || updateData.status !== undefined)) {
      await this.recalculateFinancials(id);
    }

    const updated = await this.findOne(id);

    // A dispatcher schedule/assignment edit must reach the assigned driver and
    // must not be re-sent on a retry of the same edit.
    if (!isDriverActor(user) && updated) {
      const scheduleFields = ['plannedDeparture', 'plannedArrival', 'driverId', 'truckId', 'trailerId']
        .filter((field) => updateData[field] !== undefined && String(updateData[field] ?? '') !== String((existing as any)[field] ?? ''));
      if (scheduleFields.length > 0) await this.notifyScheduleChange(updated, scheduleFields);
    }

    // 3. Status change notifications & Email Send on Dispatch
    if (dto.status === 'dispatched' && updated) {
      // The push token is the FCM registration token, never the user id.
      const driverUser = updated.driver?.user;
      const driverFcmToken = driverUser?.fcmToken;
      if (driverFcmToken) {
        const label = localizeTripEvent('dispatched', driverUser?.language);
        const delivered = await this.notificationsService.createOnce({
          type: 'trip',
          title: label,
          message: `${updated.tripNumber}: ${label}.`,
          relatedId: updated.id,
          eventId: this.notificationKey('trip-status', updated.id, 'dispatched'),
          origin: 'TMS_DISPATCH',
          audience: 'driver',
        });
        if (delivered.created) await this.firebaseService.sendPushNotification(
          driverFcmToken,
          label,
          `${updated.tripNumber}: ${label}.`,
          { tripId: updated.id }
        ).catch(err => console.error('FCM send failed', err));
      }

      if (updated.orders && updated.orders.length > 0) {
        for (const order of updated.orders) {
          if (order.client?.contactEmail) {
            const tripPayload = {
              status: updated.status,
              referenceNumber: updated.tripNumber,
              pickupAddress: updated.stops?.find(s => s.tasks?.some(t => t.type === 'load'))?.address || 'N/A',
              dropoffAddress: updated.stops?.find(s => s.tasks?.some(t => t.type === 'unload'))?.address || 'N/A',
              client: order.client
            };
            await this.resendService.sendTripStatusEmail(tripPayload, updated.trackingToken || '', updated.company).catch(e => console.error('Failed to send email:', e));
          }
        }
      }
    }

    if (user) {
      // Log only the fields whose value really changed (system-generated dispatch fields excluded)
      const { updatedFields, changes } = computeAuditChanges(existing, dto, {
        relations: { driverId: 'driver', truckId: 'truck', trailerId: 'trailer', clientId: 'client' },
        ignore: ['orders', 'stops', 'costs', 'pickupAddress', 'dropoffAddress', 'client', 'trackingToken', 'dispatchVersion', 'dispatchedAt', 'dispatchedBy'],
      });
      if (updatedFields.length > 0) {
        await this.actionLogs.logAction('Trip', id, 'UPDATED', user, { updatedFields, changes });
      }
    }

    return updated;
  }

  async reorderStops(tripId: string, stopIds: string[]) {
    // We update the 'sequence' column based on the index in the stopIds array
    for (let i = 0; i < stopIds.length; i++) {
      await this.repo.manager.update('Stop', { id: stopIds[i] }, { sequence: i + 1 });
    }
    return this.findOne(tripId);
  }

  async remove(id: string) { 
    return this.repo.delete(id); 
  }

  addCost(tripId: string, dto: Partial<TripCost>) {
    const cost = this.costsRepo.create({ ...dto, trip: { id: tripId } as any });
    return this.costsRepo.save(cost);
  }

  async getStats(month?: number, year?: number, preloadedTrips?: Trip[]) {
    const trips = preloadedTrips || await this.findAllForDashboard();
    const filtered = trips.filter(t => {
      if (!month || !year) return true;
      const d = new Date(t.createdAt);
      return d.getMonth() + 1 === Number(month) && d.getFullYear() === Number(year);
    });

    const totalRevenue = filtered.reduce((s, t) => {
      const orderRev = t.orders?.reduce((sum, o) => sum + (Number(o.price) || 0), 0) || 0;
      return s + (orderRev || Number(t.estimatedProfit) || 0);
    }, 0);

    const totalCost = filtered.reduce((s, t) => {
      const addedCosts = t.costs?.reduce((sc, c) => sc + Number(c.amount), 0) || 0;
      const estCost = (Number(t.distanceKm) || 0) * (Number(t.truck?.costPerKm) || 1.15);
      return s + addedCosts + estCost;
    }, 0);

    const profit = totalRevenue - totalCost;
    const totalKm = filtered.reduce((s, t) => s + (Number(t.distanceKm) || 0), 0);
    const active = filtered.filter(t => ['planned', 'started', 'driving', 'loading', 'in_progress', 'dispatched'].includes(t.status)).length;
    const tripsCount = filtered.length;

    return { totalRevenue, totalCost, profit, totalKm, costPerKm: totalKm > 0 ? totalCost / totalKm : 0, active, tripsCount };
  }


  async getIftaReport(from?: string, to?: string) {
    const endDate = to ? new Date(to + 'T23:59:59') : new Date();
    const startDate = from ? new Date(from + 'T00:00:00') : new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);

    const trips = await this.repo.find({
      where: { status: TripStatus.COMPLETED, actualArrival: Between(startDate, endDate) },
      relations: ['stops', 'truck'],
    });

    const countryKm: Record<string, { km: number; trips: Set<string> }> = {};
    const truckCountry: Record<string, Record<string, number>> = {};
    const totalKm = trips.reduce((sum, t) => sum + (Number(t.distanceKm) || 0), 0);

    for (const trip of trips) {
      const sorted = [...(trip.stops || [])].sort((a, b) => a.sequence - b.sequence);
      const distance = Number(trip.distanceKm) || 0;
      const segments = Math.max(1, sorted.length - 1);
      const plate = trip.truck?.plateNumber || 'N/A';

      sorted.forEach((stop, idx) => {
        if (idx === 0) return;
        const country = stop.country || 'N/A';
        const segKm = distance / segments;
        if (!countryKm[country]) countryKm[country] = { km: 0, trips: new Set<string>() };
        countryKm[country].km += segKm;
        countryKm[country].trips.add(trip.id);
        if (!truckCountry[plate]) truckCountry[plate] = {};
        truckCountry[plate][country] = (truckCountry[plate][country] || 0) + segKm;
      });
    }

    return {
      period: { from: startDate, to: endDate },
      totalKm,
      byCountry: Object.entries(countryKm)
        .map(([country, v]) => ({ country, km: Math.round(v.km), trips: v.trips.size }))
        .sort((a, b) => b.km - a.km),
      byTruck: Object.entries(truckCountry).map(([plate, countries]) => ({
        truck: plate,
        totalKm: Math.round(Object.values(countries).reduce((a, b) => a + b, 0)),
        countries: Object.entries(countries).map(([c, km]) => ({ country: c, km: Math.round(km) })),
      })),
    };
  }

  async getMonthlyProfits() {
    const allTrips = await this.findAllForDashboard();
    const now = new Date();
    const results = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const stats = await this.getStats(d.getMonth() + 1, d.getFullYear(), allTrips);
      results.push({ month: d.toLocaleString('ro', { month: 'short' }), ...stats });
    }
    return results;
  }

  /**
   * A driver action on a stop updates the stop, the trip stage and the orders
   * carried by that stop together, with server timestamps and an audit event.
   * The TMS reads the same records, so no separate sync step is required.
   */
  async updateStopStatus(stopId: string, status: string, user?: any) {
    const stop = (await this.repo.manager.findOne('Stop', {
      where: { id: stopId },
      relations: [
        'trip',
        'trip.driver',
        'trip.driver.user',
        'trip.truck',
        'trip.truck.driver',
        'trip.truck.driver.user',
        'tasks',
        'tasks.order',
      ],
    })) as any;
    if (!stop) throw new NotFoundException('Stop not found');
    const trip = stop.trip;
    if (!trip) throw new NotFoundException('Trip not found');
    assertActorMayOperateTrip(trip, user);

    if (isDriverActor(user)) {
      if (!isTripAccepted(trip)) {
        throw new ConflictException('Trip must be accepted before a stop can be worked.');
      }
      const op = String(trip.operationalStatus || '').toUpperCase();
      if (op === 'ACCEPTED' || String(trip.status) === 'driver_accepted') {
        throw new ConflictException('Trip must be started before a stop can be worked.');
      }
    }

    const next = String(status || '').toLowerCase();
    if (!isStopStatus(next)) {
      throw new BadRequestException(`Stare de oprire necunoscută: ${status} (acceptate: ${STOP_STATUSES.join(', ')})`);
    }

    const stopType = normalizeStopType(stop.type, stop.sequence);
    const previous = normalizeStopStatus(stop.status);
    // Repeated taps are absorbed instead of creating a second event.
    if (previous === next) return this.findOne(trip.id);
    assertStopTransition(stopType, previous, next);

    // Completion is gated by the configured proof requirement and by any open
    // full/partial rejection. Validate before writing so a failed proof upload
    // can never leave a completed stop behind.
    if (stopType === 'delivery' && next === 'completed') {
      const blocking = await this.openBlockingIncident(trip.id, stop.id);
      if (blocking) {
        throw new ConflictException('Delivery is rejected. The dispatcher must resolve the incident before completion.');
      }
      if (trip.podRequired !== false) {
        const podDocs = await this.podDocumentsFor(trip.id);
        if (podDocs.length === 0) {
          throw new ConflictException('A POD is required before the delivery can be completed');
        }
      }
    }

    const at = new Date();
    Object.assign(stop, { status: next }, timestampsForStop(next, at));
    await this.repo.manager.save('Stop', stop);

    const orderIds = new Set<string>(this.orderIdsForStop(stop, trip));
    if (orderIds.size === 0) {
      try {
        const tripOrders = await this.repo.manager.getRepository(Order).find({
          where: { trip: { id: trip.id } },
          select: ['id'],
        });
        if (tripOrders.length === 1) orderIds.add(String(tripOrders[0].id));
      } catch (e: any) {
        console.warn(`Order linkage lookup skipped: ${e?.message}`);
      }
    }
    const orderStatus = deriveOrderStatusForStop(stopType, next);
    let orderOperational: string | undefined;
    for (const orderId of orderIds) {
      if (stopType !== 'delivery') {
        const op = deriveOrderOperationalStatus(stopType, next);
        orderOperational = op;
        const patch: any = { operationalStatus: op };
        if (orderStatus && orderStatus !== 'delivered') patch.status = orderStatus;
        await this.repo.manager.update('Order', { id: orderId }, patch);
        continue;
      }
      const progress = await this.orderDeliveryProgress(trip.id, orderId, stopType, next);
      orderOperational = progress.operationalStatus;
      const patch: any = {
        operationalStatus: progress.operationalStatus,
      };
      // A multi-stop order is delivered only after every delivery allocation is
      // complete. One completed delivery stop must not close the whole order.
      if (progress.allDeliveriesDone) patch.status = 'delivered';
      else if (orderStatus && orderStatus !== 'delivered') patch.status = orderStatus;
      await this.repo.manager.update('Order', { id: orderId }, patch);
      if (progress.allDeliveriesDone) {
        await this.ensureDraftInvoice(orderId, user);
      }
    }

    const stops = (await this.repo.manager.find('Stop', {
      where: { trip: { id: trip.id } },
    })) as any[];
    const derived = deriveTripStatus(stops);
    const operationalStatus = deriveOperationalStatus(stops, derived);
    const tripPatch: any = { operationalStatus };
    if (derived && derived !== trip.status) tripPatch.status = derived;
    if (stopType === 'pickup' && next === 'completed' && !trip.actualDeparture) {
      tripPatch.actualDeparture = at;
    }
    if (derived === 'completed' && !trip.actualArrival) tripPatch.actualArrival = at;
    await this.repo.update(trip.id, tripPatch);

    const source = resolveStatusSource(user);
    await this.actionLogs.logAction('Trip', trip.id, 'STATUS_CHANGED', user, {
      scope: 'stop',
      stopId: stop.id,
      stopType,
      previousStatus: previous,
      newStatus: next,
      tripStatus: derived,
      operationalStatus,
      orderStatus,
      orderOperational,
      source,
    }, undefined, source);

    this.chatGateway?.broadcastOperationalUpdate?.({
      tripId: trip.id,
      operationalStatus,
      status: derived,
      stopId: stop.id,
      event: 'STOP_STATUS_CHANGED',
    });
    await this.notifyOperationalEvent(trip, stop, previous, next, stopType, user);

    return this.findOne(trip.id);
  }

  /** Records actual loaded/delivered/rejected quantities for one allocation. */
  async updateTaskQuantities(taskId: string, dto: any, user?: any) {
    const task = (await this.repo.manager.findOne('StopTask', {
      where: { id: taskId },
      relations: ['stop', 'stop.trip', 'stop.trip.driver', 'stop.trip.driver.user', 'stop.trip.truck', 'stop.trip.truck.driver', 'stop.trip.truck.driver.user', 'order'],
    })) as any;
    if (!task) throw new NotFoundException('Task not found');
    const trip = task.stop?.trip;
    if (trip) assertActorMayOperateTrip(trip, user);

    const num = (value: any): number | null => {
      if (value === undefined || value === null || value === '') return null;
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed < 0) throw new BadRequestException('Quantity must be a non-negative number');
      return Math.round(parsed * 100) / 100;
    };
    const planned = Number(task.quantity || task.pallets || 0);
    const loaded = num(dto.loadedQuantity);
    const delivered = num(dto.deliveredQuantity);
    const rejected = num(dto.rejectedQuantity);
    if (loaded !== null && planned > 0 && loaded > planned) {
      throw new BadRequestException(`Loaded quantity ${loaded} exceeds the allocated quantity ${planned}`);
    }
    if (delivered !== null && rejected !== null && loaded !== null && delivered + rejected > loaded) {
      throw new BadRequestException('Delivered plus rejected quantity cannot exceed the loaded quantity');
    }
    if (rejected !== null && rejected > 0 && !String(dto.rejectionReason || task.rejectionReason || '').trim()) {
      throw new BadRequestException('A reason is required when cargo is rejected');
    }

    const patch: any = {};
    if (loaded !== null) patch.loadedQuantity = loaded;
    if (delivered !== null) patch.deliveredQuantity = delivered;
    if (rejected !== null) patch.rejectedQuantity = rejected;
    if (dto.rejectionReason !== undefined) patch.rejectionReason = String(dto.rejectionReason || '').trim() || null;
    if (dto.rejectionPhotoUrls !== undefined) patch.rejectionPhotoUrls = Array.isArray(dto.rejectionPhotoUrls) ? dto.rejectionPhotoUrls : [];
    await this.repo.manager.update('StopTask', { id: taskId }, patch);

    if (rejected && rejected > 0 && trip) {
      await this.notificationsService.createOnce({
        type: 'alert',
        title: 'Cargo rejection reported',
        message: `${trip.tripNumber || 'Trip'} · ${task.order?.orderNumber || 'Order'}: ${rejected} rejected. Reason: ${patch.rejectionReason || task.rejectionReason || 'not specified'}.`,
        relatedId: trip.id,
        eventId: this.notificationKey('cargo-rejection', trip.id, taskId, rejected, patch.rejectionReason || task.rejectionReason || ''),
        origin: 'DRIVER_APP',
        audience: 'tms',
      }).catch(() => undefined);
    }

    await this.actionLogs.logAction('Trip', trip?.id || task.stop?.id, 'QUANTITIES_UPDATED', user, {
      scope: 'task', taskId, orderId: task.order?.id, ...patch,
    }, undefined, resolveStatusSource(user));
    return trip ? this.findOne(trip.id) : task;
  }

  /** Dispatcher decision on the driver's submitted allocation/evidence. */
  async reviewAllocation(taskId: string, dto: any, user?: any) {
    if (!user?.id) throw new ForbiddenException('Authentication is required to review an allocation.');
    if (isDriverActor(user)) throw new ForbiddenException('Only dispatch or office staff can review cargo allocations.');
    const role = String(user?.role || '').toLowerCase();
    if (!['admin', 'superadmin', 'dispatcher', 'manager', 'office', 'operations'].includes(role)) {
      throw new ForbiddenException('Your role is not permitted to review cargo allocations.');
    }
    const status = String(dto?.status || '').trim().toLowerCase();
    if (!['accepted', 'disputed'].includes(status)) {
      throw new BadRequestException('Review status must be accepted or disputed.');
    }
    const note = String(dto?.note || '').trim();
    if (status === 'disputed' && !note) {
      throw new BadRequestException('A review note is required when disputing the driver evidence.');
    }
    const task = (await this.repo.manager.findOne('StopTask', {
      where: { id: taskId },
      relations: ['stop', 'stop.trip', 'order'],
    })) as any;
    if (!task) throw new NotFoundException('Allocation not found');
    const trip = task.stop?.trip;
    if (!trip) throw new BadRequestException('Allocation is not attached to a trip.');
    const previous = {
      status: task.allocationReviewStatus || null,
      note: task.allocationReviewNote || null,
      reviewedAt: task.allocationReviewedAt || null,
    };
    await this.repo.manager.update('StopTask', { id: taskId }, {
      allocationReviewStatus: status,
      allocationReviewNote: note || null,
      allocationReviewedAt: new Date(),
      allocationReviewedBy: { id: user.id },
    });
    await this.actionLogs.logAction('Trip', trip.id, 'CARGO_ALLOCATION_REVIEWED', user, {
      scope: 'task',
      taskId,
      orderId: task.order?.id || null,
      previous,
      decision: status,
      note: note || null,
      driverSubmitted: {
        loadedQuantity: task.loadedQuantity,
        deliveredQuantity: task.deliveredQuantity,
        rejectedQuantity: task.rejectedQuantity,
        rejectionReason: task.rejectionReason,
        rejectionPhotoUrls: task.rejectionPhotoUrls || [],
      },
    }, undefined, resolveStatusSource(user));
    this.chatGateway?.broadcastOperationalUpdate?.({
      tripId: trip.id,
      operationalStatus: normalizeTripOperationalStatus(trip.operationalStatus || trip.status),
      status: trip.status,
      stopId: task.stop?.id,
      event: 'CARGO_ALLOCATION_REVIEWED',
    });
    return this.findOne(trip.id);
  }

  async updateTaskStatus(taskId: string, status: string, user?: any) {
    const task = (await this.repo.manager.findOne('StopTask', {
      where: { id: taskId },
      relations: ['stop', 'stop.trip', 'stop.trip.driver', 'stop.trip.driver.user', 'stop.trip.truck', 'stop.trip.truck.driver', 'stop.trip.truck.driver.user'],
    })) as any;
    if (!task) throw new NotFoundException('Task not found');
    const trip = task.stop?.trip;
    if (trip) assertActorMayOperateTrip(trip, user);
    if (task.status === status) return trip ? this.findOne(trip.id) : task;
    (task as any).status = status;
    if (status === 'completed') {
      (task as any).completedAt = new Date();
      if (user?.id) (task as any).completedBy = { id: user.id };
    }
    const saved = await this.repo.manager.save('StopTask', task);
    if (trip) {
      const source = resolveStatusSource(user);
      await this.actionLogs.logAction('Trip', trip.id, 'STATUS_CHANGED', user, {
        scope: 'task',
        taskId: task.id,
        stopId: task.stop?.id,
        previousStatus: task.status,
        newStatus: status,
        source,
      }, undefined, source);
    }
    return trip ? this.findOne(trip.id) : saved;
  }


  async createStop(tripId: string, stopData: any) {
    const trip = await this.findOne(tripId);
    if (!trip) throw new Error("Trip not found");
    const sequence = (trip.stops?.length || 0) + 1;
    const stop = this.repo.manager.create("Stop", {
      ...stopData,
      trip: { id: tripId } as any,
      sequence,
      status: "pending",
    });
    const saved = await this.repo.manager.save("Stop", stop);
    return this.findOne(tripId);
  }

  async updateStop(stopId: string, data: any, user?: any) {
    const stop = await this.repo.manager.findOne('Stop', {
      where: { id: stopId },
      relations: ['trip', 'trip.driver', 'trip.driver.user', 'trip.truck', 'trip.truck.driver', 'trip.truck.driver.user'],
    }) as any;
    if (!stop) return null;
    const changes = diffStopChanges(stop, data || {});
    Object.assign(stop, data);
    await this.repo.manager.save('Stop', stop);
    const trip = stop.trip;
    if (trip && changes.length > 0) {
      await this.actionLogs.logAction('Trip', trip.id, 'STOP_UPDATED', user, {
        scope: 'stop',
        stopId: stop.id,
        orderId: null,
        changes: changes.map((change) => ({ field: change.field, from: change.oldValue, to: change.newValue })),
        source: resolveStatusSource(user),
      }, undefined, resolveStatusSource(user));
      if (!isDriverActor(user)) {
        const driverUser = trip?.driver?.user || trip?.truck?.driver?.user;
        for (const change of changes) {
          const label = localizeStopChange(change, driverUser?.language);
          const eventId = this.notificationKey('tms-stop-change', trip.id, stop.id, change.field, change.oldValue, change.newValue);
          try {
            const delivered = await this.notificationsService.createOnce({
              type: 'trip',
              title: label,
              message: `${trip.tripNumber || 'Trip'}${stop.city ? ` · ${stop.city}` : ''}: ${label}`,
              relatedId: trip.id,
              eventId,
              origin: 'TMS_DISPATCH',
              audience: 'driver',
            });
            if (delivered.created && driverUser?.fcmToken) {
              await this.firebaseService.sendPushNotification(
                driverUser.fcmToken,
                label,
                `${trip.tripNumber || 'Trip'}: ${label}`,
                { tripId: trip.id, stopId: stop.id, screen: 'trip' },
              );
            }
          } catch (e: any) {
            console.warn(`Stop change notification failed: ${e?.message}`);
          }
        }
        this.chatGateway?.broadcastOperationalUpdate?.({
          tripId: trip.id,
          operationalStatus: normalizeTripOperationalStatus(trip.operationalStatus || trip.status),
          status: trip.status,
          stopId: stop.id,
          event: 'STOP_CHANGED',
        });
      }
    }
    return this.findOne(stop.trip?.id || '');
  }

  async deleteStop(stopId: string) {
    const stop = await this.repo.manager.findOne("Stop", { where: { id: stopId }, relations: ["trip"] }) as any;
    if (!stop) return null;
    const tripId = stop.trip?.id;
    await this.repo.manager.delete("Stop", stopId);
    if (tripId) return this.findOne(tripId);
    return null;
  }

  async createTask(stopId: string, taskData: any) {
    const stop = await this.repo.manager.findOne("Stop", { where: { id: stopId }, relations: ["trip"] }) as any;
    if (!stop) throw new Error("Stop not found");
    const task = this.repo.manager.create("StopTask", {
      ...taskData,
      stop: { id: stopId } as any,
      status: "pending",
    });
    await this.repo.manager.save("StopTask", task);
    return this.findOne(stop.trip?.id || "");
  }

  async updateTask(taskId: string, data: any) {
    const task = await this.repo.manager.findOne("StopTask", { where: { id: taskId }, relations: ["stop", "stop.trip"] }) as any;
    if (!task) return null;
    Object.assign(task, data);
    await this.repo.manager.save("StopTask", task);
    if (task.stop?.trip) return this.findOne(task.stop.trip.id);
    return null;
  }

    async optimizeRoute(tripId: string) {
    await this.planningEngine.sequenceStops(tripId);
    return this.findOne(tripId);
  }

  async migrateLegacyTrips() {
    const legacyTrips = await this.repo.find({
      relations: ['company', 'stops']
    });

    let migrated = 0;
    for (const trip of legacyTrips) {
      if (trip.stops && trip.stops.length > 0) continue; // Already migrated
      if (!(trip as any).pickupAddress) continue; // No legacy data

      const orderPayload: any = {
        company: trip.company,
        client: (trip as any).client,
        referenceNumber: (trip as any).referenceNumber,
        loadingReference: (trip as any).loadingReference,
        unloadingReference: (trip as any).unloadingReference,
        cmrReference: (trip as any).cmrReference,
        status: 'assigned',
        transportType: 'ftl',
        price: (trip as any).agreedPrice || (trip as any).price,
        currency: 'EUR',
        stops: [
          {
            type: 'pickup',
            sequence: 1,
            address: (trip as any).pickupAddress,
            companyName: (trip as any).pickupCompanyName,
            dateFrom: (trip as any).pickupDate,
          },
          {
            type: 'dropoff',
            sequence: 2,
            address: (trip as any).dropoffAddress,
            companyName: (trip as any).dropoffCompanyName,
            dateFrom: (trip as any).dropoffDate,
          }
        ],
        cargoItems: [
          {
            description: 'Legacy Cargo',
            quantity: (trip as any).pallets || 1,
            unit: 'pallet',
            weightKg: (trip as any).weightKg,
          }
        ]
      };

      const order = this.repo.manager.create('Order', orderPayload);
      const savedOrder: any = await this.repo.manager.save('Order', order);
      
      await this.planningEngine.assignOrdersToTrip(trip.id, [savedOrder.id]);
      migrated++;
    }

    return { success: true, migrated };
  }

  @OnEvent('order.updated')
  async handleOrderUpdated(order: any) {
    if (order.trip && order.trip.id) {
      try {
        // 1. Find all StopTasks for this order and delete them
        await this.repo.manager.delete('StopTask', { order: { id: order.id } });
        
        // 2. Delete empty stops for this trip
        const trip = await this.repo.findOne({ where: { id: order.trip.id }, relations: ['stops', 'stops.tasks'] });
        if (trip && trip.stops) {
          for (const s of trip.stops) {
            if (!s.tasks || s.tasks.length === 0) {
              await this.repo.manager.delete('Stop', { id: s.id });
            }
          }
        }
        
        // 3. Re-assign order to trip to recreate the tasks and stops silently (without emails)
        await this.planningEngine.assignOrdersToTrip(order.trip.id, [order.id], true);

        // 4. Recalculate trip distance and duration
        await this.recalculateTripMetrics(order.trip.id);
      } catch (err) {
        console.error('Error in handleOrderUpdated:', err);
      }
    }
  }

  async recalculateTripMetrics(tripId: string) {
    const trip = await this.repo.findOne({
      where: { id: tripId },
      relations: ['stops']
    });
    if (!trip || !trip.stops || trip.stops.length < 2) return;

    const sorted = trip.stops.sort((a, b) => a.sequence - b.sequence);
    let totalDist = 0;
    // Every leg keeps its own answer so its currency is checked before anything
    // is added: a PLN section must never be summed into a EUR total.
    const legTolls: any[] = [];

    for (let i = 0; i < sorted.length - 1; i++) {
      const from = sorted[i];
      const to = sorted[i+1];
      if (from.latitude && from.longitude && to.latitude && to.longitude) {
        try {
          const res = await this.routingService.calculateRoute(
             Number(from.latitude), Number(from.longitude),
             Number(to.latitude), Number(to.longitude)
          );
          if (res && res.distanceKm) {
            totalDist += res.distanceKm;
          }
          if (res) {
            legTolls.push(res);
          }
        } catch (e) {
          console.error('Routing failed in recalculateTripMetrics', e);
        }
      }
    }

    if (totalDist > 0) {
      trip.distanceKm = totalDist;
      // Fail closed: a consolidated EUR total is persisted only when every leg
      // returned a reconcilable EUR figure. Mixed or partial toll data marks the
      // trip unavailable and never keeps a relabelled total.
      const tolls = aggregateLegTolls(legTolls, sorted.length - 1);
      if (tolls.totalCost !== null) {
        trip.tollCost = tolls.totalCost;
        trip.tollStatus = tolls.status === 'calculated_zero' ? 'calculated_zero' : 'calculated';
      } else {
        trip.tollCost = null as any;
        trip.tollStatus = 'unavailable';
      }
      await this.repo.save(trip);
    }

    // 3. Recompute real costs (incl. tolls) and profit once distances are known
    await this.recalculateFinancials(tripId);
  }

  /**
   * Recomputes a trip's real cost (fuel, tolls, driver days, manual costs) and profit
   * using the CostEngine + PricingEngine and persists them on the trip.
   */
  async recalculateFinancials(tripId: string) {
    const trip = await this.findOne(tripId);
    if (!trip) return null;

    const financials = await this.pricingEngine.calculateFinancials(trip);

    await this.repo.update(tripId, {
      estimatedCost: financials.cost,
      estimatedProfit: financials.profit,
      actualProfit: financials.profit,
      ...(financials.costBreakdown.tollCostAvailable ? { tollCost: financials.costBreakdown.tollCost } : {}),
      estimatedCostBreakdown: financials.costBreakdown as any,
      costCalculatedAt: new Date(),
    });

    return financials;
  }
}
