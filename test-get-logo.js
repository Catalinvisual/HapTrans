const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'server/src/app.controller.ts');
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('test/logo')) {
  const insertIndex = code.lastIndexOf('}');
  const endpoint = `
  @Get('test/logo')
  async testLogo() {
    try {
      const users = await this.usersService.findAll();
      const admin = users.find(u => u.role === 'admin');
      return { adminLogo: admin ? admin.companyLogoUrl : null };
    } catch(e) { return { error: e.toString() }; }
  }
`;
  code = code.substring(0, insertIndex) + endpoint + '}\n';
  fs.writeFileSync(file, code);
  console.log('Added test endpoint');
}
