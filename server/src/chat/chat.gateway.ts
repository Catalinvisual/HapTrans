import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, forwardRef } from '@nestjs/common';
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
  ) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinTrip')
  handleJoinTrip(@ConnectedSocket() client: Socket, @MessageBody() data: { tripId: string }) {
    client.join(`trip_${data.tripId}`);
    client.emit('joinedTrip', { tripId: data.tripId });
  }

  async broadcastMessage(data: { tripId: string; senderId: string; content: string; fileUrl?: string }) {
    const msg = await this.chatService.saveMessage(data.tripId, data.senderId, data.content, data.fileUrl);
    this.server.to(`trip_${data.tripId}`).emit('newMessage', msg);
    this.server.emit('newMessageGlobal', msg); // Emit globally for app local push
    
    // Create dashboard notification for admin
    await this.notificationsService.create({
      type: 'chat',
      title: 'notif_chat_title',
      message: data.content || (data.fileUrl ? 'notif_chat_file' : ''),
      relatedId: data.tripId,
    });
    
    try {
      if (data.tripId && !data.tripId.startsWith('driver_') && data.tripId !== 'general') {
        const trip = await this.tripsService.findOne(data.tripId);
        if (trip && trip.driver && trip.driver.user && trip.driver.user.id !== data.senderId) {
          if (trip.driver.user.fcmToken) {
            const body = data.content ? data.content : 'Fișier atașat / Attached file';
            await this.firebaseService.sendPushNotification(
              trip.driver.user.fcmToken,
              'Mesaj nou (Chat)',
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
            'Mesaj nou (Chat)',
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
  async handleMessage(@ConnectedSocket() client: Socket, @MessageBody() data: { tripId: string; senderId: string; content: string; fileUrl?: string }) {
    return this.broadcastMessage(data);
  }

  @SubscribeMessage('updateLocation')
  handleLocation(@ConnectedSocket() client: Socket, @MessageBody() data: { driverId: string; truckId: string; lat: number; lng: number }) {
    this.server.emit('locationUpdate', data);
  }

  @SubscribeMessage('updateTripStatus')
  handleTripStatus(@ConnectedSocket() client: Socket, @MessageBody() data: { tripId: string; status: string; driverId: string }) {
    this.server.emit('tripStatusUpdate', data);
    // Also broadcast tripUpdated so mobile apps in background catch it
    this.server.emit('tripUpdated', { tripId: data.tripId, status: data.status });
    
    this.notificationsService.create({
      type: 'trip',
      title: 'notif_trip_title',
      message: `${data.tripId}|||${data.status}`,
      relatedId: data.tripId,
    });
  }

  // Called by TripsService when a trip is updated via REST API (not socket)
  broadcastTripUpdate(tripId: string, status: string, driverUserId?: string) {
    this.server.emit('tripUpdated', { tripId, status, driverUserId });
  }
}
