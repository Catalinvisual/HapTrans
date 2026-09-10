import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/' })
export class NotificationsGateway {
  @WebSocketServer()
  server: Server;

  emitNewNotification(notification: any) {
    if (this.server) {
      this.server.emit('newNotification', notification);
    }
  }
}
