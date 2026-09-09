const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'server/src/app.controller.ts');
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('/public/stats')) {
  const insertIndex = code.lastIndexOf('}');
  const endpoint = `
  @Get('public/stats')
  async getPublicStats() {
    try {
      const trucks = await this.trucksService.findAll();
      const trips = await this.tripsService.findAll();
      const clients = await this.clientsService.findAll();
      
      return {
        trucks: trucks.length,
        trips: trips.length,
        clients: clients.length,
      };
    } catch (e) {
      return { error: e.toString() };
    }
  }
`;
  code = code.substring(0, insertIndex) + endpoint + '}\n';
  fs.writeFileSync(file, code);
  console.log('Added public stats endpoint');
} else {
  console.log('Endpoint already exists');
}
