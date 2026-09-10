import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';

@Controller('track')
export class TrackController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get(':token')
  async trackOrder(@Param('token') token: string) {
    if (!token) {
      throw new NotFoundException('Tracking link invalid or expired.');
    }
    
    token = token.replace(/^\/+|\/+$/g, '').split('?')[0].split('#')[0];
    const order = await this.ordersService.findByTrackingToken(token);
    
    if (!order) {
      throw new NotFoundException('Tracking link invalid or expired.');
    }

    const sortedStops = order.stops
      ? [...order.stops].sort((a: any, b: any) => a.sequence - b.sequence)
      : [];

    const isDelivered = order.status === 'delivered' || order.status === 'pod_received' || order.status === 'invoiced' || order.status === 'paid';

    return {
      orderNumber: order.orderNumber,
      customerReference: order.customerReference,
      status: order.status,
      updatedAt: order.updatedAt,
      // Time windows
      pickupWindow: sortedStops.find((s: any) => s.type === 'pickup') ? `${(sortedStops.find((s: any) => s.type === 'pickup') as any).timeFrom || ''} - ${(sortedStops.find((s: any) => s.type === 'pickup') as any).timeUntil || ''}`.replace(/^ - $/, '') || null : null,
      deliveryWindow: sortedStops.find((s: any) => s.type === 'delivery' || s.type === 'dropoff') ? `${(sortedStops.find((s: any) => s.type === 'delivery' || s.type === 'dropoff') as any).timeFrom || ''} - ${(sortedStops.find((s: any) => s.type === 'delivery' || s.type === 'dropoff') as any).timeUntil || ''}`.replace(/^ - $/, '') || null : null,
      
      currentLat: order.trip?.truck?.currentLat || null,
      currentLng: order.trip?.truck?.currentLng || null,
      stops: sortedStops.map(s => ({
        id: s.id,
        sequence: s.sequence,
        address: s.address,
        companyName: s.companyName,
        country: s.country,
        type: s.type,
      })),
      
      // POD only available if delivered
      documents: isDelivered && order.documents ? order.documents.filter((doc: any) => doc.type === 'pod').map((doc: any) => ({
        id: doc.id,
        name: doc.fileName,
        url: doc.fileUrl,
        type: doc.type,
      })) : []
    };
  }

  @Get(':token/eta')
  async getEta(@Param('token') token: string) {
    token = token.replace(/^\/+|\/+$/g, '').split('?')[0].split('#')[0];
    const order = await this.ordersService.findByTrackingToken(token);
    if (!order) {
      throw new NotFoundException('Tracking link invalid or expired.');
    }

    return {
      originalEtaPickup: order.originalEtaPickup,
      currentEtaPickup: order.currentEtaPickup,
      originalEtaDelivery: order.originalEtaDelivery,
      currentEtaDelivery: order.currentEtaDelivery,
      delayMinutes: order.delayMinutes
    };
  }
}
