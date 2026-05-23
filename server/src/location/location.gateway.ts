import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { DriversService } from '../drivers/drivers.service';
import { TrucksService } from '../trucks/trucks.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class LocationGateway {
  @WebSocketServer() server: Server;

  constructor(
    private driversService: DriversService,
    private trucksService: TrucksService,
  ) {}

  @SubscribeMessage('driverLocation')
  async handleLocation(@ConnectedSocket() client: Socket, @MessageBody() data: { driverId: string; truckId: string; lat: number; lng: number }) {
    const driver = await this.driversService.updateLocation(data.driverId, data.lat, data.lng);
    const resolvedDriverId = driver ? driver.id : data.driverId;

    let resolvedTruckId: string | null = data.truckId;
    if (!resolvedTruckId && driver) {
      resolvedTruckId = await this.driversService.findActiveTruckId(driver.id);
    }

    if (resolvedTruckId) {
      await this.trucksService.updateLocation(resolvedTruckId, data.lat, data.lng);
    }
    
    this.server.emit('locationUpdate', {
      ...data,
      driverId: resolvedDriverId,
      truckId: resolvedTruckId,
    });
  }
}
