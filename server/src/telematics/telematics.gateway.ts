import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/telematics',
})
export class TelematicsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TelematicsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Telematics client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Telematics client disconnected: ${client.id}`);
  }

  broadcastLiveTelemetry(telemetry: any) {
    if (this.server) {
      this.server.emit('telemetry.updated', telemetry);
    }
  }

  broadcastActivityChange(data: any) {
    if (this.server) {
      this.server.emit('tachograph.activity.changed', data);
    }
  }

  broadcastBreakWarning(data: any) {
    if (this.server) {
      this.server.emit('driver.break.warning', data);
    }
  }

  @SubscribeMessage('subscribe.truck')
  handleTruckSubscription(client: Socket, truckId: string) {
    client.join(`truck_${truckId}`);
    return { status: 'subscribed', truckId };
  }
}
