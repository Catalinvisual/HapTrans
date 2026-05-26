const fs = require('fs');
const path = 'C:/Users/hapen/Desktop/New folder/Saas HapTrans/server/src/trips/trips.service.ts';
let c = fs.readFileSync(path, 'utf8');

if (!c.includes('import { Expense }')) {
    c = c.replace("import { Truck } from '../trucks/truck.entity';", "import { Truck } from '../trucks/truck.entity';\nimport { Expense } from '../expenses/expense.entity';");
}

const oldStats = `      const profit = totalRevenue - totalCost;
      const totalKm = trips.reduce((s, t) => s + Number(t.distanceKm || 0), 0);
      const costPerKm = totalKm > 0 ? totalCost / totalKm : 0;
      const active = await this.repo.count({ 
        where: { status: In([TripStatus.IN_PROGRESS, TripStatus.PENDING, TripStatus.CONFIRMED]) } 
      });
      return { totalRevenue, totalCost, profit, totalKm, costPerKm, active, tripsCount: trips.length };`;

const newStats = `      const expenses = await this.repo.manager.find(Expense, { where: { date: Between(start, end) } });
      const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
      
      const profit = totalRevenue - totalCost - totalExpenses;
      const totalKm = trips.reduce((s, t) => s + Number(t.distanceKm || 0), 0);
      const costPerKm = totalKm > 0 ? (totalCost + totalExpenses) / totalKm : 0;
      const active = await this.repo.count({ 
        where: { status: In([TripStatus.IN_PROGRESS, TripStatus.PENDING, TripStatus.CONFIRMED]) } 
      });
      return { totalRevenue, totalCost, profit, totalKm, costPerKm, active, tripsCount: trips.length, totalExpenses };`;

c = c.replace(oldStats, newStats);

fs.writeFileSync(path, c);
console.log('trips.service.ts stats updated');
