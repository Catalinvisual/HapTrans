const fs = require('fs');
const path = 'C:/Users/hapen/Desktop/New folder/Saas HapCargo/server/src/trips/trips.service.ts';
let c = fs.readFileSync(path, 'utf8');

if (!c.includes('import { Truck }')) {
    c = c.replace("import { Trip, TripStatus } from './trip.entity';", "import { Trip, TripStatus } from './trip.entity';\nimport { Truck } from '../trucks/truck.entity';");
}

const oldLogic = `      // Truck maintenance check (Alert every 50,000 km)
      if (updatedTrip.truck) {
         const allTruckTrips = await this.repo.find({ where: { truck: { id: updatedTrip.truck.id }, status: TripStatus.COMPLETED } });
         const totalKm = allTruckTrips.reduce((sum, t) => sum + (Number(t.distanceKm) || 0), 0);
         const maintenanceThreshold = 50000;
         
         const prevTotalKm = totalKm - (Number(updatedTrip.distanceKm) || 0);
         if (Math.floor(totalKm / maintenanceThreshold) > Math.floor(prevTotalKm / maintenanceThreshold)) {
            await this.notificationsService.create({
              type: 'system',
              title: '🔧 Alertă Mentenanță Camion',
              message: \`Camionul \${updatedTrip.truck.plateNumber || 'ID: ' + updatedTrip.truck.id} a depășit pragul de \${Math.floor(totalKm / maintenanceThreshold) * maintenanceThreshold} km și necesită revizie / schimb de ulei!\`,
              relatedId: updatedTrip.truck.id,
            });
         }
      }`;

const newLogic = `      // Truck maintenance check using entity fields
      if (updatedTrip.truck && Number(updatedTrip.distanceKm) > 0) {
         const truck = await this.repo.manager.findOne(Truck, { where: { id: updatedTrip.truck.id } });
         if (truck) {
             const newTotalKm = Number(truck.totalMileage || 0) + Number(updatedTrip.distanceKm);
             const threshold = Number(truck.nextMaintenanceMileage || 50000);
             await this.repo.manager.update(Truck, truck.id, { totalMileage: newTotalKm });
             
             if (newTotalKm >= threshold) {
                await this.notificationsService.create({
                  type: 'system',
                  title: '🔧 Alertă Mentenanță Camion',
                  message: \`Camionul \${truck.plateNumber} a ajuns la \${newTotalKm} km și a depășit limita de revizie (\${threshold} km)!\`,
                  relatedId: truck.id,
                });
             }
         }
      }`;

c = c.replace(oldLogic, newLogic);
fs.writeFileSync(path, c);
console.log('trips.service.ts maintenance updated');
