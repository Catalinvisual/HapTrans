import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect, WsException } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { actorOwnsTrip } from '../trips/trip-progress';

/** Room every authenticated socket joins; global broadcasts are scoped to it. */
const AUTHENTICATED_ROOM = 'authenticated';
import { ChatService } from './chat.service';
import { NotificationsService } from '../notifications/notifications.service';
import { FirebaseService } from '../firebase/firebase.service';
import { TripsService } from '../trips/trips.service';
import { DriversService } from '../drivers/drivers.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private chatService: ChatService,
    private notificationsService: NotificationsService,
    private firebaseService: FirebaseService,
    @Inject(forwardRef(() => TripsService)) private tripsService: TripsService,
    private driversService: DriversService,
    private readonly jwtService: JwtService,
  ) {}

  /** Accepts the token the apps already send, in any of the usual places. */
  private extractToken(client: Socket): string | null {
    const auth = client.handshake?.auth as { token?: string } | undefined;
    const header = String(client.handshake?.headers?.authorization || '');
    const bearer = header.replace(/^Bearer\s+/i, '');
    const query = client.handshake?.query?.token;
    const candidate = auth?.token || bearer || (typeof query === 'string' ? query : '');
    return candidate ? String(candidate) : null;
  }

  private requireUser(client: Socket): { id: string; role?: string } {
    const user = client.data?.user as { id: string; role?: string } | undefined;
    if (!user?.id) {
      throw new WsException('Authentication required');
    }
    return user;
  }

  handleConnection(client: Socket) {
    const token = this.extractToken(client);
    if (!token) {
      // Anonymous sockets may stay connected but receive nothing and cannot
      // act; every handler below refuses them.
      return;
    }
    try {
      const payload: any = this.jwtService.verify(token);
      if (!payload?.sub) return;
      client.data.user = { id: String(payload.sub), role: payload.role };
      client.join(AUTHENTICATED_ROOM);
    } catch {
      // Invalid or expired token: treat the socket as anonymous.
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinTrip')
  async handleJoinTrip(@ConnectedSocket() client: Socket, @MessageBody() data: { tripId: string }) {
    const user = this.requireUser(client);
    const tripId = String(data?.tripId || '');
    if (!tripId) throw new WsException('tripId required');

    // A driver may only join a conversation he is part of. Office users keep
    // their existing access to every trip.
    if (String(user.role || '').toLowerCase() === 'driver') {
      if (tripId.startsWith('driver_')) {
        if (tripId.slice('driver_'.length) !== user.id) {
          throw new WsException('Not your conversation');
        }
      } else if (tripId !== 'general') {
        const trip = await this.tripsService.findOne(tripId).catch(() => null);
        if (!trip || !actorOwnsTrip(trip as any, user)) {
          throw new WsException('Trip not assigned to this driver');
        }
      }
    }

    // Leave all previously joined trip rooms so only the active room receives real-time events
    client.rooms.forEach((room) => {
      if (room !== client.id && room !== AUTHENTICATED_ROOM) client.leave(room);
    });
    client.join(`trip_${tripId}`);
    client.emit('joinedTrip', { tripId });
  }

  async broadcastMessage(data: { tripId: string; senderId: string; content: string; fileUrl?: string }) {
    const msg = await this.chatService.saveMessage(data.tripId, data.senderId, data.content, data.fileUrl);
    this.server.to(`trip_${data.tripId}`).emit('newMessage', msg);
    // Only authenticated sockets receive the global feed.
    this.server.to(AUTHENTICATED_ROOM).emit('newMessageGlobal', msg);
    
    // Create dashboard notification for admin
    try {
      const senderDriver = await this.driversService.findByUserId(data.senderId);
      const senderName = senderDriver?.user?.name || msg?.sender?.name || 'Utilizator';
      const roleLabel = senderDriver || msg?.sender?.role === 'driver' ? 'Șofer' : 'Dispecerat / Admin';
      let tripContext = '';
      if (data.tripId && !data.tripId.startsWith('driver_') && data.tripId !== 'general') {
        try {
          const tObj = await this.tripsService.findOne(data.tripId);
          if (tObj) {
            const ref = tObj.tripNumber || tObj.id;
            tripContext = ` (Cursa: ${ref})`;
          }
        } catch (e) {}
      }
      if (roleLabel === 'Șofer') {
        const msgText = data.content || (data.fileUrl ? 'Fișier atașat / Attached file' : '');
        await this.notificationsService.create({
          type: 'chat',
          title: `Mesaj de la ${roleLabel}: ${senderName}`,
          message: `${msgText}${tripContext}`,
          relatedId: data.tripId,
        });
      }
    } catch (e) {
      console.error('Error checking sender for dashboard notification:', e);
    }
    
    try {
      if (data.tripId && !data.tripId.startsWith('driver_') && data.tripId !== 'general') {
        const trip = await this.tripsService.findOne(data.tripId);
        if (trip && trip.driver && trip.driver.user && trip.driver.user.id !== data.senderId) {
          if (trip.driver.user.fcmToken) {
            const body = data.content ? data.content : 'Fișier atașat / Attached file';
            await this.firebaseService.sendPushNotification(
              trip.driver.user.fcmToken,
              `Mesaj de la ${msg?.sender?.name || 'Dispecerat'}`,
              body,
              { type: 'chat', tripId: data.tripId }
            );
          }
        }
      } else if (data.tripId && data.tripId.startsWith('driver_')) {
        const driverId = data.tripId.replace('driver_', '');
        const driver = await this.driversService.findByUserId(driverId);
        if (driver && driver.user && driver.user.id !== data.senderId && driver.user.fcmToken) {
          const body = data.content ? data.content : 'Fișier atașat / Attached file';
          await this.firebaseService.sendPushNotification(
            driver.user.fcmToken,
            `Mesaj de la ${msg?.sender?.name || 'Dispecerat'}`,
            body,
            { type: 'chat', tripId: data.tripId }
          );
        }
      }
    } catch (e) {
      console.error('Error sending push notif for chat:', e);
    }
    
    return msg;
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(@ConnectedSocket() client: Socket, @MessageBody() data: { tripId: string; senderId?: string; content: string; fileUrl?: string }) {
    const user = this.requireUser(client);
    // The sender is the authenticated socket, never a client-supplied id.
    return this.broadcastMessage({ ...data, senderId: user.id });
  }

  @SubscribeMessage('updateLocation')
  handleLocation(@ConnectedSocket() client: Socket, @MessageBody() data: { driverId: string; truckId: string; lat: number; lng: number }) {
    this.requireUser(client);
    this.server.to(AUTHENTICATED_ROOM).emit('locationUpdate', data);
  }

  @SubscribeMessage('updateTripStatus')
  async handleTripStatus(@ConnectedSocket() client: Socket, @MessageBody() data: { tripId: string; status: string; driverId: string }) {
    this.requireUser(client);
    this.server.to(AUTHENTICATED_ROOM).emit('tripStatusUpdate', data);
    // Also broadcast tripUpdated so mobile apps in background catch it
    this.server.to(AUTHENTICATED_ROOM).emit('tripUpdated', { tripId: data.tripId, status: data.status, isDriver: true });
    
    try {
      const trip = await this.tripsService.findOne(data.tripId);
      const driverName = trip?.driver?.user?.name || 'Șofer';
      const tripRef = trip?.tripNumber || trip?.id || 'Necunoscut';
      
      const statusMap: Record<string, string> = {
        pending: 'În Așteptare (Pending)',
        confirmed: 'Confirmată (Confirmed)',
        in_progress: 'În Desfășurare (In Progress)',
        completed: 'Finalizată (Completed)',
        cancelled: 'Anulată (Cancelled)',
        delayed: 'Întârziată (Delayed)'
      };
      const displayStatus = statusMap[data.status] || data.status.toUpperCase();
      const msg = `Cursa ${tripRef} a fost schimbată în statusul: ${displayStatus} de către ${driverName}`;

      await this.notificationsService.create({
        type: 'trip',
        title: `Status Cursă: ${displayStatus}`,
        message: msg,
        relatedId: data.tripId,
      });
    } catch (e) {
      await this.notificationsService.create({
        type: 'trip',
        title: `Status Cursă: ${data.status.toUpperCase()}`,
        message: `Cursa ${data.tripId} a fost schimbată în statusul: ${data.status.toUpperCase()}`,
        relatedId: data.tripId,
      });
    }
  }

  // Called by TripsService when a trip is updated via REST API (not socket)
  broadcastTripUpdate(tripId: string, status: string, driverUserId?: string, isDriver: boolean = false) {
    this.server.to(AUTHENTICATED_ROOM).emit('tripUpdated', { tripId, status, driverUserId, isDriver });
  }

  /**
   * One real-time event for every operational transition and incident. The TMS
   * listens to this event and reloads the affected row; incident payloads are
   * deliberately limited to non-sensitive identifiers and codes.
   */
  broadcastOperationalUpdate(data: {
    tripId: string;
    operationalStatus: string;
    status?: string;
    stopId?: string;
    incidentId?: string;
    deliveryOutcome?: string | null;
    hasOpenIncident?: boolean;
    event: string;
    /** Trusted actor source; the driver app must never notify itself. */
    source?: 'mobile' | 'tms' | 'system';
    /** Assigned driver, so only that phone reacts to a TMS change. */
    driverUserId?: string | null;
  }) {
    const source = data.source || 'system';
    const payload = {
      ...data,
      source,
      isDriver: source === 'mobile',
      at: new Date().toISOString(),
    };
    this.server.to(AUTHENTICATED_ROOM).emit('tripStatusUpdate', payload);
    this.server.to(AUTHENTICATED_ROOM).emit('tripUpdated', payload);
    if (data.incidentId || data.event.includes('INCIDENT')) {
      this.server.to(AUTHENTICATED_ROOM).emit('deliveryIncident', payload);
    }
  }
}
