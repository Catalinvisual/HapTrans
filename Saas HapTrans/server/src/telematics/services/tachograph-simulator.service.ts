import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { DrivingComplianceService } from './driving-compliance.service';

export interface SimulatedTruckState {
  truckId: string;
  plateNumber: string;
  driverId: string;
  driverName: string;
  tripId?: string;
  tripNumber?: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  odometer: number;
  country: string;
  currentActivity: string;
  connectionStatus: string;
  drivingTimeToday: number;
  continuousDriving: number;
  weeklyDrivingTime: number;
  breakTime: number;
  routeProgress: number; // 0 to 100%
  distanceRemainingKm: number;
  eta: Date;
  etaStatus: string;
  isSimulating: boolean;
  timeScale: number; // 1, 5, 10, 50
  scenario: string;
  waypoints: Array<{ lat: number; lng: number; name: string }>;
  currentWaypointIndex: number;
}

@Injectable()
export class TachographSimulatorService implements OnModuleDestroy {
  private readonly logger = new Logger(TachographSimulatorService.name);
  private simulatedTrucks: Map<string, SimulatedTruckState> = new Map();
  private intervalTimer: NodeJS.Timeout | null = null;

  constructor(private complianceService: DrivingComplianceService) {
    this.initializeDefaultSimulatedFleet();
    this.startSimulationLoop();
  }

  onModuleDestroy() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  private initializeDefaultSimulatedFleet() {
    // 20 predefined simulated trucks along major European logistics corridors
    const routes = [
      {
        plate: 'BT 43 VRA',
        driver: 'Catalin Vasile',
        trip: 'TRP-2026-0042',
        waypoints: [
          { lat: 51.9244, lng: 4.4777, name: 'Rotterdam, NL' },
          { lat: 51.2194, lng: 4.4025, name: 'Antwerp, BE' },
          { lat: 50.8503, lng: 4.3517, name: 'Brussels, BE' },
          { lat: 48.8566, lng: 2.3522, name: 'Paris, FR' },
        ],
      },
      {
        plate: 'AB 26 SET',
        driver: 'Liviu Dumitru',
        trip: 'TRP-2026-0043',
        waypoints: [
          { lat: 51.4416, lng: 5.4697, name: 'Eindhoven, NL' },
          { lat: 50.9375, lng: 6.9603, name: 'Cologne, DE' },
          { lat: 50.1109, lng: 8.6821, name: 'Frankfurt, DE' },
          { lat: 48.1351, lng: 11.5820, name: 'Munich, DE' },
        ],
      },
      {
        plate: 'B 100 HAP',
        driver: 'Mihai Ionescu',
        trip: 'TRP-2026-0044',
        waypoints: [
          { lat: 52.3676, lng: 4.9041, name: 'Amsterdam, NL' },
          { lat: 53.5511, lng: 9.9937, name: 'Hamburg, DE' },
          { lat: 52.5200, lng: 13.4050, name: 'Berlin, DE' },
        ],
      },
    ];

    for (let i = 0; i < 20; i++) {
      const route = routes[i % routes.length];
      const truckId = `truck-sim-${i + 1}`;
      const plate = i < routes.length ? route.plate : `TRK-SIM-${(i + 1).toString().padStart(2, '0')}`;
      const driver = i < routes.length ? route.driver : `Driver ${(i + 1).toString().padStart(2, '0')}`;

      this.simulatedTrucks.set(truckId, {
        truckId,
        plateNumber: plate,
        driverId: `driver-sim-${i + 1}`,
        driverName: driver,
        tripId: `trip-sim-${i + 1}`,
        tripNumber: route.trip,
        latitude: route.waypoints[0].lat,
        longitude: route.waypoints[0].lng,
        speed: 82.0,
        heading: 180.0,
        odometer: 420000 + i * 15000,
        country: 'NL',
        currentActivity: 'DRIVING',
        connectionStatus: 'LIVE',
        drivingTimeToday: 7200 + i * 300, // 2h+
        continuousDriving: 7200,
        weeklyDrivingTime: 90000 + i * 2000,
        breakTime: 0,
        routeProgress: (i * 4) % 100,
        distanceRemainingKm: 420 - i * 15,
        eta: new Date(Date.now() + (5 * 3600 + i * 1800) * 1000),
        etaStatus: 'ON_TIME',
        isSimulating: true,
        timeScale: 1,
        scenario: 'Scenario 1: Normal Trip',
        waypoints: route.waypoints,
        currentWaypointIndex: 0,
      });
    }
  }

  private startSimulationLoop() {
    if (this.intervalTimer) clearInterval(this.intervalTimer);
    this.intervalTimer = setInterval(() => {
      this.tick();
    }, 1000);
  }

  private tick() {
    for (const [truckId, truck] of this.simulatedTrucks.entries()) {
      if (!truck.isSimulating || truck.connectionStatus === 'OFFLINE') continue;

      const deltaSeconds = 1 * truck.timeScale;

      if (truck.currentActivity === 'DRIVING') {
        truck.drivingTimeToday += deltaSeconds;
        truck.continuousDriving += deltaSeconds;
        truck.weeklyDrivingTime += deltaSeconds;

        // Progress distance and GPS
        const distanceStepKm = (truck.speed / 3600) * deltaSeconds;
        truck.odometer += distanceStepKm;
        truck.distanceRemainingKm = Math.max(0, truck.distanceRemainingKm - distanceStepKm);

        // Advance route progress
        truck.routeProgress = Math.min(100, truck.routeProgress + (distanceStepKm / 450) * 100);

        // Move towards next waypoint
        const wp = truck.waypoints[truck.currentWaypointIndex % truck.waypoints.length];
        const nextWp = truck.waypoints[(truck.currentWaypointIndex + 1) % truck.waypoints.length];
        const stepRatio = Math.min(1, distanceStepKm / 50);
        truck.latitude += (nextWp.lat - wp.lat) * stepRatio * 0.05;
        truck.longitude += (nextWp.lng - wp.lng) * stepRatio * 0.05;

        // Recalculate ETA with mandatory break injection
        const pureHours = truck.speed > 0 ? truck.distanceRemainingKm / truck.speed : 0;
        const pureSeconds = pureHours * 3600;
        const realistic = this.complianceService.calculateRealisticTravelDuration(
          pureSeconds,
          truck.continuousDriving,
          32400 - truck.drivingTimeToday,
        );

        truck.eta = new Date(Date.now() + realistic.totalDurationSeconds * 1000);
      } else if (truck.currentActivity === 'BREAK' || truck.currentActivity === 'REST') {
        truck.breakTime += deltaSeconds;
        // After 45m (2700s) of break, continuous driving resets to 0
        if (truck.breakTime >= 2700) {
          truck.continuousDriving = 0;
        }
      }
    }
  }

  getAllSimulatedTrucks(): SimulatedTruckState[] {
    return Array.from(this.simulatedTrucks.values());
  }

  getSimulatedTruck(truckId: string): SimulatedTruckState | undefined {
    return this.simulatedTrucks.get(truckId);
  }

  setActivity(truckId: string, activity: string) {
    const truck = this.simulatedTrucks.get(truckId);
    if (truck) {
      truck.currentActivity = activity;
      if (activity === 'DRIVING') {
        truck.speed = 82;
      } else {
        truck.speed = 0;
      }
    }
  }

  setTimeScale(truckId: string, scale: number) {
    const truck = this.simulatedTrucks.get(truckId);
    if (truck) {
      truck.timeScale = scale;
    }
  }

  setSpeed(truckId: string, speed: number) {
    const truck = this.simulatedTrucks.get(truckId);
    if (truck) {
      truck.speed = speed;
      if (speed < 40 && truck.currentActivity === 'DRIVING') {
        truck.etaStatus = 'DELAYED';
      } else {
        truck.etaStatus = 'ON_TIME';
      }
    }
  }

  setDriver(truckId: string, driverId: string, driverName: string) {
    const truck = this.simulatedTrucks.get(truckId);
    if (truck) {
      truck.driverId = driverId;
      truck.driverName = driverName;
      // Reset driving timers for the new driver
      truck.drivingTimeToday = 0;
      truck.continuousDriving = 0;
      truck.breakTime = 0;
    }
  }

  simulateConnectionLoss(truckId: string) {
    const truck = this.simulatedTrucks.get(truckId);
    if (truck) {
      truck.connectionStatus = 'OFFLINE';
      truck.speed = 0;
    }
  }

  simulateReconnect(truckId: string) {
    const truck = this.simulatedTrucks.get(truckId);
    if (truck) {
      truck.connectionStatus = 'LIVE';
      truck.speed = 82;
    }
  }

  triggerScenario(truckId: string, scenarioId: number) {
    const truck = this.simulatedTrucks.get(truckId);
    if (!truck) return;

    switch (scenarioId) {
      case 1: // Normal Trip
        truck.scenario = 'Scenario 1: Normal Trip';
        truck.currentActivity = 'DRIVING';
        truck.speed = 82;
        truck.connectionStatus = 'LIVE';
        truck.etaStatus = 'ON_TIME';
        break;

      case 2: // Break Required Soon (4h 12m continuous driving)
        truck.scenario = 'Scenario 2: Break Required Soon';
        truck.currentActivity = 'DRIVING';
        truck.continuousDriving = 15120; // 4h 12m (18m remaining)
        truck.drivingTimeToday = 15120;
        break;

      case 3: // Break Taken
        truck.scenario = 'Scenario 3: Break Taken';
        truck.currentActivity = 'BREAK';
        truck.speed = 0;
        truck.breakTime = 600; // 10m in break
        break;

      case 4: // Traffic Delay
        truck.scenario = 'Scenario 4: Traffic Delay';
        truck.currentActivity = 'DRIVING';
        truck.speed = 22; // heavy congestion
        truck.etaStatus = 'DELAYED';
        truck.eta = new Date(Date.now() + 45 * 60 * 1000 + 4 * 3600 * 1000); // +45m delay
        break;

      case 5: // GPS Lost
        truck.scenario = 'Scenario 5: GPS Lost';
        truck.connectionStatus = 'STALE';
        break;

      case 6: // Tachograph Disconnected
        truck.scenario = 'Scenario 6: Tachograph Disconnected';
        truck.connectionStatus = 'OFFLINE';
        break;

      case 7: // Reconnect
        truck.scenario = 'Scenario 7: Reconnect';
        truck.connectionStatus = 'LIVE';
        truck.speed = 82;
        break;

      case 8: // Driver Change
        truck.scenario = 'Scenario 8: Driver Change';
        this.setDriver(truckId, 'driver-b-sim', 'Driver B (Replacement)');
        break;

      case 9: // Loading Delay
        truck.scenario = 'Scenario 9: Loading Delay';
        truck.currentActivity = 'LOADING';
        truck.speed = 0;
        truck.etaStatus = 'AT_RISK';
        break;

      case 10: // Multiple Stops Progression
        truck.scenario = 'Scenario 10: Multiple Stops';
        truck.currentActivity = 'UNLOADING';
        truck.speed = 0;
        truck.routeProgress = 75;
        break;
    }
  }
}
