import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { Order } from '../order.entity';
import type { ImportRowResult, NormalizedOrderRow } from './excel-import.types';

@Injectable()
export class DuplicateDetector {
  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
  ) {}

  /**
   * Check a batch of normalized rows for duplicates against existing orders.
   * Duplicate fingerprint = SHA256 of (clientId + externalRef + pickupDate + pickupAddress + deliveryDate + deliveryAddress)
   * If externalRef exists, it's weighted heavily.
   *
   * Updates `rows` in-place: sets status to 'duplicate' and adds issue.
   */
  async detectDuplicates(
    rows: ImportRowResult[],
    companyId?: string,
  ): Promise<void> {
    // Build a set of existing fingerprints from the DB
    const existingOrders = await this.orderRepo.find({
      where: companyId ? ({ company: { id: companyId } } as any) : undefined,
      relations: ['stops'],
      select: ['id', 'orderNumber', 'loadingReference', 'customerReference'],
    });

    const existingFingerprints = new Map<string, { id: string; orderNumber: string }>();
    const existingRefSet = new Map<string, { id: string; orderNumber: string }>();

    for (const order of existingOrders as any[]) {
      // Ref-based quick lookup (for externalReference / loadingReference)
      if (order.customerReference) {
        existingRefSet.set(order.customerReference.trim().toLowerCase(), {
          id: order.id,
          orderNumber: order.orderNumber,
        });
      }
      if (order.loadingReference) {
        existingRefSet.set(`lr:${order.loadingReference.trim().toLowerCase()}`, {
          id: order.id,
          orderNumber: order.orderNumber,
        });
      }

      // Full fingerprint
      const pickup = (order.stops || []).find((s: any) => s.type === 'pickup');
      const delivery = (order.stops || []).find((s: any) => s.type === 'delivery' || s.type === 'dropoff');
      const fp = this.makeFingerprint({
        externalReference: order.customerReference,
        loadingReference: order.loadingReference,
        pickupDate: pickup?.dateFrom,
        pickupAddress: pickup?.address || pickup?.city,
        deliveryDate: delivery?.dateFrom,
        deliveryAddress: delivery?.address || delivery?.city,
      });
      existingFingerprints.set(fp, { id: order.id, orderNumber: order.orderNumber });
    }

    // Check each incoming row
    for (const row of rows) {
      if (row.status === 'invalid') continue;

      const data = row.data;

      // Fast ref lookup
      if (data.externalReference) {
        const match = existingRefSet.get(data.externalReference.trim().toLowerCase());
        if (match) {
          row.status = 'duplicate';
          row.duplicateOrderId = match.id;
          row.duplicateOrderNumber = match.orderNumber;
          row.issues.push({
            field: 'externalReference',
            message: `Duplicate: order ${match.orderNumber} already has reference "${data.externalReference}"`,
            severity: 'warning',
          });
          continue;
        }
      }
      if (data.loadingReference) {
        const match = existingRefSet.get(`lr:${data.loadingReference.trim().toLowerCase()}`);
        if (match) {
          row.status = 'duplicate';
          row.duplicateOrderId = match.id;
          row.duplicateOrderNumber = match.orderNumber;
          row.issues.push({
            field: 'loadingReference',
            message: `Duplicate: order ${match.orderNumber} already has loading reference "${data.loadingReference}"`,
            severity: 'warning',
          });
          continue;
        }
      }

      // Full fingerprint check
      const fp = this.makeFingerprint(data);
      const match = existingFingerprints.get(fp);
      if (match) {
        row.status = 'duplicate';
        row.duplicateOrderId = match.id;
        row.duplicateOrderNumber = match.orderNumber;
        row.issues.push({
          field: 'row',
          message: `Duplicate: matches existing order ${match.orderNumber}`,
          severity: 'warning',
        });
      }
    }
  }

  private makeFingerprint(data: Partial<NormalizedOrderRow>): string {
    const parts = [
      (data.externalReference || '').toLowerCase().trim(),
      (data.loadingReference || '').toLowerCase().trim(),
      (data.pickupDate || '').trim(),
      (data.pickupAddress || data.pickupCity || '').toLowerCase().trim(),
      (data.deliveryDate || '').trim(),
      (data.deliveryAddress || data.deliveryCity || '').toLowerCase().trim(),
    ];
    return createHash('sha256').update(parts.join('|')).digest('hex');
  }
}
