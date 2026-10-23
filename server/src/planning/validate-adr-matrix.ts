import { AdrRulesEngine } from '../adr/adr-rules.engine';

export interface PlanningConflict {
  id: string;
  level: 'blocking' | 'warning' | 'info';
  code: string;
  tripId?: string;
  orderId?: string;
  resourceId?: string;
  params?: any;
  message: string;
}

export function validateAdrMatrix(
  trip: any,
  truck: any,
  trailer: any,
  driver: any,
  tripEnd: Date,
): PlanningConflict[] {
  const conflicts: PlanningConflict[] = [];

  // Extract all cargo items and equipment requirements
  const cargoItems: any[] = [];
  let isAdrTrip = false;

  for (const o of trip.orders || []) {
    if ((o.equipmentRequirements || []).some((e: string) => String(e).toLowerCase().includes('adr')) || o.adrSurcharge) {
      isAdrTrip = true;
    }
    for (const c of o.cargoItems || []) {
      if (c.adrClass) {
        cargoItems.push({ ...c, orderNumber: o.orderNumber, orderId: o.id });
        isAdrTrip = true;
      }
    }
  }

  if ((trip.equipmentRequirements || []).some((e: string) => String(e).toLowerCase().includes('adr')) || trip.adrSurcharge) {
    isAdrTrip = true;
  }

  if (!isAdrTrip && cargoItems.length === 0) {
    return conflicts;
  }

  // Evaluate dangerous goods compliance, exemptions (1.1.3.6, LQ, EQ, SP 188), and point totals
  const adrEval = AdrRulesEngine.evaluateCargo(cargoItems.map(c => ({
    unNumber: c.unNumber || '',
    adrClass: c.adrClass || '',
    classificationCode: c.classificationCode,
    dangerLabels: c.dangerLabels,
    transportCategory: c.transportCategory,
    tunnelRestrictionCode: c.tunnelRestrictionCode,
    packingGroup: c.packingGroup,
    quantity: c.quantity,
    grossMassKg: c.grossMassKg || c.weightKg,
    netMassKg: c.netMassKg,
    volumeLiters: c.volumeLiters,
    netExplosiveMassKg: c.netExplosiveMassKg,
    receptacleCapacityLiters: c.receptacleCapacityLiters,
    packageGrossMassKg: c.packageGrossMassKg || c.grossMassKg || c.weightKg,
    innerPackagingQuantity: c.innerPackagingQuantity,
    catalogLqLimit: c.catalogLqLimit,
    catalogEqCode: c.catalogEqCode,
    limitedQuantity: c.limitedQuantity,
    exceptedQuantity: c.exceptedQuantity,
    emptyUncleaned: c.emptyUncleaned,
    waste: c.adrWaste,
    transportType: c.transportType || 'packages',
    batteryDetails: c.adrBatteryDetails ? (typeof c.adrBatteryDetails === 'string' ? JSON.parse(c.adrBatteryDetails) : c.adrBatteryDetails) : undefined,
  })));

  // 1. Driver Qualification Check
  if (driver) {
    const docs = driver.documents || [];
    const dName = driver.name || driver.user?.name || 'Driver';
    const tripEndStr = tripEnd ? tripEnd.toISOString().slice(0, 10) : 'completion';

    // If the transport is legally exempt from driver certification (e.g. 1.1.3.6 <= 1000 pts, LQ, EQ, SP 188)
    if (!adrEval.driverCertRequired && cargoItems.length > 0 && !adrEval.requiresVerification) {
      conflicts.push({
        id: `ADR_EXEMPTION_CONFIRMED_${trip.id}`,
        level: 'info',
        code: 'ADR_EXEMPTION_CONFIRMED',
        tripId: trip.id,
        message: `${adrEval.statusLabelRo}. Certificatul ADR al șoferului nu este cerut de lege (scutire verificată). Necesar: instruire de bază ADR 1.3 și 1 extinctor min. 2 kg.`,
      });
    } else {
      // Full ADR rules apply or verification is required -> Check driver ADR certificate
      const adrDoc = docs.find((doc: any) => String(doc.type || '').toLowerCase().includes('adr')) ||
        (driver.hasAdrCertificate ? { type: 'ADR Certificate', expiryDate: driver.adrExpiryDate, notes: (driver.adrSpecializations || []).join(' ') } : null);

      if (!adrDoc) {
        conflicts.push({
          id: `DRIVER_ADR_INVALID_${trip.id}_${driver.id}`,
          level: 'blocking',
          code: 'DRIVER_ADR_INVALID',
          tripId: trip.id,
          resourceId: driver.id,
          params: {
            driverId: driver.id,
            driverName: dName,
            document: 'adr_certificate',
            tripEnd: tripEndStr,
            resolution: 'Assign an ADR-certified driver for hazardous cargo trip.',
          },
          message: `Driver ${dName} lacks required ADR certificate for hazardous goods trip ${trip.tripNumber || trip.id}.`,
        });
      } else if (adrDoc.expiryDate && new Date(adrDoc.expiryDate) < tripEnd) {
        const expStr = new Date(adrDoc.expiryDate).toISOString().slice(0, 10);
        conflicts.push({
          id: `DRIVER_ADR_EXPIRED_${trip.id}_${driver.id}`,
          level: 'blocking',
          code: 'DRIVER_ADR_EXPIRED',
          tripId: trip.id,
          resourceId: driver.id,
          params: {
            driverId: driver.id,
            driverName: dName,
            document: 'adr_certificate',
            expiryDate: expStr,
            tripEnd: tripEndStr,
            resolution: 'Assign a driver with valid ADR certificate or renew before trip end.',
          },
          message: `Driver ${dName} ADR certificate expires on ${expStr}, before planned trip completion (${tripEndStr}). Legally required for ADR transport.`,
        });
      } else {
        // Check class-specific driver endorsements for Class 1 (Explosives) & Class 7 (Radioactive) & Tanks
        const docTypeLower = String(adrDoc.type || '').toLowerCase();
        const docNotesLower = String(adrDoc.notes || '').toLowerCase();
        const specs = Array.isArray(driver.adrSpecializations) ? driver.adrSpecializations.join(' ').toLowerCase() : '';
        const allDriverSpecs = `${docTypeLower} ${docNotesLower} ${specs}`;

        for (const item of cargoItems) {
          const cls = String(item.adrClass).trim();
          if (cls.startsWith('1') && !allDriverSpecs.includes('class 1') && !allDriverSpecs.includes('explosiv') && !allDriverSpecs.includes('cl1')) {
            conflicts.push({
              id: `DRIVER_ADR_INVALID_CL1_${trip.id}_${driver.id}`,
              level: 'blocking',
              code: 'DRIVER_ADR_INVALID',
              tripId: trip.id,
              resourceId: driver.id,
              message: `Driver ${dName} lacks specialized ADR Class 1 (Explosives) endorsement required for UN ${item.unNumber || 'cargo'}.`,
            });
            break;
          }
          if (cls.startsWith('7') && !allDriverSpecs.includes('class 7') && !allDriverSpecs.includes('radioactiv') && !allDriverSpecs.includes('cl7')) {
            conflicts.push({
              id: `DRIVER_ADR_INVALID_CL7_${trip.id}_${driver.id}`,
              level: 'blocking',
              code: 'DRIVER_ADR_INVALID',
              tripId: trip.id,
              resourceId: driver.id,
              message: `Driver ${dName} lacks specialized ADR Class 7 (Radioactive) endorsement required for UN ${item.unNumber || 'cargo'}.`,
            });
            break;
          }
        }
      }
    }
  }

  // 2. Vehicle ADR Capability Check
  if (truck) {
    const truckFeatures = ((truck.features || []) as string[]).map(f => f.toLowerCase());
    const hasAdrTruck = truckFeatures.some(f => f.includes('adr') || f.includes('hazardous') || f.includes('ex') || f.includes('fl') || f.includes('at'));
    
    for (const item of cargoItems) {
      const cls = String(item.adrClass).trim();
      // Class 1 Explosives requires EX/II or EX/III certification
      if (cls.startsWith('1')) {
        const hasExCert = truckFeatures.some(f => f.includes('ex/ii') || f.includes('ex/iii') || f.includes('ex2') || f.includes('ex3') || f.includes('adr'));
        if (!hasExCert) {
          conflicts.push({
            id: `ADR_VEHICLE_INCOMPATIBLE_CL1_${trip.id}_${truck.id}`,
            level: 'blocking',
            code: 'ADR_VEHICLE_INCOMPATIBLE',
            tripId: trip.id,
            resourceId: truck.id,
            message: `Vehicle ${truck.plateNumber} is not certified EX/II or EX/III as legally required for ADR Class 1 explosives transport.`,
          });
          break;
        }
      } else if (!hasAdrTruck) {
        conflicts.push({
          id: `ADR_VEHICLE_INCOMPATIBLE_${trip.id}_${truck.id}`,
          level: 'blocking',
          code: 'ADR_VEHICLE_INCOMPATIBLE',
          tripId: trip.id,
          resourceId: truck.id,
          message: `Vehicle ${truck.plateNumber} lacks required ADR certification for Class ${cls} hazardous cargo.`,
        });
        break;
      }
    }
  }

  // 3. Trailer Equipment Check
  if (trailer) {
    const trlFeatures = ((trailer.features || []) as string[]).map(f => f.toLowerCase());
    const hasAdrTrailer = trlFeatures.some(f => f.includes('adr') || f.includes('hazardous') || f.includes('safety_kit') || f.includes('extinguisher'));
    if (!hasAdrTrailer && cargoItems.length > 0 && !trailer.type?.includes('tanker')) {
      conflicts.push({
        id: `ADR_TRAILER_INCOMPATIBLE_${trip.id}_${trailer.id}`,
        level: 'warning',
        code: 'ADR_TRAILER_INCOMPATIBLE',
        tripId: trip.id,
        resourceId: trailer.id,
        message: `Trailer ${trailer.plateNumber} requires verification of mandatory ADR equipment (fire extinguishers, orange plates, wheel chocks).`,
      });
    }
  }

  // 4. Route & Tunnel Restriction Check
  for (const item of cargoItems) {
    const tunnel = String(item.tunnelRestrictionCode || '').toUpperCase().trim();
    if (tunnel === 'E') {
      conflicts.push({
        id: `ADR_ROUTE_RESTRICTION_${trip.id}_${item.id}`,
        level: 'warning',
        code: 'ADR_ROUTE_RESTRICTION',
        tripId: trip.id,
        orderId: item.orderId,
        message: `ADR cargo UN ${item.unNumber || ''} (Class ${item.adrClass}) has Tunnel Code E: passage through Category E tunnels is strictly prohibited. Route avoidance required.`,
      });
    }
  }

  // 5. Incompatible ADR Cargo Combination / Mixed Loading Matrix (ADR 7.5.2)
  for (const violation of adrEval.mixedLoadingViolations) {
    conflicts.push({
      id: `ADR_CARGO_INCOMPATIBILITY_${trip.id}_${conflicts.length}`,
      level: 'blocking',
      code: 'ADR_CARGO_INCOMPATIBILITY',
      tripId: trip.id,
      message: violation,
    });
  }

  // 6. Food co-loading check with Toxic (6.1) or Infectious (6.2) per ADR 7.5.4
  const allCargoOrDescriptions = (trip.orders || []).flatMap((o: any) => [
    ...(o.cargoItems || []),
    { description: o.description || '' },
  ]);
  const foodWarnings = AdrRulesEngine.checkFoodSeparation(adrEval.lines, allCargoOrDescriptions);
  for (const warning of foodWarnings) {
    conflicts.push({
      id: `ADR_CARGO_INCOMPATIBILITY_FOOD_${trip.id}_${conflicts.length}`,
      level: 'blocking',
      code: 'ADR_CARGO_INCOMPATIBILITY',
      tripId: trip.id,
      message: warning,
    });
  }

  // 7. Missing compliance data / Human verification required
  if (adrEval.requiresVerification) {
    conflicts.push({
      id: `ADR_VERIFICATION_REQUIRED_${trip.id}`,
      level: 'warning',
      code: 'ADR_VERIFICATION_REQUIRED',
      tripId: trip.id,
      message: `Verificare ADR obligatorie înainte de plecare: ${adrEval.verificationReasons.join('; ')}`,
    });
  }

  return conflicts;
}
