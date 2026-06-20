const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'server/src/app.controller.ts');
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/import \{ Controller/g, "import { EntityManager } from 'typeorm';\nimport { Controller");

code = code.replace(/constructor\(/, `constructor(
    private readonly em: EntityManager,
`);

code = code.replace(/const trucks = await this\.trucksService\.findAll\(\);([\s\S]*?)const clients = await this\.clientsService\.findAll\(\);/, 
`const trucks = await this.em.query('SELECT COUNT(*) as count FROM truck');
      const trips = await this.em.query('SELECT COUNT(*) as count FROM trip');
      const clients = await this.em.query('SELECT COUNT(*) as count FROM client');
      const cms = await this.em.query('SELECT data FROM website_cms WHERE id = 1');
      let countriesCount = 24;
      if (cms.length > 0 && cms[0].data && cms[0].data.countries) {
        const c = cms[0].data.countries;
        countriesCount = c.split(',').filter(x => x.trim().length > 0).length;
      }
`);

code = code.replace(/trucks: trucks\.length,/, "trucks: parseInt(trucks[0].count, 10),");
code = code.replace(/trips: trips\.length,/, "trips: parseInt(trips[0].count, 10),");
code = code.replace(/clients: clients\.length,/, "clients: parseInt(clients[0].count, 10),\n        countries: countriesCount,");

fs.writeFileSync(file, code);
console.log('Fixed public stats endpoint');
